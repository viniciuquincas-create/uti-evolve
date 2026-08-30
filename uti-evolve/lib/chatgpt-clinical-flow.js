import crypto from "node:crypto";
import { parseWhatsappCommand } from "./whatsapp-command.js";

export const PREVIEW_TTL_MS = 10 * 60 * 1000;

export const BED_FIELDS = ["paciente","diagnostico","dataInternacao","dataNascimento","idadeAnos","peso","altura","sexo","bhPrevio"];
export const VM_FIELDS = ["vm_modo","vm_o2","vm_flow","vm_fio2","vm_ipap","vm_epap","vm_br","vm_ps","vm_peep","vm_fr","vm_vt","vm_p01","vm_pocc","vm_pmusc","vm_pins","vm_pplat","vm_ppico","vm_phigh","vm_plow","vm_thigh","vm_tlow","vm_cuff","vm_sato2"];
export const EVOLUTION_FIELDS = [
  "hda","nRASS","nGlasgow","nPupilas","nDor","nEF","nEFExtra","nSeda","nAnalg","nPsiq","nObs",
  "cvHemo","cvCardioscopia","cvAusculta","cvEF","cv24h","cvDVA","cvMed","cvTEC","cvLact","cvDeltaCO2","cvDeltaPP","cvTropo","cvObs",
  "reVM","reMV","reRA","reEF","re24h","reGaso","rePocus","reLUS","reObs",
  "rm24h","rmLabs","rmTRS","rmObs","tgEF","tg24h","tgLabs","tgPocus","tgObs","tgUltEvac","tgLAMG",
  "heTemp","heLabs","heMed","heAtb","heProf","heObs","heCulturas","probAtivos","probResolvidos","impressao"
];
export const DRUG_FIELDS = ["noradrenalina","vasopressina","adrenalina","dobutamina","nitroprussiato","nitroglicerina","propofol","midazolam","fentanil","remifentanil","dexmedetomidina","cetamina","rocuronio","cisatracurio","insulina"];
export const DIET_FIELDS = ["tipo","catalogId","formula","vazao","volume24h","obs"];
export const DIET_META_FIELDS = ["modo","kcalKg","ptnKg","kcalTotal","ptnTotal"];
export const DEVICE_TYPES = ["tot","tqt","svd","pai","sng","cvc","dialise","dreno"];
const MULTIPLE_DEVICES = new Set(["cvc","dialise","dreno"]);
const VM_MODES = new Set(["ar_ambiente","cn","ms","mnr","venturi","cnaf","vni","vm_psv","vm_pcv","vm_vcv","vm_aprv"]);
const DIET_TYPES = new Set(["enteral","parenteral","oral","mista","jejum"]);

const isObject = value => value && typeof value === "object" && !Array.isArray(value);
const cleanString = (value,max=5000) => String(value ?? "").trim().slice(0,max);
function pick(source,allowed,label) {
  if (source == null) return {};
  if (!isObject(source)) throw new Error(`${label} deve ser um objeto`);
  const unknown=Object.keys(source).filter(k=>!allowed.includes(k));
  if (unknown.length) throw new Error(`Campos não permitidos em ${label}: ${unknown.join(", ")}`);
  return Object.fromEntries(Object.entries(source).map(([k,v])=>[k,cleanString(v)]));
}

export function parseClinicalRequest(body={}) {
  const transcript=cleanString(body.transcript,20000);
  if (!transcript) return {error:"Transcrição ou mensagem vazia"};
  try {
    const structured=isObject(body.clinicalData) ? body.clinicalData : null;
    if (!structured) {
      const legacy=parseWhatsappCommand(transcript);
      if (!legacy.bedNumber) return {error:"Não identifiquei o leito",transcript};
      if (!Object.keys(legacy.updates||{}).length) return {error:"Não identifiquei dados clínicos. Envie clinicalData estruturado.",transcript};
      return {transcript,command:{operation:"update",bedNumber:legacy.bedNumber,bedUpdates:legacy.updates,legacyUnknown:legacy.unknown||[]}};
    }
    const unknownTop=Object.keys(structured).filter(k=>!["operation","bedNumber","bedUpdates","drugUpdates","evolutionUpdates","dietUpdates","deviceOperations"].includes(k));
    if (unknownTop.length) throw new Error(`Campos não permitidos em clinicalData: ${unknownTop.join(", ")}`);
    const bedNumber=Number(structured.bedNumber);
    if (!Number.isInteger(bedNumber)||bedNumber<1) throw new Error("clinicalData.bedNumber inválido");
    const operation=structured.operation==="admit"?"admit":"update";
    const bedUpdates={...pick(structured.bedUpdates,[...BED_FIELDS,...VM_FIELDS],"bedUpdates")};
    const drugs=pick(structured.drugUpdates,DRUG_FIELDS,"drugUpdates");
    if (Object.keys(drugs).length) bedUpdates.drogasVazao=drugs;
    const evolutionUpdates=pick(structured.evolutionUpdates,EVOLUTION_FIELDS,"evolutionUpdates");
    const dietRaw=pick(structured.dietUpdates,[...DIET_FIELDS,"meta"],"dietUpdates");
    delete dietRaw.meta;
    if (structured.dietUpdates?.meta!=null) dietRaw.meta=pick(structured.dietUpdates.meta,DIET_META_FIELDS,"dietUpdates.meta");
    if (dietRaw.tipo && !DIET_TYPES.has(dietRaw.tipo)) throw new Error("Tipo de dieta inválido");
    if (bedUpdates.vm_modo && !VM_MODES.has(bedUpdates.vm_modo)) throw new Error("Modo ventilatório inválido");
    const deviceOperations=validateDeviceOperations(structured.deviceOperations);
    const hasChanges=[bedUpdates,evolutionUpdates,dietRaw].some(x=>Object.keys(x).length)||deviceOperations.length;
    if (!hasChanges) throw new Error("Nenhuma alteração clínica estruturada foi informada");
    if (operation==="admit"&&!bedUpdates.paciente) throw new Error("Admissão exige o nome do paciente em bedUpdates.paciente");
    return {transcript,command:{operation,bedNumber,bedUpdates,evolutionUpdates,dietUpdates:dietRaw,deviceOperations}};
  } catch(error) { return {error:error.message,transcript}; }
}

function validateDeviceOperations(value) {
  if (value==null) return [];
  if (!Array.isArray(value)||value.length>20) throw new Error("deviceOperations deve ser uma lista de até 20 itens");
  return value.map((item,index)=>{
    if (!isObject(item)) throw new Error(`Dispositivo ${index+1} inválido`);
    const unknown=Object.keys(item).filter(k=>!["action","type","deviceId","data","site","obs"].includes(k));
    if (unknown.length) throw new Error(`Campos não permitidos no dispositivo ${index+1}: ${unknown.join(", ")}`);
    const action=["add","update","remove"].includes(item.action)?item.action:null;
    if (!action||!DEVICE_TYPES.includes(item.type)) throw new Error(`Operação de dispositivo ${index+1} inválida`);
    return {action,type:item.type,deviceId:item.deviceId?cleanString(item.deviceId,100):undefined,data:cleanString(item.data,10),site:cleanString(item.site,200),obs:cleanString(item.obs,1000)};
  });
}

function findAnyBed(leitos,bedNumber) {
  const matches=(leitos||[]).filter(l=>Number(l.id)===bedNumber||Number(String(l.nome||"").match(/\d+/)?.[0])===bedNumber);
  return matches.length===1?{bed:matches[0]}:{error:matches.length?"Leito ambíguo":"Leito não encontrado"};
}

const normalizeMatch=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/gi,"").toLowerCase();
function findUpdateBed(leitos,bedNumber,transcript="",patientHint="") {
  const matches=(leitos||[]).filter(l=>Number(l.id)===bedNumber||Number(String(l.nome||"").match(/\d+/)?.[0])===bedNumber);
  if(matches.length===1)return {bed:matches[0]};
  if(!matches.length)return {error:"Leito não encontrado"};
  const transcriptNorm=normalizeMatch(transcript),hintNorm=normalizeMatch(patientHint);
  const byPatient=matches.filter(l=>{
    const patient=normalizeMatch(l.paciente);
    return patient.length>3&&((hintNorm&&(patient===hintNorm||patient.includes(hintNorm)||hintNorm.includes(patient)))||transcriptNorm.includes(patient));
  });
  return byPatient.length===1?{bed:byPatient[0]}:{error:"Leito ambíguo"};
}

export function buildPreview(leitos,parsed,evolutions={}) {
  const cmd=parsed.command;
  const found=cmd.operation==="admit"?findAnyBed(leitos,cmd.bedNumber):findUpdateBed(leitos,cmd.bedNumber,parsed.transcript,cmd.bedUpdates?.paciente);
  if (found.error) return {error:found.error};
  if (cmd.operation==="admit"&&found.bed.paciente) return {error:`${found.bed.nome} já está ocupado por ${found.bed.paciente}`};
  for (const op of cmd.deviceOperations||[]) {
    if (!MULTIPLE_DEVICES.has(op.type)||op.action==="add") continue;
    const list=Array.isArray(found.bed.dispositivos?.[op.type])?found.bed.dispositivos[op.type]:[];
    if (!op.deviceId&&list.length!==1) return {error:`Há ${list.length} dispositivos ${op.type}; informe o deviceId para ${op.action}`};
    if (op.deviceId&&!list.some(d=>String(d.id)===String(op.deviceId))) return {error:`Dispositivo ${op.type} com deviceId informado não foi encontrado`};
  }
  const labels=describeCommand(cmd);
  return {operation:cmd.operation,bedId:found.bed.id,bedName:found.bed.nome,patientName:cmd.operation==="admit"?cmd.bedUpdates.paciente:found.bed.paciente,updates:cmd,updateLabels:labels,ignoredSegments:cmd.legacyUnknown||[],currentEvolution:evolutions[found.bed.id]?true:false};
}

const FIELD_LABELS={paciente:"Paciente",diagnostico:"Diagnóstico",dataInternacao:"Data de internação",idadeAnos:"Idade",peso:"Peso",altura:"Altura",sexo:"Sexo",bhPrevio:"BH prévio",vm_modo:"Modo ventilatório",vm_fio2:"FiO₂",vm_peep:"PEEP",vm_ps:"PS",vm_fr:"FR",vm_vt:"VC",vm_sato2:"SatO₂",nEF:"Neurológico — exame físico",cvEF:"Cardiovascular — exame físico",reEF:"Respiratório — exame físico",rmObs:"Renal/metabólico",tgEF:"Gastrointestinal — exame físico",heObs:"Hematológico/infeccioso",probAtivos:"Problemas ativos",impressao:"Impressão"};
function describeCommand(cmd) {
  const out=[];
  Object.entries(cmd.bedUpdates||{}).forEach(([k,v])=>k==="drogasVazao"?Object.entries(v).forEach(([d,x])=>out.push(`Droga — ${d}: ${x}`)):out.push(`${FIELD_LABELS[k]||k}: ${v}`));
  Object.entries(cmd.evolutionUpdates||{}).forEach(([k,v])=>out.push(`${FIELD_LABELS[k]||k}: ${v}`));
  Object.entries(cmd.dietUpdates||{}).forEach(([k,v])=>out.push(`Dieta — ${k}: ${isObject(v)?JSON.stringify(v):v}`));
  (cmd.deviceOperations||[]).forEach(d=>out.push(`Dispositivo — ${d.action} ${d.type}${d.site?` (${d.site})`:""}`));
  return out;
}

function applyDevices(current,operations) {
  const devices={...(current||{})};
  for (const op of operations||[]) {
    if (MULTIPLE_DEVICES.has(op.type)) {
      const list=Array.isArray(devices[op.type])?[...devices[op.type]]:[];
      const targetId=op.deviceId || (list.length===1?list[0].id:undefined);
      if (op.action==="add") list.push({id:crypto.randomUUID(),data:op.data||new Date().toISOString().slice(0,10),site:op.site,obs:op.obs});
      else if (op.action==="remove") devices[op.type]=list.filter(d=>String(d.id)!==String(targetId));
      else devices[op.type]=list.map(d=>String(d.id)===String(targetId)?{...d,data:op.data||d.data,site:op.site||d.site,obs:op.obs||d.obs}:d);
      if (op.action!=="remove") devices[op.type]=list;
    } else devices[op.type]=op.action==="remove"?{ativo:false,data:"",site:"",obs:""}:{...(devices[op.type]||{}),ativo:true,data:op.data||devices[op.type]?.data||new Date().toISOString().slice(0,10),site:op.site||devices[op.type]?.site||"",obs:op.obs||devices[op.type]?.obs||""};
  }
  return devices;
}

export function applyConfirmedPreview(leitos,evolutions,pending) {
  const cmd=pending.command;
  const found=cmd.operation==="admit"?findAnyBed(leitos,cmd.bedNumber):findUpdateBed(leitos,cmd.bedNumber,pending.transcript,cmd.bedUpdates?.paciente);
  if (found.error) return found;
  const expected=pending.preview.patientName;
  if (found.bed.id!==pending.preview.bedId || (cmd.operation==="update"&&found.bed.paciente!==expected) || (cmd.operation==="admit"&&found.bed.paciente)) return {error:"O paciente do leito mudou desde a prévia; gere uma nova prévia"};
  const b=cmd.bedUpdates||{};
  const updatedBed={...found.bed,...b,drogasVazao:{...(found.bed.drogasVazao||{}),...(b.drogasVazao||{})},dieta:{...(found.bed.dieta||{}),...(cmd.dietUpdates||{}),meta:{...(found.bed.dieta?.meta||{}),...(cmd.dietUpdates?.meta||{})}},dispositivos:applyDevices(found.bed.dispositivos,cmd.deviceOperations),chatgptUltimaAtualizacao:new Date().toISOString()};
  const updatedLeitos=leitos.map(l=>l.id===found.bed.id?updatedBed:l);
  const previous=evolutions[found.bed.id]||{};
  const stamp=new Date().toISOString();
  const dates={...(previous._datas||{})}; Object.keys(cmd.evolutionUpdates||{}).forEach(k=>dates[k]=stamp);
  const updatedEvolutions={...evolutions,[found.bed.id]:{...previous,...(cmd.evolutionUpdates||{}),_datas:dates}};
  return {updatedLeitos,updatedEvolutions,updatedBed};
}

export const newConfirmationToken=()=>crypto.randomBytes(32).toString("base64url");
export const tokenDigest=(token,secret)=>crypto.createHmac("sha256",secret).update(String(token)).digest("hex");
export function safeTokenEqual(token,digest,secret){const a=Buffer.from(tokenDigest(token,secret),"hex"),b=Buffer.from(String(digest||""),"hex");return a.length===b.length&&crypto.timingSafeEqual(a,b);}

import crypto from "node:crypto";
import { parseWhatsappCommand } from "./whatsapp-command.js";

export const PREVIEW_TTL_MS = 10 * 60 * 1000;

export const BED_FIELDS = ["paciente","diagnostico","dataInternacao","dataNascimento","idadeAnos","peso","altura","sexo","bhPrevio","vm_cuidado_cornea","vm_higiene_oral"];
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
export const TABLE_FIELDS = ["hb","ht","leuco","plaq","rni","ttpa","cr","ur","na","k","mg","cai","p","tgo","tgp","bttot","btdir","btind","pcr","_extra_vancocinemia","ph","pco2","po2","hco3","be","lact","c24_temp","c24_fc","c24_fr","c24_sat","c24_pam","c24_dextro","c24_diur","c24_bh"];
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
    const unknownTop=Object.keys(structured).filter(k=>!["operation","bedNumber","targetPatientName","targetUtiId","targetBedId","tableDate","tableUpdates","bedUpdates","drugUpdates","evolutionUpdates","dietUpdates","deviceOperations"].includes(k));
    if (unknownTop.length) throw new Error(`Campos não permitidos em clinicalData: ${unknownTop.join(", ")}`);
    const bedNumber=Number(structured.bedNumber);
    if (!Number.isInteger(bedNumber)||bedNumber<1) throw new Error("clinicalData.bedNumber inválido");
    const operation=structured.operation==="admit"?"admit":"update";
    const targetPatientName=cleanString(structured.targetPatientName,300);
    const targetUtiId=cleanString(structured.targetUtiId,200);
    const targetBedId=cleanString(structured.targetBedId,200);
    const bedUpdates={...pick(structured.bedUpdates,[...BED_FIELDS,...VM_FIELDS],"bedUpdates")};
    for(const key of ["vm_cuidado_cornea","vm_higiene_oral"])if(Object.prototype.hasOwnProperty.call(structured.bedUpdates||{},key))bedUpdates[key]=structured.bedUpdates[key]===true||String(structured.bedUpdates[key]).toLowerCase()==="true";
    const drugs=pick(structured.drugUpdates,DRUG_FIELDS,"drugUpdates");
    if (Object.keys(drugs).length) bedUpdates.drogasVazao=drugs;
    const evolutionUpdates=pick(structured.evolutionUpdates,EVOLUTION_FIELDS,"evolutionUpdates");
    const dietRaw=pick(structured.dietUpdates,[...DIET_FIELDS,"meta"],"dietUpdates");
    delete dietRaw.meta;
    if (structured.dietUpdates?.meta!=null) dietRaw.meta=pick(structured.dietUpdates.meta,DIET_META_FIELDS,"dietUpdates.meta");
    if (dietRaw.tipo && !DIET_TYPES.has(dietRaw.tipo)) throw new Error("Tipo de dieta inválido");
    if (bedUpdates.vm_modo && !VM_MODES.has(bedUpdates.vm_modo)) throw new Error("Modo ventilatório inválido");
    const deviceOperations=validateDeviceOperations(structured.deviceOperations);
    const tableUpdates=pick(structured.tableUpdates,TABLE_FIELDS,"tableUpdates");
    const tableDate=cleanString(structured.tableDate,10)||new Date().toISOString().slice(0,10);
    if (Object.keys(tableUpdates).length&&!/^\d{4}-\d{2}-\d{2}$/.test(tableDate)) throw new Error("tableDate deve estar em YYYY-MM-DD");
    const hasChanges=[bedUpdates,evolutionUpdates,dietRaw,tableUpdates].some(x=>Object.keys(x).length)||deviceOperations.length;
    if (!hasChanges) throw new Error("Nenhuma alteração clínica estruturada foi informada");
    if (operation==="admit"&&!bedUpdates.paciente) throw new Error("Admissão exige o nome do paciente em bedUpdates.paciente");
    return {transcript,command:{operation,bedNumber,targetPatientName,targetUtiId,targetBedId,tableDate,tableUpdates,bedUpdates,evolutionUpdates,dietUpdates:dietRaw,deviceOperations}};
  } catch(error) { return {error:error.message,transcript}; }
}

export function parseClinicalRequests(body={}) {
  const transcript=cleanString(body.transcript,20000);
  const list=Array.isArray(body.clinicalDataList)?body.clinicalDataList:(isObject(body.clinicalData)?[body.clinicalData]:[]);
  if (!list.length) return {error:"Envie clinicalData ou clinicalDataList com pelo menos um paciente",transcript};
  if (list.length>30) return {error:"A folha pode conter no máximo 30 pacientes",transcript};
  const items=[];
  for (let i=0;i<list.length;i++) {
    const parsed=parseClinicalRequest({transcript,clinicalData:list[i]});
    if (parsed.error) return {error:`Paciente ${i+1}: ${parsed.error}`,transcript};
    items.push(parsed);
  }
  return {transcript,items};
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

function findAnyBed(leitos,bedNumber,targetUtiId="",targetBedId="") {
  if(targetBedId){const exact=(leitos||[]).filter(l=>String(l.id)===String(targetBedId));return exact.length===1?{bed:exact[0]}:{error:exact.length?"Leito ambíguo":"Leito identificado na folha não encontrado"};}
  const matches=(leitos||[]).filter(l=>(!targetUtiId||String(l.utiId)===String(targetUtiId))&&(Number(l.id)===bedNumber||Number(String(l.nome||"").match(/\d+/)?.[0])===bedNumber));
  return matches.length===1?{bed:matches[0]}:{error:matches.length?"Leito ambíguo":"Leito não encontrado"};
}

const normalizeMatch=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/gi,"").toLowerCase();
function findUpdateBed(leitos,bedNumber,transcript="",patientHint="",targetUtiId="",targetBedId="") {
  if(targetBedId){const exact=(leitos||[]).filter(l=>String(l.id)===String(targetBedId));return exact.length===1?{bed:exact[0]}:{error:exact.length?"Leito ambíguo":"Leito identificado na folha não encontrado"};}
  const matches=(leitos||[]).filter(l=>(!targetUtiId||String(l.utiId)===String(targetUtiId))&&(Number(l.id)===bedNumber||Number(String(l.nome||"").match(/\d+/)?.[0])===bedNumber));
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
  const found=cmd.operation==="admit"?findAnyBed(leitos,cmd.bedNumber,cmd.targetUtiId,cmd.targetBedId):findUpdateBed(leitos,cmd.bedNumber,parsed.transcript,cmd.targetPatientName||cmd.bedUpdates?.paciente,cmd.targetUtiId,cmd.targetBedId);
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

export function buildBatchPreview(leitos,parsedBatch,evolutions={}) {
  const previews=[];
  for (let i=0;i<parsedBatch.items.length;i++) {
    const preview=buildPreview(leitos,parsedBatch.items[i],evolutions);
    if (preview.error) {
      const cmd=parsedBatch.items[i].command;
      return {error:`Leito ${String(cmd.bedNumber).padStart(2,"0")}${cmd.targetPatientName?` — ${cmd.targetPatientName}`:""}: ${preview.error}`};
    }
    if (previews.some(p=>p.bedId===preview.bedId)) return {error:`O mesmo leito foi informado mais de uma vez: ${preview.bedName}`};
    previews.push(preview);
  }
  return {batch:true,count:previews.length,patients:previews};
}

const FIELD_LABELS={paciente:"Paciente",diagnostico:"Diagnóstico",dataInternacao:"Data de internação",idadeAnos:"Idade",peso:"Peso",altura:"Altura",sexo:"Sexo",bhPrevio:"BH prévio",vm_modo:"Modo ventilatório",vm_fio2:"FiO₂",vm_peep:"PEEP",vm_ps:"PS",vm_fr:"FR",vm_vt:"VC",vm_sato2:"SatO₂",nEF:"Neurológico — exame físico",cvEF:"Cardiovascular — exame físico",reEF:"Respiratório — exame físico",rmObs:"Renal/metabólico",tgEF:"Gastrointestinal — exame físico",heObs:"Hematológico/infeccioso",probAtivos:"Problemas ativos",impressao:"Impressão"};
function describeCommand(cmd) {
  const out=[];
  Object.entries(cmd.bedUpdates||{}).forEach(([k,v])=>k==="drogasVazao"?Object.entries(v).forEach(([d,x])=>out.push(`Droga — ${d}: ${x}`)):out.push(`${FIELD_LABELS[k]||k}: ${v}`));
  Object.entries(cmd.evolutionUpdates||{}).forEach(([k,v])=>out.push(`${FIELD_LABELS[k]||k}: ${v}`));
  Object.entries(cmd.dietUpdates||{}).forEach(([k,v])=>out.push(`Dieta — ${k}: ${isObject(v)?JSON.stringify(v):v}`));
  Object.entries(cmd.tableUpdates||{}).forEach(([k,v])=>out.push(`Tabela ${cmd.tableDate} — ${k}: ${v}`));
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

export function applyConfirmedPreview(leitos,evolutions,pending,tables={}) {
  const cmd=pending.command;
  const found=cmd.operation==="admit"?findAnyBed(leitos,cmd.bedNumber,cmd.targetUtiId,cmd.targetBedId):findUpdateBed(leitos,cmd.bedNumber,pending.transcript,cmd.targetPatientName||cmd.bedUpdates?.paciente,cmd.targetUtiId,cmd.targetBedId);
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
  const existingPatientTable=tables[found.bed.id]||{};
  const updatedTables=Object.keys(cmd.tableUpdates||{}).length?{...tables,[found.bed.id]:{...existingPatientTable,[cmd.tableDate]:{...(existingPatientTable[cmd.tableDate]||{}),...cmd.tableUpdates}}}:tables;
  return {updatedLeitos,updatedEvolutions,updatedTables,updatedBed};
}

export function applyConfirmedBatch(leitos,evolutions,tables,pending) {
  let updatedLeitos=leitos,updatedEvolutions=evolutions,updatedTables=tables;
  const updatedBeds=[];
  for (let i=0;i<pending.commands.length;i++) {
    const result=applyConfirmedPreview(updatedLeitos,updatedEvolutions,{transcript:pending.transcript,command:pending.commands[i],preview:pending.preview.patients[i]},updatedTables);
    if (result.error) return {error:result.error};
    updatedLeitos=result.updatedLeitos; updatedEvolutions=result.updatedEvolutions; updatedTables=result.updatedTables;
    updatedBeds.push(result.updatedBed);
  }
  return {updatedLeitos,updatedEvolutions,updatedTables,updatedBeds};
}

export const newConfirmationToken=()=>crypto.randomBytes(32).toString("base64url");
export const tokenDigest=(token,secret)=>crypto.createHmac("sha256",secret).update(String(token)).digest("hex");
export function safeTokenEqual(token,digest,secret){const a=Buffer.from(tokenDigest(token,secret),"hex"),b=Buffer.from(String(digest||""),"hex");return a.length===b.length&&crypto.timingSafeEqual(a,b);}

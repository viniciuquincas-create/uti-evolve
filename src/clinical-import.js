export const LAB_MAP_TEXT={"hb":"hb","hemoglobina":"hb","ht":"ht","leuco":"leuco","leucocitos":"leuco","plaq":"plaq","plaquetas":"plaq","cr":"cr","creatinina":"cr","ur":"ur","ureia":"ur","na":"na","sodio":"na","k":"k","potassio":"k","mg":"mg","magnesio":"mg","cai":"cai","calcio":"cai","ca":"cai","p":"p","fosforo":"p","fa":"falc","falc":"falc","ggt":"ggt","tgo":"tgo","ast":"tgo","tgp":"tgp","alt":"tgp","bt":"bttot","bttot":"bttot","alb":"alb","rni":"rni","inr":"rni","ttpa":"ttpa","fibri":"fibri","ph":"ph","bic":"hco3","hco3":"hco3","be":"be","pco2":"pco2","po2":"po2","lact":"lact","lactato":"lact","trop":"trop","bnp":"bnp","ntpro":"ntpro","pcr":"pcr"};
export function parsearLabsTexto(txt){const result={};txt.split(/[/;\n]+/).forEach(part=>{const m=part.trim().match(/^([a-zA-Z\u00C0-\u00FF0-9_]+)\s+([0-9.,]+k?)/i);if(!m)return;const[,nome,valRaw]=m;const chave=nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");const key=LAB_MAP_TEXT[chave];let val=valRaw.replace(",",".");if(val.endsWith("k"))val=String(parseFloat(val)*1000);if(key)result[key]=val;else result[`_extra_${nome.toLowerCase()}`]=val;});return result;}


export const CTRL_MAP_TEXT = {
  // Temperatura
  "t":"c24_temp","temp":"c24_temp","temperatura":"c24_temp",
  // Frequências
  "fc":"c24_fc","frequenciacardiaca":"c24_fc","cardíaca":"c24_fc",
  "fr":"c24_fr","frequenciarespiratoria":"c24_fr","respiratoria":"c24_fr",
  // Pressão arterial
  "pas":"c24_pas","sistolica":"c24_pas",
  "pad":"c24_pad","diastolica":"c24_pad",
  "pam":"c24_pam","pamedia":"c24_pam","arterial":"c24_pam",
  // Saturação / glicemia
  "spo2":"c24_sat","sat":"c24_sat","sato2":"c24_sat","saturacao":"c24_sat",
  "dextro":"c24_dextro","glicemia":"c24_dextro","hgt":"c24_dextro","glic":"c24_dextro",
  // Ganhos
  "dietavol":"c24_diet_vol","dieta":"c24_diet_vol","npt":"c24_diet_vol",
  // Perdas
  "du":"c24_diur","diurese":"c24_diur","uo":"c24_diur","diu":"c24_diur","debito":"c24_diur","debitourinario":"c24_diur",
  "hd":"c24_hd","hemodialise":"c24_hd","hemodiálise":"c24_hd","crrt":"c24_hd","uf":"c24_hd",
  // Balanço
  "bh":"c24_bh","balanco":"c24_bh","balanço":"c24_bh","balancohidrico":"c24_bh",
  "bhac":"c24_bh_ac","bhacum":"c24_bh_ac","balancoac":"c24_bh_ac","acumulado":"c24_bh_ac",
  // Monitorização neurológica
  "pic":"c24_pic","pressaointracraniana":"c24_pic",
  "dve":"c24_dve","liquordve":"c24_dve","liquordrenado":"c24_dve","debitodve":"c24_dve",
};

export function normalizarControleImportado(key,valor) {
  const bruto=String(valor??"").trim().replace(/−/g,"-");
  const texto=/^[+-]?\d+(?:[.,]\d+)?$/.test(bruto)?bruto.replace(",","."):bruto;
  const faixas=["c24_temp","c24_fc","c24_fr","c24_sat","c24_pam","c24_pas","c24_pad","c24_dextro","c24_pic"];
  if(!faixas.includes(key))return texto;
  // PAS may contain a systolic/diastolic pair; a slash alone is not a range there.
  if(key==="c24_pas"&&texto.includes("/"))return texto.split("/").map(parte=>normalizarControleImportado("c24_pam",parte)).join(" / ");
  const m=texto.match(/^([+-]?\d+(?:[.,]\d+)?)\s*[-–—/]\s*([+-]?\d+(?:[.,]\d+)?)$/);
  if(!m)return texto;
  const valores=[m[1],m[2]].map(v=>Number(v.replace(",","."))).sort((a,b)=>a-b);
  return `${valores[0]} - ${valores[1]}`;
}
export function parsearControlesTexto(txt) {
  const result = {};
  // Slashes between fields separate entries; numeric slashes remain in the value.
  txt.split(/[;\n]+|\/(?=\s*[a-zA-ZÀ-ú])/).forEach(part => {
    const m=part.trim().match(/^([a-zA-ZÀ-ú0-9_\s]+?)\s+([+−-]?\d+(?:[.,]\d+)?(?:\s*[-–—/]\s*[+−-]?\d+(?:[.,]\d+)?)*)$/);
    if(!m)return;
    const chave=m[1].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
    const key=CTRL_MAP_TEXT[chave];
    if(key)result[key]=normalizarControleImportado(key,m[2]);
  });
  return result;
}

const normalizarNome=v=>String(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const LAB_ALIASES={...LAB_MAP_TEXT,hematocrito:"ht",neutrofilos:"neut",bastoes:"bast",linfocitos:"linf",fibrinogenio:"fibri",calcioionico:"cai",bilirrubinatotal:"bttot",bilirrubinadireta:"btdir",bilirubinatotal:"bttot",bilirubinadir:"btdir",fosfatasealcalina:"falc",glicose:"glic",troponina:"trop",ddimero:"ddimero",procalcitonina:"pct"};
const CONTROLE_ALIASES={...CTRL_MAP_TEXT,temp:"c24_temp",diurese:"c24_diur",sat:"c24_sat",dreno1:"c24_dreno1",dreno2:"c24_dreno2",dreno3:"c24_dreno3",sng:"c24_sng",oferta:"c24_ganhos"};
const LAB_KEYS=new Set([...Object.values(LAB_ALIASES),"neut","bast","linf","btind","pct","ddimero","glic"]);
const CTRL_KEYS=new Set([...Object.values(CONTROLE_ALIASES),"c24_dreno1","c24_dreno2","c24_dreno3","c24_sng","c24_ganhos"]);
export const MAX_IMPORT_FILE_BYTES=3*1024*1024;
export function dataLocal(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
export function validarDataImportacao(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||""))throw new Error("Informe uma data válida para os dados.");
  const d=new Date(`${value}T12:00:00Z`);
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw new Error("A data dos dados não é válida.");
  return value;
}
function valorLab(valor){
  const v=String(valor??"").trim().replace(/−/g,"-");
  const m=v.match(/^([+-]?\d+(?:[.,]\d+)?)(k)?(?:\s*(?:%|g\/d[lL]|mg\/d[lL]|mmol\/[lL]|mEq\/[lL]|U\/[lL]|ng\/(?:m[lL]|[lL])|pg\/m[lL]|mmHg|mil\/mm³))?$/i);
  const numero=m?Number(m[1].replace(",","."))*(m[2]?1000:1):NaN;
  return Number.isFinite(numero)?String(numero):null;
}
function registrar(valores,key,value){
  if(Object.hasOwn(valores,key)&&valores[key]!==value)throw new Error("Há valores diferentes para o mesmo campo. Envie uma coleta por vez.");
  valores[key]=value;
}
export function parsearEntradaClinica(texto){
  const valores={},pendencias=[];
  const partes=String(texto||"").replace(/\r/g,"").split(/[;\n|]+|\/(?=\s*[a-zA-ZÀ-ú])/);
  for(const raw of partes){
    const parte=raw.trim().replace(/^(?:exames|laboratorio|laboratório|labs|controles(?:\s*24h)?)\s*:\s*/i,"");
    if(!parte)continue;
    const m=parte.match(/^([a-zA-ZÀ-ú][a-zA-ZÀ-ú0-9_ ()]*?)\s*[:=\t ]\s*(.+)$/);
    if(!m){pendencias.push(parte);continue;}
    const nome=normalizarNome(m[1]),ctrl=CONTROLE_ALIASES[nome];
    if(ctrl){
      const val=m[2].trim().replace(/−/g,"-");
      if(!/^[+-]?\d+(?:[.,]\d+)?(?:\s*[-–—/]\s*[+-]?\d+(?:[.,]\d+)?)*$/.test(val)){pendencias.push(parte);continue;}
      registrar(valores,ctrl,normalizarControleImportado(ctrl,val));
    }else{
      const key=LAB_ALIASES[nome]||(LAB_KEYS.has(nome)?nome:null),val=valorLab(m[2]);
      if(!key||val===null){pendencias.push(parte);continue;}
      registrar(valores,key,val);
    }
  }
  return {valores,pendencias};
}
export function normalizarDadosExtraidos(payload){
  if(!payload||typeof payload!=="object"||Array.isArray(payload))throw new Error("Não foi possível reconhecer os dados.");
  if(payload.multiplosPacientes||payload.multiplasDatas)throw new Error("O arquivo contém mais de um paciente ou coleta. Envie apenas os dados deste paciente e desta data.");
  if(payload.avisos?.length)throw new Error(`Confira o conteúdo: ${(Array.isArray(payload.avisos)?payload.avisos.join("; "):String(payload.avisos))}`);
  const valores={};
  for(const [nome,valor]of Object.entries(payload.exames||payload.labs||{})){
    if(valor===null||valor===undefined||String(valor).trim()==="")continue;
    const n=normalizarNome(nome),key=LAB_ALIASES[n]||(LAB_KEYS.has(n)?n:null),v=valorLab(valor);
    if(!key||v===null)throw new Error(`Não foi possível reconhecer o exame “${nome}”. Cole esse resultado em texto.`);
    registrar(valores,key,v);
  }
  for(const [nome,valor]of Object.entries(payload.controles||{})){
    if(valor===null||valor===undefined||String(valor).trim()==="")continue;
    const key=CTRL_KEYS.has(nome)?nome:CONTROLE_ALIASES[normalizarNome(nome)];
    if(!key||!/^[+-]?\d+(?:[.,]\d+)?(?:\s*[-–—/]\s*[+-]?\d+(?:[.,]\d+)?)*$/.test(String(valor).trim().replace(/−/g,"-")))throw new Error(`Não foi possível reconhecer o controle “${nome}”. Confira o valor.`);
    registrar(valores,key,normalizarControleImportado(key,valor));
  }
  return {valores,data:payload.dataColeta?validarDataImportacao(payload.dataColeta):null};
}
export function tipoArquivoClinico(file){
  const ext=String(file.name||"").split(".").pop().toLowerCase();
  const tipos={png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",pdf:"application/pdf",txt:"text/plain",csv:"text/csv",tsv:"text/tab-separated-values",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"};
  const mime=tipos[ext]||file.type;
  if(!Object.values(tipos).includes(mime))throw new Error("Use imagem PNG/JPG/WebP, PDF, TXT, CSV, TSV ou DOCX.");
  if(file.size>MAX_IMPORT_FILE_BYTES)throw new Error("O arquivo deve ter até 3 MB.");
  return mime;
}

// Match the storage used by the table's additional-exam and gasometry rows.
export function mesclarLinhaImportada(anterior,valores,data){
  const linha={...anterior};
  const extras={pcr:"pcr",pct:"procalcitonina",ddimero:"dimero_d",glic:"glicose",trop:"troponina"};
  for(const [key,value] of Object.entries(valores)){
    const dreno=key.match(/^c24_(dreno[123]|sng)$/);
    const destino=extras[key]?`_extra_${extras[key]}`:dreno?`_dreno_${dreno[1]}`:key==="c24_ganhos"?"_ctrl_ganhos":key;
    linha[destino]=value;
  }
  if(["ph","hco3","be"].some(k=>Object.hasOwn(valores,k))){
    const gaso=Object.fromEntries(["ph","hco3","be","pco2","po2"].filter(k=>Object.hasOwn(valores,k)).map(k=>[k,valores[k]]));
    let gasos=[];try{const raw=anterior?._gasos;gasos=typeof raw==="string"?JSON.parse(raw):raw||[];}catch{}
    if(!Array.isArray(gasos))gasos=[];
    if(!gasos.some(g=>Object.entries(gaso).every(([k,v])=>g[k]===v)))gasos.push({id:`import-${Date.now()}`,data,horario:"",...gaso});
    linha._gasos=JSON.stringify(gasos);
  }
  return linha;
}

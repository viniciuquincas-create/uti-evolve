// Adult resting reference ranges: Edwards Clinical Education, PP--US-2312 v2.0.
// Blood gas ranges: https://medlineplus.gov/lab-tests/arterial-blood-gas-abg-test/
// Resting heart rate: https://medlineplus.gov/ency/article/003399.htm
// Context-dependent variables deliberately have no fabricated universal range.
export const SWAN_REFERENCE_SOURCE='https://www.edwards.com/apm/media/br/devices/monitoring/hemodynamic%20monitoring/normal%20hemodynamic%20parameters%20and%20lab%20values-1.pdf';
const SWAN_CATALOG=[
  {
    "key": "pvc",
    "label": "PVC",
    "reference": "2–6 mmHg"
  },
  {
    "key": "paps",
    "label": "PAPs",
    "reference": "15–25 mmHg"
  },
  {
    "key": "papd",
    "label": "PAPd",
    "reference": "8–15 mmHg"
  },
  {
    "key": "papm",
    "label": "PAPm",
    "reference": "10–20 mmHg"
  },
  {
    "key": "pcp",
    "label": "PCP",
    "reference": "6–12 mmHg"
  },
  {
    "key": "dc",
    "label": "DC",
    "reference": "4–8 L/min"
  },
  {
    "key": "ic",
    "label": "IC",
    "reference": "2,5–4 L/min/m²"
  },
  {
    "key": "svo2",
    "label": "SvO₂",
    "reference": "60–80%"
  },
  {
    "key": "rvs",
    "label": "RVS",
    "reference": "800–1.200 dyn·s·cm⁻⁵"
  },
  {
    "key": "pas",
    "label": "PAS (mmHg)",
    "reference": "90–140 mmHg"
  },
  {
    "key": "pam",
    "label": "PAM (mmHg)",
    "reference": "70–105 mmHg"
  },
  {
    "key": "pad",
    "label": "PAD (mmHg)",
    "reference": "60–90 mmHg"
  },
  {
    "key": "fc",
    "label": "FC (bpm)",
    "reference": "60–100 bpm em repouso"
  },
  {
    "key": "vs",
    "label": "VS (mL)",
    "reference": "60–100 mL/bat"
  },
  {
    "key": "is",
    "label": "IS (mL/m²)",
    "reference": "33–47 mL/bat/m²"
  },
  {
    "key": "irvs",
    "label": "IRVS",
    "reference": "1.970–2.390 dyn·s·cm⁻⁵·m²"
  },
  {
    "key": "rvp",
    "label": "RVP",
    "reference": "100–250 dyn·s·cm⁻⁵"
  },
  {
    "key": "irvp",
    "label": "IRVP",
    "reference": "255–285 dyn·s·cm⁻⁵·m²"
  },
  {
    "key": "tsve",
    "label": "TSVE (g·m)",
    "reference": "Interpretar com VS e pressões"
  },
  {
    "key": "itsve",
    "label": "ITSVE",
    "reference": "50–62 g·m/bat/m²"
  },
  {
    "key": "tsvd",
    "label": "TSVD (g·m)",
    "reference": "Interpretar com VS e pressões"
  },
  {
    "key": "itsvd",
    "label": "ITSVD",
    "reference": "5–10 g·m/bat/m²"
  },
  {
    "key": "ppac",
    "label": "PPAC (mmHg)",
    "reference": "Depende da fórmula do monitor"
  },
  {
    "key": "duploProduto",
    "label": "Duplo produto (mmHg·bpm)",
    "reference": "Depende de FC e PAS"
  },
  {
    "key": "pesoMonitor",
    "label": "Peso no monitor (kg)",
    "reference": "Dado de entrada do monitor"
  },
  {
    "key": "alturaMonitor",
    "label": "Altura no monitor (cm)",
    "reference": "Dado de entrada do monitor"
  },
  {
    "key": "asc",
    "label": "ASC (m²)",
    "reference": "Depende de peso e altura"
  },
  {
    "key": "imc",
    "label": "IMC (kg/m²)",
    "reference": "Interpretar no contexto nutricional"
  },
  {
    "key": "fio2",
    "label": "FiO₂ (fração)",
    "reference": "0,21 em ar ambiente"
  },
  {
    "key": "pbar",
    "label": "PBar (mmHg)",
    "reference": "Depende da altitude"
  },
  {
    "key": "hb",
    "label": "Hb (g/dL)",
    "reference": "H 13,5–17,5 · M 12–15,5"
  },
  {
    "key": "ph",
    "label": "pH",
    "reference": "7,35–7,45"
  },
  {
    "key": "pao2",
    "label": "PaO₂ (mmHg)",
    "reference": "Depende de idade, FiO₂ e altitude"
  },
  {
    "key": "paco2",
    "label": "PaCO₂ (mmHg)",
    "reference": "35–45 mmHg"
  },
  {
    "key": "sao2",
    "label": "SaO₂",
    "reference": "95–100%"
  },
  {
    "key": "pvo2",
    "label": "PvO₂ (mmHg)",
    "reference": "Conforme local da coleta venosa"
  },
  {
    "key": "pvco2",
    "label": "PvCO₂ (mmHg)",
    "reference": "Conforme local da coleta venosa"
  },
  {
    "key": "cao2",
    "label": "CaO₂",
    "reference": "17–20 mL/dL"
  },
  {
    "key": "cvo2",
    "label": "CvO₂",
    "reference": "12–15 mL/dL"
  },
  {
    "key": "cavO2",
    "label": "C(a−v)O₂",
    "reference": "4–6 mL/dL"
  },
  {
    "key": "gradienteAa",
    "label": "P(A−a)O₂ (mmHg)",
    "reference": "Depende de idade e FiO₂"
  },
  {
    "key": "vo2i",
    "label": "VO₂I",
    "reference": "120–160 mL/min/m²"
  },
  {
    "key": "do2i",
    "label": "DO₂I",
    "reference": "500–600 mL/min/m²"
  },
  {
    "key": "to2",
    "label": "TO₂",
    "reference": "22–30%"
  },
  {
    "key": "cco2",
    "label": "CcO₂ (mL/dL)",
    "reference": "Depende de Hb e oxigenação alveolar"
  },
  {
    "key": "qsqt",
    "label": "Qs/Qt (%)",
    "reference": "Interpretar com FiO₂ e método de cálculo"
  }
];
const normalized=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/₂/g,'2').replace(/[^a-z0-9]/g,'');
export function withSwanReference(field){
 const match=SWAN_CATALOG.find(f=>f.key===field.key||normalized(f.label)===normalized(field.label)||normalized(f.label.split(' (')[0])===normalized(field.label));
 return {...field,range:match?.range,reference:match?.reference||field.reference||'Sem faixa universal estabelecida'};
}

const removed=new Set(['fc','pesoMonitor','alturaMonitor','pas','pam','pad','imc','fio2','pbar','hb','ph','pao2','paco2','sao2','pvo2','pvco2']);
const ranges={pvc:[2,6],paps:[15,25],papd:[8,15],papm:[10,20],pcp:[6,12],dc:[4,8],ic:[2.5,4],svo2:[60,80],rvs:[800,1200],vs:[60,100],is:[33,47],irvs:[1970,2390],rvp:[100,250],irvp:[255,285],itsve:[50,62],itsvd:[5,10],cao2:[17,20],cvo2:[12,15],cavO2:[4,6],vo2i:[120,160],do2i:[500,600],to2:[22,30]};
SWAN_CATALOG.forEach(f=>{f.range=ranges[f.key];});
export function isSwanFieldVisible(field){
 const match=SWAN_CATALOG.find(f=>f.key===field.key||normalized(f.label)===normalized(field.label)||normalized(f.label.split(' (')[0])===normalized(field.label));
 return !removed.has(match?.key||field.key);
}
export const SWAN_FIELDS=SWAN_CATALOG.filter(isSwanFieldVisible);
export function swanReferenceDirection(field,raw){
 if(raw===null||raw===undefined||String(raw).trim()==='')return null;
 const text=String(raw).trim().replace(',','.');
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text))return null;
 const value=Number(text),range=withSwanReference(field).range;
 if(!Number.isFinite(value)||!range)return null;
 return value<range[0]?'below':value>range[1]?'above':null;
}

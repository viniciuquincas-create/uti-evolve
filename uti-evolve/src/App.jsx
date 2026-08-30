import { useState, useRef, useCallback, useEffect } from "react";
import React from "react";
import { createPortal } from "react-dom";
import { supabase } from './supabase.js';

// UTI Evolve — build 2026-06-04T20:46:10 2026-05-28T18:31:01 //2026-05-28T18:12:42

// ── Logo SVG — Cérebro com sensor Brain for Care ──────────────────────────────
const BrainLogo = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* glow aura */}
    <ellipse cx="50" cy="50" rx="28" ry="26" fill="#0ea5e9" opacity="0.05"/>
    {/* contorno cérebro */}
    <path d="M50 22 Q68 18 76 32 Q84 46 80 60 Q76 72 62 76 Q56 78 50 77 Q44 78 38 76 Q24 72 20 60 Q16 46 24 32 Q32 18 50 22Z"
      fill="none" stroke="#7dd3fc" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
    {/* fissura interhemisférica */}
    <path d="M50 22 Q51 40 50 58 Q49 66 50 77"
      fill="none" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="3 4" opacity="0.4"/>
    {/* sulco central D */}
    <path d="M57 26 Q60 38 58 52" fill="none" stroke="#93c5fd" strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/>
    {/* sulco central E */}
    <path d="M43 26 Q40 38 42 52" fill="none" stroke="#93c5fd" strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/>
    {/* fissura de Sylvius D */}
    <path d="M60 52 Q70 50 76 55" fill="none" stroke="#7dd3fc" strokeWidth="1.6" strokeLinecap="round" opacity="0.65"/>
    {/* fissura de Sylvius E */}
    <path d="M40 52 Q30 50 24 55" fill="none" stroke="#7dd3fc" strokeWidth="1.6" strokeLinecap="round" opacity="0.65"/>
    {/* sulco frontal superior D */}
    <path d="M62 30 Q70 36 70 46" fill="none" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
    {/* sulco frontal superior E */}
    <path d="M38 30 Q30 36 30 46" fill="none" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
    {/* sulco parieto-occipital D */}
    <path d="M64 60 Q68 66 66 72" fill="none" stroke="#93c5fd" strokeWidth="1.1" strokeLinecap="round" opacity="0.45"/>
    {/* sulco parieto-occipital E */}
    <path d="M36 60 Q32 66 34 72" fill="none" stroke="#93c5fd" strokeWidth="1.1" strokeLinecap="round" opacity="0.45"/>
    {/* tronco cerebral */}
    <path d="M45 77 Q45 85 50 87 Q55 85 55 77" fill="none" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" opacity="0.65"/>
    {/* ── Brain For Care sensor ── */}
    {/* banda frontal */}
    <path d="M28 21 Q50 13 72 21" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round"/>
    {/* pad sensor central */}
    <rect x="43" y="10" width="14" height="6" rx="3" fill="none" stroke="#38bdf8" strokeWidth="1.6"/>
    <rect x="46" y="12" width="8" height="2" rx="1" fill="#38bdf8" opacity="0.7"/>
    {/* cabo lateral */}
    <path d="M72 21 Q80 18 84 12" fill="none" stroke="#0ea5e9" strokeWidth="1.6" strokeLinecap="round" opacity="0.8"/>
    {/* conector */}
    <rect x="82" y="8" width="6" height="4" rx="1.5" fill="#0ea5e9" opacity="0.75"/>
  </svg>
);

const SISTEMAS = [
  "Neurológico","Respiratório","Hemodinâmico",
  "Renal/Metabólico","Gastrointestinal","Hematológico/Infeccioso","Pele/Acessos",
];

const RANKIN_OPCOES=[
  {v:"0",l:"0 — Sem sintomas"},{v:"1",l:"1 — Sintomas sem incapacidade significativa"},{v:"2",l:"2 — Incapacidade leve; independente"},{v:"3",l:"3 — Incapacidade moderada; necessita alguma ajuda"},{v:"4",l:"4 — Incapacidade moderadamente grave"},{v:"5",l:"5 — Incapacidade grave"},{v:"6",l:"6 — Óbito"},
];

const LEITOS_INICIAIS = [
  { id:1, nome:"Leito 01", paciente:"", diagnostico:"", dataInternacao:"", dataNascimento:"", idadeAnos:"", rankinAdmissao:"", peso:"", altura:"", sexo:"M", bhPrevio:"", acompanhantes:[], procedimentos:[], dispositivos:{} },
  { id:2, nome:"Leito 02", paciente:"", diagnostico:"", dataInternacao:"", dataNascimento:"", idadeAnos:"", rankinAdmissao:"", peso:"", altura:"", sexo:"M", bhPrevio:"", acompanhantes:[], procedimentos:[], dispositivos:{} },
  { id:3, nome:"Leito 03", paciente:"", diagnostico:"", dataInternacao:"", dataNascimento:"", idadeAnos:"", rankinAdmissao:"", peso:"", altura:"", sexo:"M", bhPrevio:"", acompanhantes:[], procedimentos:[], dispositivos:{} },
  { id:4, nome:"Leito 04", paciente:"", diagnostico:"", dataInternacao:"", dataNascimento:"", idadeAnos:"", rankinAdmissao:"", peso:"", altura:"", sexo:"M", bhPrevio:"", acompanhantes:[], procedimentos:[], dispositivos:{} },
];

const leitoVazio = (leito) => ({
  id:leito.id,nome:leito.nome,utiId:leito.utiId,paciente:"",diagnostico:"",dataInternacao:"",dataNascimento:"",idadeAnos:"",rankinAdmissao:"",
  peso:"",altura:"",sexo:"M",bhPrevio:"",acompanhantes:[],procedimentos:[],dispositivos:{},antibioticos:[],culturas:[],
  drogasVazao:{},dieta:{},vm_modo:"",
});

const METAS_SUGESTOES = [
  "Meta de diurese > 0,5 mL/kg/h","Desmame ventilatório — reduzir FiO2",
  "Controle glicêmico 140-180 mg/dL","Mobilização precoce",
  "Reposição de K+ se < 3,5","Hemoculturas antes de ATB",
  "Ecocardiograma beira-leito","Discutir retirada de DVA",
];

// Diluições padrão do protocolo da UTI
// concMcgML = mcg de fármaco por mL da solução final
// unidade = unidade da dose resultante exibida ao usuário
// modoCalc: "mcg_kg_min" | "mcg_kg_h" | "ui_min" | "mcg_min" (vasopressina, nitroglicerina sem peso)
const DROGAS_PROTOCOLO = {
  noradrenalina: {
    label:"Noradrenalina", grupo:"vasoativa",
    diluicaoDesc:"4 amp (16 mg) em SG5% 234 mL → 250 mL",
    concMcgML: 64,
    modoCalcDefault:"mcg_kg_min",
    modoCalcOpcoes:["mcg_kg_min"],
    max:3, unidadeLabel:"mcg/kg/min",
    doseInfo:"0,01 – 3 mcg/kg/min\nDose vasoconstritora: 0,1–0,3 mcg/kg/min\nAlerta: > 1 mcg/kg/min = dose muito alta",
  },
  dobutamina: {
    label:"Dobutamina", grupo:"vasoativa",
    diluicaoDesc:"4 amp 20mL (1000 mg) em SG5% 170 mL → 250 mL",
    concMcgML: 4000,
    modoCalcDefault:"mcg_kg_min",
    modoCalcOpcoes:["mcg_kg_min"],
    max:20, unidadeLabel:"mcg/kg/min",
    doseInfo:"2 – 20 mcg/kg/min\nEfeito inotrópico: 2–10 mcg/kg/min\nEfeito cronotrópico relevante: > 10 mcg/kg/min",
  },
  vasopressina: {
    label:"Vasopressina", grupo:"vasoativa",
    diluicaoDesc:"2 mL (20 UI) em SG5% 98 mL → 100 mL",
    concMcgML: null, concUIML: 0.2,
    modoCalcDefault:"ui_min",
    modoCalcOpcoes:["ui_min"],
    max:0.04, unidadeLabel:"UI/min",
    doseInfo:"0,01 – 0,04 UI/min\nUsado como adjuvante fixo ao lado da noradrenalina\nNão titular — dose fixa de 0,03–0,04 UI/min",
  },
  nitroglicerina: {
    label:"Nitroglicerina", grupo:"vasoativa",
    diluicaoDesc:"10 mL (50 mg) em SG5% 90 mL → 100 mL",
    concMcgML: 500,
    modoCalcDefault:"mcg_min",
    modoCalcOpcoes:["mcg_min","mcg_kg_min"],
    max:400, unidadeLabel:"mcg/min",
    doseInfo:"5 – 400 mcg/min\nCrise hipertensiva/angina: 5–200 mcg/min\nEfeito predominantemente venoso: doses baixas\nEfeito arterial: doses altas (> 200 mcg/min)",
  },
  nitroprussiato: {
    label:"Nitroprussiato", grupo:"vasoativa",
    diluicaoDesc:"2 mL (50 mg) em SG5% 248 mL → 250 mL",
    concMcgML: 200,
    modoCalcDefault:"mcg_kg_min",
    modoCalcOpcoes:["mcg_kg_min"],
    max:10, unidadeLabel:"mcg/kg/min",
    doseInfo:"0,3 – 10 mcg/kg/min\nInício com 0,3–0,5 mcg/kg/min\nAlerta de toxicidade por cianeto: > 4 mcg/kg/min por > 3 dias",
  },
  propofol: {
    label:"Propofol", grupo:"sedacao",
    diluicaoDesc:"10 mg/mL — 100 mL puro (sem diluição)",
    concMcgML: 10000,
    modoCalcDefault:"mg_kg_h",
    modoCalcOpcoes:["mg_kg_h","mcg_kg_min","mg_h"],
    max:4, unidadeLabel:"mg/kg/h",
    doseInfo:"5 – 50 mcg/kg/min  (= 0,3 – 3 mg/kg/h) · 1,1 kcal/mL\nSedação leve: 5–10 mcg/kg/min\nSedação profunda: 25–50 mcg/kg/min\nAlerta PRIS: > 4 mg/kg/h por > 48h",
  },
  midazolam: {
    label:"Midazolam", grupo:"sedacao",
    diluicaoDesc:"20 mL (100 mg) em SG5% 80 mL → 100 mL",
    concMcgML: 1000,
    modoCalcDefault:"mcg_kg_h",
    modoCalcOpcoes:["mcg_kg_h","mg_kg_h"],
    max:150, unidadeLabel:"mcg/kg/h",
    doseInfo:"0,01 – 0,2 mg/kg/h  (= 10 – 200 mcg/kg/h)\nSedação leve: 0,02–0,05 mg/kg/h\nSedação moderada: 0,05–0,15 mg/kg/h\nEvitar uso prolongado: acúmulo e síndrome de abstinência",
  },
  fentanil: {
    label:"Fentanil", grupo:"analgesia",
    diluicaoDesc:"20 mL (1000 mcg) em SF0,9% 80 mL → 100 mL",
    concMcgML: 10,
    modoCalcDefault:"mcg_kg_h",
    modoCalcOpcoes:["mcg_kg_h","mcg_kg_min"],
    max:5, unidadeLabel:"mcg/kg/h",
    doseInfo:"20 – 50 mcg/hora  (dose sem ajuste por peso)\nCom ajuste: 0,5 – 3 mcg/kg/h\nAnalgesia em VM: 25–100 mcg/h\nAtingir score de dor ≤ 3 (BPS ou CPOT)",
  },
  precedex: {
    label:"Precedex", grupo:"sedacao",
    diluicaoDesc:"4 mL (200 mcg) em SF0,9% 96 mL → 100 mL",
    concMcgML: 2,
    modoCalcDefault:"mcg_kg_h",
    modoCalcOpcoes:["mcg_kg_h"],
    max:0.7, unidadeLabel:"mcg/kg/h",
    doseInfo:"0,2 – 1,5 mcg/kg/h\nSem ventilação mecânica: 0,2–0,7 mcg/kg/h\nCom VM: pode usar até 1,5 mcg/kg/h\nVantagem: manutenção da cooperação (sedação colaborativa)",
  },
  cetamina: {
    label:"Cetamina", grupo:"analgesia",
    diluicaoDesc:"10 mL escetamina (500 mg) em SG5% 90 mL → 100 mL · 5 mg/mL",
    concMcgML: 5000,
    modoCalcDefault:"mg_kg_h",
    modoCalcOpcoes:["mg_kg_h","mcg_kg_min"],
    max:1.0, unidadeLabel:"mg/kg/h",
    doseInfo:"0,06 – 0,3 mg/kg/h  (analgesia adjuvante)\nAnalgesia subanestésica: 0,1–0,3 mg/kg/h\nDose alta (sedação): 0,5–1,0 mg/kg/h\nVantagem: broncodilatação, preserva drive respiratório",
  },
  adrenalina: {
    label:"Adrenalina (Epinefrina)", grupo:"vasoativa",
    diluicaoDesc:"16 amp 1mL (16 mg) em SG5% 234 mL → 250 mL",
    concMcgML: 64,
    modoCalcDefault:"mcg_kg_min",
    modoCalcOpcoes:["mcg_kg_min"],
    max:1, unidadeLabel:"mcg/kg/min",
    doseInfo:"0,01 – 1 mcg/kg/min\nChoque anafilático: 0,1–0,5 mcg/kg/min\nAlerta: > 0,5 mcg/kg/min = dose muito alta",
  },
  morfina: {
    label:"Morfina", grupo:"analgesia",
    diluicaoDesc:"50 mL (50 mg) em SF0,9% puro → 100 mL · 1 mg/mL",
    concMcgML: 1000,
    modoCalcDefault:"mg_h",
    modoCalcOpcoes:["mg_h","mg_kg_h"],
    max:10, unidadeLabel:"mg/h",
    doseInfo:"2 – 10 mg/h (contínuo)\nBolus: 2–5 mg EV SN\nAtenção: depressão respiratória, hipotensão",
  },
  amiodarona: {
    label:"Amiodarona", grupo:"vasoativa",
    diluicaoDesc:"6 mL (300 mg) em SG5% 244 mL → 250 mL",
    concMcgML: 1200,
    modoCalcDefault:"mg_h",
    modoCalcOpcoes:["mg_h"],
    max:50, unidadeLabel:"mg/h",
    doseInfo:"Ataque: 5 mg/kg em 1h (= 300–400 mg/h)\nManutenção: 10–20 mg/h\nConversão FA: 300 mg EV em bolus lento",
  },
  furosemida: {
    label:"Furosemida", grupo:"vasoativa",
    diluicaoDesc:"100 mg em SF0,9% 100 mL → 1 mg/mL (1000 mcg/mL)",
    concMcgML: 1000,
    modoCalcDefault:"mg_h",
    modoCalcOpcoes:["mg_h","mg_kg_h"],
    max:40, unidadeLabel:"mg/h",
    doseInfo:"5 – 40 mg/h (infusão contínua)\nHiperidratação refratária: 10–20 mg/h\nAlerta: monitorar K+, Mg2+ e função renal",
  },
  clonidina: {
    label:"Clonidina", grupo:"sedacao",
    diluicaoDesc:"6 amp 1mL (900 mcg) em SF0,9% 44 mL → 50 mL",
    concMcgML: 18,
    modoCalcDefault:"mcg_kg_h",
    modoCalcOpcoes:["mcg_kg_h"],
    max:2, unidadeLabel:"mcg/kg/h",
    doseInfo:"0,5 – 2 mcg/kg/h\nSedação adjuvante e redução de opioides\nAtenção: bradicardia e hipotensão",
  },
  levossimendana: {
    label:"Levossimendana", grupo:"vasoativa",
    diluicaoDesc:"5 mL (12,5 mg) em SG5% 245 mL → 250 mL",
    concMcgML: 50,
    modoCalcDefault:"mcg_kg_min",
    modoCalcOpcoes:["mcg_kg_min"],
    max:0.2, unidadeLabel:"mcg/kg/min",
    doseInfo:"0,05 – 0,2 mcg/kg/min (sem ataque)\nAtaque opcional: 6–12 mcg/kg em 10 min\nDuração: 24h; efeito sustentado por 7–10 dias",
  },
  insulina: {
    label:"Insulina Regular", grupo:"vasoativa",
    diluicaoDesc:"50 UI em SF0,9% 50 mL → 1 UI/mL",
    concMcgML: null, concUIML: 1,
    modoCalcDefault:"ui_min",
    modoCalcOpcoes:["ui_min"],
    max:0.2, unidadeLabel:"UI/min",
    doseInfo:"0,05 – 0,1 UI/kg/h (protocolo glicemia)\nHipercalemia: 10 UI EV bolus\nMeta glicemia: 140–180 mg/dL em UTI",
  },
};

// Modos de cálculo disponíveis com labels
const MODOS_CALC = {
  "mcg_kg_min": { label:"mcg/kg/min", fn:(mlh,conc,peso)=>peso?((mlh*conc)/(peso*60)).toFixed(4):null },
  "mcg_kg_h":   { label:"mcg/kg/h",   fn:(mlh,conc,peso)=>peso?((mlh*conc)/peso).toFixed(2):null },
  "mg_kg_h":    { label:"mg/kg/h",    fn:(mlh,conc,peso)=>peso?((mlh*conc/1000)/peso).toFixed(3):null },
  "mg_kg_min":  { label:"mg/kg/min",  fn:(mlh,conc,peso)=>peso?((mlh*conc/1000)/(peso*60)).toFixed(4):null },
  "mg_h":       { label:"mg/h",       fn:(mlh,conc,_)=>((mlh*conc/1000)).toFixed(2) },
  "mg_min":     { label:"mg/min",     fn:(mlh,conc,_)=>((mlh*conc/1000)/60).toFixed(3) },
  "mcg_min":    { label:"mcg/min",    fn:(mlh,conc,_)=>((mlh*conc)/60).toFixed(1) },
  "ui_min":     { label:"UI/min",     fn:(mlh,_,__)=>null },
  "ui_h":       { label:"UI/h",       fn:(mlh,_,__)=>null },
  "ui_kg_h":    { label:"UI/kg/h",    fn:(mlh,_,__)=>null },
  "ui_kg_min":  { label:"UI/kg/min",  fn:(mlh,_,__)=>null },
};

const getDrogaConfig=(drogaKey,config={})=>{
  const padrao=DROGAS_PROTOCOLO[drogaKey];
  if(padrao)return {...padrao,...(config?.drogasPadrao?.[drogaKey]||{})};
  return (config?.drogasCustom||[]).find(d=>d.key===drogaKey)||null;
};

// mL/h → dose
function calcDoseFromMLH(drogaKey, mlh, peso, concCustom, modoCustom, config={}, pesoPreditoValor=null) {
  const mlhN = parseFloat(mlh);
  if (!mlhN || mlhN <= 0) return null;
  // Check protocol first, then custom drugs from config
  const conf = getDrogaConfig(drogaKey,config);
  if (!conf) return null;
  const p = parseFloat(conf.pesoBase==="predito"?pesoPreditoValor:peso);
  const modoKey = modoCustom || (config?.drogasModo?.[drogaKey]) || conf.modoCalcDefault;
  const conc = concCustom !== undefined ? parseFloat(concCustom) : conf.concMcgML;
  // vasopressina UI
  if (modoKey.startsWith("ui_")) {
    const concUI=parseFloat(conf.concUIML);
    if(!concUI||concUI<=0)return null;
    let dose=mlhN*concUI;
    if(modoKey.endsWith("_min"))dose/=60;
    if(modoKey.includes("_kg_")){if(!p||p<=0)return null;dose/=p;}
    return { dose: dose.toFixed(4), label: MODOS_CALC[modoKey]?.label||modoKey };
  }
  if (!conc || conc <= 0) return null;
  // Modo: config override > modoCustom > default do protocolo
  const modo = MODOS_CALC[modoKey];
  if (!modo) return null;
  const dose = modo.fn(mlhN, conc, p);
  if (dose === null) return null;
  return { dose, label: modo.label };
}



// ── helpers ──────────────────────────────────────────────────────────────────
// Idade do leito: usa o campo direto idadeAnos (novo, spec REDESIGN_README §5) quando presente;
// cai para o cálculo a partir de dataNascimento para registros antigos (compatibilidade).
function idadeDoLeito(leito) {
  if (!leito) return null;
  if (leito.idadeAnos !== undefined && leito.idadeAnos !== null && leito.idadeAnos !== "") {
    const n = parseInt(leito.idadeAnos, 10);
    if (!isNaN(n)) return n;
  }
  if (leito.dataNascimento) {
    return Math.floor((new Date() - new Date(leito.dataNascimento+"T00:00:00")) / (365.25*86400000));
  }
  return null;
}
function diasInternacao(ds) {
  if (!ds) return null;
  const d = Math.floor((new Date() - new Date(ds+"T00:00:00")) / 86400000);
  return d >= 0 ? d : null;
}
function pesoPredito(alt, sexo) {
  const h = parseFloat(alt);
  if (!h || h < 100) return null;
  return sexo === "M" ? (50 + 0.91*(h-152.4)).toFixed(1) : (45.5 + 0.91*(h-152.4)).toFixed(1);
}


// ── UI atoms ─────────────────────────────────────────────────────────────────
const mono = "'DM Mono', monospace";

// ── Theme tokens ─────────────────────────────────────────────────────────────
const DARK = {
  bgPage:           "#080f0a",
  bgCard:           "rgba(255,255,255,0.04)",
  bgCardHover:      "rgba(255,255,255,0.07)",
  bgSidebar:        "rgba(255,255,255,0.015)",
  bgHeader:         "rgba(8,15,10,0.97)",
  bgInput:          "rgba(255,255,255,0.04)",
  bgPicker:         "#0c1a10",
  bgSel:            "rgba(56,189,248,0.1)",
  text1:            "#e2e8f0",
  text2:            "#94a3b8",
  text3:            "#64748b",
  text4:            "#475569",
  textDim:          "#334155",
  border:           "rgba(255,255,255,0.09)",
  borderStrong:     "rgba(255,255,255,0.15)",
  borderAccent:     "rgba(56,189,248,0.08)",
  accent:           "#38bdf8",
  accentBg:         "rgba(56,189,248,0.1)",
  accentBorder:     "rgba(56,189,248,0.3)",
  shadow:           "none",
  shadowCard:       "none",
  colorScheme:      "dark",
  bgTableHead:      "#0b1510",
  bgTableSticky:    "#080f0a",
  bgTableGroup:     "rgba(255,255,255,0.025)",
  bgTableGroupCtrl: "rgba(56,189,248,0.04)",
  colorTableInput:  "#e2e8f0",
  colorTableMuted:  "#94a3b8",
  borderTable:      "rgba(255,255,255,0.07)",
  borderTableRow:   "rgba(255,255,255,0.04)",
};

const LIGHT = {
  bgPage:           "#e8eef5",
  bgCard:           "#ffffff",
  bgCardHover:      "#e2e8f0",
  bgSidebar:        "#edf2f7",
  bgHeader:         "rgba(248,250,252,0.98)",
  bgInput:          "#ffffff",
  bgPicker:         "#ffffff",
  bgSel:            "rgba(2,132,199,0.07)",
  text1:            "#0f172a",
  text2:            "#334155",
  text3:            "#475569",
  text4:            "#334155",
  textDim:          "#475569",
  border:           "#8291a3",
  borderStrong:     "#5f6f82",
  borderAccent:     "rgba(2,132,199,0.18)",
  accent:           "#0284c7",
  accentBg:         "rgba(2,132,199,0.08)",
  accentBorder:     "rgba(2,132,199,0.35)",
  shadow:           "0 1px 3px rgba(0,0,0,0.08)",
  shadowCard:       "0 3px 10px rgba(15,23,42,0.13), 0 1px 3px rgba(15,23,42,0.08)",
  colorScheme:      "light",
  bgTableHead:      "#f0f4f8",
  bgTableSticky:    "#ffffff",
  bgTableGroup:     "rgba(0,0,0,0.04)",
  bgTableGroupCtrl: "rgba(2,132,199,0.05)",
  colorTableInput:  "#0f172a",
  colorTableMuted:  "#475569",
  borderTable:      "rgba(0,0,0,0.09)",
  borderTableRow:   "rgba(0,0,0,0.05)",
};

const ThemeCtx = React.createContext(DARK);
const useTheme = () => React.useContext(ThemeCtx);

function Pill({ label, value, unit, color="#38bdf8", warn=false }) {
  const T = useTheme();
  return (
    <div style={{ background: warn?"rgba(248,113,113,0.08)":T.bgCard, border:`1px solid ${warn?"rgba(248,113,113,0.3)":T.border}`, borderRadius:10, padding:"13px 16px", minWidth:96, textAlign:"center", boxShadow:T.shadowCard }}>
      <div style={{ fontSize:9, color:T.text3, fontFamily:mono, letterSpacing:1.5, marginBottom:5, textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700, color: warn?"#f87171":color }}>{value??"-"}</div>
      {unit&&<div style={{ fontSize:10, color:T.text3, marginTop:3 }}>{unit}</div>}
    </div>
  );
}

function SecTitle({ children }) {
  const T = useTheme();
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, margin:"26px 0 14px" }}>
      <div style={{ width:3, height:13, background:T.accent, borderRadius:2 }}/>
      <span style={{ fontSize:10, color:T.text3, fontFamily:mono, letterSpacing:2.5, fontWeight:500 }}>{children}</span>
    </div>
  );
}

function Collapsible({ title, defaultOpen=true, children, badge=null }) {
  const [open, setOpen] = useState(defaultOpen);
  const T = useTheme();
  const mono2 = "'DM Mono',monospace";
  return (
    <div>
      <button onClick={()=>setOpen(o=>!o)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:8, background:"none",
        border:"none", borderBottom:`1px solid ${T.border}`, cursor:"pointer",
        padding:"8px 0", marginBottom:open?10:0, marginTop:16,
      }}>
        <div style={{width:3,height:12,background:T.accent,borderRadius:2,flexShrink:0}}/>
        <span style={{fontSize:10,fontFamily:mono2,letterSpacing:2.5,fontWeight:500,color:T.text3,flex:1,textAlign:"left"}}>{title}</span>
        {badge&&<span style={{fontSize:10,color:"#64748b",fontFamily:mono2,marginRight:4}}>{badge}</span>}
        <span style={{fontSize:10,color:"#475569"}}>{open?"▲":"▼"}</span>
      </button>
      {open && children}
    </div>
  );
}

function Field({ label, value, onChange, type="text", placeholder="", suffix="" }) {
  const T = useTheme();
  return (
    <div style={{ flex:1 }}>
      <div style={{ fontSize:10, color:T.text3, fontFamily:mono, letterSpacing:1, marginBottom:5 }}>{label}</div>
      <div style={{ display:"flex", background:T.bgInput, border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden", boxShadow:T.shadow }}>
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{ flex:1, background:"none", border:"none", padding:"9px 12px", color:T.text1, fontSize:13, fontFamily:"inherit", width:"100%" }}/>
        {suffix&&<span style={{ paddingRight:12, color:T.text3, fontSize:12, alignSelf:"center" }}>{suffix}</span>}
      </div>
    </div>
  );
}

const PROC_SUGESTOES = [
  "Laparotomia exploradora","Laparotomia de controle de dano","Relaparotomia",
  "Craniotomia descompressiva","Traqueostomia","Toracotomia",
  "Drenagem de tórax","Amputação","Fasciotomia","Embolectomia",
  "Bypass coronariano","Troca valvar","ECMO","Diálise — início",
  "Acesso venoso central","Cateter de artéria pulmonar",
];

// ── ProcedimentosPanel ────────────────────────────────────────────────────────
function ProcedimentosPanel({ procedimentos=[], onChange }) {
  const [nome, setNome]         = useState("");
  const [data, setData]         = useState(new Date().toISOString().split("T")[0]);
  const [showSug, setShowSug]   = useState(false);
  const [editId, setEditId]     = useState(null);

  const diasPO = (ds) => {
    if (!ds) return null;
    const d = Math.floor((new Date() - new Date(ds+"T00:00:00")) / 86400000);
    return d >= 0 ? d : null;
  };

  const addProc = (n = nome) => {
    if (!n.trim() || !data) return;
    const novo = { id: Date.now(), nome: n.trim(), data };
    onChange([...procedimentos, novo]);
    setNome(""); setShowSug(false);
  };

  const removeProc = (id) => onChange(procedimentos.filter(p=>p.id!==id));

  const updateProc = (id, field, val) =>
    onChange(procedimentos.map(p=>p.id===id?{...p,[field]:val}:p));

  return (
    <div>
      <SecTitle>PROCEDIMENTOS CIRÚRGICOS / INVASIVOS</SecTitle>

      {/* Lista de procedimentos */}
      {procedimentos.length === 0 && (
        <div style={{padding:"18px 14px",background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.08)",borderRadius:8,textAlign:"center",color:"#334155",fontSize:13,marginBottom:12}}>
          Nenhum procedimento registrado
        </div>
      )}

      {procedimentos.map((p, pidx)=>{
        const po = diasPO(p.data);
        const editing = editId === p.id;
        return (
          <div key={p.id} style={{display:"flex",alignItems:"stretch",gap:4,marginBottom:8}}>
            {/* Botões de reordenação */}
            <div style={{display:"flex",flexDirection:"column",gap:2,justifyContent:"center"}}>
              <button onClick={()=>{
                if(pidx===0) return;
                const n=[...procedimentos];[n[pidx-1],n[pidx]]=[n[pidx],n[pidx-1]];onChange(n);
              }} style={{background:"none",border:"none",color:pidx===0?"#1e293b":"#64748b",cursor:pidx===0?"default":"pointer",fontSize:11,padding:"2px 4px"}}>▲</button>
              <button onClick={()=>{
                if(pidx===procedimentos.length-1) return;
                const n=[...procedimentos];[n[pidx],n[pidx+1]]=[n[pidx+1],n[pidx]];onChange(n);
              }} style={{background:"none",border:"none",color:pidx===procedimentos.length-1?"#1e293b":"#64748b",cursor:pidx===procedimentos.length-1?"default":"pointer",fontSize:11,padding:"2px 4px"}}>▼</button>
            </div>
            <div style={{flex:1,display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,position:"relative",overflow:"hidden"}}>
            {/* barra lateral colorida por tempo */}
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background: po===0?"#f87171":po<=3?"#fb923c":po<=7?"#f59e0b":"#34d399",borderRadius:"3px 0 0 3px"}}/>
            <div style={{flex:1,paddingLeft:4}}>
              {editing ? (
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <input value={p.nome} onChange={e=>updateProc(p.id,"nome",e.target.value)}
                    style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(56,189,248,0.4)",borderRadius:6,padding:"5px 8px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
                  <input type="date" value={p.data} onChange={e=>updateProc(p.id,"data",e.target.value)}
                    style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(56,189,248,0.4)",borderRadius:6,padding:"5px 8px",color:"#e2e8f0",fontSize:12,fontFamily:"inherit"}}/>
                  <button onClick={()=>setEditId(null)} style={{padding:"5px 10px",borderRadius:6,border:"1px solid #38bdf8",background:"rgba(56,189,248,0.1)",color:"#38bdf8",cursor:"pointer",fontSize:12}}>✓ Ok</button>
                </div>
              ) : (
                <>
                  <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{p.nome}</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:2,fontFamily:mono}}>
                    {new Date(p.data+"T00:00:00").toLocaleDateString("pt-BR")}
                  </div>
                </>
              )}
            </div>
            {!editing && po !== null && (
              <div style={{textAlign:"center",minWidth:56,padding:"4px 10px",borderRadius:8,background: po===0?"rgba(248,113,113,0.12)":po<=3?"rgba(251,146,60,0.12)":po<=7?"rgba(245,158,11,0.12)":"rgba(52,211,153,0.12)", border:`1px solid ${po===0?"rgba(248,113,113,0.35)":po<=3?"rgba(251,146,60,0.35)":po<=7?"rgba(245,158,11,0.35)":"rgba(52,211,153,0.35)"}`}}>
                <div style={{fontSize:16,fontWeight:700,color: po===0?"#f87171":po<=3?"#fb923c":po<=7?"#fbbf24":"#34d399",lineHeight:1}}>
                  {po===0?"POI":`PO${po}`}
                </div>
                <div style={{fontSize:9,color:"#64748b",fontFamily:mono,marginTop:1}}>
                  {po===0?"HOJE":po===1?"1 DIA":`${po} DIAS`}
                </div>
              </div>
            )}
            {!editing && (
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <button onClick={()=>setEditId(p.id)} title="Editar" style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:13,padding:2}}>✏️</button>
                <button onClick={()=>removeProc(p.id)} title="Remover" style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:13,padding:2}}>🗑️</button>
              </div>
            )}
          </div>
          </div>
        );
      })}

      {/* Adicionar novo */}
      <div style={{marginTop:12,padding:"14px",background:"rgba(56,189,248,0.04)",border:"1px solid rgba(56,189,248,0.12)",borderRadius:10}}>
        <div style={{fontSize:10,color:"#38bdf8",fontFamily:mono,letterSpacing:1.5,marginBottom:10}}>+ REGISTRAR PROCEDIMENTO</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
          <div style={{flex:2,minWidth:160}}>
            <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:4}}>PROCEDIMENTO</div>
            <input value={nome} onChange={e=>setNome(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addProc()} placeholder="Ex: Laparotomia exploradora"
              style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 10px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
          </div>
          <div style={{flex:1,minWidth:130}}>
            <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:4}}>DATA DO PROCEDIMENTO</div>
            <input type="date" value={data} onChange={e=>setData(e.target.value)}
              style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 10px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
          </div>
          <div style={{display:"flex",alignItems:"flex-end"}}>
            <button onClick={()=>addProc()} style={{padding:"8px 18px",background:"linear-gradient(135deg,#0ea5e9,#0284c7)",border:"none",borderRadius:8,color:"white",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>
              + Adicionar
            </button>
          </div>
        </div>

        {/* Sugestões rápidas */}
        <button onClick={()=>setShowSug(s=>!s)} style={{background:"none",border:"none",color:"#475569",fontSize:11,cursor:"pointer",padding:0,fontFamily:mono,letterSpacing:0.5}}>
          {showSug?"▲ ocultar sugestões":"▼ sugestões rápidas"}
        </button>
        {showSug && (
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
            {PROC_SUGESTOES.map(s=>(
              <button key={s} onClick={()=>{setNome(s);setShowSug(false);}}
                style={{padding:"4px 10px",borderRadius:20,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.03)",color:"#94a3b8",fontSize:11,cursor:"pointer"}}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Legenda */}
      {procedimentos.length > 0 && (
        <div style={{display:"flex",gap:14,marginTop:10,flexWrap:"wrap"}}>
          {[["#f87171","POI / D0"],["#fb923c","PO1–3"],["#fbbf24","PO4–7"],["#34d399","PO8+"]].map(([c,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#64748b"}}>
              <div style={{width:8,height:8,borderRadius:2,background:c}}/>
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── DrogasCalculadora ─────────────────────────────────────────────────────────
const GRUPOS = { vasoativa:"Vasoativas", sedacao:"Sedação", analgesia:"Analgesia" };

function DrogasCalculadora({ peso, pesoPreditoValor=null, onLancarDroga, vazoes={}, onVazaoChange, config={} }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";
  const inputS = {
    background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)",
    borderRadius:10, padding:"10px 14px", color:"#e2e8f0", fontSize:14,
    outline:"none", fontFamily:mono,
  };

  // ── drug list stored in vazoes._list as JSON ──────────────────────────
  const parseList = () => {
    try { const r=vazoes._list; return r?JSON.parse(r):[]; } catch { return []; }
  };

  // Init: import from existing vazoes keys if _list is empty
  const [list, setList] = useState(() => {
    const existing = parseList();
    if (existing.length) return existing;
    return Object.entries(vazoes)
      .filter(([k,v])=>DROGAS_PROTOCOLO[k]&&v&&!k.startsWith("_"))
      .map(([k,v])=>({id:k+"_init", key:k, customName:DROGAS_PROTOCOLO[k].label, mlh:v}));
  });

  const saveList = (newList) => {
    setList(newList);
    onVazaoChange&&onVazaoChange("_list", JSON.stringify(newList));
    // Keep individual keys in sync for VGP DrugRow compatibility
    newList.forEach(d=>{ if(d.key) onVazaoChange&&onVazaoChange(d.key, d.mlh||""); });
  };

  const addDrug = () => saveList([...list, {id:Date.now()+"", key:"", customName:"", mlh:""}]);

  const removeDrug = (id) => {
    const item = list.find(d=>d.id===id);
    if(item?.key) onVazaoChange&&onVazaoChange(item.key,"");
    saveList(list.filter(d=>d.id!==id));
  };

  const updateDrug = (id, updates) => {
    const newList = list.map(d=>d.id===id?{...d,...updates}:d);
    setList(newList);
    onVazaoChange&&onVazaoChange("_list", JSON.stringify(newList));
    const item = newList.find(d=>d.id===id);
    if(item?.key) onVazaoChange&&onVazaoChange(item.key, item.mlh||"");
  };

  const [sug, setSug] = useState({}); // {id: true/false}
  const allDrugs = [
    ...Object.keys(DROGAS_PROTOCOLO).map(k=>({key:k, label:getDrogaConfig(k,config).label})),
    ...(config?.drogasCustom||[]).map(d=>({key:d.key, label:d.label})),
  ];
  // Merged protocol for dose calc
  const getConf = (key) => getDrogaConfig(key,config);

  const fmtDose = (d) => {
    const n = parseFloat(d);
    if (isNaN(n)) return d;
    if (n < 0.001) return n.toExponential(2);
    if (n < 0.01)  return n.toFixed(4);
    if (n < 1)     return n.toFixed(3);
    return n.toFixed(2);
  };

  const CAMPO_EVOLUCAO = { vasoativa:"cvDVA", sedacao:"nSeda", analgesia:"nAnalg" };

  return (
    <div>
      {list.length>0&&(
        <div style={{fontSize:9,color:"#334155",fontFamily:mono,letterSpacing:2,marginBottom:10,textTransform:"uppercase"}}>
          Vasoativos / Inotrópicos (Bombas)
        </div>
      )}

      {list.map(drug=>{
        const conf = drug.key ? getConf(drug.key) : null;
        const resultado = (conf && drug.mlh) ? calcDoseFromMLH(drug.key, drug.mlh, peso, undefined, conf?.modoCalcDefault, config, pesoPreditoValor) : null;
        const acimaDose = resultado && conf?.max && parseFloat(resultado.dose)>conf.max;
        const filtered = allDrugs.filter(d=>d.label.toLowerCase().includes((drug.customName||"").toLowerCase()));

        return (
          <div key={drug.id} style={{marginBottom:8, position:"relative"}}>
            {/* Row: name | mlh | × */}
            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <div style={{flex:1, position:"relative"}}>
                <input value={drug.key?(conf?.label||drug.customName||""):(drug.customName||"")}
                  onChange={e=>{
                    const name=e.target.value;
                    const match=allDrugs.find(d=>d.label.toLowerCase()===name.toLowerCase());
                    updateDrug(drug.id, {customName:name, key:match?match.key:""});
                    setSug(s=>({...s,[drug.id]:name.length>0&&!match}));
                  }}
                  onFocus={()=>setSug(s=>({...s,[drug.id]:(drug.customName||"").length>0&&!drug.key}))}
                  onBlur={()=>setTimeout(()=>setSug(s=>({...s,[drug.id]:false})),160)}
                  placeholder="Nome da droga..."
                  style={{...inputS, width:"100%"}}/>
                {sug[drug.id]&&filtered.length>0&&(
                  <div style={{position:"absolute",top:"calc(100% + 3px)",left:0,right:0,zIndex:60,
                    background:"#0d1f14",border:"1px solid rgba(56,189,248,0.2)",borderRadius:8,
                    maxHeight:180,overflowY:"auto"}}>
                    {filtered.slice(0,8).map(d=>(
                      <div key={d.key} onMouseDown={()=>{
                        updateDrug(drug.id,{customName:d.label,key:d.key});
                        setSug(s=>({...s,[drug.id]:false}));
                      }} style={{padding:"8px 13px",cursor:"pointer",fontSize:12,color:"#cbd5e1",
                        display:"flex",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,0.04)"}}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(56,189,248,0.1)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <span>{d.label}</span>
                        <span style={{fontSize:10,color:"#475569"}}>
                          {getDrogaConfig(d.key,config)?.diluicaoDesc?.split("→")[1]?.trim()||""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input type="number" value={drug.mlh||""} placeholder="mL/h"
                onChange={e=>updateDrug(drug.id,{mlh:e.target.value})}
                style={{...inputS, width:90, textAlign:"center"}}/>
              <button onClick={()=>removeDrug(drug.id)}
                style={{width:38,height:38,flexShrink:0,borderRadius:8,cursor:"pointer",fontSize:18,
                  border:"1px solid rgba(248,113,113,0.3)",background:"rgba(248,113,113,0.08)",color:"#f87171",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                ×
              </button>
            </div>

            {/* Inline dose line */}
            {conf&&drug.mlh&&(
              <div style={{fontSize:11,fontFamily:mono,marginTop:5,paddingLeft:2,lineHeight:1.5}}>
                <span style={{color:acimaDose?"#f87171":"#38bdf8",fontWeight:600}}>
                  {resultado?`≈ ${fmtDose(resultado.dose)} ${resultado.label}`:"—"}
                </span>
                <span style={{color:"#334155"}}>
                  {" (ref. · "}{conf.diluicaoDesc}
                  {conf.concMcgML ? ` → ${(conf.concMcgML/1000).toFixed(3).replace(/\.?0+$/,"")} mg/mL` : ""}
                  {conf.concUIML  ? ` → ${conf.concUIML} UI/mL` : ""}
                  {")"}
                </span>
                {acimaDose&&<span style={{color:"#f87171",marginLeft:8}}>⚠️ máx {conf.max} {conf.unidadeLabel}</span>}
              </div>
            )}

            {/* Lançar na evolução (sutil) */}
            {resultado&&onLancarDroga&&(
              <div style={{marginTop:3,paddingLeft:2}}>
                <button onClick={()=>{
                  const linha=`${conf.label} ${drug.mlh}mL/h (${fmtDose(resultado.dose)} ${resultado.label})`;
                  onLancarDroga(linha, CAMPO_EVOLUCAO[conf.grupo]||"cvDVA");
                }} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",
                  fontSize:10,fontFamily:mono,padding:0,textDecoration:"underline dotted"}}>
                  ↗ lançar na evolução
                </button>
              </div>
            )}
          </div>
        );
      })}

      <button onClick={addDrug}
        style={{width:"100%",marginTop:list.length?8:0,padding:"10px",borderRadius:8,
          background:"transparent",border:"1px dashed rgba(56,189,248,0.2)",
          color:"#38bdf8",cursor:"pointer",fontSize:12,fontFamily:mono,letterSpacing:1}}>
        + adicionar droga
      </button>
    </div>
  );
}

// ── Catálogo de dietas padrão ─────────────────────────────────────────────────
const DIETAS_DEFAULT = [
  // ── Enterais — nomenclatura TASY / Hospital São Paulo ────────────────────
  { id:"fresubin_orig",      tipo:"enteral",
    nome:"Dieta Enteral Normocalórica e Normoproteica S.F",
    comercial:"Fresubin Original",
    kcalML:1.00, ptnML:0.038, choML:0.138, lipML:0.034 },
  { id:"fresubin_12hp",      tipo:"enteral",
    nome:"Dieta Enteral Normocalórica e Hiperproteica S.F",
    comercial:"Fresubin 1.2 HP Fibre",
    kcalML:1.20, ptnML:0.056, choML:0.144, lipML:0.044 },
  { id:"fresubin_hp_energy", tipo:"enteral",
    nome:"Dieta Enteral Hipercalórica e Hiperproteica s/sacarose S.F",
    comercial:"Fresubin HP Energy",
    kcalML:1.50, ptnML:0.075, choML:0.170, lipML:0.058 },
  { id:"fresubin_2kcal_hp",  tipo:"enteral",
    nome:"Dieta Enteral Hipercalórica e Hiperproteica 2.0 kcal S.F (sem fibras)",
    comercial:"Fresubin 2Kcal HP",
    kcalML:2.00, ptnML:0.100, choML:0.217, lipML:0.088 },
  { id:"fresubin_2kcal_hpf", tipo:"enteral",
    nome:"Dieta Enteral Hipercalórica e Hiperproteica 2.0 kcal S.F (com fibras)",
    comercial:"Fresubin 2Kcal HP Fibre",
    kcalML:2.00, ptnML:0.100, choML:0.200, lipML:0.090 },
  { id:"survimed_opd",       tipo:"enteral",
    nome:"Dieta Enteral Elementar Normocalórica e Normoproteica S.F",
    comercial:"Survimed OPD",
    kcalML:1.00, ptnML:0.034, choML:0.144, lipML:0.034 },
  { id:"survimed_opd_hn",    tipo:"enteral",
    nome:"Dieta Enteral Elementar Hipercalórica Hiperproteica S.F",
    comercial:"Survimed OPD HN",
    kcalML:1.33, ptnML:0.066, choML:0.175, lipML:0.044 },
  // ── Parenterais — nomenclatura TASY / Hospital São Paulo ─────────────────
  { id:"olimel_n7",    tipo:"parenteral",
    nome:"NP NORMOPROTEICA tricompartimentada poliaminoácidos + glicose + lipídeo - 1000 mL (central)",
    comercial:"Olimel N7 — Baxter",
    kcalML:1.03, ptnML:0.057, choML:0.110, lipML:0.040 },
  { id:"olimel_n9",    tipo:"parenteral",
    nome:"NP HIPERPROTEICA tricompartimentada poliaminoácidos + glicose + lipídeo - 1000 mL (central)",
    comercial:"Olimel N9 — Baxter",
    kcalML:1.05, ptnML:0.072, choML:0.100, lipML:0.040 },
];

function getDietasCatalogo(config) {
  const custom = config?.dietasCatalogo || [];
  // Merge: custom pode sobrescrever ou adicionar
  const ids = new Set(custom.map(d=>d.id));
  return [...DIETAS_DEFAULT.filter(d=>!ids.has(d.id)), ...custom];
}

// ── Utilitários de nutrição ────────────────────────────────────────────────────
function calcNutri(dietaSel, volMl) {
  if (!dietaSel || !volMl) return null;
  return {
    kcal: +(volMl * dietaSel.kcalML).toFixed(0),
    ptn:  +(volMl * dietaSel.ptnML ).toFixed(1),
    cho:  +(volMl * (dietaSel.choML||0)).toFixed(1),
    lip:  +(volMl * (dietaSel.lipML||0)).toFixed(1),
  };
}

function calcAporteGlicose(aporte={}){
  if(!aporte.ativo)return {kcal:0,cho:0};
  const concentracao=parseFloat(aporte.concentracao),volume=parseFloat(aporte.volumeDia);
  if(!Number.isFinite(concentracao)||!Number.isFinite(volume)||concentracao<=0||volume<=0)return {kcal:0,cho:0};
  const cho=volume*concentracao/100;
  return {cho:+cho.toFixed(1),kcal:+(cho*4).toFixed(0)};
}

function calcMetaAbsoluta(meta, peso) {
  if (!meta) return null;
  const m = meta.modo === "kg" ? {
    kcal: meta.kcalKg && peso ? +(parseFloat(meta.kcalKg) * peso).toFixed(0) : null,
    ptn:  meta.ptnKg  && peso ? +(parseFloat(meta.ptnKg ) * peso).toFixed(1) : null,
  } : {
    kcal: meta.kcalTotal ? +parseFloat(meta.kcalTotal) : null,
    ptn:  meta.ptnTotal  ? +parseFloat(meta.ptnTotal)  : null,
  };
  return (m.kcal || m.ptn) ? m : null;
}

function calcularRecomendacaoNutricional(dados={}){
  const peso=parseFloat(dados.peso),altura=parseFloat(dados.altura),ideal=parseFloat(pesoPredito(dados.altura,dados.sexo));
  if(!Number.isFinite(peso)||peso<=0||!Number.isFinite(altura)||altura<=0)return null;
  const imc=peso/Math.pow(altura/100,2);
  let kcalMin,kcalMax,kcalPeso=peso,kcalBase="peso atual";
  if(imc<30){kcalMin=25*peso;kcalMax=30*peso;}
  else if(imc<=50){kcalMin=11*peso;kcalMax=14*peso;}
  else if(Number.isFinite(ideal)&&ideal>0){kcalMin=22*ideal;kcalMax=25*ideal;kcalPeso=ideal;kcalBase="peso ideal";}
  else return {imc,kcalMin:null,kcalMax:null,ptnMin:null,ptnMax:null,erro:"Informe sexo e altura para calcular o peso ideal."};
  let ptnMin=null,ptnMax=null,ptnPeso=null;
  if(imc>=30&&Number.isFinite(ideal)&&ideal>0){ptnPeso=ideal;const fator=imc>=40?2.5:2;ptnMin=fator*ideal;ptnMax=fator*ideal;}
  return {imc,ideal:Number.isFinite(ideal)?ideal:null,kcalMin,kcalMax,kcalPeso,kcalBase,ptnMin,ptnMax,ptnPeso};
}

function calcMetaNutricional(dados={}){
  const meta=dados.dieta?.meta||{},manual=calcMetaAbsoluta(meta,parseFloat(dados.peso)||0),rec=calcularRecomendacaoNutricional(dados);
  if(meta.manualOverride===true||!rec)return manual;
  const kcal=rec.kcalMin!==null?Math.round((rec.kcalMin+rec.kcalMax)/2):null;
  const ptn=rec.ptnMin!==null?+((rec.ptnMin+rec.ptnMax)/2).toFixed(1):manual?.ptn??null;
  return kcal||ptn?{kcal,ptn}:manual;
}

function diasAteInicioDieta(dataInternacao, dataInicio) {
  if (!dataInternacao || !dataInicio) return null;
  const inicio=new Date(`${dataInternacao}T00:00:00`), dieta=new Date(`${dataInicio}T00:00:00`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(dieta.getTime())) return null;
  return Math.max(0,Math.round((dieta-inicio)/86400000));
}

function calcularNutriDia(leito={}, linha={}, config={}) {
  const dieta=leito.dieta||{}, vol=parseFloat(linha.c24_diet_vol)||0;
  const formula=getDietasCatalogo(config).find(d=>d.id===dieta.catalogId)||null;
  const meta=calcMetaNutricional(leito);
  const calculada=calcNutri(formula,vol);
  const modulo=dieta.moduloProteina?.ativo?(parseFloat(dieta.moduloProteina.gramas)||0):0;
  const glicose=calcAporteGlicose(dieta.aporteGlicose);
  const oferta=calculada||modulo||glicose.kcal?{kcal:+((calculada?.kcal||0)+glicose.kcal).toFixed(0),ptn:+((calculada?.ptn||0)+modulo).toFixed(1),cho:+((calculada?.cho||0)+glicose.cho).toFixed(1),lip:calculada?.lip||0}:null;
  return {
    volumeMl:vol||null,metaKcal:meta?.kcal??null,metaProteinaG:meta?.ptn??null,
    ofertaKcal:oferta?.kcal??null,ofertaProteinaG:oferta?.ptn??null,
    adequacaoCaloricaPct:meta?.kcal&&oferta?.kcal?Math.round(oferta.kcal/meta.kcal*100):null,
    adequacaoProteicaPct:meta?.ptn&&oferta?.ptn?Math.round(oferta.ptn/meta.ptn*100):null,
    dataInicio:dieta.dataInicio||null,diasAteInicio:diasAteInicioDieta(leito.dataInternacao,dieta.dataInicio),
    interrupcaoHoras:linha.c24_diet_pause||null,motivoInterrupcao:linha.c24_diet_pause_motivo||null,
    formulaId:dieta.catalogId||null,formulaNome:formula?.nome||dieta.formula||null,
  };
}

function analisarGasometria(g={}){
  const n=v=>{const x=parseFloat(String(v??"").replace(",","."));return Number.isFinite(x)?x:null;};
  const ph=n(g.ph),hco3=n(g.hco3),pco2=n(g.pco2),sat=n(g.sato2),na=n(g.na),cl=n(g.cl);
  const arterial=sat!==null&&sat>90;
  const anionGap=[na,cl,hco3].every(Number.isFinite)?Math.round((na-cl-hco3)*10)/10:null;
  const agAumentado=anionGap!==null&&anionGap>12;
  const deltaDelta=agAumentado&&hco3<24&&24-hco3>0?Math.round(((anionGap-12)/(24-hco3))*100)/100:null;
  const gravidadeAcidose=()=>ph!==null?(ph<7.2?"grave":ph<7.3?"moderada":"leve"):(hco3<10?"grave":hco3<18?"moderada":"leve");
  const gravidadeAlcalose=()=>ph!==null?(ph>7.6?"grave":ph>7.5?"moderada":"leve"):(hco3>40?"grave":hco3>32?"moderada":"leve");
  const disturbios=[];
  let acidoseMetabolica=null;
  const acidoseMetabolicaPresente=hco3!==null&&((ph!==null&&ph<7.35&&hco3<22)||(ph===null&&hco3<18));
  const alcaloseMetabolicaPresente=hco3!==null&&((ph!==null&&ph>7.45&&hco3>26)||(ph===null&&hco3>30));
  if(acidoseMetabolicaPresente){
    let compensacao="compensação respiratória não avaliada (gasometria não arterial)";
    if(arterial&&pco2!==null){const esperado=1.5*hco3+8;compensacao=pco2<esperado-2?"alcalose respiratória associada":pco2>esperado+2?"acidose respiratória associada":"compensação respiratória adequada";}
    acidoseMetabolica={gravidade:gravidadeAcidose(),compensacao,anionGap,agAumentado,deltaDelta};
    disturbios.push(`Acidose metabólica ${acidoseMetabolica.gravidade} · ${compensacao}`);
  }else if(alcaloseMetabolicaPresente){
    let compensacao="compensação respiratória não avaliada (gasometria não arterial)";
    if(arterial&&pco2!==null){const esperado=.7*(hco3-24)+40;compensacao=pco2<esperado-5?"alcalose respiratória associada":pco2>esperado+5?"acidose respiratória associada":"compensação respiratória adequada";}
    disturbios.push(`Alcalose metabólica ${gravidadeAlcalose()} · ${compensacao}`);
  }
  if(arterial&&ph!==null&&pco2!==null){
    if(pco2>45&&ph<7.35)disturbios.push(`Acidose respiratória ${ph<7.2?"grave":ph<7.3?"moderada":"leve"} · ${hco3!==null&&hco3>24?"com compensação metabólica":"sem compensação metabólica evidente"}`);
    else if(pco2<35&&ph>7.45)disturbios.push(`Alcalose respiratória ${ph>7.6?"grave":ph>7.5?"moderada":"leve"} · ${hco3!==null&&hco3<24?"com compensação metabólica":"sem compensação metabólica evidente"}`);
  }
  return {arterial,anionGap,agAumentado,deltaDelta,acidoseMetabolica,disturbios};
}

function problemasAtivosAutomaticos(leito={},tabelaDataLeito={},campos={},config={}){
  const problemas=[];
  const problemaVmi=leito.dispositivos?.tot?.ativo?{id:"vmi",texto:"Intubado em VMI",detalhe:"TOT ativo",subitens:[]}:null;
  if(problemaVmi)problemas.push(problemaVmi);
  const vasoativas=new Set(["noradrenalina","adrenalina","dobutamina","levossimendana","vasopressina","nitroglicerina","nitroprussiato",...(config.drogasCustom||[]).filter(d=>d.grupo==="vasoativa").map(d=>d.key)]);
  const dvaAtivas=Object.entries(leito.drogasVazao||{}).filter(([k,v])=>vasoativas.has(k)&&parseFloat(String(v).replace(",","."))>0);
  const datas=Object.keys(tabelaDataLeito||{}).filter(d=>/^\d{4}-\d{2}-\d{2}/.test(d)).sort();
  const dataAtual=datas.at(-1),linhaAtual=dataAtual?tabelaDataLeito[dataAtual]||{}:{};
  const valorAte=(date,key,score=false)=>{for(const d of [...datas].filter(x=>x<=date).reverse()){const v=score?tabelaDataLeito[d]?._scoreInputs?.[key]:tabelaDataLeito[d]?.[key];if(v!==undefined&&v!==null&&String(v).trim()!=="")return v;}return "";};
  const gasoAte=date=>{for(const d of [...datas].filter(x=>x<=date).reverse()){let gs=tabelaDataLeito[d]?._gasos||[];try{if(typeof gs==="string")gs=JSON.parse(gs);}catch{gs=[];}gs=[...(gs||[])].filter(g=>Object.values(g||{}).some(Boolean)).sort((a,b)=>`${a.data||d} ${a.horario||""} ${a.id||""}`.localeCompare(`${b.data||d} ${b.horario||""} ${b.id||""}`));if(gs.length)return gs.at(-1);}return {};};
  const scorePorData=date=>{
    const salvo=tabelaDataLeito[date]?._scoreInputs||{},g=gasoAte(date),hoje=new Date().toISOString().slice(0,10),atual=date.slice(0,10)===hoje;
    const fio2=numScore(atual?(leito.vm_fio2||valorAte(date,"fio2",true)):valorAte(date,"fio2",true));
    const po2=numScore(g.po2),sat=numScore(g.sato2)??numScore(valorAte(date,"c24_sat")),pam=numScore(valorAte(date,"c24_pam"));
    const circAnterior=valorAte(date,"circulacaoSofa",true)||valorAte(date,"circulacao",true);
    const autoCirc=atual&&dvaAtivas.length?"dva_baixa":circAnterior||(pam!==null&&pam<70?"pam_baixa":"normal");
    return {bilirrubina:valorAte(date,"bttot"),creatinina:valorAte(date,"cr"),inr:valorAte(date,"rni"),leucocitos:valorAte(date,"leuco"),plaquetas:valorAte(date,"plaq"),diurese:valorAte(date,"c24_diur"),
      pf:po2!==null&&fio2?String(Math.round(po2/(fio2/100))):"",sf:sat!==null&&fio2?String(Math.round(sat/(fio2/100))):"",fio2:fio2??"",gcs:atual?(campos.nGlasgow||valorAte(date,"gcs",true)):valorAte(date,"gcs",true),suporteResp:atual?(!!leito.vm_modo||!!valorAte(date,"suporteResp",true)):!!valorAte(date,"suporteResp",true),circulacao:autoCirc,circulacaoSofa:autoCirc,...salvo};
  };
  const evolucao=(valores,format=v=>v)=>valores.length?`${format(valores[0])}${valores.length>1?` → ${format(valores.at(-1))}`:""}`:"";
  if(problemaVmi&&leito.vm_modo==="vm_psv"){
    const nVent=v=>{const n=parseFloat(String(v??"").replace(",","."));return Number.isFinite(n)?n:null;};
    const opcionalVentAtivo=id=>!Object.prototype.hasOwnProperty.call(leito.vmOpcionais||{},id)||!!leito.vmOpcionais[id];
    const alteracoesDiafragma=[];
    const ed=nVent(leito.vm_ed),fed=nVent(leito.vm_fed),pimax=nVent(leito.vm_pimax);
    if(opcionalVentAtivo("ed")&&ed!==null&&ed<1)alteracoesDiafragma.push(`ED ${String(leito.vm_ed).replace(".",",")} cm (<1)`);
    if(opcionalVentAtivo("fed")&&fed!==null&&fed<20)alteracoesDiafragma.push(`FED ${String(leito.vm_fed).replace(".",",")}% (<20%)`);
    if(opcionalVentAtivo("pimax")&&pimax!==null&&Math.abs(pimax)<30)alteracoesDiafragma.push(`PImax ${String(leito.vm_pimax).replace(".",",")} cmH₂O (magnitude <30)`);
    if(alteracoesDiafragma.length)problemaVmi.subitens.push(`Disfunção diafragmática — ${alteracoesDiafragma.join(" · ")}`);

    const ultimoValor=chaves=>{for(const d of [...datas].reverse())for(const k of chaves){const v=nVent(tabelaDataLeito[d]?.[k]);if(v!==null)return v;}return null;};
    const tot=leito.dispositivos?.tot,diasTot=tot?.data?Math.max(0,Math.floor((new Date()-new Date(`${tot.data}T00:00:00`))/86400000)):null;
    const exPres=calcularExPres({rsbi:nVent(leito.expres_rsbi),complacencia:nVent(leito.expres_complacencia),dias:diasTot,egcs:nVent(campos.nGlasgow||leito.expres_egcs),mrc:nVent(leito.expres_mrc),ht:ultimoValor(["ht","hto","hematocrito"]),cr:ultimoValor(["cr","creatinina"]),neuro:leito.expres_neuro==="sim"?true:leito.expres_neuro==="nao"?false:null});
    if(opcionalVentAtivo("expres")&&exPres.total!==null&&exPres.total<=44)problemaVmi.subitens.push(`Alto risco de falha em extubação — ExPreS ${exPres.total}/100`);

    const p01=nVent(leito.vm_p01),esforco=calcPoccEffort(leito),insuficientes=[],excessivas=[];
    if(p01!==null){if(p01>3.5)insuficientes.push(`P0.1 ${p01} cmH₂O`);else if(p01<1)excessivas.push(`P0.1 ${p01} cmH₂O`);}
    if(esforco){if(esforco.delta>15)insuficientes.push(`ΔPocc ${esforco.delta.toFixed(1).replace(".",",")} cmH₂O`);else if(esforco.delta<3)excessivas.push(`ΔPocc ${esforco.delta.toFixed(1).replace(".",",")} cmH₂O`);if(esforco.pmusc>10)insuficientes.push(`Pmusc ${esforco.pmusc.toFixed(1).replace(".",",")} cmH₂O`);else if(esforco.pmusc<5)excessivas.push(`Pmusc ${esforco.pmusc.toFixed(1).replace(".",",")} cmH₂O`);}
    if(insuficientes.length)problemaVmi.subitens.push(`Assistência ventilatória insuficiente — ${insuficientes.join(" · ")}`);
    if(excessivas.length)problemaVmi.subitens.push(`Assistência ventilatória excessiva — ${excessivas.join(" · ")}`);
  }
  const tipoChoque=String(leito.tipoChoque||"").trim();
  const rotuloChoque=base=>tipoChoque?`${base} (${tipoChoque})`:base;
  if(leito.labSOFA){
    const sofas=datas.map(d=>calcSofa(scorePorData(d))).filter(s=>!(s.faltam||[]).length&&Number.isFinite(s.sofa)).map(s=>s.sofa);
    const base=dvaAtivas.length?rotuloChoque("Choque séptico"):"Sepse";
    problemas.push({id:"sepse",texto:sofas.length?`${base} — SOFA ${evolucao(sofas)}`:base,detalhe:dvaAtivas.length?dvaAtivas.map(([k])=>getDrogaConfig(k,config)?.label||k).join(" + "):"sem DVA ativa"});
  }else if(dvaAtivas.length)problemas.push({id:"choque",texto:rotuloChoque("Choque"),detalhe:dvaAtivas.map(([k])=>getDrogaConfig(k,config)?.label||k).join(" + ")});
  if(leito.labACLF){
    const melds=datas.map(d=>calcMeldNa({bilirrubina:tabelaDataLeito[d]?.bttot,inr:tabelaDataLeito[d]?.rni,creatinina:tabelaDataLeito[d]?.cr,sodio:tabelaDataLeito[d]?.na})).filter(Boolean).map(s=>s.meldNa);
    const clifs=datas.map(d=>calcClifScores(scorePorData(d),idadeDoLeito(leito))).filter(s=>!(s.faltam||[]).length&&Number.isFinite(s.clifOF));
    const partes=[];
    if(clifs.length){partes.push(`CLIF-OF ${evolucao(clifs,s=>s.clifOF)}`);if(clifs.every(s=>Number.isFinite(s.clifC)))partes.push(`CLIF-C ${evolucao(clifs,s=>s.clifC)}`);}
    if(melds.length)partes.push(`MELD-Na ${evolucao(melds)}`);
    problemas.push({id:"aclf",texto:partes.length?`ACLF — ${partes.join(" · ")}`:"ACLF — escores incompletos"});
  }
  const nutri=calcularNutriDia(leito,linhaAtual,config);
  if(Number.isFinite(nutri.adequacaoCaloricaPct)&&nutri.adequacaoCaloricaPct<80)problemas.push({id:"kcal",texto:"Fora de metas calóricas",detalhe:`adequação ${nutri.adequacaoCaloricaPct}%`});
  const num=v=>{const n=parseFloat(String(v??"").replace(",","."));return Number.isFinite(n)?n:null;};
  const crRegistradas=datas.map(d=>({data:d.slice(0,10),valor:num(tabelaDataLeito[d]?.cr??tabelaDataLeito[d]?.creatinina)})).filter(x=>x.valor!==null);
  const registroCrAtual=crRegistradas.at(-1)||null;
  const crAtual=registroCrAtual?.valor??null,dataReferenciaCr=registroCrAtual?.data||null;
  const peso=num(leito.peso),diurese=num(dataAtual?valorAte(dataAtual,"c24_diur"):null);
  const atualMs=dataReferenciaCr?new Date(`${dataReferenciaCr}T12:00:00`).getTime():null;
  const crAnteriores=crRegistradas.filter(x=>x.data<(dataReferenciaCr||"")&&(!atualMs||atualMs-new Date(`${x.data}T12:00:00`).getTime()<=7*86400000));
  const basalInformada=num(leito.creatininaBasal);
  const basal=basalInformada??(crRegistradas.length?Math.min(...crRegistradas.map(x=>x.valor)):null);
  const cr48=crAnteriores.filter(x=>atualMs-new Date(`${x.data}T12:00:00`).getTime()<=2*86400000).map(x=>x.valor);
  let grauCr=0;
  if(crAtual!==null){if((basal!==null&&crAtual>=4&&crAtual-basal>=.3)||(basal&&crAtual>=3*basal))grauCr=3;else if(basal&&crAtual>=2*basal)grauCr=2;else if((basal&&crAtual>=1.5*basal)||cr48.some(v=>crAtual-v>=.3))grauCr=1;}
  let grauDiurese=0,debitoKgH=null;
  if(diurese!==null&&peso>0){debitoKgH=diurese/peso/24;if(diurese===0||debitoKgH<.3)grauDiurese=3;else if(debitoKgH<.5)grauDiurese=2;}
  const trsTexto=String(campos.rmTRS||"").toLowerCase();
  const emTRS=/(hemodi|di[aá]lise|\b(?:trs|tsr)\b|crrt|cvvh)/i.test(trsTexto)&&!/(sem|suspensa|não|nao)\s+(hemodi|di[aá]lise|trs|tsr|crrt|cvvh)/i.test(trsTexto);
  const grau=Math.max(grauCr,grauDiurese,emTRS?3:0);
  const eletrolitos=[];
  const registrarDist=(key,nome,grauDist,v,omitir=false)=>{if(!omitir)eletrolitos.push(`${nome} ${grauDist} (${ABREV[key]||key} ${String(v).replace(".",",")})`);};
  const valoresEletro={na:num(dataAtual?valorAte(dataAtual,"na"):null),k:num(dataAtual?valorAte(dataAtual,"k"):null),mg:num(dataAtual?valorAte(dataAtual,"mg"):null),cai:num(dataAtual?valorAte(dataAtual,"cai"):null),p:num(dataAtual?valorAte(dataAtual,"p"):null)};
  const {na,k,mg,cai,p}=valoresEletro;
  if(na!==null&&na<135){const g=na<125?"grave":na<130?"moderada":"leve";registrarDist("na","Hiponatremia",g,na,g!=="grave");}
  else if(na!==null&&na>145){const g=na>=160?"grave":na>=151?"moderada":"leve";registrarDist("na","Hipernatremia",g,na,g==="leve");}
  if(k!==null&&k<3.5)registrarDist("k","Hipocalemia",k<2.5?"grave":k<3?"moderada":"leve",k);
  else if(k!==null&&k>5.5)registrarDist("k","Hipercalemia",k>=6.5?"grave":k>=6?"moderada":"leve",k);
  if(mg!==null&&mg<1.6)registrarDist("mg","Hipomagnesemia",mg<1?"grave":mg<1.2?"moderada":"leve",mg);
  else if(mg!==null&&mg>2.6){const g=mg>8?"grave":mg>=5?"moderada":"leve";registrarDist("mg","Hipermagnesemia",g,mg,g!=="grave");}
  if(cai!==null&&cai<1.1)registrarDist("cai","Hipocalcemia iônica",cai<.8?"grave":cai<1?"moderada":"leve",cai);
  else if(cai!==null&&cai>1.3)registrarDist("cai","Hipercalcemia iônica",cai>1.6?"grave":cai>1.4?"moderada":"leve",cai);
  if(p!==null&&p<2.5)registrarDist("p","Hipofosfatemia",p<1?"grave":p<2?"moderada":"leve",p);
  else if(p!==null&&p>4.5){const g=p>7?"grave":p>5.5?"moderada":"leve";registrarDist("p","Hiperfosfatemia",g,p,g==="leve");}
  if(grau>0){const criterios=[];if(emTRS)criterios.push("TSR");if(crAtual!==null)criterios.push(`Cr ${crAtual}${basal!==null?` (basal ${basal}${basalInformada!==null?", informada":""})`:""}`);if(debitoKgH!==null)criterios.push(`DU ${debitoKgH.toFixed(2).replace(".",",")} mL/kg/h`);problemas.push({id:"lra",texto:`Lesão Renal Aguda — KDIGO ${grau}`,detalhe:`estimado: ${criterios.join(" · ")}`,subitens:eletrolitos});}
  else if(eletrolitos.length)problemas.push({id:"eletrolitos",texto:"Distúrbios hidroeletrolíticos",subitens:eletrolitos});
  if(dataAtual){
    const acidose=analisarGasometria(gasoAte(dataAtual)).acidoseMetabolica;
    if(acidose){
      const detalhes=[];
      if(acidose.anionGap!==null)detalhes.push(`AG ${acidose.anionGap.toFixed(1).replace(".",",")}${acidose.agAumentado?" aumentado":""}`);
      if(acidose.deltaDelta!==null)detalhes.push(`Δ/Δ ${acidose.deltaDelta.toFixed(2).replace(".",",")}`);
      detalhes.push(acidose.compensacao);
      const item=`Acidose metabólica ${acidose.gravidade} — ${detalhes.join(" · ")}`;
      const lra=problemas.find(p=>p.id==="lra");
      const choque=problemas.find(p=>p.id==="choque"||(p.id==="sepse"&&p.texto.startsWith("Choque")));
      if(lra)lra.subitens=[...(lra.subitens||[]),item];
      else if(choque)choque.subitens=[...(choque.subitens||[]),item];
      else problemas.push({id:"acidose-metabolica",texto:`Acidose metabólica ${acidose.gravidade}`,detalhe:detalhes.join(" · ")});
    }
  }
  return problemas;
}

const textoProblemaAutomatico=p=>[`- ${p.texto}`,...(p.subitens||[]).map(s=>`  └ ${s}`)].join("\n");

function NutriBar({ label, recebeu, meta }) {
  const pct = (meta && recebeu) ? Math.min(Math.round(recebeu / meta * 100), 150) : null;
  const ok  = pct !== null && pct >= 80;
  const c   = pct === null ? "#475569" : ok ? "#34d399" : "#f87171";
  return (
    <div style={{flex:1,minWidth:130}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
        <span style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1}}>{label}</span>
        {pct!==null && <span style={{fontSize:11,fontWeight:700,color:c}}>{pct}%</span>}
      </div>
      <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,0.07)",overflow:"hidden",marginBottom:4}}>
        {pct!==null && <div style={{height:"100%",borderRadius:3,background:c,width:`${Math.min(pct,100)}%`,transition:"width 0.4s"}}/>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
        <span style={{color:"#e2e8f0",fontWeight:700}}>{recebeu ?? "—"}</span>
        <span style={{color:"#475569"}}>meta {meta ?? "—"}</span>
      </div>
    </div>
  );
}

// ── Risco de síndrome de realimentação ───────────────────────────────────────
const numClinico = v => { const n=parseFloat(String(v??"").replace(",",".")); return Number.isFinite(n)?n:null; };
function avaliarRealimentacao(dados={}, tabelaDataLeito={}) {
  const dieta=dados.dieta||{}, manual=dieta.refeeding||{};
  const peso=numClinico(dados.peso), altura=numClinico(dados.altura);
  const imc=peso&&altura ? peso/((altura/100)**2) : null;
  const perda=numClinico(manual.perdaPesoPct), dias=numClinico(manual.diasSemIngesta);
  const inicio=dieta.dataInicio||manual.dataInicio||"";
  const rows=Object.entries(tabelaDataLeito||{}).filter(([d,r])=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&r).sort(([a],[b])=>a.localeCompare(b));
  const preEntry=inicio ? ([...rows].reverse().find(([d])=>d<inicio)||rows.find(([d])=>d===inicio)) : null;
  const pre=preEntry?.[1]||null;
  const baixo=(key,lim)=>{ const v=numClinico(pre?.[key]); return v!==null&&v<lim; };
  const eletroPre=!!manual.eletrolitosBaixos||baixo("k",3.5)||baixo("p",2.5)||baixo("mg",1.7);
  const drogas=!!(manual.insulina||manual.quimioterapia||manual.antiacido||manual.diuretico);
  const maior=[imc!==null&&imc<16,perda!==null&&perda>15,dias!==null&&dias>10,eletroPre];
  const menor=[imc!==null&&imc<18.5,perda!==null&&perda>10,dias!==null&&dias>5,!!manual.alcool||drogas];
  const alto=maior.some(Boolean)||menor.filter(Boolean).length>=2;
  let quedaMax=0, eletrólito=""; const comparacoes=[];
  if(inicio){
    const base=pre||rows.find(([d])=>d>=inicio)?.[1];
    const baseDate=preEntry?.[0]||rows.find(([d])=>d>=inicio)?.[0]||"";
    const fim=new Date(inicio+"T00:00:00"); fim.setDate(fim.getDate()+5); const fimS=fim.toISOString().slice(0,10);
    for(const key of ["p","k","mg"]){
      const b=numClinico(base?.[key]); if(!b)continue;
      let menor=null, menorData="";
      for(const [dt,row] of rows.filter(([dt])=>dt>=inicio&&dt<=fimS)){const v=numClinico(row?.[key]);if(v!==null&&(menor===null||v<menor)){menor=v;menorData=dt;}}
      if(menor!==null){const q=(b-menor)/b*100;comparacoes.push({key:key.toUpperCase(),base:b,baseDate,valor:menor,data:menorData,queda:q});if(q>quedaMax){quedaMax=q;eletrólito=key.toUpperCase();}}
    }
  }
  const disfuncao=!!(manual.edema||manual.arritmia||manual.insufResp||manual.alteracaoNeuro);
  const suspeitaClinica=!!(inicio&&(disfuncao||manual.deficienciaTiamina));
  const aspen=quedaMax>=10||!!(inicio&&manual.deficienciaTiamina);
  const gravidade=quedaMax>30||!!(inicio&&manual.deficienciaTiamina)?"grave":quedaMax>=20?"moderada":quedaMax>=10?"leve":"";
  const faltantes=[]; if(imc===null)faltantes.push("IMC"); if(perda===null)faltantes.push("perda ponderal"); if(dias===null)faltantes.push("dias sem ingestão"); if(!inicio)faltantes.push("início da dieta");
  const criterios=[]; if(imc!==null&&imc<16)criterios.push(`IMC ${imc.toFixed(1)} (<16)`); else if(imc!==null&&imc<18.5)criterios.push(`IMC ${imc.toFixed(1)} (<18,5)`); if(perda!==null&&perda>10)criterios.push(`perda ${perda}%`); if(dias!==null&&dias>5)criterios.push(`${dias} dias sem ingestão`); if(eletroPre)criterios.push("K/P/Mg baixo pré-dieta"); if(manual.alcool)criterios.push("álcool"); if(drogas)criterios.push("medicações de risco");
  return {alto,aspen,suspeitaClinica,gravidade,quedaMax,eletrólito,criterios,faltantes,imc,inicio,disfuncao,comparacoes};
}

function avaliarRiscoLAMG(leito={}, tabelaDataLeito={}, campos={}) {
  const rows=Object.entries(tabelaDataLeito||{}).filter(([d,r])=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&r).sort(([a],[b])=>b.localeCompare(a));
  const ultimo=(key)=>{for(const [,r] of rows){const v=numClinico(r?.[key]);if(v!==null)return v;}return null;};
  const plaq=ultimo("plaq"), rni=ultimo("rni"), lact=ultimo("lact");
  const coagulopatia=(plaq!==null&&plaq<50)||(rni!==null&&rni>1.5);
  const dva=Object.entries(leito.drogasVazao||{}).some(([k,v])=>!k.startsWith("_")&&numClinico(v)>0);
  const choque=dva||(lact!==null&&lact>=4);
  const texto=[leito.diagnostico,leito.comorbidades,campos.hda,campos.probAtivos].filter(Boolean).join(" ").toLowerCase();
  const hepatopatia=/cirrose|hepatopatia cr[oô]nica|hipertens[aã]o portal|encefalopatia hep[aá]tica|sangramento varicoso/.test(texto);
  const custom=Array.isArray(leito.dispositivos?.custom)?leito.dispositivos.custom:[];
  const neurocritico=custom.some(d=>/dve|ventric|pic/i.test(d.nome||""))||/\bpic\b|\bdve\b|neurocr[ií]tico|hemorragia subarac|\bhsa\b|trauma cran|\btce\b/.test(`${texto} ${campos.n24h||""}`.toLowerCase());
  const criterios=[];
  if(coagulopatia) criterios.push(plaq!==null&&plaq<50?`plaquetas ${plaq} mil/mm³`:`RNI ${rni}`);
  if(choque) criterios.push(dva?"choque com DVA":`lactato ${lact} mmol/L`);
  if(hepatopatia) criterios.push("hepatopatia crônica");
  if(neurocritico) criterios.push("paciente neurocrítico");
  const profilaxia=campos.tgLAMG||leito.tgLAMG||"";
  return {risco:criterios.length>0,semProfilaxia:!String(profilaxia).trim(),criterios,profilaxia};
}

function RefeedingRiskBox({ dados={}, tabelaDataLeito={}, onChange }) {
  const T=useTheme();
  const [open,setOpen]=useState(false);
  const dieta=dados.dieta||{}, rf=avaliarRealimentacao(dados,tabelaDataLeito);
  const upd=(field,val)=>onChange&&onChange({...dados,dieta:{...dieta,[field]:val}});
  const updRF=(field,val)=>upd("refeeding",{...(dieta.refeeding||{}),[field]:val});
  const ativo=rf.aspen||rf.alto||rf.suspeitaClinica;
  const titulo=rf.aspen?`Possível síndrome de realimentação · ${rf.gravidade||"revisar"}`:rf.alto?"Alto risco de realimentação · NICE":rf.suspeitaClinica?"Sinais clínicos após dieta · revisar":"Síndrome de realimentação · avaliar";
  return <>
    <button onClick={()=>setOpen(true)} style={{width:"100%",padding:"7px 8px",display:"flex",alignItems:"center",gap:7,textAlign:"left",borderRadius:7,cursor:"pointer",border:`1px solid ${ativo?"rgba(251,146,60,.38)":T.border}`,background:ativo?"rgba(251,146,60,.08)":"rgba(148,163,184,.03)",color:ativo?"#fdba74":T.text3}}>
      <span style={{fontSize:12}}>⚠</span><span style={{fontSize:10,lineHeight:1.35,flex:1}}><b>{titulo}</b>{rf.criterios.length>0&&<small style={{display:"block",color:T.text3,marginTop:2}}>{rf.criterios.join(" · ")}</small>}</span><span style={{fontSize:10}}>›</span>
    </button>
    {open&&createPortal(<div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,.72)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}><div onClick={e=>e.stopPropagation()} style={{width:"min(760px,96vw)",maxHeight:"90vh",overflowY:"auto",background:T.bgCard,border:"1px solid rgba(251,146,60,.42)",borderRadius:14,padding:18,boxShadow:"0 24px 80px rgba(0,0,0,.55)"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:12}}><div><b style={{color:"#fdba74",fontSize:15}}>Riscos do paciente · realimentação</b><div style={{fontSize:10,color:T.text3,marginTop:3}}>Triagem NICE e monitorização ASPEN após início calórico. Apoio à decisão; não substitui avaliação clínica.</div></div><button onClick={()=>setOpen(false)} style={{background:"none",border:0,color:T.text3,cursor:"pointer",fontSize:18}}>✕</button></div>
      <div style={{padding:10,borderRadius:9,background:rf.aspen?"rgba(248,113,113,.10)":rf.alto?"rgba(251,146,60,.09)":"rgba(56,189,248,.05)",color:rf.aspen?"#fca5a5":rf.alto?"#fdba74":"#7dd3fc",fontSize:12,marginBottom:14}}><b>{rf.aspen?`Alerta pós-dieta ASPEN: ${rf.gravidade||"possível"}`:rf.alto?"Alto risco pelos critérios NICE":rf.suspeitaClinica?"Alterações clínicas temporais exigem revisão":"Critérios automáticos ainda não definem alto risco"}</b>{rf.quedaMax>=10&&<div style={{marginTop:4}}>Maior queda em até 5 dias: {rf.eletrólito} {rf.quedaMax.toFixed(0)}%.</div>}{rf.comparacoes?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:7}}>{rf.comparacoes.map(c=><span key={c.key} style={{padding:"3px 7px",borderRadius:6,background:"rgba(255,255,255,.05)",fontFamily:"'DM Mono',monospace",fontSize:9}}>{c.key}: {c.base} → {c.valor} ({c.queda>0?"−":"+"}{Math.abs(c.queda).toFixed(0)}%)</span>)}</div>}{rf.faltantes.length>0&&<div style={{marginTop:4,color:T.text3}}>Falta documentar: {rf.faltantes.join(", ")}.</div>}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10}}>{[['dataInicio','Início/reintrodução da dieta','date'],['perdaPesoPct','Perda involuntária em 3–6 meses (%)','number'],['diasSemIngesta','Dias com pouca ou nenhuma ingestão','number']].map(([k,l,t])=><label key={k} style={{fontSize:10,color:T.text2}}>{l}<input type={t} value={(k==='dataInicio'?dieta.dataInicio:dieta.refeeding?.[k])||""} onChange={e=>k==='dataInicio'?upd('dataInicio',e.target.value):updRF(k,e.target.value)} style={{display:"block",width:"100%",marginTop:4,padding:"8px 9px",borderRadius:7,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1}}/></label>)}</div>
      <div style={{fontSize:10,color:T.text3,fontFamily:"'DM Mono',monospace",letterSpacing:1,margin:"16px 0 8px"}}>CRITÉRIOS COMPLEMENTARES NICE</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:7}}>{[['eletrolitosBaixos','K, P ou Mg baixos antes da dieta'],['alcool','História de uso nocivo de álcool'],['insulina','Insulina'],['quimioterapia','Quimioterapia'],['antiacido','Antiácido'],['diuretico','Diurético']].map(([k,l])=><label key={k} style={{fontSize:11,color:T.text2,display:"flex",gap:7,alignItems:"center"}}><input type="checkbox" checked={!!dieta.refeeding?.[k]} onChange={e=>updRF(k,e.target.checked)}/>{l}</label>)}</div>
      <div style={{fontSize:10,color:T.text3,fontFamily:"'DM Mono',monospace",letterSpacing:1,margin:"16px 0 8px"}}>ALTERAÇÕES CLÍNICAS APÓS DIETA</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:7}}>{[['edema','Edema / sobrecarga volêmica'],['arritmia','Arritmia / instabilidade cardíaca'],['insufResp','Piora ou insuficiência respiratória'],['alteracaoNeuro','Alteração neurológica nova'],['deficienciaTiamina','Suspeita de deficiência de tiamina']].map(([k,l])=><label key={k} style={{fontSize:11,color:T.text2,display:"flex",gap:7,alignItems:"center"}}><input type="checkbox" checked={!!dieta.refeeding?.[k]} onChange={e=>updRF(k,e.target.checked)}/>{l}</label>)}</div>
      <div style={{marginTop:14,fontSize:10,lineHeight:1.5,color:T.text3}}>NICE: alto risco se ≥1 critério maior ou ≥2 menores. ASPEN: queda de P/K/Mg em até 5 dias (10–20% leve; 20–30% moderada; &gt;30% ou disfunção por distúrbio/tiamina grave).</div>
    </div></div>, document.body)}
  </>;
}

// ── DietaPanel ────────────────────────────────────────────────────────────────
function DietaPanel({ dados, onChange, config={}, diureseHojeVol="", tabelaDataLeito={}, integrated=false }) {
  const T=useTheme();
  const dieta = dados.dieta || {
    tipo:"enteral", catalogId:"", formula:"",
    vazao:"",
    meta:{ modo:"kg", kcalKg:"25", ptnKg:"1.5", kcalTotal:"", ptnTotal:"" },
    obs:"", moduloProteina:{ativo:false,gramas:""}
  };
  const upd     = (field, val) => onChange({ ...dados, dieta: { ...dieta, [field]: val } });
  const updMeta = (field, val) => upd("meta", { ...(dieta.meta||{}), [field]: val });
  const updMetaManual = (field, val) => upd("meta", { ...(dieta.meta||{}), manualOverride:true, [field]: val });

  const [showCatalog, setShowCatalog] = useState(false);
  const [showDetails, setShowDetails] = useState(!integrated);
  const [showMetas, setShowMetas] = useState(!integrated);

  const peso     = parseFloat(dados.peso) || 0;
  const catalogo = getDietasCatalogo(config);
  const dietaSel = catalogo.find(d=>d.id===dieta.catalogId) || null;
  const meta     = dieta.meta || { modo:"kg" };
  const recomendacao=calcularRecomendacaoNutricional(dados);
  const usarDiretriz=meta.manualOverride!==true;
  const metaManual=calcMetaAbsoluta(meta,peso);
  const metaAbs=calcMetaNutricional(dados)||metaManual;
  const volHoje  = parseFloat(diureseHojeVol) || 0;
  const moduloProteina = dieta.moduloProteina || {ativo:false,gramas:""};
  const moduloPtn = moduloProteina.ativo ? (parseFloat(moduloProteina.gramas)||0) : 0;
  const aporteGlicose=dieta.aporteGlicose||{ativo:false,concentracao:"5",volumeDia:""};
  const glicoseNutri=calcAporteGlicose(aporteGlicose);
  const somarAdicionais = n => n||moduloPtn||glicoseNutri.kcal?{kcal:+((n?.kcal||0)+glicoseNutri.kcal).toFixed(0),ptn:+((n?.ptn||0)+moduloPtn).toFixed(1),cho:+((n?.cho||0)+glicoseNutri.cho).toFixed(1),lip:n?.lip||0}:null;
  const nutriHoje = somarAdicionais(calcNutri(dietaSel, volHoje));
  const kcalPct = metaAbs?.kcal && nutriHoje?.kcal ? Math.round(nutriHoje.kcal/metaAbs.kcal*100) : null;
  const ptnPct = metaAbs?.ptn && nutriHoje?.ptn ? Math.round(nutriHoje.ptn/metaAbs.ptn*100) : null;
  const adequacao = kcalPct!==null && ptnPct!==null ? Math.min(kcalPct,ptnPct) : (kcalPct ?? ptnPct);
  const adequacaoCor = adequacao===null ? "#94a3b8" : adequacao>=80 ? "#34d399" : "#f87171";
  const diasParaDieta = diasAteInicioDieta(dados.dataInternacao,dieta.dataInicio);
  const datasNutri = Object.keys(tabelaDataLeito||{}).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse();
  const linhaNutri = (tabelaDataLeito||{})[datasNutri[0]]||{};
  const pausaHoras = linhaNutri.c24_diet_pause||"", pausaMotivo=linhaNutri.c24_diet_pause_motivo||"";
  const tipoLabel = {enteral:"Enteral",parenteral:"NPT",oral:"Via oral",mista:"Mista",jejum:"Jejum"}[dieta.tipo] || "Não definida";

  const TIPOS = [
    {k:"enteral",   label:"🥤 Enteral"},
    {k:"parenteral",label:"💉 Parenteral"},
    {k:"oral",      label:"🍽️ Oral"},
    {k:"mista",     label:"🔀 Mista"},
    {k:"jejum",     label:"⛔ Jejum"},
  ];
  const filtrados = dieta.tipo==="parenteral"
    ? catalogo.filter(d=>d.tipo==="parenteral"&&((parseFloat(d.kcalML)||0)>0||(parseFloat(d.ptnML)||0)>0))
    : catalogo.filter(d=>d.tipo==="enteral");

  return (
    <div>
      {integrated ? (
        <div style={{marginBottom:12,border:"1px solid rgba(251,146,60,0.28)",borderRadius:12,background:"linear-gradient(135deg,rgba(251,146,60,0.10),rgba(251,146,60,0.025))",overflow:"hidden"}}>
          <div style={{padding:"12px 14px",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{minWidth:190,flex:2}}>
              <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontSize:9,fontFamily:mono,letterSpacing:1.5,color:"#fb923c",fontWeight:800}}>NUTRIÇÃO ATUAL</span>
                <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,color:dieta.tipo==="jejum"?"#fca5a5":"#fdba74",background:dieta.tipo==="jejum"?"rgba(248,113,113,.12)":"rgba(251,146,60,.12)",border:`1px solid ${dieta.tipo==="jejum"?"rgba(248,113,113,.3)":"rgba(251,146,60,.25)"}`,fontWeight:700}}>{tipoLabel}</span>
              </div>
              <div style={{fontSize:12,color:"#e2e8f0",fontWeight:650,lineHeight:1.35}}>{dietaSel?.comercial || dieta.formula || (dieta.tipo==="jejum"?"Dieta suspensa":"Fórmula não selecionada")}</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:5,fontSize:11,color:"#94a3b8",fontFamily:mono}}>
                {dieta.vazao&&<span style={{color:"#fdba74",fontWeight:700}}>{dieta.vazao} mL/h</span>}
                {dieta.dataInicio&&<span>desde {new Date(dieta.dataInicio+"T00:00:00").toLocaleDateString("pt-BR")}{diasParaDieta!==null?` · início D${diasParaDieta}`:""}</span>}
                {volHoje>0&&<span>24h: {volHoje} mL</span>}
                {nutriHoje&&<span>{nutriHoje.kcal} kcal · {nutriHoje.ptn} g ptn{moduloPtn?` (inclui módulo +${moduloPtn} g)`:""}</span>}
              </div>
              {dieta.obs&&<div style={{marginTop:5,fontSize:10,color:"#94a3b8"}}>Tolerância: {dieta.obs}</div>}
              {(pausaHoras||pausaMotivo)&&<div style={{marginTop:5,fontSize:10,color:"#fbbf24"}}>Interrupção 24h: {pausaHoras?`${pausaHoras} h`:"tempo não informado"}{pausaMotivo?` · ${pausaMotivo}`:""}</div>}
            </div>
            <div style={{minWidth:170,flex:1,paddingLeft:12,borderLeft:"1px solid rgba(251,146,60,.16)"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontFamily:mono,color:"#64748b",marginBottom:5}}><span>ADEQUAÇÃO 24H</span><strong style={{color:adequacaoCor}}>{adequacao!==null?`${adequacao}%`:"—"}</strong></div>
              <div style={{height:6,background:"rgba(255,255,255,.07)",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(adequacao||0,100)}%`,background:adequacaoCor,borderRadius:4,transition:"width .25s"}}/></div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:9,color:"#64748b",fontFamily:mono}}><span>KCAL {kcalPct!==null?`${kcalPct}%`:"—"}</span><span>PTN {ptnPct!==null?`${ptnPct}%`:"—"}</span></div>
            </div>
            <button onClick={()=>setShowDetails(v=>!v)} style={{padding:"7px 11px",borderRadius:8,border:"1px solid rgba(251,146,60,.3)",background:showDetails?"rgba(251,146,60,.14)":"rgba(251,146,60,.06)",color:"#fdba74",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{showDetails?"Fechar edição ↑":"Editar nutrição ↓"}</button>
          </div>
        </div>
      ) : <SecTitle>SUPORTE NUTRICIONAL</SecTitle>}

      {(!integrated || showDetails) && <div style={integrated?{padding:"12px 14px 2px",marginTop:-12,marginBottom:12,border:"1px solid rgba(251,146,60,.18)",borderTop:"none",borderRadius:"0 0 12px 12px",background:"rgba(251,146,60,.025)"}:undefined}>

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {TIPOS.map(t=>(
          <button key={t.k} onClick={()=>upd("tipo",t.k)}
            style={{padding:"6px 13px",borderRadius:20,border:`1px solid ${dieta.tipo===t.k?"#38bdf8":"rgba(255,255,255,0.1)"}`,background:dieta.tipo===t.k?"rgba(56,189,248,0.12)":"rgba(255,255,255,0.02)",color:dieta.tipo===t.k?"#38bdf8":"#64748b",fontSize:12,cursor:"pointer",fontWeight:dieta.tipo===t.k?700:400}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:8,marginBottom:14}}>
        <div style={{padding:"9px 11px",border:`1px solid ${T.border}`,borderRadius:9,background:T.bgInput}}><label style={{display:"flex",alignItems:"center",gap:7,color:T.text2,fontSize:11,fontWeight:700,cursor:"pointer"}}><input type="checkbox" checked={!!moduloProteina.ativo} onChange={e=>upd("moduloProteina",{...moduloProteina,ativo:e.target.checked})}/>Adicionar módulo de proteína</label>{moduloProteina.ativo&&<div style={{display:"flex",gap:7,alignItems:"center",marginTop:7}}><input type="number" min="0" step="1" value={moduloProteina.gramas||""} onChange={e=>upd("moduloProteina",{...moduloProteina,gramas:e.target.value})} placeholder="30" style={{width:90,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:7,padding:"6px 8px",color:T.text1}}/><span style={{fontSize:10,color:T.text3}}>g de proteína/dia</span></div>}</div>
        <div style={{padding:"9px 11px",border:`1px solid ${T.border}`,borderRadius:9,background:T.bgInput}}><label style={{display:"flex",alignItems:"center",gap:7,color:T.text2,fontSize:11,fontWeight:700,cursor:"pointer"}}><input type="checkbox" checked={!!aporteGlicose.ativo} onChange={e=>upd("aporteGlicose",{...aporteGlicose,ativo:e.target.checked})}/>Adicionar aporte glicêmico</label>{aporteGlicose.ativo&&<div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",marginTop:7}}><select value={aporteGlicose.concentracao||"5"} onChange={e=>upd("aporteGlicose",{...aporteGlicose,concentracao:e.target.value})} style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:7,padding:"6px 8px",color:T.text1}}>{[5,10,25,50].map(c=><option key={c} value={c}>SG {c}%</option>)}</select><input type="number" min="0" step="10" value={aporteGlicose.volumeDia||""} onChange={e=>upd("aporteGlicose",{...aporteGlicose,volumeDia:e.target.value})} placeholder="Volume/dia" style={{width:105,background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:7,padding:"6px 8px",color:T.text1}}/><span style={{fontSize:10,color:T.text3}}>mL/dia{glicoseNutri.kcal>0?` · ${glicoseNutri.kcal} kcal`:""}</span></div>}</div>
      </div>

      {dieta.tipo==="jejum" ? (
        <div style={{padding:"12px 14px",background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:8,fontSize:13,color:"#fca5a5",marginBottom:10}}>
          ⛔ Em jejum — registre o motivo nas observações.
        </div>
      ) : dieta.tipo==="oral" ? (
        <div style={{padding:"12px 14px",background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:8,fontSize:13,color:"#86efac",marginBottom:10}}>
          🍽️ Dieta oral — registre aceitação e consistência nas observações.
        </div>
      ) : (
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:10,alignItems:"start"}}>
          {/* Fórmula */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:5}}>FÓRMULA / DIETA</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>setShowCatalog(s=>!s)} style={{flex:1,padding:"9px 14px",textAlign:"left",background:dietaSel?T.accentBg:T.bgInput,border:`1px solid ${dietaSel?T.accentBorder:T.border}`,borderRadius:8,color:dietaSel?T.text1:T.text3,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                {dietaSel ? (
                  <div>
                    <div style={{fontWeight:600,fontSize:12,lineHeight:1.4}}>{dietaSel.nome}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3,flexWrap:"wrap"}}>
                      {dietaSel.comercial && <span style={{fontSize:10,color:"#a78bfa",fontFamily:mono}}>↳ {dietaSel.comercial}</span>}
                      {dietaSel.kcalML > 0 && <span style={{fontSize:10,color:"#64748b",fontFamily:mono}}>{dietaSel.kcalML} kcal/mL · {(dietaSel.ptnML*100).toFixed(1)} g ptn/100mL</span>}
                    </div>
                  </div>
                ) : "📋 Selecionar do catálogo..."}
              </button>
              {dietaSel && <button onClick={()=>{upd("catalogId","");upd("formula","");}} style={{padding:"6px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.03)",color:"#64748b",fontSize:11,cursor:"pointer"}}>✕</button>}
            </div>
            {showCatalog && (
              <div style={{marginTop:6,background:T.bgCard,border:`1px solid ${T.borderStrong}`,borderRadius:10,maxHeight:240,overflowY:"auto",padding:"4px",boxShadow:"0 12px 30px rgba(15,23,42,.22)"}}>
                {filtrados.length===0 ? <div style={{padding:"12px",textAlign:"center",color:"#475569",fontSize:12}}>Adicione fórmulas em ⚙️ Configurações.</div>
                  : filtrados.map(d=>(
                    <button key={d.id} onClick={()=>{
                      onChange({...dados, dieta:{...dieta, catalogId:d.id, formula:d.nome}});
                      setShowCatalog(false);
                    }}
                      style={{width:"100%",padding:"8px 12px",textAlign:"left",background:dieta.catalogId===d.id?T.accentBg:"transparent",border:"none",borderBottom:`1px solid ${T.border}`,borderRadius:7,cursor:"pointer",color:T.text1,fontSize:12,fontFamily:"inherit"}}>
                      <div style={{fontWeight:600,lineHeight:1.4,marginBottom:2}}>
                        {d.nome}
                        {d.id.startsWith("custom_")&&<span style={{fontSize:9,color:"#c4b5fd",marginLeft:4}}> ★</span>}
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                        {d.comercial && <span style={{fontSize:10,color:"#a78bfa",fontFamily:mono}}>↳ {d.comercial}</span>}
                        {d.kcalML > 0 && <span style={{fontSize:10,color:"#64748b",fontFamily:mono}}>{d.kcalML} kcal/mL · {(d.ptnML*100).toFixed(1)} g ptn</span>}
                      </div>
                    </button>
                  ))
                }
              </div>
            )}
          </div>

          {/* Vazão atual (exame físico) */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:5}}>VAZÃO ATUAL (para o exame físico)</div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{display:"flex",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,overflow:"hidden",flex:1,maxWidth:180}}>
                <input type="number" value={dieta.vazao||""} onChange={e=>upd("vazao",e.target.value)} placeholder="60"
                  style={{flex:1,background:"none",border:"none",padding:"8px 10px",color:"#e2e8f0",fontSize:14,fontFamily:"inherit"}}/>
                <span style={{paddingRight:10,color:"#475569",fontSize:12,alignSelf:"center"}}>mL/h</span>
              </div>
              {dieta.vazao && <div style={{fontSize:12,color:"#64748b"}}>= {(parseFloat(dieta.vazao)*20).toFixed(0)} mL em 20h · {(parseFloat(dieta.vazao)*24).toFixed(0)} mL/24h</div>}
            </div>
            <div style={{fontSize:10,color:"#475569",marginTop:4}}>ℹ️ O volume real que entrou é registrado nos <strong style={{color:"#38bdf8"}}>Controles 24h</strong> → Vol. Dieta.</div>
            {dietaSel && dieta.vazao && peso>0 && (()=>{
              const volProj = parseFloat(dieta.vazao)*24;
              const nutriProj = somarAdicionais(calcNutri(dietaSel, volProj));
              if (!nutriProj) return null;
              return (
                <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                  <div style={{padding:"4px 10px",borderRadius:6,background:"rgba(251,146,60,0.08)",border:"1px solid rgba(251,146,60,0.2)",fontSize:11,color:"#fdba74"}}>
                    <span style={{color:"#64748b"}}>projetado 24h → </span>
                    <strong>{(nutriProj.kcal/peso).toFixed(1)} kcal/kg/d</strong>
                    <span style={{color:"#64748b"}}> · </span>
                    <strong>{(nutriProj.ptn/peso).toFixed(2)} g ptn/kg/d</strong>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Data de introdução/reintrodução da dieta */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:5}}>INÍCIO / REINTRODUÇÃO DA DIETA</div>
            <input type="date" value={dieta.dataInicio||""} onChange={e=>upd("dataInicio",e.target.value)}
              style={{width:"100%",maxWidth:220,background:"rgba(255,255,255,.04)",border:"1px solid rgba(251,146,60,.24)",borderRadius:8,padding:"8px 10px",color:"#e2e8f0",fontSize:12}}/>
            <div style={{fontSize:10,color:"#475569",marginTop:5,lineHeight:1.4}}>Usada para comparar K, P e Mg da tabela clínica antes da dieta com os valores dos cinco dias seguintes.{diasParaDieta!==null&&<> <strong style={{color:"#fdba74"}}>Dieta iniciada após {diasParaDieta} dia(s) da admissão.</strong></>}</div>
          </div>
          </div>

          {dieta.tipo==="parenteral"&&<div style={{padding:"10px 12px",marginBottom:14,border:`1px solid ${T.accentBorder}`,borderRadius:9,background:T.accentBg}}>
            <div style={{fontSize:10,color:"#38bdf8",fontFamily:mono,letterSpacing:1,marginBottom:7}}>SUPLEMENTAÇÃO ASSOCIADA À NPT</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6}}>
              {["Fitomenadiona","Tiamina","Polivitamínicos","Oligoelementos"].map(s=>{const lista=dieta.suplementosNPT||[];const ativo=lista.includes(s);return <button key={s} onClick={()=>upd("suplementosNPT",ativo?lista.filter(x=>x!==s):[...lista,s])} style={{padding:"4px 9px",borderRadius:12,border:`1px solid ${ativo?T.accentBorder:T.border}`,background:ativo?T.accentBg:T.bgCard,color:ativo?T.accent:T.text2,fontSize:10,cursor:"pointer",fontWeight:700}}>{ativo?"✓":"+"} {s}</button>;})}
            </div>
            <input value={dieta.suplementacaoNPT||""} onChange={e=>upd("suplementacaoNPT",e.target.value)} placeholder="Outras suplementações, doses e frequências..." style={{width:"100%",boxSizing:"border-box",marginTop:7,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:7,padding:"7px 9px",color:T.text1,fontSize:12}}/>
          </div>}

          {/* Metas nutricionais */}
          <div style={{padding:"12px 14px",background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:10,marginBottom:14}}>
            <button onClick={()=>setShowMetas(v=>!v)} style={{width:"100%",display:"flex",justifyContent:"space-between",background:"none",border:"none",padding:0,color:"#c4b5fd",cursor:"pointer",fontFamily:mono,fontSize:10,letterSpacing:1}}><span>🎯 METAS NUTRICIONAIS{metaAbs?` · ${metaAbs.kcal||"—"} kcal · ${metaAbs.ptn||"—"} g ptn/d`:""}</span><span>{showMetas?"▲":"▼"}</span></button>
            {showMetas&&<div style={{marginTop:10}}>
            {recomendacao&&<div style={{marginBottom:10,padding:"9px 10px",borderRadius:8,border:`1px solid ${T.accentBorder}`,background:T.accentBg,color:T.text2,fontSize:10,lineHeight:1.55}}><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><strong style={{color:T.accent}}>Recomendação por IMC {recomendacao.imc.toFixed(1).replace(".",",")}</strong><button onClick={()=>updMeta("manualOverride",false)} style={{marginLeft:"auto",padding:"3px 8px",borderRadius:10,border:`1px solid ${!usarDiretriz?T.border:T.accentBorder}`,background:usarDiretriz?T.accentBg:T.bgCard,color:usarDiretriz?T.accent:T.text3,cursor:"pointer",fontSize:9}}>{usarDiretriz?"✓ Em uso":"Usar recomendação"}</button></div>{recomendacao.kcalMin!==null&&<div>Energia: <b>{Math.round(recomendacao.kcalMin)}–{Math.round(recomendacao.kcalMax)} kcal/dia</b> · {recomendacao.imc<30?"25–30 kcal/kg de peso atual":recomendacao.imc<=50?"11–14 kcal/kg de peso atual":"22–25 kcal/kg de peso ideal"}</div>}{recomendacao.ptnMin!==null?<div>Proteína: <b>{recomendacao.ptnMin.toFixed(0)} g/dia</b> · {recomendacao.imc>=40?"2,5":"2,0"} g/kg de peso ideal ({recomendacao.ideal?.toFixed(1)} kg)</div>:<div>Proteína: mantenha a meta individualizada abaixo.</div>}{recomendacao.erro&&<div style={{color:"#f87171"}}>{recomendacao.erro}</div>}<div style={{color:T.text4}}>A meta operacional usa o ponto médio da faixa energética; pode ser substituída por uma meta personalizada.</div></div>}
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              <button onClick={()=>updMeta("manualOverride",true)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${!usarDiretriz?"#a78bfa":T.border}`,background:!usarDiretriz?"rgba(167,139,250,.15)":T.bgCard,color:!usarDiretriz?"#7c3aed":T.text3,fontSize:11,cursor:"pointer",fontWeight:700}}>Personalizada</button>
              {[{k:"kg",label:"Por kg/dia"},{k:"total",label:"Total fixo/dia"}].map(m=>(
                <button key={m.k} onClick={()=>updMetaManual("modo",m.k)}
                  style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${meta.modo===m.k?"#a78bfa":"rgba(255,255,255,0.1)"}`,background:meta.modo===m.k?"rgba(167,139,250,0.15)":"rgba(255,255,255,0.03)",color:meta.modo===m.k?"#c4b5fd":"#64748b",fontSize:11,cursor:"pointer",fontWeight:meta.modo===m.k?700:400}}>
                  {m.label}
                </button>
              ))}
            </div>
            {meta.modo==="kg" ? (
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>KCAL/KG/DIA</div>
                  <div style={{display:"flex",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:7,overflow:"hidden"}}>
                    <input type="number" step="0.5" value={meta.kcalKg||""} onChange={e=>updMetaManual("kcalKg",e.target.value)} placeholder="25"
                      style={{flex:1,background:"none",border:"none",padding:"7px 9px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
                    <span style={{paddingRight:8,color:"#475569",fontSize:11,alignSelf:"center"}}>kcal/kg</span>
                  </div>
                  {meta.kcalKg&&peso>0&&<div style={{fontSize:10,color:"#94a3b8",marginTop:3}}>= {(parseFloat(meta.kcalKg)*peso).toFixed(0)} kcal/dia</div>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>PTN G/KG/DIA</div>
                  <div style={{display:"flex",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:7,overflow:"hidden"}}>
                    <input type="number" step="0.1" value={meta.ptnKg||""} onChange={e=>updMetaManual("ptnKg",e.target.value)} placeholder="1.5"
                      style={{flex:1,background:"none",border:"none",padding:"7px 9px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
                    <span style={{paddingRight:8,color:"#475569",fontSize:11,alignSelf:"center"}}>g/kg</span>
                  </div>
                  {meta.ptnKg&&peso>0&&<div style={{fontSize:10,color:"#94a3b8",marginTop:3}}>= {(parseFloat(meta.ptnKg)*peso).toFixed(1)} g/dia</div>}
                </div>
              </div>
            ) : (
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>KCAL TOTAL/DIA</div>
                  <div style={{display:"flex",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:7,overflow:"hidden"}}>
                    <input type="number" value={meta.kcalTotal||""} onChange={e=>updMetaManual("kcalTotal",e.target.value)} placeholder="1800"
                      style={{flex:1,background:"none",border:"none",padding:"7px 9px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
                    <span style={{paddingRight:8,color:"#475569",fontSize:11,alignSelf:"center"}}>kcal</span>
                  </div>
                  {meta.kcalTotal&&peso>0&&<div style={{fontSize:10,color:"#94a3b8",marginTop:3}}>= {(parseFloat(meta.kcalTotal)/peso).toFixed(1)} kcal/kg/dia</div>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>PTN TOTAL/DIA (g)</div>
                  <div style={{display:"flex",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:7,overflow:"hidden"}}>
                    <input type="number" value={meta.ptnTotal||""} onChange={e=>updMetaManual("ptnTotal",e.target.value)} placeholder="105"
                      style={{flex:1,background:"none",border:"none",padding:"7px 9px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
                    <span style={{paddingRight:8,color:"#475569",fontSize:11,alignSelf:"center"}}>g</span>
                  </div>
                  {meta.ptnTotal&&peso>0&&<div style={{fontSize:10,color:"#94a3b8",marginTop:3}}>= {(parseFloat(meta.ptnTotal)/peso).toFixed(2)} g/kg/dia</div>}
                </div>
              </div>
            )}
            {metaAbs && (
              <div style={{marginTop:10,padding:"8px 12px",background:"rgba(167,139,250,0.08)",borderRadius:7,fontSize:11,color:"#c4b5fd"}}>
                🎯 Meta: <strong>{metaAbs.kcal ? `${metaAbs.kcal} kcal` : "—"}</strong> · <strong>{metaAbs.ptn ? `${metaAbs.ptn} g ptn` : "—"}</strong> /dia
              </div>
            )}
            </div>}
          </div>

          {/* Atingimento hoje */}
          {nutriHoje && metaAbs && (
            <div style={{padding:"12px 14px",background:"rgba(56,189,248,0.04)",border:"1px solid rgba(56,189,248,0.12)",borderRadius:10,marginBottom:14}}>
              <div style={{fontSize:10,color:"#38bdf8",fontFamily:mono,letterSpacing:1,marginBottom:10}}>
                📊 ATINGIMENTO HOJE
                {!volHoje&&<span style={{color:"#475569",fontWeight:400,marginLeft:8}}>— registre o Vol. Dieta nos Controles 24h</span>}
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <NutriBar label="KCAL/DIA" recebeu={nutriHoje?.kcal} meta={metaAbs?.kcal}/>
                <NutriBar label="PTN/DIA (g)" recebeu={nutriHoje?.ptn} meta={metaAbs?.ptn}/>
              </div>
              {nutriHoje && peso>0 && (
                <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                  {[
                    {l:"Vol",v:`${volHoje} mL`},
                    {l:"kcal/kg",v:`${(nutriHoje.kcal/peso).toFixed(1)}`},
                    {l:"ptn/kg",v:`${(nutriHoje.ptn/peso).toFixed(2)} g/kg`},
                    ...(nutriHoje.cho?[{l:"CHO",v:`${nutriHoje.cho} g`}]:[]),
                    ...(nutriHoje.lip?[{l:"Lip",v:`${nutriHoje.lip} g`}]:[]),
                  ].map(({l,v})=>(
                    <div key={l} style={{padding:"4px 10px",borderRadius:6,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",fontSize:11,color:"#94a3b8"}}>
                      <span style={{color:"#64748b"}}>{l} </span><strong style={{color:"#e2e8f0"}}>{v}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!dietaSel && (
            <div style={{fontSize:11,color:"#64748b",marginBottom:12,padding:"8px 12px",background:"rgba(255,255,255,0.02)",borderRadius:6}}>
              Selecione uma fórmula para calcular. Cadastre novas em ⚙️ <strong style={{color:"#38bdf8"}}>Configurações</strong>.
            </div>
          )}
        </>
      )}

      <Field label="OBSERVAÇÕES" value={dieta.obs} onChange={v=>upd("obs",v)} placeholder="Tolerando, vômitos, resíduo gástrico, data de introdução…"/>
      </div>}
    </div>
  );
}


const DISP_SINGULAR = [
  { key:"tot",   label:"Tubo Orotraqueal (TOT)", icone:"🫁", siteDefault:"",         alertaDias:99 },
  { key:"tqt",   label:"Traqueostomia (TQT)",    icone:"🫁", siteDefault:"",         alertaDias:99 },
  { key:"svd",   label:"Sonda Vesical de Demora",icone:"💧", siteDefault:"",         alertaDias:14 },
  { key:"pai",   label:"Cateter Arterial (PAI)", icone:"📈", siteDefault:"Radial D", alertaDias:7  },
  { key:"sng",   label:"Sonda Naso/Nasoenteral", icone:"🔧", siteDefault:"",         alertaDias:21 },
];

// Dispositivos múltiplos (podem ter N instâncias)
const DISP_MULTIPLO = [
  { key:"cvc",    label:"Cateter Venoso Central", icone:"🩸", siteDefault:"Jugular interna D", alertaDias:7  },
  { key:"dialise",label:"Cateter de Diálise",     icone:"🔴", siteDefault:"Jugular interna D", alertaDias:14 },
  { key:"dreno",  label:"Dreno",                  icone:"🏥", siteDefault:"",                  alertaDias:21 },
];

const diasDisp = (ds) => {
  if (!ds) return null;
  const d = Math.floor((new Date() - new Date(ds+"T00:00:00")) / 86400000);
  return d >= 0 ? d : null;
};

function DispCard({ label, icone, alertaDias, disp, onUpdate, onRemove }) {
  const T = useTheme();
  const claro = T.colorScheme === "light";
  const dias = diasDisp(disp.data);
  const alerta = dias !== null && dias > alertaDias;
  const [showObs, setShowObs] = useState(false);
  return (
    <div style={{borderRadius:10,border:`1px solid ${alerta?(claro?"#f87171":"rgba(248,113,113,0.4)"):(claro?"#7dd3fc":"rgba(56,189,248,0.2)")}`,background:alerta?(claro?"#fff1f2":"rgba(248,113,113,0.04)"):(claro?"#f0f9ff":"rgba(56,189,248,0.03)"),overflow:"hidden",boxShadow:T.shadowCard}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px"}}>
        <span style={{fontSize:14}}>{icone}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:700,color:T.text1}}>{label}</div>
          {disp.site&&<div style={{fontSize:10,color:T.text2}}>{disp.site}</div>}
        </div>
        {dias!==null&&<div style={{textAlign:"center",padding:"3px 8px",borderRadius:6,minWidth:40,background:alerta?"rgba(248,113,113,0.12)":"rgba(56,189,248,0.1)",border:`1px solid ${alerta?"rgba(248,113,113,0.35)":"rgba(56,189,248,0.25)"}`}}>
          <div style={{fontSize:13,fontWeight:700,color:alerta?"#f87171":"#38bdf8",lineHeight:1}}>{dias===0?"D0":`D${dias}`}</div>
          {alerta&&<div style={{fontSize:8,color:"#f87171",fontFamily:mono}}>REVISAR</div>}
        </div>}
        <button onClick={()=>setShowObs(s=>!s)} title="Obs" style={{background:"none",border:"none",color:showObs?T.accent:T.text3,cursor:"pointer",fontSize:13,padding:"2px 4px"}}>📝</button>
        <button onClick={onRemove} style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:6,color:"#f87171",cursor:"pointer",fontSize:10,padding:"3px 8px",fontWeight:600}}>✕</button>
      </div>
      <div style={{padding:"0 12px 8px",borderTop:`1px solid ${T.border}`,paddingTop:8,display:"flex",gap:8,flexWrap:"wrap"}}>
        <div style={{minWidth:130,flex:1}}>
          <div style={{fontSize:9,color:T.text3,fontFamily:mono,letterSpacing:1,marginBottom:3}}>DATA INSERÇÃO</div>
          <input type="date" value={disp.data||""} onChange={e=>onUpdate("data",e.target.value)} style={{width:"100%",background:T.bgInput,border:`1px solid ${T.borderStrong}`,borderRadius:6,padding:"5px 8px",color:T.text1,fontSize:11}}/>
        </div>
        <div style={{minWidth:140,flex:2}}>
          <div style={{fontSize:9,color:T.text3,fontFamily:mono,letterSpacing:1,marginBottom:3}}>SÍTIO / LOCALIZAÇÃO</div>
          <input value={disp.site||""} onChange={e=>onUpdate("site",e.target.value)} placeholder="Femoral E / Tórax D" style={{width:"100%",background:T.bgInput,border:`1px solid ${T.borderStrong}`,borderRadius:6,padding:"5px 8px",color:T.text1,fontSize:11}}/>
        </div>
      </div>
      {showObs&&<div style={{padding:"0 12px 8px"}}>
        <div style={{fontSize:9,color:T.text3,fontFamily:mono,letterSpacing:1,marginBottom:3}}>OBSERVAÇÕES</div>
        <input value={disp.obs||""} onChange={e=>onUpdate("obs",e.target.value)} placeholder="Curativo ok..." style={{width:"100%",background:T.bgInput,border:`1px solid ${T.borderStrong}`,borderRadius:6,padding:"5px 8px",color:T.text1,fontSize:11}}/>
      </div>}
    </div>
  );
}

function DispositivosPanel({ dispositivos={}, onChange, alertas={} }) {
  const T = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [nomeCustom, setNomeCustom] = useState("");
  const [alertaCustom, setAlertaCustom] = useState("21");

  const getAlerta = (key) => {
    const map = {cvc:"cvc",dialise:"dialise",dreno:"dreno",tot:"tot",tqt:"tqt",svd:"svd",pai:"pai",sng:"sng"};
    return alertas[map[key]] ?? DISP_SINGULAR.find(d=>d.key===key)?.alertaDias ?? DISP_MULTIPLO.find(d=>d.key===key)?.alertaDias ?? 99;
  };

  // helpers
  const novoDisp = (siteDefault="") => ({
    id: Date.now() + Math.random(),
    data: new Date().toISOString().split("T")[0],
    site: siteDefault,
    obs: "",
  });

  // Singular: dispositivos[key] = { ativo, data, site, obs } | undefined
  const isSingularAtivo = (key) => !!dispositivos[key]?.ativo;

  const inserirSingular = (key, siteDefault="") => {
    onChange({ ...dispositivos, [key]: { ativo:true, data:new Date().toISOString().split("T")[0], site:siteDefault, obs:"" }});
    setShowPicker(false);
  };
  const retirarSingular = (key) =>
    onChange({ ...dispositivos, [key]: { ativo:false, data:"", site:"", obs:"" }});
  const updSingular = (key, field, val) =>
    onChange({ ...dispositivos, [key]: { ...(dispositivos[key]||{}), [field]:val }});

  // Múltiplo: dispositivos[key] = [ { id, data, site, obs }, ... ]
  const getMultiplos = (key) => Array.isArray(dispositivos[key]) ? dispositivos[key] : [];

  const inserirMultiplo = (key, siteDefault="") => {
    const lista = getMultiplos(key);
    onChange({ ...dispositivos, [key]: [...lista, novoDisp(siteDefault)] });
    setShowPicker(false);
  };
  const retirarMultiplo = (key, id) =>
    onChange({ ...dispositivos, [key]: getMultiplos(key).filter(d=>d.id!==id) });
  const updMultiplo = (key, id, field, val) =>
    onChange({ ...dispositivos, [key]: getMultiplos(key).map(d=>d.id===id?{...d,[field]:val}:d) });

  // Personalizados: dispositivos.custom = [{id,nome,icone,alertaDias,data,site,obs}]
  const custom = Array.isArray(dispositivos.custom) ? dispositivos.custom : [];
  const inserirCustom = (nome=nomeCustom) => {
    const nomeLimpo=String(nome||"").trim();if(!nomeLimpo)return;
    const icone=/dve|ventric|pic/i.test(nomeLimpo)?"🧠":/pigtail|torax|tórax|pleur/i.test(nomeLimpo)?"🫁":"🔌";
    onChange({...dispositivos,custom:[...custom,{...novoDisp(""),nome:nomeLimpo,icone,alertaDias:Math.max(1,parseInt(alertaCustom)||21)}]});
    setNomeCustom("");setShowPicker(false);
  };
  const retirarCustom = id => onChange({...dispositivos,custom:custom.filter(d=>d.id!==id)});
  const updCustom = (id,field,val) => onChange({...dispositivos,custom:custom.map(d=>d.id===id?{...d,[field]:val}:d)});

  // Quais singulares ainda não foram inseridos
  const singularesDisponiveis = DISP_SINGULAR.filter(d => !isSingularAtivo(d.key));
  // Múltiplos sempre disponíveis para adicionar mais
  const temAlgumAtivo =
    DISP_SINGULAR.some(d=>isSingularAtivo(d.key)) ||
    DISP_MULTIPLO.some(d=>getMultiplos(d.key).length>0) || custom.length>0;

  return (
    <div>

      {!temAlgumAtivo && !showPicker && (
        <div style={{padding:"14px",background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.07)",borderRadius:10,color:"#334155",fontSize:13,textAlign:"center",marginBottom:10}}>
          Nenhum dispositivo ativo
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:8,marginBottom:8}}>
        {DISP_MULTIPLO.map(({key,label,icone})=>(Array.isArray(dispositivos[key])?dispositivos[key]:[]).map((disp,i)=>(<DispCard key={disp.id} label={(Array.isArray(dispositivos[key])&&dispositivos[key].length>1)?`${label} ${i+1}`:label} icone={icone} alertaDias={getAlerta(key)} disp={disp} onUpdate={(f,v)=>updMultiplo(key,disp.id,f,v)} onRemove={()=>retirarMultiplo(key,disp.id)}/>)))}
        {DISP_SINGULAR.map(({key,label,icone})=>{if(!isSingularAtivo(key))return null;return <DispCard key={key} label={label} icone={icone} alertaDias={getAlerta(key)} disp={dispositivos[key]} onUpdate={(f,v)=>updSingular(key,f,v)} onRemove={()=>retirarSingular(key)}/>;})}
        {custom.map(d=><DispCard key={d.id} label={d.nome||"Dispositivo personalizado"} icone={d.icone||"🔌"} alertaDias={d.alertaDias||21} disp={d} onUpdate={(f,v)=>updCustom(d.id,f,v)} onRemove={()=>retirarCustom(d.id)}/>)}
      </div>

      {/* Botão + picker */}
      <div style={{position:"relative"}}>
        <button onClick={()=>setShowPicker(v=>!v)} style={{
          display:"inline-flex",alignItems:"center",gap:6,padding:"7px 12px",
          background:showPicker?T.accentBg:T.bgCard,
          border:`1px solid ${showPicker?T.accentBorder:T.borderStrong}`,
          borderRadius:10,color:showPicker?T.accent:T.text2,
          cursor:"pointer",fontSize:13,fontWeight:600,transition:"all 0.15s",
        }}>
          <span style={{fontSize:16}}>{showPicker?"✕":"+"}</span>
          {showPicker?"Fechar":"Adicionar dispositivo"}
        </button>

        {showPicker && (
          <div style={{marginTop:7,padding:"10px",background:"#0c1a10",border:"1px solid rgba(56,189,248,0.2)",borderRadius:10}}>
            {/* Múltiplos sempre disponíveis */}
            <div style={{fontSize:9,color:"#475569",fontFamily:mono,letterSpacing:1.5,margin:"0 2px 5px"}}>MÚLTIPLOS</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{DISP_MULTIPLO.map(({key,label,icone,siteDefault})=>(
              <button key={key} onClick={()=>inserirMultiplo(key,siteDefault)} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 9px",background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,cursor:"pointer",color:"#cbd5e1",fontSize:11,fontWeight:600}}><span>{icone}</span>{label}<span style={{color:"#38bdf8"}}>＋</span></button>
            ))}</div>
            {/* Separador se houver os dois grupos */}
            {singularesDisponiveis.length>0 && (
              <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",margin:"8px 0 0",paddingTop:7}}>
                <div style={{fontSize:9,color:"#475569",fontFamily:mono,letterSpacing:1.5,margin:"0 2px 5px"}}>ÚNICOS</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {singularesDisponiveis.map(({key,label,icone,siteDefault})=>(
                  <button key={key} onClick={()=>inserirSingular(key,siteDefault)} title={siteDefault?`Sítio padrão: ${siteDefault}`:""} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 9px",background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,cursor:"pointer",color:"#cbd5e1",fontSize:11,fontWeight:600}}><span>{icone}</span>{label}<span style={{color:"#38bdf8"}}>＋</span></button>
                ))}
                </div>
              </div>
            )}
            <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",marginTop:8,padding:"8px 2px 1px"}}>
              <div style={{display:"grid",gridTemplateColumns:"minmax(150px,1fr) 72px auto",gap:5}}>
                <input value={nomeCustom} onChange={e=>setNomeCustom(e.target.value)} onKeyDown={e=>e.key==="Enter"&&inserirCustom()} placeholder="Nome: DVE, Pigtail…" style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(56,189,248,.25)",borderRadius:7,padding:"8px 9px",color:"#e2e8f0",fontSize:12}}/>
                <input type="number" min="1" value={alertaCustom} onChange={e=>setAlertaCustom(e.target.value)} title="Dias até sinalizar revisão" style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(56,189,248,.18)",borderRadius:7,padding:"8px",color:"#e2e8f0",fontSize:11}}/>
                <button onClick={()=>inserirCustom()} disabled={!nomeCustom.trim()} style={{padding:"7px 11px",borderRadius:7,border:"1px solid rgba(56,189,248,.35)",background:"rgba(56,189,248,.1)",color:nomeCustom.trim()?"#38bdf8":"#475569",cursor:nomeCustom.trim()?"pointer":"default",fontWeight:700}}>Adicionar</button>
              </div>
              <div style={{display:"flex",gap:5,marginTop:5,alignItems:"center"}}>{["DVE","Pigtail"].map(n=><button key={n} onClick={()=>inserirCustom(n)} style={{padding:"2px 7px",borderRadius:12,border:"1px solid rgba(56,189,248,.18)",background:"transparent",color:"#64748b",fontSize:9,cursor:"pointer"}}>+ {n}</button>)}<span style={{fontSize:9,color:"#334155"}}>dias para revisão</span></div>
            </div>
          </div>
        )}
      </div>

      {temAlgumAtivo && (
        <div style={{marginTop:10,fontSize:11,color:"#475569",display:"flex",gap:12,flexWrap:"wrap"}}>
          <span>🔵 Em uso</span>
          <span style={{color:"#f87171"}}>🔴 CVC/PAI &gt;7d · SVD &gt;14d · Diálise &gt;14d — revisar</span>
        </div>
      )}
    </div>
  );
}

// ── VentilacaoPanel ────────────────────────────────────────────────────────────
const VM_MODOS = [
  { id:"ar_ambiente",  label:"Ar ambiente",                       icone:"🌬️"  },
  { id:"cn",           label:"Cateter Nasal",                 icone:"👃"  },
  { id:"ms",           label:"Máscara Simples",               icone:"😷"  },
  { id:"mnr",          label:"Máscara Não Reinalante",       icone:"🫁"  },
  { id:"venturi",      label:"Máscara Venturi",                    icone:"💨"  },
  { id:"cnaf",         label:"CNAF",    icone:"🌊"  },
  { id:"vni",          label:"VNI",      icone:"🔵"  },
  { id:"vm_psv",       label:"VM — PSV",    icone:"🔴"  },
  { id:"vm_pcv",       label:"VM — PCV", icone:"🔴"  },
  { id:"vm_vcv",       label:"VM — VCV",  icone:"🔴"  },
  { id:"vm_aprv",      label:"VM — APRV",                         icone:"🔴"  },
];
const VM_INVASIVA_MODOS=["vm_psv","vm_pcv","vm_vcv","vm_aprv"];

const VM_CAMPOS = {
  ar_ambiente: [],
  cn:         [{ key:"vm_o2",   label:"O₂ (L/min)", type:"number", placeholder:"1-6" }],
  ms:         [{ key:"vm_o2",   label:"O₂ (L/min)", type:"number", placeholder:"5-10" }],
  mnr:        [{ key:"vm_o2",   label:"O₂ (L/min)", type:"number", placeholder:"10-15" }],
  venturi:    [{ key:"vm_fio2", label:"FiO₂ (%)",   type:"number", placeholder:"24-60" },
               { key:"vm_o2",   label:"O₂ (L/min)", type:"number", placeholder:"" }],
  cnaf:       [{ key:"vm_flow", label:"Flow (L/min)",type:"number", placeholder:"20-60" },
               { key:"vm_fio2", label:"FiO₂ (%)",   type:"number", placeholder:"21-100" }],
  vni:        [{ key:"vm_ipap", label:"IPAP (cmH₂O)",type:"number",placeholder:"" },
               { key:"vm_epap", label:"EPAP (cmH₂O)",type:"number",placeholder:"" },
               { key:"vm_fio2", label:"FiO₂ (%)",   type:"number", placeholder:"" },
               { key:"vm_br",   label:"Backup FR",   type:"number", placeholder:"" }],
  vm_psv:     [{ key:"vm_ps",   label:"PS (cmH₂O)",  type:"number", placeholder:"5-20" },
               { key:"vm_peep", label:"PEEP (cmH₂O)",type:"number", placeholder:"5-20" },
               { key:"vm_fio2", label:"FiO₂ (%)",    type:"number", placeholder:"21-100" },
               { key:"vm_fr",   label:"FR espontânea",type:"number",placeholder:"" },
               { key:"vm_vt",   label:"VC corrente (mL)",type:"number",placeholder:"" },
               { key:"vm_p01",  label:"P0.1 (cmH₂O)", reference:"ref. 1–3,5", type:"number",placeholder:"" },
               { key:"vm_pocc", label:"Pocc mínima (cmH₂O)", type:"number",placeholder:"ex: -7" }],
  vm_pcv:     [{ key:"vm_pins", label:"ΔPins acima da PEEP (cmH₂O)", type:"number",placeholder:"" },
               { key:"vm_peep", label:"PEEP (cmH₂O)", type:"number",placeholder:"5-20" },
               { key:"vm_fio2", label:"FiO₂ (%)",     type:"number",placeholder:"21-100" },
               { key:"vm_fr",   label:"FR prog. (irpm)",type:"number",placeholder:"" },
               { key:"vm_pplat",label:"Pplatô (cmH₂O)",type:"number",placeholder:"<30" },
               { key:"vm_vt",   label:"VC medido (mL)",type:"number",placeholder:"" }],
  vm_vcv:     [{ key:"vm_vt",   label:"VC prog. (mL)", type:"number",placeholder:"" },
               { key:"vm_peep", label:"PEEP (cmH₂O)",  type:"number",placeholder:"5-20" },
               { key:"vm_fio2", label:"FiO₂ (%)",      type:"number",placeholder:"21-100" },
               { key:"vm_fr",   label:"FR prog. (irpm)",type:"number",placeholder:"" },
               { key:"vm_pplat",label:"Pplatô (cmH₂O)",type:"number",placeholder:"<30" },
               { key:"vm_ppico",label:"Ppico (cmH₂O)", type:"number",placeholder:"" }],
  vm_aprv:    [{ key:"vm_phigh",label:"Phigh (cmH₂O)", type:"number",placeholder:"" },
               { key:"vm_plow", label:"Plow (cmH₂O)",  type:"number",placeholder:"" },
               { key:"vm_thigh",label:"Thigh (s)",      type:"number",placeholder:"" },
               { key:"vm_tlow", label:"Tlow (s)",        type:"number",placeholder:"" },
               { key:"vm_fio2", label:"FiO₂ (%)",       type:"number",placeholder:"21-100" }],
};

function calcMechanicalPower(leito) {
  const modo=leito.vm_modo;
  const vtMl=parseFloat(leito.vm_vt);
  const rr=parseFloat(leito.vm_fr);
  const peep=parseFloat(leito.vm_peep);
  if(!["vm_vcv","vm_pcv"].includes(modo)||![vtMl,rr,peep].every(Number.isFinite)||vtMl<=0||rr<=0||peep<0)return null;
  const vtL=vtMl/1000;
  if(modo==="vm_vcv"){
    const pplat=parseFloat(leito.vm_pplat),ppico=parseFloat(leito.vm_ppico);
    if(![pplat,ppico].every(Number.isFinite)||pplat<peep||ppico<pplat)return null;
    const driving=pplat-peep;
    const valor=0.098*vtL*rr*(peep+(0.5*driving)+(ppico-pplat));
    return {valor,formula:"Gattinoni — VCV",driving};
  }
  const deltaPinsp=parseFloat(leito.vm_pins);
  if(!Number.isFinite(deltaPinsp)||deltaPinsp<0)return null;
  const valor=0.098*vtL*rr*(peep+deltaPinsp);
  return {valor,formula:"Becher — PCV",driving:deltaPinsp};
}

function calcPoccEffort(leito){
  if(leito.vm_modo!=="vm_psv")return null;
  const peep=parseFloat(String(leito.vm_peep??"").replace(",","."));
  const pocc=parseFloat(String(leito.vm_pocc??"").replace(",","."));
  if(!Number.isFinite(peep)||!Number.isFinite(pocc)||pocc>peep)return null;
  const delta=peep-pocc;
  const pmusc=delta*0.75;
  return {pocc,delta,pmusc};
}

const pontosExPres=(tipo,v)=>{
  if(!Number.isFinite(v))return null;
  if(tipo==="rsbi")return v<=42?25:v<=54?20:v<=76?10:v<=90?5:0;
  if(tipo==="complacencia")return v>=63?15:v>=51?10:v>=43?7:v>=32?3:0;
  if(tipo==="dias")return v>=11?0:v>=9?1:v>=6?4:v>=4?7:v>=1?10:null;
  if(tipo==="egcs")return v>=13.5?10:v>=11.7?6:v>=8.9?3:0;
  if(tipo==="mrc")return v>=49?10:v>=37?7:v>=25?4:v>=13?1:0;
  if(tipo==="ht")return v>=37?10:v>=32?7:v>=26?3:v>=22?1:0;
  if(tipo==="cr")return v<=.99?10:v<=1.2?7:v<=1.5?4:v<=2.9?1:0;
  return null;
};

function calcularExPres({rsbi,complacencia,dias,egcs,mrc,ht,cr,neuro}){
  const componentes={rsbi:pontosExPres("rsbi",rsbi),complacencia:pontosExPres("complacencia",complacencia),dias:pontosExPres("dias",dias),egcs:pontosExPres("egcs",egcs),mrc:pontosExPres("mrc",mrc),ht:pontosExPres("ht",ht),cr:pontosExPres("cr",cr),neuro:typeof neuro==="boolean"?(neuro?0:10):null};
  const faltantes=Object.entries(componentes).filter(([,v])=>v===null).map(([k])=>k);
  const total=faltantes.length?null:Object.values(componentes).reduce((a,b)=>a+b,0);
  return {componentes,faltantes,total,faixa:total===null?"incompleto":total<=44?"baixa":total<=58?"intermediária":"alta"};
}

function gerarTextoVM(leito) {
  const modo = leito.vm_modo;
  if (!modo || modo === "ar_ambiente") return leito.vm_sato2 ? `Ar ambiente / SatO2 ${leito.vm_sato2}%` : "Ar ambiente";
  const m = VM_MODOS.find(x=>x.id===modo);
  const label = m ? m.label : modo;
  const mostraOpcional=id=>!Object.prototype.hasOwnProperty.call(leito.vmOpcionais||{},id)||!!leito.vmOpcionais[id];
  let partes=[];
  if(modo==="vm_pcv"){
    if(leito.vm_pins) partes.push(`Pins: ${leito.vm_pins}`);
    if(leito.vm_peep) partes.push(`PEEP: ${leito.vm_peep}`);
    if(leito.vm_fio2) partes.push(`FiO₂: ${leito.vm_fio2}%`);
    if(leito.vm_fr) partes.push(`FR prog.: ${leito.vm_fr}`);
    if(leito.vm_pplat) partes.push(`Pplatô: ${leito.vm_pplat}`);
    if(leito.vm_pplat&&leito.vm_peep){const dp=parseFloat(leito.vm_pplat)-parseFloat(leito.vm_peep);if(Number.isFinite(dp))partes.push(`DP: ${Math.round(dp*10)/10} cmH₂O`);}
    if(leito.vm_vt){const vt=parseFloat(leito.vm_vt),pp=parseFloat(pesoPredito(leito.altura,leito.sexo));partes.push(`VC: ${leito.vm_vt} mL${Number.isFinite(vt)&&Number.isFinite(pp)&&pp>0?` (${(vt/pp).toFixed(1).replace(".",",")} mL/kg PP)`:""}`);}
    const mp=calcMechanicalPower(leito); if(mp) partes.push(`Mechanical Power: ${mp.valor.toFixed(1).replace(".",",")} J/min`);
  } else {
    const campos = VM_CAMPOS[modo] || [];
    partes = campos.map(c=>{const v=leito[c.key];if(!v)return null;return `${c.label.replace(/ \(.*\)/,"")}: ${v}`;}).filter(Boolean);
    if ((modo==="vm_vcv")&&leito.vm_pplat&&leito.vm_peep) {const dp=parseFloat(leito.vm_pplat)-parseFloat(leito.vm_peep);if(Number.isFinite(dp)) partes.push(`DP: ${Math.round(dp*10)/10} cmH₂O`);}
    if (modo==="vm_vcv"&&leito.vm_vt&&leito.vm_pplat&&leito.vm_peep) {const csr=parseFloat(leito.vm_vt)/(parseFloat(leito.vm_pplat)-parseFloat(leito.vm_peep));if(Number.isFinite(csr)) partes.push(`Csr: ${Math.round(csr)} mL/cmH₂O`);}
    const mp=calcMechanicalPower(leito); if(mp) partes.push(`Mechanical Power: ${mp.valor.toFixed(1).replace(".",",")} J/min`);
  }
  if(modo==="vm_psv"){
    const esforco=calcPoccEffort(leito);
    if(esforco){partes.push(`ΔPocc: ${esforco.delta.toFixed(1).replace(".",",")} cmH₂O`);partes.push(`Pmusc estimada: ${esforco.pmusc.toFixed(1).replace(".",",")} cmH₂O`);}
  }
  if(mostraOpcional("ed")&&leito.vm_ed) partes.push(`ED: ${leito.vm_ed} cm`);
  if(mostraOpcional("fed")&&leito.vm_fed) partes.push(`FED: ${leito.vm_fed}%`);
  if(mostraOpcional("pimax")&&leito.vm_pimax) partes.push(`PImax: ${leito.vm_pimax} cmH₂O`);
  if (leito.vm_sato2) partes.push(`SatO2: ${leito.vm_sato2}%`);
  if (VM_INVASIVA_MODOS.includes(modo) && leito.dispositivos?.tqt?.ativo && leito.vm_cuff) partes.push(`Cuff: ${leito.vm_cuff}`);
  if (mostraOpcional("obs")&&leito.vm_obs) partes.push(leito.vm_obs);
  const pao2=parseFloat(leito.vm_pf), fio2=parseFloat(leito.vm_fio2);
  if(Number.isFinite(pao2)&&pao2>0&&Number.isFinite(fio2)&&fio2>0) partes.push(`→ P/F ${Math.round(pao2/(fio2/100))}`);
  const cuidados=[];
  if(VM_INVASIVA_MODOS.includes(modo)){
    if(leito.vm_cuidado_cornea) cuidados.push("profilaxia de úlcera de córnea: dextrano");
    if(leito.vm_higiene_oral) cuidados.push("higiene oral: clorexidina");
    const sialo=[leito.vm_sialo_propantelina&&"propantelina",leito.vm_sialo_atropina&&"atropina",leito.vm_sialo_escopolamina&&"escopolamina"].filter(Boolean);
    if(sialo.length) cuidados.push(`medidas para sialorreia: ${sialo.join(", ")}`);
  }
  return `${label}: ${partes.join(" / ")}${cuidados.length?`\n- Cuidados VM: ${cuidados.join("; ")}`:""}`;
}

const VM_SNAPSHOT_KEYS=["vm_modo","vm_sato2","vm_pf","vm_o2","vm_flow","vm_fio2","vm_ipap","vm_epap","vm_br","vm_ps","vm_peep","vm_fr","vm_vt","vm_p01","vm_pocc","vm_pins","vm_pplat","vm_ppico","vm_phigh","vm_plow","vm_thigh","vm_tlow","vm_cuff"];
const snapshotVM=(leito)=>Object.fromEntries(VM_SNAPSHOT_KEYS.filter(k=>leito[k]!==undefined&&leito[k]!=="").map(k=>[k,leito[k]]));
const resumoSnapshotVM=(snap={})=>snap.vm_modo?gerarTextoVM({...snap}).split("\n")[0]:"Suporte não definido";

function VentilacaoPanel({ leito, onChange, integrated=false, tabelaDataLeito={}, glasgowNeurologico="" }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";
  const [busca, setBusca] = useState("");
  const [showBusca, setShowBusca] = useState(false);
  const [showDetails, setShowDetails] = useState(!integrated);
  const [showPaO2List, setShowPaO2List] = useState(false);
  const [showMudanca,setShowMudanca]=useState(false);
  const [interpretacaoMudanca,setInterpretacaoMudanca]=useState("");
  const [condutaMudanca,setCondutaMudanca]=useState("");
  const [historicoAberto,setHistoricoAberto]=useState({});

  const modoAtual = VM_MODOS.find(m=>m.id===leito.vm_modo);
  const campos = VM_CAMPOS[leito.vm_modo] || [];
  const pao2Gasometrias=Object.keys(tabelaDataLeito||{}).sort().reverse().flatMap(data=>{
    let gasos=tabelaDataLeito[data]?._gasos||[];
    try{if(typeof gasos==="string")gasos=JSON.parse(gasos);}catch{gasos=[];}
    return (Array.isArray(gasos)?gasos:[]).filter(g=>g?.po2!==undefined&&g.po2!=="").map(g=>({valor:g.po2,horario:g.horario||"sem horário",data:g.data||data})).reverse();
  });

  const modosFiltrados = busca.length >= 1
    ? VM_MODOS.filter(m=>m.label.toLowerCase().includes(busca.toLowerCase()))
    : [];

  // Calculados em tempo real
  const peep  = parseFloat(leito.vm_peep||0)  || 0;
  const pplat = parseFloat(leito.vm_pplat||0) || 0;
  const vt    = parseFloat(leito.vm_vt||0)    || 0;
  const pins  = parseFloat(leito.vm_pins||0)  || 0;
  const ps    = parseFloat(leito.vm_ps||0)    || 0;
  const fio2  = parseFloat(leito.vm_fio2||0)  || 0;
  const po2   = parseFloat(leito.vm_pf||0)    || 0; // P/F

  const dp    = (pplat && peep) ? Math.round((pplat - peep)*10)/10 : null;
  const csr   = (vt && pplat && peep && pplat>peep) ? Math.round(vt/(pplat-peep)) : null;
  const ppeak_est = leito.vm_ppico ? parseFloat(leito.vm_ppico) : null;
  const pf_calc = (po2>0&&fio2>0) ? Math.round(po2/(fio2/100)) : null;
  const mechanicalPower=calcMechanicalPower(leito);
  const poccEffort=calcPoccEffort(leito);
  const ultimoLab=(chaves)=>{
    const datas=Object.keys(tabelaDataLeito||{}).sort().reverse();
    for(const data of datas){for(const chave of chaves){const bruto=tabelaDataLeito[data]?.[chave];const valor=parseFloat(String(bruto??"").replace(",","."));if(Number.isFinite(valor))return {valor,data};}}
    return {valor:null,data:""};
  };
  const htExPres=ultimoLab(["ht","hto","hematocrito"]),crExPres=ultimoLab(["cr","creatinina"]);
  const tot=leito.dispositivos?.tot;
  const diasTot=tot?.ativo&&tot.data?Math.max(0,Math.floor((new Date()-new Date(`${tot.data}T00:00:00`))/86400000)):null;
  const numExPres=key=>{const n=parseFloat(String(leito[key]??"").replace(",","."));return Number.isFinite(n)?n:null;};
  const glasgowExPres=(()=>{const n=parseFloat(String(glasgowNeurologico??"").replace(",","."));return Number.isFinite(n)?n:numExPres("expres_egcs");})();
  const rsbiPsv=(numExPres("vm_fr")!==null&&numExPres("vm_vt")>0)?numExPres("vm_fr")/(numExPres("vm_vt")/1000):null;
  const exPres=calcularExPres({rsbi:numExPres("expres_rsbi"),complacencia:numExPres("expres_complacencia"),dias:diasTot,egcs:glasgowExPres,mrc:numExPres("expres_mrc"),ht:htExPres.valor,cr:crExPres.valor,neuro:leito.expres_neuro==="sim"?true:leito.expres_neuro==="nao"?false:null});
  const suporteResumo = (()=>{
    const itens=[];
    if (["cn","ms","mnr"].includes(leito.vm_modo)&&leito.vm_o2) itens.push(`O₂ ${leito.vm_o2} L/min`);
    if (leito.vm_modo==="venturi") { if(leito.vm_fio2)itens.push(`FiO₂ ${leito.vm_fio2}%`); if(leito.vm_o2)itens.push(`O₂ ${leito.vm_o2} L/min`); }
    if (leito.vm_modo==="cnaf") { if(leito.vm_flow)itens.push(`Fluxo ${leito.vm_flow} L/min`); if(leito.vm_fio2)itens.push(`FiO₂ ${leito.vm_fio2}%`); }
    if (leito.vm_modo==="vni") { if(leito.vm_ipap)itens.push(`IPAP ${leito.vm_ipap}`); if(leito.vm_epap)itens.push(`EPAP ${leito.vm_epap}`); if(leito.vm_fio2)itens.push(`FiO₂ ${leito.vm_fio2}%`); }
    if (leito.vm_modo==="vm_psv"&&leito.vm_ps) itens.push(`PS ${leito.vm_ps}`);
    if (leito.vm_modo==="vm_pcv"&&leito.vm_pins) itens.push(`ΔPins ${leito.vm_pins}`);
    if (leito.vm_modo==="vm_vcv"&&leito.vm_vt) itens.push(`VC ${leito.vm_vt} mL`);
    if (["vm_psv","vm_pcv","vm_vcv"].includes(leito.vm_modo)) { if(leito.vm_peep)itens.push(`PEEP ${leito.vm_peep}`); if(leito.vm_fio2)itens.push(`FiO₂ ${leito.vm_fio2}%`); }
    if (leito.vm_modo==="vm_aprv") { if(leito.vm_phigh)itens.push(`Phigh ${leito.vm_phigh}`); if(leito.vm_plow)itens.push(`Plow ${leito.vm_plow}`); if(leito.vm_fio2)itens.push(`FiO₂ ${leito.vm_fio2}%`); }
    if(mechanicalPower)itens.push(`MP ${mechanicalPower.valor.toFixed(1)} J/min`);
    return itens;
  })();
  const sat = parseFloat(leito.vm_sato2||0)||null;
  const oxiCor = sat!==null ? (sat<90?"#f87171":sat<94?"#fbbf24":"#34d399") : pf_calc!==null ? (pf_calc<150?"#f87171":pf_calc<300?"#fbbf24":"#34d399") : "#94a3b8";

  const alterarVM=(patch)=>onChange({...leito,vmBaseline:leito.vmBaseline||snapshotVM(leito),...patch});
  const set = (key, val) => alterarVM({[key]:val});
  const registrarMudanca=()=>{
    const anterior=leito.vmBaseline||snapshotVM(leito),atual=snapshotVM(leito);
    if(JSON.stringify(anterior)===JSON.stringify(atual)){window.alert("Altere ao menos um parâmetro ventilatório antes de registrar.");return;}
    if(!interpretacaoMudanca.trim()){window.alert("Descreva a interpretação que motivou a mudança.");return;}
    const registro={id:globalThis.crypto?.randomUUID?.()||`vm-${Date.now()}`,dataHora:new Date().toISOString(),anterior,atual,interpretacao:interpretacaoMudanca.trim(),conduta:condutaMudanca.trim()};
    onChange({...leito,vmBaseline:atual,vmHistorico:[registro,...(leito.vmHistorico||[])]});
    setInterpretacaoMudanca("");setCondutaMudanca("");setShowMudanca(false);
  };
  const opcionais=leito.vmOpcionais||{};
  const temExPres=["expres_rsbi","expres_complacencia","expres_mrc","expres_egcs","expres_neuro"].some(k=>leito[k]!==undefined&&leito[k]!=="");
  const opcionalAtivo=(id)=>Object.prototype.hasOwnProperty.call(opcionais,id)?!!opcionais[id]:(
    id==="ed"?!!leito.vm_ed:
    id==="fed"?!!leito.vm_fed:
    id==="pimax"?!!leito.vm_pimax:
    id==="expres"?temExPres:
    id==="obs"?!!leito.vm_obs:
    id==="neb"?!!(leito.nebMed||leito.nebFreq):false
  );
  const toggleOpcional=(id)=>onChange({...leito,vmOpcionais:{...opcionais,[id]:!opcionalAtivo(id)}});

  return (
    <div>
      {integrated ? (
        <div style={{marginBottom:12,border:"1px solid rgba(56,189,248,.28)",borderRadius:12,background:"linear-gradient(135deg,rgba(56,189,248,.10),rgba(56,189,248,.025))",overflow:"hidden"}}>
          <div style={{padding:"12px 14px",display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{minWidth:210,flex:2}}>
              <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontSize:9,fontFamily:mono,letterSpacing:1.5,color:"#38bdf8",fontWeight:800}}>SUPORTE RESPIRATÓRIO ATUAL</span>
                <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,color:"#7dd3fc",background:"rgba(56,189,248,.12)",border:"1px solid rgba(56,189,248,.25)",fontWeight:700}}>{modoAtual?.label||"Não definido"}</span>
              </div>
              <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap",fontSize:11,fontFamily:mono,color:"#cbd5e1"}}>
                {suporteResumo.length?suporteResumo.map((item,i)=><span key={i} style={{color:i===0?"#7dd3fc":"#cbd5e1",fontWeight:i===0?700:500}}>{item}</span>):<span style={{color:"#64748b"}}>Sem parâmetros registrados</span>}
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:6,fontSize:10,fontFamily:mono,color:"#94a3b8"}}>
                {leito.vm_fr&&<span>FR {leito.vm_fr} irpm</span>}
                {leito.vm_vt&&leito.vm_modo!=="vm_vcv"&&<span>VC {leito.vm_vt} mL</span>}
                {leito.vm_cuff&&<span>Cuff {leito.vm_cuff}</span>}
                {dp!==null&&<span>DP {dp}</span>}
                {leito.nebMed&&<span style={{color:"#a3e635"}}>Neb: {leito.nebMed} {leito.nebFreq||""}</span>}
              </div>
            </div>
            <div style={{minWidth:145,flex:1,paddingLeft:12,borderLeft:"1px solid rgba(56,189,248,.16)"}}>
              <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:5}}>OXIGENAÇÃO</div>
              <div style={{display:"flex",gap:12,alignItems:"baseline",flexWrap:"wrap"}}>
                <span style={{fontSize:14,fontWeight:800,color:oxiCor}}>SatO₂ {sat!==null?`${sat}%`:"—"}</span>
                {pf_calc!==null&&<span style={{fontSize:11,fontFamily:mono,color:oxiCor}}>P/F {pf_calc}</span>}
              </div>
              {leito.vm_fio2&&<div style={{fontSize:9,color:"#64748b",fontFamily:mono,marginTop:4}}>FiO₂ registrada: {leito.vm_fio2}%</div>}
            </div>
            <button onClick={()=>setShowDetails(v=>!v)} style={{padding:"7px 11px",borderRadius:8,border:"1px solid rgba(56,189,248,.3)",background:showDetails?"rgba(56,189,248,.14)":"rgba(56,189,248,.06)",color:"#7dd3fc",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{showDetails?"Fechar edição ↑":"Editar suporte ↓"}</button>
          </div>
        </div>
      ) : <SecTitle>SUPORTE VENTILATÓRIO</SecTitle>}

      {modoAtual&&<div style={{margin:"-2px 0 12px",border:`1px solid ${T.border}`,borderRadius:9,background:T.bgCard,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px"}}><div style={{fontSize:9,fontFamily:mono,letterSpacing:1.2,color:T.text3,fontWeight:800}}>EVOLUÇÃO DO SUPORTE</div><span style={{fontSize:9,color:T.text4}}>{(leito.vmHistorico||[]).length} mudança(s)</span><button type="button" onClick={()=>setShowMudanca(x=>!x)} style={{marginLeft:"auto",padding:"4px 9px",borderRadius:7,border:`1px solid ${T.accentBorder}`,background:T.accentBg,color:T.accent,fontSize:10,fontWeight:750,cursor:"pointer"}}>{showMudanca?"Cancelar":"＋ Registrar mudança"}</button></div>
        {showMudanca&&<div style={{padding:"9px 10px",borderTop:`1px solid ${T.border}`,background:T.bgInput}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:8,marginBottom:8}}><div style={{padding:"7px 9px",borderRadius:7,border:`1px solid ${T.border}`,fontSize:10,color:T.text2}}><span style={{display:"block",fontSize:8,color:T.text4,fontFamily:mono,marginBottom:3}}>ANTES</span>{resumoSnapshotVM(leito.vmBaseline||snapshotVM(leito))}</div><div style={{padding:"7px 9px",borderRadius:7,border:`1px solid ${T.accentBorder}`,fontSize:10,color:T.text1}}><span style={{display:"block",fontSize:8,color:T.accent,fontFamily:mono,marginBottom:3}}>AGORA</span>{resumoSnapshotVM(snapshotVM(leito))}</div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:8}}><label style={{fontSize:9,color:T.text3,fontFamily:mono}}>INTERPRETAÇÃO / MOTIVO<textarea value={interpretacaoMudanca} onChange={e=>setInterpretacaoMudanca(e.target.value)} placeholder="Ex.: melhora da mecânica, esforço excessivo, hipoxemia..." rows={2} style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:3,padding:"7px 8px",borderRadius:7,border:`1px solid ${T.border}`,background:T.bgCard,color:T.text1,resize:"vertical"}}/></label><label style={{fontSize:9,color:T.text3,fontFamily:mono}}>CONDUTA / OBJETIVO<textarea value={condutaMudanca} onChange={e=>setCondutaMudanca(e.target.value)} placeholder="Ex.: reduzir PS e reavaliar em 30 min" rows={2} style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:3,padding:"7px 8px",borderRadius:7,border:`1px solid ${T.border}`,background:T.bgCard,color:T.text1,resize:"vertical"}}/></label></div>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}><button type="button" onClick={registrarMudanca} style={{padding:"6px 11px",borderRadius:7,border:`1px solid ${T.accentBorder}`,background:T.accentBg,color:T.accent,fontWeight:800,cursor:"pointer"}}>Guardar alteração</button></div>
        </div>}
        {(leito.vmHistorico||[]).length>0&&<div style={{borderTop:`1px solid ${T.border}`}}>{(leito.vmHistorico||[]).map((h,i)=>{const aberto=!!historicoAberto[h.id];return <div key={h.id} style={{borderBottom:i<(leito.vmHistorico||[]).length-1?`1px solid ${T.border}`:"none"}}><button type="button" onClick={()=>setHistoricoAberto(x=>({...x,[h.id]:!x[h.id]}))} style={{width:"100%",display:"flex",alignItems:"center",gap:7,padding:"7px 10px",border:0,background:"transparent",color:T.text2,cursor:"pointer",textAlign:"left",fontSize:9}}><span style={{fontFamily:mono,color:T.text4}}>{new Date(h.dataHora).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span><strong style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.interpretacao}</strong><span style={{marginLeft:"auto"}}>{aberto?"▴":"▾"}</span></button>{aberto&&<div style={{padding:"0 10px 9px",fontSize:10,lineHeight:1.5,color:T.text2}}><div><b>Antes:</b> {resumoSnapshotVM(h.anterior)}</div><div><b>Depois:</b> {resumoSnapshotVM(h.atual)}</div><div><b>Interpretação:</b> {h.interpretacao}</div>{h.conduta&&<div><b>Conduta/objetivo:</b> {h.conduta}</div>}</div>}</div>;})}</div>}
      </div>}

      {VM_INVASIVA_MODOS.includes(leito.vm_modo)&&<div style={{margin:"-2px 0 12px",padding:"8px 11px",border:`1px solid ${T.border}`,borderRadius:9,background:T.bgInput}}>
        <div style={{fontSize:9,color:T.text3,fontFamily:mono,letterSpacing:1.2,fontWeight:700,marginBottom:6}}>CUIDADOS EM VENTILAÇÃO MECÂNICA</div>
        <div style={{display:"flex",alignItems:"center",gap:"7px 16px",flexWrap:"wrap",fontSize:11,color:T.text2}}>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><input type="checkbox" checked={!!leito.vm_cuidado_cornea} onChange={e=>set("vm_cuidado_cornea",e.target.checked)}/><span>Úlcera de córnea: <b>Dextrano</b></span></label>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><input type="checkbox" checked={!!leito.vm_higiene_oral} onChange={e=>set("vm_higiene_oral",e.target.checked)}/><span>Higiene oral: <b>Clorexidina</b></span></label>
          <span style={{color:T.text3,fontFamily:mono,fontSize:9}}>SIALORREIA:</span>
          <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}><input type="checkbox" checked={!!leito.vm_sialo_propantelina} onChange={e=>set("vm_sialo_propantelina",e.target.checked)}/>Propantelina</label>
          <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}><input type="checkbox" checked={!!leito.vm_sialo_atropina} onChange={e=>set("vm_sialo_atropina",e.target.checked)}/>Atropina</label>
          <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}><input type="checkbox" checked={!!leito.vm_sialo_escopolamina} onChange={e=>set("vm_sialo_escopolamina",e.target.checked)}/>Escopolamina</label>
        </div>
      </div>}

      {(!integrated || showDetails) && <div style={integrated?{padding:"12px 14px 2px",marginTop:-12,marginBottom:12,border:"1px solid rgba(56,189,248,.18)",borderTop:"none",borderRadius:"0 0 12px 12px",background:"rgba(56,189,248,.025)"}:undefined}>

      {/* Seletor de modo */}
      <div style={{marginBottom:12,position:"relative"}}>
        {modoAtual ? (
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{modoAtual.label}</div>
            </div>
            <button onClick={()=>{alterarVM({vm_modo:""});setBusca("");}} style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:6,color:"#f87171",cursor:"pointer",fontSize:11,padding:"3px 10px"}}>Trocar modo</button>
          </div>
        ) : (
          <div>
            <input value={busca} onChange={e=>{setBusca(e.target.value);setShowBusca(true);}} onFocus={()=>setShowBusca(true)}
              onKeyDown={e=>{if(e.key==="Enter"&&modosFiltrados.length>0)alterarVM({vm_modo:modosFiltrados[0].id});if(e.key==="Escape")setShowBusca(false);}}
              placeholder="Buscar modo ventilação... (ex: PSV, CNAF, VNI)"
              style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:8,padding:"10px 14px",color:"#e2e8f0",fontSize:13,outline:"none"}}/>
            {showBusca&&modosFiltrados.length>0&&(
              <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:99,background:"#0c1a10",border:"1px solid rgba(56,189,248,0.25)",borderRadius:8,marginTop:4,maxHeight:280,overflowY:"auto"}}>
                {modosFiltrados.map(m=>(
                  <div key={m.id} onClick={()=>{alterarVM({vm_modo:m.id});setBusca("");setShowBusca(false);}}
                    style={{padding:"10px 14px",cursor:"pointer",fontSize:13,color:"#cbd5e1",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid rgba(255,255,255,0.04)"}}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(56,189,248,0.1)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    {m.label}
                  </div>
                ))}
              </div>
            )}
            {!busca&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
              {VM_MODOS.map(m=>(
                <button key={m.id} onClick={()=>alterarVM({vm_modo:m.id})}
                  style={{padding:"5px 12px",borderRadius:20,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.03)",color:"#94a3b8",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:5}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(56,189,248,0.08)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}>
                  {m.label.replace("VM — ","").replace(" (Cateter Nasal Alto Fluxo)","").replace("Modo ","").split(" ")[0]}
                </button>
              ))}
            </div>}
          </div>
        )}
      </div>

      {/* SatO2 — sempre visível, independente do modo (inclusive Ar ambiente) */}
      {modoAtual && (
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
          <div style={{minWidth:120,flex:1}}>
            <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>SATO2 (%)</div>
            <input type="number" value={leito.vm_sato2||""} onChange={e=>set("vm_sato2",e.target.value)}
              placeholder="90-100"
              style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 10px",color:T.text1,fontSize:12}}/>
          </div>
          {VM_INVASIVA_MODOS.includes(leito.vm_modo)&&<div style={{minWidth:160,flex:1,position:"relative"}}>
            <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>PaO₂ (mmHg) — calcula P/F</div>
            <input type="number" value={leito.vm_pf||""} onChange={e=>set("vm_pf",e.target.value)} onFocus={()=>setShowPaO2List(true)} onBlur={()=>setTimeout(()=>setShowPaO2List(false),150)} placeholder="Digite ou escolha da gasometria"
              style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 10px",color:T.text1,fontSize:12}}/>
            {showPaO2List&&pao2Gasometrias.length>0&&<div style={{position:"absolute",zIndex:30,top:"100%",left:0,right:0,marginTop:4,maxHeight:190,overflowY:"auto",border:`1px solid ${T.border}`,borderRadius:8,background:T.bgCard,boxShadow:"0 12px 28px rgba(0,0,0,.24)"}}>
              <div style={{padding:"6px 9px",fontSize:8,color:T.text3,fontFamily:mono,letterSpacing:1}}>PaO₂ REGISTRADAS NAS GASOMETRIAS</div>
              {pao2Gasometrias.map((g,i)=><button key={`${g.data}-${g.horario}-${i}`} type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{set("vm_pf",String(g.valor));setShowPaO2List(false);}} style={{width:"100%",padding:"7px 9px",display:"flex",justifyContent:"space-between",gap:10,border:0,borderTop:`1px solid ${T.border}`,background:"transparent",color:T.text1,cursor:"pointer",textAlign:"left"}}><strong>PaO₂ {g.valor} mmHg</strong><span style={{fontSize:9,color:T.text3,fontFamily:mono}}>{g.horario} · {String(g.data).split("-").reverse().join("/")}</span></button>)}
            </div>}
          </div>}
          {VM_INVASIVA_MODOS.includes(leito.vm_modo) && leito.dispositivos?.tqt?.ativo && (
            <div style={{minWidth:120,flex:1}}>
              <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>CUFF (TQT)</div>
              <input value={leito.vm_cuff||""} onChange={e=>set("vm_cuff",e.target.value)}
                placeholder="ex: 25 cmH2O"
                style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
            </div>
          )}
        </div>
      )}

      {/* Campos do modo selecionado */}
      {modoAtual && leito.vm_modo !== "ar_ambiente" && (
        <>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
            {campos.map(c=>(
              <div key={c.key} style={{minWidth:120,flex:1}}>
                <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>{c.label.toUpperCase()}{c.reference&&<small style={{marginLeft:5,fontSize:8,color:T.text4,letterSpacing:0,textTransform:"none"}}>{c.reference}</small>}</div>
                <input type={c.type||"text"} value={leito[c.key]||""} onChange={e=>set(c.key,e.target.value)}
                  placeholder={c.placeholder}
                  style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
              </div>
            ))}
          </div>

          {VM_INVASIVA_MODOS.includes(leito.vm_modo)&&<>
            <div style={{marginBottom:10,padding:"8px 10px",borderRadius:9,border:`1px solid ${T.border}`,background:T.bgInput}}>
              <div style={{fontSize:9,color:T.text3,fontFamily:mono,letterSpacing:1.1,marginBottom:6}}>VARIÁVEIS OPCIONAIS</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[
                  ["ed","ED"],["fed","FED"],["pimax","PImax"],
                  ...(leito.vm_modo==="vm_psv"?[["expres","ExPreS"]]:[]),
                  ["obs","Observações"],["neb","Nebulização + frequência"]
                ].map(([id,label])=>{const ativo=opcionalAtivo(id);return <button key={id} type="button" onClick={()=>toggleOpcional(id)} style={{padding:"4px 9px",borderRadius:12,cursor:"pointer",fontSize:10,fontWeight:700,color:ativo?T.accent:T.text3,background:ativo?T.accentBg:"transparent",border:`1px solid ${ativo?T.accentBorder:T.border}`}}>{ativo?"✓ ":"+ "}{label}</button>;})}
              </div>
            </div>
            {(opcionalAtivo("ed")||opcionalAtivo("fed")||opcionalAtivo("pimax"))&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8,marginBottom:10}}>
              {opcionalAtivo("ed")&&<label style={{fontSize:9,color:T.text3,fontFamily:mono}}>ED — EXCURSÃO DIAFRAGMÁTICA (cm)<input type="number" step="0.1" value={leito.vm_ed||""} onChange={e=>set("vm_ed",e.target.value)} style={{display:"block",width:"100%",marginTop:3,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:7,padding:"7px 9px",color:T.text1}}/></label>}
              {opcionalAtivo("fed")&&<label style={{fontSize:9,color:T.text3,fontFamily:mono}}>FED — FRAÇÃO DE ESPESSAMENTO (%)<input type="number" step="0.1" value={leito.vm_fed||""} onChange={e=>set("vm_fed",e.target.value)} style={{display:"block",width:"100%",marginTop:3,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:7,padding:"7px 9px",color:T.text1}}/></label>}
              {opcionalAtivo("pimax")&&<label style={{fontSize:9,color:T.text3,fontFamily:mono}}>PImax (cmH₂O)<input type="number" step="1" value={leito.vm_pimax||""} onChange={e=>set("vm_pimax",e.target.value)} style={{display:"block",width:"100%",marginTop:3,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:7,padding:"7px 9px",color:T.text1}}/></label>}
            </div>}
          </>}

          {/* Tidal volume vs peso predito */}
          {(()=>{
            const pp2 = pesoPredito(leito.altura, leito.sexo);
            const vt2 = parseFloat(leito.vm_vt||0);
            if (!pp2 || !vt2) return null;
            const mlkg = (vt2 / parseFloat(pp2)).toFixed(1);
            const cor2 = parseFloat(mlkg)>8?"#f87171":parseFloat(mlkg)>6?"#fbbf24":"#34d399";
            return (
              <div style={{padding:"5px 12px",borderRadius:8,background:`${cor2}15`,border:`1px solid ${cor2}30`,
                fontSize:12,color:cor2,display:"inline-flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                <strong>{vt2} mL</strong>
                <span>= {mlkg} mL/kg PP ({pp2}kg)</span>
                {parseFloat(mlkg)>8&&<span>⚠️ acima 8 mL/kg</span>}
              </div>
            );
          })()}
          {/* Calculados em tempo real */}
          {(dp!==null||csr!==null||pf_calc!==null||poccEffort) && (
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
              {dp!==null&&<div style={{padding:"5px 12px",borderRadius:8,background:dp>15?"rgba(248,113,113,0.1)":"rgba(52,211,153,0.08)",border:`1px solid ${dp>15?"rgba(248,113,113,0.3)":"rgba(52,211,153,0.2)"}`,fontSize:12,color:dp>15?"#f87171":"#34d399"}}>
                DP: <strong>{dp} cmH₂O</strong> {dp>15?"⚠️ alto":dp<=10?"✅ baixo":""}
              </div>}
              {csr!==null&&<div style={{padding:"5px 12px",borderRadius:8,background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.15)",fontSize:12,color:"#38bdf8"}}>
                Csr: <strong>{csr} mL/cmH₂O</strong>
              </div>}
              {pf_calc!==null&&<div style={{padding:"5px 12px",borderRadius:8,background:pf_calc<150?"rgba(248,113,113,0.1)":pf_calc<200?"rgba(251,191,36,0.1)":"rgba(52,211,153,0.08)",border:"1px solid rgba(255,255,255,0.1)",fontSize:12,color:pf_calc<150?"#f87171":pf_calc<200?"#fbbf24":"#34d399"}}>
                P/F: <strong>{pf_calc}</strong> {pf_calc<150?"SDRA grave":pf_calc<200?"SDRA moderada":pf_calc<300?"SDRA leve":"OK"}
              </div>}
              {poccEffort&&<><div style={{padding:"5px 12px",borderRadius:8,background:"rgba(167,139,250,.08)",border:"1px solid rgba(167,139,250,.24)",fontSize:12,color:"#c4b5fd"}}><span>ΔPocc <small style={{color:T.text3,fontSize:8}}>ref. 3–15</small>:</span> <strong>{poccEffort.delta.toFixed(1).replace(".",",")} cmH₂O</strong></div><div style={{padding:"5px 12px",borderRadius:8,background:"rgba(167,139,250,.08)",border:"1px solid rgba(167,139,250,.24)",fontSize:12,color:"#c4b5fd"}}><span>Pmusc estimada <small style={{color:T.text3,fontSize:8}}>alvo 5–10</small>:</span> <strong>{poccEffort.pmusc.toFixed(1).replace(".",",")} cmH₂O</strong></div></>}
            </div>
          )}
          {leito.vm_modo==="vm_psv"&&poccEffort&&<div style={{margin:"-5px 0 10px",fontSize:9,color:T.text3,fontFamily:mono}}>Calculado pela magnitude da queda durante oclusão expiratória: ΔPocc = PEEP − Pocc; Pmusc ≈ 0,75 × ΔPocc.</div>}

          {(["vm_vcv","vm_pcv"].includes(leito.vm_modo))&&(
            <div style={{marginBottom:10,padding:"9px 12px",borderRadius:9,background:T.accentBg,border:`1px solid ${T.accentBorder}`,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div style={{minWidth:170}}>
                <div style={{fontSize:9,color:T.text3,fontFamily:mono,letterSpacing:1.2,marginBottom:3}}>MECHANICAL POWER</div>
                {mechanicalPower?<div style={{fontSize:17,fontWeight:800,color:T.accent}}>{mechanicalPower.valor.toFixed(1).replace(".",",")} <span style={{fontSize:11,fontWeight:600}}>J/min</span></div>:<div style={{fontSize:11,color:T.text3}}>Preencha os parâmetros necessários.</div>}
              </div>
              <div style={{fontSize:10,color:T.text2,fontFamily:mono,lineHeight:1.55,flex:1,minWidth:250}}>
                {leito.vm_modo==="vm_vcv"?(
                  <>Gattinoni (VCV): 0,098 × VT(L) × FR × [PEEP + 0,5 × ΔP + (Ppico − Pplatô)]<br/>Necessários: VT, FR, PEEP, Pplatô e Ppico.</>
                ):(
                  <>Becher (PCV): 0,098 × VT(L) × FR × (PEEP + ΔPins)<br/>Necessários: VT medido, FR, PEEP e ΔPins acima da PEEP.</>
                )}
              </div>
            </div>
          )}

          {leito.vm_modo==="vm_psv"&&opcionalAtivo("expres")&&<div style={{marginBottom:10,padding:"11px 12px",borderRadius:10,background:"rgba(167,139,250,.06)",border:"1px solid rgba(167,139,250,.25)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:9}}>
              <div style={{fontSize:10,color:"#c4b5fd",fontFamily:mono,letterSpacing:1.2,fontWeight:800}}>ExPreS — PREDIÇÃO DE SUCESSO DA EXTUBAÇÃO</div>
              {exPres.total!==null&&<span style={{padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:800,color:exPres.faixa==="alta"?"#34d399":exPres.faixa==="intermediária"?"#fbbf24":"#f87171",background:"rgba(255,255,255,.04)"}}>{exPres.total}/100 · probabilidade {exPres.faixa}</span>}
              {exPres.total===null&&<span style={{fontSize:10,color:T.text3}}>Preencha os campos faltantes para calcular.</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:8}}>
              {[["expres_rsbi","RSBI no TRE","irpm/L"],["expres_complacencia","Complacência dinâmica","mL/cmH₂O"],["expres_mrc","Força muscular MRC","0–60"]].map(([key,label,unidade])=><label key={key} style={{fontSize:9,color:T.text3,fontFamily:mono}}>{label}<input type="number" value={leito[key]||""} onChange={e=>set(key,e.target.value)} placeholder={unidade} style={{display:"block",width:"100%",marginTop:3,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:7,padding:"6px 8px",color:T.text1,fontSize:11}}/></label>)}
              {glasgowNeurologico!==""?<div style={{padding:"6px 8px",borderRadius:7,border:`1px solid ${T.border}`,fontSize:10,color:T.text2}}><span style={{display:"block",fontSize:9,color:T.text3,fontFamily:mono}}>GLASGOW</span>{glasgowExPres} · exame neurológico</div>:<label style={{fontSize:9,color:T.text3,fontFamily:mono}}>Glasgow estimado<input type="number" value={leito.expres_egcs||""} onChange={e=>set("expres_egcs",e.target.value)} placeholder="pontos" style={{display:"block",width:"100%",marginTop:3,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:7,padding:"6px 8px",color:T.text1,fontSize:11}}/></label>}
              <div style={{padding:"6px 8px",borderRadius:7,border:`1px solid ${T.border}`,fontSize:10,color:T.text2}}><span style={{display:"block",fontSize:9,color:T.text3,fontFamily:mono}}>TEMPO DE VM</span>{diasTot===null?"TOT sem data de inserção":`${diasTot} dia(s) pelo TOT`}</div>
              <div style={{padding:"6px 8px",borderRadius:7,border:`1px solid ${T.border}`,fontSize:10,color:T.text2}}><span style={{display:"block",fontSize:9,color:T.text3,fontFamily:mono}}>HEMATÓCRITO</span>{htExPres.valor===null?"Não encontrado":`${htExPres.valor}% · ${htExPres.data}`}</div>
              <div style={{padding:"6px 8px",borderRadius:7,border:`1px solid ${T.border}`,fontSize:10,color:T.text2}}><span style={{display:"block",fontSize:9,color:T.text3,fontFamily:mono}}>CREATININA</span>{crExPres.valor===null?"Não encontrada":`${crExPres.valor} mg/dL · ${crExPres.data}`}</div>
              <label style={{fontSize:9,color:T.text3,fontFamily:mono}}>Comorbidade neurológica<select value={leito.expres_neuro||""} onChange={e=>set("expres_neuro",e.target.value)} style={{display:"block",width:"100%",marginTop:3,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:7,padding:"6px 8px",color:T.text1,fontSize:11}}><option value="">Definir…</option><option value="nao">Não</option><option value="sim">Sim</option></select></label>
            </div>
            <div style={{marginTop:8,fontSize:9,color:T.text3,lineHeight:1.5}}>RSBI deve ser o medido ao fim do TRE. Estimativa atual em PSV: {rsbiPsv===null?"—":rsbiPsv.toFixed(0)} irpm/L. O escore é apoio à decisão e não substitui TRE, avaliação de proteção de via aérea ou julgamento clínico.</div>
          </div>}

          {/* Observações */}
          {opcionalAtivo("obs")&&<div>
            <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>OBSERVAÇÕES / PARÂMETROS ADICIONAIS</div>
            <textarea value={leito.vm_obs||""} onChange={e=>set("vm_obs",e.target.value)}
              placeholder="Ex: Prone 16h, sincronismo adequado, ajuste de sedação..." rows={2}
              style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 10px",color:"#e2e8f0",fontSize:12,resize:"vertical",fontFamily:"inherit"}}/>
          </div>}
        </>
      )}
      {modoAtual&&opcionalAtivo("neb")&&<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
        <div style={{minWidth:180,flex:2}}>
          <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>NEBULIZAÇÃO — MEDICAÇÃO</div>
          <input value={leito.nebMed||""} onChange={e=>set("nebMed",e.target.value)} placeholder="Ex: Salbutamol + ipratrópio"
            style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
        </div>
        <div style={{minWidth:120,flex:1}}>
          <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>FREQUÊNCIA</div>
          <input value={leito.nebFreq||""} onChange={e=>set("nebFreq",e.target.value)} placeholder="Ex: 6/6h"
            style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
        </div>
      </div>}
      </div>}
    </div>
  );
}


// ── AntibioticosPanel ─────────────────────────────────────────────────────────
// Referências de ajuste renal: Cockroft-Gault (NKF recomenda para ajuste de dose)
// Thresholds baseados em Sanford Guide 2024, Nebraska Med Guidelines, SBRAFH
const ATB_RENAL = {
  "meropenem":       [{tfg:50,rec:"1g q12h"},{tfg:25,rec:"500mg q12h"},{tfg:10,rec:"500mg q24h"}],
  "imipenem":        [{tfg:70,rec:"500mg q8h"},{tfg:40,rec:"250mg q6h"},{tfg:20,rec:"250mg q12h"}],
  "ertapenem":       [{tfg:30,rec:"500mg q24h"}],
  "pip/tazo":        [{tfg:40,rec:"2,25g q8h (EV)"},{tfg:20,rec:"2,25g q8h (intervalo aumentado)"}],
  "pipe/tazo":       [{tfg:40,rec:"2,25g q8h (EV)"},{tfg:20,rec:"2,25g q8h (intervalo aumentado)"}],
  "pip-tazo":        [{tfg:40,rec:"2,25g q8h (EV)"},{tfg:20,rec:"2,25g q8h (intervalo aumentado)"}],
  "piperacilina-tazobactam":[{tfg:40,rec:"2,25g q8h (EV)"},{tfg:20,rec:"2,25g q8h (intervalo aumentado)"}],
  "amp/sulbactam":   [{tfg:30,rec:"1,5-3g q12h"},{tfg:15,rec:"1,5-3g q24h"}],
  "ampicilina":      [{tfg:30,rec:"q8-12h"},{tfg:10,rec:"q12h"}],
  "cefepime":        [{tfg:60,rec:"2g q24h"},{tfg:30,rec:"1g q24h"},{tfg:11,rec:"500mg q24h"}],
  "ceftriaxona":     [],
  "ceftriaxone":     [],
  "cefazolina":      [{tfg:35,rec:"sem ajuste"},{tfg:11,rec:"50% da dose q12h"},{tfg:10,rec:"50% da dose q18-24h"}],
  "ceftazidima":     [{tfg:50,rec:"1g q12h"},{tfg:30,rec:"1g q24h"},{tfg:15,rec:"500mg q24h"}],
  "vancomicina":     [{tfg:90,rec:"Manter dose; ajustar intervalo por TDM"},{tfg:50,rec:"~500mg q24h; guiar por TDM"},{tfg:10,rec:"Dose única; guiar por TDM"}],
  "teicoplanina":    [{tfg:60,rec:"q48h (após D3)"},{tfg:30,rec:"q72h (após D3)"}],
  "amicacina":       [{tfg:60,rec:"dose normal q36h"},{tfg:40,rec:"60-75% q24h"},{tfg:20,rec:"30-70% q48h"},{tfg:10,rec:"Dose única; monitorar nível"}],
  "gentamicina":     [{tfg:60,rec:"dose normal q36h"},{tfg:40,rec:"60-75% q24h"},{tfg:20,rec:"30-70% q48h"}],
  "ciprofloxacino":  [{tfg:50,rec:"200-400mg q12h IV"},{tfg:30,rec:"200-400mg q24h IV"}],
  "levofloxacino":   [{tfg:50,rec:"250mg q24h (após dose de ataque)"},{tfg:20,rec:"125mg q24h (após dose de ataque)"}],
  "fluconazol":      [{tfg:50,rec:"50% da dose habitual"}],
  "linezolida":      [],
  "colistina":       [{tfg:80,rec:"2,5mg/kg q12h"},{tfg:50,rec:"2,5mg/kg q24h"},{tfg:30,rec:"1,5mg/kg q24h"}],
  "daptomicina":     [{tfg:30,rec:"q48h"}],
  "tigeciclina":     [],
  "metronidazol":    [],
  "azitromicina":    [],
  "claritromicina":  [{tfg:30,rec:"50% da dose ou dobrar intervalo"}],
  "oxacilina":       [],
  "clindamicina":    [],
};

const ATB_VIAS = ["EV","VO","IM","SC","Inalatória"];

function calcClCr(cr, peso, idade, sexo) {
  if (!cr || !peso || !idade || idade <= 0) return null;
  const crN = parseFloat(cr); const pesoN = parseFloat(peso); const idadeN = parseFloat(idade);
  if (isNaN(crN)||isNaN(pesoN)||isNaN(idadeN)||crN<=0) return null;
  const base = ((140 - idadeN) * pesoN) / (72 * crN);
  return Math.round(base * (sexo==="F" ? 0.85 : 1));
}

// Conta dias de ATB em blocos exatos de 24h desde a primeira dose (data+hora)
function diasAtb24h(dataInicio, horaInicio) {
  if (!dataInicio) return null;
  const inicio = new Date(`${dataInicio}T${horaInicio||"00:00"}:00`);
  if (isNaN(inicio.getTime())) return null;
  const ms = Date.now() - inicio.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / 86400000); // 0 = <24h, 1 = 24-48h (D1), 2 = 48-72h (D2)...
}
function lblDiaAtb(d) {
  if (d === null || d === undefined) return null;
  return d <= 0 ? "<24h" : `D${d}`;
}
function ultimoValorTabela(tabela={},keys=[]) {
  const ds=Object.keys(tabela||{}).filter(k=>/^\d{4}-\d{2}-\d{2}/.test(k)).sort().reverse();
  for(const d of ds)for(const key of keys){const valor=tabela[d]?.[key];if(valor!==undefined&&valor!==null&&String(valor).trim())return {valor,data:d.slice(0,10)};}
  return null;
}

function atbAjusteRenal(nomeAtb, clcr) {
  const key = nomeAtb.trim().toLowerCase();
  const tabela = ATB_RENAL[key];
  if (!tabela) return null;           // ATB não encontrado
  if (tabela.length === 0) return { ok:true, rec:"Sem ajuste renal necessário" };
  if (clcr === null) return null;     // Sem dados suficientes para calcular
  const ajuste = tabela.find(a => clcr < a.tfg);
  if (!ajuste) return { ok:true, rec:"Dose normal para função renal atual" };
  return { ok:false, rec:`ClCr ${clcr} mL/min → ${ajuste.rec}` };
}

const ALERTA_CONFIG_KEY = { cvc:"alertaCVC", pai:"alertaPAI", svd:"alertaSVD", tqt:"alertaTQT", tot:"alertaTOT", sng:"alertaSNG", dreno:"alertaDreno", dialise:"alertaDialise" };

// Conta alertas ativos de um leito (ATB pendente de ajuste renal + dispositivos além do limiar) — usado nos badges da sidebar (rail colapsado)
function contarAlertasLeito(leito, tabelaData, config={}) {
  if (!leito || !leito.paciente) return 0;
  let n = 0;
  const tb = (tabelaData && tabelaData[leito.id]) || {};
  const ds = Object.keys(tb).sort().reverse();
  let cr = null;
  for (const d of ds) { if (tb[d]?.cr) { cr = tb[d].cr; break; } }
  const idade = leito.dataNascimento ? Math.floor((new Date()-new Date(leito.dataNascimento+"T00:00:00"))/(365.25*86400000)) : null;
  const clcr = calcClCr(cr, leito.peso, idade, leito.sexo);
  (leito.antibioticos||[]).filter(a=>!a.dataFim&&a.nome&&a.dataInicio).forEach(a=>{
    const dias = diasAtb24h(a.dataInicio, a.horaInicio);
    if (dias===null || dias<2) return;
    const lc = a.nome.toLowerCase();
    const key = lc.includes("pip")&&lc.includes("tazo") ? "pip/tazo" : lc.includes("amp")&&lc.includes("sulbactam") ? "amp/sulbactam" : lc.split(" ")[0].replace(/[^a-z]/g,"");
    if (clcr && ATB_RENAL[key]?.length>0) { const aj = ATB_RENAL[key].find(x=>clcr<x.tfg); if (aj) n++; }
  });
  DISP_MULTIPLO.forEach(d=>(Array.isArray((leito.dispositivos||{})[d.key])?leito.dispositivos[d.key]:[]).forEach(inst=>{
    if (!inst.data) return;
    const dd = Math.floor((new Date()-new Date(inst.data+"T00:00:00"))/86400000);
    if (dd > (config[ALERTA_CONFIG_KEY[d.key]] ?? d.alertaDias)) n++;
  }));
  DISP_SINGULAR.forEach(d=>{
    const inst = (leito.dispositivos||{})[d.key];
    if (!inst?.ativo || !inst.data) return;
    const dd = Math.floor((new Date()-new Date(inst.data+"T00:00:00"))/86400000);
    if (dd > (config[ALERTA_CONFIG_KEY[d.key]] ?? d.alertaDias)) n++;
  });
  (Array.isArray((leito.dispositivos||{}).custom)?leito.dispositivos.custom:[]).forEach(inst=>{
    if(!inst.data)return;const dd=Math.floor((new Date()-new Date(inst.data+"T00:00:00"))/86400000);
    if(dd>(inst.alertaDias||21))n++;
  });
  return n;
}

function AntibioticosPanel({ antibioticos=[], onChange, crSerico="", peso="", idadeAnos=null, sexo="M", clcrOverride=null, vancocinemia=null }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";
  const hoje = new Date().toISOString().split("T")[0];
  const [busca, setBusca] = useState("");
  const [showBusca, setShowBusca] = useState(false);
  const [suspendendo, setSuspendendo] = useState(null); // id do atb sendo suspenso

  const clcr = clcrOverride !== null ? clcrOverride : calcClCr(crSerico, peso, idadeAnos, sexo);

  const ATB_LISTA = [
    // Carbapenems
    "Meropenem","Imipenem","Ertapenem",
    // Beta-lactâmicos
    "Piperacilina-Tazobactam","Amp/Sulbactam","Ampicilina",
    "Cefepime","Ceftriaxona","Cefazolina","Ceftazidima","Ceftolozana-Tazobactam","Cefiderocol",
    // Glicopeptídeos
    "Vancomicina","Teicoplanina",
    // Oxazolidinona / Lipopeptídeo
    "Linezolida","Daptomicina",
    // Aminoglicosídeos
    "Amicacina","Gentamicina",
    // Fluoroquinolonas
    "Ciprofloxacino","Levofloxacino","Moxifloxacino",
    // Antifúngicos
    "Fluconazol","Caspofungina","Micafungina","Voriconazol","Anidulafungina","Isavuconazol","Anfotericina B lipossomal",
    // Polimixinas
    "Colistina","Polimixina B",
    // Outros
    "Metronidazol","Clindamicina","Oxacilina","Azitromicina","Claritromicina","SMX-TMP","Tigeciclina",
  ];
  const ATB_VIAS = ["EV","VO","IM","SC","Inalatória"];

  const atbFiltrados = busca.length >= 1 ? ATB_LISTA.filter(a => a.toLowerCase().includes(busca.toLowerCase())) : [];
  const chaveR = (n) => { const lc = n.toLowerCase(); if (lc.includes("pip")&&lc.includes("tazo")) return "pip/tazo"; if (lc.includes("amp")&&lc.includes("sulbactam")) return "amp/sulbactam"; if (lc.includes("imipenem")) return "imipenem"; return lc.split(" ")[0].replace(/[^a-z]/g,""); };

  const addAtb = (nome="") => {
    const now = new Date();
    const horaAtual = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    onChange([...antibioticos, { id: Date.now(), nome, via:"EV", dose:"", dataInicio: hoje, horaInicio: horaAtual, dataFim:"", diasPlanejados:"", doseConfirmada:false }]);
    setBusca(""); setShowBusca(false);
  };
  const remAtb = (id) => onChange(antibioticos.filter(a => a.id !== id));
  const updAtb = (id, field, val) => onChange(antibioticos.map(a => {
    if (a.id !== id) return a;
    const u = {...a, [field]: val};
    if (field==="dose"||field==="intervalo") u.doseConfirmada = false;
    return u;
  }));

  const fmtData = (d) => d ? new Date(d+"T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"}) : "";

  const ativos    = antibioticos.filter(a => !a.dataFim);
  const encerrados = antibioticos.filter(a => a.dataFim);

  return (
    <div>
      <SecTitle>ANTIBIOTICOTERAPIA</SecTitle>

      {/* ClCr badge */}
      {clcr !== null && (
        <div style={{marginBottom:8,padding:"4px 10px",background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.12)",borderRadius:6,fontSize:11,color:"#94a3b8",fontFamily:mono,display:"inline-flex",gap:10}}>
          <span>ClCr: <strong style={{color:clcr>=60?"#34d399":clcr>=30?"#fbbf24":"#f87171"}}>{clcr} mL/min</strong></span>
          <span style={{color:"#334155"}}>Cr {crSerico} · {peso}kg · {idadeAnos}a · {sexo==="F"?"♀":"♂"}</span>
        </div>
      )}

      {/* ATBs ativos */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:6,marginBottom:6}}>
        {ativos.map(atb => {
          const diasAtb = diasAtb24h(atb.dataInicio, atb.horaInicio);
          const horas48  = diasAtb !== null && diasAtb < 2;
          const cK = chaveR;
          const ajuste = (!horas48 && atb.nome) ? atbAjusteRenal(cK(atb.nome), clcr) : null;
          const doseOk = atb.doseConfirmada || (ajuste && ajuste.ok);
          const isSuspendendo = suspendendo === atb.id;

          return (
            <div key={atb.id} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${ajuste&&!ajuste.ok&&!doseOk?"rgba(248,113,113,0.3)":"rgba(255,255,255,0.08)"}`,borderRadius:8,padding:"10px 12px"}}>
              {/* Linha 1: nome + dia + suspender + remover */}
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                <input value={atb.nome} onChange={e=>updAtb(atb.id,"nome",e.target.value)}
                  placeholder="ATB / Antifúngico"
                  style={{flex:1,background:"transparent",border:"none",borderBottom:"1px solid rgba(255,255,255,0.12)",padding:"2px 0",color:T.text1,fontSize:12,fontWeight:600,outline:"none"}}/>
                {diasAtb !== null && atb.dose && (
                  <span style={{padding:"1px 7px",borderRadius:10,fontSize:10,fontFamily:mono,fontWeight:700,
                    background:diasAtb<=0?"rgba(56,189,248,0.12)":diasAtb<7?"rgba(52,211,153,0.1)":"rgba(251,146,60,0.1)",
                    color:diasAtb<=0?"#38bdf8":diasAtb<7?"#34d399":"#fb923c",whiteSpace:"nowrap"}}>
                    {lblDiaAtb(diasAtb)}
                  </span>
                )}
                <button onClick={()=>setSuspendendo(isSuspendendo?null:atb.id)}
                  title="Suspender ATB"
                  style={{background:isSuspendendo?"rgba(251,146,60,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${isSuspendendo?"rgba(251,146,60,0.4)":"rgba(255,255,255,0.1)"}`,borderRadius:5,color:isSuspendendo?"#fb923c":"#64748b",cursor:"pointer",fontSize:10,padding:"2px 7px",fontWeight:600}}>
                  {isSuspendendo?"✕":"⏹ Suspender"}
                </button>
                <button onClick={()=>remAtb(atb.id)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:13,padding:"0 2px"}}>✕</button>
              </div>

              {/* Suspensão inline */}
              {isSuspendendo && (
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7,padding:"6px 8px",background:"rgba(251,146,60,0.06)",borderRadius:6,border:"1px solid rgba(251,146,60,0.2)"}}>
                  <span style={{fontSize:11,color:"#fb923c",fontFamily:mono,flex:1}}>Data de encerramento:</span>
                  <input type="date" value={atb.dataFim||""} onChange={e=>{updAtb(atb.id,"dataFim",e.target.value);setSuspendendo(null);}}
                    style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(251,146,60,0.3)",borderRadius:6,padding:"3px 8px",color:"#fb923c",fontSize:11}}/>
                </div>
              )}

              {/* Linha 2: via + dose + data início (compacto) */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <select value={atb.via||"EV"} onChange={e=>updAtb(atb.id,"via",e.target.value)}
                  style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,padding:"4px 6px",color:T.text2,fontSize:11,cursor:"pointer",minWidth:60}}>
                  {ATB_VIAS.map(v=><option key={v} value={v}>{v}</option>)}
                </select>
                <input value={atb.dose} onChange={e=>updAtb(atb.id,"dose",e.target.value)}
                  placeholder="Dose/posologia (ex: 1g q8h)"
                  style={{flex:1,minWidth:100,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,padding:"4px 8px",color:T.text1,fontSize:11}}/>
                <input type="date" value={atb.dataInicio||""} onChange={e=>updAtb(atb.id,"dataInicio",e.target.value)}
                  style={{minWidth:100,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,padding:"4px 6px",color:T.text2,fontSize:11}}/>
                <input type="time" value={atb.horaInicio||""} onChange={e=>updAtb(atb.id,"horaInicio",e.target.value)}
                  title="Hora da 1ª dose"
                  style={{width:62,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,padding:"4px 4px",color:T.text2,fontSize:11}}/>
                <input type="number" min="1" value={atb.diasPlanejados||""} onChange={e=>updAtb(atb.id,"diasPlanejados",e.target.value)}
                  placeholder="Dias planejados" title="Duração planejada da terapia"
                  style={{width:112,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,padding:"4px 6px",color:T.text2,fontSize:11}}/>
              </div>
              {/vancom/i.test(atb.nome||"")&&<div style={{marginTop:6,padding:"5px 8px",borderRadius:6,background:"rgba(56,189,248,.07)",border:"1px solid rgba(56,189,248,.20)",display:"flex",alignItems:"center",gap:7,fontSize:10,fontFamily:mono}}><span style={{color:"#38bdf8",fontWeight:700}}>Vancocinemia</span>{vancocinemia?.valor?<><strong style={{color:T.text1}}>{vancocinemia.valor}</strong><span style={{color:T.text4}}>{vancocinemia.data?fmtData(vancocinemia.data):""}</span></>:<span style={{color:T.text4}}>sem dosagem registrada</span>}</div>}

              {/* Alerta renal — só se relevante */}
              {(()=>{
                if (!atb.nome) return null;
                if (horas48) return <div style={{marginTop:5,fontSize:10,color:"#475569",fontFamily:mono}}>⏱ &lt;48h — sem ajuste renal</div>;
                if (clcr===null||!ajuste) return null;
                if (doseOk) return <div style={{marginTop:5,fontSize:10,color:"#34d399",fontFamily:mono}}>✅ Dose ok — ClCr {clcr} mL/min</div>;
                return (
                  <div style={{marginTop:5,borderRadius:5,overflow:"hidden",border:"1px solid rgba(248,113,113,0.2)"}}>
                    <div style={{padding:"4px 8px",background:"rgba(248,113,113,0.06)",fontSize:10,color:"#f87171",fontFamily:mono}}>
                      ⚠️ ClCr {clcr} mL/min → {ajuste.rec}
                    </div>
                    <button onClick={()=>updAtb(atb.id,"doseConfirmada",true)}
                      style={{width:"100%",padding:"3px 8px",background:"rgba(52,211,153,0.05)",border:"none",borderTop:"1px solid rgba(248,113,113,0.1)",color:"#34d399",cursor:"pointer",fontSize:10,fontFamily:mono,textAlign:"left"}}>
                      ✓ Dose já ajustada
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* ATBs encerrados — lista concisa */}
      {encerrados.length > 0 && (
        <div style={{marginBottom:6,padding:"8px 12px",background:"rgba(100,116,139,0.06)",border:"1px solid rgba(100,116,139,0.15)",borderRadius:8}}>
          <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:5}}>ANTIBIOTICOTERAPIA PRÉVIA</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {encerrados.map(a=>{
              const diasTotal = (a.dataInicio&&a.dataFim) ? Math.floor((new Date(a.dataFim+"T00:00:00")-new Date(a.dataInicio+"T00:00:00"))/86400000)+1 : null;
              return (
                <span key={a.id} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"2px 8px",borderRadius:10,background:"rgba(100,116,139,0.1)",border:"1px solid rgba(100,116,139,0.2)",fontSize:11,color:"#94a3b8"}}>
                  <span style={{color:"#cbd5e1",fontWeight:600}}>{a.nome}</span>
                  <span>{fmtData(a.dataInicio)}–{fmtData(a.dataFim)}{diasTotal?` (${diasTotal}d)`:""}</span>
                  <button onClick={()=>updAtb(a.id,"dataFim","")} title="Reativar" style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:11,padding:0}}>↩</button>
                  <button onClick={()=>remAtb(a.id)} title="Remover" style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:11,padding:0}}>✕</button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Busca/adição */}
      <div style={{position:"relative"}}>
        <div style={{display:"flex",gap:6}}>
          <input value={busca} onChange={e=>{setBusca(e.target.value);setShowBusca(true);}} onFocus={()=>setShowBusca(true)}
            onKeyDown={e=>{if(e.key==="Enter"&&busca.trim()){if(atbFiltrados.length>0)addAtb(atbFiltrados[0]);else addAtb(busca.trim());}if(e.key==="Escape")setShowBusca(false);}}
            placeholder="+ Buscar ATB / antifúngico... (Enter para adicionar)"
            style={{flex:1,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:7,padding:"7px 11px",color:"#e2e8f0",fontSize:12,outline:"none"}}/>
        </div>
        {showBusca && atbFiltrados.length > 0 && (
          <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:99,background:"#0c1a10",border:"1px solid rgba(56,189,248,0.25)",borderRadius:7,marginTop:3,maxHeight:200,overflowY:"auto"}}>
            {atbFiltrados.map(a=>(
              <div key={a} onClick={()=>addAtb(a)}
                style={{padding:"7px 12px",cursor:"pointer",fontSize:12,color:"#cbd5e1",display:"flex",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,0.04)"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(56,189,248,0.1)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span>{a}</span>
                {ATB_RENAL[chaveR(a)]?.length===0
                  ? <span style={{fontSize:10,color:"#34d399"}}>sem ajuste</span>
                  : ATB_RENAL[chaveR(a)]?.length>0
                    ? <span style={{fontSize:10,color:"#fbbf24"}}>⚠️ ajuste renal</span>
                    : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// ── PacientePanel ─────────────────────────────────────────────────────────────
function PacientePanel({ dados, onChange, config={}, onLancarDroga, onConfigChange, diureseHoje="", tabelaHoje={}, leitosDisponiveis=[], onTransferir }) {
  const [destinoLeito,setDestinoLeito]=useState("");
  const dias  = diasInternacao(dados.dataInternacao);
  const idadeAnos = idadeDoLeito(dados);
  const idade = idadeAnos;
  const pp    = pesoPredito(dados.altura, dados.sexo);
  const vc6   = pp ? Math.round(parseFloat(pp)*6) : null;
  const vc8   = pp ? Math.round(parseFloat(pp)*8) : null;

  // Diurese: usa o valor dos Controles 24h (c24_diur) com período fixo de 24h
  const volUrina = parseFloat(diureseHoje) || 0;
  const diurese  = (volUrina && dados.peso)
    ? (volUrina / (24 * parseFloat(dados.peso))).toFixed(2) : null;

  return (
    <div>
      <SecTitle>DADOS DO PACIENTE</SecTitle>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:10 }}>
        <Field label="NOME / ID"   value={dados.paciente}    onChange={v=>onChange({...dados,paciente:v})}    placeholder="Nome ou prontuário" style={{flex:2,minWidth:200}}/>
        <Field label="DIAGNÓSTICO" value={dados.diagnostico} onChange={v=>onChange({...dados,diagnostico:v})} placeholder="Diagnóstico principal" style={{flex:3,minWidth:200}}/>
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:10, alignItems:"flex-end" }}>
        <Field label="DATA INTERNAÇÃO"   value={dados.dataInternacao}    onChange={v=>onChange({...dados,dataInternacao:v})}  type="date" style={{minWidth:150}}/>
        <Field label="IDADE (ANOS)"   value={dados.idadeAnos||""} onChange={v=>onChange({...dados,idadeAnos:v})} type="number" placeholder="Ex: 68" style={{minWidth:100}}/>
        <div style={{ minWidth:150, flex:1 }}>
          <div style={{ fontSize:10, color:"#64748b", fontFamily:mono, letterSpacing:1, marginBottom:4 }}>SEXO BIOLÓGICO</div>
          <div style={{ display:"flex", gap:6, height:38 }}>
            {["M","F"].map(s=>(
              <button key={s} onClick={()=>onChange({...dados,sexo:s})} style={{ flex:1, borderRadius:8, border:`1px solid ${dados.sexo===s?"#38bdf8":"rgba(255,255,255,0.1)"}`, background:dados.sexo===s?"rgba(56,189,248,0.12)":"rgba(255,255,255,0.03)", color:dados.sexo===s?"#38bdf8":"#64748b", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                {s==="M"?"♂ Masc":"♀ Fem"}
              </button>
            ))}
          </div>
        </div>
        <Field label="PESO (kg)"   value={dados.peso}   onChange={v=>onChange({...dados,peso:v})}   type="number" placeholder="70"  suffix="kg" style={{minWidth:90}}/>
        <Field label="ALTURA (cm)" value={dados.altura} onChange={v=>onChange({...dados,altura:v})} type="number" placeholder="170" suffix="cm" style={{minWidth:90}}/>
        <div style={{minWidth:260,flex:2}}><div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:5}}>RANKIN MODIFICADA — ADMISSÃO</div><select value={dados.rankinAdmissao??""} onChange={e=>onChange({...dados,rankinAdmissao:e.target.value})} style={{width:"100%",height:38,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"0 9px",color:"#e2e8f0",fontSize:11}}><option value="">— selecionar —</option>{RANKIN_OPCOES.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
      </div>

      <div style={{margin:"14px 0",padding:"12px 14px",border:"1px solid rgba(56,189,248,.18)",borderRadius:10,background:"rgba(56,189,248,.035)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:(dados.acompanhantes||[]).length?10:0}}>
          <div><div style={{fontSize:10,color:"#38bdf8",fontFamily:mono,letterSpacing:1.5,fontWeight:700}}>ACOMPANHANTES / FAMILIARES</div><div style={{fontSize:10,color:"#64748b",marginTop:2}}>Nome e vínculo com o paciente</div></div>
          <button onClick={()=>onChange({...dados,acompanhantes:[...(dados.acompanhantes||[]),{id:`acomp_${Date.now()}`,nome:"",parentesco:""}]})} style={{padding:"5px 9px",borderRadius:7,border:"1px solid rgba(56,189,248,.3)",background:"rgba(56,189,248,.08)",color:"#38bdf8",fontSize:10,fontWeight:700,cursor:"pointer"}}>＋ Adicionar</button>
        </div>
        <div style={{display:"grid",gap:8}}>{(dados.acompanhantes||[]).map((a,i)=><div key={a.id||i} style={{display:"grid",gridTemplateColumns:"minmax(180px,2fr) minmax(140px,1fr) 32px",gap:8,alignItems:"end"}}>
          <Field label="NOME" value={a.nome||""} onChange={v=>onChange({...dados,acompanhantes:(dados.acompanhantes||[]).map((x,j)=>j===i?{...x,nome:v}:x)})} placeholder="Nome do acompanhante"/>
          <Field label="PARENTESCO / VÍNCULO" value={a.parentesco||""} onChange={v=>onChange({...dados,acompanhantes:(dados.acompanhantes||[]).map((x,j)=>j===i?{...x,parentesco:v}:x)})} placeholder="Ex: filha, esposo, cuidador"/>
          <button title="Remover acompanhante" onClick={()=>onChange({...dados,acompanhantes:(dados.acompanhantes||[]).filter((_,j)=>j!==i)})} style={{height:38,borderRadius:7,border:"1px solid rgba(248,113,113,.25)",background:"rgba(248,113,113,.06)",color:"#f87171",cursor:"pointer"}}>✕</button>
        </div>)}</div>
      </div>

      {dados.paciente&&leitosDisponiveis.length>0&&<div style={{display:"flex",alignItems:"end",gap:8,flexWrap:"wrap",margin:"10px 0 14px",padding:"10px 12px",borderRadius:9,border:"1px solid rgba(251,191,36,.25)",background:"rgba(251,191,36,.045)"}}>
        <label style={{flex:1,minWidth:220,fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1}}>TRANSFERIR PACIENTE PARA OUTRO LEITO<select value={destinoLeito} onChange={e=>setDestinoLeito(e.target.value)} style={{display:"block",width:"100%",height:38,marginTop:4,borderRadius:8,border:"1px solid rgba(251,191,36,.3)",background:"rgba(255,255,255,.04)",color:"#e2e8f0",padding:"0 9px"}}><option value="">— selecionar leito vago —</option>{leitosDisponiveis.map(l=><option key={l.id} value={l.id}>{l.nome}</option>)}</select></label>
        <button disabled={!destinoLeito} onClick={async()=>{if(await onTransferir?.(destinoLeito))setDestinoLeito("");}} style={{height:38,padding:"0 13px",borderRadius:8,border:"1px solid rgba(251,191,36,.35)",background:"rgba(251,191,36,.09)",color:"#d97706",fontWeight:800,cursor:destinoLeito?"pointer":"not-allowed",opacity:destinoLeito?1:.45}}>Transferir leito</button>
      </div>}


      {/* Balanço Hídrico Prévio */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:10, marginTop:10 }}>
        <div style={{flex:1, minWidth:200}}>
          <div style={{ fontSize:10, color:"#64748b", fontFamily:mono, letterSpacing:1, marginBottom:4 }}>BALANÇO PRÉVIO (mL) <span style={{color:"#475569",fontWeight:400,letterSpacing:0}}>— soma antes do sistema</span></div>
          <input type="number" value={dados.bhPrevio||""} onChange={e=>onChange({...dados,bhPrevio:e.target.value})}
            placeholder="Ex: +1500 ou -800"
            style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"9px 12px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
        </div>
      </div>
      {(dias!==null||pp||dados.peso) && <>
        <Collapsible title="PARÂMETROS CALCULADOS" defaultOpen={true}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {dias!==null && <Pill label="INTERNAÇÃO"   value={`D${dias}`}   unit="dias"            color="#a78bfa"/>}
          {dados.peso  && <Pill label="PESO ATUAL"   value={dados.peso}   unit="kg"              color="#f59e0b"/>}
          {pp          && <Pill label="PESO PREDITO" value={pp}           unit="kg (ARDSNet)"    color="#fb923c"/>}
          {vc6         && <Pill label="VC 6 mL/kg"   value={vc6}          unit="mL (protetor)"   color="#34d399"/>}
          {vc8         && <Pill label="VC 8 mL/kg"   value={vc8}          unit="mL (máx ARDSNet)"color="#34d399"/>}
        </div>
        {pp && (
          <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:"rgba(251,146,60,0.07)",border:"1px solid rgba(251,146,60,0.2)",borderRadius:8,fontSize:11,color:"#cbd5e1",flexWrap:"wrap"}}>
            <span>💡 <strong>PP:</strong> {dados.sexo==="M"?"♂":"♀"} {dados.altura}cm → <strong style={{color:"#fb923c"}}>{pp}kg</strong></span>
            <span style={{color:"#64748b"}}>·</span>
            <span>VC protetor <strong style={{color:"#34d399"}}>{vc6}mL</strong></span>
            <span style={{color:"#64748b"}}>·</span>
            <span>Máx ARDSNet <strong style={{color:"#34d399"}}>{vc8}mL</strong></span>
          </div>
        )}
        </Collapsible>
      </>}


      <Collapsible title="PROCEDIMENTOS" defaultOpen={true}>
      <ProcedimentosPanel
        procedimentos={dados.procedimentos||[]}
        onChange={procs=>onChange({...dados,procedimentos:procs})}
      />
      </Collapsible>

      <Collapsible title="HISTÓRICO CLÍNICO" defaultOpen={false}>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:220,marginBottom:10}}>
          <div style={{fontSize:10,color:"#64748b",fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:4}}>DOENÇAS PRÉVIAS / COMORBIDADES</div>
          <textarea value={dados.doencasPrevias||""} onChange={e=>onChange({...dados,doencasPrevias:e.target.value})}
            placeholder={"HAS · DM2 · ICC · DRC · DPOC · FA crônica..."} rows={4}
            style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 10px",color:"#cbd5e1",fontSize:12,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
        </div>
        <div style={{flex:1,minWidth:220,marginBottom:10}}>
          <div style={{fontSize:10,color:"#64748b",fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:4}}>MEDICAÇÕES DE USO CONTÍNUO</div>
          <textarea value={dados.medicacoesContinuas||""} onChange={e=>onChange({...dados,medicacoesContinuas:e.target.value})}
            placeholder={"- Losartana 50mg 1x/d\n- Metformina 500mg 2x/d\n- AAS 100mg 1x/d"} rows={4}
            style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 10px",color:"#cbd5e1",fontSize:12,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/>
        </div>
      </div>
      </Collapsible>
    </div>
  );
}

const LAB_MAP_TEXT={"hb":"hb","hemoglobina":"hb","ht":"ht","leuco":"leuco","leucocitos":"leuco","plaq":"plaq","plaquetas":"plaq","cr":"cr","creatinina":"cr","ur":"ur","ureia":"ur","na":"na","sodio":"na","k":"k","potassio":"k","mg":"mg","magnesio":"mg","cai":"cai","calcio":"cai","ca":"cai","p":"p","fosforo":"p","fa":"falc","falc":"falc","ggt":"ggt","tgo":"tgo","ast":"tgo","tgp":"tgp","alt":"tgp","bt":"bttot","bttot":"bttot","alb":"alb","rni":"rni","inr":"rni","ttpa":"ttpa","fibri":"fibri","ph":"ph","bic":"hco3","hco3":"hco3","be":"be","pco2":"pco2","po2":"po2","lact":"lact","lactato":"lact","trop":"trop","bnp":"bnp","ntpro":"ntpro","pcr":"pcr"};
function parsearLabsTexto(txt){const result={};txt.split(/[/;\n]+/).forEach(part=>{const m=part.trim().match(/^([a-zA-Z\u00C0-\u00FF0-9_]+)\s+([0-9.,]+k?)/i);if(!m)return;const[,nome,valRaw]=m;const chave=nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");const key=LAB_MAP_TEXT[chave];let val=valRaw.replace(",",".");if(val.endsWith("k"))val=String(parseFloat(val)*1000);if(key)result[key]=val;else result[`_extra_${nome.toLowerCase()}`]=val;});return result;}


const CTRL_MAP_TEXT = {
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

function parsearControlesTexto(txt) {
  const result = {};
  // Split on / or ; or newline
  txt.split(/[/;\n]+/).forEach(part => {
    // Match "KEY value" where value can be "37 - 36.5" or "-900" or "500"
    // Key can be multi-word: "PAM 78 - 60" or "DU 500" or "BH -900"
    const m = part.trim().match(/^([a-zA-ZÀ-ú0-9_\s]+?)\s+([-]?[0-9]+(?:[.,][0-9]+)?(?:\s*[-–]\s*[-]?[0-9]+(?:[.,][0-9]+)?)*)$/i);
    if (!m) return;
    const [, nomeRaw, valRaw] = m;
    const chave = nomeRaw.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
    const key = CTRL_MAP_TEXT[chave];
    // Normalize value: use dash separator for ranges
    const val = valRaw.trim().replace(/\s*[-–]\s*/g, " / ").replace(",", ".");
    if (key) result[key] = val;
    // else ignore — controles not recognized are discarded silently
  });
  return result;
}

// ── UploadAnalyzer ────────────────────────────────────────────────────────────
function UploadAnalyzer({ onResult, onManualResult }) {
  const [loading,setLoading]=useState(false);
  const [preview,setPreview]=useState(null);
  const [draft,setDraft]=useState(null);
  const [rev,setRev]=useState(false);
  const [textoManual,setTextoManual]=useState("");
  const [textoCtrl,setTextoCtrl]=useState("");
  const [importadoMsg,setImportadoMsg]=useState("");
  const [importadoCtrlMsg,setImportadoCtrlMsg]=useState("");
  const fileRef=useRef();
  const areaRef=useRef();
  const importarControles=()=>{
    if(!textoCtrl.trim())return;
    const parsed=parsearControlesTexto(textoCtrl);
    if(!Object.keys(parsed).length){setImportadoCtrlMsg("Nenhum campo reconhecido.");return;}
    if(onManualResult)onManualResult(parsed);
    const campos=Object.keys(parsed).map(k=>k.replace("c24_","")).join(", ");
    setImportadoCtrlMsg(`✅ Importados: ${campos}`);
    setTextoCtrl("");
  };
  const importarManual=()=>{if(!textoManual.trim())return;const parsed=parsearLabsTexto(textoManual);if(!Object.keys(parsed).length){setImportadoMsg("Nenhum campo reconhecido.");return;}if(onManualResult)onManualResult(parsed);const campos=Object.keys(parsed).filter(k=>!k.startsWith("_extra_")).join(", ");const extras=Object.keys(parsed).filter(k=>k.startsWith("_extra_")).map(k=>k.replace("_extra_","")).join(", ");setImportadoMsg(`✅ Importados: ${campos}${extras?` · extras: ${extras}`:""}`);setTextoManual("");};

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = e.target.result.split(",")[1];
      setPreview(e.target.result); setLoading(true); setDraft(null); setRev(false);
      try {
        const r = await fetch("/api/analyze", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ imageBase64: b64, mimeType: file.type || "image/png" })
        });
        const data = await r.json();
        if (data.error && data.error !== 'parse_failed') throw new Error(data.error);
        if (data.raw) throw new Error("Resposta inválida da IA");
        setDraft(data);
        setRev(true);
      } catch(err) { setDraft({error:`Erro ao analisar imagem: ${err.message}`}); }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }, []);

  // Paste anywhere on the page
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          handleFile(item.getAsFile());
          return;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFile]);

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:10,marginBottom:16}}>
        {/* Labs */}
        <div style={{padding:"12px 14px",background:"rgba(56,189,248,0.04)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:10}}>
          <div style={{fontSize:11,color:"#94a3b8",marginBottom:6}}><strong style={{color:"#38bdf8"}}>🔬 Entrada manual de labs</strong></div>
          <div style={{fontSize:10,color:"#475569",marginBottom:6}}>Ex: Hb 9.8 / Leuco 12k / Cr 3 / Na 140 / K 4 / pH 7.21 / Bic 12</div>
          <div style={{display:"flex",gap:6}}>
            <input placeholder="Labs aqui..." value={textoManual} onChange={e=>setTextoManual(e.target.value)} onKeyDown={e=>e.key==="Enter"&&importarManual()} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12,outline:"none"}}/>
            <button onClick={importarManual} style={{padding:"7px 12px",background:"rgba(56,189,248,0.12)",border:"1px solid rgba(56,189,248,0.3)",borderRadius:7,color:"#38bdf8",cursor:"pointer",fontSize:12,fontWeight:600}}>→</button>
          </div>
          {importadoMsg&&<div style={{marginTop:5,fontSize:11,color:"#34d399"}}>{importadoMsg}</div>}
        </div>
        {/* Controles 24h */}
        <div style={{padding:"12px 14px",background:"rgba(52,211,153,0.04)",border:"1px solid rgba(52,211,153,0.15)",borderRadius:10}}>
          <div style={{fontSize:11,color:"#94a3b8",marginBottom:6}}><strong style={{color:"#34d399"}}>📊 Controles 24h (manual)</strong></div>
          <div style={{fontSize:10,color:"#475569",marginBottom:6}}>Ex: T 37.1-36 / FC 100-120 / PAM 78-60 / DU 500 / HD 1000 / BH -900</div>
          <div style={{fontSize:10,color:"#334155",marginBottom:6}}>Abrev: T, FC, FR, PAS, PAD, PAM, SpO2, Dextro/HGT/Glic, DU/Diurese, HD/CRRT, BH, Dieta/NPT</div>
          <div style={{display:"flex",gap:6}}>
            <input placeholder="Controles aqui..." value={textoCtrl} onChange={e=>setTextoCtrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&importarControles()} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12,outline:"none"}}/>
            <button onClick={importarControles} style={{padding:"7px 12px",background:"rgba(52,211,153,0.12)",border:"1px solid rgba(52,211,153,0.3)",borderRadius:7,color:"#34d399",cursor:"pointer",fontSize:12,fontWeight:600}}>→</button>
          </div>
          {importadoCtrlMsg&&<div style={{marginTop:5,fontSize:11,color:"#34d399"}}>{importadoCtrlMsg}</div>}
        </div>
      </div>
      <div onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}} onDragOver={e=>e.preventDefault()} onClick={()=>fileRef.current?.click()}
        style={{ border:"1.5px dashed rgba(56,189,248,0.3)", borderRadius:12, padding:24, textAlign:"center", cursor:"pointer", background:"rgba(56,189,248,0.03)", marginBottom:16 }}>
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
        <div style={{fontSize:28,marginBottom:8}}>📋</div>
        <div style={{color:"#38bdf8",fontSize:14,fontWeight:600}}>Cole o print com Ctrl+V</div>
        <div style={{color:"#64748b",fontSize:12,marginTop:6}}>ou arraste · ou clique para selecionar arquivo</div>
        <div style={{marginTop:10,display:"inline-block",padding:"4px 14px",borderRadius:20,background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.2)",fontSize:11,color:"#38bdf8",fontFamily:mono,letterSpacing:1}}>
          CTRL + V  em qualquer momento nesta aba
        </div>
      </div>
      {preview && <img src={preview} alt="preview" style={{width:"100%",borderRadius:8,marginBottom:12,maxHeight:180,objectFit:"contain",background:"#0c1a10"}}/>}
      {loading && <div style={{textAlign:"center",color:"#38bdf8",padding:16,fontSize:14}}>⏳ Analisando imagem com IA…</div>}
      {draft && !draft.error && rev && (
        <div>
          {draft.resumo && !draft.resumo.startsWith('{') && !draft.resumo.startsWith('[ERRO') && !draft.resumo.startsWith('[SEM') && (
            <div style={{background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:"#86efac"}}>
              <strong>Resumo IA:</strong> {draft.resumo}
            </div>
          )}
          {draft.dataColeta && (
            <div style={{background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.25)",borderRadius:8,padding:"8px 14px",marginBottom:12,fontSize:12,color:"#4ade80",display:"flex",alignItems:"center",gap:8}}>
              📅 <strong>Data detectada:</strong> {(() => {
                const [datePart] = draft.dataColeta.split('T');
                const [y,m,d] = datePart.split('-');
                return `${d}/${m}/${y}`;
              })()} — os valores serão lançados nesta coluna da tabela
            </div>
          )}

          {/* ── Controles 24h extraídos ── */}
          {draft.controles && Object.values(draft.controles).some(v=>v) && (
            <div style={{marginBottom:16,padding:"12px 14px",background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:10}}>
              <div style={{fontSize:11,color:"#34d399",fontFamily:mono,letterSpacing:1,marginBottom:10}}>📊 CONTROLES 24H DETECTADOS — edite se necessário</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
                {[
                  {key:"c24_temp",   label:"T °C  (mín / máx)"},
                  {key:"c24_fc",     label:"FC bpm  (mín / máx)"},
                  {key:"c24_fr",     label:"FR irpm  (mín / máx)"},
                  {key:"c24_sat",    label:"SpO2 %  (mín / máx)"},
                  {key:"c24_pam",    label:"PAM mmHg  (mín / máx)"},
                  {key:"c24_pas",    label:"PAS/PAD  (mín-máx / mín-máx)"},
                  {key:"c24_dextro", label:"Glic cap  (mín / máx)"},
                  {key:"c24_diur",   label:"Diurese mL  (total)"},
                  {key:"c24_bh",     label:"BH mL  (total)"},
                  {key:"c24_pic",    label:"PIC mmHg  (mín / máx)"},
                  {key:"c24_dve",    label:"Líquor DVE mL  (total)"},
                  {key:"c24_dreno1", label:"Dreno 1 mL  (total)"},
                  {key:"c24_dreno2", label:"Dreno 2 mL  (total)"},
                  {key:"c24_dreno3", label:"Dreno 3 mL  (total)"},
                  {key:"c24_sng",    label:"Resíduo SNG mL  (total)"},
                ].map(({key,label})=>(
                  <div key={key}>
                    <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:2}}>{label}</div>
                    <input value={draft.controles?.[key]||""} onChange={e=>setDraft(d=>({...d,controles:{...d.controles,[key]:e.target.value}}))}
                      style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:6,padding:"5px 8px",color:"#e2e8f0",fontSize:13,fontFamily:mono,boxSizing:"border-box"}}
                      placeholder="—"/>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{fontSize:12,color:"#94a3b8",marginBottom:8,fontFamily:mono}}>DADOS CLÍNICOS (sistemas) — edite se necessário</div>
          {SISTEMAS.map(s=>(
            <div key={s} style={{marginBottom:10}}>
              <div style={{fontSize:11,color:"#38bdf8",marginBottom:4,fontFamily:mono}}>{s.toUpperCase()}</div>
              <textarea value={draft.sistemas?.[s]||""} onChange={e=>setDraft(d=>({...d,sistemas:{...d.sistemas,[s]:e.target.value}}))}
                style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 10px",color:"#e2e8f0",fontSize:13,resize:"vertical",fontFamily:"inherit",minHeight:46,boxSizing:"border-box"}}
                placeholder={`Dados de ${s}...`}/>
            </div>
          ))}

          {/* Exames extras não categorizados */}
          {(draft.extras||[]).length > 0 && (
            <div style={{marginTop:4,marginBottom:12,padding:"12px 14px",background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10}}>
              <div style={{fontSize:11,color:"#f59e0b",fontFamily:mono,letterSpacing:1,marginBottom:10}}>⚠️ EXAMES NÃO CATEGORIZADOS — selecione onde lançar</div>
              {(draft.extras||[]).map((ex,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
                  <div style={{flex:2,minWidth:140,fontSize:13,color:"#e2e8f0",fontWeight:600}}>{ex.nome}: <span style={{color:"#fcd34d"}}>{ex.valor}</span></div>
                  <select value={ex.categoria||ex.sugestao||""} onChange={e=>setDraft(d=>({...d,extras:d.extras.map((x,j)=>j===i?{...x,categoria:e.target.value}:x)}))}
                    style={{flex:1,minWidth:160,background:"#111f14",border:"1px solid rgba(245,158,11,0.3)",borderRadius:6,padding:"6px 8px",color:"#e2e8f0",fontSize:12,fontFamily:"inherit"}}>
                    <option value="" style={{background:"#111f14",color:"#94a3b8"}}>— Ignorar —</option>
                    {SISTEMAS.map(s=><option key={s} value={s} style={{background:"#111f14",color:"#e2e8f0"}}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          <button onClick={()=>{onResult(draft);setRev(false);}}
            style={{width:"100%",padding:"10px",background:"linear-gradient(135deg,#0ea5e9,#0284c7)",border:"none",borderRadius:8,color:"white",fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4}}>
            📊 Confirmar e adicionar à Tabela Clínica
          </button>
        </div>
      )}
      {draft?.error && <div style={{color:"#f87171",fontSize:13}}>{draft.error}</div>}
    </div>
  );
}

// ── EvolucaoEditor ────────────────────────────────────────────────────────────
// ── Helpers de evolução ───────────────────────────────────────────────────────
const v = (s) => s?.trim() || "";

function TA({ fieldRef, defaultValue, sugestao, placeholder, rows=2, isAntigo=false, fieldName, onBlurSave }) {
  const T=useTheme();
  return (
    <div style={{position:"relative"}}>
      <textarea ref={fieldRef} defaultValue={defaultValue||""} placeholder={placeholder||""} rows={rows}
        style={{width:"100%",
          background: isAntigo ? T.bgTableGroup : T.bgInput,
          border: `1px solid ${isAntigo?T.borderStrong:T.border}`,
          borderRadius:8, padding:"8px 10px",
          color: isAntigo ? T.text3 : T.text1,
          fontSize:12, resize:"vertical", fontFamily:"inherit", boxSizing:"border-box", lineHeight:1.5}}
        onFocus={e=>e.target.style.borderColor="rgba(56,189,248,0.4)"}
        onBlur={e=>{
          e.target.style.borderColor = isAntigo ? T.borderStrong : T.border;
          if (onBlurSave && fieldName) onBlurSave(fieldName, e.target.value);
        }}/>
      {isAntigo && (
        <span style={{position:"absolute",bottom:4,right:6,fontSize:9,color:"#475569",fontFamily:mono,letterSpacing:0.5,pointerEvents:"none"}}>
          dia ant.
        </span>
      )}
    </div>
  );
}
function FLabel({ children }) {
  return <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>{children}</div>;
}
function Row({ children }) {
  return <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>{children}</div>;
}
function Col({ children, flex=1, min=120 }) {
  return <div style={{flex,minWidth:min}}>{children}</div>;
}

// Bloco de sistema com preview corrido + botão copiar individual
function SysBlock({ sigla, label, color="#38bdf8", preview, children }) {
  const [open,     setOpen]     = useState(true);
  const [copiado,  setCopiado]  = useState(false);

  const copiarBloco = () => {
    if (!preview?.trim()) return;
    navigator.clipboard.writeText(preview.trim());
    setCopiado(true);
    setTimeout(()=>setCopiado(false), 2000);
  };

  return (
    <div style={{marginBottom:10,border:`1px solid ${open?"rgba(255,255,255,0.09)":"rgba(255,255,255,0.05)"}`,borderRadius:10,overflow:"hidden"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",background:"rgba(255,255,255,0.03)"}}>
        <button onClick={()=>setOpen(o=>!o)} style={{
          flex:1,display:"flex",alignItems:"center",gap:8,padding:"10px 14px",
          background:"none",border:"none",cursor:"pointer",textAlign:"left",
        }}>
          <div style={{width:3,height:16,background:color,borderRadius:2,flexShrink:0}}/>
          <span style={{fontSize:12,fontWeight:700,color,fontFamily:mono,letterSpacing:1.5}}>{sigla}</span>
          <span style={{fontSize:12,color:"#475569",fontWeight:400}}>{label}</span>
          <span style={{marginLeft:"auto",color:"#475569",fontSize:11}}>{open?"▲":"▼"}</span>
        </button>
        {/* Botão copiar do bloco */}
        <button onClick={copiarBloco} disabled={!preview?.trim()} style={{
          margin:"6px 10px", padding:"4px 12px", borderRadius:6, fontSize:11, fontWeight:600,
          background: copiado?"rgba(56,189,248,0.15)":"rgba(255,255,255,0.05)",
          border:`1px solid ${copiado?"#38bdf8":preview?.trim()?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.05)"}`,
          color: copiado?"#38bdf8":preview?.trim()?"#94a3b8":"#334155",
          cursor: preview?.trim()?"pointer":"default", whiteSpace:"nowrap", fontFamily:"inherit",
        }}>
          {copiado ? "✓ Copiado" : "📋 Copiar"}
        </button>
      </div>

      {open && (
        <div style={{borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          {/* Campos de entrada */}
          <div style={{padding:"12px 14px"}}>{children}</div>

          {/* Preview do texto corrido */}
          {preview?.trim() && (
            <div style={{
              margin:"0 14px 14px",padding:"10px 12px",
              background:"rgba(0,0,0,0.25)",border:"1px solid rgba(255,255,255,0.06)",
              borderRadius:8,
            }}>
              <div style={{fontSize:9,color:"#334155",fontFamily:mono,letterSpacing:1.5,marginBottom:6}}>PRÉ-VISUALIZAÇÃO — texto que será colado no Tasy</div>
              <pre style={{margin:0,fontSize:12,color:"#94a3b8",fontFamily:"inherit",whiteSpace:"pre-wrap",lineHeight:1.6}}>{preview.trim()}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ── Drogas Personalizadas — configuração no Settings ─────────────────────────
const MODOS_LABELS = {
  "mcg_kg_min":"mcg/kg/min", "mcg_kg_h":"mcg/kg/h",
  "mg_kg_h":"mg/kg/h", "mg_kg_min":"mg/kg/min", "mg_h":"mg/h", "mg_min":"mg/min", "mcg_min":"mcg/min",
  "ui_min":"UI/min", "ui_h":"UI/h", "ui_kg_h":"UI/kg/h", "ui_kg_min":"UI/kg/min",
};

function DrogasCustomConfig({ config, onChange }) {
  const mono = "'DM Mono',monospace";
  const T = useTheme();
  const [show, setShow] = useState(false);
  const [showPadrao,setShowPadrao]=useState(false);
  const [form, setForm] = useState({
    label:"", grupo:"vasoativa", diluicaoDesc:"", concMcgML:"",
    modoCalcDefault:"mcg_kg_min", max:"", unidadeLabel:""
  });

  const custom = config?.drogasCustom || [];

  const addDroga = () => {
    if (!form.label.trim() || !form.concMcgML) return;
    const key = "custom_" + form.label.trim().toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
    const nova = {
      ...form,
      key,
      concMcgML: parseFloat(form.concMcgML),
      max: parseFloat(form.max)||null,
      modoCalcOpcoes: [form.modoCalcDefault],
      unidadeLabel: form.unidadeLabel || MODOS_LABELS[form.modoCalcDefault] || "",
    };
    onChange({...config, drogasCustom: [...custom, nova]});
    setForm({label:"", grupo:"vasoativa", diluicaoDesc:"", concMcgML:"", modoCalcDefault:"mcg_kg_min", max:"", unidadeLabel:""});
    setShow(false);
  };

  const remover = (key) => onChange({...config, drogasCustom: custom.filter(d=>d.key!==key)});
  const atualizarPadrao=(key,campo,valor)=>onChange({...config,drogasPadrao:{...(config?.drogasPadrao||{}),[key]:{...(config?.drogasPadrao?.[key]||{}),[campo]:valor}}});

  return (
    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,marginBottom:20,overflow:"hidden"}}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
        <div><div style={{fontSize:11,color:T.accent,fontFamily:mono,letterSpacing:2}}>SOLUÇÕES PADRÃO E CÁLCULO DE DOSE</div><div style={{fontSize:11,color:T.text3,marginTop:2}}>Edite nome, solução, concentração, unidade de dose e peso usado no cálculo.</div></div>
        <button onClick={()=>setShowPadrao(v=>!v)} style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${T.accentBorder}`,background:T.accentBg,color:T.accent,cursor:"pointer",fontSize:11}}>{showPadrao?"Fechar":"Editar soluções"}</button>
      </div>
      {showPadrao&&<div style={{padding:"8px 12px",borderBottom:`1px solid ${T.border}`,display:"grid",gap:6}}>
        {Object.keys(DROGAS_PROTOCOLO).map(key=>{const d=getDrogaConfig(key,config);const usaPeso=String(d.modoCalcDefault||"").includes("_kg_");return <details key={key} style={{border:`1px solid ${T.border}`,borderRadius:8,background:T.bgCard}}>
          <summary style={{padding:"8px 10px",cursor:"pointer",fontSize:11,fontWeight:700,color:T.text1}}>{d.label} <span style={{fontWeight:400,color:T.text3}}>· {MODOS_LABELS[d.modoCalcDefault]||d.modoCalcDefault}{usaPeso?` · peso ${d.pesoBase==="predito"?"predito":"real"}`:""}</span></summary>
          <div style={{padding:"0 10px 10px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:7}}>
            <label style={{fontSize:9,color:T.text3,fontFamily:mono}}>NOME<input value={d.label||""} onChange={e=>atualizarPadrao(key,"label",e.target.value)} style={{display:"block",width:"100%",marginTop:3,padding:"6px 8px",borderRadius:6,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1}}/></label>
            <label style={{fontSize:9,color:T.text3,fontFamily:mono,gridColumn:"span 2"}}>SOLUÇÃO / DILUIÇÃO<input value={d.diluicaoDesc||""} onChange={e=>atualizarPadrao(key,"diluicaoDesc",e.target.value)} style={{display:"block",width:"100%",marginTop:3,padding:"6px 8px",borderRadius:6,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1}}/></label>
            <label style={{fontSize:9,color:T.text3,fontFamily:mono}}>CONCENTRAÇÃO ({String(d.modoCalcDefault).startsWith("ui_")?"UI/mL":"mcg/mL"})<input type="number" value={String(d.modoCalcDefault).startsWith("ui_")?(d.concUIML??""):(d.concMcgML??"")} onChange={e=>atualizarPadrao(key,String(d.modoCalcDefault).startsWith("ui_")?"concUIML":"concMcgML",e.target.value)} style={{display:"block",width:"100%",marginTop:3,padding:"6px 8px",borderRadius:6,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1}}/></label>
            <label style={{fontSize:9,color:T.text3,fontFamily:mono}}>CÁLCULO<select value={d.modoCalcDefault||""} onChange={e=>atualizarPadrao(key,"modoCalcDefault",e.target.value)} style={{display:"block",width:"100%",marginTop:3,padding:"6px 8px",borderRadius:6,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1}}>{Object.entries(MODOS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
            <label style={{fontSize:9,color:T.text3,fontFamily:mono}}>PESO PARA O CÁLCULO<select value={d.pesoBase||"real"} disabled={!usaPeso} onChange={e=>atualizarPadrao(key,"pesoBase",e.target.value)} style={{display:"block",width:"100%",marginTop:3,padding:"6px 8px",borderRadius:6,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1,opacity:usaPeso?1:.5}}><option value="real">Peso real</option><option value="predito">Peso predito</option></select></label>
          </div>
        </details>})}
      </div>}
      <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",
        background:"rgba(255,255,255,0.02)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,color:"#f87171",fontFamily:mono,letterSpacing:2}}>DROGAS PERSONALIZADAS</div>
          <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Adicione drogas com sua diluição e concentração</div>
        </div>
        <button onClick={()=>setShow(s=>!s)}
          style={{padding:"5px 12px",background:show?"rgba(248,113,113,0.15)":"rgba(248,113,113,0.08)",
            border:"1px solid rgba(248,113,113,0.3)",borderRadius:7,color:"#f87171",cursor:"pointer",fontSize:12}}>
          {show?"✕ Fechar":"+ Nova droga"}
        </button>
      </div>

      {show&&(
        <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(248,113,113,0.03)"}}>
          <div style={{fontSize:10,color:"#f87171",fontFamily:mono,letterSpacing:1,marginBottom:10}}>NOVA DROGA</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            <div style={{flex:2,minWidth:140}}>
              <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>NOME *</div>
              <input value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))}
                placeholder="Ex: Adrenalina"
                style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(248,113,113,0.25)",
                  borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
            </div>
            <div style={{flex:1,minWidth:100}}>
              <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>GRUPO</div>
              <select value={form.grupo} onChange={e=>setForm(f=>({...f,grupo:e.target.value}))}
                style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(248,113,113,0.25)",
                  borderRadius:7,padding:"7px 8px",color:"#e2e8f0",fontSize:12}}>
                <option value="vasoativa">Vasoativa</option>
                <option value="sedacao">Sedação</option>
                <option value="analgesia">Analgesia</option>
              </select>
            </div>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>DILUIÇÃO (descrição)</div>
            <input value={form.diluicaoDesc} onChange={e=>setForm(f=>({...f,diluicaoDesc:e.target.value}))}
              placeholder="Ex: 16 amp (16 mg) em SG5% 234 mL → 250 mL"
              style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(248,113,113,0.25)",
                borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            <div style={{flex:1,minWidth:100}}>
              <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>CONCENTRAÇÃO (mcg/mL) *</div>
              <input type="number" value={form.concMcgML} onChange={e=>setForm(f=>({...f,concMcgML:e.target.value}))}
                placeholder="Ex: 64"
                style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(248,113,113,0.25)",
                  borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
            </div>
            <div style={{flex:1,minWidth:120}}>
              <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>MODO DE CÁLCULO</div>
              <select value={form.modoCalcDefault} onChange={e=>setForm(f=>({...f,modoCalcDefault:e.target.value,unidadeLabel:MODOS_LABELS[e.target.value]||""}))}
                style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(248,113,113,0.25)",
                  borderRadius:7,padding:"7px 8px",color:"#e2e8f0",fontSize:12}}>
                {Object.entries(MODOS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={{flex:1,minWidth:80}}>
              <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>DOSE MÁX.</div>
              <input type="number" value={form.max} onChange={e=>setForm(f=>({...f,max:e.target.value}))}
                placeholder="Ex: 1"
                style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(248,113,113,0.25)",
                  borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
            </div>
          </div>
          <div style={{fontSize:10,color:"#475569",marginBottom:10}}>
            💡 Concentração em <strong style={{color:"#f87171"}}>mcg/mL</strong> — converta mg→mcg multiplicando por 1000. Ex: 64 mcg/mL = 0,064 mg/mL
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={addDroga} disabled={!form.label||!form.concMcgML}
              style={{padding:"7px 16px",background:form.label&&form.concMcgML?"rgba(248,113,113,0.2)":"rgba(255,255,255,0.04)",
                border:"1px solid rgba(248,113,113,0.3)",borderRadius:7,color:form.label&&form.concMcgML?"#f87171":"#475569",
                cursor:form.label&&form.concMcgML?"pointer":"default",fontSize:12,fontWeight:700}}>
              ✓ Salvar
            </button>
            <button onClick={()=>setShow(false)}
              style={{padding:"7px 12px",background:"none",border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:7,color:"#64748b",cursor:"pointer",fontSize:12}}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List of custom drugs */}
      <div>
        {custom.length===0&&!show&&(
          <div style={{padding:"12px 16px",fontSize:11,color:"#334155"}}>
            Nenhuma droga personalizada. Drogas padrão disponíveis: {Object.values(DROGAS_PROTOCOLO).map(d=>d.label).join(", ")}
          </div>
        )}
        {custom.map(d=>(
          <div key={d.key} style={{display:"flex",alignItems:"center",padding:"10px 16px",
            borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <span style={{fontSize:10,color:"#f87171",fontFamily:mono,marginRight:8}}>★</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{d.label}</div>
              <div style={{fontSize:10,color:"#64748b",fontFamily:mono}}>
                {d.grupo} · {d.diluicaoDesc||"—"} · {d.concMcgML} mcg/mL · {MODOS_LABELS[d.modoCalcDefault]||d.modoCalcDefault}
                {d.max ? ` · máx ${d.max}` : ""}
              </div>
            </div>
            <button onClick={()=>remover(d.key)}
              style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:14}}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── ConfigPanel ───────────────────────────────────────────────────────────────
const DISP_CONFIG_ITEMS = [
  { key:"alertaCVC",    label:"Cateter Venoso Central",    icone:"🩸" },
  { key:"alertaPAI",    label:"Cateter Arterial (PAI)",    icone:"📈" },
  { key:"alertaSVD",    label:"Sonda Vesical de Demora",   icone:"💧" },
  { key:"alertaDialise",label:"Cateter de Diálise",        icone:"🔴" },
  { key:"alertaTOT",    label:"Tubo Orotraqueal (TOT)",    icone:"🫁" },
  { key:"alertaTQT",    label:"Traqueostomia (TQT)",       icone:"🫁" },
  { key:"alertaSNG",    label:"Sonda Naso/Nasoenteral",    icone:"🔧" },
  { key:"alertaDreno",  label:"Dreno",                     icone:"🏥" },
];

function ConfigPanel({ config, onChange, onVoltar, onAbrirPesquisa, utiAtiva, onSyncSbari, sbariSyncing=false }) {
  const upd = (key, val) => onChange({...config, [key]: parseInt(val)||0});
  const sbariRaw=config.sbariLinks?.[utiAtiva?.id];
  const sbariLinks=Array.isArray(sbariRaw)?sbariRaw:(sbariRaw?[{id:"legacy",label:"SBARI",url:sbariRaw}]:[]);
  const alterarSbari=(links)=>onChange({...config,sbariLinks:{...(config.sbariLinks||{}),[utiAtiva?.id]:links}});
  const [showAddDieta, setShowAddDieta] = useState(false);
  const [novaDieta, setNovaDieta] = useState({ nome:"", tipo:"enteral", kcalML:"", ptnML:"", choML:"", lipML:"" });
  const catalogo = getDietasCatalogo(config);

  const salvarNovaDieta = () => {
    if (!novaDieta.nome.trim() || !novaDieta.kcalML) return;
    const id = `custom_${Date.now()}`;
    const custom = [...(config.dietasCatalogo||[]), {
      ...novaDieta, id,
      kcalML: parseFloat(novaDieta.kcalML)||0,
      ptnML:  parseFloat(novaDieta.ptnML)||0,
      choML:  parseFloat(novaDieta.choML)||0,
      lipML:  parseFloat(novaDieta.lipML)||0,
    }];
    onChange({...config, dietasCatalogo: custom});
    setNovaDieta({ nome:"", tipo:"enteral", kcalML:"", ptnML:"", choML:"", lipML:"" });
    setShowAddDieta(false);
  };

  const removerDietaCustom = (id) => {
    onChange({...config, dietasCatalogo: (config.dietasCatalogo||[]).filter(d=>d.id!==id)});
  };

  return (
    <div className="config-panel" style={{maxWidth:680}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={onVoltar} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#64748b",cursor:"pointer",fontSize:12,padding:"6px 12px"}}>← Voltar</button>
        <div>
          <div style={{fontSize:15,fontWeight:700}}>⚙️ Configurações</div>
          <div style={{fontSize:12,color:"#64748b"}}>Dispositivos, drogas e catálogo de dietas</div>
        </div>
      </div>

      <button onClick={onAbrirPesquisa} style={{width:"100%",display:"flex",alignItems:"center",gap:14,textAlign:"left",padding:"14px 16px",marginBottom:20,background:"rgba(52,211,153,.07)",border:"1px solid rgba(52,211,153,.25)",borderRadius:12,color:"#cbd5e1",cursor:"pointer"}}>
        <span style={{fontSize:24}}>📊</span>
        <span style={{flex:1}}>
          <span style={{display:"block",fontSize:13,fontWeight:800,color:"#34d399"}}>Análise de dados</span>
          <span style={{display:"block",fontSize:11,color:"#64748b",marginTop:3}}>Coorte anonimizada, indicadores e exportação paciente-dia</span>
        </span>
        <span style={{fontSize:18,color:"#34d399"}}>→</span>
      </button>

      <div style={{padding:"14px 16px",marginBottom:20,background:"rgba(56,189,248,.06)",border:"1px solid rgba(56,189,248,.23)",borderRadius:12}}>
        <div style={{fontSize:11,color:"#38bdf8",fontFamily:mono,letterSpacing:1.5,fontWeight:700}}>SBARI — {utiAtiva?.nome||"UTI"}</div>
        <div style={{fontSize:11,color:"#64748b",margin:"4px 0 10px"}}>O link é específico desta UTI. A sincronização preserva integralmente pacientes que continuam no documento.</div>
        <div style={{display:"grid",gap:7}}>{sbariLinks.map((item,i)=><div key={item.id||i} style={{display:"flex",gap:7,alignItems:"stretch",flexWrap:"wrap"}}>
          <input value={item.label||""} onChange={e=>alterarSbari(sbariLinks.map((x,j)=>j===i?{...x,label:e.target.value}:x))} placeholder="Nome (ex.: Frente)" style={{width:145,background:"rgba(255,255,255,.05)",border:"1px solid rgba(56,189,248,.25)",borderRadius:7,padding:"8px 10px",color:"inherit",fontSize:11}}/>
          <input value={item.url||""} onChange={e=>alterarSbari(sbariLinks.map((x,j)=>j===i?{...x,url:e.target.value}:x))} placeholder="https://docs.google.com/document/d/…" style={{flex:1,minWidth:260,background:"rgba(255,255,255,.05)",border:"1px solid rgba(56,189,248,.25)",borderRadius:7,padding:"8px 10px",color:"inherit",fontSize:11}}/>
          <button onClick={()=>alterarSbari(sbariLinks.filter((_,j)=>j!==i))} title="Remover este link" style={{width:34,borderRadius:7,border:"1px solid rgba(248,113,113,.3)",background:"transparent",color:"#f87171",cursor:"pointer"}}>✕</button>
        </div>)}</div>
        <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
          <button onClick={()=>alterarSbari([...sbariLinks,{id:`sbari-${Date.now()}`,label:sbariLinks.length?"Fundo":"Frente",url:""}])} style={{padding:"7px 10px",borderRadius:7,border:"1px solid rgba(56,189,248,.25)",background:"transparent",color:"#38bdf8",cursor:"pointer",fontSize:11}}>+ Adicionar link</button>
          <button disabled={sbariSyncing||!sbariLinks.some(x=>x.url)} onClick={()=>onSyncSbari?.()} style={{padding:"8px 13px",borderRadius:7,border:"1px solid rgba(56,189,248,.35)",background:"rgba(56,189,248,.12)",color:"#38bdf8",fontWeight:800,cursor:sbariSyncing?"wait":"pointer"}}>{sbariSyncing?"Atualizando…":"↻ Atualizar todos os leitos"}</button>
        </div>
        {config.sbariStatus?.[utiAtiva?.id]&&<div style={{marginTop:9,fontSize:10,color:"#64748b"}}>Última sincronização: {new Date(config.sbariStatus[utiAtiva.id].at).toLocaleString("pt-BR")} · {config.sbariStatus[utiAtiva.id].preservados} preservado(s), {config.sbariStatus[utiAtiva.id].novos} novo(s), {config.sbariStatus[utiAtiva.id].arquivados} arquivado(s)</div>}
      </div>

      {/* Alertas de dispositivos */}
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,overflow:"hidden",marginBottom:20}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.02)"}}>
          <div style={{fontSize:11,color:"#38bdf8",fontFamily:mono,letterSpacing:2}}>ALERTAS DE DISPOSITIVOS (dias)</div>
          <div style={{fontSize:11,color:"#64748b",marginTop:2}}>O dispositivo ficará vermelho ⚠️ após este número de dias</div>
        </div>
        {DISP_CONFIG_ITEMS.map(({key,label,icone})=>(
          <div key={key} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <span style={{fontSize:18,width:24}}>{icone}</span>
            <div style={{flex:1,fontSize:13,color:"#cbd5e1"}}>{label}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <button onClick={()=>upd(key,Math.max(1,(config[key]||7)-1))} style={{width:28,height:28,borderRadius:6,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#64748b",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
              <div style={{textAlign:"center",minWidth:60}}>
                <div style={{fontSize:18,fontWeight:700,color:"#38bdf8",fontFamily:mono}}>{config[key]||7}</div>
                <div style={{fontSize:10,color:"#475569",fontFamily:mono}}>{(config[key]||7)===99?"sem limite":"dias"}</div>
              </div>
              <button onClick={()=>upd(key,Math.min(99,(config[key]||7)+1))} style={{width:28,height:28,borderRadius:6,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#64748b",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
            {config[key]===99 && <span style={{fontSize:10,color:"#475569",fontFamily:mono}}>∞</span>}
          </div>
        ))}
      </div>

      <div style={{marginBottom:20,padding:"10px 14px",background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,fontSize:12,color:"#fcd34d"}}>
        💡 Dica: para dispositivos sem limite de troca (TOT, TQT), deixe em 99 dias — o alerta não será disparado.
      </div>

      {/* Catálogo de drogas personalizadas */}
      <DrogasCustomConfig config={config} onChange={onChange}/>

      {/* Catálogo de dietas */}
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.02)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:"#fb923c",fontFamily:mono,letterSpacing:2}}>CATÁLOGO DE DIETAS</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Fórmulas disponíveis para seleção nos pacientes</div>
          </div>
          <button onClick={()=>setShowAddDieta(s=>!s)} style={{padding:"5px 12px",background:showAddDieta?"rgba(167,139,250,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${showAddDieta?"#a78bfa":"rgba(255,255,255,0.1)"}`,borderRadius:7,color:showAddDieta?"#c4b5fd":"#64748b",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            {showAddDieta?"✕ Fechar":"+ Nova dieta"}
          </button>
        </div>

        {/* Formulário de nova dieta */}
        {showAddDieta && (
          <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(167,139,250,0.04)"}}>
            <div style={{fontSize:10,color:"#c4b5fd",fontFamily:mono,letterSpacing:1,marginBottom:10}}>NOVA DIETA — valores por mL da fórmula pronta</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
              <div style={{flex:2,minWidth:160}}>
                <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>NOME *</div>
                <input value={novaDieta.nome} onChange={e=>setNovaDieta(n=>({...n,nome:e.target.value}))}
                  placeholder="Ex: Peptamen AF 1.5"
                  style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:6,padding:"7px 9px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div style={{flex:1,minWidth:100}}>
                <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>TIPO</div>
                <select value={novaDieta.tipo} onChange={e=>setNovaDieta(n=>({...n,tipo:e.target.value}))}
                  style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:6,padding:"7px 9px",color:"#e2e8f0",fontSize:12,fontFamily:"inherit"}}>
                  <option value="enteral" style={{background:"#0c1a10"}}>Enteral</option>
                  <option value="parenteral" style={{background:"#0c1a10"}}>Parenteral</option>
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
              {[["kcalML","kcal/mL *","1.5"],["ptnML","Ptn g/mL","0.056"],["choML","CHO g/mL","0.130"],["lipML","Lip g/mL","0.050"]].map(([k,lbl,ph])=>(
                <div key={k}>
                  <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>{lbl}</div>
                  <input value={novaDieta[k]} onChange={e=>setNovaDieta(n=>({...n,[k]:e.target.value}))}
                    type="number" step="0.001" placeholder={ph}
                    style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:6,padding:"7px 8px",color:"#e2e8f0",fontSize:12,fontFamily:mono,boxSizing:"border-box"}}/>
                </div>
              ))}
            </div>
            <div style={{fontSize:10,color:"#475569",marginBottom:8}}>* Insira os valores <strong>por mL</strong> da fórmula. Ex: kcal/mL = 1.5 significa que cada mL tem 1,5 kcal. Ptn/mL = 0.056 significa 5,6 g de proteína por 100 mL.</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={salvarNovaDieta} disabled={!novaDieta.nome||!novaDieta.kcalML}
                style={{padding:"7px 16px",background:novaDieta.nome&&novaDieta.kcalML?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.04)",border:`1px solid ${novaDieta.nome&&novaDieta.kcalML?"#a78bfa":"rgba(255,255,255,0.1)"}`,borderRadius:6,color:novaDieta.nome&&novaDieta.kcalML?"#c4b5fd":"#475569",fontWeight:700,fontSize:12,cursor:novaDieta.nome&&novaDieta.kcalML?"pointer":"default",fontFamily:"inherit"}}>
                ✓ Salvar
              </button>
              <button onClick={()=>setShowAddDieta(false)} style={{padding:"7px 12px",background:"none",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,color:"#64748b",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista: padrão + custom */}
        <div style={{maxHeight:320,overflowY:"auto"}}>
          {/* Custom primeiro */}
          {(config.dietasCatalogo||[]).map(d=>(
            <div key={d.id} style={{display:"flex",alignItems:"center",padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",background:"rgba(167,139,250,0.04)"}}>
              <span style={{fontSize:10,color:"#c4b5fd",fontFamily:mono,marginRight:8,flexShrink:0}}>★</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{d.nome}</div>
                <div style={{fontSize:10,color:"#64748b",fontFamily:mono}}>{d.tipo} · {d.kcalML} kcal/mL · {(d.ptnML*100).toFixed(1)} g ptn/100mL</div>
              </div>
              <button onClick={()=>removerDietaCustom(d.id)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:12,padding:"0 4px"}} title="Remover">✕</button>
            </div>
          ))}
          {/* Padrões */}
          {DIETAS_DEFAULT.map(d=>(
            <div key={d.id} style={{display:"flex",alignItems:"center",padding:"9px 16px",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:"#cbd5e1",lineHeight:1.4}}>{d.nome}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:2}}>
                  {d.comercial && <span style={{fontSize:10,color:"#a78bfa",fontFamily:mono}}>↳ {d.comercial}</span>}
                  <span style={{fontSize:10,color:"#475569",fontFamily:mono}}>{d.tipo}{d.kcalML>0?` · ${d.kcalML} kcal/mL · ${(d.ptnML*100).toFixed(1)} g ptn/100mL`:""}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ── Fórmulas TFG ─────────────────────────────────────────────────────────────
// CKD-EPI 2021 (race-free) — Inker et al. NEJM 2021
function calcCKDEPI(cr, idadeA, sexo) {
  if (!cr || !idadeA) return null;
  const Scr = parseFloat(cr);
  const age  = parseFloat(idadeA);
  if (isNaN(Scr) || isNaN(age) || Scr <= 0 || age <= 0) return null;
  const k = sexo === "F" ? 0.7  : 0.9;
  const a = sexo === "F" ? -0.241 : -0.302;
  const sex_mult = sexo === "F" ? 1.012 : 1.0;
  const ratio = Scr / k;
  const egfr = 142
    * Math.pow(Math.min(ratio, 1), a)
    * Math.pow(Math.max(ratio, 1), -1.200)
    * Math.pow(0.9938, age)
    * sex_mult;
  return Math.round(egfr);
}

// Cockcroft-Gault — em mL/min
function calcCockcroftGault(cr, idadeA, peso, sexo) {
  if (!cr || !idadeA || !peso) return null;
  const Scr = parseFloat(cr);
  const age  = parseFloat(idadeA);
  const wt   = parseFloat(peso);
  if (isNaN(Scr) || isNaN(age) || isNaN(wt) || Scr <= 0) return null;
  const cg = ((140 - age) * wt) / (72 * Scr) * (sexo === "F" ? 0.85 : 1);
  return Math.round(cg);
}

// Kinetic eGFR — Chen et al. (PLOS ONE 2013, doi:10.1371/journal.pone.0225601)
// Eq A: KeGFR = (SSPCr × CrCl / MeanPCr) × (1 - 24×ΔPCr / (ΔTime_h × MaxΔPCr/day))
// Eq B: MaxΔPCr = SSPCr × CrCl / TBW
// SSPCr = creatinina estável de referência (usamos Cr do dia anterior estável = cr1)
// CrCl  = Cockcroft-Gault com SSPCr
// MeanPCr = (cr1 + cr2) / 2
// ΔPCr  = cr2 - cr1  (positivo = piorando, negativo = melhorando)
// TBW   = 0.6 × peso (kg)  [total body water]
// ΔTime = 24h entre dias consecutivos
function calcKeGFR(cr1, cr2, peso, sexo, idadeA, deltaTh = 24) {
  if (!cr1 || !cr2 || !peso || !idadeA) return null;
  const C1 = parseFloat(cr1), C2 = parseFloat(cr2);
  const wt = parseFloat(peso), age = parseFloat(idadeA);
  if (isNaN(C1)||isNaN(C2)||isNaN(wt)||isNaN(age)||C1<=0||C2<=0||wt<=0) return null;
  if (Math.abs(C1-C2) < 0.05) return null; // variação insuficiente

  const SSPCr = C1;                                       // Cr estável = dia anterior
  const TBW   = 0.6 * wt;                                // L
  const CrCl  = calcCockcroftGault(SSPCr, age, wt, sexo); // mL/min (com SSPCr)
  if (!CrCl || CrCl <= 0) return null;

  const MeanPCr    = (C1 + C2) / 2;
  const DeltaPCr   = C2 - C1;                            // positivo = subindo
  const MaxDeltaPCr = (SSPCr * CrCl) / TBW;              // Eq B: mL/min / L = mg/dL/h·correction
  // MaxΔPCr/day = MaxΔPCr × 24 (mg/dL por 24h)
  const MaxDeltaPCr_per_day = MaxDeltaPCr;                // já é por unidade de tempo consistente

  // Eq A
  const kegfr = (SSPCr * CrCl / MeanPCr) *
                (1 - (24 * DeltaPCr) / (deltaTh * MaxDeltaPCr_per_day));

  if (!isFinite(kegfr) || kegfr < 0) return null;
  return Math.round(kegfr);
}

// Cor por faixa TFG
function corTFG(v) {
  if (v === null) return "#64748b";
  if (v >= 90) return "#34d399";
  if (v >= 60) return "#a3e635";
  if (v >= 45) return "#fbbf24";
  if (v >= 30) return "#fb923c";
  if (v >= 15) return "#f87171";
  return "#ef4444";
}

// Estágio CKD
function stageCKD(v) {
  if (v === null) return "";
  if (v >= 90) return "G1";
  if (v >= 60) return "G2";
  if (v >= 45) return "G3a";
  if (v >= 30) return "G3b";
  if (v >= 15) return "G4";
  return "G5";
}


// ── TabelaClinica ─────────────────────────────────────────────────────────────
const GRUPOS_LAB = [
  { grupo:"🩸 Hematológico", params:[
    {key:"hb",    label:"Hemoglobina",      unit:"g/dL"},
    {key:"ht",    label:"Hematócrito",      unit:"%"},
    {key:"leuco", label:"Leucócitos",       unit:"mil/mm³"},
    {key:"neut",  label:"Neutrófilos",      unit:"%"},
    {key:"bast",  label:"Bastões",          unit:"%"},
    {key:"linf",  label:"Linfócitos",       unit:"%"},
    {key:"plaq",  label:"Plaquetas",        unit:"mil/mm³"},
    {key:"rni",   label:"RNI",              unit:""},
    {key:"ttpa",  label:"TTPA",             unit:"s"},
    {key:"fibri", label:"Fibrinogênio",     unit:"mg/dL"},
  ]},
  { grupo:"🫘 Renal / Metabólico", params:[
    {key:"cr",    label:"Creatinina",       unit:"mg/dL"},
    {key:"ur",    label:"Ureia",            unit:"mg/dL"},
    {key:"na",    label:"Sódio",            unit:"mEq/L"},
    {key:"k",     label:"Potássio",         unit:"mEq/L"},
    {key:"mg",    label:"Magnésio",         unit:"mg/dL"},
    {key:"cai",   label:"Cálcio iônico",    unit:"mmol/L"},
    {key:"p",     label:"Fósforo",          unit:"mg/dL"},
  ]},
  { grupo:"❤️ Cardiovascular", params:[
    {key:"bnp",   label:"BNP",              unit:"pg/mL"},
    {key:"ntpro", label:"NT-proBNP",        unit:"pg/mL"},
    {key:"lact",  label:"Lactato",          unit:"mmol/L"},
  ]},
  /* Troponina fica em painel separado (múltiplas dosagens/dia) */
  { grupo:"🫁 Respiratório", params:[
    {key:"po2",   label:"pO2",              unit:"mmHg"},
    {key:"pco2",  label:"pCO2",             unit:"mmHg"},
  ]},
  /* Gasometria fica em painel separado */
  { grupo:"🫀 TGI / Hepático", params:[
    {key:"tgo",   label:"TGO (AST)",        unit:"U/L"},
    {key:"tgp",   label:"TGP (ALT)",        unit:"U/L"},
    {key:"bttot", label:"Bili. Total",      unit:"mg/dL"},
    {key:"btdir", label:"Bili. Direta",     unit:"mg/dL"},
    {key:"btind", label:"Bili. Indireta",   unit:"mg/dL"},
    {key:"falc",  label:"Fosf. Alcalina",   unit:"U/L"},
    {key:"ggt",   label:"Gama-GT",          unit:"U/L"},
    {key:"alb",   label:"Albumina",         unit:"g/dL"},
  ]},
];

// Controles 24h — tabela separada com horários
// Drenos, SNG e evacuações são OPCIONAIS — adicionados dinamicamente com nome personalizado
const GRUPOS_CONTROLES = [
  { grupo:"📡 Monitorização Geral", params:[
    {key:"c24_temp",  label:"Temperatura (mín/máx)", unit:"°C"},
    {key:"c24_fc",    label:"FC (mín/máx)",           unit:"bpm"},
    {key:"c24_fr",    label:"FR (mín/máx)",           unit:"irpm"},
    {key:"c24_pas",   label:"PAS (mín/máx)",          unit:"mmHg"},
    {key:"c24_pad",   label:"PAD (mín/máx)",          unit:"mmHg"},
    {key:"c24_pam",   label:"PAM (mín/máx)",          unit:"mmHg"},
    {key:"c24_sat",   label:"SpO2 (mín/máx)",         unit:"%"},
    {key:"c24_dextro",label:"Dextro (mín/máx)",       unit:"mg/dL"},
  ]},
  { grupo:"🧠 Neurológico", params:[
    {key:"c24_pic",   label:"PIC (mín/máx)",          unit:"mmHg"},
    {key:"c24_ppc",   label:"PPC (mín/máx)",          unit:"mmHg"},
    {key:"c24_dve",   label:"Líquor drenado pela DVE (total)", unit:"mL"},
  ], opcional:true},
  { grupo:"📥 Ganhos", params:[
    {key:"c24_diet_vol",          label:"Vol. Dieta recebida",       unit:"mL"},
    {key:"c24_diet_pause",        label:"Interrupção da dieta",         unit:"h", opcional:true},
    {key:"c24_diet_pause_motivo", label:"Motivo da interrupção",        unit:"texto", opcional:true},
    {key:"c24_propofol_vol",      label:"Propofol (volume)",            unit:"mL", opcional:true},
  ]},
  { grupo:"📤 Perdas", params:[
    {key:"c24_diur",  label:"Diurese",                unit:"mL"},
    {key:"c24_hd",    label:"Hemodiálise / CRRT (UF)",unit:"mL"},
  ]},
  { grupo:"⚖️ Balanço", params:[
    {key:"c24_bh",    label:"Balanço Hídrico 24h",    unit:"mL"},
    {key:"c24_bh_ac", label:"Balanço Acumulado",      unit:"mL"},
  ]},
  // Drenos/SNG/Evac: adicionados dinamicamente como _dreno_[nome]
  // Custom: adicionados dinamicamente como _ctrl_[key]
];

const TODOS_PARAMS = [
  ...GRUPOS_LAB.flatMap(g=>g.params),
  ...GRUPOS_CONTROLES.flatMap(g=>g.params),
];

// Abreviações para a evolução e formatação especial
const ABREV = {
  hb:"Hb", ht:"Ht", leuco:"Leuco", neut:"Neut", bast:"Bast", linf:"Linf",
  plaq:"Plaq", rni:"RNI", ttpa:"TTPA", fibri:"Fibri",
  cr:"Cr", ur:"Ur", na:"Na", k:"K", mg:"Mg", cai:"Cai", p:"P", ph:"pH", hco3:"HCO3",
  trop:"Trop", bnp:"BNP", ntpro:"NT-proBNP", be:"BE", lact:"Lactato",
  po2:"pO2", pco2:"pCO2",
  tgo:"TGO", tgp:"TGP", bttot:"BT", btdir:"BD", btind:"BI",
  falc:"FA", ggt:"GGT", alb:"Alb",
  // Controles 24h
  c24_temp:"T", c24_fc:"FC", c24_fr:"FR", c24_sat:"Sat", c24_pam:"PAM", c24_pas:"PA",
  c24_dextro:"Dextro",
  c24_diur:"Diurese", c24_bh:"BH 24h", c24_bh_ac:"BH Acum", c24_propofol_vol:"Propofol",
  c24_hd:"HD/CRRT", c24_pad:"PAD", c24_pic:"PIC", c24_ppc:"PPC", c24_dve:"DVE líquor",
};

// Formata valor: plaquetas e leucócitos em k quando >= 100
const fmtVal = (key, raw) => {
  if (!raw) return raw;
  const n = parseFloat(raw.replace(',','.'));
  if (isNaN(n)) return raw;
  // Plaquetas e leucócitos: mostrar em k (mil)
  if (["plaq","leuco"].includes(key)) {
    if (n >= 100) return `${Math.round(n)}k`;
    // Já está em mil (ex: 11.17 = 11170 -> mostra 11.170k)
    if (n < 100) return `${(n).toFixed(n % 1 === 0 ? 0 : 2)}k`;
  }
  // Remove casas decimais desnecessárias
  return n % 1 === 0 ? String(Math.round(n)) : raw.replace(',','.');
};

// MELD-Na clássico (UNOS 2016): usa BT, INR, creatinina e sódio.
// Limites: BT/INR/Cr >=1; Cr <=4; Na 125–137; MELD e MELD-Na 6–40.
function calcMeldNa({bilirrubina,inr,creatinina,sodio}) {
  let b=parseFloat(String(bilirrubina||"").replace(",","."));
  let i=parseFloat(String(inr||"").replace(",","."));
  let c=parseFloat(String(creatinina||"").replace(",","."));
  let na=parseFloat(String(sodio||"").replace(",","."));
  if([b,i,c,na].some(v=>!Number.isFinite(v))) return null;
  b=Math.max(1,b); i=Math.max(1,i); c=Math.min(4,Math.max(1,c)); na=Math.min(137,Math.max(125,na));
  const meldBase=Math.min(40,Math.max(6,Math.round(3.78*Math.log(b)+11.2*Math.log(i)+9.57*Math.log(c)+6.43)));
  const meldNa=Math.min(40,Math.max(6,Math.round(meldBase+1.32*(137-na)-0.033*meldBase*(137-na))));
  return {meldNa,meldBase,na};
}

const numScore = v => { const n=parseFloat(String(v??"").replace(",",".")); return Number.isFinite(n)?n:null; };
function calcClifScores(v, idade) {
  const bt=numScore(v.bilirrubina), cr=numScore(v.creatinina), inr=numScore(v.inr), leuco=numScore(v.leucocitos);
  const resp=numScore(v.pf)??numScore(v.sf), usaPF=numScore(v.pf)!==null;
  const faltam=[];
  if(bt===null)faltam.push("bilirrubina"); if(cr===null&&!v.rrt)faltam.push("creatinina/diálise");
  if(inr===null)faltam.push("INR"); if(!v.encefalopatia)faltam.push("encefalopatia");
  if(!v.circulacao)faltam.push("circulação"); if(resp===null)faltam.push("PaO₂/FiO₂ ou SpO₂/FiO₂");
  if(faltam.length)return {faltam};
  const liver=bt<6?1:bt<12?2:3;
  const kidney=v.rrt?3:cr<2?1:cr<3.5?2:3;
  const brain=v.encefalopatia==="0"?1:v.encefalopatia==="1-2"?2:3;
  const coag=inr<2?1:inr<2.5?2:3;
  const circulation=v.circulacao==="normal"?1:v.circulacao==="pam_baixa"?2:3;
  const respiratory=usaPF?(resp>300?1:resp>200?2:3):(resp>357?1:resp>214?2:3);
  const clifOF=liver+kidney+brain+coag+circulation+respiratory;
  const age=numScore(idade);
  const clifC=age!==null&&leuco>0?Math.round(10*(0.33*clifOF+0.04*age+0.63*Math.log(leuco)-2)*10)/10:null;
  return {clifOF,clifC,faltam:clifC===null?["idade/leucócitos"]:[], componentes:{liver,kidney,brain,coag,circulation,respiratory}};
}
function calcSofa(v) {
  const pf=numScore(v.pf), plaq=numScore(v.plaquetas), bt=numScore(v.bilirrubina), gcs=numScore(v.gcs), cr=numScore(v.creatinina), diur=numScore(v.diurese);
  const faltam=[]; if(pf===null)faltam.push("PaO₂/FiO₂"); if(plaq===null)faltam.push("plaquetas"); if(bt===null)faltam.push("bilirrubina"); if(gcs===null)faltam.push("Glasgow"); if(!v.circulacaoSofa)faltam.push("circulação/DVA"); if(cr===null&&diur===null)faltam.push("creatinina/diurese");
  if(faltam.length)return {faltam};
  const resp=pf<100&&v.suporteResp?4:pf<200&&v.suporteResp?3:pf<300?2:pf<400?1:0;
  const coag=plaq<20?4:plaq<50?3:plaq<100?2:plaq<150?1:0;
  const liver=bt>=12?4:bt>=6?3:bt>=2?2:bt>=1.2?1:0;
  const cardio=({normal:0,pam_baixa:1,dva_baixa:2,dva_media:3,dva_alta:4})[v.circulacaoSofa]??0;
  const neuro=gcs<6?4:gcs<10?3:gcs<13?2:gcs<15?1:0;
  const renal=(diur!==null&&diur<200)||cr>=5?4:(diur!==null&&diur<500)||cr>=3.5?3:cr>=2?2:cr>=1.2?1:0;
  return {sofa:resp+coag+liver+cardio+neuro+renal,faltam:[],componentes:{resp,coag,liver,cardio,neuro,renal}};
}

// ── Faixas de referência por exame — NÃO existiam no código (trabalho novo, REDESIGN_README §4).
// Usadas só para decidir a COR DA FONTE do valor (âmbar = alteração leve, vermelho+negrito = importante
// ou tendência de piora rápida) — nunca para tingir o fundo da célula. Faixas aproximadas de adulto/UTI,
// não substituem julgamento clínico; ajustáveis conforme necessário.
const REF_LAB = {
  hb:    {low:12,   high:16,  critLow:7,    critHigh:20,   worse:"down"},
  ht:    {low:36,   high:48,  critLow:21,   critHigh:60,   worse:"down"},
  leuco: {low:4,    high:11,  critLow:2,    critHigh:25,   worse:"up"},
  bast:  {low:0,    high:8,   critLow:0,    critHigh:20,   worse:"up"},
  plaq:  {low:150,  high:450, critLow:50,   critHigh:700,  worse:"down"},
  rni:   {low:0.8,  high:1.2, critLow:0,    critHigh:2,    worse:"up"},
  ttpa:  {low:25,   high:35,  critLow:0,    critHigh:60,   worse:"up"},
  fibri: {low:200,  high:400, critLow:100,  critHigh:800,  worse:"down"},
  cr:    {low:0.6,  high:1.2, critLow:0,    critHigh:3,    worse:"up"},
  ur:    {low:15,   high:45,  critLow:0,    critHigh:100,  worse:"up"},
  na:    {low:135,  high:145, critLow:125,  critHigh:155,  worse:"either"},
  k:     {low:3.5,  high:5.0, critLow:2.8,  critHigh:6.0,  worse:"either"},
  mg:    {low:1.6,  high:2.6, critLow:1.0,  critHigh:4.0,  worse:"either"},
  cai:   {low:1.1,  high:1.3, critLow:0.8,  critHigh:1.6,  worse:"either"},
  p:     {low:2.5,  high:4.5, critLow:1.5,  critHigh:7,    worse:"either"},
  bnp:   {low:0,    high:100, critLow:0,    critHigh:900,  worse:"up"},
  ntpro: {low:0,    high:300, critLow:0,    critHigh:3000, worse:"up"},
  lact:  {low:0.5,  high:2.0, critLow:0,    critHigh:4,    worse:"up"},
  po2:   {low:80,   high:100, critLow:60,   critHigh:120,  worse:"down"},
  pco2:  {low:35,   high:45,  critLow:20,   critHigh:70,   worse:"either"},
  tgo:   {low:0,    high:40,  critLow:0,    critHigh:200,  worse:"up"},
  tgp:   {low:0,    high:40,  critLow:0,    critHigh:200,  worse:"up"},
  bttot: {low:0.2,  high:1.2, critLow:0,    critHigh:5,    worse:"up"},
  btdir: {low:0,    high:0.3, critLow:0,    critHigh:3,    worse:"up"},
  btind: {low:0.2,  high:0.9, critLow:0,    critHigh:4,    worse:"up"},
  falc:  {low:40,   high:129, critLow:0,    critHigh:400,  worse:"up"},
  ggt:   {low:8,    high:61,  critLow:0,    critHigh:300,  worse:"up"},
  alb:   {low:3.5,  high:5.0, critLow:1.5,  critHigh:99,   worse:"down"},
  // Gasometria (chaves próprias do GasometriaPanel)
  ph:    {low:7.35, high:7.45,critLow:7.2,  critHigh:7.55, worse:"either"},
  hco3:  {low:22,   high:26,  critLow:10,   critHigh:40,   worse:"either"},
  be:    {low:-3,   high:3,   critLow:-10,  critHigh:10,   worse:"either"},
  sato2: {low:94,   high:100, critLow:85,   critHigh:100,  worse:"down"},
  ca:    {low:1.1,  high:1.3, critLow:0.8,  critHigh:1.6,  worse:"either"},
  cl:    {low:98,   high:106, critLow:80,   critHigh:120,  worse:"either"},
  glic:  {low:70,   high:180, critLow:40,   critHigh:400,  worse:"either"},
};

// Classifica um valor em "normal" | "alterado" | "importante" comparando à faixa de referência
// e, quando há valor anterior, à tendência (variação rápida na direção de piora conta mesmo
// dentro da faixa normal — pega "fast-worsening trend" antes de virar crítico).
function classificarLab(key, valRaw, valAnteriorRaw) {
  const range = REF_LAB[key];
  if (!range || valRaw===undefined || valRaw===null || valRaw==="") return null;
  const n = parseFloat(String(valRaw).replace(",", "."));
  if (isNaN(n)) return null;
  let nivel = "normal";
  if (n < range.critLow || n > range.critHigh) nivel = "importante";
  else if (n < range.low || n > range.high) nivel = "alterado";
  const ant = parseFloat(String(valAnteriorRaw||"").replace(",", "."));
  if (!isNaN(ant) && ant !== 0 && nivel !== "importante") {
    const delta = (n - ant) / Math.abs(ant);
    const pioraSubindo = (range.worse==="up"||range.worse==="either") && delta > 0.3;
    const pioraDescendo = (range.worse==="down"||range.worse==="either") && delta < -0.3;
    if (pioraSubindo || pioraDescendo) nivel = Math.abs(delta) > 0.6 ? "importante" : "alterado";
  }
  return nivel;
}
// Cor de fonte a partir do nível — usado em Laboratório/Gasometrias/Troponina
function corNivelLab(nivel, corPadrao) {
  if (nivel==="importante") return "#f87171";
  if (nivel==="alterado")   return "#fbbf24";
  return corPadrao;
}

// Sistemas disponíveis para campos custom controles
const CTRL_SISTEMAS = [
  {key:"rm24h",  label:"Balanço/Renal"},
  {key:"cv24h",  label:"Cardiovascular"},
  {key:"re24h",  label:"Respiratório"},
  {key:"neuro",  label:"Neurológico"},
  {key:"tg24h",  label:"TGI"},
  {key:"he",     label:"Hematológico"},
  {key:"outros", label:"Outros"},
];

// ── OptionalDrenosUI ─────────────────────────────────────────────────────────
function OptionalDrenosUI({ data, onChange, datas, hoje, customCtrls=[], onCustomCtrlChange }) {
  const [show, setShow] = useState(false);
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("");
  const [sistema, setSistema] = useState("rm24h");
  const SUGESTOES = ["Dreno abdominal", "Dreno torácico D", "Dreno torácico E", "Dreno pélvico", "Dreno Jackson-Pratt", "Resíduo SNG", "Evacuações"];

  const adicionar = (n = nome) => {
    if (!n.trim()) return;
    const key = `_dreno_${n.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')}`;
    const dataHoje = hoje;
    onChange({ ...data, [dataHoje]: { ...(data[dataHoje]||{}), [key]: data[dataHoje]?.[key] || "" }});
    // Save metadata for custom ctrl (label, unit, sistema)
    if (onCustomCtrlChange) {
      onCustomCtrlChange([...customCtrls.filter(c=>c.key!==key), {key, label:n.trim(), unit:unidade, sistema}]);
    }
    setNome(""); setUnidade(""); setShow(false);
  };

  return (
    <div style={{marginBottom:8}}>
      <button onClick={()=>setShow(s=>!s)} style={{
        display:"flex",alignItems:"center",gap:8,padding:"7px 14px",
        background:show?"rgba(52,211,153,0.1)":"rgba(255,255,255,0.03)",
        border:`1px solid ${show?"rgba(52,211,153,0.4)":"rgba(255,255,255,0.1)"}`,
        borderRadius:8,color:show?"#34d399":"#64748b",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",
      }}>
        {show?"✕ Fechar":"+ Adicionar dreno / SNG / evacuações"}
      </button>
      {show && (
        <div style={{marginTop:6,padding:"12px 14px",background:"rgba(52,211,153,0.05)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:10}}>
          <div style={{fontSize:10,color:"#34d399",fontFamily:mono,letterSpacing:1,marginBottom:8}}>NOME DO ITEM (ex: Dreno abdominal, Resíduo SNG, Evacuações)</div>
          <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            <input value={nome} onChange={e=>setNome(e.target.value)} onKeyDown={e=>e.key==="Enter"&&adicionar()}
              placeholder="Nome (ex: Dreno abdominal / PIC / PVC)"
              style={{flex:2,minWidth:160,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(52,211,153,0.3)",borderRadius:6,padding:"7px 10px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            <input value={unidade} onChange={e=>setUnidade(e.target.value)} placeholder="Unidade (mmHg, mL...)"
              style={{minWidth:120,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:6,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
            <select value={sistema} onChange={e=>setSistema(e.target.value)}
              style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:6,padding:"7px 10px",color:"#e2e8f0",fontSize:12,cursor:"pointer"}}>
              {CTRL_SISTEMAS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <button onClick={()=>adicionar()} disabled={!nome.trim()}
              style={{padding:"7px 14px",background:nome.trim()?"rgba(52,211,153,0.2)":"rgba(255,255,255,0.04)",border:`1px solid ${nome.trim()?"#34d399":"rgba(255,255,255,0.08)"}`,borderRadius:6,color:nome.trim()?"#34d399":"#475569",fontWeight:700,fontSize:12,cursor:nome.trim()?"pointer":"default",fontFamily:"inherit"}}>
              Adicionar
            </button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {SUGESTOES.map(s=>(
              <button key={s} onClick={()=>adicionar(s)}
                style={{padding:"4px 10px",borderRadius:16,border:"1px solid rgba(52,211,153,0.2)",background:"rgba(52,211,153,0.05)",color:"#34d399",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PRESET_LABS = [
  {label:"Vancocinemia",key:"_extra_vancocinemia",cat:"vanco",hint:"Infeccioso · junto à vancomicina"},
  {label:"Tacrolinemia",key:"_extra_tacrolinemia",cat:"hb",hint:"Hematológico"},
  {label:"CPK",key:"_extra_cpk",cat:"cr",hint:"Renal/Metabólico"},
  {label:"NT-proBNP",key:"_extra_ntprobnp",cat:"trop",hint:"Cardiovascular"},
  {label:"Procalcitonina",key:"_extra_procalcitonina",cat:"inf",hint:"Infeccioso"},
  {label:"PCR",key:"_extra_pcr",cat:"inf",hint:"Infeccioso"},
  {label:"CK-MB",key:"_extra_ckmb",cat:"trop",hint:"Cardiovascular"},
  {label:"Dímero-D",key:"_extra_dimero_d",cat:"hb",hint:"Hematológico"},
  {label:"Amônia",key:"_extra_amonia",cat:"tgo",hint:"TGI/Hepático"},
  {label:"Beta-D-glucana",key:"_extra_beta_d_glucana",cat:"inf",hint:"Infeccioso"},
];
const FLUID_ANALYSIS_TYPES = {
  liquor:{label:"Líquor (LCR)",target:"n",fields:[["aspecto","Aspecto"],["pressao","Pressão abertura"],["celulas","Células/mm³"],["hemacias","Hemácias/mm³"],["neutrofilos","Neutrófilos %"],["linfocitos","Linfócitos %"],["proteinas","Proteínas mg/dL"],["glicose","Glicose mg/dL"],["lactato","Lactato mmol/L"],["cloro","Cloro mEq/L"],["gram","Gram"],["cultura","Cultura/PCR"]]},
  pleural:{label:"Líquido pleural",target:"res",fields:[["aspecto","Aspecto"],["ph","pH"],["celulas","Células/mm³"],["hemacias","Hemácias/mm³"],["neutrofilos","Neutrófilos %"],["linfocitos","Linfócitos %"],["proteinas","Proteínas líquido"],["proteinasSericas","Proteínas séricas"],["ldh","LDH líquido"],["ldhSerico","LDH sérico"],["ldhLimite","LSN do LDH sérico"],["glicose","Glicose"],["amilase","Amilase"],["triglicerides","Triglicérides"],["colesterol","Colesterol"],["gram","Gram"],["cultura","Cultura/citologia"]]},
  peritoneal:{label:"Líquido peritoneal/ascítico",target:"tgi",fields:[["aspecto","Aspecto"],["celulas","Células/mm³"],["pmns","PMN/mm³"],["hemacias","Hemácias/mm³"],["albumina","Albumina"],["albuminaSerica","Albumina sérica"],["proteinas","Proteínas"],["ldh","LDH"],["glicose","Glicose"],["amilase","Amilase"],["gram","Gram"],["cultura","Cultura/citologia"]]},
  outro:{label:"Outro líquido",target:"n",fields:[["aspecto","Aspecto"],["celulas","Células"],["hemacias","Hemácias"],["proteinas","Proteínas"],["glicose","Glicose"],["ldh","LDH"],["gram","Gram"],["cultura","Cultura/citologia"]]},
};

// ── TabelaClinica ─────────────────────────────────────────────────────────────
function TabelaClinica({ leito, data, onChange, onAplicarEvolucao, onLeitoChange, evolCampos={}, config={} }) {
  const customCtrls = leito.customCtrls || [];
  const onCustomCtrlChange = (ctrls) => { if(onLeitoChange) onLeitoChange({...leito, customCtrls:ctrls}); };
  const T = useTheme();
  const hoje = new Date().toISOString().split("T")[0];
  const [novaData, setNovaData] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);
  const [showAddExame, setShowAddExame] = useState(false);
  const [novoExame, setNovoExame] = useState("");
  const [tabela, setTabela] = useState("labs");
  const [subTabLabs, setSubTabLabs] = useState("labs"); // "labs" | "controles"
  const [scoreEditor, setScoreEditor] = useState(null);

  // Mostra colunas com dados OU marcadas como visíveis, mais hoje sempre
  // Aceita tanto "2026-04-23" quanto "2026-04-23T05:15"
  const comDados = Object.keys(data).filter(d => {
    if (!d.match(/^\d{4}-\d{2}-\d{2}/)) return false; // ignora chaves que não são datas
    const vals = data[d] || {};
    // mostra se tem qualquer valor, ou se foi marcada como visível
    return vals._visivel || Object.entries(vals).some(([k,v]) => k !== '_visivel' && v);
  });
  const datas = Array.from(new Set([...comDados, hoje])).sort();

  // Extrai exames extras dinâmicos (keys começando com _extra_)
  const extrasKeys = Array.from(new Set(
    datas.flatMap(d => Object.keys(data[d]||{}).filter(k => k.startsWith('_extra_')))
  ));

  const getVal = (date, key) => data[date]?.[key] || "";
  const navCell = (e, rowKey, colIdx) => {
    if (!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Enter"].includes(e.key)) return;
    e.preventDefault();
    const table = e.target.closest("table");
    if (!table) return;
    const inputs = Array.from(table.querySelectorAll("input[data-nav]"));
    const cur = inputs.indexOf(e.target);
    if (cur < 0) return;
    const cols = datas.length;
    let next = cur;
    if (e.key==="ArrowRight"||e.key==="Enter") next = cur+1;
    else if (e.key==="ArrowLeft") next = cur-1;
    else if (e.key==="ArrowDown") next = cur+cols;
    else if (e.key==="ArrowUp") next = cur-cols;
    if (next>=0&&next<inputs.length) inputs[next]?.focus();
  };
  const setVal = (date, key, val) =>
    onChange({ ...data, [date]: { ...(data[date]||{}), [key]: val } });
  const addExtraExam = (key,cat="") => {
    const hoje2=new Date().toISOString().split("T")[0];
    onChange({...data,[hoje2]:{...(data[hoje2]||{}),[key]:data[hoje2]?.[key]||""},__extraCats__:{...(data.__extraCats__||{}),[key]:cat}});
  };
  const normExam=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const presetFiltrados=novoExame.trim()?PRESET_LABS.filter(ex=>normExam(ex.label).includes(normExam(novoExame))).filter(ex=>!extrasKeys.includes(ex.key)):[];
  const addExamFromText=text=>{
    const raw=String(text||"").trim();if(!raw)return;
    const preset=PRESET_LABS.find(ex=>normExam(ex.label)===normExam(raw));
    if(preset)addExtraExam(preset.key,preset.cat);
    else addExtraExam(`_extra_${normExam(raw).replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}`,"");
    setNovoExame("");setShowAddExame(false);
  };

  const gasosData = date => { try { const v=data[date]?._gasos; return v?(typeof v==="string"?JSON.parse(v):v):[]; } catch{return [];} };
  const datasAte = date => Object.keys(data).filter(k=>/^\d{4}-\d{2}-\d{2}/.test(k)&&k.slice(0,10)<=date.slice(0,10)).sort().reverse();
  const ultimoLab = (date,key) => {for(const d of datasAte(date)){const v=data[d]?.[key];if(v!==undefined&&v!==null&&String(v).trim()!=="")return v;}return "";};
  const ultimoScore = (date,key) => {for(const d of datasAte(date)){const v=data[d]?._scoreInputs?.[key];if(v!==undefined&&v!==null&&String(v).trim()!=="")return v;}return "";};
  const ultimaGaso = date => {for(const d of datasAte(date)){const gs=gasosData(d);for(let i=gs.length-1;i>=0;i--){if(Object.values(gs[i]||{}).some(Boolean))return gs[i];}}return {};};
  const scoreInputs = date => {
    const row=data[date]||{}, salvo=row._scoreInputs||{};
    const g=ultimaGaso(date);
    const fio2=numScore(date===hoje?(leito.vm_fio2||ultimoScore(date,"fio2")):ultimoScore(date,"fio2"));
    const po2=numScore(g.po2), sat=numScore(g.sato2)??numScore(ultimoLab(date,"c24_sat"));
    const nora=date===hoje?calcDoseFromMLH("noradrenalina",leito.drogasVazao?.noradrenalina,leito.peso,undefined,undefined,config,pesoPredito(leito.altura,leito.sexo))?.dose:null;
    const circAnterior=ultimoScore(date,"circulacaoSofa")||ultimoScore(date,"circulacao");
    const pam=numScore(ultimoLab(date,"c24_pam"));
    const autoCirc=nora?(numScore(nora)>0.1?"dva_alta":"dva_media"):(date===hoje&&Object.values(leito.drogasVazao||{}).some(Boolean)?"dva_baixa":circAnterior||(pam!==null&&pam<70?"pam_baixa":"normal"));
    const gcsAtual=date===hoje?(evolCampos.nGlasgow||ultimoScore(date,"gcs")):ultimoScore(date,"gcs");
    const suporteAtual=date===hoje?(!!leito.vm_modo||ultimoScore(date,"suporteResp")):ultimoScore(date,"suporteResp");
    return {bilirrubina:ultimoLab(date,"bttot"),creatinina:ultimoLab(date,"cr"),inr:ultimoLab(date,"rni"),leucocitos:ultimoLab(date,"leuco"),plaquetas:ultimoLab(date,"plaq"),diurese:ultimoLab(date,"c24_diur"),
      pf:po2!==null&&fio2?String(Math.round(po2/(fio2/100))):"",sf:sat!==null&&fio2?String(Math.round(sat/(fio2/100))):"",fio2:fio2??"",
      gcs:gcsAtual||"",suporteResp:!!suporteAtual,circulacao:autoCirc,circulacaoSofa:autoCirc,
      ...salvo};
  };
  const salvarScoreInputs = (date, values) => {
    const snapshot={clif:calcClifScores(values,idadeDoLeito(leito)),sofa:calcSofa(values),idade:idadeDoLeito(leito),capturadoEm:new Date().toISOString()};
    onChange({...data,[date]:{...(data[date]||{}),_scoreInputs:values,_scoreSnapshot:snapshot,_scoreUpdatedAt:snapshot.capturadoEm}});
  };

  const adicionarColuna = () => {
    if (!novaData) return;
    // Marca como visível mesmo vazia
    onChange({ ...data, [novaData]: { ...(data[novaData]||{}), _visivel: true } });
    setShowAddCol(false); setNovaData("");
  };

  const removerColuna = (date) => {
    if (date === hoje) return;
    if (!confirm(`Remover coluna ${fmtData(date)}?`)) return;
    const novo = { ...data }; delete novo[date]; onChange(novo);
  };

  // Formata chave de data (pode ser "2026-04-23" ou "2026-04-23T05:15")
  const fmtData = (ds) => {
    if (!ds) return "";
    const [datePart, timePart] = ds.split("T");
    const [,m,d] = datePart.split("-");
    if (timePart) return `${d}/${m}\n${timePart}h`;
    return `${d}/${m}`;
  };

  // Compara datas ignorando hora para determinar "hoje"
  const isHoje = (ds) => ds === hoje || ds.startsWith(hoje + "T");

  // Padrão: qualquer alteração em Laboratório ou Controles 24h atualiza a evolução.
  // O modo manual é uma exceção deliberada e exige o botão "Lançar na evolução".
  const [autoApply, setAutoApply] = useState(true);
  const autoRef = useRef(autoApply);
  const autoApplyTimer = useRef(null);
  useEffect(()=>{ autoRef.current = autoApply; }, [autoApply]);
  const prevDataHash = useRef(JSON.stringify({d:data[hoje]||{},v:leito.drogasVazao||{}}));
  useEffect(()=>{
    if (!autoRef.current) return;
    const hash = JSON.stringify({d: data[hoje]||{}, v: leito.drogasVazao||{}});
    if (prevDataHash.current !== hash) {
      clearTimeout(autoApplyTimer.current);
      autoApplyTimer.current=setTimeout(()=>gerarEvolucao(false),350);
    }
    prevDataHash.current = hash;
    return()=>clearTimeout(autoApplyTimer.current);
  },[data,leito.drogasVazao,autoApply]);

  const gerarEvolucao = (navegarDepois = false) => {
    const datasHoje = datas.filter(d => isHoje(d)).sort();
    const chaveHoje = datasHoje[datasHoje.length - 1] || hoje;
    const idxHoje = datas.indexOf(chaveHoje);
    const dtAnt = idxHoje > 0 ? datas[idxHoje-1] : null;
    const campos = {};

    // Exames laboratoriais: compara numericamente, mostra "ant > atu"
    const pegar = (keys) => keys.map(k=>{
      const abrev = ABREV[k] || TODOS_PARAMS.find(x=>x.key===k)?.label || k;
      const atuRaw = getVal(chaveHoje, k);
      if (!atuRaw) return null;               // só lança se tem valor hoje
      const antRaw = dtAnt ? getVal(dtAnt, k) : "";
      const atu = fmtVal(k, atuRaw);
      const ant = fmtVal(k, antRaw);
      const val = (ant && atu && ant !== atu) ? `${ant} > ${atu}` : atu;
      return `${abrev} ${val}`;
    }).filter(Boolean).join(" / ");

    // Controles 24h: mantém string bruta inteira (preserva intervalos "36 / 37.2")
    const pegarCtrl = (keys) => keys.map(k=>{
      const abrev = ABREV[k] || k;
      const val = getVal(chaveHoje, k);
      if (!val) return null;
      return `${abrev}: ${val}`;
    }).filter(Boolean).join(" · ");

    // Custom campos adicionados pelo usuário → sistema configurado
    const customCtrlsLeito = leito.customCtrls || [];
    customCtrlsLeito.forEach(cc => {
      const val = getVal(chaveHoje, cc.key);
      if (!val) return;
      const campoAlvo = cc.sistema || "rm24h";
      campos[campoAlvo] = (campos[campoAlvo]||"") + (campos[campoAlvo]?"\n":"") + `${cc.label}: ${val}${cc.unit?" "+cc.unit:""}`;
    });

    // Drenos dinâmicos    // Drenos dinâmicos (_dreno_*) → TGI
    const drenosKeys = Object.keys(data[chaveHoje]||{}).filter(k => k.startsWith('_dreno_'));
    const drenosStr  = drenosKeys.map(k=>{
      const nome = k.replace(/^_dreno_/, '').replace(/_/g,' ');
      const val = getVal(chaveHoje, k);
      return val ? `${nome}: ${val} mL` : null;
    }).filter(Boolean).join(" · ");

    // Labs
    let heStr  = pegar(["hb","ht","leuco","neut","bast","linf","plaq","rni","ttpa","fibri"]);
    let rmStr  = pegar(["cr","ur","na","k","mg","cai","p","ph","hco3"]);
    const cvStr  = pegar(["bnp","ntpro","be"]);
    // Gasometria: lê _gasos do painel dedicado + fallback tabela
    const gasoEntries = (() => {
      try { const raw=data[chaveHoje]?._gasos; return raw?(typeof raw==="string"?JSON.parse(raw):raw):[]; } catch{ return []; }
    })();
    const resStr = gasoEntries.length > 0
      ? gasoEntries.map(g => {
          const h = g.horario ? `[${g.horario}] ` : "";
          const p = [g.ph?`pH ${g.ph}`:"",g.hco3?`HCO3 ${g.hco3}`:"",g.pco2?`pCO2 ${g.pco2}`:"",g.po2?`pO2 ${g.po2}`:"",g.be?`BE ${g.be}`:"",g.sato2?`SatO2 ${g.sato2}%`:""].filter(Boolean).join(" / ");
          return h + p;
        }).join("\n")
      : pegar(["po2","pco2"]);
    let tgStr  = pegar(["tgo","tgp","bttot","btdir","btind","falc","ggt","alb"]);

    // Campos extras da Gasometria (Na/K/Ca/Cl/Glic/Lact/Hb) → lançados nos sistemas respectivos
    const gasoExtraLines = (key, label, unit="") => gasoEntries
      .filter(g=>g[key])
      .map(g=>{ const h=g.horario?`[${g.horario}] `:""; return `${h}${label} ${g[key]}${unit?" "+unit:""} (gaso)`; });
    const rmGasoExtra = [
      ...gasoExtraLines("hco3","HCO3","mEq/L"),
      ...gasoExtraLines("na","Na","mEq/L"), ...gasoExtraLines("k","K","mEq/L"),
      ...gasoExtraLines("ca","Ca","mmol/L"), ...gasoExtraLines("cl","Cl","mEq/L"),
    ];
    if (rmGasoExtra.length) rmStr = [rmStr, ...rmGasoExtra].filter(Boolean).join("\n");
    const glicGasoExtra = gasoExtraLines("glic","Glicemia","mg/dL");
    if (glicGasoExtra.length) rmStr = [rmStr, ...glicGasoExtra].filter(Boolean).join("\n");
    const heGasoExtra = gasoExtraLines("hb","Hb","g/dL");
    if (heGasoExtra.length) heStr = [heStr, ...heGasoExtra].filter(Boolean).join("\n");
    const lactTabela = pegar(["lact"]).replace(/^Lactato\s*/i,"");
    const lactGaso = gasoEntries.filter(g=>g.lact).map(g=>`${g.horario?`[${g.horario}] `:""}${g.lact}`).join(" / ");

    // Controles → campos certos em cada sistema
    const tempStr  = pegarCtrl(["c24_temp"]);           // He: Infeccioso/Temperatura
    const cvCtrl   = pegarCtrl(["c24_fc","c24_pam","c24_pas"]); // Cv: 24h
    const reCtrl   = pegarCtrl(["c24_fr","c24_sat"]);   // Res: 24h
    const bhStr    = pegarCtrl(["c24_diur","c24_bh"]);  // ReMe: 24h
    const dextroStr= pegarCtrl(["c24_dextro"]);          // ReMe: metabólico 24h
    const neuroCtrl24h = [
      getVal(chaveHoje,"c24_pic") ? `PIC ${getVal(chaveHoje,"c24_pic")} mmHg` : "",
      getVal(chaveHoje,"c24_dve") ? `DVE ${getVal(chaveHoje,"c24_dve")} mL` : "",
      getVal(chaveHoje,"c24_ppc") ? `PPC ${getVal(chaveHoje,"c24_ppc")} mmHg` : "",
    ].filter(Boolean).join(" / ");

    // Aplica labs
    if (heStr)  campos.heLabs = heStr;
    if (rmStr)  campos.rmLabs = rmStr;
    if (cvStr)  campos.cvPerf = cvStr;
    if (lactGaso || lactTabela) campos.cvLact = lactGaso || lactTabela;
    if (resStr) campos.reGaso = resStr;
    if (tgStr)  campos.tgLabs = tgStr;
    if (neuroCtrl24h) campos.n24h = neuroCtrl24h;

    // Exames extras categorizados
    const extraCats = data.__extraCats__ || {};
    const CAT_MAP = {
      "hb":  "heLabs", "cr": "rmLabs", "tgo": "tgLabs",
      "trop":"cvPerf",  "po2":"reGaso", "he":  "heLabs",
    };
    extrasKeys.forEach(k=>{
      const cat = extraCats[k];
      const campoAlvo = CAT_MAP[cat] || null;
      const nome = PRESET_LABS.find(x=>x.key===k)?.label || k.replace(/^_extra_/,'').replace(/_/g,' ');
      const val  = getVal(chaveHoje, k);
      if (val && campoAlvo) {
        campos[campoAlvo] = campos[campoAlvo]
          ? `${campos[campoAlvo]} / ${nome} ${val}`
          : `${nome} ${val}`;
      }
    });

    // Aplica controles nos sistemas corretos
    if (tempStr)  campos.heTemp  = tempStr;
    if (cvCtrl)   campos.cv24h   = cvCtrl;
    if (reCtrl)   campos.re24h   = reCtrl;
    const rmCtrl=[bhStr,dextroStr].filter(Boolean).join(" · ");
    if (rmCtrl)   campos.rm24h   = rmCtrl;

    // TGI: drenos/evacuações; glicemia pertence ao metabólico
    const tgCtrl = drenosStr;
    if (tgCtrl) campos.tg24h = tgCtrl;

    // TFG selecionada → inclui no campo renal da evolução
    const hoje3 = new Date().toISOString().split("T")[0];
    const tfgSelHoje = (leito.tfgSel||{})[hoje3];
    const crHoje = pegarCtrl(["cr"]) ? getVal(chaveHoje,"cr") : "";
    if (tfgSelHoje && crHoje) {
      const p3 = parseFloat(leito.peso)||null;
      const ia3 = idadeDoLeito(leito);
      const sx3 = leito.sexo||"M";
      const tfgVal = tfgSelHoje==="ckdepi" ? calcCKDEPI(crHoje,ia3,sx3)
                   : tfgSelHoje==="cg"     ? calcCockcroftGault(crHoje,ia3,p3,sx3)
                   : null;
      const tfgLabel = tfgSelHoje==="ckdepi" ? "CKD-EPI" : tfgSelHoje==="cg" ? "CG" : "KeGFR";
      if (tfgVal) campos.reLab = (campos.reLab||"") + (campos.reLab?"\n":"") + `TFG: ${tfgVal} mL/min (${tfgLabel})`;
    }

    // Ventilação mecânica → reVM (campo "Ventilação — Modo" na evolução)
    const vmTexto = gerarTextoVM(leito);
    if (vmTexto && vmTexto !== "Ar ambiente") {
      campos.reVM = vmTexto;
    }

    // Antibioticoterapia → heAtb (campo "Antibióticos" na seção Infeccioso)
    const atbTexto = (leito.antibioticos||[]).filter(a=>a.nome&&!a.dataFim).map(a=>{
      const diasAtb = diasAtb24h(a.dataInicio, a.horaInicio);
      const partes = [a.nome, a.dose, a.via||"EV"].filter(Boolean).join(" ");
      const lbl = lblDiaAtb(diasAtb);
      return `${partes}${lbl ? " ("+lbl+")" : ""}`;
    }).join("\n");
    if (atbTexto) campos.heAtb = atbTexto;

    // Análises de líquidos do dia → Exames complementares do sistema correspondente.
    const fluidRaw=data[chaveHoje]?._fluidAnalyses;
    let fluidEntries=[];try{fluidEntries=fluidRaw?(typeof fluidRaw==="string"?JSON.parse(fluidRaw):fluidRaw):[];}catch{fluidEntries=[];}
    const fluidTargets={n:[],res:[],tgi:[]};
    fluidEntries.forEach(entry=>{
      const cfg=FLUID_ANALYSIS_TYPES[entry.type]||FLUID_ANALYSIS_TYPES.outro;
      const titulo=`${entry.type==="outro"?(entry.nomeOutro||"Análise de outro líquido"):cfg.label}${entry.hora?` — ${entry.hora}`:""}`;
      const labels=Object.fromEntries(cfg.fields);
      const values=Object.entries(entry.values||{}).filter(([,v])=>String(v||"").trim()).map(([k,v])=>`${labels[k]||k}: ${v}`);
      if(entry.outros)values.push(entry.outros);
      if(entry.conclusao)values.push(`Conclusão: ${entry.conclusao}`);
      if(!values.length)return;
      const target=entry.type==="outro"?(entry.target||"n"):cfg.target;
      (fluidTargets[target]||fluidTargets.n).push({id:`fluid_${entry.id}`,data:entry.data||chaveHoje,titulo,resultado:values.join(" / ")});
    });
    const visNext={...(evolCampos._vis_||{})};
    [["n","n_exames"],["res","res_exames"],["tgi","tgi_exames"]].forEach(([system,key])=>{
      if(!fluidTargets[system].length)return;
      const atuais=Array.isArray(evolCampos[key])?evolCampos[key].filter(e=>!String(e.id||"").startsWith("fluid_")):[];
      campos[key]=[...atuais,...fluidTargets[system]];
      visNext[`add_${system}_exames`]=true;
    });
    const infLabs=extrasKeys.filter(k=>extraCats[k]==="inf"&&getVal(chaveHoje,k)).map(k=>({id:`labextra_${k}`,data:chaveHoje.slice(0,10),titulo:PRESET_LABS.find(x=>x.key===k)?.label||k.replace(/^_extra_/,"").replace(/_/g," "),resultado:String(getVal(chaveHoje,k))}));
    if(infLabs.length){const atuais=Array.isArray(evolCampos.in_exames)?evolCampos.in_exames.filter(e=>!String(e.id||"").startsWith("labextra_")):[];campos.in_exames=[...atuais,...infLabs];visNext.add_in_exames=true;}
    if(Object.keys(visNext).length)campos._vis_=visNext;

    onAplicarEvolucao(campos,{navegar:navegarDepois});
  };

  const thStyle = (ativo) => ({
    padding:"6px 8px", fontSize:11, fontFamily:mono, letterSpacing:1,
    color:ativo?T.accent:T.text3,
    background:ativo?T.accentBg:T.bgTableHead,
    borderBottom:ativo?`2px solid ${T.accent}`:`2px solid ${T.border}`,
    whiteSpace:"pre", textAlign:"center", minWidth:72, position:"sticky", top:0,
  });
  const tdBase = {padding:"2px 3px", borderBottom:`1px solid ${T.borderTableRow}`, textAlign:"center"};

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:T.text1}}>Tabela Clínica</div>
          <div style={{fontSize:12,color:T.text3}}>{autoApply?"Modo automático: alterações em exames e controles atualizam a evolução":"Modo manual: revise os valores e clique em Lançar na evolução"}</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setShowAddCol(v=>!v)} style={{padding:"8px 14px",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:8,color:T.text2,fontWeight:600,fontSize:12,cursor:"pointer"}}>
            {showAddCol?"✕ Fechar":"📅 Adicionar dia"}
          </button>
          {tabela==="labs" && <button onClick={()=>setShowAddExame(v=>!v)} style={{padding:"8px 14px",background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.25)",borderRadius:8,color:"#c4b5fd",fontWeight:600,fontSize:12,cursor:"pointer"}}>
            {showAddExame?"✕ Fechar":"🧪 Novo exame"}
          </button>}
          <button onClick={()=>setAutoApply(a=>!a)}
            style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${autoApply?"rgba(52,211,153,0.4)":"rgba(255,255,255,0.1)"}`,
              background:autoApply?"rgba(52,211,153,0.1)":"rgba(255,255,255,0.03)",
              color:autoApply?"#34d399":"#64748b",cursor:"pointer",fontSize:11,fontWeight:600,marginRight:4}}>
            {autoApply?"⚡ Automático":"○ Manual"}
          </button>
          {!autoApply&&<button onClick={()=>gerarEvolucao(true)} style={{padding:"8px 16px",background:"linear-gradient(135deg,#0ea5e9,#0284c7)",border:"none",borderRadius:8,color:"white",fontWeight:700,fontSize:12,cursor:"pointer"}}>
            📝 Lançar na evolução
          </button>}
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{display:"flex",gap:4,marginBottom:14,background:T.bgInput,borderRadius:10,padding:4}}>
        {[["labs","🔬 Exames Laboratoriais"],["controles","📊 Controles 24h"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTabela(id)} style={{flex:1,padding:"8px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:tabela===id?700:400,background:tabela===id?T.accentBg:"transparent",color:tabela===id?T.accent:T.text3,transition:"all 0.2s"}}>
            {label}
          </button>
        ))}

        {tabela==="gasos" && (
        <div style={{padding:"16px 20px",overflowY:"auto",flex:1}}>
          <GasometriaPanel
            data={data} onChange={onChange}
            datas={Object.keys(data).filter(k=>!k.startsWith("_")).sort()}
            hoje={new Date().toISOString().split("T")[0]}/>
        </div>
      )}
      {tabela==="culturas" && (
        <div style={{padding:"16px 20px",overflowY:"auto",flex:1}}>
          <CulturasPanel
            culturas={leito.culturas||[]}
            onChange={novas=>{if(onLeitoChange)onLeitoChange({...leito,culturas:novas});}}/>
        </div>
      )}
      </div>

      {showAddCol && (
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14,padding:"12px 14px",background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.18)",borderRadius:10}}>
          <div style={{fontSize:12,color:"#64748b"}}>Data:</div>
          <input type="date" value={novaData} onChange={e=>setNovaData(e.target.value)}
            style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:6,padding:"6px 10px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
          <button onClick={adicionarColuna} disabled={!novaData}
            style={{padding:"6px 14px",background:novaData?"rgba(56,189,248,0.2)":"rgba(255,255,255,0.04)",border:`1px solid ${novaData?"#38bdf8":"rgba(255,255,255,0.08)"}`,borderRadius:6,color:novaData?"#38bdf8":"#475569",fontWeight:600,fontSize:12,cursor:novaData?"pointer":"default"}}>
            Adicionar
          </button>
        </div>
      )}

      {showAddExame && (
        <div style={{marginBottom:14,padding:"12px 14px",background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:10}}>
          <div style={{fontSize:10,color:"#c4b5fd",fontFamily:mono,letterSpacing:1,marginBottom:7}}>BUSCAR OU ADICIONAR EXAME</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{fontSize:12,color:"#c4b5fd"}}>Exame:</div><div style={{position:"relative",flex:1}}>
          <input value={novoExame} onChange={e=>setNovoExame(e.target.value)}
            onKeyDown={e=>{
              if(e.key==="Enter"&&novoExame.trim()){e.preventDefault();addExamFromText(presetFiltrados[0]?.label||novoExame);}
              if(e.key==="Escape")setShowAddExame(false);
            }}
            placeholder="Digite: vanco, CPK, NT-proBNP..."
            style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:6,padding:"6px 10px",color:T.text1,fontSize:13,fontFamily:"inherit"}}/>
          {presetFiltrados.length>0&&<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:50,background:T.bgPicker,border:"1px solid rgba(167,139,250,.35)",borderRadius:7,boxShadow:"0 8px 24px rgba(0,0,0,.28)",overflow:"hidden"}}>{presetFiltrados.map(ex=><button key={ex.key} onMouseDown={e=>e.preventDefault()} onClick={()=>addExamFromText(ex.label)} style={{display:"flex",width:"100%",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",border:0,borderBottom:`1px solid ${T.border}`,background:"transparent",color:T.text1,cursor:"pointer",textAlign:"left",fontSize:11}}><span>{ex.label}</span><span style={{fontSize:9,color:T.text3}}>{ex.hint}</span></button>)}</div>}
          </div><button onClick={()=>addExamFromText(presetFiltrados[0]?.label||novoExame)} disabled={!novoExame.trim()}
            style={{padding:"6px 14px",background:novoExame.trim()?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.04)",border:`1px solid ${novoExame.trim()?"#a78bfa":"rgba(255,255,255,0.08)"}`,borderRadius:6,color:novoExame.trim()?"#c4b5fd":"#475569",fontWeight:600,fontSize:12,cursor:novoExame.trim()?"pointer":"default"}}>
            Adicionar
          </button>
          </div>
        </div>
      )}
      {tabela==="labs" && (
        <div style={{display:"flex",gap:5,paddingBottom:8,borderBottom:`1px solid ${T.border}`,marginBottom:8,flexShrink:0}}>
          {[["labs","🔬 Laboratório"],["gasos","🫁 Gasometrias"],["tropos","🫀 Troponina"],["culturas","🧫 Culturas"],["fluidos","💧 Líquidos"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setSubTabLabs(id)}
              style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${subTabLabs===id?"rgba(56,189,248,0.4)":"rgba(255,255,255,0.08)"}`,
                background:subTabLabs===id?"rgba(56,189,248,0.1)":"transparent",
                color:subTabLabs===id?"#38bdf8":"#64748b",cursor:"pointer",fontSize:11,fontWeight:subTabLabs===id?600:400}}>
              {lbl}
            </button>
          ))}
          <button onClick={()=>onLeitoChange&&onLeitoChange({...leito,labACLF:!leito.labACLF})} title="Adicionar MELD-Na e CLIF à tabela"
            style={{marginLeft:"auto",padding:"4px 10px",borderRadius:6,border:`1px solid ${leito.labACLF?"rgba(251,146,60,.45)":"rgba(255,255,255,.08)"}`,background:leito.labACLF?"rgba(251,146,60,.12)":"transparent",color:leito.labACLF?"#fb923c":"#64748b",cursor:"pointer",fontSize:11,fontWeight:600}}>
            {leito.labACLF?"✓ ":"+ "}ACLF · MELD-Na
          </button>
          <button onClick={()=>onLeitoChange&&onLeitoChange({...leito,labSOFA:!leito.labSOFA})} title="Acompanhar SOFA por data"
            style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${leito.labSOFA?"rgba(248,113,113,.45)":"rgba(255,255,255,.08)"}`,background:leito.labSOFA?"rgba(248,113,113,.12)":"transparent",color:leito.labSOFA?"#f87171":"#64748b",cursor:"pointer",fontSize:11,fontWeight:600}}>
            {leito.labSOFA?"✓ ":"+ "}Sepse · SOFA
          </button>
        </div>
      )}
      {tabela==="labs" && subTabLabs==="gasos" && (
        <div style={{overflowY:"auto",flex:1,padding:"8px 0"}}>
          <GasometriaPanel data={data} onChange={onChange}
            datas={Object.keys(data).filter(k=>!k.startsWith("_")).sort()}
            hoje={hoje}/>
        </div>
      )}
      {tabela==="labs" && subTabLabs==="tropos" && (
        <div style={{overflowY:"auto",flex:1,padding:"8px 0"}}>
          <TroponinaPanel data={data} onChange={onChange}
            datas={Object.keys(data).filter(k=>!k.startsWith("_")).sort()}
            hoje={hoje}/>
        </div>
      )}
      {tabela==="labs" && subTabLabs==="culturas" && (
        <div style={{overflowY:"auto",flex:1}}>
          <CulturasPanel culturas={leito.culturas||[]}
            onChange={novas=>{if(onLeitoChange)onLeitoChange({...leito,culturas:novas});}}/>
        </div>
      )}
      {tabela==="labs" && subTabLabs==="fluidos" && (
        <div style={{overflowY:"auto",flex:1,padding:"8px 0"}}>
          <FluidAnalysisPanel data={data} onChange={onChange} datas={Object.keys(data).filter(k=>!k.startsWith("_")).sort()} hoje={hoje}/>
        </div>
      )}
      {tabela==="labs" && subTabLabs==="labs" && (datas.length === 0 ? (
        <div style={{padding:40,textAlign:"center",color:T.text3,fontSize:13}}>
          Nenhum dado ainda. Cole um print na aba 📤 ou adicione um dia manualmente.
        </div>
      ) : (
        <div style={{overflowX:"auto",borderRadius:10,border:`1px solid ${T.borderTable}`}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={{...thStyle(false),textAlign:"left",minWidth:155,padding:"8px 12px",position:"sticky",left:0,zIndex:2,background:T.bgTableHead}}>Parâmetro</th>
                <th style={{...thStyle(false),minWidth:46,position:"sticky",left:155,zIndex:2,background:T.bgTableHead}}>Un.</th>
                {datas.map(d=>(
                  <th key={d} style={thStyle(isHoje(d))}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                      {fmtData(d).split('\n').map((linha,i)=>(
                        <span key={i} style={{fontSize:i===1?10:11}}>{linha}</span>
                      ))}
                      {isHoje(d)&&<span style={{fontSize:9,letterSpacing:0.5,color:T.accent}}>HOJE</span>}
                      {!isHoje(d)&&<button onClick={()=>removerColuna(d)} style={{background:"none",border:"none",color:T.text4,cursor:"pointer",fontSize:9,padding:0}}>✕</button>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leito.labACLF&&<>
                <tr><td colSpan={2+datas.length} style={{padding:"7px 12px",fontSize:10,fontWeight:700,color:"#fb923c",background:"rgba(251,146,60,.07)",fontFamily:mono,letterSpacing:1.5,borderBottom:`1px solid ${T.borderTableRow}`}}>🟠 ACLF — ESCORE HEPÁTICO</td></tr>
                <tr>
                  <td style={{...tdBase,padding:"5px 12px",fontSize:12,color:T.colorTableMuted,textAlign:"left",position:"sticky",left:0,background:T.bgTableSticky}}>MELD-Na</td>
                  <td style={{...tdBase,fontSize:10,color:T.text3,fontFamily:mono,position:"sticky",left:155,background:T.bgTableSticky}}>pontos</td>
                  {datas.map(d=>{const sc=calcMeldNa({bilirrubina:getVal(d,"bttot"),inr:getVal(d,"rni"),creatinina:getVal(d,"cr"),sodio:getVal(d,"na")});return <td key={d} style={{...tdBase,background:isHoje(d)?"rgba(251,146,60,.05)":undefined}}><div title={sc?`MELD ${sc.meldBase} · Na corrigido ${sc.na}`:"Requer BT, INR, creatinina e sódio"} style={{fontSize:13,fontFamily:mono,fontWeight:700,color:sc?(sc.meldNa>=30?"#f87171":sc.meldNa>=20?"#fbbf24":"#34d399"):T.text4}}>{sc?.meldNa??"—"}</div></td>;})}
                </tr>
                {[['CLIF-OF','clifOF'],['CLIF-C ACLF','clifC']].map(([label,key])=><tr key={key}>
                  <td style={{...tdBase,padding:"5px 12px",fontSize:12,color:T.colorTableMuted,textAlign:"left",position:"sticky",left:0,background:T.bgTableSticky}}>{label}</td>
                  <td style={{...tdBase,fontSize:10,color:T.text3,fontFamily:mono,position:"sticky",left:155,background:T.bgTableSticky}}>pontos</td>
                  {datas.map(d=>{const sc=calcClifScores(scoreInputs(d),idadeDoLeito(leito));const faltam=sc.faltam||[];return <td key={d} style={tdBase}><button onClick={()=>setScoreEditor({date:d,type:'clif',values:scoreInputs(d)})} title={faltam.length?`Completar: ${faltam.join(', ')}`:JSON.stringify(sc.componentes)} style={{border:0,background:"transparent",cursor:"pointer",fontFamily:mono,fontWeight:700,color:faltam.length?"#fbbf24":"#fb923c"}}>{faltam.length?`completar ${faltam.length}`:sc[key]}</button></td>})}
                </tr>)}
              </>}
              {leito.labSOFA&&<>
                <tr><td colSpan={2+datas.length} style={{padding:"7px 12px",fontSize:10,fontWeight:700,color:"#f87171",background:"rgba(248,113,113,.07)",fontFamily:mono,letterSpacing:1.5,borderBottom:`1px solid ${T.borderTableRow}`}}>SEPSE — SOFA (PIOR VALOR EM 24H)</td></tr>
                <tr><td style={{...tdBase,padding:"5px 12px",fontSize:12,color:T.colorTableMuted,textAlign:"left",position:"sticky",left:0,background:T.bgTableSticky}}>SOFA</td><td style={{...tdBase,fontSize:10,color:T.text3,fontFamily:mono,position:"sticky",left:155,background:T.bgTableSticky}}>pontos</td>
                  {datas.map(d=>{const sc=calcSofa(scoreInputs(d)),faltam=sc.faltam||[];return <td key={d} style={tdBase}><button onClick={()=>setScoreEditor({date:d,type:'sofa',values:scoreInputs(d)})} title={faltam.length?`Completar: ${faltam.join(', ')}`:JSON.stringify(sc.componentes)} style={{border:0,background:"transparent",cursor:"pointer",fontFamily:mono,fontWeight:700,color:faltam.length?"#fbbf24":"#f87171"}}>{faltam.length?`completar ${faltam.length}`:sc.sofa}</button></td>})}
                </tr>
              </>}
              {GRUPOS_LAB.map(({grupo,params})=>(
                <React.Fragment key={grupo}>
                  <tr>
                    <td colSpan={2+datas.length} style={{padding:"7px 12px",fontSize:10,fontWeight:700,color:T.text3,background:T.bgTableGroup,fontFamily:mono,letterSpacing:1.5,borderBottom:`1px solid ${T.borderTableRow}`}}>
                      {grupo}
                    </td>
                  </tr>
                  {params.map(({key,label,unit})=>(
                    <React.Fragment key={key}>
                    <tr
                      onMouseEnter={e=>e.currentTarget.style.background=T.bgCardHover}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{...tdBase,padding:"4px 12px",fontSize:12,color:T.colorTableMuted,textAlign:"left",position:"sticky",left:0,background:T.bgTableSticky}}>{label}</td>
                      <td style={{...tdBase,fontSize:10,color:T.text3,fontFamily:mono,position:"sticky",left:155,background:T.bgTableSticky}}>{unit}</td>
                      {datas.map(d=>{
                        const ativo=isHoje(d);
                        const val=getVal(d,key);
                        const idxD=datas.indexOf(d);
                        const ant=idxD>0?getVal(datas[idxD-1],key):"";
                        const nivel=val?classificarLab(key,val,ant):null;
                        const negrito=nivel==="importante"||ativo;
                        return (
                          <td key={d} style={{...tdBase,background:ativo?"rgba(56,189,248,0.03)":undefined}}>
                            <input data-nav value={val} onChange={e=>setVal(d,key,e.target.value)} onKeyDown={e=>navCell(e,key,datas.indexOf(d))}
                              style={{width:"100%",background:"transparent",border:"none",
                                color:corNivelLab(nivel,T.colorTableInput),
                                fontSize:12,fontFamily:mono,textAlign:"center",padding:"3px 4px",outline:"none",
                                fontWeight:negrito?700:400}}
                              placeholder="—"
                            />
                          </td>
                        );
                      })}
                    </tr>
                    {/* TFG abaixo da creatinina */}
                    {key==="cr" && (leito.dataNascimento||leito.idadeAnos||leito.peso) && (()=>{
                      const idadeA = idadeDoLeito(leito);
                      const peso = parseFloat(leito.peso)||null;
                      const sexo = leito.sexo||"M";
                      const tfgRows = [
                        { id:"ckdepi", lbl:"↳ CKD-EPI 2021",   unit:"mL/min/1.73m²",
                          calc:(d)=>calcCKDEPI(getVal(d,"cr"),idadeA,sexo) },
                        { id:"cg",     lbl:"↳ Cockcroft-Gault", unit:"mL/min",
                          calc:(d)=>calcCockcroftGault(getVal(d,"cr"),idadeA,peso,sexo) },
                        { id:"kegfr",  lbl:"↳ KeGFR (Chen)",    unit:"mL/min",
                          calc:(d,di)=>calcKeGFR(di>0?getVal(datas[di-1],"cr"):null,getVal(d,"cr"),peso,sexo,idadeA) },
                      ];
                      const tfgSel = leito.tfgSel || {};
                      const setSel = (d, fid) => {
                        const novo = {...tfgSel, [d]: fid};
                        onChange({...data, __meta__: {...(data.__meta__||{})}});
                        // store in leito
                        if(onLeitoChange) onLeitoChange({...leito, tfgSel: novo});
                      };
                      return tfgRows.map(row=>(
                        <tr key={row.id} style={{opacity:0.85}}>
                          <td style={{...tdBase,padding:"3px 12px",fontSize:10,color:"#64748b",textAlign:"left",fontStyle:"italic",position:"sticky",left:0,background:T.bgTableSticky}}>
                            {row.lbl}
                          </td>
                          <td style={{...tdBase,fontSize:9,color:"#475569",fontFamily:mono,position:"sticky",left:155,background:T.bgTableSticky}}>
                            {row.unit}
                          </td>
                          {datas.map((d,di)=>{
                            const val=row.calc(d,di);
                            const selId = tfgSel[d];
                            const isSel = selId === row.id;
                            const ativo = isHoje(d);
                            return (
                              <td key={d} style={{...tdBase,background:isSel?"rgba(52,211,153,0.06)":ativo?"rgba(56,189,248,0.02)":undefined,
                                outline:isSel?`1px solid rgba(52,211,153,0.3)`:"none"}}>
                                {val!==null ? (
                                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                                    <div style={{textAlign:"center",fontSize:11,fontFamily:mono,padding:"2px 3px",
                                      color:isSel?"#34d399":corTFG(val),fontWeight:isSel?700:600}}>
                                      {val}<span style={{fontSize:9,color:"#475569",marginLeft:2}}>{stageCKD(val)}</span>
                                    </div>
                                    <button onClick={()=>setSel(d,isSel?null:row.id)}
                                      title={isSel?"Desmarcar TFG selecionada":"Usar esta TFG para ATB e evolução"}
                                      style={{background:"none",border:"none",cursor:"pointer",fontSize:11,
                                        color:isSel?"#34d399":"#334155",padding:"0 2px",lineHeight:1}}>
                                      {isSel?"✓":"○"}
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{textAlign:"center",fontSize:11,color:"#1e293b"}}>—</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    })()}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
              {/* Exames extras dinâmicos */}
              {extrasKeys.length > 0 && (
                <React.Fragment>
                  <tr>
                    <td colSpan={2+datas.length} style={{padding:"7px 12px",fontSize:10,fontWeight:700,color:T.text3,background:T.bgTableGroup,fontFamily:mono,letterSpacing:1.5,borderBottom:`1px solid ${T.borderTableRow}`}}>
                      ⭐ Exames Extras
                    </td>
                  </tr>
                  {extrasKeys.map(k=>{
                    const nomeAmigavel = k.replace(/^_extra_/,'').replace(/_/g,' ');
                    const nomeCapitalizado = nomeAmigavel.charAt(0).toUpperCase() + nomeAmigavel.slice(1);
                    // Categoria do exame: salva em data.__extraCats__
                    const catAtual = (data.__extraCats__||{})[k] || "";
                    const CATS_LAB = [
                      {k:"",        label:"— Sem categoria —", cor:"#475569"},
                      {k:"vanco",   label:"💊 Vancomicina",      cor:"#38bdf8"},
                      {k:"inf",     label:"🔴 Infeccioso",       cor:"#f59e0b"},
                      {k:"hb",      label:"🩸 Hematológico",    cor:"#f87171"},
                      {k:"cr",      label:"🫘 Renal/Metabólico", cor:"#34d399"},
                      {k:"tgo",     label:"🫀 Hepatograma",      cor:"#fb923c"},
                      {k:"trop",    label:"❤️ Cardíaco",         cor:"#f87171"},
                      {k:"po2",     label:"🫁 Gasometria",       cor:"#38bdf8"},
                      {k:"he",      label:"🩸 Hematológico (legado)", cor:"#f87171"},
                    ];
                    return (
                      <tr key={k}
                        onMouseEnter={e=>e.currentTarget.style.background=T.bgCardHover}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{...tdBase,padding:"4px 8px 4px 12px",textAlign:"left",position:"sticky",left:0,background:T.bgTableSticky}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            <span style={{fontSize:12,color:"#fcd34d"}}>{nomeCapitalizado}</span>
                            <select value={catAtual}
                              onChange={e=>{
                                const newCats = {...(data.__extraCats__||{}), [k]: e.target.value};
                                onChange({...data, __extraCats__: newCats});
                              }}
                              style={{fontSize:9,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:4,padding:"1px 4px",color:"#64748b",fontFamily:"inherit",cursor:"pointer",maxWidth:120}}>
                              {CATS_LAB.map(c=>(
                                <option key={c.k} value={c.k} style={{background:"#0c1a10"}}>{c.label}</option>
                              ))}
                            </select>
                            <button onClick={()=>{
                              // Remove o exame de todos os dias
                              const novo={};
                              Object.keys(data).forEach(d=>{
                                if(d==="__extraCats__"){ const cats={...data[d]}; delete cats[k]; novo[d]=cats; }
                                else { const dd={...data[d]}; delete dd[k]; novo[d]=dd; }
                              });
                              onChange(novo);
                            }} style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:10,padding:"0 2px"}} title="Remover exame">✕</button>
                          </div>
                        </td>
                        <td style={{...tdBase,fontSize:10,color:T.text3,fontFamily:mono,position:"sticky",left:155,background:T.bgTableSticky}}>—</td>
                        {datas.map(d=>{
                          const ativo=isHoje(d);
                          const raw = data[d]?.[k] || "";
                          return (
                            <td key={d} style={{...tdBase,background:ativo?"rgba(56,189,248,0.03)":undefined}}>
                              <input
                                value={raw}
                                onChange={e=>setVal(d,k,e.target.value)}
                                style={{width:"100%",background:"transparent",border:"none",
                                  color:ativo?"#fcd34d":"#e2e8f0",
                                  fontSize:12,fontFamily:mono,textAlign:"center",padding:"3px 4px",outline:"none",
                                  fontWeight:ativo?700:400}}
                                placeholder="—"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              )}
            </tbody>
          </table>
        </div>
      ))}

      <div style={{marginTop:8,fontSize:11,color:"#475569",display:"flex",gap:16,flexWrap:"wrap"}}>
        {tabela==="labs" && <>
          <span style={{color:"#34d399"}}>▼ verde = queda</span>
          <span style={{color:"#f87171"}}>▲ vermelho = subida</span>
        </>}
        <span>· Clique para editar · ✕ remove a coluna do dia</span>
      </div>

      {/* Tabela de Controles 24h */}
      {tabela==="controles" && (
        datas.length === 0 ? (
          <div style={{padding:40,textAlign:"center",color:"#334155",fontSize:13}}>
            Adicione um dia para registrar os controles.
          </div>
        ) : (
          <div>
            {/* Botão para adicionar dreno/SNG/evac opcional */}
            <div style={{display:"flex",gap:6,alignItems:"flex-start",flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:260}}><OptionalDrenosUI data={data} onChange={onChange} datas={datas} hoje={hoje} customCtrls={customCtrls} onCustomCtrlChange={onCustomCtrlChange}/></div>
              <button onClick={()=>onLeitoChange&&onLeitoChange({...leito,ctrlGrupoNeurologico:!leito.ctrlGrupoNeurologico})}
                style={{padding:"4px 10px",background:leito.ctrlGrupoNeurologico?"rgba(167,139,250,0.12)":"rgba(255,255,255,0.03)",border:`1px solid ${leito.ctrlGrupoNeurologico?"rgba(167,139,250,0.35)":"rgba(255,255,255,0.08)"}`,borderRadius:6,color:leito.ctrlGrupoNeurologico?"#c084fc":"#475569",cursor:"pointer",fontSize:11,whiteSpace:"nowrap"}}>
                🧠 Neurocrítico
              </button>
            </div>
            <div style={{overflowX:"auto",borderRadius:10,border:`1px solid ${T.borderTable}`,marginTop:8}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <th style={{...thStyle(false),textAlign:"left",minWidth:155,padding:"8px 12px",position:"sticky",left:0,zIndex:2,background:T.bgTableHead}}>Parâmetro</th>
                  <th style={{...thStyle(false),minWidth:46,position:"sticky",left:155,zIndex:2,background:T.bgTableHead}}>Un.</th>
                  {datas.map(d=>(
                    <th key={d} style={thStyle(isHoje(d))}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                        {fmtData(d).split('\n').map((linha,i)=>(
                          <span key={i} style={{fontSize:i===1?10:11}}>{linha}</span>
                        ))}
                        {isHoje(d)&&<span style={{fontSize:9,letterSpacing:0.5,color:T.accent}}>HOJE</span>}
                        {!isHoje(d)&&<button onClick={()=>removerColuna(d)} style={{background:"none",border:"none",color:T.text4,cursor:"pointer",fontSize:9,padding:0}}>✕</button>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GRUPOS_CONTROLES.map(({grupo,params,opcional})=>{
                  if(opcional){const hasD=params.some(({key})=>datas.some(d=>getVal(d,key)));const en=leito.ctrlGrupoNeurologico;if(!hasD&&!en)return null;}
                  return(
                  <React.Fragment key={grupo}>
                    <tr>
                      <td colSpan={2+datas.length} style={{padding:"7px 12px",fontSize:10,fontWeight:700,color:T.accent,background:T.bgTableGroupCtrl,fontFamily:mono,letterSpacing:1.5,borderBottom:`1px solid ${T.borderTableRow}`}}>
                        {grupo}
                      </td>
                    </tr>
                    {params.map(({key,label,unit})=>(
                      <React.Fragment key={key}>
                      <tr
                        onMouseEnter={e=>e.currentTarget.style.background=T.bgCardHover}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{...tdBase,padding:"4px 12px",fontSize:12,color:T.colorTableMuted,textAlign:"left",position:"sticky",left:0,background:T.bgTableSticky}}>{label}</td>
                        <td style={{...tdBase,fontSize:10,color:T.text3,fontFamily:mono,position:"sticky",left:155,background:T.bgTableSticky}}>{unit}</td>
                        {datas.map(d=>{
                          const ativo=isHoje(d);
                          const val=getVal(d,key);
                          return (
                            <td key={d} style={{...tdBase,background:ativo?"rgba(56,189,248,0.04)":undefined}}>
                              <input data-nav value={val} onChange={e=>setVal(d,key,e.target.value)} onKeyDown={e=>navCell(e,key,datas.indexOf(d))}
                                style={{width:"100%",background:"transparent",border:"none",
                                  color:ativo?T.accent:T.colorTableInput,
                                  fontSize:12,fontFamily:mono,textAlign:"center",padding:"3px 4px",outline:"none",
                                  fontWeight:ativo?700:400}}
                                placeholder="—"
                              />
                            </td>
                          );
                        })}
                      </tr>
                      {/* Balanço acumulado automático */}
                      {key==="c24_bh" && (
                        <tr style={{opacity:0.80}}>
                          <td style={{...tdBase,padding:"4px 12px",fontSize:11,color:"#a78bfa",fontStyle:"italic",textAlign:"left",position:"sticky",left:0,background:"transparent"}}>↳ BH Acum.</td>
                          <td style={{...tdBase,fontSize:10,color:"#64748b",position:"sticky",left:155,background:"transparent"}}>mL</td>
                          {datas.map(d=>{
                            const manual = getVal(d,"c24_bh_ac");
                            if (manual) return <td key={d} style={{...tdBase}}><div style={{textAlign:"center",fontSize:11,padding:"3px 4px",color:"#a78bfa",fontWeight:600}}>{manual}</div></td>;
                            const datasAte = datas.filter(x=>x<=d);
                            let acum=parseFloat(leito.bhPrevio||0)||0; let algum=!!acum;
                            datasAte.forEach(x=>{ const bh=parseFloat(getVal(x,"c24_bh")); if(!isNaN(bh)){acum+=bh;algum=true;} });
                            const acumStr = algum?(acum>=0?"+":"")+Math.round(acum).toLocaleString("pt-BR"):"";
                            return <td key={d} style={{...tdBase}}><div style={{textAlign:"center",fontSize:11,padding:"3px 4px",color:algum?(acum>0?"#f87171":acum<0?"#34d399":"#94a3b8"):"#334155",fontWeight:algum?700:400}}>{acumStr||"—"}</div></td>;
                          })}
                        </tr>
                      )}
                      {/* Débito urinário calculado — logo abaixo da Diurese */}
                      {key==="c24_diur" && parseFloat(leito.peso) > 0 && (
                        <tr style={{opacity:0.75}}>
                          <td style={{...tdBase,padding:"4px 12px",fontSize:11,color:T.text3,textAlign:"left",position:"sticky",left:0,background:T.bgTableSticky,fontStyle:"italic"}}>↳ Débito urinário</td>
                          <td style={{...tdBase,fontSize:10,color:T.text4,fontFamily:mono,position:"sticky",left:155,background:T.bgTableSticky}}>mL/kg/h</td>
                          {datas.map(d=>{
                            const ativo=isHoje(d);
                            const diur=parseFloat(getVal(d,"c24_diur"));
                            const peso=parseFloat(leito.peso);
                            const calc=(diur&&peso)?(diur/(24*peso)).toFixed(2):"";
                            const baixo=calc&&parseFloat(calc)<0.5;
                            return (
                              <td key={d} style={{...tdBase,background:ativo?"rgba(56,189,248,0.02)":undefined}}>
                                <div style={{textAlign:"center",fontSize:11,fontFamily:mono,padding:"3px 4px",
                                  color:calc?(baixo?"#f87171":"#34d399"):"#334155",fontWeight:calc?600:400}}>
                                  {calc||"—"}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      )}
                      {/* Kcal e ptn calculados — logo abaixo do Vol. Dieta */}
                      {key==="c24_diet_vol" && (() => {
                        const dietaSel = getDietasCatalogo(config||{}).find(d=>d.id===leito.dieta?.catalogId);
                        const metaAbs  = calcMetaNutricional(leito);
                        if (!dietaSel) return null;
                        const rows = [
                          { lbl:"↳ Kcal recebida", unit:"kcal", calc:(vol)=>(vol*dietaSel.kcalML).toFixed(0), meta:metaAbs?.kcal, cor:(v,m)=>m?(v/m>=0.8?"#34d399":"#f87171"):"#94a3b8" },
                          { lbl:"↳ Ptn recebida",  unit:"g",    calc:(vol)=>(vol*dietaSel.ptnML+(leito.dieta?.moduloProteina?.ativo?(parseFloat(leito.dieta.moduloProteina.gramas)||0):0)).toFixed(1), meta:metaAbs?.ptn,  cor:(v,m)=>m?(v/m>=0.8?"#34d399":"#f87171"):"#94a3b8" },
                        ];
                        return rows.map(row=>(
                          <tr key={row.lbl} style={{opacity:0.8}}>
                            <td style={{...tdBase,padding:"4px 12px",fontSize:11,color:T.text3,textAlign:"left",position:"sticky",left:0,background:T.bgTableSticky,fontStyle:"italic"}}>{row.lbl}</td>
                            <td style={{...tdBase,fontSize:10,color:T.text4,fontFamily:mono,position:"sticky",left:155,background:T.bgTableSticky}}>{row.unit}</td>
                            {datas.map(d=>{
                              const ativo=isHoje(d);
                              const vol=parseFloat(getVal(d,"c24_diet_vol"));
                              const calc=vol?row.calc(vol):"";
                              const pct=calc&&row.meta?Math.round(parseFloat(calc)/row.meta*100):null;
                              const cor=calc?row.cor(parseFloat(calc),row.meta):"#334155";
                              return (
                                <td key={d} style={{...tdBase,background:ativo?"rgba(56,189,248,0.02)":undefined}}>
                                  <div style={{textAlign:"center",fontSize:11,fontFamily:mono,padding:"3px 4px",color:cor,fontWeight:calc?600:400}}>
                                    {calc ? `${calc}${pct!==null?` (${pct}%)`:""}`:"—"}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ));
                      })()}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                   );
                  })}
                {/* Custom controles (_ctrl_*) — campos adicionados pelo usuário */}
                {customCtrls.length > 0 && customCtrls.map(cc => (
                  <tr key={cc.key}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bgCardHover}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{...tdBase,padding:"4px 12px",fontSize:12,color:T.colorTableMuted,textAlign:"left",position:"sticky",left:0,background:T.bgTableSticky}}>
                      {cc.label}
                      <span style={{marginLeft:4,fontSize:9,color:"#475569"}}>[{(CTRL_SISTEMAS.find(s=>s.key===cc.sistema)||{label:"—"}).label}]</span>
                    </td>
                    <td style={{...tdBase,fontSize:10,color:T.text3,fontFamily:mono,position:"sticky",left:155,background:T.bgTableSticky}}>{cc.unit||""}</td>
                    {datas.map(d=>{
                      const ativo=isHoje(d);
                      const val=getVal(d,cc.key);
                      return(
                        <td key={d} style={{...tdBase,background:ativo?"rgba(56,189,248,0.04)":undefined}}>
                          <input data-nav value={val} onChange={e=>setVal(d,cc.key,e.target.value)}
                            onKeyDown={e=>navCell(e,cc.key,datas.indexOf(d))}
                            style={{width:"100%",textAlign:"center",fontSize:12,fontFamily:mono,background:"transparent",border:"none",color:T.text1,padding:"3px 4px"}}/>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Drenos dinâmicos (_dreno_*) */}
                {(()=>{
                  const drenoKeys = Array.from(new Set(datas.flatMap(d=>Object.keys(data[d]||{}).filter(k=>k.startsWith('_dreno_')))));
                  if (!drenoKeys.length) return null;
                  return (
                    <React.Fragment>
                      <tr><td colSpan={2+datas.length} style={{padding:"7px 12px",fontSize:10,fontWeight:700,color:"#34d399",background:T.bgTableGroup,fontFamily:mono,letterSpacing:1.5,borderBottom:`1px solid ${T.borderTableRow}`}}>
                        💧 Drenos / SNG / Evacuações (opcionais)
                      </td></tr>
                      {drenoKeys.map(k=>{
                        const nomeBruto = k.replace(/^_dreno_/,'').replace(/_/g,' ');
                        const nome = nomeBruto.charAt(0).toUpperCase()+nomeBruto.slice(1);
                        return (
                          <tr key={k}
                            onMouseEnter={e=>e.currentTarget.style.background=T.bgCardHover}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <td style={{...tdBase,padding:"4px 12px",fontSize:12,color:"#34d399",textAlign:"left",position:"sticky",left:0,background:T.bgTableSticky,display:"flex",alignItems:"center",gap:6}}>
                              {nome}
                              <button title="Remover linha" onClick={()=>{
                                const novo={...data};
                                datas.forEach(d=>{if(novo[d]){delete novo[d][k];}});
                                onChange(novo);
                              }} style={{background:"none",border:"none",color:T.text3,cursor:"pointer",fontSize:10,padding:0}}>✕</button>
                            </td>
                            <td style={{...tdBase,fontSize:10,color:T.text3,fontFamily:mono,position:"sticky",left:155,background:T.bgTableSticky}}>mL/x</td>
                            {datas.map(d=>{
                              const ativo=isHoje(d);
                              const val=getVal(d,k);
                              return (
                                <td key={d} style={{...tdBase,background:ativo?"rgba(52,211,153,0.04)":undefined}}>
                                  <input value={val} onChange={e=>setVal(d,k,e.target.value)}
                                    style={{width:"100%",background:"transparent",border:"none",
                                      color:ativo?"#34d399":T.colorTableInput,
                                      fontSize:12,fontFamily:mono,textAlign:"center",padding:"3px 4px",outline:"none",
                                      fontWeight:ativo?700:400}}
                                    placeholder="—"/>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })()}
              </tbody>
            </table>
          </div>
          </div>
        )
      )}
      {scoreEditor&&(()=>{
        const v=scoreEditor.values||{};
        const camposBase=[['bilirrubina','Bilirrubina','mg/dL'],['creatinina','Creatinina','mg/dL'],['plaquetas','Plaquetas','mil/mm³'],['leucocitos','Leucócitos','mil/mm³'],['inr','INR',''],['diurese','Diurese 24h','mL'],['pf','PaO₂/FiO₂',''],['sf','SpO₂/FiO₂',''],['gcs','Glasgow','']];
        return <div onClick={()=>setScoreEditor(null)} style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(2,8,5,.72)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{width:'min(720px,96vw)',maxHeight:'88vh',overflowY:'auto',background:T.bgCard,border:`1px solid ${scoreEditor.type==='sofa'?'rgba(248,113,113,.45)':'rgba(251,146,60,.45)'}`,borderRadius:14,padding:18,boxShadow:'0 24px 80px rgba(0,0,0,.55)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}><b style={{color:T.text1}}>Completar variáveis · {scoreEditor.type==='sofa'?'SOFA':'CLIF'} · {fmtData(scoreEditor.date).replace('\n',' ')}</b><button onClick={()=>setScoreEditor(null)} style={{background:'none',border:0,color:T.text3,cursor:'pointer'}}>✕</button></div>
            <div style={{fontSize:11,color:T.text3,marginBottom:14}}>Dados já existentes foram preenchidos automaticamente. Revise o pior valor das últimas 24h; os dados ficam salvos com esta data para análise longitudinal.</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:9}}>
              {camposBase.filter(([k])=>scoreEditor.type==='sofa'?!['leucocitos','inr','sf'].includes(k):!['plaquetas','diurese','gcs'].includes(k)).map(([k,l,u])=><label key={k} style={{fontSize:10,color:T.text3,fontFamily:mono}}>{l}{u?` (${u})`:''}<input value={v[k]||''} onChange={e=>setScoreEditor({...scoreEditor,values:{...v,[k]:e.target.value}})} style={{display:'block',width:'100%',marginTop:4,padding:'8px 9px',borderRadius:7,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1}}/></label>)}
              {scoreEditor.type==='clif'&&<><label style={{fontSize:10,color:T.text3,fontFamily:mono}}>ENCEFALOPATIA (WEST HAVEN)<select value={v.encefalopatia||''} onChange={e=>setScoreEditor({...scoreEditor,values:{...v,encefalopatia:e.target.value}})} style={{display:'block',width:'100%',marginTop:4,padding:8,borderRadius:7,background:T.bgInput,color:T.text1}}><option value="">Selecionar…</option><option value="0">Grau 0</option><option value="1-2">Graus I–II</option><option value="3-4">Graus III–IV</option></select></label><label style={{fontSize:10,color:T.text3,fontFamily:mono}}>CIRCULAÇÃO<select value={v.circulacao||''} onChange={e=>setScoreEditor({...scoreEditor,values:{...v,circulacao:e.target.value}})} style={{display:'block',width:'100%',marginTop:4,padding:8,borderRadius:7,background:T.bgInput,color:T.text1}}><option value="">Selecionar…</option><option value="normal">PAM ≥70</option><option value="pam_baixa">PAM &lt;70</option><option value="dva_media">Vasopressor</option></select></label><label style={{fontSize:11,color:T.text2,display:'flex',gap:7,alignItems:'center'}}><input type="checkbox" checked={!!v.rrt} onChange={e=>setScoreEditor({...scoreEditor,values:{...v,rrt:e.target.checked}})}/> Terapia renal substitutiva</label></>}
              {scoreEditor.type==='sofa'&&<><label style={{fontSize:10,color:T.text3,fontFamily:mono}}>CIRCULAÇÃO / DVA<select value={v.circulacaoSofa||''} onChange={e=>setScoreEditor({...scoreEditor,values:{...v,circulacaoSofa:e.target.value}})} style={{display:'block',width:'100%',marginTop:4,padding:8,borderRadius:7,background:T.bgInput,color:T.text1}}><option value="">Selecionar…</option><option value="normal">PAM ≥70, sem DVA</option><option value="pam_baixa">PAM &lt;70</option><option value="dva_baixa">Dopamina ≤5 ou dobutamina</option><option value="dva_media">Nora/adrenalina ≤0,1 ou dopamina &gt;5</option><option value="dva_alta">Nora/adrenalina &gt;0,1 ou dopamina &gt;15</option></select></label><label style={{fontSize:11,color:T.text2,display:'flex',gap:7,alignItems:'center'}}><input type="checkbox" checked={!!v.suporteResp} onChange={e=>setScoreEditor({...scoreEditor,values:{...v,suporteResp:e.target.checked}})}/> Em suporte ventilatório</label></>}
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}><button onClick={()=>setScoreEditor(null)} style={{padding:'8px 12px',borderRadius:7,border:`1px solid ${T.border}`,background:'transparent',color:T.text2}}>Cancelar</button><button onClick={()=>{salvarScoreInputs(scoreEditor.date,v);setScoreEditor(null)}} style={{padding:'8px 14px',borderRadius:7,border:0,background:scoreEditor.type==='sofa'?'#ef4444':'#f97316',color:'#fff',fontWeight:700,cursor:'pointer'}}>Salvar variáveis</button></div>
          </div>
        </div>;
      })()}
    </div>
  );
}


// ── EvolucaoEditor ────────────────────────────────────────────────────────────
const EVOLUCAO_VAZIA = {
  hda:"",
  nRASS:"", nGlasgow:"", nPupilas:"", nDor:"", nEF:"", nEFExtra:"", n24h:"", nSeda:"", nAnalg:"", nPsiq:"", nObs:"",
  cvHemo:"", cvCardioscopia:"", cvAusculta:"", cvEF:"", cv24h:"", cvDVA:"", cvMed:"", cvTEC:"", cvLact:"", cvDeltaCO2:"", cvDeltaPP:"", cvTropo:"", cvObs:"",
  reVM:"", reMV:"", reRA:"", reEF:"", re24h:"", reGaso:"", rePocus:"", reLUS:"", reObs:"",
  rm24h:"", rmLabs:"", rmTRS:"", rmObs:"",
  tgEF:"", tg24h:"", tgLaxativos:"", tgLabs:"", tgPocus:"", tgObs:"",
  heTemp:"", heLabs:"", heMed:"", heAtb:"", heProf:"", heObs:"", heCulturas:"",
  probAtivos:"", probResolvidos:"",
  impressao:"",
  _datas:{},
};

const normalizarNomeSbari = valor => String(valor||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g," ").trim().toLowerCase();
const nomesCompativeisSbari = (a,b) => {
  const na=normalizarNomeSbari(a),nb=normalizarNomeSbari(b);if(!na||!nb)return false;if(na===nb)return true;
  if(Math.min(na.length,nb.length)>=8&&(na.includes(nb)||nb.includes(na)))return true;
  const ignorar=new Set(["de","da","do","das","dos","e"]);
  const tokens=n=>n.split(" ").filter(t=>t.length>1&&!ignorar.has(t));
  const ta=tokens(na),tb=tokens(nb);if(!ta.length||!tb.length||ta[0]!==tb[0])return false;
  const comuns=ta.filter(t=>tb.includes(t)).length;
  return comuns>=2&&comuns/Math.min(ta.length,tb.length)>=0.8;
};
const dataSbariParaIso = valor => {
  const m=String(valor||"").match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);if(!m)return "";
  let ano=m[3]?Number(m[3]):new Date().getFullYear();if(ano<100)ano+=2000;
  return `${ano}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
};
const evolucaoInicialSbari = p => ({...EVOLUCAO_VAZIA,
  hda:[p.situacao,p.background].filter(Boolean).join("\n"),
  nEF:p.assessment?.N||"",cvEF:p.assessment?.CV||"",reEF:p.assessment?.R||"",
  tgEF:p.assessment?.TGI||"",rm24h:p.assessment?.["R/M"]||"",heLabs:p.assessment?.["H/I"]||"",
  heAtb:[p.antibioticos,p.antibioticosPrevios&&`Prévios: ${p.antibioticosPrevios}`].filter(Boolean).join("\n"),
  probAtivos:p.recomendacoes||"",impressao:p.instrucoes||"",
});

function aplicarIA(dadosIA) {
  if (!dadosIA?.sistemas) return {};
  const s = dadosIA.sistemas;
  return {
    nEF:    s["Neurológico"]             || "",
    cvEF:   s["Hemodinâmico"]            || "",
    cv24h:  s["Hemodinâmico"]            || "",
    reVM:   s["Respiratório"]            || "",
    re24h:  s["Respiratório"]            || "",
    rmLabs: s["Renal/Metabólico"]        || "",
    rm24h:  s["Renal/Metabólico"]        || "",
    tgEF:   s["Gastrointestinal"]        || "",
    heLabs: s["Hematológico/Infeccioso"] || "",
  };
}


// ── ProbFloating — painel flutuante de Problemas Ativos ──────────────────────
const META_PRIORIDADES = {
  vermelho:{label:"Urgente",cor:"#ef4444",ordem:0},
  amarelo:{label:"Pode esperar",cor:"#f59e0b",ordem:1},
  verde:{label:"Sem pressa",cor:"#22c55e",ordem:2},
};
const metaPrioridade = m => META_PRIORIDADES[m?.prioridade] || META_PRIORIDADES.amarelo;
const ordenarMetas = metas => [...(metas||[])].sort((a,b)=>{
  const manual = Number.isFinite(a?.ordem)||Number.isFinite(b?.ordem);
  return manual ? ((a?.ordem??9999)-(b?.ordem??9999)) : (metaPrioridade(a).ordem-metaPrioridade(b).ordem);
});
const proximaPrioridade = atual => ({vermelho:"amarelo",amarelo:"verde",verde:"vermelho"}[atual||"amarelo"]);
const alterarPrioridadeSemMover = (metas,id,prioridade) => ordenarMetas(metas).map((m,i)=>({...m,ordem:i,...(m.id===id?{prioridade}:{})}));
const reordenarMetasPorPrioridade = metas => ordenarMetas((metas||[]).map(m=>({...m,ordem:undefined})));
function MetaPriorityDot({meta,metas,onChange}) {
  const timerRef=useRef(null);
  const metasRef=useRef(metas);
  metasRef.current=metas;
  useEffect(()=>()=>timerRef.current&&clearTimeout(timerRef.current),[]);
  const atual=metaPrioridade(meta);
  const trocar=e=>{
    e.stopPropagation();
    const prioridadeAtual=(metasRef.current.find(m=>m.id===meta.id)||meta).prioridade;
    const novas=alterarPrioridadeSemMover(metasRef.current,meta.id,proximaPrioridade(prioridadeAtual));
    metasRef.current=novas;
    onChange(novas);
    if(timerRef.current) clearTimeout(timerRef.current);
    timerRef.current=setTimeout(()=>onChange(reordenarMetasPorPrioridade(metasRef.current)),1000);
  };
  return <button onClick={trocar} title={`Prioridade: ${atual.label}. Clique para mudar; a lista reordena em 1 segundo.`} style={{width:12,height:12,borderRadius:"50%",border:"1px solid rgba(255,255,255,.45)",background:atual.cor,cursor:"pointer",padding:0,marginTop:3,flexShrink:0,transition:"background .15s"}}/>;
}
const editarTextoMeta = (metas,meta,onChange) => {
  const texto=window.prompt("Editar meta:",meta.texto||String(meta||""));
  if(texto!==null&&texto.trim()) onChange(metas.map(m=>m.id===meta.id?{...m,texto:texto.trim()}:m));
};

// Auto-contido (refs/estado próprios) para poder ser renderizado uma única vez,
// visível nas 5 abas do paciente (Paciente · Beira-leito · Tabela Clínica · Importar Print · Metas) — não só no Beira-leito.
function ProbFloating({ campos={}, onCampoEdit, metas=[], onMetaChange, leito={}, tabelaDataLeito={}, onLeitoChange, config={} }) {
  const T=useTheme();
  const [open, setOpen] = useState(true);
  const [openResolvidos, setOpenResolvidos] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [copiado, setCopiado] = useState({});
  const [menuEquipe,setMenuEquipe]=useState(null);
  const mono2 = "'DM Mono',monospace";
  const refs = React.useRef({});
  if (!refs.current.probAtivos) refs.current.probAtivos = React.createRef();
  if (!refs.current.probResolvidos) refs.current.probResolvidos = React.createRef();
  const hoje = new Date().toISOString().split("T")[0];
  const isAntigo = (fieldName) => { const d = campos._datas?.[fieldName]; return d && d < hoje; };
  const salvar = onCampoEdit || (()=>{});
  const pendentes = metas.filter(m=>!m.feito&&m.status!=="cumprido").length;
  const ultimaEvacuacao=campos.tgUltEvac||leito.tgUltEvac||"";
  const diasSemEvacuar=ultimaEvacuacao?Math.floor((new Date(hoje+"T12:00:00")-new Date(ultimaEvacuacao+"T00:00:00"))/86400000):null;
  const riscoLAMG=avaliarRiscoLAMG(leito,tabelaDataLeito,campos);
  const problemasAuto=problemasAtivosAutomaticos(leito,tabelaDataLeito,campos,config);

  if (minimized) {
    return (
      <button onClick={()=>setMinimized(false)} title="Expandir problemas ativos / metas" className="prob-floating" style={{
        position:"fixed", right:20, top:100, zIndex:200,
        display:"flex", alignItems:"center", gap:6,
        background:T.bgCard, border:"1px solid rgba(239,68,68,0.45)",
        borderRadius:20, padding:"8px 14px", cursor:"pointer",
        filter:T.colorScheme==="light"?"drop-shadow(0 5px 16px rgba(15,23,42,0.18))":"drop-shadow(0 4px 24px rgba(0,0,0,0.5))",
      }}>
        <span style={{fontSize:14}}>🔴</span>
        {pendentes>0 && <span style={{fontSize:11,fontFamily:mono2,fontWeight:700,color:"#f87171"}}>{pendentes}</span>}
      </button>
    );
  }

  return (
    <div style={{
      position:"fixed", right:20, top:100, zIndex:200,
      width:260, maxHeight:"80vh", display:"flex", flexDirection:"column",
      filter:T.colorScheme==="light"?"drop-shadow(0 5px 16px rgba(15,23,42,0.18))":"drop-shadow(0 4px 24px rgba(0,0,0,0.5))",
      borderRadius:12, overflow:"hidden",
    }} className="prob-floating">
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",
        background:T.bgCardHover,border:"1px solid rgba(239,68,68,0.40)",
        borderBottom:"none",borderRadius:"12px 12px 0 0",cursor:"pointer"}}>
        <span onClick={()=>setOpen(o=>!o)} style={{fontSize:11,fontFamily:mono2,color:"#f87171",fontWeight:700,flex:1,cursor:"pointer"}}>🔴 PROBLEMAS ATIVOS</span>
        <button onClick={()=>setMinimized(true)} title="Minimizar" style={{background:"none",border:"none",color:T.text3,cursor:"pointer",fontSize:12,padding:"0 2px"}}>—</button>
        <span onClick={()=>setOpen(o=>!o)} style={{color:T.text3,fontSize:11,cursor:"pointer"}}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div style={{background:T.bgCard,border:"1px solid rgba(239,68,68,0.32)",
          borderRadius:"0 0 12px 12px",padding:"10px 12px",overflowY:"auto",flex:1}}>
          {!!problemasAuto.length&&<div style={{display:"grid",gap:5,marginBottom:8}}>{problemasAuto.map(p=><div key={p.id} style={{padding:"6px 8px",borderRadius:7,border:"1px solid rgba(248,113,113,.28)",background:"rgba(248,113,113,.07)",fontSize:10,color:T.colorScheme==="light"?"#b91c1c":"#fca5a5",lineHeight:1.35}}>
            <b>{p.texto}</b>{p.detalhe&&<small style={{display:"block",color:T.text3,marginTop:1}}>{p.detalhe}</small>}
            {!!p.subitens?.length&&<div style={{marginTop:4,color:T.text2}}>{p.subitens.map(s=><div key={s}>└ {s}</div>)}</div>}
            {(p.id==="choque"||p.id==="sepse"&&p.texto.startsWith("Choque"))&&<select value={["","distributivo","hemorrágico","cardiogênico","obstrutivo","misto"].includes(leito.tipoChoque||"")?(leito.tipoChoque||""):"__outro__"} onChange={e=>{let tipo=e.target.value;if(tipo==="__outro__"){tipo=window.prompt("Caracterização do choque:","")?.trim()||leito.tipoChoque||"";}onLeitoChange?.({...leito,tipoChoque:tipo});}} style={{width:"100%",marginTop:5,padding:"4px 6px",borderRadius:5,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1,fontSize:10}}><option value="">Caracterizar choque…</option><option value="distributivo">Distributivo</option><option value="hemorrágico">Hemorrágico</option><option value="cardiogênico">Cardiogênico</option><option value="obstrutivo">Obstrutivo</option><option value="misto">Misto</option><option value="__outro__">Outro…</option></select>}
          </div>)}</div>}
          <details style={{margin:"0 0 7px",fontSize:9,color:T.text3}}><summary style={{cursor:"pointer"}}>Função renal · informar creatinina basal</summary><input type="number" step="0.01" min="0" defaultValue={leito.creatininaBasal||""} placeholder="Creatinina basal (mg/dL)" onBlur={e=>onLeitoChange?.({...leito,creatininaBasal:e.target.value})} style={{width:"100%",boxSizing:"border-box",marginTop:4,padding:"5px 7px",borderRadius:5,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1,fontSize:10}}/></details>
          <TA fieldRef={refs.current.probAtivos} defaultValue={campos.probAtivos} isAntigo={isAntigo("probAtivos")}
            sugestao={"1. Sepse foco pulmonar\n2. IRA oligúrica\n3. FA com RVR"}
            rows={7} fieldName="probAtivos" onBlurSave={salvar}/>
          <button onClick={()=>{
            const manual=refs.current.probAtivos?.current?.value||campos.probAtivos||"";
            const t=[...problemasAuto.map(textoProblemaAutomatico),manual].filter(Boolean).join("\n");
            if(t){navigator.clipboard?.writeText(t).catch(()=>{});
              setCopiado(c=>({...c,probAtivos:true}));
              setTimeout(()=>setCopiado(c=>({...c,probAtivos:false})),2000);}}}
            style={{width:"100%",marginTop:5,padding:"3px",background:"rgba(248,113,113,0.08)",
              border:"1px solid rgba(248,113,113,0.15)",borderRadius:6,
              color:"#f87171",cursor:"pointer",fontSize:10}}>
            {copiado.probAtivos?"✅ Copiado":"📋 Copiar"}
          </button>
          <div style={{marginTop:8,borderTop:"1px solid rgba(52,211,153,0.15)"}}>
            <div onClick={()=>setOpenResolvidos(o=>!o)}
              style={{padding:"5px 0",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:9,fontFamily:mono2,letterSpacing:2,color:"#34d399"}}>✅ RESOLVIDOS</span>
              <span style={{fontSize:9,color:"#334155",marginLeft:"auto"}}>{openResolvidos?"▲":"▼"}</span>
            </div>
            {openResolvidos&&<TA fieldRef={refs.current.probResolvidos} defaultValue={campos.probResolvidos} isAntigo={isAntigo("probResolvidos")}
              sugestao={"1. Choque séptico (D5)\n2. Acidose metabólica"} rows={3} fieldName="probResolvidos" onBlurSave={salvar}/>}
          </div>
          {/* ── Riscos do paciente ── */}
          <div style={{marginTop:8,borderTop:"1px solid rgba(251,146,60,.18)",paddingTop:7}}>
            <div style={{fontSize:9,fontFamily:mono2,letterSpacing:2,color:"#fb923c",marginBottom:6}}>⚠ RISCOS DO PACIENTE</div>
            <RefeedingRiskBox dados={leito} tabelaDataLeito={tabelaDataLeito} onChange={onLeitoChange}/>
            {diasSemEvacuar!==null&&diasSemEvacuar>2&&<div style={{marginTop:5,padding:"7px 8px",display:"flex",alignItems:"center",gap:7,borderRadius:7,border:"1px solid rgba(251,146,60,.38)",background:"rgba(251,146,60,.08)",color:"#fdba74",fontSize:10,lineHeight:1.35}}><span>⚠</span><span><b>Sem evacuação há {diasSemEvacuar} dias</b><small style={{display:"block",color:T.text3,marginTop:2}}>Última evacuação: {new Date(ultimaEvacuacao+"T00:00:00").toLocaleDateString("pt-BR")}</small></span></div>}
            {riscoLAMG.risco&&riscoLAMG.semProfilaxia&&<div style={{marginTop:5,padding:"7px 8px",display:"flex",alignItems:"flex-start",gap:7,borderRadius:7,border:"1px solid rgba(248,113,113,.42)",background:"rgba(248,113,113,.09)",color:"#fca5a5",fontSize:10,lineHeight:1.35}}><span>⚠</span><span><b>Avaliar profilaxia de lesão aguda da mucosa gástrica</b><small style={{display:"block",color:T.text3,marginTop:2}}>Sem profilaxia registrada · {riscoLAMG.criterios.join(" · ")}</small></span></div>}
          </div>
          {/* ── Metas / Pendências ── */}
          <div style={{marginTop:10,borderTop:"1px solid rgba(56,189,248,0.2)",paddingTop:8}}>
            <div style={{fontSize:9,fontFamily:mono2,letterSpacing:2,color:"#38bdf8",marginBottom:6}}>📌 METAS</div>
            {ordenarMetas(metas).map((m,i)=>(
              <div key={m.id||i} onContextMenu={e=>{e.preventDefault();e.stopPropagation();setMenuEquipe({x:e.clientX,y:e.clientY,metaId:m.id,metaIndex:metas.indexOf(m),equipe:m.equipe||""});}} title="Clique com o botão direito para definir a equipe" style={{display:"flex",alignItems:"flex-start",gap:5,marginBottom:4}}>
                <MetaPriorityDot meta={m} metas={metas} onChange={onMetaChange}/>
                <button onClick={()=>onMetaChange&&onMetaChange(metas.map(x=>x.id===m.id?{...x,feito:!x.feito}:x))}
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:12,padding:0,color:m.feito?"#34d399":"#334155",flexShrink:0}}>
                  {m.feito?"☑":"☐"}
                </button>
                <span title={metaPrioridade(m).label} style={{fontSize:10,color:m.feito?T.text4:T.text2,flex:1,borderLeft:`3px solid ${metaPrioridade(m).cor}`,paddingLeft:5,
                  textDecoration:m.feito?"line-through":"none",lineHeight:1.4}}>{m.texto||m}{m.equipe&&<small style={{display:"block",color:equipeCor(m.equipe),fontSize:8,marginTop:1}}>{equipeEmoji(m.equipe)} {equipeLabel(m.equipe)}</small>}</span>
                <button onClick={()=>onMetaChange&&editarTextoMeta(metas,m,onMetaChange)} title="Editar meta" style={{background:"none",border:"none",cursor:"pointer",fontSize:10,padding:0,color:"#38bdf8"}}>✎</button>
                <button onClick={()=>onMetaChange&&onMetaChange(metas.filter(x=>x.id!==m.id))}
                  title="Excluir meta"
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:10,padding:0,color:"#475569",flexShrink:0}}>
                  ✕
                </button>
              </div>
            ))}
            <button onClick={()=>{
              const txt=window.prompt("Nova meta:");
              if(txt&&onMetaChange) onMetaChange([...metas,{id:Date.now()+"",texto:txt.trim(),feito:false,prioridade:"amarelo"}]);
            }} style={{marginTop:4,width:"100%",padding:"3px 0",background:"rgba(56,189,248,0.06)",
              border:"1px solid rgba(56,189,248,0.15)",borderRadius:5,color:"#38bdf8",cursor:"pointer",fontSize:10}}>
              + meta
            </button>
          </div>
          <MetaEquipeMenu menu={menuEquipe} onClose={()=>setMenuEquipe(null)} onSelect={equipe=>onMetaChange&&onMetaChange(metas.map((m,i)=>(menuEquipe?.metaId?m.id===menuEquipe.metaId:i===menuEquipe?.metaIndex)?{...m,equipe}:m))}/>
        </div>
      )}
    </div>
  );
}



// ── PickField — campo com chips de seleção rápida ─────────────────────────
// Module-level state for PickField open/close (survives component remounts)
const _PF_OPEN = {};


function PickField({ label, options=[], value="", onChange, rows=2, placeholder="" }) {
  const T=useTheme();
  const _pfKey = label || options.join('|');
  const [open, setOpen] = useState(() => !!_PF_OPEN[_pfKey]);
  const taRef = React.useRef(null);
  const mono = "'DM Mono',monospace";

  const toggleOpen = () => {
    const next = !open;
    _PF_OPEN[_pfKey] = next;
    setOpen(next);
  };

  const applyChip = (opt, sel) => {
    const cur = taRef.current ? taRef.current.value : value;
    const newVal = sel
      ? cur.replace(opt,"").replace(/\s*\/\s*\/\s*/," / ").replace(/^\s*\/\s*/,"").replace(/\s*\/\s*$/,"").trim()
      : (cur ? cur+" / "+opt : opt);
    if(taRef.current) taRef.current.value = newVal;
    onChange(newVal);
  };

  const hasVal = value && value.trim().length > 0;

  return (
    <div style={{marginBottom:6,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden",background:T.bgInput}}>
      <div onClick={toggleOpen} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
        cursor:"pointer",background:T.bgCardHover,userSelect:"none"}}>
        <span style={{fontSize:10,color:T.text3,fontFamily:mono,letterSpacing:1,flex:1}}>{label}</span>
        {hasVal&&!open&&<span style={{fontSize:10,color:T.accent,fontFamily:mono,maxWidth:200,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</span>}
        <span style={{fontSize:10,color:T.text4}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{padding:"8px 10px",background:T.bgTableGroup}}>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
            {options.map(opt=>{
              const sel = value.includes(opt);
              return (
                <button key={opt} onMouseDown={e=>{e.preventDefault();applyChip(opt,sel);}}
                  style={{padding:"2px 8px",borderRadius:12,border:`1px solid ${sel?T.accentBorder:T.border}`,
                    background:sel?T.accentBg:T.bgCard,
                    color:sel?T.accent:T.text3,cursor:"pointer",fontSize:10,fontFamily:mono}}>
                  {opt}
                </button>
              );
            })}
          </div>
          <textarea
            ref={taRef}
            defaultValue={value}
            onBlur={e=>onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder||"Digite livremente ou selecione acima..."}
            style={{width:"100%",background:T.bgInput,border:`1px solid ${T.border}`,
              borderRadius:6,padding:"6px 8px",color:T.text1,fontSize:12,resize:"vertical",
              fontFamily:mono}}/>
        </div>
      )}
    </div>
  );
}

function CompactMultiSelect({value="",options=[],onChange,placeholder=""}){
  const T=useTheme();
  const [open,setOpen]=useState(false);
  const selecionados=String(value||"").split(/\s*\/\s*/).map(x=>x.trim()).filter(Boolean);
  const toggle=opt=>{
    const existe=selecionados.includes(opt);
    const novos=opt==="Sem laxativos"?(existe?[]:[opt]):(existe?selecionados.filter(x=>x!==opt):[...selecionados.filter(x=>x!=="Sem laxativos"),opt]);
    onChange(novos.join(" / "));
  };
  return <div style={{position:"relative"}}>
    <div style={{display:"flex",height:36}}><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:"100%",minWidth:0,boxSizing:"border-box",background:T.bgInput,border:`1px solid ${T.borderStrong}`,borderRight:0,borderRadius:"8px 0 0 8px",padding:"6px 10px",color:T.text1,fontSize:12}}/><button type="button" onClick={()=>setOpen(x=>!x)} title="Selecionar um ou mais laxativos" style={{width:34,border:`1px solid ${T.borderStrong}`,borderRadius:"0 8px 8px 0",background:T.bgCardHover,color:T.text3,cursor:"pointer"}}>{open?"▲":"▼"}</button></div>
    {open&&<div style={{position:"absolute",zIndex:80,top:40,left:0,right:0,padding:7,borderRadius:8,border:`1px solid ${T.borderStrong}`,background:T.bgPicker,boxShadow:"0 10px 28px rgba(0,0,0,.25)",display:"flex",gap:5,flexWrap:"wrap"}}>{options.map(opt=>{const ativo=selecionados.includes(opt);return <button type="button" key={opt} onClick={()=>toggle(opt)} style={{padding:"4px 8px",borderRadius:12,border:`1px solid ${ativo?T.accentBorder:T.border}`,background:ativo?T.accentBg:T.bgCard,color:ativo?T.accent:T.text2,cursor:"pointer",fontSize:9}}>{ativo?"✓ ":""}{opt}</button>;})}<button type="button" onClick={()=>setOpen(false)} style={{marginLeft:"auto",padding:"4px 8px",borderRadius:6,border:`1px solid ${T.border}`,background:"transparent",color:T.text3,cursor:"pointer",fontSize:9}}>Concluir</button></div>}
  </div>;
}

function FluidAnalysisPanel({data={},onChange,datas=[],hoje=""}) {
  const T=useTheme();
  const getEntries=d=>{const raw=data[d]?._fluidAnalyses;if(!raw)return[];try{return typeof raw==="string"?JSON.parse(raw):raw;}catch{return[];}};
  const setEntries=(d,entries)=>onChange({...data,[d]:{...(data[d]||{}),_fluidAnalyses:JSON.stringify(entries)}});
  const add=type=>setEntries(hoje,[...getEntries(hoje),{id:`fa_${Date.now()}`,type,target:"n",data:hoje,hora:"",nomeOutro:"",values:{},outros:"",conclusao:""}]);
  const upd=(d,id,key,value)=>setEntries(d,getEntries(d).map(e=>e.id===id?{...e,[key]:value}:e));
  const updVal=(d,id,key,value)=>setEntries(d,getEntries(d).map(e=>e.id===id?{...e,values:{...(e.values||{}),[key]:value}}:e));
  const remove=(d,id)=>setEntries(d,getEntries(d).filter(e=>e.id!==id));
  return <div style={{marginTop:8}}>
    <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:9}}><span style={{fontSize:10,fontFamily:mono,letterSpacing:1.5,color:"#38bdf8"}}>ANÁLISE DE LÍQUIDOS</span>{Object.entries(FLUID_ANALYSIS_TYPES).map(([key,cfg])=><button key={key} onClick={()=>add(key)} style={{padding:"3px 8px",borderRadius:12,border:"1px solid rgba(56,189,248,.28)",background:"rgba(56,189,248,.07)",color:"#38bdf8",fontSize:10,cursor:"pointer"}}>+ {cfg.label}</button>)}</div>
    {datas.map(d=>getEntries(d).map(entry=>{const cfg=FLUID_ANALYSIS_TYPES[entry.type]||FLUID_ANALYSIS_TYPES.outro;return <div key={entry.id} style={{marginBottom:9,padding:"9px 10px",border:`1px solid ${T.border}`,borderRadius:8,background:T.bgCard}}>
      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:7}}><strong style={{fontSize:11,color:"#38bdf8"}}>{entry.type==="outro"?(entry.nomeOutro||cfg.label):cfg.label}</strong><input type="date" value={entry.data||d} onChange={e=>upd(d,entry.id,"data",e.target.value)} style={{marginLeft:"auto",width:125,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"4px 6px",color:T.text1,fontSize:10}}/><input type="time" value={entry.hora||""} onChange={e=>upd(d,entry.id,"hora",e.target.value)} style={{width:80,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"4px 6px",color:T.text1,fontSize:10}}/>{d===hoje&&<button onClick={()=>remove(d,entry.id)} style={{border:0,background:"transparent",color:"#f87171",cursor:"pointer"}}>✕</button>}</div>
      {entry.type==="outro"&&<div style={{display:"grid",gridTemplateColumns:"1fr 210px",gap:6,marginBottom:6}}><label style={{fontSize:9,color:T.text3}}>NOME DO LÍQUIDO<input value={entry.nomeOutro||""} onChange={e=>upd(d,entry.id,"nomeOutro",e.target.value)} placeholder="Ex.: líquido pericárdico" style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:2,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"5px 6px",color:T.text1}}/></label><label style={{fontSize:9,color:T.text3}}>LANÇAR EM<select value={entry.target||"n"} onChange={e=>upd(d,entry.id,"target",e.target.value)} style={{display:"block",width:"100%",marginTop:2,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"5px 6px",color:T.text1}}><option value="n">Neurológico</option><option value="res">Respiratório</option><option value="tgi">TGI</option></select></label></div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:5}}>{cfg.fields.map(([key,label])=><label key={key} style={{fontSize:9,color:T.text3}}>{label}<input value={entry.values?.[key]||""} onChange={e=>updVal(d,entry.id,key,e.target.value)} style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:2,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"5px 6px",color:T.text1,fontSize:10}}/></label>)}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}><label style={{fontSize:9,color:T.text3}}>OUTROS PARÂMETROS<input value={entry.outros||""} onChange={e=>upd(d,entry.id,"outros",e.target.value)} placeholder="Nome e valor de outros parâmetros" style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:2,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"5px 6px",color:T.text1}}/></label><label style={{fontSize:9,color:T.text3}}>INTERPRETAÇÃO / CONCLUSÃO<input value={entry.conclusao||""} onChange={e=>upd(d,entry.id,"conclusao",e.target.value)} style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:2,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"5px 6px",color:T.text1}}/></label></div>
    </div>}))}
    {!datas.some(d=>getEntries(d).length)&&<div style={{padding:"12px 0",fontSize:11,color:T.text4}}>Nenhuma análise registrada.</div>}
  </div>;
}

function GasometriaPanel({ data={}, onChange, datas=[], hoje="" }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";
  const [expandidos, setExpandidos] = useState({});
  const [diasExpandidos,setDiasExpandidos]=useState({});
  const CAMPOS_GASO = [
    {k:"ph",   lbl:"pH"},
    {k:"hco3", lbl:"HCO₃", unit:"mEq/L"},
    {k:"pco2", lbl:"pCO₂", unit:"mmHg"},
    {k:"po2",  lbl:"pO₂",  unit:"mmHg"},
    {k:"be",   lbl:"BE",   unit:"mEq/L"},
    {k:"sato2",lbl:"SatO₂",unit:"%"},
    {k:"lact", lbl:"Lact", unit:"mmol/L"},
  ];
  const CAMPOS_GASO_EXTRA = [
    {k:"na",   lbl:"Na",   unit:"mEq/L"},
    {k:"k",    lbl:"K",    unit:"mEq/L"},
    {k:"ca",   lbl:"Ca",   unit:"mmol/L"},
    {k:"cl",   lbl:"Cl",   unit:"mEq/L"},
    {k:"glic", lbl:"Glic", unit:"mg/dL"},
    {k:"hb",   lbl:"Hb",   unit:"g/dL"},
  ];

  const getGasos = (d) => {
    const v = data[d]?._gasos;
    if(!v) return [];
    try { return typeof v==="string"?JSON.parse(v):v; } catch{ return []; }
  };

  const setGasos = (d, gasos) => {
    onChange({...data, [d]:{...(data[d]||{}), _gasos: JSON.stringify(gasos)}});
  };

  const addGaso = (d) => {
    const gasos = getGasos(d);
    setGasos(d, [...gasos, {id:Date.now()+"", data:d, horario:"", ph:"", hco3:"", pco2:"", po2:"", be:"", sato2:"",
      na:"", k:"", ca:"", cl:"", glic:"", lact:"", hb:""}]);
  };

  const updateGaso = (d, id, field, val) => {
    setGasos(d, getGasos(d).map(g=>g.id===id?{...g,[field]:val}:g));
  };

  const removeGaso = (d, id) => {
    setGasos(d, getGasos(d).filter(g=>g.id!==id));
  };

  const temExtra = (g) => CAMPOS_GASO_EXTRA.some(c=>g[c.k]);

  // Lista cronológica de todas as gasometrias (todas as datas) — usada só para achar o valor
  // anterior de cada parâmetro e classificar tendência (âmbar/vermelho na fonte, nunca no fundo).
  const todasGasosOrdenadas = datas.flatMap(d=>getGasos(d)).sort((a,b)=>`${a.data||""}${a.horario||""}`.localeCompare(`${b.data||""}${b.horario||""}`));
  const anteriorDe = (g, campo) => {
    const idx = todasGasosOrdenadas.findIndex(x=>x.id===g.id);
    for (let i=idx-1;i>=0;i--) { if (todasGasosOrdenadas[i][campo]) return todasGasosOrdenadas[i][campo]; }
    return "";
  };
  const gasoImportante = (g) => [...CAMPOS_GASO,...CAMPOS_GASO_EXTRA].some(c=>classificarLab(c.k,g[c.k],anteriorDe(g,c.k))==="importante");

  return (
    <div style={{marginTop:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <div style={{fontSize:10,fontFamily:mono,letterSpacing:2,color:"#38bdf8"}}>🫁 GASOMETRIAS</div>
        <button onClick={()=>addGaso(hoje)}
          style={{padding:"2px 9px",borderRadius:6,border:"1px solid rgba(56,189,248,0.3)",
            background:"rgba(56,189,248,0.08)",color:"#38bdf8",cursor:"pointer",fontSize:11}}>
          + Gaso
        </button>
        <span style={{fontSize:9,color:"#334155",fontFamily:mono}}>Na/K/Ca/Cl/Glic/Hb → parâmetros adicionais</span>
      </div>
      {[...datas].sort((a,b)=>b.localeCompare(a)).map(d => {
        const gasos = [...getGasos(d)].sort((a,b)=>`${b.data||d} ${b.horario||""} ${b.id||""}`.localeCompare(`${a.data||d} ${a.horario||""} ${a.id||""}`));
        if(!gasos.length) return null;
        const isHoje2 = d===hoje||d.startsWith(hoje+"T");
        const diaAberto=isHoje2||!!diasExpandidos[d];
        return (
          <div key={d} style={{marginBottom:10}}>
            <button onClick={()=>!isHoje2&&setDiasExpandidos(x=>({...x,[d]:!x[d]}))} style={{width:"100%",display:"flex",alignItems:"center",gap:7,padding:"5px 7px",marginBottom:diaAberto?4:0,border:`1px solid ${T.border}`,borderRadius:6,background:isHoje2?T.accentBg:T.bgCard,color:isHoje2?T.accent:T.text2,cursor:isHoje2?"default":"pointer",fontSize:9,fontFamily:mono,textAlign:"left"}}><b>{new Date(d+"T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}</b><span style={{color:T.text3}}>{gasos.length} gasometria(s)</span><span style={{marginLeft:"auto"}}>{diaAberto?"▴":"▾ consultar"}</span></button>
            {diaAberto&&<>
            {gasos.map(g=>{
              const open = !!expandidos[g.id];
              const analise = analisarGasometria(g);
              const deltaInterpretacao=analise.deltaDelta===null?"":analise.deltaDelta<.4?"acidose metabólica com AG normal predominante":analise.deltaDelta<.8?"distúrbio misto: AG aumentado + AG normal":analise.deltaDelta<=2?"compatível com acidose de AG aumentado isolada":"alcalose metabólica associada";
              return (
              <div key={g.id} style={{marginBottom:4,
                background:isHoje2?"rgba(56,189,248,0.02)":"transparent",
                border:`1px solid ${gasoImportante(g)?"rgba(248,113,113,0.5)":T.border}`,borderRadius:6,padding:"4px 8px"}}>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <input type="date" value={g.data||d} onChange={e=>updateGaso(d,g.id,"data",e.target.value)}
                    style={{background:"transparent",border:"none",color:"#64748b",fontSize:10,fontFamily:mono,width:90}}/>
                  <input placeholder="Hora" value={g.horario} onChange={e=>updateGaso(d,g.id,"horario",e.target.value)}
                    style={{width:45,background:"transparent",border:"none",color:"#94a3b8",fontSize:11,fontFamily:mono}}/>
                  {CAMPOS_GASO.map(c=>{
                    const nivel = classificarLab(c.k, g[c.k], anteriorDe(g,c.k));
                    return (
                    <div key={c.k} style={{display:"flex",alignItems:"center",gap:2}}>
                      <span style={{fontSize:9,color:"#475569",fontFamily:mono}}>{c.lbl}</span>
                      <input value={g[c.k]||""} onChange={e=>updateGaso(d,g.id,c.k,e.target.value)}
                        style={{width:46,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
                          borderRadius:4,color:corNivelLab(nivel,"#e2e8f0"),fontWeight:nivel==="importante"?700:400,fontSize:11,fontFamily:mono,padding:"1px 4px",textAlign:"center"}}/>
                    </div>
                    );
                  })}
                  <button onClick={()=>setExpandidos(e=>({...e,[g.id]:!e[g.id]}))}
                    title="Mais parâmetros (Na/K/Ca/Cl/Glic/Hb)"
                    style={{padding:"2px 7px",borderRadius:5,fontSize:10,cursor:"pointer",
                      background:open||temExtra(g)?"rgba(163,230,53,0.1)":"rgba(255,255,255,0.04)",
                      border:`1px solid ${open||temExtra(g)?"rgba(163,230,53,0.3)":"rgba(255,255,255,0.08)"}`,
                      color:open||temExtra(g)?"#a3e635":"#64748b"}}>
                    {open?"▲":"⊕"} mais
                  </button>
                  {isHoje2&&<button onClick={()=>removeGaso(d,g.id)}
                    style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:12,padding:0,marginLeft:2}}>✕</button>}
                </div>
                {open&&(
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginTop:5,paddingTop:5,
                    borderTop:"1px dashed rgba(163,230,53,0.15)"}}>
                    {CAMPOS_GASO_EXTRA.map(c=>{
                      const nivel = classificarLab(c.k, g[c.k], anteriorDe(g,c.k));
                      return (
                      <div key={c.k} style={{display:"flex",alignItems:"center",gap:2}}>
                        <span style={{fontSize:9,color:"#a3e635",fontFamily:mono}}>{c.lbl}</span>
                        <input value={g[c.k]||""} onChange={e=>updateGaso(d,g.id,c.k,e.target.value)}
                          style={{width:50,background:"rgba(163,230,53,0.05)",border:"1px solid rgba(163,230,53,0.15)",
                            borderRadius:4,color:corNivelLab(nivel,"#e2e8f0"),fontWeight:nivel==="importante"?700:400,fontSize:11,fontFamily:mono,padding:"1px 4px",textAlign:"center"}}/>
                      </div>
                      );
                    })}
                  </div>
                )}
                {(analise.anionGap!==null||analise.disturbios.length>0)&&<div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginTop:5,paddingTop:5,borderTop:`1px dashed ${analise.agAumentado?"rgba(251,146,60,.28)":"rgba(148,163,184,.14)"}`}}>
                  {analise.anionGap!==null&&<span style={{padding:"2px 6px",borderRadius:5,fontSize:9,fontFamily:mono,color:analise.agAumentado?"#fb923c":"#94a3b8",background:analise.agAumentado?"rgba(251,146,60,.09)":"rgba(148,163,184,.05)"}}>AG {analise.anionGap.toFixed(1).replace(".",",")}{analise.agAumentado?" ↑":""}</span>}
                  {analise.deltaDelta!==null&&<span title={deltaInterpretacao} style={{padding:"2px 6px",borderRadius:5,fontSize:9,fontFamily:mono,color:"#fbbf24",background:"rgba(251,191,36,.08)"}}>Δ/Δ {analise.deltaDelta.toFixed(2).replace(".",",")} · {deltaInterpretacao}</span>}
                  {analise.disturbios.map((txt,i)=><span key={i} style={{fontSize:9,color:txt.includes("grave")?"#f87171":txt.includes("moderada")?"#fb923c":"#94a3b8",fontFamily:mono}}>{txt}</span>)}
                </div>}
              </div>
              );
            })}
            </>}
          </div>
        );
      })}
      {!datas.some(d=>getGasos(d).length>0)&&(
        <div style={{fontSize:11,color:"#334155",padding:"8px 0"}}>Nenhuma gasometria registrada. Clique "+ Gaso" para adicionar.</div>
      )}
    </div>
  );
}


// ── TroponinaPanel — múltiplas dosagens de troponina por dia ──────────────
function TroponinaPanel({ data={}, onChange, datas=[], hoje="" }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";

  const getTropos = (d) => {
    const v = data[d]?._tropos;
    if(!v) return [];
    try { return typeof v==="string"?JSON.parse(v):v; } catch{ return []; }
  };
  const setTropos = (d, tropos) => {
    onChange({...data, [d]:{...(data[d]||{}), _tropos: JSON.stringify(tropos)}});
  };
  const addTropo = (d) => {
    const tropos = getTropos(d);
    setTropos(d, [...tropos, {id:Date.now()+"", data:d, horario:"", valor:"", unidade:"ng/mL"}]);
  };
  const updateTropo = (d, id, field, val) => {
    setTropos(d, getTropos(d).map(t=>t.id===id?{...t,[field]:val}:t));
  };
  const removeTropo = (d, id) => {
    setTropos(d, getTropos(d).filter(t=>t.id!==id));
  };

  // Cronologia de todas as dosagens — usada pra achar o pico e a variação % em relação à dosagem anterior.
  // Sem faixa de referência universal (varia por ensaio/unidade — hs-troponina vs convencional), então aqui
  // a cor de fonte é por tendência (subida forte = âmbar) e o pico é destacado à parte, como pede o README.
  const todasTroposOrdenadas = datas.flatMap(d=>getTropos(d)).sort((a,b)=>`${a.data||""}${a.horario||""}`.localeCompare(`${b.data||""}${b.horario||""}`));
  const picoVal = todasTroposOrdenadas.reduce((max,t)=>{const n=parseFloat(String(t.valor||"").replace(",","."));return isNaN(n)?max:Math.max(max,n);}, -Infinity);
  const infoTropo = (t) => {
    const n = parseFloat(String(t.valor||"").replace(",","."));
    if (isNaN(n)) return {cor:"#e2e8f0",peso:400,pico:false};
    const idx = todasTroposOrdenadas.findIndex(x=>x.id===t.id);
    const ant = idx>0 ? parseFloat(String(todasTroposOrdenadas[idx-1].valor||"").replace(",",".")) : NaN;
    const pico = n===picoVal && picoVal>-Infinity;
    if (pico) return {cor:"#f87171",peso:700,pico:true};
    if (!isNaN(ant) && ant>0 && (n-ant)/ant > 0.3) return {cor:"#fbbf24",peso:700,pico:false};
    return {cor:"#e2e8f0",peso:400,pico:false};
  };

  return (
    <div style={{marginTop:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
        <div style={{fontSize:10,fontFamily:mono,letterSpacing:2,color:"#f87171"}}>🫀 TROPONINA</div>
        <button onClick={()=>addTropo(hoje)}
          style={{padding:"2px 9px",borderRadius:6,border:"1px solid rgba(248,113,113,0.3)",
            background:"rgba(248,113,113,0.08)",color:"#f87171",cursor:"pointer",fontSize:11}}>
          + Troponina
        </button>
      </div>
      {datas.map(d => {
        const tropos = getTropos(d);
        if(!tropos.length) return null;
        const isHoje2 = d===hoje||d.startsWith(hoje+"T");
        return (
          <div key={d} style={{marginBottom:10}}>
            <div style={{fontSize:9,fontFamily:mono,color:"#334155",marginBottom:4}}>
              {new Date(d+"T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}
            </div>
            {tropos.map(t=>(
              <div key={t.id} style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,
                background:isHoje2?"rgba(248,113,113,0.02)":"transparent",
                border:`1px solid ${T.border}`,borderRadius:6,padding:"4px 8px",flexWrap:"wrap"}}>
                <input type="date" value={t.data||d} onChange={e=>updateTropo(d,t.id,"data",e.target.value)}
                  style={{background:"transparent",border:"none",color:"#64748b",fontSize:10,fontFamily:mono,width:90}}/>
                <input placeholder="Hora" value={t.horario} onChange={e=>updateTropo(d,t.id,"horario",e.target.value)}
                  style={{width:45,background:"transparent",border:"none",color:"#94a3b8",fontSize:11,fontFamily:mono}}/>
                <input placeholder="Valor" value={t.valor} onChange={e=>updateTropo(d,t.id,"valor",e.target.value)}
                  style={{width:70,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius:4,color:infoTropo(t).cor,fontWeight:infoTropo(t).peso,fontSize:11,fontFamily:mono,padding:"1px 6px",textAlign:"center"}}/>
                {infoTropo(t).pico && <span style={{fontSize:10,color:"#f87171",fontWeight:700,fontFamily:mono}}>↑↑ pico</span>}
                <select value={t.unidade||"ng/mL"} onChange={e=>updateTropo(d,t.id,"unidade",e.target.value)}
                  style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius:4,color:"#94a3b8",fontSize:10,fontFamily:mono,padding:"1px 4px"}}>
                  <option value="ng/mL">ng/mL</option>
                  <option value="pg/mL">pg/mL</option>
                </select>
                {isHoje2&&<button onClick={()=>removeTropo(d,t.id)}
                  style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:12,padding:0,marginLeft:2}}>✕</button>}
              </div>
            ))}
          </div>
        );
      })}
      {!datas.some(d=>getTropos(d).length>0)&&(
        <div style={{fontSize:11,color:"#334155",padding:"8px 0"}}>Nenhuma troponina registrada. Clique "+ Troponina" para adicionar.</div>
      )}
    </div>
  );
}


// ── CulturasPanel — tabela de culturas ────────────────────────────────────
const CULTURA_TIPOS = ["Hemocultura","AT - Aspirado Traqueal","Urocultura","Swab Retal","Swab de Vigilância","Líquido Pleural","LCR","Swab Ferida","Outro"];
const CULTURA_STATUS = ["Aguardando","Parcial","Positiva","Negativa","Resistente","Sensível"];
const CULTURA_MATERIAIS = {
  Hemocultura:["Periférico","CVC","Shilley","Perm-cath","Porthocath"],
  "Swab de Vigilância":["VRE","MTR"]
};
const CULTURA_RESISTENCIAS = ["KPC","NDM","MDN","VRE","MTR","ESBL","AmpC","OXA-48","MRSA","Outra"];

function CulturasPanel({ culturas=[], onChange }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";
  const [show, setShow] = useState(false);
  const [nova, setNova] = useState({tipo:"Hemocultura",material:"",dataColeta:new Date().toISOString().split("T")[0],status:"Aguardando",resultado:"",germes:[]});

  const adicionar = () => {
    if(!nova.tipo) return;
    onChange([...culturas, {...nova, id:Date.now()+""}]);
    setNova({tipo:"Hemocultura",material:"",dataColeta:new Date().toISOString().split("T")[0],status:"Aguardando",resultado:"",germes:[]});
    setShow(false);
  };

  const atualizar = (id, field, val) => onChange(culturas.map(c=>c.id===id?{...c,[field]:val}:c));
  const adicionarGerme = id => onChange(culturas.map(c=>c.id===id?{...c,germes:[...(c.germes||[]),{id:Date.now()+"",nome:"",resistencia:"",atbs:""}]}:c));
  const atualizarGerme = (culturaId, germeId, field, val) => onChange(culturas.map(c=>{
    if(c.id!==culturaId)return c;
    const germes=(c.germes||[]).map(g=>g.id===germeId?{...g,[field]:val}:g);
    const temIdentificacao=germes.some(g=>String(g.nome||"").trim()||String(g.resistencia||"").trim());
    const status=temIdentificacao&&["Aguardando","Parcial"].includes(c.status)?"Positiva":c.status;
    return {...c,germes,status};
  }));
  const removerGerme = (culturaId, germeId) => onChange(culturas.map(c=>c.id===culturaId?{...c,germes:(c.germes||[]).filter(g=>g.id!==germeId)}:c));
  const remover = (id) => onChange(culturas.filter(c=>c.id!==id));

  const corStatus = s => s==="Negativa"?"#34d399":s==="Parcial"?"#fbbf24":s==="Resistente"?"#f87171":s==="Sensível"?"#34d399":"#64748b";

  return (
    <div style={{padding:"12px 16px",background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <div style={{fontSize:11,fontFamily:mono,letterSpacing:2,color:"#a3e635",fontWeight:700}}>🧫 CULTURAS</div>
        <button onClick={()=>setShow(s=>!s)}
          style={{padding:"3px 10px",borderRadius:6,border:"1px solid rgba(163,230,53,0.3)",
            background:"rgba(163,230,53,0.08)",color:"#a3e635",cursor:"pointer",fontSize:11}}>
          {show?"Fechar":"+ Adicionar"}
        </button>
      </div>

      {show&&(
        <div style={{background:"rgba(163,230,53,0.04)",border:"1px solid rgba(163,230,53,0.15)",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            <select value={nova.tipo} onChange={e=>setNova(n=>({...n,tipo:e.target.value,material:""}))}
              style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 8px",color:"#e2e8f0",fontSize:12}}>
              {CULTURA_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            {CULTURA_MATERIAIS[nova.tipo]?<select value={nova.material} onChange={e=>setNova(n=>({...n,material:e.target.value}))}
              style={{flex:1,minWidth:140,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 8px",color:"#e2e8f0",fontSize:12}}>
              <option value="">Selecione o material…</option>{CULTURA_MATERIAIS[nova.tipo].map(m=><option key={m} value={m}>{m}</option>)}
            </select>:<input placeholder="Material / sítio" value={nova.material}
              onChange={e=>setNova(n=>({...n,material:e.target.value}))}
              style={{flex:1,minWidth:120,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 8px",color:"#e2e8f0",fontSize:12}}/>}
            <input type="date" value={nova.dataColeta} onChange={e=>setNova(n=>({...n,dataColeta:e.target.value}))}
              style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 8px",color:"#e2e8f0",fontSize:12}}/>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <select value={nova.status} onChange={e=>setNova(n=>({...n,status:e.target.value}))}
              style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 8px",color:"#e2e8f0",fontSize:12}}>
              {CULTURA_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <input placeholder="Resultado / germe / resistência" value={nova.resultado}
              onChange={e=>setNova(n=>({...n,resultado:e.target.value}))}
              style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 8px",color:"#e2e8f0",fontSize:12}}/>
            <button onClick={adicionar}
              style={{padding:"6px 14px",background:"rgba(163,230,53,0.15)",border:"1px solid rgba(163,230,53,0.3)",borderRadius:6,color:"#a3e635",cursor:"pointer",fontSize:12,fontWeight:700}}>
              Adicionar
            </button>
          </div>
        </div>
      )}

      {culturas.length===0&&<div style={{fontSize:11,color:"#334155"}}>Nenhuma cultura registrada</div>}
      {culturas.map(c=>(
        <div key={c.id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,padding:"6px 10px",
          background:"rgba(255,255,255,0.02)",border:`1px solid ${corStatus(c.status)}20`,borderRadius:7,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:140}}>
            <div style={{fontSize:11,color:"#cbd5e1",fontWeight:600}}>{c.tipo}</div>
            <div style={{fontSize:10,color:"#64748b",fontFamily:mono}}>{c.dataColeta&&new Date(c.dataColeta+"T00:00:00").toLocaleDateString("pt-BR")}</div>
          </div>
          {CULTURA_MATERIAIS[c.tipo]?<select value={c.material||""} onChange={e=>atualizar(c.id,"material",e.target.value)}
            style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRadius:5,padding:"3px 6px",color:"#cbd5e1",fontSize:10}}>
            <option value="">Material…</option>{CULTURA_MATERIAIS[c.tipo].map(m=><option key={m} value={m}>{m}</option>)}
          </select>:<input value={c.material||""} onChange={e=>atualizar(c.id,"material",e.target.value)} placeholder="Material / sítio"
            style={{minWidth:120,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRadius:5,padding:"3px 6px",color:"#cbd5e1",fontSize:10}}/>}
          <select value={c.status} onChange={e=>atualizar(c.id,"status",e.target.value)}
            style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${corStatus(c.status)}40`,borderRadius:5,
              padding:"3px 6px",color:corStatus(c.status),fontSize:10,fontFamily:mono,cursor:"pointer"}}>
            {CULTURA_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          {(c.germes||[]).length===0&&c.resultado&&<div style={{flex:2,minWidth:140,fontSize:10,color:"#94a3b8"}}>Resultado anterior: {c.resultado}</div>}
          <button onClick={()=>adicionarGerme(c.id)} style={{background:"rgba(56,189,248,.08)",border:"1px solid rgba(56,189,248,.25)",borderRadius:5,color:"#38bdf8",padding:"3px 8px",cursor:"pointer",fontSize:10}}>+ micro-organismo</button>
          <button onClick={()=>remover(c.id)}
            style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:13}}>✕</button>
          {(c.germes||[]).map(g=><div key={g.id} style={{width:"100%",display:"grid",gridTemplateColumns:"minmax(150px,1.3fr) minmax(110px,.7fr) minmax(180px,1.4fr) auto",gap:6,marginTop:5}}>
            <input value={g.nome||""} onChange={e=>atualizarGerme(c.id,g.id,"nome",e.target.value)} placeholder="Micro-organismo"
              style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRadius:5,padding:"5px 7px",color:"#e2e8f0",fontSize:11}}/>
            <input list="resistencias-cultura" value={g.resistencia||""} onChange={e=>atualizarGerme(c.id,g.id,"resistencia",e.target.value)} placeholder="Resistência"
              style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(248,113,113,.22)",borderRadius:5,padding:"5px 7px",color:"#fca5a5",fontSize:11}}/>
            <input value={g.atbs||""} onChange={e=>atualizarGerme(c.id,g.id,"atbs",e.target.value)} placeholder="ATB sensíveis (separe por vírgulas)"
              style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(52,211,153,.22)",borderRadius:5,padding:"5px 7px",color:"#a7f3d0",fontSize:11}}/>
            <button onClick={()=>removerGerme(c.id,g.id)} title="Excluir micro-organismo" style={{background:"none",border:"none",color:"#64748b",cursor:"pointer"}}>✕</button>
          </div>)}
        </div>
      ))}
      <datalist id="resistencias-cultura">{CULTURA_RESISTENCIAS.map(r=><option key={r} value={r}/>)}</datalist>
    </div>
  );
}



// ── MiniBombas — drogas de bomba embedadas dentro de cada SysB ───────────────
function MiniBombas({ title="BOMBAS", drogaKeys=[], gruposCustom=[], peso, pesoPreditoValor=null, vazoes={}, onVazaoChange, config={} }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";
  const getConf = (k) => getDrogaConfig(k,config);
  const fmtDose = (d) => {
    const n=parseFloat(d); if(isNaN(n)) return d;
    if(n<0.001) return n.toExponential(2); if(n<0.01) return n.toFixed(4);
    if(n<1) return n.toFixed(3); return n.toFixed(2);
  };

  // Inclui automaticamente as drogas personalizadas do grupo correspondente.
  const customKeys=(config?.drogasCustom||[]).filter(d=>gruposCustom.includes(d.grupo)).map(d=>d.key);
  const todasKeys=[...new Set([...drogaKeys,...customKeys])];
  const comVazao = todasKeys.filter(k=>vazoes[k]&&parseFloat(vazoes[k])>0);
  const semVazao = todasKeys.filter(k=>!vazoes[k]||parseFloat(vazoes[k])<=0);
  const [mostrarChips, setMostrarChips] = useState(false);

  return (
    <div style={{marginTop:4,padding:"8px 10px",background:T.bgTableGroup,
      border:`1px solid ${T.border}`,borderRadius:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:comVazao.length?6:0}}>
        <span style={{fontSize:9,color:T.text3,fontFamily:mono,letterSpacing:2,flex:1}}>{title}</span>
        <button onClick={()=>setMostrarChips(s=>!s)}
          style={{fontSize:10,padding:"2px 7px",borderRadius:5,cursor:"pointer",
            background:T.bgInput,border:`1px solid ${T.border}`,color:T.text3}}>
          {mostrarChips?"▲ fechar":"+ droga"}
        </button>
      </div>

      {/* Drogas ativas com input de mL/h */}
      {comVazao.map(k=>{
        const conf=getConf(k);
        const mlh=vazoes[k]||"";
        const res=conf&&mlh?calcDoseFromMLH(k,mlh,peso,undefined,conf.modoCalcDefault,config,pesoPreditoValor):null;
        const acima=res&&conf?.max&&parseFloat(res.dose)>conf.max;
        return (
          <div key={k} className="mini-bomba-row" style={{marginBottom:4}}>
            <span style={{fontSize:12,color:T.text1,fontFamily:mono,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{conf?.label||k}</span>
            <input type="number" value={mlh} placeholder="mL/h"
              onChange={e=>{onVazaoChange&&onVazaoChange(k,e.target.value);}}
              style={{width:68,background:T.bgInput,border:`1px solid ${T.border}`,
                borderRadius:6,padding:"4px 7px",color:T.text1,fontSize:12,textAlign:"center",fontFamily:mono}}/>
            <span style={{fontSize:10,fontFamily:mono,color:acima?"#dc2626":T.accent,minWidth:0,whiteSpace:"nowrap"}}>
              {res?`≈ ${fmtDose(res.dose)} ${res.label}`:""}
            </span>
            <button onClick={()=>{onVazaoChange&&onVazaoChange(k,"");}}
              style={{background:"none",border:"none",color:T.text4,cursor:"pointer",fontSize:12,padding:0}}>✕</button>
          </div>
        );
      })}

      {/* Chips para adicionar drogas */}
      {mostrarChips&&semVazao.length>0&&(
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4,paddingTop:4,borderTop:"1px dashed rgba(255,255,255,0.06)"}}>
          {semVazao.map(k=>{
            const conf=getConf(k);
            return (
              <button key={k} onMouseDown={e=>{e.preventDefault();onVazaoChange&&onVazaoChange(k,"1");setMostrarChips(false);}}
                style={{padding:"2px 8px",borderRadius:10,border:`1px solid ${T.border}`,
                  background:T.bgInput,color:T.text2,cursor:"pointer",fontSize:10,fontFamily:mono}}>
                + {conf?.label||k}
              </button>
            );
          })}
        </div>
      )}
      {comVazao.length===0&&!mostrarChips&&(
        <div style={{fontSize:10,color:T.textDim,fontFamily:mono}}>nenhuma droga em bomba</div>
      )}
    </div>
  );
}


// ── SysB / Row / Col / FL — hoisted para escopo de módulo (fix: definir componentes dentro do render
// do EvolucaoEditor fazia o React remontar todo o subtree a cada tecla digitada em campos
// controlados como os da Ventilação, derrubando o foco do input) ──
function SystemTextSection({title,txtFn,color="#fbbf24"}) {
  const T=useTheme();
  const [text,setText]=useState(()=>txtFn?txtFn():"");
  const [copied,setCopied]=useState(false);
  const regenerate=()=>setText(txtFn?txtFn():"");
  const copy=()=>{if(!text.trim())return;navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1800);});};
  return <div style={{border:`1px solid ${color}33`,borderRadius:8,background:`${color}08`,padding:"9px 10px"}}>
    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}><span style={{fontSize:10,color,fontFamily:mono,letterSpacing:1.3,fontWeight:700}}>{title}</span><button onClick={regenerate} style={{marginLeft:"auto",fontSize:9,color:T.text3,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:4,padding:"2px 7px",cursor:"pointer"}}>↺ Regenerar</button></div>
    <textarea value={text} onChange={e=>setText(e.target.value)} rows={Math.max(4,text.split("\n").length+1)} style={{width:"100%",boxSizing:"border-box",background:T.bgInput,border:`1px solid ${T.borderStrong}`,borderRadius:7,padding:"8px 9px",color:T.text1,fontSize:12,resize:"vertical",fontFamily:mono,lineHeight:1.55}}/>
    <button onClick={copy} style={{marginTop:6,width:"100%",padding:"7px",borderRadius:6,border:`1px solid ${copied?"#34d399":`${color}55`}`,background:copied?"rgba(52,211,153,.10)":`${color}10`,color:copied?"#34d399":color,fontSize:11,fontWeight:700,cursor:"pointer"}}>{copied?"✅ Copiado":"📋 Copiar para o Tasy"}</button>
  </div>;
}
function SystemTextSections({sections=[]}) {
  return <div style={{borderTop:"2px solid rgba(251,191,36,0.20)",padding:"10px 14px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:8}}>{sections.map(s=><SystemTextSection key={s.id||s.title} {...s}/>)}</div>;
}

const SysB = ({id, sigla, label, color, txtFn, textSections=[], children, opcionais=[], adicionaveis=[], camposVisiveis, setCamposVisiveis, statusFields=[], customFields=[], onAddCustomField, onUpdateCustomField, onRemoveCustomField, controlledOpen, onRequestOpen, reviewMode=false}) => {
  const T=useTheme();
  const [localOpen,setLocalOpen]=useState(true);
  const open = controlledOpen===undefined ? localOpen : controlledOpen;
  const [showAdd,setShowAdd]=useState(false);
  const [preview,setPreview]=useState(null); // null=fechado, string=texto editável
  const [cp2,setCp2]=useState(false);
  const vis = camposVisiveis || {};
  const toggle = (key) => setCamposVisiveis && setCamposVisiveis(prev=>({...prev,[key]:!prev[key]}));
  const statusTotal = statusFields.length;
  const statusPreenchidos = statusFields.filter(f=>String(f.value||"").trim()).length;
  const statusVazios = statusTotal - statusPreenchidos;
  const borderColor = statusTotal===0
    ? T.border
    : (open ? (statusVazios===0 ? "rgba(16,185,129,0.48)" : "rgba(239,68,68,0.42)") : T.border);
  const resumo = reviewMode && txtFn ? String(txtFn()||"").replace(/^[-*]\s*/gm,"").split("\n").filter(Boolean).slice(0,3).join(" · ") : "";
  const handleOpen = () => onRequestOpen ? onRequestOpen(id) : setLocalOpen(o=>!o);

  const abrirPreview = () => {
    if(preview!==null){setPreview(null);return;}
    setPreview(txtFn?txtFn():"— bloco vazio —");
  };
  const copiar = () => {
    const txt = preview!==null ? preview : (txtFn?txtFn():"");
    if(!txt||txt==="— bloco vazio —") return;
    navigator.clipboard.writeText(txt).then(()=>{setCp2(true);setTimeout(()=>setCp2(false),2000);});
  };

  return (
    <div id={`sys-${id}`} className="system-card" style={{scrollMarginTop:62,marginBottom:reviewMode?6:10,border:`1px solid ${borderColor}`,borderRadius:10,overflow:"hidden",background:open?T.bgCard:"transparent",boxShadow:open?T.shadowCard:"none"}}>
      <div style={{display:"flex",alignItems:"center",background:open?T.bgCardHover:T.bgCard}}>
        <button onClick={handleOpen} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:reviewMode?"9px 12px":"10px 14px",background:"none",border:"none",cursor:"pointer",textAlign:"left",minWidth:0}}>
          <div style={{width:3,height:16,background:color,borderRadius:2,flexShrink:0}}/>
          {!reviewMode&&<span style={{fontSize:12,fontWeight:700,color,fontFamily:mono,letterSpacing:1.5}}>{sigla}</span>}
          <span style={{fontSize:12,color:reviewMode?T.text1:T.text2,fontWeight:reviewMode?650:500,minWidth:reviewMode?125:0}}>{label}</span>
          {statusTotal>0 && (
            <span style={{display:"flex",alignItems:"center",gap:5}} title={statusVazios===0?"Bloco completo":`${statusVazios} de ${statusTotal} campo(s) essencial(is) vazio(s)`}>
              <span style={{width:7,height:7,borderRadius:"50%",background:statusVazios===0?"#34d399":"#f87171",flexShrink:0}}/>
              {!reviewMode&&<span style={{fontSize:10,fontFamily:mono,color:statusVazios===0?"#34d399":"#f87171"}}>
                {statusVazios===0?"completo":`${statusVazios} de ${statusTotal} vazios`}
              </span>}
            </span>
          )}
          {reviewMode&&<span style={{marginLeft:8,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:11,color:resumo?"#94a3b8":"#334155"}}>{resumo||"Sem dados registrados"}</span>}
          <span style={{marginLeft:"auto",color:reviewMode?T.accent:T.text4,fontSize:11}}>{reviewMode?"Editar ›":open?"▲":"▼"}</span>
        </button>
        {open && (
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowAdd(s=>!s)}
              style={{margin:"4px 2px",padding:"3px 10px",borderRadius:6,
                border:`1px solid ${showAdd?"rgba(124,58,237,0.5)":T.borderStrong}`,
                background:showAdd?"rgba(124,58,237,0.10)":T.bgInput,
                color:showAdd?"#a78bfa":"#64748b",cursor:"pointer",fontSize:11,fontWeight:600}}>
              ⊕
            </button>
          </div>
        )}
        {open&&textSections.length===0&&<button onClick={abrirPreview}
          style={{margin:"4px 2px",padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600,
            background:preview!==null?"rgba(251,191,36,0.15)":T.bgInput,
            border:`1px solid ${preview!==null?"rgba(217,119,6,0.55)":T.border}`,
            color:preview!==null?"#d97706":T.text3,cursor:"pointer",fontFamily:"inherit"}}
          title="Ver e editar o texto que será copiado">
          {preview!==null?"✕":"👁"}
        </button>}
        {open&&textSections.length===0&&<button onClick={copiar}
          title="Copiar texto deste sistema"
          style={{margin:"6px 8px 6px 2px",padding:"4px 12px",borderRadius:6,fontSize:11,fontWeight:600,
            background:cp2?"rgba(16,185,129,0.15)":T.bgInput,
            border:`1px solid ${cp2?"#10b981":T.border}`,
            color:cp2?"#059669":T.text2,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>
          {cp2?"✓":"📋"}
        </button>}
      </div>
      {open && showAdd && (
        <div style={{padding:"8px 14px",borderTop:"1px solid rgba(255,255,255,0.05)",background:"rgba(167,139,250,0.04)",display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1}}>CAMPOS:</span>
          {opcionais.map(o=>(
            <button key={o.key} onClick={()=>{toggle(o.key);}}
              style={{padding:"2px 9px",borderRadius:12,
                border:`1px solid ${vis[o.key]?"rgba(56,189,248,0.4)":"rgba(255,255,255,0.1)"}`,
                background:vis[o.key]?"rgba(56,189,248,0.1)":"rgba(255,255,255,0.04)",
                color:vis[o.key]?"#38bdf8":"#64748b",cursor:"pointer",fontSize:11}}>
              {vis[o.key]?"✓ ":""}{o.label}
            </button>
          ))}
          {adicionaveis.map(a=>{
            const key=`add_${id}_${a.key}`,active=!!vis[key];
            return <button key={a.key} onClick={()=>{toggle(key);setShowAdd(false);}}
              title={active?"Remover este campo do bloco":"Adicionar este campo ao bloco"}
              style={{padding:"2px 9px",borderRadius:12,
                border:`1px solid ${active?"rgba(248,113,113,.45)":"rgba(167,139,250,0.3)"}`,
                background:active?"rgba(248,113,113,.09)":"rgba(167,139,250,0.08)",
                color:active?"#f87171":"#a78bfa",cursor:"pointer",fontSize:11}}>
              {active?"✕ ":"+ "}{a.label}
            </button>
          })}
          <button onClick={()=>{onAddCustomField&&onAddCustomField(id);setShowAdd(false);}}
            style={{padding:"2px 9px",borderRadius:12,border:"1px solid rgba(52,211,153,.35)",background:"rgba(52,211,153,.08)",color:"#34d399",cursor:"pointer",fontSize:11}}>
            + Campo com nome livre
          </button>
        </div>
      )}
      {open&&<div className="system-card-body" style={{padding:"12px 14px",borderTop:`1px solid ${T.border}`}}>{children}
        {customFields.map(f=><div key={f.id} style={{marginTop:10,padding:"9px 10px",border:`1px solid ${T.border}`,borderRadius:8,background:T.bgInput}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}><FL>{f.label}</FL><button onClick={()=>onRemoveCustomField&&onRemoveCustomField(id,f.id)} title="Remover campo" style={{border:"none",background:"none",color:"#f87171",cursor:"pointer"}}>✕</button></div>
          <textarea defaultValue={f.value||""} onBlur={e=>onUpdateCustomField&&onUpdateCustomField(id,f.id,e.target.value)} rows={2} style={{width:"100%",background:T.bgCard,border:`1px solid ${T.borderStrong}`,borderRadius:6,padding:"7px 9px",color:T.text1,fontFamily:"inherit",resize:"vertical"}}/>
        </div>)}
      </div>}
      {open&&textSections.length>0&&<SystemTextSections sections={textSections}/>}
      {open && preview!==null && (
        <div style={{borderTop:"2px solid rgba(251,191,36,0.25)",background:"rgba(251,191,36,0.03)",padding:"10px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:9,color:"#fbbf24",fontFamily:mono,letterSpacing:2}}>TEXTO — edite antes de copiar</span>
            <button onClick={()=>setPreview(txtFn?txtFn():"")}
              style={{fontSize:10,color:"#64748b",background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:4,padding:"1px 7px",cursor:"pointer"}}>
              ↺ Regenerar
            </button>
          </div>
          <textarea value={preview} onChange={e=>setPreview(e.target.value)}
            rows={Math.max(3,preview.split("\n").length+1)}
            style={{width:"100%",background:"rgba(0,0,0,0.25)",border:"1px solid rgba(251,191,36,0.2)",
              borderRadius:8,padding:"8px 10px",color:"#e2e8f0",fontSize:12,resize:"vertical",
              fontFamily:"'DM Mono',monospace",lineHeight:1.65}}/>
          <button onClick={copiar}
            style={{marginTop:6,width:"100%",padding:"8px",borderRadius:7,fontWeight:700,fontSize:13,
              background:cp2?"rgba(52,211,153,0.12)":"rgba(251,191,36,0.08)",
              border:`1px solid ${cp2?"#34d399":"rgba(251,191,36,0.3)"}`,
              color:cp2?"#34d399":"#fbbf24",cursor:"pointer",fontFamily:"inherit"}}>
            {cp2?"✅ Copiado!":"📋 Copiar este texto"}
          </button>
        </div>
      )}
    </div>
  );
};

// Registros seriados com data/hora para monitorizações realizadas mais de uma vez ao dia.
// O objeto inteiro fica no campo da evolução, preservando parâmetros padrão e personalizados.
function numPocus(value){const n=parseFloat(String(value??"").replace(",","."));return Number.isFinite(n)?n:null;}
function calcPocusCardiacOutput(values={},patient={}){
  const diam=numPocus(values.lvotDiam),vti=numPocus(values.vtiVE),fc=numPocus(values.fc);
  const peso=numPocus(patient.peso),altura=numPocus(patient.altura);
  if(![diam,vti,fc].every(n=>n!==null&&n>0))return null;
  const area=Math.PI*Math.pow(diam/2,2),vs=area*vti,dc=vs*fc/1000;
  const sc=[peso,altura].every(n=>n!==null&&n>0)?Math.sqrt((peso*altura)/3600):null;
  return {area,vs,dc,sc,ic:sc?dc/sc:null};
}
function calcPocusDerived(values={},patient={}){
  const co=calcPocusCardiacOutput(values,patient),ee=numPocus(values.ee),tacc=numPocus(values.tacc),psap=numPocus(values.psap);
  const vciMax=numPocus(values.vciMax),vciMin=numPocus(values.vciMin);
  const invasiva=VM_INVASIVA_MODOS.includes(patient.vm_modo);
  let vci=null;
  if(vciMax!==null&&vciMin!==null&&vciMax>0&&vciMin>=0&&vciMax>=vciMin){
    if(invasiva){const indice=vciMin>0?(vciMax-vciMin)/vciMin*100:null;const pvc=indice===null?null:(vciMax<=2.1&&indice>50?3:vciMax>2.1&&indice<50?15:8);vci={tipo:"distensibilidade",indice,pvc,pvcBaixaConfiabilidade:true};}
    else {const indice=(vciMax-vciMin)/vciMax*100;const pvc=vciMax<=2.1&&indice>50?3:vciMax>2.1&&indice<50?15:8;vci={tipo:"colapsabilidade",indice,pvc,pvcBaixaConfiabilidade:false};}
  }
  return {co,pcwp:ee!==null?1.24*ee+1.9:null,papmTacc:tacc!==null?(tacc<120?90-0.62*tacc:79-0.45*tacc):null,papmPsap:psap!==null?psap*0.61+2:null,vci,invasiva};
}

function SerialMeasurements({title,fieldKey,fields=[],suggestedParams=[],value,onChange,color="#38bdf8",subjective=false,calculator,patient,workflow=false,compactHistory=false,latestOnly=false}){
  const T=useTheme();
  const [showParamMenu,setShowParamMenu]=useState(false);
  const [expandedHistory,setExpandedHistory]=useState({});
  const today=new Date().toISOString().slice(0,10);
  const state=value&&typeof value==="object"&&!Array.isArray(value)?value:{entries:[],customParams:[]};
  const entries=Array.isArray(state.entries)?state.entries:[],customParams=Array.isArray(state.customParams)?state.customParams:[];
  const latestEntryId=entries.reduce((latest,e)=>!latest||`${e.data||""}T${e.hora||"00:00"}`>=`${latest.data||""}T${latest.hora||"00:00"}`?e:latest,null)?.id;
  const allFields=[...(subjective?[{key:"avaliacao",label:"Avaliação subjetiva",wide:true}]:[]),...fields,...customParams.map(p=>({...p,key:p.key,label:p.label}))];
  const emit=next=>onChange({...state,...next});
  const add=()=>emit({entries:[...entries,{id:`sm_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,data:new Date().toISOString().slice(0,10),hora:new Date().toTimeString().slice(0,5),momento:entries.length?"reavaliacao":"avaliacao",interpretacao:"",conduta:"",values:{}}]});
  const upd=(id,key,val)=>emit({entries:entries.map(e=>e.id===id?{...e,[key]:val}:e)});
  const updVal=(id,key,val)=>emit({entries:entries.map(e=>e.id===id?{...e,values:{...(e.values||{}),[key]:val}}:e)});
  const remove=id=>emit({entries:entries.filter(e=>e.id!==id)});
  const addParam=()=>{const label=window.prompt("Nome da nova variável:");if(!label?.trim())return;const key=`p_${Date.now().toString(36)}`;emit({customParams:[...customParams,{key,label:label.trim()}]});setShowParamMenu(false);};
  const addSuggested=p=>{if(fields.some(f=>f.key===p.key))return;const active=customParams.some(f=>f.key===p.key);if(active){emit({customParams:customParams.filter(f=>f.key!==p.key),entries:entries.map(e=>{const values={...(e.values||{})};delete values[p.key];return {...e,values};})});}else emit({customParams:[...customParams,p]});};
  return <div style={{marginTop:9,border:`1px solid ${color}33`,borderRadius:9,background:`${color}08`,overflow:"hidden"}}>
    <div style={{display:"flex",alignItems:"center",padding:"7px 9px",borderBottom:(entries.length||showParamMenu)?`1px solid ${color}22`:0}}><span style={{fontSize:10,fontFamily:mono,letterSpacing:1.2,color,fontWeight:700}}>{title}</span>{fields.some(f=>f.reference)&&<span title="Faixas usuais de referência; não são alvos terapêuticos e devem ser interpretadas no contexto clínico" style={{fontSize:8,color:T.text4,marginLeft:7,fontFamily:mono}}>refs usuais ⓘ</span>}<button onClick={()=>setShowParamMenu(v=>!v)} style={{marginLeft:"auto",border:0,background:"transparent",color:showParamMenu?color:T.text3,fontSize:10,cursor:"pointer"}}>+ variável</button><button onClick={add} style={{marginLeft:5,padding:"3px 8px",borderRadius:6,border:`1px solid ${color}55`,background:`${color}12`,color,cursor:"pointer",fontSize:10,fontWeight:700}}>+ medida</button></div>
    {showParamMenu&&<div style={{padding:"6px 9px",display:"flex",gap:5,flexWrap:"nowrap",overflowX:"auto",alignItems:"center",borderBottom:entries.length?`1px solid ${T.border}`:0}}>{suggestedParams.filter(p=>!fields.some(f=>f.key===p.key)).map(p=>{const active=customParams.some(f=>f.key===p.key);return <button key={p.key} onClick={()=>addSuggested(p)} title={active?"Clique para remover":"Clique para adicionar"} style={{flex:"0 0 auto",whiteSpace:"nowrap",padding:"3px 8px",borderRadius:12,border:`1px solid ${active?"rgba(248,113,113,.5)":`${color}44`}`,background:active?"rgba(248,113,113,.10)":`${color}10`,color:active?"#f87171":color,fontSize:9,cursor:"pointer"}}>{active?"✕ ":"+ "}{p.label}</button>})}<button onClick={addParam} style={{flex:"0 0 auto",whiteSpace:"nowrap",padding:"3px 8px",borderRadius:12,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text2,fontSize:9,cursor:"pointer"}}>+ Nome livre</button></div>}
    {entries.map((e,i)=>{const anterior=i>0?entries[i-1]:null;const historica=(latestOnly&&e.id!==latestEntryId)||(compactHistory&&e.data&&e.data!==today);if(historica&&!expandedHistory[e.id]){const preenchidas=Object.values(e.values||{}).filter(v=>String(v??"").trim()).length;return <button key={e.id} onClick={()=>setExpandedHistory(x=>({...x,[e.id]:true}))} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 9px",border:0,borderTop:i?`1px solid ${T.border}`:0,background:T.bgCard,color:T.text2,cursor:"pointer",textAlign:"left"}}><span style={{fontSize:10,fontFamily:mono,color}}>{e.data?new Date(`${e.data}T00:00:00`).toLocaleDateString("pt-BR"):"sem data"}{e.hora?` · ${e.hora}`:""}</span><span style={{fontSize:9,color:T.text3}}>{preenchidas} parâmetro(s){e.interpretacao?" · com interpretação":""}{e.conduta?" · com conduta":""}</span><span style={{marginLeft:"auto",fontSize:10,color:T.text3}}>▾ consultar</span></button>}return <div key={e.id} style={{padding:"8px 9px",borderTop:i?`1px solid ${T.border}`:0}}>
      {historica&&<button onClick={()=>setExpandedHistory(x=>({...x,[e.id]:false}))} style={{float:"right",marginBottom:5,border:0,background:"transparent",color:T.text3,fontSize:9,cursor:"pointer"}}>▴ minimizar</button>}
      <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:6}}><input type="date" value={e.data||""} onChange={x=>upd(e.id,"data",x.target.value)} style={{width:125,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"4px 6px",color:T.text1,fontSize:10}}/><input type="time" value={e.hora||""} onChange={x=>upd(e.id,"hora",x.target.value)} style={{width:82,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"4px 6px",color:T.text1,fontSize:10}}/>{workflow&&<select value={e.momento||(i?"reavaliacao":"avaliacao")} onChange={x=>upd(e.id,"momento",x.target.value)} style={{background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"4px 6px",color:T.text1,fontSize:10}}><option value="avaliacao">Avaliação</option><option value="pos_intervencao">Após intervenção</option><option value="reavaliacao">Reavaliação</option></select>}<span style={{fontSize:9,color:T.text4}}>#{i+1}</span><button onClick={()=>remove(e.id)} style={{marginLeft:"auto",border:0,background:"transparent",color:"#f87171",cursor:"pointer"}}>✕</button></div>
      <div style={{display:"grid",gridTemplateColumns:fieldKey==="cvPocusSerial"?`repeat(${Math.max(fields.length,1)},minmax(96px,1fr))`:"repeat(auto-fit,minmax(115px,1fr))",gap:5,minWidth:fieldKey==="cvPocusSerial"?`${Math.max(fields.length,1)*101}px`:undefined,overflowX:"auto",paddingBottom:fieldKey==="cvPocusSerial"?2:0}}>{allFields.map(f=>{const atual=numPocus(e.values?.[f.key]),prev=numPocus(anterior?.values?.[f.key]),delta=atual!==null&&prev!==null?atual-prev:null;return <label key={f.key} style={{fontSize:9,color:T.text3,gridColumn:f.wide?"1 / -1":undefined}}><span>{f.label}</span>{f.reference&&<span title="Faixa usual; interpretar no contexto clínico" style={{marginLeft:4,fontSize:8,color:T.text4,whiteSpace:"nowrap"}}>ref. {f.reference}</span>}<div style={{position:"relative"}}><input value={e.values?.[f.key]||""} onChange={x=>updVal(e.id,f.key,x.target.value)} style={{display:"block",width:"100%",marginTop:2,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:`5px ${delta!==null?24:6}px 5px 6px`,color:T.text1,fontSize:10}}/>{delta!==null&&delta!==0&&<span title={`Variação desde #${i}: ${delta>0?"+":""}${delta.toFixed(2)}`} style={{position:"absolute",right:6,top:7,fontSize:9,color:delta>0?"#f59e0b":"#38bdf8"}}>{delta>0?"↑":"↓"}</span>}</div></label>})}</div>
      {workflow&&<div style={{display:"grid",gridTemplateColumns:"minmax(180px,1fr) minmax(220px,1.4fr)",gap:6,marginTop:7}}><label style={{fontSize:9,color:T.text3}}>INTERPRETAÇÃO / ALVO<input value={e.interpretacao||""} onChange={x=>upd(e.id,"interpretacao",x.target.value)} placeholder="Ex.: baixo fluxo, provável responsividade..." style={{display:"block",width:"100%",marginTop:2,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"6px 7px",color:T.text1,fontSize:10}}/></label><label style={{fontSize:9,color:T.text3}}>CONDUTA APÓS ESTA AVALIAÇÃO<input value={e.conduta||""} onChange={x=>upd(e.id,"conduta",x.target.value)} placeholder="Ex.: volume 250 mL, titular nora, iniciar dobutamina..." style={{display:"block",width:"100%",marginTop:2,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"6px 7px",color:T.text1,fontSize:10}}/></label></div>}
      {calculator==="pocus-co"&&(()=>{const c=calcPocusDerived(e.values,patient),tem=!!(c.co||c.pcwp!==null||c.papmTacc!==null||c.papmPsap!==null||c.vci);return <div style={{marginTop:7,padding:"7px 9px",borderRadius:7,border:`1px solid ${tem?"rgba(52,211,153,.28)":T.border}`,background:tem?"rgba(52,211,153,.07)":T.bgCard,fontSize:10,color:tem?"#34d399":T.text4,fontFamily:mono}}>{tem?<>{c.co&&<div>VS <b>{c.co.vs.toFixed(0)} mL</b> · DC <b>{c.co.dc.toFixed(2)} L/min</b> · IC <b>{c.co.ic?`${c.co.ic.toFixed(2)} L/min/m²`:"— (informe peso e altura)"}</b></div>}{c.pcwp!==null&&<div>PCWP estimada <b>{c.pcwp.toFixed(1)} mmHg</b> <span style={{color:T.text3}}>(1,24 × E/e′ + 1,9)</span></div>}{c.papmTacc!==null&&<div>PAPm por TAcc <b>{c.papmTacc.toFixed(1)} mmHg</b></div>}{c.papmPsap!==null&&<div>PAPm por PSAP <b>{c.papmPsap.toFixed(1)} mmHg</b></div>}{c.vci&&<div>VCI — índice de {c.vci.tipo}: <b>{c.vci.indice!==null?`${c.vci.indice.toFixed(1)}%`:"—"}</b>{c.vci.pvc!==null&&<> · PVC estimada <b>{c.vci.pvc} mmHg</b>{c.vci.pvcBaixaConfiabilidade&&<span style={{color:"#fbbf24"}}> · baixa confiabilidade em VM</span>}</>}</div>}{c.co&&<span style={{display:"block",marginTop:3,color:T.text3,fontSize:9}}>Área VSVE {c.co.area.toFixed(2)} cm²{c.co.sc?` · SC ${c.co.sc.toFixed(2)} m²`:""}</span>}</>:"Preencha os parâmetros para exibir os cálculos derivados."}</div>})()}
    </div>})}
    {!entries.length&&<div style={{padding:"7px 9px",fontSize:10,color:T.text4}}>Nenhuma medida registrada.</div>}
  </div>;
}

// Interconsultas e exames complementares estruturados, com múltiplos registros por sistema.
function ClinicalEvents({kind="interconsulta",value,onChange,color="#38bdf8",legacy=""}){
  const T=useTheme();
  const entries=Array.isArray(value)?value:[];
  const isIC=kind==="interconsulta";
  const add=()=>onChange([...entries,{id:`ce_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,data:new Date().toISOString().slice(0,10),titulo:"",avaliacao:"",conduta:"",resultado:""}]);
  const upd=(id,key,val)=>onChange(entries.map(e=>e.id===id?{...e,[key]:val}:e));
  const remove=id=>onChange(entries.filter(e=>e.id!==id));
  return <div style={{marginTop:9,border:`1px solid ${color}33`,borderRadius:9,background:`${color}08`,overflow:"hidden"}}>
    <div style={{display:"flex",alignItems:"center",padding:"7px 9px",borderBottom:entries.length?`1px solid ${color}22`:0}}><span style={{fontSize:10,fontFamily:mono,letterSpacing:1.2,color,fontWeight:700}}>{isIC?"INTERCONSULTAS":"EXAMES COMPLEMENTARES"}</span><button onClick={add} style={{marginLeft:"auto",padding:"3px 8px",borderRadius:6,border:`1px solid ${color}55`,background:`${color}12`,color,cursor:"pointer",fontSize:10,fontWeight:700}}>+ {isIC?"interconsulta":"exame"}</button></div>
    {legacy&&<div style={{padding:"6px 9px",fontSize:9,color:T.text3,borderBottom:`1px dashed ${T.border}`}}>Registro anterior: {legacy}</div>}
    {entries.map((e,i)=><div key={e.id} style={{padding:"8px 9px",borderTop:i?`1px solid ${T.border}`:0}}>
      <div style={{display:"grid",gridTemplateColumns:"130px minmax(180px,1fr) auto",gap:6,alignItems:"end"}}><label style={{fontSize:9,color:T.text3}}>DATA<input type="date" value={e.data||""} onChange={x=>upd(e.id,"data",x.target.value)} style={{display:"block",width:"100%",marginTop:2,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"5px 6px",color:T.text1,fontSize:10}}/></label><label style={{fontSize:9,color:T.text3}}>{isIC?"ESPECIALIDADE":"EXAME"}<input value={e.titulo||""} onChange={x=>upd(e.id,"titulo",x.target.value)} placeholder={isIC?"Ex.: Cardiologia":"Ex.: Ecocardiograma"} style={{display:"block",width:"100%",marginTop:2,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"5px 6px",color:T.text1,fontSize:10}}/></label><button onClick={()=>remove(e.id)} title="Excluir" style={{height:28,border:0,background:"transparent",color:"#f87171",cursor:"pointer"}}>✕</button></div>
      {isIC?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}><label style={{fontSize:9,color:T.text3}}>AVALIAÇÃO<input value={e.avaliacao||""} onChange={x=>upd(e.id,"avaliacao",x.target.value)} placeholder="Parecer e avaliação da especialidade" style={{display:"block",width:"100%",marginTop:2,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"6px 7px",color:T.text1,fontSize:10}}/></label><label style={{fontSize:9,color:T.text3}}>CONDUTA<input value={e.conduta||""} onChange={x=>upd(e.id,"conduta",x.target.value)} placeholder="Condutas propostas" style={{display:"block",width:"100%",marginTop:2,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"6px 7px",color:T.text1,fontSize:10}}/></label></div>:<label style={{display:"block",fontSize:9,color:T.text3,marginTop:6}}>RESULTADO<input value={e.resultado||""} onChange={x=>upd(e.id,"resultado",x.target.value)} placeholder="Resultado ou status do exame" style={{display:"block",width:"100%",marginTop:2,background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:5,padding:"6px 7px",color:T.text1,fontSize:10}}/></label>}
    </div>)}
    {!entries.length&&!legacy&&<div style={{padding:"7px 9px",fontSize:10,color:T.text4}}>Nenhum registro.</div>}
  </div>;
}

const SERIAL_MONITOR_CONFIG={
  nDTC:{title:"DTC — REGISTROS SERIADOS",color:"#a78bfa",fields:[{key:"bnoD",label:"Bainha do nervo óptico D"},{key:"bnoE",label:"Bainha do nervo óptico E"},{key:"acmIP",label:"ACM IP"},{key:"acmFVd",label:"ACM FVd"},{key:"lindegaard",label:"Lindegaard"}]},
  cvPocusSerial:{title:"POCUS — CICLO HEMODINÂMICO",color:"#f87171",subjective:true,calculator:"pocus-co",workflow:true,compactHistory:true,fields:[{key:"vciMax",label:"VCI maior (cm)",reference:"≤2,1"},{key:"vciMin",label:"VCI menor (cm)"},{key:"lvotDiam",label:"Diâmetro VSVE (cm)"},{key:"vtiVE",label:"VTI VE (cm)",reference:"18–22"},{key:"fc",label:"FC (bpm)"},{key:"vtiVD",label:"VTI VD"},{key:"ea",label:"E/A",reference:"0,8–2"},{key:"ee",label:"E/e'",reference:"<8; >14 alto"}],suggestedParams:[{key:"tacc",label:"TAcc (ms)",reference:">130"},{key:"fac",label:"FAC (%)",reference:"≥35%"},{key:"tapse",label:"TAPSE (mm)",reference:"≥17"},{key:"psap",label:"PSAP (mmHg)",reference:"≤35"}]},
  cvPiccoSerial:{title:"PiCCO — CICLO HEMODINÂMICO",color:"#f87171",workflow:true,compactHistory:true,fields:[{key:"pvc",label:"PVC",reference:"2–6 mmHg"},{key:"ic",label:"IC",reference:"3–5 L/min/m²"},{key:"gedi",label:"GEDI",reference:"680–800 mL/m²"},{key:"elwi",label:"ELWI",reference:"3–7 mL/kg"},{key:"pvpi",label:"PVPI",reference:"1–3"},{key:"svri",label:"SVRI",reference:"1700–2400"},{key:"vvs",label:"VVS",reference:"<10–13%"},{key:"tdci",label:"tdCI",reference:"3–5 L/min/m²"},{key:"gef",label:"GEF",reference:"25–35%"}]},
  cvPerfusaoSerial:{title:"PERFUSÃO — ΔCO₂ / ΔPP · CICLO HEMODINÂMICO",color:"#f87171",workflow:true,compactHistory:true,fields:[{key:"deltaCO2",label:"ΔCO₂ (mmHg)",reference:"<6"},{key:"deltaPP",label:"ΔPP (%)",reference:"<10%; >13 sugere resposta"},{key:"lactato",label:"Lactato",reference:"<2 mmol/L"},{key:"svcO2",label:"ScvO₂ (%)",reference:"70–80%"}]},
  cvSwanSerial:{title:"SWAN-GANZ — REGISTROS SERIADOS",color:"#f87171",compactHistory:true,fields:[{key:"pvc",label:"PVC"},{key:"paps",label:"PAPs"},{key:"papd",label:"PAPd"},{key:"papm",label:"PAPm"},{key:"pcp",label:"PCP"},{key:"dc",label:"DC"},{key:"ic",label:"IC"},{key:"svo2",label:"SvO₂"},{key:"rvs",label:"RVS"}]},
  cvBiaSerial:{title:"BIA — REGISTROS SERIADOS",color:"#f87171",fields:[{key:"assistencia",label:"Relação de assistência"},{key:"trigger",label:"Trigger"},{key:"augmentacao",label:"Augmentação"},{key:"pasAssistida",label:"PAS assistida"},{key:"pasNaoAssistida",label:"PAS não assistida"},{key:"diastolicaAumentada",label:"Diastólica aumentada"},{key:"pam",label:"PAM"}]},
  reLusSerial:{title:"LUS — AVALIAÇÕES SERIADAS",color:"#38bdf8",subjective:true,workflow:true,compactHistory:true,fields:[{key:"htd",label:"HTD"},{key:"hte",label:"HTE"}]},
  rmTrsSerial:{title:"TSR — SESSÕES",color:"#34d399",latestOnly:true,fields:[{key:"modalidade",label:"Modalidade"},{key:"uf",label:"UF"},{key:"duracao",label:"Tempo de duração"},{key:"intercorrencias",label:"Intercorrências"}]},
  rmPocusSerial:{title:"POCUS RENAL — REGISTROS SERIADOS",color:"#34d399",subjective:true,fields:[{key:"vci",label:"VCI"},{key:"vexus",label:"VExUS / congestão"},{key:"rins",label:"Rins"},{key:"bexiga",label:"Bexiga"}]},
  tgPocusSerial:{title:"POCUS ABDOMINAL — REGISTROS SERIADOS",color:"#fb923c",subjective:true,fields:[{key:"vesicula",label:"Vesícula"},{key:"viasBiliares",label:"Vias biliares"},{key:"alcas",label:"Alças"},{key:"liquidoLivre",label:"Líquido livre"}]},
};

// Row/Col já existem no escopo de módulo (definidos mais acima, usados por SysBlock) — reaproveitados aqui, não redeclarados.
const FL=({children})=>{const T=useTheme();return <div style={{fontSize:10,color:T.text3,fontFamily:mono,letterSpacing:1,marginBottom:3}}>{children}</div>;};
const ClinicalGroup=({label,color="#64748b",children})=>{const T=useTheme();return <section className="clinical-group" style={{marginBottom:10}}>
  <div style={{display:"flex",alignItems:"center",gap:8,margin:"2px 0 7px",fontSize:9,color:T.colorScheme==="light"?T.text2:color,fontFamily:mono,letterSpacing:1.5,fontWeight:700}}>
    <span>{label}</span><span style={{height:1,flex:1,background:T.colorScheme==="light"?T.border:`${color}25`}}/>
  </div>
  {children}
</section>;};

function EvolucaoEditor({ leito, campos, onCampoEdit, config={}, tabelaHoje={}, tabelaDataLeito={}, onMetaChange, metas=[], onLeitoChange }) {
  const T = useTheme();
  const [copiado, setCopiado] = useState({});
  const hoje = new Date().toISOString().split("T")[0];
  const isAntigo = (fieldName) => {
    const dataEdicao = campos._datas?.[fieldName];
    return dataEdicao && dataEdicao < hoje;
  };
  const salvar = onCampoEdit || (()=>{});
  const peso = parseFloat(leito.peso) || null;
  const pp   = pesoPredito(leito.altura, leito.sexo);
  const vc6  = pp ? Math.round(parseFloat(pp)*6) : null;
  const dias = diasInternacao(leito.dataInternacao);
  const idade = idadeDoLeito(leito);
  const disps = leito.dispositivos || {};
  const ativos = [
    ...DISP_MULTIPLO.flatMap(d=>(Array.isArray(disps[d.key])?disps[d.key]:[]).map((inst,i)=>({
      label:(Array.isArray(disps[d.key])&&disps[d.key].length>1)?`${d.label} ${i+1}`:d.label,
      icone:d.icone, alertaDias:d.alertaDias, disp:inst
    }))),
    ...DISP_SINGULAR.filter(d=>disps[d.key]?.ativo).map(d=>({
      label:d.label, icone:d.icone, alertaDias:d.alertaDias, disp:disps[d.key]
    })),
    ...(Array.isArray(disps.custom)?disps.custom:[]).map(d=>({label:d.nome||"Dispositivo personalizado",icone:d.icone||"🔌",alertaDias:d.alertaDias||21,disp:d})),
  ];

  // Refs para cada campo
  const refs = {
    hda:useRef(),
    nEF:useRef(), n24h:useRef(), nSeda:useRef(), nAnalg:useRef(), nPsiq:useRef(), nObs:useRef(),
    cvEF:useRef(), cv24h:useRef(), cvDVA:useRef(), cvMed:useRef(), cvPerf:useRef(), cvObs:useRef(),
    reVM:useRef(), reEF:useRef(), re24h:useRef(), reGaso:useRef(), rePocus:useRef(), reObs:useRef(),
    rm24h:useRef(), rmLabs:useRef(), rmTRS:useRef(), rmObs:useRef(),
    tgEF:useRef(), tg24h:useRef(), tgLabs:useRef(), tgObs:useRef(),
    heTemp:useRef(), heLabs:useRef(), heMed:useRef(), heAtb:useRef(), heProf:useRef(), heObs:useRef(),
    probAtivos:useRef(), probResolvidos:useRef(),
    impressao:useRef(),
  };

  // Migra controles glicêmicos antigos do TGI para Renal/Metabólico sem perder o restante do texto.
  useEffect(()=>{
    const bruto=String(campos.tg24h||"");
    const partes=bruto.split(/\s*·\s*|\n+/).map(x=>x.trim()).filter(Boolean);
    const glic=partes.filter(x=>/^(dex(?:tro)?|glic(?:emia|\.?\s*capilar)?|hgt)\b/i.test(x));
    if(!glic.length)return;
    const restante=partes.filter(x=>!glic.includes(x)).join(" · ");
    const renalAtual=String(campos.rm24h||"").trim();
    const novos=glic.filter(x=>!renalAtual.toLowerCase().includes(x.toLowerCase()));
    const renalNovo=[renalAtual,...novos].filter(Boolean).join(" · ");
    if(refs.rm24h.current)refs.rm24h.current.value=renalNovo;
    if(refs.tg24h.current)refs.tg24h.current.value=restante;
    if(renalNovo!==renalAtual)salvar("rm24h",renalNovo);
    salvar("tg24h",restante);
  },[campos.tg24h]);


  const txtN = () => {
    const p=[];
    if(get("nEF"))    p.push(`- EF: ${get("nEF")}`);
    if(get("n24h"))   p.push(`- Controles 24h: ${get("n24h")}`);
    if(get("nSeda"))  p.push(`- P: ${get("nSeda")}`);
    if(get("nAnalg")) p.push(`- A: ${get("nAnalg")}`);
    if(get("nPsiq"))  p.push(`- Psiq: ${get("nPsiq")}`);
    if(get("nObs"))   p.push(`*${get("nObs")}`);
    return p.join("\n");
  };
  const txtCv = () => {
    const p=[];
    if(get("cvEF"))   p.push(`- EF: ${get("cvEF")}`);
    if(get("cv24h"))  p.push(`- 24h: ${get("cv24h")}`);
    if(get("cvDVA"))  p.push(`- DVA: ${get("cvDVA")}`);
    if(get("cvMed"))  p.push(`- P: ${get("cvMed")}`);
    if(get("cvPerf")) p.push(`- Perfusão: ${get("cvPerf")}`);
    if(get("cvObs"))  p.push(`*${get("cvObs")}`);
    return p.join("\n");
  };
  const txtRes = () => {
    const p=[];
    const vmAtual=leito.vm_modo?gerarTextoVM(leito):get("reVM");
    if(vmAtual) p.push(`- Ventilação: ${vmAtual}`);
    if(get("reEF"))    p.push(`- EF: ${get("reEF")}`);
    if(get("re24h"))   p.push(`- 24h: ${get("re24h")}`);
    if(get("reGaso"))  p.push(`Gaso: ${get("reGaso")}`);
    if(get("rePocus")) p.push(`- POCUS: ${get("rePocus")}`);
    if(get("reObs"))   p.push(`*${get("reObs")}`);
    return p.join("\n");
  };
  const txtReMe = () => {
    const p=[];
    if(get("rm24h"))  p.push(`- 24h: ${get("rm24h")}`);
    if(get("rmLabs")) p.push(`- Labs: ${get("rmLabs")}`);
    if(get("rmTRS"))  p.push(`- TSR: ${get("rmTRS")}`);
    if(get("rmObs"))  p.push(`*${get("rmObs")}`);
    return p.join("\n");
  };
  const txtTGI = () => {
    const p=[];
    const d=leito.dieta;
    if(d?.tipo&&d.tipo!=="jejum"){
      const tl={enteral:"via SNE",parenteral:"NPT",oral:"VO",mista:"Mista"}[d.tipo]||d.tipo;
      let dl=`Dieta: ${tl}`;
      if(d.formula) dl+=` ${d.formula}`;
      if(d.moduloProteina?.ativo&&d.moduloProteina?.gramas) dl+=` + módulo proteico ${d.moduloProteina.gramas}g/d`;
      if(d.tipo==="parenteral"&&(d.suplementosNPT?.length||d.suplementacaoNPT)){const sups=[...(d.suplementosNPT||[]),d.suplementacaoNPT].filter(Boolean);dl+=` · suplementação: ${sups.join(" · ")}`;}
      if(d.volTotal24) dl+=` ${d.volTotal24}mL/24h`;
      if(d.kcalManual&&peso) dl+=` (${(parseFloat(d.kcalManual)/peso).toFixed(1)} kcal/kg/d`;
      else if(d.catalogId&&d.volTotal24){
        // recalculate inline
      }
      if(d.ptnManual&&peso)  dl+=` / ${(parseFloat(d.ptnManual)/peso).toFixed(2)} g ptn/kg/d)`;
      p.push(`- ${dl}`);
    }else if(d?.tipo==="jejum") p.push(`- Dieta: Jejum`);
    if(d?.aporteGlicose?.ativo&&d.aporteGlicose.volumeDia){const ag=calcAporteGlicose(d.aporteGlicose);p.push(`- Aporte glicêmico: SG ${d.aporteGlicose.concentracao||5}% · ${d.aporteGlicose.volumeDia} mL/dia · ${ag.kcal} kcal/dia`);}
    if(get("tgEF"))   p.push(`- EF: ${get("tgEF")}`);
    if(get("tg24h"))  p.push(`- 24h: ${get("tg24h")}`);
    const _ultEvac=get("tgUltEvac")||leito.tgUltEvac;
    const _lamg=get("tgLAMG")||leito.tgLAMG;
    if(_ultEvac){const d=Math.floor((new Date()-new Date(_ultEvac+"T00:00:00"))/86400000);p.push(`- Última evacuação: ${d}d atrás`);}
    if(_lamg)   p.push(`- LAMG: ${_lamg}`);
    if(get("tgLaxativos")) p.push(`- Laxativos: ${get("tgLaxativos")}`);
    if(get("tgLabs")) p.push(`- Labs: ${get("tgLabs")}`);
    if(get("tgObs"))  p.push(`*${get("tgObs")}`);
    return p.join("\n");
  };
  const txtHe = () => {
    const p=[];
    if(get("heLabs"))  p.push(`- Labs: ${get("heLabs")}`);
    if(get("heProf"))  p.push(`** ${get("heProf")}`);
    if(get("heObs"))   p.push(`*${get("heObs")}`);
    return p.join("\n");
  };
  const txtIn = () => {
    const p=[];
    if(get("heTemp")) p.push(`- Temperatura: ${get("heTemp")}`);
    if(get("heMed")) p.push(get("heMed"));
    if(get("heAtb"))      p.push(get("heAtb"));
    return p.join("\n");
  };

  const txtProblemas = () => {
    const p=[];
    const automaticos=problemasAtivosAutomaticos(leito,tabelaDataLeito,campos,config).map(textoProblemaAutomatico);
    const ativos=[...automaticos,get("probAtivos")].filter(Boolean).join("\n");
    if(ativos) p.push(`ATIVOS:\n${ativos}`);
    if(get("probResolvidos")) p.push(`RESOLVIDOS:\n${get("probResolvidos")}`);
    return p.join("\n");
  };

  const copiarBloco = (id, txt) => {
    const text = txt();
    if(!text) return;
    navigator.clipboard.writeText(text);
    setCopiado(c=>({...c,[id]:true}));
    setTimeout(()=>setCopiado(c=>({...c,[id]:false})),2000);
  };


  // Ctrl+B: save boletim to leito (visible in Visão Geral)
  useEffect(()=>{
    const handler = (e) => {
      if ((e.ctrlKey||e.metaKey) && e.key==="b") {
        e.preventDefault();
        const full = gerarTextoCompleto();
        if (full && onBoletim) onBoletim(full);
      }
    };
    window.addEventListener("keydown", handler);
    return ()=>window.removeEventListener("keydown", handler);
  }, [campos]);

  const gerarTextoCompleto = () => {
    try {
      // get defined at scope level
      const dt = new Date().toLocaleDateString("pt-BR");
      const dias2 = diasInternacao(leito.dataInternacao);
      let t = `EVOLUÇÃO — ${dt}`;
      if(leito.paciente) t += ` | ${leito.paciente}`;
      if(dias2!==null) t += ` D${dias2}`;
      if(leito.diagnostico) t += `\n${leito.diagnostico}`;
      const secMap = [
        ["HDA/Evolução","hdaCC"],["Neurológico","reNeuro"],["Cardiovascular","reCV"],
        ["Respiratório","reVM"],["Renal","reLab"],["Infeccioso","heAtb"],
        ["TGI","tg24h"],["Hematológico","heLabs"],["Gasometria","reGaso"],
      ];
      secMap.forEach(([label, key])=>{
        const v = get(key);
        if(v) t += `\n\n${label}:\n${v}`;
      });
      return t.trim();
    } catch(e) { return ""; }
  };

  const copiarTudo = () => {
    const dt=new Date().toLocaleDateString("pt-BR");
    let t=`EVOLUÇÃO UTI — ${dt}`;
    if(leito.paciente)    t+=`\nPaciente: ${leito.paciente}`;
    if(leito.diagnostico) t+=` | ${leito.diagnostico}`;
    if(dias!==null)       t+=` | D${dias} UTI`;
    if(leito.peso)        t+=` | ${leito.peso} kg`;
    if(pp)                t+=` | PP ${pp} kg`;
    const procs=leito.procedimentos||[];
    if(procs.length) t+="\n"+procs.map(p=>{
      const po=Math.floor((new Date()-new Date(p.data+"T00:00:00"))/86400000);
      return `${p.nome} (${po===0?"POI":`PO${po}`})`;
    }).join(" · ");
    const hdaTxt=[get("hda"),...customLines("hda")].filter(Boolean).join("\n");
    if(hdaTxt) t+=`\n\n== HDA:\n${hdaTxt}`;
    t+="\n\n";
    const blocos=[["== N:",txtNFull],["== Cv:",txtCvFull],["== Res:",txtResFull],["== ReMe:",txtReMeFull],["== TGI:",txtTGIFull],["== He:",txtHeFull],["== In:",txtInFull]];
    blocos.forEach(([h,fn])=>{ const c=fn(); if(c) t+=`${h}\n${c}\n\n`; });
    const imp = refs.impressao?.current?.value?.trim() || campos.impressao || "";
    if(imp) t+=`== Impressão:\n${imp}\n`;
    navigator.clipboard.writeText(t);
    setCopiado(c=>({...c,tudo:true}));
    setTimeout(()=>setCopiado(c=>({...c,tudo:false})),2500);
  };

  const colors={N:"#a78bfa",Cv:"#f87171",Res:"#38bdf8",ReMe:"#34d399",TGI:"#fb923c",He:"#f59e0b",In:"#94a3b8"};


  // Visibilidade dos campos opcionais/adicionáveis — persistida em campos._vis_
  const [camposVis, setCamposVisRaw] = useState(campos._vis_ || {});
  const setCamposVis = (updater) => {
    const novo = typeof updater==="function" ? updater(camposVis) : updater;
    setCamposVisRaw(novo);
    salvar("_vis_", novo);
  };
  const vis = camposVis;

  // Refs dinâmicos para campos extras adicionados
  const extraRefs = React.useRef({});
  const ExtraRef = (key) => {
    if (!extraRefs.current[key]) extraRefs.current[key] = React.createRef();
    return extraRefs.current[key];
  };
  const getExtra = (key) => extraRefs.current[key]?.current?.value?.trim() || campos[key] || "";
  const get = k => refs[k]?.current?.value || campos[k] || "";
  const customMap = campos._customFields || {};
  const customLines = id => (customMap[id]||[]).filter(f=>f.label&&String(f.value||"").trim()).map(f=>`- ${f.label}: ${String(f.value).trim()}`);
  const addCustomField = id => {
    const label=window.prompt("Nome do novo campo deste sistema:");
    if(!label||!label.trim()) return;
    const item={id:`cf_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,label:label.trim(),value:""};
    salvar("_customFields",{...customMap,[id]:[...(customMap[id]||[]),item]});
  };
  const updateCustomField = (id,fieldId,value) => salvar("_customFields",{...customMap,[id]:(customMap[id]||[]).map(f=>f.id===fieldId?{...f,value}:f)});
  const removeCustomField = (id,fieldId) => salvar("_customFields",{...customMap,[id]:(customMap[id]||[]).filter(f=>f.id!==fieldId)});
  const customProps = id => ({customFields:customMap[id]||[],onAddCustomField:addCustomField,onUpdateCustomField:updateCustomField,onRemoveCustomField:removeCustomField});
  const serialLines=(fieldKey,label)=>{
    const state=campos[fieldKey];
    if(!state||!Array.isArray(state.entries)) return [];
    const cfg=SERIAL_MONITOR_CONFIG[fieldKey]||{};
    const labels=Object.fromEntries([...(cfg.subjective?[{key:"avaliacao",label:"Avaliação subjetiva"}]:[]),...(cfg.fields||[]),...((state.customParams||[]))].map(f=>[f.key,f.label]));
    const somenteHoje=new Set(["cvPerfusaoSerial","cvPocusSerial","cvPiccoSerial","cvSwanSerial","reLusSerial"]).has(fieldKey);
    let entradas=state.entries.filter(entry=>!somenteHoje||entry.data===hoje);
    if(cfg.latestOnly&&entradas.length)entradas=[...entradas].sort((a,b)=>`${a.data||""}T${a.hora||"00:00"}`.localeCompare(`${b.data||""}T${b.hora||"00:00"}`)).slice(-1);
    return entradas.map(entry=>{
      const date=entry.data?new Date(`${entry.data}T00:00:00`).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}):"";
      const when=[date,entry.hora].filter(Boolean).join(" ");
      const calc=fieldKey==="cvPocusSerial"?calcPocusDerived(entry.values,leito):null;
      const calculated=calc?[calc.co?`VS ${calc.co.vs.toFixed(0)} mL`:null,calc.co?`DC ${calc.co.dc.toFixed(2)} L/min`:null,calc.co?.ic?`IC ${calc.co.ic.toFixed(2)} L/min/m²`:null,calc.pcwp!==null?`PCWP est. ${calc.pcwp.toFixed(1)} mmHg`:null,calc.papmTacc!==null?`PAPm(TAcc) ${calc.papmTacc.toFixed(1)} mmHg`:null,calc.papmPsap!==null?`PAPm(PSAP) ${calc.papmPsap.toFixed(1)} mmHg`:null,calc.vci&&calc.vci.indice!==null?`VCI ${calc.vci.tipo} ${calc.vci.indice.toFixed(1)}%`:null,calc.vci&&calc.vci.pvc!==null?`PVC est. ${calc.vci.pvc} mmHg`:null].filter(Boolean):[];
      const values=[...Object.entries(entry.values||{}).filter(([,v])=>String(v??"").trim()).map(([key,v])=>`${labels[key]||key} ${String(v).trim()}`),...calculated].join(" / ");
      const momento=entry.momento==="pos_intervencao"?"após intervenção":entry.momento==="reavaliacao"?"reavaliação":"avaliação";
      const detalhes=[entry.interpretacao?`Interpretação: ${entry.interpretacao}`:null,entry.conduta?`Conduta: ${entry.conduta}`:null].filter(Boolean).join(" · ");
      return values?`- ${label}${when?` [${when}]`:""}${cfg.workflow?` — ${momento}`:""}: ${values}${detalhes?`\n  ↳ ${detalhes}`:""}`:null;
    }).filter(Boolean);
  };
  const serialPanel=(fieldKey)=><SerialMeasurements fieldKey={fieldKey} {...SERIAL_MONITOR_CONFIG[fieldKey]} patient={leito} value={campos[fieldKey]} onChange={value=>onCampoEdit(fieldKey,value)}/>;
  const eventPanel=(system,kind,color)=>{const key=`${system}_${kind}`;return <ClinicalEvents kind={kind} color={color} value={campos[key]} legacy={campos[`add_${system}_${kind}`]||""} onChange={value=>onCampoEdit(key,value)}/>;};
  const eventText=(system,kind)=>{
    const key=`${system}_${kind}`,entries=Array.isArray(campos[key])?campos[key]:[];
    const legacy=String(campos[`add_${system}_${kind}`]||"").trim();
    const rows=entries.filter(e=>e.titulo||e.avaliacao||e.conduta||e.resultado).map(e=>{
      const data=e.data?new Date(`${e.data}T00:00:00`).toLocaleDateString("pt-BR"):"sem data";
      const header=`- ${e.titulo|| (kind==="interconsulta"?"Especialidade não informada":"Exame não informado")} [${data}]`;
      const sub=kind==="interconsulta"?[e.avaliacao?`  • Avaliação: ${e.avaliacao}`:null,e.conduta?`  • Conduta: ${e.conduta}`:null]:[e.resultado?`  • Resultado: ${e.resultado}`:null];
      return [header,...sub.filter(Boolean)].join("\n");
    });
    if(legacy) rows.push(`- Registro anterior: ${legacy}`);
    if(!rows.length)return "";
    return `\n${kind==="interconsulta"?"Interconsultas":"Exames complementares"}:\n${rows.join("\n")}`;
  };

  // ── txt funções completas (incluem opcionais/adicionáveis) ──
  const txtNFull = () => {
    const p=[];
    // EF compacto em uma linha: RASS 0, GCS 15, Pupilas..., Força..., BPS 3
    const ef = [
      get("nRASS")   ? `RASS ${get("nRASS").replace(/^-?\d+\s*/,"").match(/^-?\d+/)? get("nRASS").split(" ")[0] : get("nRASS")}` : "",
      get("nGlasgow")? `GCS ${get("nGlasgow")}` : "",
      get("nPupilas")? get("nPupilas") : "",
      get("nEF")     ? get("nEF") : "",
      get("nDor")    ? get("nDor").replace(/^(BPS|EVA)\s*/i,"$1 ") : "",
      get("nEFExtra")? get("nEFExtra") : "",
    ].filter(Boolean).join(", ");
    if(ef) p.push(`- EF: ${ef}`);
    if(get("nSeda"))  p.push(`- Sedação: ${get("nSeda")}`);
    if(get("nAnalg")) p.push(`- Analgesia: ${get("nAnalg")}`);
    if(get("n24h")) p.push(`- Controles 24h: ${get("n24h")}`);
    if(vis.nPsiq&&get("nPsiq")) p.push(`- Psicoativos: ${get("nPsiq")}`);
    {const NK=["propofol","midazolam","fentanil","cetamina","precedex","morfina","clonidina",...(config?.drogasCustom||[]).filter(d=>["sedacao","analgesia"].includes(d.grupo)).map(d=>d.key)];
    const vz=leito.drogasVazao||{};const fD=d=>{const n=parseFloat(d);if(isNaN(n))return d;return n<1?n.toFixed(3):n.toFixed(2);};
    const nd=NK.filter(k=>vz[k]&&parseFloat(vz[k])>0).map(k=>{
      const cf=getDrogaConfig(k,config);
      const rs=cf?calcDoseFromMLH(k,vz[k],leito.peso,undefined,cf.modoCalcDefault,config,pesoPredito(leito.altura,leito.sexo)):null;
      return `${cf?.label||k} ${vz[k]}mL/h${rs?` (≈${fD(rs.dose)} ${rs.label})`:""}`;
    });if(nd.length)p.push(`- Sedação/Analgesia (bombas): ${nd.join(" · ")}`);}
    p.push(...serialLines("nDTC","DTC"));
    if(vis.add_n_pocus&&getExtra("add_n_pocus")) p.push(`- POCUS: ${getExtra("add_n_pocus")}`);
    if(vis.nObs&&get("nObs")) p.push(`*${get("nObs")}`);
    p.push(...customLines("n"));
    if(vis.add_n_interconsulta){const e=eventText("n","interconsulta");if(e)p.push(e);}
    if(vis.add_n_exames){const e=eventText("n","exames");if(e)p.push(e);}
    return p.join("\n");
  };
  const txtCvFull = () => {
    const p=[];
    // DVA drogas de bomba
    {const CK=["noradrenalina","adrenalina","dobutamina","levossimendana","vasopressina","nitroglicerina","nitroprussiato","amiodarona","furosemida",...(config?.drogasCustom||[]).filter(d=>d.grupo==="vasoativa").map(d=>d.key)];
    const vz=leito.drogasVazao||{};const fD=d=>{const n=parseFloat(d);if(isNaN(n))return d;return n<0.01?n.toFixed(4):n<1?n.toFixed(3):n.toFixed(2);};
    const cd=CK.filter(k=>vz[k]&&parseFloat(vz[k])>0).map(k=>{
      const cf=getDrogaConfig(k,config);
      const rs=cf?calcDoseFromMLH(k,vz[k],leito.peso,undefined,cf.modoCalcDefault,config,pesoPredito(leito.altura,leito.sexo)):null;
      return `${cf?.label||k} ${vz[k]}mL/h${rs?` (≈${fD(rs.dose)} ${rs.label})`:""}`;
    });
    if(cd.length)p.push(`- DVA: ${cd.join(" · ")}`);}
    // EF: hemodinâmica; ausculta; cardioscopia
    const ef_cv = [get("cvHemo"), get("cvAusculta"), get("cvCardioscopia")?`cardioscopia: ${get("cvCardioscopia")}`:"", get("cvEF")].filter(Boolean).join("; ");
    if(ef_cv) p.push(`- EF: ${ef_cv}`);
    if(get("cvDVA"))  p.push(`- DVA: ${get("cvDVA")}`);
    if(get("cv24h"))  p.push(`- 24h: ${get("cv24h")}`);
    {const pf=[get("cvTEC")?`TEC ${get("cvTEC")}`:null,get("cvLact")?`Lactato ${get("cvLact")} mmol/L`:null,vis["cvDeltaCO2"]&&get("cvDeltaCO2")?`ΔCO₂ ${get("cvDeltaCO2")} mmHg`:null,vis["cvDeltaCO2"]&&get("cvDeltaPP")?`ΔPP ${get("cvDeltaPP")}%`:null].filter(Boolean).join(" · ");if(pf)p.push(`- Perfusão: ${pf}`);}
    if(vis.cvTropo){
      const allTropos = (()=>{
        try {
          return Object.entries(tabelaDataLeito||{})
            .filter(([k])=>!k.startsWith("_")&&!k.startsWith("__"))
            .flatMap(([d,row])=>{
              const raw=row?._tropos; if(!raw) return [];
              const arr=typeof raw==="string"?JSON.parse(raw):raw;
              return (arr||[]).map(t=>({...t,_dataOrd:(t.data||d)+(t.horario||"")}));
            }).filter(t=>t.valor).sort((a,b)=>a._dataOrd.localeCompare(b._dataOrd));
        } catch { return []; }
      })();
      if(allTropos.length){
        const bullets = allTropos.map(t=>{
          const dt=t.data?new Date(t.data+"T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}):"";
          const h=t.horario?` ${t.horario}`:"";
          return `  • [${dt}${h}] ${t.valor} ${t.unidade||"ng/mL"}`;
        }).join("\n");
        p.push(`- Troponina:\n${bullets}`);
      }
      if(get("cvTropo")) p.push(`- Obs. Troponina: ${get("cvTropo")}`);
    }
    if(vis.cvMed&&get("cvMed")) p.push(`- Medicações: ${get("cvMed")}`);
    p.push(...serialLines("cvPerfusaoSerial","Perfusão"),...serialLines("cvPocusSerial","POCUS"),...serialLines("cvPiccoSerial","PiCCO"),...serialLines("cvSwanSerial","Swan-Ganz"),...serialLines("cvBiaSerial","BIA"));
    if(vis.cvObs&&get("cvObs")) p.push(`*${get("cvObs")}`);
    p.push(...customLines("cv"));
    if(vis.add_cv_interconsulta){const e=eventText("cv","interconsulta");if(e)p.push(e);}
    if(vis.add_cv_exames){const e=eventText("cv","exames");if(e)p.push(e);}
    return p.join("\n");
  };
  const txtResFull = () => {
    const p=[];
    // Usa diretamente o suporte atual do leito; reVM permanece como fallback para registros legados.
    const nebVisivel=!Object.prototype.hasOwnProperty.call(leito.vmOpcionais||{},"neb")||!!leito.vmOpcionais.neb;
    const nebTxt = nebVisivel&&(leito.nebMed||leito.nebFreq) ? ` | Neb: ${[leito.nebMed,leito.nebFreq].filter(Boolean).join(" ")}` : "";
    const vmAtual=leito.vm_modo?gerarTextoVM(leito):get("reVM");
    if(vmAtual){const [vmLinha,...vmExtras]=vmAtual.split("\n");p.push(`- Ventilação: ${vmLinha}${nebTxt}`,...vmExtras);}
    else if(nebTxt) p.push(`- Nebulização:${nebTxt}`);
    // EF: MV + RA + outros
    const ef_res = [get("reMV"), get("reRA"), get("reEF")].filter(Boolean).join(" / ");
    if(ef_res) p.push(`- EF: ${ef_res}`);
    if(get("re24h")) p.push(`- 24h: ${get("re24h")}`);
    // Gaso com bullet
    const gasoTxt = get("reGaso");
    if(gasoTxt) {
      const bullets = gasoTxt.split("\n").map(l=>`  • ${l}`).join("\n");
      p.push(`- Gaso:\n${bullets}`);
    }
    if(vis.reLUS&&get("reLUS")&&!isAntigo("reLUS")) p.push(`- LUS: ${get("reLUS")}`);
    if(vis.rePocus&&get("rePocus")) p.push(`- POCUS: ${get("rePocus")}`);
    p.push(...serialLines("reLusSerial","LUS"));
    if(vis.reObs&&get("reObs")) p.push(`*${get("reObs")}`);
    p.push(...customLines("res"));
    if(vis.add_res_interconsulta){const e=eventText("res","interconsulta");if(e)p.push(e);}
    if(vis.add_res_exames){const e=eventText("res","exames");if(e)p.push(e);}
    return p.join("\n");
  };
  const txtReMeFull = () => {
    const p=[];
    if(get("rm24h"))  p.push(`- 24h: ${get("rm24h")}`);
    if(get("rmLabs")) p.push(`- Labs: ${get("rmLabs")}`);
    if(vis.rmTRS&&get("rmTRS")&&!campos.rmTrsSerial?.entries?.length) p.push(`- TSR: ${get("rmTRS")}`);
    p.push(...serialLines("rmTrsSerial","TSR"),...serialLines("rmPocusSerial","POCUS renal"));
    if(vis.rmObs&&get("rmObs")) p.push(`*${get("rmObs")}`);
    p.push(...customLines("reme"));
    if(vis.add_reme_interconsulta){const e=eventText("reme","interconsulta");if(e)p.push(e);}
    if(vis.add_reme_exames){const e=eventText("reme","exames");if(e)p.push(e);}
    return p.join("\n");
  };
  const txtTGIFull = () => {
    const p=[];
    const d=leito.dieta;
    if(d?.tipo&&d.tipo!=="jejum"){
      const tl={enteral:"via SNE",parenteral:"NPT",oral:"VO",mista:"Mista"}[d.tipo]||d.tipo;
      let dl=`- Dieta: ${tl}`;
      if(d.formula) dl+=` ${d.formula}`;
      if(d.vazao) dl+=` @ ${d.vazao}mL/h`;
      if(d.moduloProteina?.ativo&&d.moduloProteina?.gramas) dl+=` + módulo proteico ${d.moduloProteina.gramas}g/d`;
      if(d.tipo==="parenteral"&&(d.suplementosNPT?.length||d.suplementacaoNPT)){const sups=[...(d.suplementosNPT||[]),d.suplementacaoNPT].filter(Boolean);dl+=` · suplementação: ${sups.join(" · ")}`;}
      p.push(dl);
    } else if(d?.tipo==="jejum") p.push(`- Dieta: Jejum`);
    if(d?.aporteGlicose?.ativo&&d.aporteGlicose.volumeDia){const ag=calcAporteGlicose(d.aporteGlicose);p.push(`- Aporte glicêmico: SG ${d.aporteGlicose.concentracao||5}% · ${d.aporteGlicose.volumeDia} mL/dia · ${ag.kcal} kcal/dia`);}
    if(get("tgEF"))  p.push(`- EF: ${get("tgEF")}`);
    if(get("tg24h")) p.push(`- 24h: ${get("tg24h")}`);
    const _ultEvac=get("tgUltEvac")||leito.tgUltEvac;
    const _lamg=get("tgLAMG")||leito.tgLAMG;
    if(_ultEvac){const dx=Math.floor((new Date()-new Date(_ultEvac+"T00:00:00"))/86400000);p.push(`- Última evacuação: ${dx}d atrás`);}
    if(_lamg) p.push(`- LAMG: ${_lamg}`);
    if(get("tgLaxativos")) p.push(`- Laxativos: ${get("tgLaxativos")}`);
    if(get("tgLabs")) p.push(`- Labs: ${get("tgLabs")}`);
    if(vis.tgPocus&&get("tgPocus")) p.push(`- POCUS: ${get("tgPocus")}`);
    p.push(...serialLines("tgPocusSerial","POCUS abdominal"));
    if(vis.tgObs&&get("tgObs")) p.push(`*${get("tgObs")}`);
    p.push(...customLines("tgi"));
    if(vis.add_tgi_interconsulta){const e=eventText("tgi","interconsulta");if(e)p.push(e);}
    if(vis.add_tgi_exames){const e=eventText("tgi","exames");if(e)p.push(e);}
    return p.join("\n");
  };
  const txtHeFull = () => {
    const p=[];
    if(get("heLabs")) p.push(`- Labs: ${get("heLabs")}`);
    if(get("heProf")) p.push(`- Profilaxia TEV: ${get("heProf")}`);
    if(vis.heObs&&get("heObs")) p.push(`*${get("heObs")}`);
    p.push(...customLines("he"));
    if(vis.add_he_interconsulta){const e=eventText("he","interconsulta");if(e)p.push(e);}
    if(vis.add_he_exames){const e=eventText("he","exames");if(e)p.push(e);}
    return p.join("\n");
  };
  const fmtDataClinica = d => d ? new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR") : "não informada";
  const txtAntimicrobianos = () => {
    const p=[];
    const atbs=(leito.antibioticos||[]).filter(a=>a.nome);
    const ativos=atbs.filter(a=>!a.dataFim);
    const previos=atbs.filter(a=>a.dataFim);
    if(ativos.length){
      p.push("ANTIMICROBIANOS ATUAIS:");
      ativos.forEach(a=>{
        const dia=lblDiaAtb(diasAtb24h(a.dataInicio,a.horaInicio));
        const terapia=a.diasPlanejados?` · terapia planejada: ${a.diasPlanejados} dias`:"";
        p.push(`- ${a.nome}${dia?` · ${dia}`:""}${a.dose?` · ${a.dose}`:""}${a.via?` · ${a.via}`:""} · início: ${fmtDataClinica(a.dataInicio)}${terapia}`);
        if(/vancom/i.test(a.nome)){
          const ds=Object.keys(tabelaDataLeito||{}).filter(k=>/^\d{4}-\d{2}-\d{2}/.test(k)).sort().reverse();
          const dV=ds.find(d=>tabelaDataLeito[d]?._extra_vancomicinemia||tabelaDataLeito[d]?._extra_vancocinemia);
          const nivel=dV&&(tabelaDataLeito[dV]._extra_vancomicinemia||tabelaDataLeito[dV]._extra_vancocinemia);
          if(nivel)p.push(`  ↳ Vancocinemia [${fmtDataClinica(dV.slice(0,10))}]: ${nivel}`);
        }
      });
    }
    if(previos.length){
      if(p.length)p.push("");
      p.push("ANTIMICROBIANOS PRÉVIOS:");
      previos.forEach(a=>p.push(`- ${a.nome} · ${fmtDataClinica(a.dataInicio)} a ${fmtDataClinica(a.dataFim)}`));
    }
    if(!p.length&&get("heAtb"))p.push(get("heAtb"));
    if(vis.inProf&&get("heMed"))p.push(`\n${get("heMed")}`);
    return p.join("\n");
  };
  const txtCulturas = () => {
    const p=[];
    const temp=String(get("heTemp")||"").replace(/^\s*(?:temperatura|temp\.?)\s*(?:\([^)]*\))?\s*[:\-–—]?\s*/i,"").replace(/^\s*t\s*[:\-–—]?\s*/i,"").trim();
    if(temp)p.push(`- T 24h: ${temp}`);
    const cText = (()=>{
      const cs = leito.culturas||[];
      if(!cs.length) return "";
      return cs.map(c=>{
        const tipo=(CULTURA_TIPOS.find(x=>x.id===c.tipo)||{lbl:c.tipo||""}).lbl;
        const data=c.dataColeta?new Date(c.dataColeta+"T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}):"";
        const hdr=`${tipo}${c.material?" ("+c.material+")":""} ${data}`;
        const germes=(c.germes||[]).map(g=>{let t=g.nome||"";if(g.ufc)t+=`, ${g.ufc} UFC/mL`;if(g.resistencia)t+=`, resistência: ${g.resistencia}`;if(g.atbs)t+=` — sensível: ${g.atbs}`;return t;}).filter(Boolean).join("; ");
        return `${hdr}: ${germes||c.resultado||"aguardando resultado"}`;
      }).join("\n");
    })();
    if(cText) p.push(`- Culturas:\n${cText}`);
    return p.join("\n");
  };
  const txtInFull = () => {
    const p=[txtAntimicrobianos(),txtCulturas()].filter(Boolean);
    if(vis.inObs&&getExtra("inObs")) p.push(`*${getExtra("inObs")}`);
    p.push(...customLines("in"));
    if(vis.add_in_interconsulta){const e=eventText("in","interconsulta");if(e)p.push(e);}
    if(vis.add_in_exames){const e=eventText("in","exames");if(e)p.push(e);}
    return p.join("\n");
  };


  return (
    <div>
      <div>
      {/* ── Cabeçalho clínico (pills) ── */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"flex-start",marginBottom:12}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"stretch"}}>
        {idade!==null && <Pill label="IDADE" value={idade} unit="anos" color="#c084fc"/>}
          {dias!==null&&<Pill label="D UTI" value={`D${dias}`} unit="" color="#a78bfa"/>}
        {leito.peso&&<Pill label="PESO" value={leito.peso} unit="kg" color="#f59e0b"/>}
        {pp&&<Pill label="PP" value={pp} unit="kg" color="#fb923c"/>}
        {vc6&&<Pill label="VC 6×" value={vc6} unit="mL" color="#34d399"/>}
        </div>
        <div style={{display:"grid",gridAutoFlow:"column",gridTemplateRows:"repeat(2,max-content)",gridAutoColumns:"max-content",gap:6,alignContent:"start",maxWidth:"100%",overflowX:"auto",paddingBottom:2}}>
        {(leito.procedimentos||[]).map(p=>{
          const po=Math.floor((new Date()-new Date(p.data+"T00:00:00"))/86400000);
          const cor=po<=0?"#f87171":po<=3?"#fb923c":po<=7?"#fbbf24":"#34d399";
          return <span key={p.id} style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontFamily:mono,fontWeight:700,color:cor,background:`${cor}18`,border:`1px solid ${cor}44`}}>{p.nome.split(" ")[0]} {po===0?"POI":`PO${po}`}</span>;
        })}
        {ativos.map((a,i)=>{
          const dd=Math.floor((new Date()-new Date(a.disp.data+"T00:00:00"))/86400000);
          const al=dd>a.alertaDias;
          return <span key={i} style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontFamily:mono,color:al?"#f87171":"#64748b",background:al?"rgba(248,113,113,0.1)":"rgba(255,255,255,0.04)",border:`1px solid ${al?"rgba(248,113,113,0.3)":"rgba(255,255,255,0.08)"}`}}>{a.icone} D{dd}{al?" ⚠️":""}</span>;
        })}
        </div>
      </div>

      {/* ── Legenda + limpar ── */}
      <div style={{display:"flex",gap:16,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#64748b"}}>
          <div style={{width:12,height:12,borderRadius:3,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.15)"}}/>
          Editado hoje
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#64748b"}}>
          <div style={{width:12,height:12,borderRadius:3,background:"rgba(100,116,139,0.15)",border:"1px solid rgba(100,116,139,0.3)"}}/>
          Dia anterior — edite para atualizar
        </div>
        <button onClick={()=>{
          if(confirm("Limpar toda a evolução deste leito?")) {
            onCampoEdit && Object.keys(EVOLUCAO_VAZIA).filter(k=>k!=='_datas').forEach(k=>onCampoEdit(k,''));
          }
        }} style={{marginLeft:"auto",padding:"4px 10px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:6,color:"#f87171",fontSize:11,cursor:"pointer"}}>
          🗑 Limpar evolução
        </button>
      </div>

      {/* ── HDA ── */}
      <SysB id="hda" sigla="== HDA:" label="História da Doença Atual" color={"#c084fc"} txtFn={()=>[get("hda"),...customLines("hda")].filter(Boolean).join("\n")}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[]} adicionaveis={[]} {...customProps("hda")}>
        <Row><Col><FL>HISTÓRIA — resumo clínico para passagem de caso</FL>
          <TA fieldRef={refs.hda} defaultValue={campos.hda} isAntigo={isAntigo("hda")}
            sugestao={`Paciente ${leito.paciente||"..."}, ${leito.sexo==="F"?"do sexo feminino":"do sexo masculino"}, ${leito.peso?leito.peso+"kg":"?kg"}, internado por ${leito.diagnostico||"..."}.${dias!==null?` D${dias} de UTI.`:""}`}
            rows={4} fieldName="hda" onBlurSave={salvar}/>
        </Col></Row>
      </SysB>

      {/* ── Contexto: Diagnóstico · Procedimentos · Dispositivos ── */}
      {(leito.diagnostico||(leito.procedimentos||[]).length>0||ativos.length>0) && (
        <div style={{marginBottom:10,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden",background:T.bgCard,boxShadow:T.shadowCard}}>
          <div style={{background:T.bgCardHover,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:3,height:16,background:"#94a3b8",borderRadius:2,flexShrink:0}}/>
            <span style={{fontSize:12,fontWeight:700,color:T.text2,fontFamily:mono,letterSpacing:1.5}}>== Ctx:</span>
            <span style={{fontSize:12,color:T.text2,fontWeight:500}}>Diagnóstico · Procedimentos · Dispositivos</span>
          </div>
          <div style={{padding:"12px 14px",borderTop:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:8}}>
            {leito.diagnostico && (
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,flexShrink:0}}>DIAGNÓSTICO</span>
                <span style={{fontSize:13,color:T.text1,fontWeight:600}}>{leito.diagnostico}</span>
              </div>
            )}
            {(leito.procedimentos||[]).length>0 && (
              <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,flexShrink:0}}>PROCEDIMENTOS</span>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {(leito.procedimentos||[]).map(p=>{
                    const po=Math.floor((new Date()-new Date(p.data+"T00:00:00"))/86400000);
                    const cor=T.colorScheme==="light"?(po<=0?"#dc2626":po<=3?"#c2410c":po<=7?"#a16207":"#047857"):(po<=0?"#f87171":po<=3?"#fb923c":po<=7?"#fbbf24":"#34d399");
                    return <span key={p.id} style={{fontSize:12,fontFamily:mono,fontWeight:700,color:cor,background:`${cor}18`,border:`1px solid ${cor}44`,borderRadius:6,padding:"2px 10px"}}>{p.nome} · {po===0?"POI":`PO${po}`}</span>;
                  })}
                </div>
              </div>
            )}
            {ativos.length>0 && (
              <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,flexShrink:0}}>DISPOSITIVOS</span>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {ativos.map((a,i)=>{
                    const dd=Math.floor((new Date()-new Date(a.disp.data+"T00:00:00"))/86400000);
                    const al=dd>a.alertaDias;
                    return <span key={i} style={{fontSize:11,fontFamily:mono,fontWeight:T.colorScheme==="light"?600:400,color:al?"#dc2626":T.text2,background:al?(T.colorScheme==="light"?"#fff1f2":"rgba(248,113,113,0.08)"):T.bgCardHover,border:`1px solid ${al?(T.colorScheme==="light"?"#fca5a5":"rgba(248,113,113,0.25)"):T.borderStrong}`,borderRadius:6,padding:"2px 10px"}}>
                      {a.icone} {a.label}{a.disp.site?` · ${a.disp.site}`:""} D{dd}{al?" ⚠️":""}
                    </span>;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Dispositivos — topo do Beira-leito ── */}
      <Collapsible title="🔌 DISPOSITIVOS" defaultOpen={ativos.length>0} badge={ativos.some(a=>{const dd=Math.floor((new Date()-new Date(a.disp.data+"T00:00:00"))/86400000);return dd>a.alertaDias;})?"⚠️ revisar":(ativos.length>0?`${ativos.length} ativo(s)`:null)}>
        {onLeitoChange
          ? <DispositivosPanel dispositivos={leito.dispositivos||{}} onChange={disps=>onLeitoChange({...leito,dispositivos:disps})} alertas={config}/>
          : <div style={{fontSize:12,color:"#64748b"}}>Nenhum dispositivo editável nesta visualização.</div>}
      </Collapsible>

      <SysB id="n" sigla="== N:" label="Neurológico" color={"#a78bfa"} txtFn={txtNFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"n24h",label:"Controles 24h"},{key:"nEFExtra",label:"EF"},{key:"nPsiq",label:"Psicoativos"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."},{key:"dtc",label:"DTC"}]}
        statusFields={[{label:"RASS",value:campos.nRASS},{label:"Glasgow",value:campos.nGlasgow},{label:"Pupilas",value:campos.nPupilas},{label:"Motricidade",value:campos.nEF},{label:"Dor",value:campos.nDor}]} {...customProps("n")}>
        <ClinicalGroup label="AVALIAÇÃO" color="#a78bfa">
        <Row>
          <Col>
            <PickField label="RASS"
              options={["-5 Não responsivo","-4 Resposta à dor","-3 Abre olhos à voz","-2 Acorda brevemente","-1 Sonolento","0 Alerta e calmo","+1 Agitado","+2 Muito agitado","+3 Agressivo","+4 Combativo"]}
              value={campos.nRASS||""} onChange={v=>onCampoEdit("nRASS",v)} rows={1}/>
            <PickField label="Glasgow"
              options={["15","14","13","12","11","10","9","8","7","6","5","4","3"]}
              value={campos.nGlasgow||""} onChange={v=>onCampoEdit("nGlasgow",v)} rows={1} placeholder="Total ou O/V/M"/>
          </Col>
          <Col>
            <PickField label="Pupilas"
              options={["Isocóricas fotorreativas","Anisocóricas","Midríase bilateral fotofixas","Miose bilateral","Pupila esquerda midriática","Pupila direita midriática"]}
              value={campos.nPupilas||""} onChange={v=>onCampoEdit("nPupilas",v)} rows={1}/>
            <PickField label="Motricidade"
              options={["Força preservada globalmente","Paraplegia","Hemiplegia D","Hemiplegia E","Força reduzida difusamente","Sedado — não avaliável"]}
              value={campos.nEF||""} onChange={v=>onCampoEdit("nEF",v)} rows={2}/>
            <PickField label="Avaliação de Dor (BPS / EVA)"
              options={["BPS 3 (sem dor)","BPS 4","BPS 5","BPS 6","BPS 7","BPS 8-12 (dor máx)","EVA 0/10","EVA 1-3/10 (leve)","EVA 4-6/10 (moderada)","EVA 7-9/10 (intensa)","EVA 10/10 (máxima)","Não avaliável"]}
              value={campos.nDor||""} onChange={v=>onCampoEdit("nDor",v)} rows={1} placeholder="BPS ou EVA..."/>
          </Col>
        </Row>
        </ClinicalGroup>
        {(vis["n24h"]||campos.n24h)&&<ClinicalGroup label="CONTROLES DE 24H" color="#a78bfa"><Row><Col><TA fieldRef={refs.n24h} defaultValue={campos.n24h} isAntigo={isAntigo("n24h")} sugestao="PIC 8-15 mmHg / DVE 120 mL / PPC 56-89 mmHg" rows={1} fieldName="n24h" onBlurSave={salvar}/></Col></Row></ClinicalGroup>}
        <ClinicalGroup label="TRATAMENTO E SUPORTE" color="#a78bfa">
        <Row>
          <Col><FL>P — SEDAÇÃO</FL><TA fieldRef={refs.nSeda} defaultValue={campos.nSeda} isAntigo={isAntigo("nSeda")} rows={2} fieldName="nSeda" onBlurSave={salvar}/></Col>
          <Col><FL>A — ANALGESIA</FL><TA fieldRef={refs.nAnalg} defaultValue={campos.nAnalg} isAntigo={isAntigo("nAnalg")} rows={2} fieldName="nAnalg" onBlurSave={salvar}/></Col>
        </Row>
        {vis["nEFExtra"]&&<Row><Col><FL>EF — Detalhe adicional</FL><TA fieldRef={refs.nEFExtra} defaultValue={campos.nEFExtra} isAntigo={isAntigo("nEFExtra")} rows={2} fieldName="nEFExtra" onBlurSave={salvar}/></Col></Row>}
        {/* Bombas: Sedação/Analgesia */}
        <MiniBombas title="SEDAÇÃO / ANALGESIA (BOMBAS)"
          drogaKeys={["propofol","midazolam","fentanil","cetamina","precedex","morfina","clonidina"]}
          gruposCustom={["sedacao","analgesia"]}
          peso={leito.peso} pesoPreditoValor={pesoPredito(leito.altura,leito.sexo)} vazoes={leito.drogasVazao||{}} config={config}
          onVazaoChange={(k,v)=>onLeitoChange&&onLeitoChange({...leito,drogasVazao:{...(leito.drogasVazao||{}),[k]:v}})}/>
        </ClinicalGroup>
        {vis["nPsiq"]&&<Row><Col><FL>PSICOATIVOS</FL><TA fieldRef={refs.nPsiq} defaultValue={campos.nPsiq} isAntigo={isAntigo("nPsiq")} rows={2} fieldName="nPsiq" onBlurSave={salvar}/></Col></Row>}
        {vis["add_n_interconsulta"]&&eventPanel("n","interconsulta","#a78bfa")}
        {vis["add_n_exames"]&&eventPanel("n","exames","#a78bfa")}
        {vis["add_n_dtc"]&&serialPanel("nDTC")}
        {vis["add_n_pocus"]&&<Row><Col><FL>POCUS</FL><TA fieldRef={ExtraRef("add_n_pocus")} defaultValue={campos["add_n_pocus"]} isAntigo={isAntigo("add_n_pocus")} rows={2} fieldName="add_n_pocus" onBlurSave={salvar}/></Col></Row>}
        {vis["nObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.nObs} defaultValue={campos.nObs} isAntigo={isAntigo("nObs")} rows={2} fieldName="nObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="cv" sigla="== Cv:" label="Cardiovascular" color={"#f87171"} txtFn={txtCvFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"cvEF",label:"EF Cardiovascular (outros)"},{key:"cvMed",label:"Medicações"},{key:"cvTropo",label:"Troponina"},{key:"cvDeltaCO2",label:"ΔCO₂/ΔPP"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."},{key:"pocus",label:"POCUS"},{key:"picco",label:"PiCCO"},{key:"swan",label:"Swan-Ganz"},{key:"bia",label:"BIA"}]}
        statusFields={[{label:"Hemodinâmica",value:campos.cvHemo},{label:"Ausculta",value:campos.cvAusculta},{label:"Cardioscopia",value:campos.cvCardioscopia}]} {...customProps("cv")}>
        <ClinicalGroup label="AVALIAÇÃO" color="#f87171">
        <Row>
          <Col>
            <PickField label="Hemodinâmica"
              options={["Estável sem DVA","Compensado com DVA em queda","Compensado com DVA mantida","Instável com DVA em ascensão"]}
              value={campos.cvHemo||""} onChange={v=>onCampoEdit("cvHemo",v)} rows={1}/>
            <PickField label="Cardioscopia"
              options={["Ritmo sinusal","FA com RVR","FA controlada","Flutter atrial","BAV 1° grau","BAV 2° grau","BCRD","BCRE"]}
              value={campos.cvCardioscopia||""} onChange={v=>onCampoEdit("cvCardioscopia",v)} rows={1}/>
          </Col>
          <Col>
            <PickField label="Ausculta cardíaca"
              options={["BNF RCR 2T sem sopros","BHNF RCR 2T","BNF IRR 2T","Sopro sistólico","Sopro diastólico","HS audíveis"]}
              value={campos.cvAusculta||""} onChange={v=>onCampoEdit("cvAusculta",v)} rows={1}/>
            {vis.cvEF&&<><FL>EF Cardiovascular (outros)</FL><TA fieldRef={refs.cvEF} defaultValue={campos.cvEF} isAntigo={isAntigo("cvEF")} rows={2} fieldName="cvEF" onBlurSave={salvar}/></>}
          </Col>
        </Row>
        </ClinicalGroup>
                {/* ── DVA / Bombas Cardiovasculares ── */}
        <ClinicalGroup label="TRATAMENTO E SUPORTE" color="#f87171">
        {onLeitoChange&&<MiniBombas title="DVA / BOMBAS CARDIOVASCULARES"
          drogaKeys={["noradrenalina","adrenalina","dobutamina","levossimendana","vasopressina","nitroglicerina","nitroprussiato","amiodarona","furosemida"]}
          gruposCustom={["vasoativa"]}
          peso={leito.peso} pesoPreditoValor={pesoPredito(leito.altura,leito.sexo)} vazoes={leito.drogasVazao||{}} config={config}
          onVazaoChange={(k,v)=>onLeitoChange({...leito,drogasVazao:{...(leito.drogasVazao||{}),[k]:v}})}/>}
        {vis["cvMed"]&&<Row><Col><FL>P — MEDICAÇÕES CV</FL><TA fieldRef={refs.cvMed} defaultValue={campos.cvMed} isAntigo={isAntigo("cvMed")} sugestao="Atenolol 25mg / Furosemida 40mg/d" rows={1} fieldName="cvMed" onBlurSave={salvar}/></Col></Row>}
        </ClinicalGroup>
        <ClinicalGroup label="MONITORIZAÇÃO · 24H" color="#f87171">
        <Row>
          <Col><FL>24h — FC · PAM (mín-máx)</FL><TA fieldRef={refs.cv24h} defaultValue={campos.cv24h} isAntigo={isAntigo("cv24h")} rows={1} fieldName="cv24h" onBlurSave={salvar}/></Col>
        </Row>
        <Row>
        <Col><FL>Perfusão — TEC</FL>
          <input key={campos.cvTEC||""} defaultValue={campos.cvTEC||""}
            placeholder="< 3s" onBlur={e=>salvar("cvTEC",e.target.value)}
            style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12,fontFamily:mono}}/></Col>
        <Col><FL>Perfusão — Lactato</FL>
          <input defaultValue={campos.cvLact||""}
            placeholder="mmol/L" onBlur={e=>salvar("cvLact",e.target.value)}
            style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12,fontFamily:mono}}/></Col>
      </Row>
      {vis["cvDeltaCO2"]&&<>{(campos.cvDeltaCO2||campos.cvDeltaPP)&&<div style={{fontSize:9,color:T.text3,margin:"3px 0 5px",fontFamily:mono}}>Registro legado: ΔCO₂ {campos.cvDeltaCO2||"—"} mmHg · ΔPP {campos.cvDeltaPP||"—"}%</div>}{serialPanel("cvPerfusaoSerial")}</>}
        </ClinicalGroup>
        {vis["cvTropo"]&&<Row><Col>
          <FL>🫀 Troponina</FL>
          {(()=>{
            const allTropos = (()=>{
              try {
                return Object.entries(tabelaDataLeito||{})
                  .filter(([k])=>!k.startsWith("_")&&!k.startsWith("__"))
                  .flatMap(([d,row])=>{
                    const raw = row?._tropos;
                    if(!raw) return [];
                    const arr = typeof raw==="string"?JSON.parse(raw):raw;
                    return (arr||[]).map(t=>({...t, _dataOrd:(t.data||d)+(t.horario||"")}));
                  })
                  .filter(t=>t.valor)
                  .sort((a,b)=>a._dataOrd.localeCompare(b._dataOrd));
              } catch { return []; }
            })();
            if(!allTropos.length) return <div style={{fontSize:10,color:"#334155",marginBottom:4}}>Nenhuma troponina lançada. Adicione na aba 🫀 Troponina.</div>;
            return (
              <div style={{background:"rgba(248,113,113,0.04)",border:"1px solid rgba(248,113,113,0.12)",borderRadius:6,padding:"6px 8px",marginBottom:4,fontSize:11,fontFamily:"'DM Mono',monospace",color:"#94a3b8"}}>
                {allTropos.map(t=>{
                  const dt = t.data ? new Date(t.data+"T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}) : "";
                  const h = t.horario ? ` ${t.horario}` : "";
                  return <div key={t.id} style={{marginBottom:2}}>{`[${dt}${h}] ${t.valor} ${t.unidade||"ng/mL"}`}</div>;
                })}
              </div>
            );
          })()}
          <FL>Obs. Troponina (manual)</FL>
          <TA fieldRef={refs.cvTropo} defaultValue={campos.cvTropo} isAntigo={isAntigo("cvTropo")} rows={1} fieldName="cvTropo" onBlurSave={salvar}/>
        </Col></Row>}
        {vis["add_cv_interconsulta"]&&eventPanel("cv","interconsulta","#f87171")}
        {vis["add_cv_exames"]&&eventPanel("cv","exames","#f87171")}
        {vis["add_cv_pocus"]&&serialPanel("cvPocusSerial")}
        {vis["add_cv_picco"]&&serialPanel("cvPiccoSerial")}
        {vis["add_cv_swan"]&&serialPanel("cvSwanSerial")}
        {vis["add_cv_bia"]&&serialPanel("cvBiaSerial")}
        {vis["cvObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.cvObs} defaultValue={campos.cvObs} isAntigo={isAntigo("cvObs")} sugestao="Eco beira-leito amanhã" rows={1} fieldName="cvObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="res" sigla="== Res:" label="Respiratório" color={"#38bdf8"} txtFn={txtResFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."},{key:"lus",label:"LUS"}]}
        statusFields={[{label:"Modo de suporte",value:leito.vm_modo},{label:"EF — Ausculta",value:campos.reEF}]} {...customProps("res")}>
        {/* ── Suporte Ventilatório ── */}
        <ClinicalGroup label="SUPORTE VENTILATÓRIO" color="#38bdf8">
        {onLeitoChange&&<VentilacaoPanel leito={leito} onChange={onLeitoChange} integrated tabelaDataLeito={tabelaDataLeito} glasgowNeurologico={campos.nGlasgow}/>}
        {!onLeitoChange&&leito.vm_modo&&(()=>{
          const vm2=VM_MODOS.find(m=>m.id===leito.vm_modo);
          return vm2?<div style={{padding:"6px 10px",background:"rgba(56,189,248,0.04)",border:"1px solid rgba(56,189,248,0.1)",borderRadius:7,marginBottom:8,fontSize:11,fontFamily:"'DM Mono',monospace",color:"#94a3b8"}}>
            <span style={{color:"#38bdf8",fontWeight:700}}>🫁 {vm2.label}</span>
            {leito.vm_fio2&&<span style={{marginLeft:8}}>FiO₂ {leito.vm_fio2}%</span>}
            {leito.vm_peep&&<span style={{marginLeft:8}}>PEEP {leito.vm_peep}</span>}
            {leito.vm_ps&&<span style={{marginLeft:8}}>PS {leito.vm_ps}</span>}
            {leito.nebMed&&<span style={{marginLeft:8,color:"#a3e635"}}>💨 {leito.nebMed} {leito.nebFreq}</span>}
          </div>:null;
        })()}
        </ClinicalGroup>
        <ClinicalGroup label="AVALIAÇÃO E MONITORIZAÇÃO" color="#38bdf8">
        <Row>
          <Col><FL>EF — Ausculta</FL><TA fieldRef={refs.reEF} defaultValue={campos.reEF} isAntigo={isAntigo("reEF")} sugestao="MV + bilateralmente c/ roncos" rows={1} fieldName="reEF" onBlurSave={salvar}/></Col>
          <Col><FL>24h — FR / Sat (mín-máx)</FL><TA fieldRef={refs.re24h} defaultValue={campos.re24h} isAntigo={isAntigo("re24h")} sugestao="FR 41 - 20 / Sat 96 - 92" rows={1} fieldName="re24h" onBlurSave={salvar}/></Col>
        </Row>
        <Row><Col><FL>Gasometria</FL><TA fieldRef={refs.reGaso} defaultValue={campos.reGaso||(()=>{
            try {
              const raw=tabelaHoje?._gasos;
              const gasos=raw?(typeof raw==="string"?JSON.parse(raw):raw):[];
              if(!gasos.length) return "";
              return gasos.map(g=>{
                const dt2=g.data&&g.data!==d?new Date(g.data+"T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})+" ":"";
                const h=g.horario?`${dt2}[${g.horario}] `:dt2;
                const parts=[g.ph?`pH ${g.ph}`:"",g.hco3?`HCO3 ${g.hco3}`:"",g.pco2?`pCO2 ${g.pco2}`:"",g.po2?`pO2 ${g.po2}`:"",g.be?`BE ${g.be}`:"",g.sato2?`SatO2 ${g.sato2}%`:""].filter(Boolean).join(" / ");
                return h+parts;
              }).join("\n");
            } catch { return ""; }
          })()} isAntigo={isAntigo("reGaso")} sugestao="pH 7,41 / pCO2 40 / pO2 69 / bic 25 / SatO2 94%" rows={1} fieldName="reGaso" onBlurSave={salvar}/></Col></Row>
        </ClinicalGroup>
        {vis["rePocus"]&&<Row><Col><FL>POCUS — Data · Achados</FL><TA fieldRef={refs.rePocus} defaultValue={campos.rePocus} isAntigo={isAntigo("rePocus")} sugestao="22/04: Excursão 0,87 / Fen 12%" rows={1} fieldName="rePocus" onBlurSave={salvar}/></Col></Row>}
        {vis["add_res_lus"]&&serialPanel("reLusSerial")}
        {vis["add_res_interconsulta"]&&eventPanel("res","interconsulta","#38bdf8")}
        {vis["add_res_exames"]&&eventPanel("res","exames","#38bdf8")}
        {vis["add_res_outro"]&&<Row><Col><FL>OUTRO</FL><TA fieldRef={ExtraRef("add_res_outro")} defaultValue={campos["add_res_outro"]||""} rows={1} fieldName="add_res_outro" onBlurSave={salvar}/></Col></Row>}
        {vis["reObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.reObs} defaultValue={campos.reObs} isAntigo={isAntigo("reObs")} sugestao="Tentar reduzir PS amanhã" rows={1} fieldName="reObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="reme" sigla="== ReMe:" label="Renal / Metabólico" color={"#34d399"} txtFn={txtReMeFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."},{key:"trs",label:"TSR"},{key:"pocus",label:"POCUS"}]}
        statusFields={[{label:"24h — HD/BH/Dextro",value:campos.rm24h},{label:"Labs renais/metabólicos",value:campos.rmLabs}]} {...customProps("reme")}>
        <ClinicalGroup label="FUNÇÃO RENAL E MONITORIZAÇÃO" color="#34d399">
        {/* Em uso de ATB? — somente leitura, refletindo o bloco Infeccioso (relevante p/ ajuste de dose renal) */}
        {(()=>{
          const atbsAtivos = (leito.antibioticos||[]).filter(a=>!a.dataFim&&a.nome);
          return (
            <Row><Col>
              <FL>Em uso de ATB?</FL>
              {atbsAtivos.length>0 ? (
                <div style={{padding:"6px 10px",background:"rgba(148,163,184,0.06)",border:"1px solid rgba(148,163,184,0.18)",borderRadius:7,fontSize:12,color:"#cbd5e1"}}>
                  sim — {atbsAtivos.map(a=>`${a.nome}${a.dataInicio?` ${lblDiaAtb(diasAtb24h(a.dataInicio,a.horaInicio))}`:""}`).join(", ")}
                </div>
              ) : (
                <div style={{padding:"6px 10px",background:"rgba(148,163,184,0.03)",border:"1px solid rgba(148,163,184,0.1)",borderRadius:7,fontSize:12,color:"#64748b"}}>
                  não
                </div>
              )}
            </Col></Row>
          );
        })()}
        <Row><Col><FL>24h — HD · BH · Dextro</FL><TA fieldRef={refs.rm24h} defaultValue={campos.rm24h} isAntigo={isAntigo("rm24h")} sugestao="HD 3000 / BH +1084 > +1508 / Dextro 90–160" rows={1} fieldName="rm24h" onBlurSave={salvar}/></Col></Row>
        <Row><Col><FL>Labs — Cr · Ur · K · Na · Cai · Mg · P</FL><TA fieldRef={refs.rmLabs} defaultValue={campos.rmLabs} isAntigo={isAntigo("rmLabs")} sugestao="Cr 1,56 > 1,27 / Ur 66 > 47 / K 4,2 > 4,1 / Na 143 > 141" rows={1} fieldName="rmLabs" onBlurSave={salvar}/></Col></Row>
        </ClinicalGroup>
        {vis["rmTRS"]&&<ClinicalGroup label="TERAPIA RENAL SUBSTITUTIVA" color="#34d399"><Row><Col><FL>TSR (registro anterior)</FL><TA fieldRef={refs.rmTRS} defaultValue={campos.rmTRS} isAntigo={isAntigo("rmTRS")} rows={1} fieldName="rmTRS" onBlurSave={salvar}/></Col></Row></ClinicalGroup>}
        {vis["add_reme_trs"]&&serialPanel("rmTrsSerial")}
        {vis["add_reme_pocus"]&&serialPanel("rmPocusSerial")}
        {vis["add_reme_interconsulta"]&&eventPanel("reme","interconsulta","#34d399")}
        {vis["add_reme_exames"]&&eventPanel("reme","exames","#34d399")}
        {vis["rmObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.rmObs} defaultValue={campos.rmObs} isAntigo={isAntigo("rmObs")} sugestao="Repor K se < 3,5" rows={1} fieldName="rmObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="tgi" sigla="== TGI:" label="Gastrointestinal" color={"#fb923c"} txtFn={txtTGIFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"tgLabs",label:"Labs hepáticos"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."},{key:"pocus",label:"POCUS"}]}
        statusFields={[{label:"Via/Dieta",value:leito.dieta?.tipo},{label:"Última evacuação",value:campos.tgUltEvac}]} {...customProps("tgi")}>
                {/* ── Dieta ── */}
        <ClinicalGroup label="NUTRIÇÃO E TERAPIA" color="#fb923c">
        {onLeitoChange&&<DietaPanel dados={leito} config={config} onChange={onLeitoChange} integrated tabelaDataLeito={tabelaDataLeito}
          diureseHojeVol={(()=>{const v=tabelaHoje?.c24_diet_vol;return v?parseFloat(v):0;})()}/>}
        {!onLeitoChange&&leito.dieta?.tipo&&<div style={{padding:"6px 10px",background:"rgba(251,146,60,0.05)",borderRadius:7,marginBottom:8,fontSize:11,color:"#94a3b8"}}>
          🍽 {leito.dieta.tipo} {leito.dieta.formula} {leito.dieta.vazao&&`@ ${leito.dieta.vazao} mL/h`}
        </div>}
        </ClinicalGroup>
        <ClinicalGroup label="AVALIAÇÃO E MONITORIZAÇÃO" color="#fb923c">
        <div style={{padding:"12px 14px",border:"1px solid rgba(251,146,60,.22)",borderRadius:12,background:"linear-gradient(135deg,rgba(251,146,60,.055),rgba(251,146,60,.015))"}}>
        <Row>
          <Col><FL>Última evacuação</FL><div style={{position:"relative"}}><input type="date" value={campos.tgUltEvac||""} onChange={e=>onCampoEdit("tgUltEvac",e.target.value)} style={{width:"100%",boxSizing:"border-box",height:36,background:T.bgInput,border:`1px solid ${T.borderStrong}`,borderRadius:8,padding:"6px 10px",color:T.text1,fontSize:12}}/>{campos.tgUltEvac&&<span style={{position:"absolute",right:36,top:10,fontSize:9,color:T.text3,fontFamily:mono,pointerEvents:"none"}}>{Math.floor((new Date()-new Date(campos.tgUltEvac+"T00:00:00"))/86400000)}d</span>}</div></Col>
          <Col><FL>Laxativos</FL><CompactMultiSelect value={campos.tgLaxativos||""} onChange={v=>onCampoEdit("tgLaxativos",v)} placeholder="Sem laxativos ou esquema…" options={["Sem laxativos","Lactulose","Macrogol","Bisacodil","Enema"]}/></Col>
          <Col><FL>Profilaxia LAMG</FL><input list="tgi-lamg" value={campos.tgLAMG||""} onChange={e=>onCampoEdit("tgLAMG",e.target.value)} placeholder="Sem profilaxia ou esquema…" style={{width:"100%",boxSizing:"border-box",height:36,background:T.bgInput,border:`1px solid ${T.borderStrong}`,borderRadius:8,padding:"6px 10px",color:T.text1,fontSize:12}}/><datalist id="tgi-lamg">{["Sem profilaxia","Omeprazol 40mg EV 1x/d","Esomeprazol 40mg SNE 1x/d","Omeprazol 80mg EV 1x/d","Pantoprazol 40mg EV 1x/d"].map(x=><option key={x} value={x}/>)}</datalist></Col>
        </Row>
<Row>
          <Col><FL>EF — Abdome</FL><TA fieldRef={refs.tgEF} defaultValue={campos.tgEF} isAntigo={isAntigo("tgEF")} sugestao="Abdômen globoso, flácido, indolor à palpação." rows={2} fieldName="tgEF" onBlurSave={salvar}/></Col>
          <Col><FL>24h — Evacuação · Drenos digestivos</FL><TA fieldRef={refs.tg24h} defaultValue={campos.tg24h} isAntigo={isAntigo("tg24h")} sugestao="Evacuações 2x / dreno abdominal 120 mL" rows={2} fieldName="tg24h" onBlurSave={salvar}/></Col>
        </Row>
        {(vis["tgLabs"]||campos.tgLabs)&&<Row><Col><FL>Labs — TGO · TGP · Bili · FA · GGT · Alb</FL><TA fieldRef={refs.tgLabs} defaultValue={campos.tgLabs} isAntigo={isAntigo("tgLabs")} sugestao="TGO 45 / TGP 32 / BT 1.2 / Alb 2.8" rows={1} fieldName="tgLabs" onBlurSave={salvar}/></Col></Row>}
        </div>
        </ClinicalGroup>
        {vis["add_tgi_interconsulta"]&&eventPanel("tgi","interconsulta","#fb923c")}
        {vis["add_tgi_pocus"]&&serialPanel("tgPocusSerial")}
        {vis["add_tgi_exames"]&&eventPanel("tgi","exames","#fb923c")}
        {vis["tgObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.tgObs} defaultValue={campos.tgObs} isAntigo={isAntigo("tgObs")} sugestao="Omeprazol para LAMG" rows={1} fieldName="tgObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="he" sigla="== He:" label="Hematológico" color={"#f59e0b"} txtFn={txtHeFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."}]}
        statusFields={[{label:"Labs hematológicos",value:campos.heLabs},{label:"Profilaxia TEV",value:campos.heProf}]} {...customProps("he")}>
        <ClinicalGroup label="AVALIAÇÃO E MONITORIZAÇÃO" color="#f59e0b">
        <Row><Col><FL>Labs — Hb · Leuco · Bastões · Plaq</FL><TA fieldRef={refs.heLabs} defaultValue={campos.heLabs} isAntigo={isAntigo("heLabs")} sugestao="7,6 > 7,5 / Leuco 21k > 14k / Bastões 5% > 4% / Plaq 191k > 251k" rows={1} fieldName="heLabs" onBlurSave={salvar}/></Col></Row>
        </ClinicalGroup>
        <ClinicalGroup label="PROFILAXIA TEV" color="#f59e0b"><Row><Col><PickField label="Modalidade" options={["Sem profilaxia TEV","HNF","Enoxaparina 40mg","Enoxaparina 20mg"]} value={campos.heProf||""} onChange={v=>onCampoEdit("heProf",v)} rows={1} placeholder="Digite outra modalidade..."/></Col></Row></ClinicalGroup>
        {vis["add_he_interconsulta"]&&eventPanel("he","interconsulta","#f59e0b")}
        {vis["add_he_exames"]&&eventPanel("he","exames","#f59e0b")}
        {vis["heObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.heObs} defaultValue={campos.heObs} isAntigo={isAntigo("heObs")} sugestao="Aguarda cultura / BAAR negativo" rows={1} fieldName="heObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="in" sigla="== In:" label="Infeccioso" color={"#94a3b8"} txtFn={txtInFull}
        textSections={[
          {id:"antimicrobianos",title:"ANTIMICROBIANOS — TEXTO PARA O TASY",txtFn:txtAntimicrobianos,color:"#38bdf8"},
          {id:"culturas",title:"CULTURAS — TEXTO PARA O TASY",txtFn:txtCulturas,color:"#a3e635"},
        ]}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"inProf",label:"Profilaxias"},{key:"inObs",label:"Obs"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."}]}
        statusFields={[{label:"Temperatura",value:campos.heTemp},{label:"Antibióticos/Culturas",value:((leito.antibioticos||[]).length>0||(leito.culturas||[]).length>0)?"1":""}]} {...customProps("in")}>

        <ClinicalGroup label="ANTIMICROBIANOS E TRATAMENTO" color="#94a3b8">
        {vis["inProf"]&&<Row><Col><FL>Profilaxias / Outros medicamentos</FL><TA fieldRef={refs.heMed} defaultValue={campos.heMed} isAntigo={isAntigo("heMed")} sugestao="Bactrim + Ác fólico / Eritropoietina 4000 UI 48/48h" rows={2} fieldName="heMed" onBlurSave={salvar}/></Col></Row>}
                {/* ── Antibioticoterapia ── */}
        {onLeitoChange?(<>
          <AntibioticosPanel
            antibioticos={leito.antibioticos||[]}
            onChange={atbs=>onLeitoChange({...leito,antibioticos:atbs})}
            crSerico={(()=>{const ds=Object.keys(tabelaDataLeito||{}).filter(k=>!k.startsWith("_")).sort().reverse();for(const d of ds){if(tabelaDataLeito[d]?.cr)return tabelaDataLeito[d].cr;}return "";})()}
            peso={leito.peso||""}
            idadeAnos={idadeDoLeito(leito)}
            sexo={leito.sexo||"M"}
            vancocinemia={ultimoValorTabela(tabelaDataLeito,["_extra_vancocinemia","_extra_vancomicinemia"])}/>
          {/* ── Sugestão de ajuste de dose por ClCr, inline por ATB — ações rápidas ── */}
          {(()=>{
            const crHojeIn=(()=>{const ds=Object.keys(tabelaDataLeito||{}).filter(k=>!k.startsWith("_")).sort().reverse();for(const d of ds){if(tabelaDataLeito[d]?.cr)return tabelaDataLeito[d].cr;}return "";})();
            const clcrIn = calcClCr(crHojeIn, leito.peso, idadeDoLeito(leito), leito.sexo||"M");
            if (!clcrIn) return null;
            const ativos = (leito.antibioticos||[]).filter(a=>!a.dataFim&&a.nome&&!a.ajusteRevisado);
            return ativos.map(a=>{
              const diasA = diasAtb24h(a.dataInicio, a.horaInicio);
              if (diasA===null || diasA<2) return null;
              const aj = atbAjusteRenal(a.nome, clcrIn);
              if (!aj || aj.ok) return null;
              const aplicar = () => onLeitoChange({...leito, antibioticos:(leito.antibioticos||[]).map(x=>x.id===a.id?{...x,dose:aj.rec,ajusteRevisado:true}:x)});
              const manter  = () => onLeitoChange({...leito, antibioticos:(leito.antibioticos||[]).map(x=>x.id===a.id?{...x,ajusteRevisado:true}:x)});
              return (
                <div key={a.id} style={{marginTop:6,padding:"8px 10px",background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:8}}>
                  <div style={{fontSize:11,color:"#fbbf24",marginBottom:6}}>⚠ {a.nome} — ClCr {clcrIn} mL/min → sugestão: {aj.rec}</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={aplicar} style={{padding:"4px 10px",borderRadius:6,border:"1px solid rgba(52,211,153,0.4)",background:"rgba(52,211,153,0.1)",color:"#34d399",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                      Aplicar sugestão
                    </button>
                    <button onClick={manter} style={{padding:"4px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.04)",color:"#94a3b8",fontSize:11,cursor:"pointer"}}>
                      Manter dose atual
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </>):(
          <Row><Col><FL>Antibióticos</FL><TA fieldRef={refs.heAtb} defaultValue={campos.heAtb} isAntigo={isAntigo("heAtb")} rows={3} fieldName="heAtb" onBlurSave={salvar}/></Col></Row>
        )}
        </ClinicalGroup>
        <ClinicalGroup label="MICROBIOLOGIA E VIGILÂNCIA" color="#94a3b8">
        <Row><Col><FL>Temperatura nas últimas 24h — mín · máx</FL><TA fieldRef={refs.heTemp} defaultValue={campos.heTemp} isAntigo={isAntigo("heTemp")} rows={1} fieldName="heTemp" onBlurSave={salvar}/></Col></Row>
        <Row><Col>
          <FL>🧫 Culturas</FL>
          {(leito.culturas||[]).length>0 ? (
            <div style={{background:"rgba(163,230,53,0.04)",border:"1px solid rgba(163,230,53,0.12)",borderRadius:7,padding:"6px 9px",marginBottom:4}}>
              {(leito.culturas||[]).map(c=>{
                const tipo=(CULTURA_TIPOS.find(x=>x.id===c.tipo)||{lbl:c.tipo||""}).lbl;
                const data2=c.dataColeta?new Date(c.dataColeta+"T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}):"";
                const hdr=`${tipo}${c.material?" ("+c.material+")":""} ${data2}`;
                const germes=(c.germes||[]).map(g=>{let t=g.nome||"";if(g.ufc)t+=`, ${g.ufc} UFC/mL`;if(g.resistencia)t+=`, ${g.resistencia}`;if(g.atbs)t+=` — sensível: ${g.atbs}`;return t;}).filter(Boolean).join("; ");
                return <div key={c.id} style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"#94a3b8",marginBottom:2}}>{`${hdr}: ${germes||c.resultado||"aguardando resultado"}`}</div>;
              })}
            </div>
          ) : <div style={{fontSize:10,color:"#334155",marginBottom:4}}>Nenhuma cultura. Adicione na aba 🧫 Culturas.</div>}
        </Col></Row>
        </ClinicalGroup>
        {vis["add_in_interconsulta"]&&eventPanel("in","interconsulta","#94a3b8")}
        {vis["add_in_exames"]&&eventPanel("in","exames","#94a3b8")}
        {vis["inObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={ExtraRef("inObs")} defaultValue={campos["inObs"]||""} sugestao="Reavaliação com culturas em 48h" rows={1} fieldName="inObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>



      {/* ── Impressão ── */}
      <div style={{marginBottom:10,border:`1px solid rgba(56,189,248,0.2)`,borderRadius:10,overflow:"hidden",background:"rgba(56,189,248,0.02)"}}>
        <div style={{display:"flex",alignItems:"center",background:"rgba(56,189,248,0.05)",padding:"10px 14px",gap:8}}>
          <div style={{width:3,height:16,background:"#38bdf8",borderRadius:2,flexShrink:0}}/>
          <span style={{fontSize:12,fontWeight:700,color:"#38bdf8",fontFamily:mono,letterSpacing:1.5}}>== Impressão:</span>
          <span style={{fontSize:12,color:"#475569",fontWeight:400}}>Impressão clínica — texto livre, sua avaliação do quadro</span>
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            <button onClick={()=>{
              const txt = refs.impressao?.current?.value?.trim() || campos.impressao || "";
              if (!txt) return;
              navigator.clipboard.writeText(txt);
              setCopiado(c=>({...c,impressao:true}));
              setTimeout(()=>setCopiado(c=>({...c,impressao:false})),2000);
            }} style={{padding:"4px 12px",borderRadius:6,border:`1px solid ${copiado.impressao?"#38bdf8":"rgba(255,255,255,0.1)"}`,background:copiado.impressao?"rgba(56,189,248,0.15)":"rgba(255,255,255,0.04)",color:copiado.impressao?"#38bdf8":"#94a3b8",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              {copiado.impressao ? "✓ Copiado" : "📋 Copiar"}
            </button>
          </div>
        </div>
        <div style={{padding:"12px 14px",borderTop:"1px solid rgba(56,189,248,0.1)"}}>
          <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:5}}>
            IMPRESSÃO CLÍNICA — texto livre, manual · sempre a última linha da evolução copiada
          </div>
          <textarea ref={refs.impressao} defaultValue={campos.impressao||""} rows={6}
            onBlur={e=>salvar("impressao", e.target.value)}
            placeholder={"Escreva aqui sua impressão clínica do quadro."}
            style={{width:"100%",background:"rgba(56,189,248,0.04)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.7}}/>
        </div>
      </div>

      <button onClick={copiarTudo} style={{width:"100%",padding:"13px",marginTop:6,background:copiado.tudo?"rgba(56,189,248,0.15)":"linear-gradient(135deg,rgba(22,163,74,0.25),rgba(21,128,61,0.25))",border:`1.5px solid ${copiado.tudo?"#38bdf8":"#0ea5e9"}`,borderRadius:10,color:copiado.tudo?"#38bdf8":"#38bdf8",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
        {copiado.tudo?"✅ Evolução completa copiada!":"📋 Copiar evolução completa"}
      </button>
      </div>
    </div>
  );
}

// ── FerramentasPanel ──────────────────────────────────────────────────────────
function FerramentasPanel() {
  const T=useTheme();
  const GRUPOS=[
    {titulo:"Protocolos institucionais do HSP",subtitulo:"Documentos oficiais para consulta assistencial",emoji:"🏥",cor:"#f59e0b",itens:[
      {emoji:"💊",titulo:"Profilaxia antibiótica cirúrgica",desc:"Hospital São Paulo / UNIFESP — recomendações por especialidade",href:"/atb_profilaxia.pdf",tipo:"PDF"},
      {emoji:"🫀",titulo:"Pós-operatório de transplante hepático",desc:"Rotina de atendimento, prescrição, monitorização e complicações",href:"/tx_hepatico.pdf",tipo:"PDF"},
    ]},
    {titulo:"Recursos institucionais",subtitulo:"Planilhas, contatos e arquivos compartilhados",emoji:"🗂️",cor:"#14b8a6",itens:[
      {emoji:"🩻",titulo:"Planilha de TC/RM",desc:"Organização e acompanhamento de solicitações de imagem",href:"https://docs.google.com/spreadsheets/d/1Dqg1K3P8EcQVIVHC0avx3pFGQsRk_JCR/edit?gid=377139871#gid=377139871",tipo:"Planilha"},
      {emoji:"🏠",titulo:"Planilha de altas",desc:"Registro e acompanhamento das altas da unidade",href:"https://docs.google.com/spreadsheets/d/1A5H88kbX7J5x3AekIK6J4aqaoQh61EOe9i4_na45sj0/edit?gid=0#gid=0",tipo:"Planilha"},
      {emoji:"☎️",titulo:"Lista de ramais",desc:"Ramais e contatos internos do Hospital São Paulo",href:"/lista-ramais-hsp.pdf",tipo:"PDF"},
      {emoji:"📁",titulo:"Drive DMI",desc:"Pasta institucional compartilhada da DMI",href:"https://drive.google.com/drive/u/4/folders/0AAzMMZ2SYGfSUk9PVA",tipo:"Drive"},
    ]},
    {titulo:"Links clínicos",subtitulo:"Ferramentas externas de consulta rápida",emoji:"🔗",cor:"#38bdf8",itens:[
      {emoji:"🫁",titulo:"Checklist de IOT",desc:"Passo a passo para intubação e via aérea difícil",href:"https://docs.google.com/forms/d/e/1FAIpQLSdGRgBUwki8uJGM2_IAEo1oFHiNlR-QIIZzt9a3oRKa11lPHw/viewform?usp=send_form",tipo:"Checklist"},
      {emoji:"🧮",titulo:"MDCalc",desc:"Calculadoras médicas e escores clínicos",href:"https://www.mdcalc.com/",tipo:"Site"},
      {emoji:"📚",titulo:"MCBEV",desc:"Protocolos, guias e materiais da equipe",href:"https://linktr.ee/mcbev",tipo:"Links"},
    ]},
  ];

  return (
    <div style={{padding:"24px",maxWidth:1180,margin:"0 auto",width:"100%"}}>
      <div style={{marginBottom:26}}>
        <div style={{fontSize:24,fontWeight:800,color:T.text1,marginBottom:6}}>📚 Links & Protocolos</div>
        <div style={{fontSize:13,color:T.text3}}>Acesso rápido aos documentos institucionais e às ferramentas usadas na rotina da UTI.</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:26}}>
        {GRUPOS.map(grupo=><section key={grupo.titulo} style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:16,padding:"18px 20px",boxShadow:T.shadowCard}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:15,paddingBottom:12,borderBottom:`1px solid ${T.border}`}}>
            <span style={{fontSize:22}}>{grupo.emoji}</span>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:grupo.cor}}>{grupo.titulo}</div>
              <div style={{fontSize:11,color:T.text3,marginTop:2}}>{grupo.subtitulo}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12}}>
            {grupo.itens.map(item=><a key={item.titulo} href={item.href} target="_blank" rel="noreferrer" style={{textDecoration:"none",minHeight:118,padding:"15px 16px",background:T.bgInput,border:`1px solid ${T.border}`,borderRadius:12,color:T.text1,display:"flex",flexDirection:"column",gap:8,boxShadow:T.shadow,transition:"border-color .15s, transform .15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:24}}>{item.emoji}</span>
                <div style={{fontSize:14,fontWeight:800,color:T.text1,lineHeight:1.25}}>{item.titulo}</div>
              </div>
              <div style={{fontSize:11.5,color:T.text2,lineHeight:1.45,flex:1}}>{item.desc}</div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",color:grupo.cor,fontSize:10,fontWeight:800,fontFamily:mono,textTransform:"uppercase",letterSpacing:.7}}><span>{item.tipo}</span><span>Abrir ↗</span></div>
            </a>)}
          </div>
        </section>)}
      </div>
    </div>
  );
}

// ── MetasPanel ────────────────────────────────────────────────────────────────
const EQUIPES = [
  {id:"enf",  label:"Enfermagem",    emoji:"🩺", cor:"#38bdf8"},
  {id:"nut",  label:"Nutrição",      emoji:"🥗", cor:"#a3e635"},
  {id:"fisio",label:"Fisioterapia",  emoji:"🫁", cor:"#f59e0b"},
  {id:"fono", label:"Fonoaudiologia",emoji:"🗣️",  cor:"#a78bfa"},
  {id:"med",  label:"Médica",        emoji:"⚕️",  cor:"#f87171"},
];
const equipeCor = (id) => (EQUIPES.find(e=>e.id===id)||{cor:"#64748b"}).cor;
const equipeLabel = (id) => (EQUIPES.find(e=>e.id===id)||{label:"Geral"}).label;
const equipeEmoji = (id) => (EQUIPES.find(e=>e.id===id)||{emoji:"📋"}).emoji;

function MetaEquipeMenu({menu,onClose,onSelect}){
  const T=useTheme();
  useEffect(()=>{if(!menu)return;const close=()=>onClose();const esc=e=>e.key==="Escape"&&onClose();window.addEventListener("click",close);window.addEventListener("keydown",esc);return()=>{window.removeEventListener("click",close);window.removeEventListener("keydown",esc);};},[menu,onClose]);
  if(!menu)return null;
  const escolher=(e,id)=>{e.stopPropagation();onSelect(id);onClose();};
  return createPortal(<div onClick={e=>e.stopPropagation()} style={{position:"fixed",left:Math.max(6,Math.min(menu.x,window.innerWidth-210)),top:Math.max(6,Math.min(menu.y,window.innerHeight-245)),zIndex:10000,width:195,padding:6,border:`1px solid ${T.borderStrong}`,borderRadius:9,background:T.bgCard,boxShadow:"0 12px 32px rgba(0,0,0,.38)"}}>
    <div style={{padding:"4px 7px 6px",fontSize:9,fontFamily:mono,letterSpacing:1.2,color:T.text3}}>DIRECIONAR META PARA</div>
    <button onClick={e=>escolher(e,"")} style={{width:"100%",padding:"7px 8px",textAlign:"left",border:0,borderRadius:6,background:!menu.equipe?T.bgCardHover:"transparent",color:T.text2,cursor:"pointer",fontSize:11}}>📋 Sem equipe</button>
    {EQUIPES.map(eq=><button key={eq.id} onClick={e=>escolher(e,eq.id)} style={{width:"100%",padding:"7px 8px",textAlign:"left",border:0,borderRadius:6,background:menu.equipe===eq.id?`${eq.cor}18`:"transparent",color:menu.equipe===eq.id?eq.cor:T.text2,cursor:"pointer",fontSize:11}}>{eq.emoji} {eq.label}{menu.equipe===eq.id?" ✓":""}</button>)}
  </div>,document.body);
}


function MetasPanel({ metas, onChange, leito={}, config={}, tabelaHoje={} }) {
  const [nova, setNova] = useState("");
  const [novaEquipe, setNovaEquipe] = useState("");
  const [novaPrioridade, setNovaPrioridade] = useState("amarelo");
  const [dragMeta, setDragMeta] = useState(null);
  const [show, setShow] = useState(false);
  const [filtroEquipe, setFiltroEquipe] = useState(""); // "" = todas

  const add = (t) => {
    if (!t.trim()) return;
    onChange([...metas, { id: Date.now(), texto: t.trim(), feito: false, status:"pendente", equipe: novaEquipe, prioridade:novaPrioridade }]);
    setNova(""); setNovaEquipe(""); setShow(false);
  };
  const s = { total:metas.length, ok:metas.filter(m=>m.feito||m.status==="cumprido").length, pend:metas.filter(m=>!m.feito&&m.status!=="cumprido").length };

  const metasFiltradas = ordenarMetas(filtroEquipe ? metas.filter(m=>m.equipe===filtroEquipe) : metas);
  const moverMeta = alvo => {
    if(!dragMeta||dragMeta===alvo.id) return;
    const ordenadas=ordenarMetas(metas);
    const origem=ordenadas.findIndex(m=>m.id===dragMeta), destino=ordenadas.findIndex(m=>m.id===alvo.id);
    if(origem<0||destino<0) return;
    const [movida]=ordenadas.splice(origem,1); ordenadas.splice(destino,0,movida);
    onChange(ordenadas.map((m,i)=>({...m,ordem:i})));
  };

  const copiarParaTASY = () => {
    const linhas = metasFiltradas.map(m => {
      const feito = m.feito || m.status==="cumprido";
      const pfx = feito ? "[✅]" : "[  ]";
      return `${pfx} ${m.texto||m}`;
    });
    if (filtroEquipe) linhas.unshift(`📋 ${equipeEmoji(filtroEquipe)} ${equipeLabel(filtroEquipe).toUpperCase()}\n`);
    navigator.clipboard?.writeText(linhas.join("\n"));
  };

  return (
    <div>
      {/* Resumo */}
      {metas.length>0 && (
        <div style={{display:"flex",gap:12,marginBottom:12,padding:"10px 14px",background:"rgba(255,255,255,0.03)",borderRadius:10}}>
          {[["TOTAL",s.total,"#e2e8f0"],["CUMPRIDAS",s.ok,"#38bdf8"],["PENDENTES",s.pend,"#f59e0b"]].map(([l,v,c])=>(
            <div key={l} style={{textAlign:"center",flex:1}}>
              <div style={{fontSize:20,fontWeight:700,color:c}}>{v}</div>
              <div style={{fontSize:10,color:"#64748b",fontFamily:mono}}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtro por equipe */}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
        <button onClick={()=>setFiltroEquipe("")}
          style={{padding:"3px 10px",borderRadius:12,border:`1px solid ${!filtroEquipe?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.1)"}`,
            background:!filtroEquipe?"rgba(255,255,255,0.1)":"transparent",
            color:!filtroEquipe?"#e2e8f0":"#64748b",cursor:"pointer",fontSize:11}}>
          Todas
        </button>
        {EQUIPES.map(e=>(
          <button key={e.id} onClick={()=>setFiltroEquipe(filtroEquipe===e.id?"":e.id)}
            style={{padding:"3px 10px",borderRadius:12,
              border:`1px solid ${filtroEquipe===e.id?e.cor+"80":"rgba(255,255,255,0.1)"}`,
              background:filtroEquipe===e.id?e.cor+"20":"transparent",
              color:filtroEquipe===e.id?e.cor:"#64748b",cursor:"pointer",fontSize:11}}>
            {e.emoji} {e.label} {metas.filter(m=>m.equipe===e.id&&!m.feito&&m.status!=="cumprido").length>0&&
              <span style={{fontWeight:700,color:e.cor}}>({metas.filter(m=>m.equipe===e.id&&!m.feito&&m.status!=="cumprido").length})</span>}
          </button>
        ))}
      </div>

      {/* Nova meta */}
      <div style={{marginBottom:8}}>
        <div style={{display:"flex",gap:5,marginBottom:6,flexWrap:"wrap"}}>
          {Object.entries(META_PRIORIDADES).map(([k,p])=><button key={k} onClick={()=>setNovaPrioridade(k)} style={{padding:"3px 9px",borderRadius:12,border:`1px solid ${novaPrioridade===k?p.cor:"rgba(255,255,255,.1)"}`,background:novaPrioridade===k?`${p.cor}20`:"transparent",color:novaPrioridade===k?p.cor:"#64748b",fontSize:10,cursor:"pointer"}}>● {p.label}</button>)}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
          {EQUIPES.map(e=>(
            <button key={e.id} onClick={()=>setNovaEquipe(novaEquipe===e.id?"":e.id)}
              style={{padding:"2px 8px",borderRadius:10,
                border:`1px solid ${novaEquipe===e.id?e.cor+"80":"rgba(255,255,255,0.1)"}`,
                background:novaEquipe===e.id?e.cor+"20":"transparent",
                color:novaEquipe===e.id?e.cor:"#64748b",cursor:"pointer",fontSize:10}}>
              {e.emoji} {e.label}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:6}}>
          <input value={nova} onChange={e=>setNova(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&add(nova)}
            placeholder={`Nova meta${novaEquipe?" — "+equipeLabel(novaEquipe):""}...`}
            style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:8,padding:"9px 12px",color:"#e2e8f0",fontSize:13}}/>
          <button onClick={()=>add(nova)}
            style={{padding:"9px 14px",background:"rgba(56,189,248,0.15)",border:"1px solid rgba(56,189,248,0.3)",
              borderRadius:8,color:"#38bdf8",cursor:"pointer",fontSize:13,fontWeight:700}}>
            +
          </button>
        </div>
      </div>

      {/* Copiar filtrados */}
      {metas.length>0&&(
        <div style={{display:"flex",gap:6,marginBottom:10}}>
        <button onClick={copiarParaTASY}
          style={{flex:1,padding:"7px",borderRadius:8,
            background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",
            color:"#64748b",cursor:"pointer",fontSize:11}}>
          📋 Copiar {filtroEquipe?equipeLabel(filtroEquipe):"todas"} para TASY
        </button>
        <button onClick={()=>onChange(reordenarMetasPorPrioridade(metas))} style={{padding:"7px 10px",borderRadius:8,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.25)",color:"#f59e0b",cursor:"pointer",fontSize:11}}>↕ Ordenar por prioridade</button>
        </div>
      )}

      {metasFiltradas.length===0 && <div style={{textAlign:"center",padding:24,color:"#334155",fontSize:13}}>
        Nenhuma {filtroEquipe?equipeLabel(filtroEquipe)+" ":""} meta cadastrada
      </div>}

      {metasFiltradas.map(m=>(
        <div key={m.id} draggable onDragStart={()=>setDragMeta(m.id)} onDragOver={e=>e.preventDefault()} onDrop={()=>moverMeta(m)} onDragEnd={()=>setDragMeta(null)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",
          background:"rgba(255,255,255,0.02)",borderRadius:10,marginBottom:6,
          border:`1px solid ${metaPrioridade(m).cor}55`,cursor:"grab"}}>
          <span title="Arraste para reordenar" style={{color:"#64748b",fontSize:14}}>⠿</span>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
              {m.equipe&&(
                <span style={{fontSize:9,padding:"1px 6px",borderRadius:8,fontFamily:mono,
                  background:equipeCor(m.equipe)+"20",color:equipeCor(m.equipe),border:`1px solid ${equipeCor(m.equipe)}40`}}>
                  {equipeEmoji(m.equipe)} {equipeLabel(m.equipe)}
                </span>
              )}
              {/* team selector */}
              <select value={m.equipe||""} onChange={e=>onChange(metas.map(x=>x.id===m.id?{...x,equipe:e.target.value}:x))}
                style={{fontSize:9,background:"transparent",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,
                  color:"#475569",cursor:"pointer",padding:"1px 3px"}}>
                <option value="">Sem equipe</option>
                {EQUIPES.map(e=><option key={e.id} value={e.id}>{e.emoji} {e.label}</option>)}
              </select>
            </div>
            <div style={{fontSize:13,color:"#cbd5e1",marginBottom:6}}>{m.texto||m}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <MetaPriorityDot meta={m} metas={metas} onChange={onChange}/>
              {["pendente","andamento","cumprido"].map(st=>(
                <button key={st} onClick={()=>onChange(metas.map(x=>x.id===m.id?{...x,status:st,feito:st==="cumprido"}:x))}
                  style={{padding:"2px 10px",borderRadius:20,
                    border:`1px solid ${(m.status||"pendente")===st?"#38bdf8":"rgba(255,255,255,0.1)"}`,
                    background:(m.status||"pendente")===st?"rgba(56,189,248,0.15)":"transparent",
                    color:(m.status||"pendente")===st?"#38bdf8":"#475569",cursor:"pointer",fontSize:11}}>
                  {st==="pendente"?"● Pendente":st==="andamento"?"◑ Andamento":"✓ Cumprido"}
                </button>
              ))}
            </div>
          </div>
          <button onClick={()=>editarTextoMeta(metas,m,onChange)} title="Editar meta" style={{background:"none",border:"none",color:"#38bdf8",cursor:"pointer",fontSize:14,padding:"2px 4px"}}>✎</button>
          <button onClick={()=>onChange(metas.filter(x=>x.id!==m.id))}
            style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:14,padding:"2px 4px"}}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}


// ── Precauções microbiológicas no sidebar ─────────────────────────────────────
function precaucaoMicrobiologica(culturas=[]) {
  const normalizar = valor => String(valor||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  const registros = culturas.map(c=>({
    texto:normalizar(`${c.tipo||""} ${c.material||""} ${c.resultado||""} ${(c.germes||[]).map(g=>`${g.nome||""} ${g.resistencia||""} ${g.atbs||""}`).join(" ")}`),
    achados:normalizar(`${c.resultado||""} ${(c.germes||[]).map(g=>`${g.nome||""} ${g.resistencia||""}`).join(" ")}`),
    status:normalizar(c.status),
    vigilancia:normalizar(c.tipo).includes("SWAB DE VIGILANCIA"),
    material:normalizar(c.material)
  }));

  // Prioridade institucional: azul > vermelho > amarelo.
  // Aceita MDN (legenda institucional) e NDM (sigla microbiológica usual).
  if(registros.some(c=>/\b(?:MDN|NDM)\b/.test(c.achados)))
    return {cor:"#2563eb",fundo:"rgba(37,99,235,.22)",label:"MDN/NDM identificado"};
  if(registros.some(c=>/\b(?:KPC|VRE|MTR)\b/.test(c.achados)||(c.vigilancia&&/\b(?:VRE|MTR)\b/.test(c.material)&&!["AGUARDANDO","PARCIAL","NEGATIVA"].includes(c.status))))
    return {cor:"#dc2626",fundo:"rgba(220,38,38,.22)",label:"KPC, VRE ou MTR identificado"};
  if(registros.some(c=>c.status==="AGUARDANDO"||c.status==="PARCIAL"))
    return {cor:"#eab308",fundo:"rgba(234,179,8,.22)",label:"Aguardando cultura ou swab"};
  return null;
}

// ── Perfil Coordenação · mapa físico da unidade ──────────────────────────────
const G1_LAYOUT={
  "604":{gridColumn:"1 / 2",gridRow:"1"},"605":{gridColumn:"2 / 3",gridRow:"1"},
  "606":{gridColumn:"3 / 4",gridRow:"1"},"607":{gridColumn:"4 / 5",gridRow:"1"},
  "608":{gridColumn:"5 / 6",gridRow:"1"},"609":{gridColumn:"6 / 7",gridRow:"1"},
  "610":{gridColumn:"7 / 8",gridRow:"1"},"611":{gridColumn:"8 / 9",gridRow:"1"},
  "612":{gridColumn:"9 / 10",gridRow:"1"},"613":{gridColumn:"9 / 10",gridRow:"3"},
  "614":{gridColumn:"9 / 10",gridRow:"4"},"615":{gridColumn:"9 / 10",gridRow:"6"},
  "616":{gridColumn:"8 / 9",gridRow:"6"},"617":{gridColumn:"7 / 8",gridRow:"6"},
  "603":{gridColumn:"1 / 2",gridRow:"6"},"602":{gridColumn:"2 / 3",gridRow:"6"},
  "601":{gridColumn:"3 / 4",gridRow:"6"},
};
const HSP_PLANILHA_ALTAS="https://docs.google.com/spreadsheets/d/1A5H88kbX7J5x3AekIK6J4aqaoQh61EOe9i4_na45sj0/edit?gid=0#gid=0";
const normalizarNomeAlta=valor=>String(valor||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\b(?:DESC|DESCONHECIDO)\.?\s*/gi,"").replace(/[^A-Z0-9 ]/gi," ").replace(/\s+/g," ").trim().toUpperCase();
const encontrarAltaDoPaciente=(paciente,altas,leitos)=>{
  const nome=normalizarNomeAlta(paciente);if(!nome)return null;
  const exata=altas.find(a=>normalizarNomeAlta(a.paciente)===nome);if(exata)return exata;
  const parcial=altas.find(a=>{const an=normalizarNomeAlta(a.paciente);return an.length>4&&nome.length>4&&(an.includes(nome)||nome.includes(an));});if(parcial)return parcial;
  // A planilha frequentemente traz somente o primeiro nome. Para não associar
  // homônimos ao leito errado, só usamos o primeiro nome quando ele é único
  // tanto entre os pacientes internados quanto entre as altas da planilha.
  const primeiro=nome.split(" ")[0];if(primeiro.length<3)return null;
  const leitosMesmoPrimeiro=leitos.filter(l=>normalizarNomeAlta(l.paciente).split(" ")[0]===primeiro).length;
  const altasMesmoPrimeiro=altas.filter(a=>normalizarNomeAlta(a.paciente).split(" ")[0]===primeiro);
  return leitosMesmoPrimeiro===1&&altasMesmoPrimeiro.length===1?altasMesmoPrimeiro[0]:null;
};

function ColetaPlantaoPanel({uti,leitos,evolPorLeito,onAplicar}){
  const T=useTheme();
  const ocupados=leitos.filter(l=>l.paciente);
  const [selecionados,setSelecionados]=useState(()=>ocupados.map(l=>l.id));
  const [arquivo,setArquivo]=useState(null),[preview,setPreview]=useState(""),[loading,setLoading]=useState(false),[erro,setErro]=useState(""),[resultado,setResultado]=useState(null),[aplicados,setAplicados]=useState([]);
  const fileRef=useRef(null);
  useEffect(()=>setSelecionados(s=>s.filter(id=>ocupados.some(l=>l.id===id))),[leitos]);
  const escolhidos=ocupados.filter(l=>selecionados.includes(l.id));
  const toggle=id=>setSelecionados(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const analisar=async()=>{if(!arquivo)return;setLoading(true);setErro("");setResultado(null);try{const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]);r.onerror=reject;r.readAsDataURL(arquivo);});const response=await fetch("/api/coleta",{method:"POST",headers:{"content-type":"application/json","x-uti-session":sessionStorage.getItem(SESSION_KEY)||""},body:JSON.stringify({imageBase64:base64,mimeType:arquivo.type||"image/jpeg"})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||"Não foi possível analisar a folha.");setResultado(payload);setAplicados((payload.leitos||[]).map((_,i)=>i));}catch(e){setErro(e.message||"Falha ao analisar a foto.");}finally{setLoading(false);}};
  const escolherArquivo=file=>{if(!file)return;setArquivo(file);setPreview(URL.createObjectURL(file));setResultado(null);setErro("");};
  const resumo=(valor,limite=150)=>{const texto=String(valor||"").replace(/\s+/g," ").trim();return texto.length>limite?`${texto.slice(0,limite-1)}…`:texto;};
  const dataCurta=valor=>{const m=String(valor||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}`:valor;};
  const paginas=[];for(let i=0;i<escolhidos.length;i+=4)paginas.push(escolhidos.slice(i,i+4));
  const vmInvasiva=l=>["vm_psv","vm_pcv","vm_vcv","vm_aprv"].includes(l.vm_modo);
  const vazao=(l,key)=>{const v=l.drogasVazao?.[key];return v!==undefined&&v!==null&&String(v).trim()!==""?`${v} mL/h`:"________";};
  const bomba=(l,sigla,key,extra="")=><><span style={{color:"#111827"}}>({sigla}{extra})</span> {vazao(l,key)}</>;
  const campoPapel=(label,key,largura="1fr")=><span key={key||label} style={{display:"flex",alignItems:"flex-end",gap:3,minWidth:0,flex:largura==="1fr"?"1 1 0":"0 0 auto",width:largura==="1fr"?"auto":largura,fontSize:7.5,whiteSpace:"nowrap"}}><b style={{fontWeight:500}}>{label}</b><i style={{display:"block",flex:1,minWidth:18,borderBottom:"1px solid #64748b",height:8}}/></span>;
  const linhaPapel=(children,key)=><div key={key} style={{display:"flex",alignItems:"center",gap:8,minWidth:0,width:"100%"}}>{children}</div>;
  const guiaFolha=(titulo,l)=>({
    "24H":<div style={{height:"100%",display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gridTemplateRows:"repeat(3,1fr)",columnGap:8,rowGap:3,alignItems:"center"}}>{[
      ["T","temp"],["FC","fc"],["PAM","pam"],["FR","fr"],["Sat","sat"],["DU","du"],["BH","bh"],["Dextro","dextro"],["(____________)","outro24"],
    ].map(([label,key])=>campoPapel(<span dangerouslySetInnerHTML={{__html:label}}/>,key))}</div>,
    "LAB":<div style={{height:"100%",display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gridTemplateRows:"repeat(5,1fr)",columnGap:7,rowGap:2,alignItems:"center"}}>{[
      ["Hb","hb"],["Leuco","leuco"],["Plaq","plaq"],["RNI","rni"],
      ["TTPA","ttpa"],["Cr","cr"],["Ur","ur"],["Na","na"],
      ["K","k"],["Mg","mg"],["Cai","cai"],["P","p"],
      ["BT","bt"],["BD","bd"],["BI","bi"],["(________)","lab1"],
      ["(________)","lab2"],["(________)","lab3"],["(________)","lab4"],["(________)","lab5"],
    ].map(([label,key])=>campoPapel(label,key))}</div>,
    "Gaso":<div style={{height:"100%",display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gridTemplateRows:"repeat(2,1fr)",columnGap:9,rowGap:4,alignItems:"center"}}>{[["pH","ph"],["pCO₂","pco2"],["pO₂","po2"],["HCO₃","hco3"],["BE","be"],["Lact","lact"]].map(([label,key])=>campoPapel(label,key))}</div>,
    "Neuro":<div style={{height:"100%",display:"grid",gridTemplateRows:"repeat(5,1fr)",rowGap:3,alignItems:"center"}}>
      {linhaPapel(<>{campoPapel("RASS","rass")}{campoPapel("GCS: AO","ao")}{campoPapel("RV","rv")}{campoPapel("RM","rm")}{campoPapel("BPS","bps")}</>,"n1")}
      {campoPapel("EF","nef")}
      {linhaPapel(<>{[["Pro","propofol"],["Pre","precedex"],["Mi","midazolam"],["Fe","fentanil"]].map(([sigla,key])=><span key={key} style={{flex:"1 1 0",minWidth:0,whiteSpace:"nowrap",fontSize:6.9}}>{bomba(l,sigla,key)}</span>)}</>,"n3")}
      {linhaPapel(<>{campoPapel("(____________)","nd1")}{campoPapel("(____________)","nd2")}</>,"n5")}
      {campoPapel("Med","nmed")}
    </div>,
    "CV":<div style={{height:"100%",display:"grid",gridTemplateRows:"repeat(5,1fr)",rowGap:3,alignItems:"center"}}>
      {linhaPapel(<>{campoPapel("TEC","tec")}{campoPapel("Cardioscopia","cardioscopia")}</>,"c1")}
      {linhaPapel(<>{[["Na","noradrenalina"],["Va","vasopressina"],["Ad","adrenalina"],["Da","dobutamina"]].map(([sigla,key])=><span key={key} style={{flex:"1 1 0",minWidth:0,whiteSpace:"nowrap",fontSize:6.9}}>{bomba(l,sigla,key)}</span>)}</>,"c2")}
      {linhaPapel(<>{campoPapel("(____________)","cvd1")}{campoPapel("(____________)","cvd2")}</>,"c4")}
      {campoPapel("POCUS","pocus")}
      {campoPapel("Med","cvmed")}
    </div>,
    "Resp":<div style={{height:"100%",display:"grid",gridTemplateRows:"repeat(3,1fr)",rowGap:4,alignItems:"center"}}>{campoPapel("EF","ref")}{campoPapel("LUS: HTE","hte")}{campoPapel("LUS: HTD","htd")}</div>,
    "Re/Me":<div style={{height:"100%",display:"flex",alignItems:"center",gap:8}}>{campoPapel("HD ____/____","hd")}{campoPapel("ou (________)","remeoutro")}</div>,
    "Vent":<div style={{height:"100%",display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gridTemplateRows:"repeat(2,1fr)",columnGap:8,rowGap:4,alignItems:"center"}}>{[["Modo","modo"],["ΔP","dpin"],["PEEP","peep"],["FiO₂","fio2"],["FR","vfr"],["VC","vc"],["Pplat","pplat"],["DP","dp"]].map(([label,key])=>campoPapel(label,key))}</div>,
    "TGI":<div style={{height:"100%",display:"grid",gridTemplateRows:"repeat(3,1fr)",rowGap:4,alignItems:"center"}}>{linhaPapel(<>{campoPapel("Dieta (____________)","dieta")}{campoPapel("Evac ___/___/___","evac")}</>,"t1")}{campoPapel("Abdome","abdome")}{campoPapel("Med","tgmed")}</div>,
    "Infec":<div style={{height:"100%",display:"grid",gridTemplateRows:"repeat(3,1fr)",rowGap:4,alignItems:"center"}}>{[1,2,3].map(i=>linhaPapel(<>{campoPapel("(____________)",`atb${i}`)}{campoPapel("in ____/____/____",`atbd${i}`)}</>,`i${i}`))}</div>,
    "Check":<div style={{height:"100%",display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gridTemplateRows:"repeat(2,1fr)",columnGap:8,rowGap:2,alignItems:"center"}}>{["○ LAMG","○ TEV","○ Córnea","○ Higiene","○ (____________)"].map((x,i)=>campoPapel(x,`check${i}`))}</div>,
  }[titulo]||"");
  const camposFolha=[
    ["24H","CONTROLES 24H","12mm"],["LAB","LABORATORIAIS","18mm"],["Gaso","GASOMETRIA","12mm"],["Neuro","NEUROLÓGICO","25mm"],["CV","CARDIOVASCULAR","25mm"],["Resp","RESPIRATÓRIO","16mm"],
    ["Vent","VENTILAÇÃO","13mm"],["Re/Me","RENAL / METABÓLICO","10mm"],["TGI","TGI / NUTRIÇÃO","16mm"],["Infec","INFECCIOSO","16mm"],["Check","CHECKLIST","9mm"],
  ];
  return <div style={{height:"100%",overflowY:"auto",padding:"18px 24px",background:T.bgPage}}>
    <style>{`@media print{body *{visibility:hidden!important}.coleta-print,.coleta-print *{visibility:visible!important}.coleta-print{position:absolute!important;inset:0!important;background:#fff!important;padding:0!important}.coleta-tools{display:none!important}.coleta-page{width:287mm!important;height:200mm!important;margin:0!important;padding:3mm!important;box-shadow:none!important;border:0!important;break-after:page;page-break-after:always}.coleta-page:last-child{break-after:auto;page-break-after:auto}}@page{size:A4 landscape;margin:5mm}`}</style>
    <div className="coleta-tools" style={{display:"flex",alignItems:"flex-start",gap:14,flexWrap:"wrap",marginBottom:14}}>
      <div><div style={{fontSize:19,fontWeight:850,color:T.text1}}>Folha de coleta · {uti?.nome}</div><div style={{fontSize:11,color:T.text3,marginTop:3}}>Escolha os leitos, imprima, preencha à mão e depois fotografe a folha.</div></div>
      <button onClick={()=>window.print()} disabled={!escolhidos.length} style={{marginLeft:"auto",padding:"8px 13px",borderRadius:8,border:`1px solid ${T.accentBorder}`,background:T.accentBg,color:T.accent,fontWeight:800,cursor:"pointer"}}>🖨️ Imprimir {escolhidos.length} leito(s)</button>
    </div>
    <div className="coleta-tools" style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:14}}>
      <button onClick={()=>setSelecionados(ocupados.map(l=>l.id))} style={{padding:"5px 9px",borderRadius:7,border:`1px solid ${T.border}`,background:T.bgCard,color:T.text2,cursor:"pointer"}}>Todos</button>
      <button onClick={()=>setSelecionados([])} style={{padding:"5px 9px",borderRadius:7,border:`1px solid ${T.border}`,background:T.bgCard,color:T.text2,cursor:"pointer"}}>Nenhum</button>
      {ocupados.map(l=><label key={l.id} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 8px",borderRadius:7,border:`1px solid ${selecionados.includes(l.id)?T.accentBorder:T.border}`,background:selecionados.includes(l.id)?T.accentBg:T.bgCard,color:selecionados.includes(l.id)?T.accent:T.text2,fontSize:10,cursor:"pointer"}}><input type="checkbox" checked={selecionados.includes(l.id)} onChange={()=>toggle(l.id)}/>{l.nome}</label>)}
    </div>
    <div className="coleta-print">
      {paginas.map((grupo,pagina)=><div className="coleta-page" key={pagina} style={{marginBottom:16,padding:10,border:"1px solid #94a3b8",borderRadius:8,background:"#fff",color:"#0f172a",boxShadow:"0 8px 24px rgba(15,23,42,.08)",overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:`92px repeat(${grupo.length},minmax(0,1fr))`,borderTop:"1px solid #475569",borderLeft:"1px solid #475569"}}>
          <div style={{padding:6,borderRight:"1px solid #475569",borderBottom:"1px solid #475569",fontSize:8,fontWeight:800}}>DATA ____/____<br/>HORA ____</div>
          {grupo.map(l=><div key={l.id} style={{padding:6,borderRight:"1px solid #475569",borderBottom:"1px solid #475569",height:"22mm"}}><div style={{fontSize:11,fontWeight:850}}>{l.nome} · {l.paciente}</div><div style={{marginTop:3,color:"#64748b",fontSize:6.8,lineHeight:1.25}}><b>Dx:</b> {resumo(l.diagnostico,95)||"—"}<br/>{(l.procedimentos||[]).length>0&&<><b>Proced.:</b> {resumo((l.procedimentos||[]).map(p=>[p.nome,p.data&&`(${dataCurta(p.data)})`].filter(Boolean).join(" ")).join(" · "),95)}<br/></>}<b>Hist.:</b> {resumo([l.doencasPrevias,evolPorLeito?.[l.id]?.hda].filter(Boolean).join(" · "),105)||"—"}</div></div>)}
          {camposFolha.flatMap(([titulo,rotulo,altura])=>[<div key={`${titulo}-rotulo`} style={{height:altura,padding:"5px 4px",borderRight:"1px solid #475569",borderBottom:"1px solid #475569",fontSize:7.2,fontWeight:900,color:"#1e293b",background:"#f1f5f9"}}>{rotulo}</div>,...grupo.map(l=><div key={`${titulo}-${l.id}`} style={{height:altura,padding:["24H","LAB"].includes(titulo)?"3px 6px":"4px 5px",borderRight:"1px solid #475569",borderBottom:"1px solid #475569",fontSize:7,lineHeight:1.42,color:"#475569",background:titulo==="Vent"&&!vmInvasiva(l)?"#f8fafc":"#fff",overflow:"hidden"}}>{guiaFolha(titulo,l)}</div>)])}
        </div>
      </div>)}
    </div>
    <div className="coleta-tools" style={{marginTop:18,padding:14,border:`1px solid ${T.border}`,borderRadius:12,background:T.bgCard}}>
      <div style={{fontSize:14,fontWeight:800,color:T.text1}}>📷 Importar a folha preenchida</div><div style={{fontSize:10,color:T.text3,margin:"4px 0 10px"}}>A IA separa os dados pelo número do leito. Revise os pacientes reconhecidos antes de aplicar.</div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>escolherArquivo(e.target.files?.[0])}/>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><button onClick={()=>fileRef.current?.click()} style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text2,cursor:"pointer"}}>Selecionar foto</button>{arquivo&&<span style={{fontSize:10,color:T.text3}}>{arquivo.name}</span>}<button onClick={analisar} disabled={!arquivo||loading} style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${T.accentBorder}`,background:T.accentBg,color:T.accent,fontWeight:800,cursor:"pointer"}}>{loading?"Analisando…":"Ler dados da foto"}</button></div>
      {preview&&<img src={preview} alt="Folha preenchida" style={{marginTop:10,maxWidth:260,maxHeight:160,objectFit:"contain",borderRadius:8,border:`1px solid ${T.border}`}}/>}{erro&&<div style={{marginTop:9,color:"#f87171",fontSize:11}}>{erro}</div>}
      {resultado&&<div style={{marginTop:12}}><div style={{fontSize:11,color:T.text2,fontWeight:700,marginBottom:7}}>Reconhecidos: {(resultado.leitos||[]).length} quadro(s){resultado.data?` · ${resultado.data}`:""}</div>{(resultado.leitos||[]).map((r,i)=><label key={i} style={{display:"block",padding:"8px 10px",marginBottom:6,border:`1px solid ${T.border}`,borderRadius:8,background:T.bgInput,color:T.text2,fontSize:10}}><div style={{display:"flex",gap:7,alignItems:"center"}}><input type="checkbox" checked={aplicados.includes(i)} onChange={()=>setAplicados(a=>a.includes(i)?a.filter(x=>x!==i):[...a,i])}/><b>{r.leito||"Leito não identificado"}</b><span>· {r.paciente||"paciente não lido"}</span></div><div style={{marginTop:4,color:T.text3}}>{[...Object.entries(r.labs||{}),...Object.entries(r.controles||{})].filter(([,v])=>v).map(([k,v])=>`${k} ${v}`).join(" · ")||"Somente anotações clínicas"}</div></label>)}<button onClick={()=>onAplicar({...resultado,leitos:(resultado.leitos||[]).filter((_,i)=>aplicados.includes(i))})} disabled={!aplicados.length} style={{width:"100%",marginTop:4,padding:9,borderRadius:8,border:"none",background:"#0284c7",color:"#fff",fontWeight:850,cursor:"pointer"}}>Confirmar e lançar nos leitos selecionados</button></div>}
    </div>
  </div>;
}

function CoordenacaoPanel({uti,hospital,leitos,onAbrirLeito,onVoltar,altaSheetUrl}){
  const T=useTheme();
  const ehG1=/\bG1\b/i.test(uti?.nome||"");
  const [altas,setAltas]=useState([]),[altaLoading,setAltaLoading]=useState(false),[altaErro,setAltaErro]=useState(""),[altaAtualizada,setAltaAtualizada]=useState("");
  const urlAltas=altaSheetUrl||(hospital?.id==="hsp"?HSP_PLANILHA_ALTAS:"");
  const atualizarAltas=async(silencioso=false)=>{if(!urlAltas)return;if(!silencioso)setAltaLoading(true);try{const response=await fetch("/api/altas",{method:"POST",headers:{"content-type":"application/json","x-uti-session":sessionStorage.getItem(SESSION_KEY)||""},body:JSON.stringify({url:urlAltas})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||"Não foi possível ler a planilha de altas.");setAltas(payload.registros||[]);setAltaErro("");setAltaAtualizada(new Date().toISOString());}catch(error){setAltaErro(error.message||"Falha ao atualizar altas.");}finally{setAltaLoading(false);}};
  useEffect(()=>{atualizarAltas(true);const timer=setInterval(()=>atualizarAltas(true),300000);return()=>clearInterval(timer);},[urlAltas]);
  const numero=l=>(String(l.nome||"").match(/\d{3}/)||String(l.nome||"").match(/\d+/)||[""])[0];
  // No cadastro histórico da G1 os leitos podem estar salvos como 01–17,
  // enquanto a numeração física exibida na unidade é 601–617.
  const numeroFisico=l=>{const bruto=numero(l),n=Number(bruto);return ehG1&&n>=1&&n<=17?String(600+n):bruto;};
  const ordenados=[...leitos].sort((a,b)=>Number(numeroFisico(a))-Number(numeroFisico(b)));
  return <div style={{height:"100%",overflow:"hidden",background:T.bgPage,padding:"14px clamp(12px,2vw,28px)",boxSizing:"border-box"}}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,flexWrap:"wrap"}}>
      <div><div style={{fontSize:20,fontWeight:850,color:T.text1}}>Coordenação · {uti?.nome}</div><div style={{fontSize:11,color:T.text3,marginTop:3}}>Mapa físico dos leitos · dados compartilhados com o perfil Plantonista</div></div>
      {urlAltas&&<button onClick={()=>atualizarAltas(false)} disabled={altaLoading} title="Atualizar situação das altas pela planilha institucional" style={{marginLeft:"auto",padding:"7px 11px",borderRadius:8,border:`1px solid ${altaErro?"#f87171":T.accentBorder}`,background:altaErro?"rgba(248,113,113,.08)":T.accentBg,color:altaErro?"#f87171":T.accent,cursor:altaLoading?"wait":"pointer",fontWeight:700}}>{altaLoading?"Atualizando altas…":"↻ Atualizar altas"}</button>}
      <button onClick={onVoltar} style={{marginLeft:urlAltas?0:"auto",padding:"7px 11px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bgCard,color:T.text2,cursor:"pointer",fontWeight:700}}>Voltar ao Plantonista</button>
    </div>
    {altaErro&&<div style={{marginBottom:12,padding:"8px 10px",borderRadius:8,border:"1px solid rgba(248,113,113,.35)",background:"rgba(248,113,113,.08)",color:"#f87171",fontSize:10}}>Planilha de altas: {altaErro}</div>}
    {urlAltas&&!altaErro&&altaAtualizada&&<div style={{margin:"-10px 0 10px",fontSize:9,color:T.text4,textAlign:"right"}}>Altas verificadas às {new Date(altaAtualizada).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} · atualização automática a cada 5 min</div>}
    <div style={ehG1?{display:"grid",gridTemplateColumns:"repeat(9,minmax(0,1fr))",gridTemplateRows:"repeat(6,minmax(58px,1fr))",gap:8,width:"100%",height:"calc(100vh - 150px)",minHeight:430,padding:12,boxSizing:"border-box",border:`1px solid ${T.border}`,borderRadius:16,background:T.bgCard,boxShadow:T.shadowCard}:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
      {ordenados.map(l=>{const n=numeroFisico(l),p=precaucaoMicrobiologica(l.culturas||[]),pos=ehG1?(G1_LAYOUT[n]||{}):{},alta=encontrarAltaDoPaciente(l.paciente,altas,leitos);return <button key={l.id} onClick={()=>onAbrirLeito(l.id)} style={{...pos,minHeight:58,padding:"8px",borderRadius:11,border:`2px solid ${p?.cor||T.borderStrong}`,background:p?.fundo||T.bgInput,color:T.text1,cursor:"pointer",textAlign:"left",boxShadow:alta?.leitoCedido?"0 0 0 3px rgba(16,185,129,.25), 0 5px 14px rgba(15,23,42,.10)":"0 5px 14px rgba(15,23,42,.10)",overflow:"hidden"}} title={`${l.nome} · ${l.paciente||"Vago"}${p?` · ${p.label}`:""}${alta?` · Alta: ${alta.leitoCedido?`leito cedido ${alta.leitoCedido}`:"aguardando leito"}`:""}`}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}><b style={{fontFamily:mono,fontSize:13,color:p?.cor||T.accent}}>{n||l.nome}</b>{p&&<span style={{width:9,height:9,borderRadius:"50%",background:p.cor,flex:"0 0 auto"}}/>}</div>
        <div style={{marginTop:5,fontSize:10,fontWeight:l.paciente?750:500,fontStyle:l.paciente?"normal":"italic",color:l.paciente?T.text1:T.text3,lineHeight:1.35,overflowWrap:"anywhere"}}>{l.paciente||"Vago"}</div>
        {alta&&<div style={{marginTop:4,padding:"3px 5px",borderRadius:6,background:alta.leitoCedido?"rgba(16,185,129,.15)":"rgba(245,158,11,.13)",border:`1px solid ${alta.leitoCedido?"rgba(16,185,129,.4)":"rgba(245,158,11,.35)"}`,color:alta.leitoCedido?"#059669":"#d97706",fontSize:8.5,fontWeight:850,lineHeight:1.25}}>{alta.leitoCedido?`✓ SAÍDA · leito cedido ${alta.leitoCedido}`:"◷ ALTA · aguardando leito"}</div>}
      </button>})}
      {ehG1&&<div style={{gridColumn:"4 / 7",gridRow:"3 / 5",display:"flex",alignItems:"center",justifyContent:"center",border:`1px dashed ${T.border}`,borderRadius:18,color:T.textDim,fontFamily:mono,fontSize:11,letterSpacing:2}}>ÁREA CENTRAL</div>}
    </div>
  </div>;
}

// ── LeitoCard ─────────────────────────────────────────────────────────────────
function LeitoCard({ leito, selecionado, onClick, onRename, onRemove, onTogglePrioridade }) {
  const T=useTheme();
  const [editingNome,setEditingNome]=useState(false);
  const [nomeTemp,setNomeTemp]=useState(leito.nome);
  const [menuOpen,setMenuOpen]=useState(false);
  const cardRef=useRef(null);
  const precaucao=precaucaoMicrobiologica(leito.culturas||[]);
  useEffect(()=>{const close=e=>{if(!cardRef.current?.contains(e.target))setMenuOpen(false);};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close);},[]);
  const confirmarNome=()=>{if(nomeTemp.trim())onRename(nomeTemp.trim());setEditingNome(false);};
  return <div ref={cardRef} onContextMenu={e=>{e.preventDefault();e.stopPropagation();setMenuOpen(true);}} onClick={()=>{if(!editingNome&&!menuOpen)onClick();}} title={`${precaucao?`${precaucao.label} · `:""}Clique para abrir · botão direito para ações`} style={{position:"relative",cursor:"pointer",borderRadius:10,padding:"10px 12px",background:precaucao?precaucao.fundo:(selecionado?T.bgSel:T.bgCard),border:`2px solid ${precaucao?precaucao.cor:(selecionado?T.accent:T.border)}`,marginBottom:7,boxShadow:selecionado?`0 0 0 2px ${T.accent}45`:T.shadowCard}}>
    {editingNome?<input autoFocus value={nomeTemp} onChange={e=>setNomeTemp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")confirmarNome();if(e.key==="Escape"){setEditingNome(false);setNomeTemp(leito.nome);}}} onBlur={confirmarNome} onClick={e=>e.stopPropagation()} style={{width:"100%",background:T.bgInput,border:`1px solid ${T.accentBorder}`,borderRadius:5,padding:"4px 6px",color:T.text1,fontSize:11}}/>:<>
      <div style={{fontSize:10,color:T.text3,fontFamily:mono,letterSpacing:1.5,whiteSpace:"normal",overflowWrap:"anywhere",lineHeight:1.35}}>{leito.nome}</div>
      <div style={{display:"flex",alignItems:"flex-start",gap:6,marginTop:3}}>
        {precaucao&&<span title={precaucao.label} style={{width:8,height:8,borderRadius:"50%",background:precaucao.cor,boxShadow:`0 0 0 2px ${precaucao.cor}30`,marginTop:5,flex:"0 0 auto"}}/>}
        <div style={{fontSize:13,color:leito.paciente?T.text1:T.textDim,fontWeight:leito.paciente?650:400,fontStyle:leito.paciente?"normal":"italic",whiteSpace:"normal",overflowWrap:"anywhere",wordBreak:"normal",lineHeight:1.35}}>{leito.paciente||"Vago"}</div>
      </div>
    </>}
    {menuOpen&&<div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:7,right:7,zIndex:40,display:"flex",gap:4,padding:"4px",borderRadius:8,background:T.bgPicker,border:`1px solid ${T.borderStrong}`,boxShadow:"0 8px 24px rgba(0,0,0,.28)"}}>
      <button onClick={()=>{onTogglePrioridade&&onTogglePrioridade();setMenuOpen(false);}} title={leito.prioritario?"Remover dos prioritários":"Favoritar leito"} style={{border:`1px solid ${T.border}`,borderRadius:5,background:T.bgInput,color:leito.prioritario?"#fbbf24":T.text3,padding:"4px 7px",cursor:"pointer"}}>{leito.prioritario?"★":"☆"}</button>
      <button onClick={()=>{setEditingNome(true);setNomeTemp(leito.nome);setMenuOpen(false);}} title="Editar nome do leito" style={{border:`1px solid ${T.border}`,borderRadius:5,background:T.bgInput,color:T.text3,padding:"4px 7px",cursor:"pointer"}}>✏️</button>
      {onRemove&&<button onClick={()=>{setMenuOpen(false);if(confirm(`Remover ${leito.nome}?`))onRemove();}} title="Excluir leito" style={{border:"1px solid rgba(248,113,113,.3)",borderRadius:5,background:"rgba(248,113,113,.08)",color:"#f87171",padding:"4px 7px",cursor:"pointer"}}>🗑️</button>}
    </div>}
  </div>;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
const SESSION_KEY = "uti_session_hash";

// ── LoginScreen ───────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [senha,    setSenha]    = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro,     setErro]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [mode,     setMode]     = useState(null);

  useEffect(()=>{
    (async()=>{
      try {
        const { data } = await supabase.from("config").select("value").eq("key","pwd_hash").single();
        setMode(data ? "login" : "setup");
      } catch { setMode("setup"); }
    })();
  },[]);

  const handleLogin = async () => {
    setLoading(true); setErro("");
    try {
      const hash = await sha256(senha);
      const { data } = await supabase.from("config").select("value").eq("key","pwd_hash").single();
      if (data && hash === data.value) {
        sessionStorage.setItem(SESSION_KEY, hash);
        onLogin(hash);
      } else { setErro("Senha incorreta."); }
    } catch { setErro("Erro ao verificar senha."); }
    setLoading(false);
  };

  const handleSetup = async () => {
    if (senha.length < 4) { setErro("Use ao menos 4 caracteres."); return; }
    if (senha !== confirma) { setErro("As senhas não coincidem."); return; }
    setLoading(true); setErro("");
    try {
      const hash = await sha256(senha);
      await supabase.from("config").upsert({ key:"pwd_hash", value:hash });
      sessionStorage.setItem(SESSION_KEY, hash);
      onLogin(hash);
    } catch { setErro("Erro ao salvar senha."); }
    setLoading(false);
  };

  if (mode === null) return (
    <div style={{minHeight:"100vh",background:"#080f0a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{color:"#38bdf8"}}>Carregando…</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#080f0a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora','DM Sans',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box}input{outline:none;color-scheme:dark}`}</style>
      <div style={{width:"100%",maxWidth:380,padding:32}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"flex",justifyContent:"center",margin:"0 auto 16px"}}><BrainLogo size={72}/></div>
          <div style={{fontSize:22,fontWeight:700,color:"#e2e8f0",letterSpacing:0.3}}>UTI Evolve</div>
          <div style={{fontSize:11,color:"#475569",fontFamily:"'DM Mono',monospace",letterSpacing:2,marginTop:4}}>ASSISTENTE DE EVOLUÇÃO</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:28}}>
          <div style={{fontSize:14,fontWeight:600,color:"#cbd5e1",marginBottom:20,textAlign:"center"}}>
            {mode==="setup" ? "🔐 Criar senha de acesso" : "🔒 Acesso restrito"}
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:"#64748b",fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:5}}>SENHA</div>
            <input type="password" value={senha} onChange={e=>setSenha(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&(mode==="setup"?handleSetup():handleLogin())}
              placeholder="••••••••" autoFocus
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 14px",color:"#e2e8f0",fontSize:14,fontFamily:"inherit"}}/>
          </div>
          {mode==="setup" && (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:"#64748b",fontFamily:"'DM Mono',monospace",letterSpacing:1,marginBottom:5}}>CONFIRMAR SENHA</div>
              <input type="password" value={confirma} onChange={e=>setConfirma(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleSetup()} placeholder="••••••••"
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 14px",color:"#e2e8f0",fontSize:14,fontFamily:"inherit"}}/>
            </div>
          )}
          {erro && <div style={{padding:"8px 12px",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:8,fontSize:12,color:"#f87171",marginBottom:14}}>{erro}</div>}
          <button onClick={mode==="setup"?handleSetup:handleLogin} disabled={loading||!senha}
            style={{width:"100%",padding:"11px",background:loading||!senha?"rgba(56,189,248,0.1)":"linear-gradient(135deg,#0ea5e9,#0284c7)",border:"1px solid rgba(56,189,248,0.3)",borderRadius:8,color:loading||!senha?"#475569":"white",fontWeight:700,fontSize:14,cursor:loading||!senha?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {loading?"Verificando…":mode==="setup"?"Criar senha e entrar":"Entrar"}
          </button>
        </div>
        {mode==="setup"&&<div style={{marginTop:16,padding:"10px 14px",background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,fontSize:12,color:"#fcd34d",lineHeight:1.6}}>
          🔐 A senha é salva de forma criptografada no banco de dados. Funciona em qualquer dispositivo.
        </div>}
      </div>
    </div>
  );
}


// ── VisaoGeralPanel ───────────────────────────────────────────────────────────
function VisaoGeralPanel({ leitos, tabelaData, metasPorLeito={}, config={}, evolCamposPorLeito={}, onLeitoChange, onMetaChange }) {
  const [drawerAlerta, setDrawerAlerta] = useState(null); // {leito, texto, tipo, atbId}
  const [metasAbertas, setMetasAbertas] = useState({}); // {[leitoId]: bool}
  const T = useTheme();
  const claro = T.colorScheme === "light";
  const mono = "'DM Mono',monospace";

  const NEURO_DRUGS  = ["propofol","midazolam","fentanil","cetamina","precedex","morfina","clonidina"];
  const CARDIO_DRUGS = ["noradrenalina","adrenalina","dobutamina","levossimendana","vasopressina","nitroglicerina","nitroprussiato","amiodarona","furosemida"];

  const getHoje = (lid) => {
    const tb = tabelaData[lid]||{};
    const ds = Object.keys(tb).sort().reverse();
    for(const d of ds){ if(tb[d]&&Object.keys(tb[d]).length>0) return tb[d]; }
    return {};
  };

  const fmtBH = (lid, leito) => {
    const tb=tabelaData[lid]||{};
    let acum=0,algum=false;
    Object.keys(tb).sort().forEach(d=>{const bh=parseFloat(tb[d]?.c24_bh_ac||tb[d]?.c24_bh);if(!isNaN(bh)){acum+=bh;algum=true;}});
    const prev=parseFloat(leito.bhPrevio||0)||0;
    const tot=acum+prev;
    if(!algum&&!prev) return null;
    return{val:tot,cor:tot>200?"#f87171":tot<-200?"#34d399":"#94a3b8"};
  };

  // Alertas — cada item carrega o suficiente pro drawer resolver (tipo, id do ATB, ClCr) sem re-parsear texto
  const getAlerts = (leito) => {
    const h=getHoje(leito.id);
    const alerts=[];
    const idade=idadeDoLeito(leito);
    const clcr=(h.cr&&leito.peso&&idade)?Math.round(((140-idade)*parseFloat(leito.peso))/(72*parseFloat(h.cr))*(leito.sexo==="F"?0.85:1)):null;
    (leito.antibioticos||[]).filter(a=>!a.dataFim&&a.nome&&a.dataInicio&&!a.ajusteRevisado).forEach(a=>{
      const dias=diasAtb24h(a.dataInicio, a.horaInicio);
      if(dias<2) return;
      const lc=a.nome.toLowerCase();
      const key=lc.includes("pip")&&lc.includes("tazo")?"pip/tazo":lc.includes("amp")&&lc.includes("sulbactam")?"amp/sulbactam":lc.split(" ")[0].replace(/[^a-z]/g,"");
      if(clcr&&ATB_RENAL[key]?.length>0){const aj=ATB_RENAL[key].find(x=>clcr<x.tfg);if(aj)alerts.push({tipo:"atb-ajuste",texto:`ATB ${a.nome}: ajuste (ClCr ${clcr})`,atbId:a.id,clcr});}
    });
    DISP_MULTIPLO.forEach(d=>(Array.isArray((leito.dispositivos||{})[d.key])?(leito.dispositivos[d.key]):[]).forEach(inst=>{
      if(!inst.data) return;
      const dd=Math.floor((new Date()-new Date(inst.data+"T00:00:00"))/86400000);
      if(dd>(config[`alerta${d.key.charAt(0).toUpperCase()+d.key.slice(1)}`]||99)) alerts.push({tipo:"dispositivo",texto:`${d.label}: D${dd}`});
    }));
    // Metas atrasadas — sem campo de prazo: usa o próprio id (Date.now() na criação) como "criada em" e
    // considera atrasada se ainda pendente depois de METa_ATRASO_DIAS dias. Não digitado, não é uma data extra pro usuário.
    const METAS_ATRASO_DIAS = 2;
    (metasPorLeito[leito.id]||[]).forEach(m=>{
      if(m.feito||m.status==="cumprido") return;
      const criadoEm = parseInt(m.id,10);
      if(isNaN(criadoEm)) return;
      const diasAberta = Math.floor((Date.now()-criadoEm)/86400000);
      if(diasAberta>=METAS_ATRASO_DIAS) alerts.push({tipo:"meta-atrasada",texto:`Meta atrasada (${diasAberta}d): ${m.texto||m}`,metaId:m.id});
    });
    return alerts;
  };


  // Campos da evolução disponíveis por sistema
  const EVOL_SYS_FIELDS = {
    "NEUROLÓGICO":       [{k:"nEF",l:"EF Neuro"},{k:"nSeda",l:"Sedação"},{k:"nAnalg",l:"Analgesia"},{k:"nPsiq",l:"Psiquiatria"},{k:"nObs",l:"Obs"}],
    "CARDIOVASCULAR":    [{k:"cvEF",l:"EF CV"},{k:"cv24h",l:"24h CV"},{k:"cvDVA",l:"Vasoativas"},{k:"cvMed",l:"Medicações"},{k:"cvPerf",l:"Perfusão"},{k:"cvObs",l:"Obs"}],
    "RESPIRATÓRIO":      [{k:"reVM",l:"VM"},{k:"reEF",l:"EF Resp"},{k:"re24h",l:"24h Resp"},{k:"reGaso",l:"Gasometria"},{k:"rePocus",l:"POCUS"},{k:"reObs",l:"Obs"}],
    "RENAL / METABÓLICO":[{k:"rm24h",l:"24h Renal"},{k:"rmLabs",l:"Labs"},{k:"rmTRS",l:"TSR"},{k:"rmObs",l:"Obs"}],
    "HEMATOLÓGICO":      [{k:"heLabs",l:"Labs Hema"},{k:"heMed",l:"Medicações"},{k:"heProf",l:"Profilaxia TEV"},{k:"heObs",l:"Obs"}],
    "INFECCIOSO":        [{k:"heTemp",l:"Temperatura"},{k:"heAtb",l:"Antibióticos"}],
    "TGI":               [{k:"tgEF",l:"EF TGI"},{k:"tg24h",l:"24h TGI"},{k:"tgLabs",l:"Labs TGI"},{k:"tgObs",l:"Obs"}],
  };
  const [vgpPicker, setVgpPicker] = useState(null); // {leitoId, sysKey}

  // Helper: row with label + value
  const R = ({lbl, val, unit="", cor="#cbd5e1"}) => !val ? null : (
    <div style={{display:"flex",justifyContent:"space-between",padding:"2px 0",borderBottom:"1px solid rgba(255,255,255,0.025)"}}>
      <span style={{fontSize:10,color:"#64748b",fontFamily:mono}}>{lbl}</span>
      <span style={{fontSize:11,fontFamily:mono,color:cor,fontWeight:600}}>{val}{unit&&<span style={{fontSize:9,color:"#475569",marginLeft:2}}>{unit}</span>}</span>
    </div>
  );

  // Collapsible section header — state stored per-card via leitoId+section key
  const [collapsed, setCollapsed] = useState({});
  const Sec = ({ico, lbl, cor="#475569", cid}) => {
    const key = cid+lbl;
    const isOpen = !collapsed[key];
    const hasPicker = EVOL_SYS_FIELDS[lbl];
    return (
      <div style={{fontSize:9,fontFamily:mono,letterSpacing:1.5,color:cor,marginTop:8,marginBottom:isOpen?3:0,
          paddingBottom:2,borderBottom:`1px solid ${cor}25`,display:"flex",alignItems:"center",userSelect:"none"}}>
        <span onClick={()=>setCollapsed(s=>({...s,[key]:!s[key]}))}
          style={{flex:1,cursor:"pointer"}}>{ico} {lbl}</span>
        {hasPicker&&<span onClick={e=>{e.stopPropagation();setVgpPicker(vgpPicker?.leitoId===cid&&vgpPicker?.sysKey===lbl?null:{leitoId:cid,sysKey:lbl});}}
          style={{marginLeft:4,fontSize:11,cursor:"pointer",color:"#475569",
            background:"rgba(255,255,255,0.05)",borderRadius:4,padding:"0 4px",lineHeight:"14px"}}
          title="Adicionar campo da evolução">
          ⊕
        </span>}
        <span onClick={()=>setCollapsed(s=>({...s,[key]:!s[key]}))} style={{cursor:"pointer",marginLeft:4,color:"#334155"}}>{isOpen?"▲":"▼"}</span>
      </div>
    );
  };
  const SecBody = ({cid, lbl, children, leito: sl, ec: sec}) => {
    const key = cid+lbl;
    if(collapsed[key]) return null;
    // Show extra campos selected via ⊕ for this system
    const extras = sl ? ((sl.vgpMap||{})[lbl]||[]).map(k=>{
      const f=(EVOL_SYS_FIELDS[lbl]||[]).find(x=>x.k===k);
      const val=(sec||{})[k];
      return val?{label:f?.l||k,val}:null;
    }).filter(Boolean) : [];
    return <>
      {children}
      {extras.map((ex,i)=>(
        <div key={i} style={{marginTop:3,padding:"3px 0",borderTop:"1px dashed rgba(56,189,248,0.1)"}}>
          <span style={{fontSize:9,color:"#38bdf8",fontFamily:mono}}>{ex.label}: </span>
          <span style={{fontSize:10,color:"#94a3b8",whiteSpace:"pre-wrap"}}>{ex.val}</span>
        </div>
      ))}
    </>;
  };

  const DRUG_LABELS = {
    propofol:"Propofol", midazolam:"Midazolam", fentanil:"Fentanil",
    cetamina:"Cetamina", precedex:"Precedex", morfina:"Morfina",
    noradrenalina:"Noradrenalina", dobutamina:"Dobutamina", vasopressina:"Vasopressina",
    nitroglicerina:"Nitroglicerina", nitroprussiato:"Nitroprussiato",
    furosemida:"Furosemida", amiodarona:"Amiodarona",
  };
  const DrugRow = ({dKey, vazoes}) => {
    const v = vazoes[dKey];
    if(!v||parseFloat(v)<=0) return null;
    return <R lbl={DRUG_LABELS[dKey]||dKey} val={`${v} mL/h`} cor="#fbbf24"/>;
  };

  return (
    <div style={{padding:"20px 24px",overflowY:"auto"}}>
      <div style={{fontSize:16,fontWeight:700,color:T.text1,marginBottom:14}}>🏥 Visão Geral — {leitos.filter(l=>l.paciente).length} leitos ativos</div>

      {/* ── Banner de alertas — calculados (ClCr, D-day, dispositivos) ── */}
      {(()=>{
        const todos = leitos.filter(l=>l.paciente).flatMap(l=>getAlerts(l).map(a=>({leito:l, ...a})));
        if (!todos.length) return null;
        return (
          <div style={{marginBottom:16,padding:"10px 14px",background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:10}}>
            <div style={{fontSize:10,fontFamily:mono,letterSpacing:1.5,color:"#f87171",marginBottom:6}}>ALERTAS (calculados — ClCr, D-day, metas)</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {todos.map((a,i)=>(
                <div key={i} style={{fontSize:11,color:T.text1,fontWeight:claro?600:400}}>
                  {a.leito.nome} · {a.texto} · <button onClick={()=>a.tipo==="meta-atrasada"?setMetasAbertas(s=>({...s,[a.leito.id]:true})):setDrawerAlerta(a)} style={{background:"none",border:"none",color:"#38bdf8",cursor:"pointer",fontSize:11,textDecoration:"underline",padding:0,fontFamily:"inherit"}}>{a.tipo==="meta-atrasada"?"ir às metas":"ir ao bloco"}</button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Tabela — uma linha por leito, uma coluna por sistema (redesign wireframe 13a) ── */}
      {(()=>{
        const SISTEMAS = ["Neuro","CV","Resp","Renal","Hema","Infec"];

        const resumoNeuro = (l, ec, vaz) => {
          const l1 = [ec.nRASS?`RASS ${ec.nRASS.split(" ")[0]}`:null, ec.nGlasgow?`Glasgow ${ec.nGlasgow}`:null].filter(Boolean).join(" · ") || null;
          const l2 = ec.nPupilas || null;
          const drogas = NEURO_DRUGS.filter(k=>vaz[k]&&parseFloat(vaz[k])>0);
          const l3 = drogas.length ? drogas.map(k=>`${DRUG_LABELS[k]||k} ${vaz[k]}mL/h`).join(" · ") : (l1 ? "sem sedação em bomba" : null);
          const lines = [l1,l2,l3].filter(Boolean);
          return lines.length ? {lines, cor:"#34d399"} : null;
        };

        const resumoCV = (l, ec, vaz, h) => {
          const l1 = ec.cvHemo || ec.cvCardioscopia || null;
          const dva = CARDIO_DRUGS.filter(k=>vaz[k]&&parseFloat(vaz[k])>0);
          const l2 = dva.length ? dva.map(k=>`${DRUG_LABELS[k]||k} ${vaz[k]}mL/h`).join(" · ") : null;
          let l3 = ec.cvAusculta || null;
          const lact = parseFloat(h.lact);
          const corLact = !isNaN(lact) ? (lact>4?"#f87171":lact>2?"#fbbf24":"#34d399") : null;
          if (corLact && corLact!=="#34d399") l3 = `Lactato ${h.lact} ↑`;
          const lines = [l1,l2,l3].filter(Boolean);
          if (!lines.length) return null;
          const instavel = /inst[aá]vel/i.test(l1||"");
          const cor = (instavel||corLact==="#f87171") ? "#f87171" : ((dva.length||corLact==="#fbbf24") ? "#fbbf24" : "#34d399");
          return {lines, cor};
        };

        const resumoResp = (l, h, vm) => {
          const isAr = l.vm_modo==="ar_ambiente";
          const l1 = vm ? (["vni","cnaf"].includes(vm.id)?vm.label:`IOT-VM · ${vm.label.replace("VM — ","")}`) : (isAr?"Ar ambiente":null);
          const params = [l.vm_fio2?`FiO2 ${l.vm_fio2}%`:null, l.vm_peep?`PEEP ${l.vm_peep}`:null].filter(Boolean).join(" · ") || null;
          const sat = l.vm_sato2 || h.c24_sat || null;
          const satN = parseFloat(sat);
          const l3 = sat ? `SatO2 ${sat}%${!isNaN(satN)&&satN<92?" ↓":""}` : null;
          const lines = [l1,params,l3].filter(Boolean);
          if (!lines.length) return null;
          const cor = (!isNaN(satN)&&satN<92) ? "#f87171" : "#34d399";
          return {lines, cor};
        };

        const resumoRenal = (l, h) => {
          const idade = idadeDoLeito(l);
          const clcr = calcClCr(h.cr, l.peso, idade, l.sexo);
          const diureseKgH = (h.c24_diur && l.peso) ? (parseFloat(h.c24_diur)/parseFloat(l.peso)/24).toFixed(1) : null;
          const l1 = diureseKgH ? `Diurese ${diureseKgH}mL/kg/h` : null;
          const l2 = [h.cr?`Cr ${h.cr}`:null, clcr?`TFG ${clcr}`:null].filter(Boolean).join(" · ") || null;
          const trs = h.c24_hd ? `TSR ${h.c24_hd}mL` : null;
          const lines = [l1,l2,trs].filter(Boolean);
          if (!lines.length) return null;
          const cor = clcr!==null ? (clcr<30?"#f87171":clcr<60?"#fbbf24":"#34d399") : "#34d399";
          return {lines, cor};
        };

        const resumoHema = (l, h) => {
          const l1 = [h.hb?`Hb ${h.hb}`:null, h.plaq?`Plq ${(parseFloat(h.plaq)/1000).toFixed(0)}k`:null].filter(Boolean).join(" · ") || null;
          const lines = [l1].filter(Boolean);
          if (!lines.length) return null;
          const hb = parseFloat(h.hb), plq = parseFloat(h.plaq);
          const cor = (hb<8||plq<50000) ? "#f87171" : "#34d399";
          return {lines, cor};
        };

        const resumoInfec = (l, h, atbAtivos, alerts) => {
          if (!atbAtivos.length&&!h.c24_temp) return null;
          const lines = atbAtivos.slice(0,1).map(a=>{
            const dd = diasAtb24h(a.dataInicio, a.horaInicio);
            return `${a.nome} ${lblDiaAtb(dd)||""}`.trim();
          });
          if(h.c24_temp) lines.unshift(`Temp ${h.c24_temp}°C`);
          const ajuste = alerts.find(a=>a.tipo==="atb-ajuste");
          if (ajuste) lines.push(`⚠ ajustar (ClCr ${ajuste.clcr})`);
          const temp=parseFloat(h.c24_temp);
          const cor = (ajuste||temp>=38) ? "#f87171" : "#34d399";
          return {lines, cor};
        };

        return (
          <div style={{minWidth:760,overflowX:"auto"}}>
            <div style={{display:"grid",gridTemplateColumns:"64px repeat(6,1fr) 76px",gap:0,fontSize:9,fontWeight:800,color:T.text2,fontFamily:mono,letterSpacing:1,padding:"7px 8px",background:claro?"#eef2f7":"transparent",borderRadius:7}}>
              <div>LEITO</div>{SISTEMAS.map(s=><div key={s}>{s.toUpperCase()}</div>)}<div>METAS</div>
            </div>
            {leitos.filter(l=>l.paciente).map(l=>{
              const h = getHoje(l.id);
              const ec = evolCamposPorLeito[l.id]||{};
              const vaz = l.drogasVazao||{};
              const alerts = getAlerts(l);
              const atbAtivos = (l.antibioticos||[]).filter(a=>!a.dataFim&&a.nome);
              const vm = l.vm_modo?VM_MODOS.find(m=>m.id===l.vm_modo):null;
              const numero = (l.nome.match(/\d+/)||[])[0] || l.nome;
              const metasL = metasPorLeito[l.id]||[];
              const pend = metasL.filter(m=>!m.feito&&m.status!=="cumprido").length;

              const cols = [
                resumoNeuro(l, ec, vaz),
                resumoCV(l, ec, vaz, h),
                resumoResp(l, h, vm),
                resumoRenal(l, h),
                resumoHema(l, h),
                resumoInfec(l, h, atbAtivos, alerts),
              ];

              return (
                <div key={l.id}>
                  <div style={{display:"grid",gridTemplateColumns:"64px repeat(6,1fr) 76px",gap:8,alignItems:"start",borderTop:`1px solid ${T.border}`,padding:"9px 8px",background:claro?"rgba(248,250,252,.62)":"transparent"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:T.text1}}>{numero}</div>
                      <div style={{fontSize:9,color:T.text3}}>{l.paciente}</div>
                    </div>
                    {cols.map((c,i)=>c ? (
                      <div key={i} style={{fontSize:10,color:T.text1,fontWeight:claro?600:400,lineHeight:1.5,borderLeft:`3px solid ${c.cor}`,paddingLeft:7}}>
                        {c.lines.map((ln,j)=><div key={j}>{ln}</div>)}
                      </div>
                    ) : (
                      <div key={i} style={{fontSize:10,color:T.text2,paddingLeft:7}}>— sem dado —</div>
                    ))}
                    <button onClick={()=>setMetasAbertas(s=>({...s,[l.id]:!s[l.id]}))}
                      style={{fontSize:10,fontFamily:mono,color:pend>0?T.accent:T.text2,fontWeight:700,padding:"4px 6px",borderRadius:6,
                        background:pend>0?T.accentBg:T.bgCard,
                        border:`1px dashed ${pend>0?T.accentBorder:T.borderStrong}`,cursor:"pointer",textAlign:"center"}}>
                      🎯 {pend} {metasAbertas[l.id]?"▾":"▸"}
                    </button>
                  </div>
                  {metasAbertas[l.id] && (
                    <div style={{margin:"0 2px 8px",padding:"8px 10px",background:"rgba(56,189,248,0.04)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:8}}>
                      {metasL.length===0 && <div style={{fontSize:10,color:"#475569"}}>Sem metas cadastradas</div>}
                      {ordenarMetas(metasL).map((m,i)=>(
                        <div key={m.id||i} style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:3}}>
                          <MetaPriorityDot meta={m} metas={metasL} onChange={novas=>onMetaChange&&onMetaChange(l.id,novas)}/>
                          <button onClick={()=>onMetaChange&&onMetaChange(l.id, metasL.map(x=>x.id===m.id?{...x,feito:!x.feito}:x))}
                            style={{background:"none",border:"none",cursor:"pointer",fontSize:12,padding:0,color:m.feito?"#34d399":"#334155",flexShrink:0}}>
                            {m.feito?"☑":"☐"}
                          </button>
                          <span style={{fontSize:10,color:m.feito?T.text3:T.text1,fontWeight:claro&&!m.feito?600:400,borderLeft:`3px solid ${metaPrioridade(m).cor}`,paddingLeft:5,textDecoration:m.feito?"line-through":"none",lineHeight:1.4,flex:1}}>{m.texto||m}</span>
                          <button onClick={()=>editarTextoMeta(metasL,m,novas=>onMetaChange(l.id,novas))} title="Editar" style={{background:"none",border:"none",color:"#38bdf8",cursor:"pointer",padding:0}}>✎</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{fontSize:9,color:T.text3,paddingTop:8,borderTop:`1px solid ${T.border}`,marginTop:4}}>
              colunas só mostram dado quando o bloco tem algo lançado — "— sem dado —" não é um alerta. borda: verde ok · âmbar atenção · vermelho alerta calculado. coluna Metas abre a lista de metas do leito para edição direta.
            </div>
          </div>
        );
      })()}

      {/* ── Drawer lateral — aberto ao clicar num alerta, com ações rápidas quando aplicável ── */}
      {drawerAlerta && (()=>{
        const { leito: dl, tipo, texto, atbId, clcr } = drawerAlerta;
        const atb = tipo==="atb-ajuste" ? (dl.antibioticos||[]).find(a=>a.id===atbId) : null;
        const aj = (atb && clcr) ? atbAjusteRenal(atb.nome, clcr) : null;
        const aplicarSugestao = () => {
          if (!atb || !aj || !onLeitoChange) return;
          const novos = (dl.antibioticos||[]).map(a=>a.id===atbId?{...a, dose:aj.rec, ajusteRevisado:true}:a);
          onLeitoChange({...dl, antibioticos:novos});
          setDrawerAlerta(null);
        };
        const manterDoseAtual = () => {
          if (!atb || !onLeitoChange) return;
          const novos = (dl.antibioticos||[]).map(a=>a.id===atbId?{...a, ajusteRevisado:true}:a);
          onLeitoChange({...dl, antibioticos:novos});
          setDrawerAlerta(null);
        };
        return (
          <div style={{position:"fixed",top:0,right:0,bottom:0,width:320,maxWidth:"90vw",zIndex:300,
            background:"rgba(10,15,30,0.99)",borderLeft:"1px solid rgba(248,113,113,0.3)",
            boxShadow:"-8px 0 30px rgba(0,0,0,0.5)",padding:"18px 18px",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0",flex:1}}>{dl.nome} — {dl.paciente}</div>
              <button onClick={()=>setDrawerAlerta(null)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:16}}>✕</button>
            </div>
            <div style={{fontSize:12,color:"#f87171",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:8,padding:"8px 10px",marginBottom:14}}>
              ⚠️ {texto}
            </div>
            {tipo==="atb-ajuste" && atb && (
              <div>
                <div style={{fontSize:9,fontFamily:mono,letterSpacing:1,color:"#64748b",marginBottom:4}}>ATB ATUAL</div>
                <div style={{fontSize:12,color:"#cbd5e1",marginBottom:10}}>{atb.nome}{atb.dose?` — ${atb.dose}`:""}{atb.intervalo?` ${atb.intervalo}`:""}</div>
                {aj && (
                  <div style={{fontSize:9,fontFamily:mono,letterSpacing:1,color:"#64748b",marginBottom:4}}>SUGESTÃO (ClCr {clcr} mL/min)</div>
                )}
                {aj && <div style={{fontSize:12,color:"#34d399",marginBottom:12}}>{aj.rec}</div>}
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {aj && !aj.ok && (
                    <button onClick={aplicarSugestao} style={{padding:"8px",borderRadius:7,border:"1px solid rgba(52,211,153,0.4)",background:"rgba(52,211,153,0.1)",color:"#34d399",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                      ✅ Aplicar sugestão
                    </button>
                  )}
                  <button onClick={manterDoseAtual} style={{padding:"8px",borderRadius:7,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.04)",color:"#94a3b8",fontWeight:600,fontSize:12,cursor:"pointer"}}>
                    Manter dose atual
                  </button>
                </div>
              </div>
            )}
            {tipo==="dispositivo" && (
              <div style={{fontSize:12,color:"#94a3b8"}}>Revise o dispositivo no Beira-leito deste paciente (bloco 🔌 Dispositivos, no topo).</div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
// ── PlantaoPanel ──────────────────────────────────────────────────────────────
function PlantaoPanel({ leitos, tabelaData, metasPorLeito, onMetaChange, onClearAll, config={} }) {
  const T = useTheme();
  const claro = T.colorScheme === "light";
  const mono = "'DM Mono',monospace";
  const [filtro, setFiltro] = useState("todos");
  const [filtroEquipePlantao, setFiltroEquipePlantao] = useState("");
  const [menuEquipe,setMenuEquipe]=useState(null);

  const getAutoAlerts = (leito) => {
    const alerts = [];
    const tb=tabelaData[leito.id]||{};
    const ds=Object.keys(tb).sort().reverse();
    const cr=ds.length?tb[ds[0]]?.cr:null;
    const idade=idadeDoLeito(leito);
    const clcr=(cr&&leito.peso&&idade)?Math.round(((140-idade)*parseFloat(leito.peso))/(72*parseFloat(cr))*(leito.sexo==="F"?0.85:1)):null;
    (leito.antibioticos||[]).filter(a=>!a.dataFim&&a.nome&&a.dataInicio).forEach(a=>{
      const dias=diasAtb24h(a.dataInicio, a.horaInicio);
      if(dias<2) return;
      const lc=a.nome.toLowerCase();
      const key=lc.includes("pip")&&lc.includes("tazo")?"pip/tazo":lc.includes("amp")&&lc.includes("sulbactam")?"amp/sulbactam":lc.split(" ")[0].replace(/[^a-z]/g,"");
      if(clcr&&ATB_RENAL[key]?.length>0){const aj=ATB_RENAL[key].find(x=>clcr<x.tfg);if(aj)alerts.push(`Ajustar ${a.nome} (ClCr ${clcr})`);}
    });
    return alerts;
  };

  // Metas sugeridas automaticamente a partir de dados clínicos (TFG, dispositivos etc.) — usuário confirma com "+ adicionar"
  const getSuggestedGoals = (leito) => {
    const s = [];
    const tb=tabelaData[leito.id]||{};
    const ds=Object.keys(tb).sort().reverse();
    const cr=ds.length?tb[ds[0]]?.cr:null;
    const idade=idadeDoLeito(leito);
    const clcr=(cr&&leito.peso&&idade)?Math.round(((140-idade)*parseFloat(leito.peso))/(72*parseFloat(cr))*(leito.sexo==="F"?0.85:1)):null;
    const jaTemMeta = (texto) => (metasPorLeito[leito.id]||[]).some(m=>(m.texto||m||"").toLowerCase().includes(texto.toLowerCase()));
    if (clcr!==null && clcr<60 && !jaTemMeta("diurese")) {
      s.push("Meta de diurese ≥0,5 mL/kg/h");
    }
    const rf=avaliarRealimentacao(leito,tb);
    if(rf.aspen&&!jaTemMeta("realimentação")) s.push(`Reavaliar possível síndrome de realimentação${rf.gravidade?` (${rf.gravidade})`:""}`);
    else if(rf.alto&&!jaTemMeta("realimentação")) s.push("Prevenir síndrome de realimentação (alto risco NICE)");
    else if(rf.suspeitaClinica&&!jaTemMeta("realimentação")) s.push("Revisar sinais clínicos após início da dieta");
    return s;
  };

  const leitosAtivos = leitos.filter(l=>l.paciente);

  return (
    <div style={{padding:"16px 20px",height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{fontSize:16,fontWeight:700,color:T.text1}}>✅ Check de Metas</div>
        <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
          {["todos","pendentes"].map(f=>(
            <button key={f} onClick={()=>setFiltro(f)}
              style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${filtro===f?T.accentBorder:T.border}`,
                background:filtro===f?T.accentBg:T.bgCard,
                color:filtro===f?T.accent:T.text2,cursor:"pointer",fontSize:11,fontWeight:filtro===f?700:500}}>
              {f==="todos"?"Todos":"Só pendentes"}
            </button>
          ))}
          <button onClick={()=>window.print()}
            style={{padding:"4px 12px",borderRadius:7,border:"1px solid rgba(52,211,153,0.3)",
              background:"rgba(52,211,153,0.08)",color:"#34d399",cursor:"pointer",fontSize:11,fontWeight:600}}>
            🖨️ Imprimir
          </button>
          <button onClick={()=>{
            const total=leitos.reduce((n,l)=>n+(metasPorLeito[l.id]||[]).length,0);
            if(!total){window.alert("Não há metas para limpar nesta UTI.");return;}
            if(window.confirm(`Limpar as ${total} meta(s) dos leitos desta UTI?\n\nO histórico dos dias anteriores será preservado.`))onClearAll&&onClearAll();
          }}
            style={{padding:"4px 12px",borderRadius:7,border:"1px solid rgba(248,113,113,.35)",background:"rgba(248,113,113,.08)",color:"#f87171",cursor:"pointer",fontSize:11,fontWeight:600}}>
            🧹 Limpar metas
          </button>
        </div>
      </div>

      {/* Filtro por equipe */}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
        <button onClick={()=>setFiltroEquipePlantao("")}
          style={{padding:"4px 12px",borderRadius:10,border:`1px solid ${!filtroEquipePlantao?T.borderStrong:T.border}`,
            background:!filtroEquipePlantao?T.bgCardHover:T.bgCard,
            color:!filtroEquipePlantao?T.text1:T.text2,cursor:"pointer",fontSize:11,fontWeight:!filtroEquipePlantao?700:500}}>
          Todas equipes
        </button>
        {EQUIPES.map(e=>{
          const cnt = Object.values(metasPorLeito).flat().filter(m=>m.equipe===e.id&&!m.feito&&m.status!=="cumprido").length;
          return (
            <button key={e.id} onClick={()=>setFiltroEquipePlantao(filtroEquipePlantao===e.id?"":e.id)}
              style={{padding:"4px 12px",borderRadius:10,
                border:`1px solid ${filtroEquipePlantao===e.id?e.cor+"80":T.border}`,
                background:filtroEquipePlantao===e.id?e.cor+"18":T.bgCard,
                color:filtroEquipePlantao===e.id?e.cor:T.text2,cursor:"pointer",fontSize:11,
                fontWeight:filtroEquipePlantao===e.id?700:500}}>
              {e.emoji} {e.label}{cnt>0?` (${cnt})`:""}
            </button>
          );
        })}
      </div>

      <div style={{flex:1,overflowY:"auto",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10,alignContent:"start"}}>
        {leitosAtivos.map(l=>{
          const metas = metasPorLeito[l.id]||[];
          const alerts = getAutoAlerts(l);
          const sugestoes = getSuggestedGoals(l);
          const pendentes = metas.filter(m=>{
        if(m.feito||m.status==="cumprido") return false;
        if(filtroEquipePlantao) return m.equipe===filtroEquipePlantao;
        return true;
      });
          if(filtro==="pendentes" && pendentes.length===0 && alerts.length===0) return null;
          const dias = diasInternacao(l.dataInternacao);

          return (
            <div key={l.id} style={{background:T.bgCard,border:`1px solid ${pendentes.length>0||alerts.length>0?(claro?"#fca5a5":"rgba(248,113,113,0.25)"):T.border}`,borderRadius:10,overflow:"hidden",boxShadow:T.shadowCard}}>
              <div style={{padding:"8px 12px",background:claro?"#eef2f7":"rgba(255,255,255,0.02)",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontWeight:700,color:T.text1,fontSize:12,flex:1}}>{l.paciente}</span>
                {dias!==null&&<span style={{fontSize:9,fontFamily:mono,color:"#a78bfa",background:"rgba(167,139,250,0.1)",padding:"1px 5px",borderRadius:6}}>D{dias}</span>}
                <span style={{fontSize:10,fontFamily:mono,color:pendentes.length>0?"#f87171":"#34d399"}}>
                  {pendentes.length>0?`${pendentes.length}⬜`:"✅"}
                </span>
              </div>
              <div style={{padding:"8px 12px"}}>
                {alerts.map((a,i)=>(
                  <div key={i} style={{fontSize:10,color:"#f87171",fontFamily:mono,marginBottom:3}}>⚠️ {a}</div>
                ))}
                {sugestoes.map((s,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                    <span style={{fontSize:10,color:"#fbbf24",flex:1,lineHeight:1.4}}>⚡ {s}</span>
                    <button onClick={()=>onMetaChange(l.id,[...metas,{id:Date.now()+"",texto:`⚡ ${s}`,feito:false,prioridade:"amarelo"}])}
                      title="Adicionar como meta"
                      style={{background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:5,cursor:"pointer",fontSize:9,padding:"1px 6px",color:"#fbbf24",flexShrink:0}}>
                      + adicionar
                    </button>
                  </div>
                ))}
                {metas.length>0 ? ordenarMetas(metas).map((m,i)=>(
                  <div key={m.id||i} onContextMenu={e=>{e.preventDefault();setMenuEquipe({x:e.clientX,y:e.clientY,metaId:m.id,leitoId:l.id,equipe:m.equipe||""});}} title="Clique com o botão direito para definir a equipe" style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:3}}>
                    <MetaPriorityDot meta={m} metas={metas} onChange={novas=>onMetaChange(l.id,novas)}/>
                    <button onClick={()=>{
                      const novas=metas.map(x=>x.id===m.id?{...x,feito:!x.feito}:x);
                      onMetaChange(l.id,novas);
                    }} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:0,
                      color:m.feito?"#059669":T.text2,flexShrink:0}}>
                      {m.feito?"☑":"☐"}
                    </button>
                    <span style={{fontSize:11,color:m.feito?T.text3:T.text1,fontWeight:m.feito?400:claro?600:400,flex:1,borderLeft:`3px solid ${metaPrioridade(m).cor}`,paddingLeft:5,
                      textDecoration:m.feito?"line-through":"none",lineHeight:1.4}}>{m.texto||m}{m.equipe&&<small style={{display:"block",color:equipeCor(m.equipe),fontSize:9,marginTop:1}}>{equipeEmoji(m.equipe)} {equipeLabel(m.equipe)}</small>}</span>
                    <button onClick={()=>editarTextoMeta(metas,m,novas=>onMetaChange(l.id,novas))} title="Editar meta" style={{background:"none",border:"none",cursor:"pointer",fontSize:10,padding:0,color:T.accent}}>✎</button>
                    <button onClick={()=>onMetaChange(l.id, metas.filter(x=>x.id!==m.id))}
                      title="Excluir meta"
                      style={{background:"none",border:"none",cursor:"pointer",fontSize:10,padding:0,color:T.text3,flexShrink:0}}>
                      ✕
                    </button>
                  </div>
                )) : alerts.length===0 && (
                  <div style={{fontSize:10,color:T.text2}}>Sem metas</div>
                )}
                <button onClick={()=>{
                  const txt=window.prompt("Nova meta:");
                  if(txt&&txt.trim()) onMetaChange(l.id,[...metas,{id:Date.now()+"",texto:txt.trim(),feito:false,prioridade:"amarelo"}]);
                }} style={{marginTop:5,width:"100%",padding:"3px 0",background:T.accentBg,
                  border:`1px solid ${T.accentBorder}`,borderRadius:5,color:T.accent,cursor:"pointer",fontSize:10,fontWeight:600}}>
                  + meta
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <MetaEquipeMenu menu={menuEquipe} onClose={()=>setMenuEquipe(null)} onSelect={equipe=>{const leitoId=menuEquipe?.leitoId,metaId=menuEquipe?.metaId;if(!leitoId)return;onMetaChange(leitoId,(metasPorLeito[leitoId]||[]).map(m=>m.id===metaId?{...m,equipe}:m));}}/>

      {/* ── Folha imprimível — A4 paisagem, preto e branco, uma por leito, para check manual da enfermagem ── */}
      <style>{`
        .print-metas-sheet { display:none; }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden; }
          .print-metas-sheet, .print-metas-sheet * { visibility: visible; }
          .print-metas-sheet { display:block !important; position:absolute; top:0; left:0; width:100%; }
        }
      `}</style>
      <div className="print-metas-sheet">
        <div style={{fontFamily:"Arial,sans-serif",color:"#000",padding:"6mm"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:2}}>
            {filtroEquipePlantao ? `Pendências — ${equipeLabel(filtroEquipePlantao)}` : "Check de Metas"}
          </div>
          <div style={{fontSize:10,marginBottom:8}}>{new Date().toLocaleDateString("pt-BR")} · plantão</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"4mm"}}>
            {leitosAtivos.map(l=>{
              const metasImp = (metasPorLeito[l.id]||[]).filter(m=>{
                if(m.feito||m.status==="cumprido") return false;
                if(filtroEquipePlantao) return m.equipe===filtroEquipePlantao;
                return true;
              });
              const alertsImp = filtroEquipePlantao ? [] : getAutoAlerts(l);
              if(metasImp.length===0 && alertsImp.length===0) return null;
              return (
                <div key={l.id} style={{border:"1px solid #000",borderRadius:4,padding:"3mm",breakInside:"avoid"}}>
                  <div style={{fontSize:11,fontWeight:700,borderBottom:"1px solid #000",paddingBottom:2,marginBottom:3}}>
                    {l.nome} — {l.paciente}
                  </div>
                  {alertsImp.map((a,i)=>(
                    <div key={i} style={{fontSize:9,marginBottom:2}}>⚠ {a}</div>
                  ))}
                  {metasImp.map((m,i)=>(
                    <div key={i} style={{fontSize:9,display:"flex",gap:4,marginBottom:2}}>
                      <span>☐</span><span>{m.texto||m}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


class AnalysisErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error,info){console.error("Falha no painel de análise",error,info);}
  render(){if(this.state.error)return <div style={{margin:24,padding:18,border:"1px solid rgba(248,113,113,.4)",borderRadius:10,color:"#fca5a5",background:"rgba(248,113,113,.06)"}}><b>Não foi possível montar a análise.</b><div style={{fontSize:11,marginTop:6}}>Os dados clínicos continuam preservados. Detalhe técnico: {String(this.state.error?.message||this.state.error)}</div></div>;return this.props.children;}
}
function PesquisaPanel({historico={},arquivos=[],leitos=[],utis=[]}){
  const T=useTheme();
  arquivos=Array.isArray(arquivos)?arquivos.filter(a=>a&&typeof a==="object"):[];
  leitos=Array.isArray(leitos)?leitos.filter(l=>l&&typeof l==="object"):[];
  utis=Array.isArray(utis)?utis.filter(u=>u&&typeof u==="object"):[];
  historico=historico&&typeof historico==="object"&&!Array.isArray(historico)?historico:{};
  const [utiFiltro,setUtiFiltro]=useState("");
  const [inicio,setInicio]=useState("");
  const [fim,setFim]=useState("");
  const [status,setStatus]=useState("todos");
  const arqPorAdm=Object.fromEntries((arquivos||[]).map((a,i)=>[a.admissionId||`arquivo-${a.id||i}`,a]));
  const ids=new Set([...Object.keys(historico||{}),...Object.keys(arqPorAdm)]);
  const internacoes=[...ids].map((id,idx)=>{
    const h=historico[id]||{},a=arqPorAdm[id],l=a?.leito||leitos.find(x=>x.admissionId===id)||{};
    const rawDays=h.days||a?.historicoDiario||{};
    const days=rawDays&&typeof rawDays==="object"&&!Array.isArray(rawDays)?rawDays:{};
    const datas=Object.keys(days).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    const dataAdm=l.dataInternacao||h.startedAt?.slice(0,10)||datas[0]||"";
    const dataAlta=a?.dataAlta||h.dischargeDate||"";
    const situacao=(a||h.status==="discharged")?"alta":"ativo";
    const utiId=a?.utiId||l.utiId||days[datas[0]]?.bedside?.utiId||"";
    const utiNome=a?.utiNome||utis.find(u=>u.id===utiId)?.nome||"UTI não identificada";
    const codigo=`UTI-${String(idx+1).padStart(4,"0")}`;
    const linhas=datas.map(data=>({data,...(days[data]&&typeof days[data]==="object"?days[data]:{})}));
    return {id,codigo,h,a,l,days,datas,linhas,dataAdm,dataAlta,situacao,utiId,utiNome,destino:a?.destino||h.outcome||"",rankinAdm:l.rankinAdmissao??h.rankinAdmission??"",rankinAlta:a?.rankinAlta??h.rankinDischarge??""};
  });
  const filtradas=internacoes.filter(i=>{
    if(utiFiltro&&i.utiId!==utiFiltro)return false;
    if(status!=="todos"&&i.situacao!==status)return false;
    const ds=i.datas.filter(d=>(!inicio||d>=inicio)&&(!fim||d<=fim));
    return (!inicio&&!fim)||ds.length>0||(!i.datas.length&&(!inicio||i.dataAdm>=inicio)&&(!fim||i.dataAdm<=fim));
  });
  const dias=filtradas.flatMap(i=>i.linhas.filter(x=>(!inicio||x.data>=inicio)&&(!fim||x.data<=fim)).map(x=>({internacao:i,...x})));
  const altas=filtradas.filter(i=>i.situacao==="alta"),obitos=altas.filter(i=>/óbito|obito/i.test(i.destino));
  const mediana=arr=>{const x=arr.filter(Number.isFinite).sort((a,b)=>a-b);if(!x.length)return null;const m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2;};
  const los=altas.map(i=>i.dataAdm&&i.dataAlta?Math.max(0,Math.round((new Date(i.dataAlta+"T00:00:00")-new Date(i.dataAdm+"T00:00:00"))/86400000)):null).filter(Number.isFinite);
  const vmDias=dias.filter(x=>VM_INVASIVA_MODOS.includes(x.bedside?.vm_modo)).length;
  const kcalPct=dias.map(x=>Number(x.nutrition?.adequacaoCaloricaPct)).filter(Number.isFinite),ptnPct=dias.map(x=>Number(x.nutrition?.adequacaoProteicaPct)).filter(Number.isFinite);
  const media=arr=>arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):null;
  const card=(label,value,sub,cor=T.accent)=><div style={{padding:"14px 15px",border:`1px solid ${T.border}`,borderRadius:11,background:T.bgCard,minWidth:150}}><div style={{fontSize:9,fontFamily:mono,letterSpacing:1.2,color:T.text3}}>{label}</div><div style={{fontSize:24,fontWeight:800,color:cor,marginTop:5}}>{value}</div>{sub&&<div style={{fontSize:9,color:T.text4,marginTop:2}}>{sub}</div>}</div>;
  const baixarCSV=()=>{
    const rows=dias.map(({internacao:i,data,clinicalTable:ct={},bedside:bs={},nutrition:n={},...dia})=>({
      admission_code:i.codigo,admission_id:i.id,uti:i.utiNome,data,status:i.situacao,sexo:bs.sexo||i.l.sexo||"",idade:idadeDoLeito(bs)||idadeDoLeito(i.l)||"",peso:bs.peso||i.l.peso||"",diagnostico:bs.diagnostico||i.l.diagnostico||"",rankin_admissao:i.rankinAdm,rankin_alta:i.rankinAlta,destino:i.destino,
      vm_modo:bs.vm_modo||"",vm_fio2:bs.vm_fio2||"",vm_peep:bs.vm_peep||"",vm_sato2:bs.vm_sato2||"",
      meta_kcal:n.metaKcal??"",oferta_kcal:n.ofertaKcal??"",adequacao_kcal_pct:n.adequacaoCaloricaPct??"",meta_proteina_g:n.metaProteinaG??"",oferta_proteina_g:n.ofertaProteinaG??"",adequacao_proteina_pct:n.adequacaoProteicaPct??"",dias_ate_dieta:n.diasAteInicio??"",interrupcao_dieta_h:n.interrupcaoHoras??"",motivo_interrupcao:n.motivoInterrupcao??"",
      ...Object.fromEntries(Object.entries(ct).filter(([k,v])=>!k.startsWith("_")&&typeof v!=="object")),...Object.fromEntries(Object.entries(bs.drogasVazao||{}).map(([k,v])=>[`dva_${k}`,v]))
    }));
    if(!rows.length){window.alert("Não há registros diários para exportar com estes filtros.");return;}
    const cols=[...new Set(rows.flatMap(r=>Object.keys(r)))],esc=v=>`"${String(v??"").replace(/"/g,'""')}"`;
    const csv=[cols.join(","),...rows.map(r=>cols.map(c=>esc(r[c])).join(","))].join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download=`uti-evolve-coorte-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
  };
  return <div style={{padding:"24px 28px",maxWidth:1500,margin:"0 auto",color:T.text1}}>
    <div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap",marginBottom:18}}><div><div style={{fontSize:20,fontWeight:800}}>Análise da coorte</div><div style={{fontSize:11,color:T.text3,marginTop:3}}>Painel anonimizado · visão paciente-dia para pesquisa e melhoria da qualidade</div></div><button onClick={baixarCSV} style={{marginLeft:"auto",padding:"8px 12px",borderRadius:8,border:`1px solid ${T.accentBorder}`,background:T.accentBg,color:T.accent,fontWeight:700,cursor:"pointer"}}>↓ Exportar paciente-dia</button></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8,marginBottom:14}}><label style={{fontSize:9,color:T.text3}}>UTI<select value={utiFiltro} onChange={e=>setUtiFiltro(e.target.value)} style={{display:"block",width:"100%",marginTop:4,padding:"8px",borderRadius:7,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1}}><option value="">Todas</option>{utis.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}</select></label><label style={{fontSize:9,color:T.text3}}>DATA INICIAL<input type="date" value={inicio} onChange={e=>setInicio(e.target.value)} style={{display:"block",width:"100%",marginTop:4,padding:"8px",borderRadius:7,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1}}/></label><label style={{fontSize:9,color:T.text3}}>DATA FINAL<input type="date" value={fim} onChange={e=>setFim(e.target.value)} style={{display:"block",width:"100%",marginTop:4,padding:"8px",borderRadius:7,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1}}/></label><label style={{fontSize:9,color:T.text3}}>SITUAÇÃO<select value={status} onChange={e=>setStatus(e.target.value)} style={{display:"block",width:"100%",marginTop:4,padding:"8px",borderRadius:7,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1}}><option value="todos">Todos</option><option value="ativo">Ativos</option><option value="alta">Altas</option></select></label></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginBottom:16}}>{card("INTERNAÇÕES",filtradas.length,`${altas.length} concluída(s)`)}{card("PACIENTE-DIA",dias.length,"registros longitudinais","#38bdf8")}{card("MORTALIDADE",altas.length?`${Math.round(obitos.length/altas.length*100)}%`:"—",`${obitos.length}/${altas.length} altas`,"#f87171")}{card("PERMANÊNCIA MEDIANA",mediana(los)!==null?`${mediana(los)} d`:"—","alta hospitalar/UTI","#c084fc")}{card("DIAS EM VM",vmDias,`${dias.length?Math.round(vmDias/dias.length*100):0}% dos paciente-dia`,"#f59e0b")}{card("ADEQUAÇÃO NUTRICIONAL",media(kcalPct)!==null?`${media(kcalPct)}% / ${media(ptnPct)??"—"}%`:"—","kcal / proteína","#34d399")}</div>
    <div style={{border:`1px solid ${T.border}`,borderRadius:11,background:T.bgCard,overflow:"hidden"}}><div style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,fontSize:10,fontFamily:mono,color:T.text3,letterSpacing:1}}>INTERNAÇÕES ANONIMIZADAS</div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:10,minWidth:900}}><thead><tr>{["Código","UTI","Situação","Admissão","Alta","Dias registrados","Dias VM","Adeq. kcal","Adeq. proteína","Rankin adm. → alta","Destino"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:T.text3,borderBottom:`1px solid ${T.border}`,fontWeight:600}}>{h}</th>)}</tr></thead><tbody>{filtradas.map(i=>{const ds=i.linhas.filter(x=>(!inicio||x.data>=inicio)&&(!fim||x.data<=fim)),vm=ds.filter(x=>VM_INVASIVA_MODOS.includes(x.bedside?.vm_modo)).length,k=ds.map(x=>Number(x.nutrition?.adequacaoCaloricaPct)).filter(Number.isFinite),p=ds.map(x=>Number(x.nutrition?.adequacaoProteicaPct)).filter(Number.isFinite);return <tr key={i.id}>{[i.codigo,i.utiNome,i.situacao,i.dataAdm||"—",i.dataAlta||"—",ds.length,vm,media(k)!==null?`${media(k)}%`:"—",media(p)!==null?`${media(p)}%`:"—",`${i.rankinAdm!==""?i.rankinAdm:"—"} → ${i.rankinAlta!==""?i.rankinAlta:"—"}`,i.destino||"—"].map((v,n)=><td key={n} style={{padding:"8px 10px",borderBottom:`1px solid ${T.border}`,color:n===0?T.accent:T.text2,whiteSpace:"nowrap"}}>{v}</td>)}</tr>})}</tbody></table></div>{!filtradas.length&&<div style={{padding:24,textAlign:"center",color:T.text3}}>Nenhuma internação encontrada com estes filtros.</div>}</div>
    <div style={{marginTop:10,fontSize:9,color:T.text4,lineHeight:1.5}}>Os indicadores são descritivos e dependem da completude dos registros. A exportação não inclui nomes, mas ainda deve ser tratada como dado sensível e submetida à governança institucional e à LGPD.</div>
  </div>;
}

function ArquivoPacientesPanel({arquivos=[]}) {
  const T=useTheme();
  const [busca,setBusca]=useState("");
  const [aberto,setAberto]=useState(null);
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const lista=[...arquivos].sort((a,b)=>String(b.dataAlta||b.arquivadoEm).localeCompare(String(a.dataAlta||a.arquivadoEm))).filter(a=>{
    const l=a.leito||{};return !busca||norm([l.paciente,l.diagnostico,l.nome,a.destino,a.dataAlta].join(" ")).includes(norm(busca));
  });
  const baixar=(nome,conteudo,tipo="application/json")=>{const blob=new Blob([conteudo],{type:tipo});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);};
  const exportarCSV=()=>{
    const cols=["codigo_paciente","leito","sexo","idade_anos","peso_kg","diagnostico","data_internacao","rankin_admissao","data_alta","destino","rankin_alta","arquivado_em"];
    const esc=v=>`"${String(v??"").replace(/"/g,'""')}"`;
    const linhas=arquivos.map(a=>{const l=a.leito||{};return [a.id,l.nome,l.sexo,idadeDoLeito(l),l.peso,l.diagnostico,l.dataInternacao,l.rankinAdmissao,a.dataAlta,a.destino,a.rankinAlta,a.arquivadoEm].map(esc).join(",");});
    baixar(`uti-evolve-altas-${new Date().toISOString().slice(0,10)}.csv`,[cols.join(","),...linhas].join("\n"),"text/csv;charset=utf-8");
  };
  return <div style={{padding:"28px 32px",maxWidth:1180,margin:"0 auto",color:T.text1}}>
    <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:20}}>
      <div><div style={{fontSize:20,fontWeight:800}}>Arquivo de pacientes</div><div style={{fontSize:12,color:T.text3,marginTop:3}}>{arquivos.length} alta(s) preservada(s) para consulta e pesquisa</div></div>
      <div style={{marginLeft:"auto",display:"flex",gap:8}}>
        <button onClick={exportarCSV} disabled={!arquivos.length} title="Exportação sem o nome do paciente" style={{padding:"8px 12px",borderRadius:7,border:`1px solid ${T.border}`,background:T.bgCard,color:T.text2,cursor:arquivos.length?"pointer":"default"}}>CSV anonimizado</button>
        <button onClick={()=>baixar(`uti-evolve-arquivo-completo-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(arquivos,null,2))} disabled={!arquivos.length} style={{padding:"8px 12px",borderRadius:7,border:`1px solid ${T.accentBorder}`,background:T.accentBg,color:T.accent,cursor:arquivos.length?"pointer":"default"}}>Backup completo</button>
      </div>
    </div>
    <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar paciente, diagnóstico, leito ou destino..." style={{width:"100%",boxSizing:"border-box",padding:"10px 12px",marginBottom:14,borderRadius:8,border:`1px solid ${T.border}`,background:T.bgCard,color:T.text1}}/>
    {!lista.length?<div style={{padding:28,textAlign:"center",color:T.text3,border:`1px dashed ${T.border}`,borderRadius:10}}>Nenhum paciente arquivado.</div>:lista.map(a=>{const l=a.leito||{};const abertoAgora=aberto===a.id;return <div key={a.id} style={{border:`1px solid ${T.border}`,borderRadius:10,background:T.bgCard,marginBottom:8,overflow:"hidden"}}>
      <button onClick={()=>setAberto(abertoAgora?null:a.id)} style={{width:"100%",display:"grid",gridTemplateColumns:"minmax(180px,1.5fr) minmax(140px,1fr) 110px 120px 24px",gap:12,alignItems:"center",padding:"12px 14px",border:0,background:"transparent",color:T.text1,textAlign:"left",cursor:"pointer"}}>
        <span><b>{l.paciente||"Paciente sem nome"}</b><small style={{display:"block",color:T.text3,marginTop:2}}>{l.diagnostico||"Sem diagnóstico informado"}</small></span>
        <span style={{fontSize:12,color:T.text2}}>{l.nome}</span><span style={{fontSize:12,color:T.text2}}>{a.dataAlta?new Date(a.dataAlta+"T00:00:00").toLocaleDateString("pt-BR"):"—"}</span><span style={{fontSize:12,color:T.text2}}>{a.destino||"Não informado"}</span><span>{abertoAgora?"▲":"▼"}</span>
      </button>
      {abertoAgora&&<div style={{padding:"12px 14px",borderTop:`1px solid ${T.border}`,fontSize:12,color:T.text2}}>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:10}}><span>Internação: <b>{l.dataInternacao||"—"}</b></span><span>Sexo: <b>{l.sexo||"—"}</b></span><span>Idade: <b>{idadeDoLeito(l)??"—"}</b></span><span>Peso: <b>{l.peso?`${l.peso} kg`:"—"}</b></span><span>Rankin admissão: <b>{l.rankinAdmissao!==undefined&&l.rankinAdmissao!==""?l.rankinAdmissao:"—"}</b></span><span>Rankin alta: <b>{a.rankinAlta!==undefined&&a.rankinAlta!==""?a.rankinAlta:"—"}</b></span><span>Dias de tabela: <b>{Object.keys(a.tabelaClinica||{}).filter(k=>!k.startsWith("_")).length}</b></span></div>
        <button onClick={()=>baixar(`uti-evolve-${String(l.paciente||"paciente").replace(/[^a-z0-9]+/gi,"-").toLowerCase()}-${a.dataAlta||"alta"}.json`,JSON.stringify(a,null,2))} style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${T.border}`,background:"transparent",color:T.accent,cursor:"pointer"}}>Baixar prontuário arquivado</button>
      </div>}
    </div>})}
  </div>;
}

function HistoricoDiarioPanel({internacao,onClose}){
  const T=useTheme();
  const days=internacao?.days||{},datas=Object.keys(days).sort();
  const [dataSel,setDataSel]=useState(datas[datas.length-1]||"");
  const idx=datas.indexOf(dataSel),anterior=idx>0?days[datas[idx-1]]:null,atual=days[dataSel];
  const fmt=v=>v===undefined||v===null||v===""?"—":typeof v==="object"?JSON.stringify(v):String(v);
  const labels=Object.fromEntries(TODOS_PARAMS.map(p=>[p.key,`${p.label}${p.unit?` (${p.unit})`:""}`]));
  const nomeCampo=k=>labels[k]||ABREV[k]||String(k).replace(/^c24_/,"").replace(/^vm_/,"").replace(/_/g," ").replace(/^./,c=>c.toUpperCase());
  const valoresClinicos=Object.entries(atual?.clinicalTable||{}).filter(([k,v])=>!k.startsWith("_")&&v!==""&&v!==null&&v!==undefined);
  const gasos=(()=>{try{const v=atual?.clinicalTable?._gasos;return v?(typeof v==="string"?JSON.parse(v):v):[];}catch{return[];}})();
  const scoreSnapshot=atual?.clinicalTable?._scoreSnapshot;
  const bloco=(titulo,conteudo,cor=T.accent)=><div style={{marginBottom:14,border:`1px solid ${T.border}`,borderRadius:10,background:T.bgCard,overflow:"hidden"}}><div style={{padding:"8px 11px",fontSize:10,fontFamily:mono,letterSpacing:1.2,color:cor,borderBottom:`1px solid ${T.border}`}}>{titulo}</div>{conteudo}</div>;
  const tipoMudanca=(antes,depois)=>{
    const vazio=v=>v==="—"||v===""||v==="{}"||v==="[]";
    if(vazio(antes)&&!vazio(depois))return {label:"adicionado",cor:"#38bdf8"};
    if(!vazio(antes)&&vazio(depois))return {label:"removido",cor:"#f59e0b"};
    const a=parseFloat(String(antes).replace(",",".")),b=parseFloat(String(depois).replace(",","."));
    if(Number.isFinite(a)&&Number.isFinite(b)&&a!==b)return {label:b>a?"aumentou":"reduziu",cor:b>a?"#c084fc":"#38bdf8"};
    return {label:"alterado",cor:T.accent};
  };
  const exportarPacienteDia=()=>{
    const linhas=datas.map(d=>{const x=days[d]||{},ct=x.clinicalTable||{},bs=x.bedside||{};return {admission_id:internacao.admissionId||"",patient_id:internacao.patientId||"",data:d,status:x.status||"",...Object.fromEntries(Object.entries(ct).filter(([k,v])=>!k.startsWith("_")&&typeof v!=="object")),vm_modo:bs.vm_modo||"",vm_fio2:bs.vm_fio2||"",vm_peep:bs.vm_peep||"",vm_sato2:bs.vm_sato2||"",...Object.fromEntries(Object.entries(bs.drogasVazao||{}).map(([k,v])=>[`dva_${k}`,v]))};});
    const cols=[...new Set(linhas.flatMap(x=>Object.keys(x)))],esc=v=>`"${String(v??"").replace(/"/g,'""')}"`;
    const csv=[cols.join(","),...linhas.map(l=>cols.map(c=>esc(l[c])).join(","))].join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download=`uti-evolve-paciente-dia-${internacao.admissionId||"internacao"}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
  };
  const linhas=()=>{
    if(!atual)return[];
    const a=anterior||{},b=atual;
    const fontes=[
      ["Ventilação",a.bedside||{},b.bedside||{},k=>k.startsWith("vm_")],
      ["Drogas",a.bedside?.drogasVazao||{},b.bedside?.drogasVazao||{},()=>true],
      ["Dieta",a.bedside?.dieta||{},b.bedside?.dieta||{},()=>true],
      ["Controles e exames",a.clinicalTable||{},b.clinicalTable||{},k=>!k.startsWith("_")],
      ["Evolução",a.evolution||{},b.evolution||{},k=>k!=="_datas"],
    ];
    return fontes.flatMap(([grupo,av,bv,filtro])=>Array.from(new Set([...Object.keys(av),...Object.keys(bv)])).filter(filtro).filter(k=>fmt(av[k])!==fmt(bv[k])).map(k=>({grupo,campo:nomeCampo(k),antes:fmt(av[k]),depois:fmt(bv[k])})));
  };
  const mudancas=linhas(),grupos=[...new Set(mudancas.map(x=>x.grupo))];
  return <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:12000,background:"rgba(2,8,5,.76)",display:"flex",justifyContent:"flex-end"}}>
    <aside onClick={e=>e.stopPropagation()} style={{width:"min(720px,96vw)",height:"100%",background:T.bgPage,borderLeft:`1px solid ${T.border}`,boxShadow:"-20px 0 60px rgba(0,0,0,.35)",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"18px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10}}><div><b style={{fontSize:16,color:T.text1}}>Histórico diário</b><div style={{fontSize:11,color:T.text3,marginTop:2}}>{internacao?.patientName} · {datas.length} registro(s) preservado(s)</div></div><button onClick={exportarPacienteDia} disabled={!datas.length} title="Exportação anonimizada: uma linha por paciente/dia" style={{marginLeft:"auto",padding:"6px 9px",borderRadius:7,border:`1px solid ${T.border}`,background:T.bgCard,color:T.accent,cursor:datas.length?"pointer":"default",fontSize:10}}>Exportar CSV</button><button onClick={onClose} style={{border:0,background:"transparent",color:T.text3,fontSize:18,cursor:"pointer"}}>✕</button></div>
      <div style={{padding:"12px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",gap:7,overflowX:"auto"}}>{datas.map((d,i)=><button key={d} onClick={()=>setDataSel(d)} title={days[d]?.status==="legacy-partial"?"Registro recuperado da Tabela Clínica; não contém o beira-leito completo daquele dia.":"Snapshot diário completo"} style={{padding:"7px 10px",borderRadius:7,border:`1px solid ${dataSel===d?T.accentBorder:T.border}`,background:dataSel===d?T.accentBg:T.bgCard,color:dataSel===d?T.accent:T.text2,cursor:"pointer",whiteSpace:"nowrap",fontSize:11}}>{new Date(d+"T00:00:00").toLocaleDateString("pt-BR")}{days[d]?.status==="legacy-partial"?" · parcial":i===datas.length-1?" · atual":""}</button>)}</div>
      <div style={{padding:"16px 20px",overflowY:"auto",flex:1}}>
        <div style={{fontSize:12,color:T.text2,marginBottom:14}}>{anterior?<>Comparação com <b>{new Date(datas[idx-1]+"T00:00:00").toLocaleDateString("pt-BR")}</b> · {mudancas.length} alteração(ões)</>:<>Primeiro registro desta internação.</>}</div>
        {!anterior?<>
          {atual?.status==="legacy-partial"&&<div style={{padding:"9px 11px",borderRadius:8,background:"rgba(251,191,36,.08)",border:"1px solid rgba(251,191,36,.25)",color:"#fbbf24",fontSize:11,marginBottom:12}}>Registro recuperado da Tabela Clínica. O beira-leito e a evolução completa não eram versionados nesta data.</div>}
          {valoresClinicos.length>0&&bloco("CONTROLES E EXAMES",<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:0}}>{valoresClinicos.map(([k,v])=><div key={k} style={{padding:"9px 11px",borderBottom:`1px solid ${T.border}`}}><div style={{fontSize:9,color:T.text3,marginBottom:3}}>{nomeCampo(k)}</div><b style={{fontSize:12,color:T.text1,fontFamily:mono}}>{fmt(v)}</b></div>)}</div>)}
          {gasos.length>0&&bloco("GASOMETRIAS",<div>{gasos.map((g,i)=><div key={g.id||i} style={{padding:"9px 11px",borderBottom:`1px solid ${T.border}`,fontSize:11,color:T.text2}}><b style={{color:T.text1}}>{g.horario||`Amostra ${i+1}`}</b> · {["ph","pco2","po2","hco3","be","sato2","lact"].filter(k=>g[k]!==""&&g[k]!=null).map(k=>`${ABREV[k]||k} ${g[k]}`).join(" · ")}</div>)}</div>,"#38bdf8")}
          {scoreSnapshot&&bloco("ESCORES",<div style={{display:"flex",gap:10,padding:11,flexWrap:"wrap"}}>{scoreSnapshot.clif?.clifOF!=null&&<span style={{padding:"6px 9px",borderRadius:7,background:"rgba(251,146,60,.1)",color:"#fb923c"}}>CLIF-OF <b>{scoreSnapshot.clif.clifOF}</b></span>}{scoreSnapshot.clif?.clifC!=null&&<span style={{padding:"6px 9px",borderRadius:7,background:"rgba(251,146,60,.1)",color:"#fb923c"}}>CLIF-C <b>{scoreSnapshot.clif.clifC}</b></span>}{scoreSnapshot.sofa?.sofa!=null&&<span style={{padding:"6px 9px",borderRadius:7,background:"rgba(248,113,113,.1)",color:"#f87171"}}>SOFA <b>{scoreSnapshot.sofa.sofa}</b></span>}</div>,"#fb923c")}
          {!valoresClinicos.length&&!gasos.length&&<div style={{padding:24,textAlign:"center",color:T.text3}}>Este registro ainda não possui dados clínicos estruturados.</div>}
        </>:mudancas.length===0?<div style={{padding:24,textAlign:"center",color:T.text3}}>Nenhuma modificação registrada entre os dois dias.</div>:grupos.map(g=><div key={g} style={{marginBottom:16}}><div style={{fontSize:10,fontFamily:mono,letterSpacing:1.3,color:T.accent,marginBottom:6}}>{g.toUpperCase()}</div>{mudancas.filter(x=>x.grupo===g).map(x=>{const tipo=tipoMudanca(x.antes,x.depois);return <div key={`${g}-${x.campo}`} style={{display:"grid",gridTemplateColumns:"150px minmax(90px,1fr) 22px minmax(90px,1fr) 72px",gap:8,alignItems:"start",padding:"8px 10px",borderBottom:`1px solid ${T.border}`,fontSize:11}}><b style={{color:T.text2,overflowWrap:"anywhere"}}>{x.campo}</b><span style={{color:T.text3,overflowWrap:"anywhere"}}>{x.antes}</span><span style={{color:T.accent}}>→</span><span style={{color:T.text1,overflowWrap:"anywhere",fontWeight:600}}>{x.depois}</span><span style={{fontSize:9,color:tipo.cor,border:`1px solid ${tipo.cor}55`,background:`${tipo.cor}12`,borderRadius:8,padding:"2px 5px",textAlign:"center"}}>{tipo.label}</span></div>})}</div>)}
      </div>
      <div style={{padding:"10px 20px",borderTop:`1px solid ${T.border}`,fontSize:10,color:T.text3}}>Visualização somente leitura. Correções auditáveis serão adicionadas na próxima etapa.</div>
    </aside>
  </div>;
}
// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [authed,     setAuthed]     = useState(false);
  const [appReady,   setAppReady]   = useState(false);
  const [leitos,     setLeitos]     = useState(LEITOS_INICIAIS);
  const [hospitais,setHospitais]=useState([{id:"hsp",nome:"Hospital São Paulo",sigla:"HSP"}]);
  const [utis,setUtis]=useState([{id:"uti-principal",nome:"UTI G1",hospitalId:"hsp"}]);
  const [utiAtivaId,setUtiAtivaId]=useState(()=>sessionStorage.getItem("uti_ativa_id")||"");
  const [perfil,setPerfil]=useState(()=>sessionStorage.getItem("uti_perfil")||"plantonista");
  const [utiMenu,setUtiMenu]=useState(null);
  const [leitoSelId, setLeitoSelId] = useState(LEITOS_INICIAIS[0].id);
  const [aba,        setAba]        = useState("evolucao");
  const [dadosIA,    setDadosIA]    = useState(null);
  const [evolCampos, setEvolCampos] = useState(EVOLUCAO_VAZIA);
  const [evolVersion, setEvolVersion] = useState(0);
  const [evolPorLeito, setEvolPorLeito] = useState({});
  const [tabelaData, setTabelaData] = useState({});
  const [metasPorLeito, setMetasPorLeito] = useState({});
  const [pacientesArquivados,setPacientesArquivados]=useState([]);
  const [historicoDiario,setHistoricoDiario]=useState({});
  const [historicoAberto,setHistoricoAberto]=useState(false);
  const [pacienteEditorAberto,setPacienteEditorAberto]=useState(false);
  const [altaEditor,setAltaEditor]=useState(null);
  const [sbariSyncing,setSbariSyncing]=useState(false);
  const [dataLoaded,setDataLoaded]=useState(false);
  const [config, setConfig] = useState({
    alertaCVC: 7, alertaPAI: 7, alertaSVD: 14, alertaTQT: 99,
    alertaTOT: 99, alertaSNG: 21, alertaDreno: 21, alertaDialise: 14,
  });
  const [saving, setSaving] = useState(false);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("uti_sidebar_collapsed") === "1");
  const [viewGlobal, setViewGlobal]   = useState("leitos");
  const [theme, setTheme] = useState(() => localStorage.getItem("uti_theme") || "dark");
  const T = theme === "light" ? LIGHT : DARK;
  const toggleTheme = () => setTheme(t => { const next = t==="dark"?"light":"dark"; localStorage.setItem("uti_theme",next); return next; });
  const saveTimer   = useRef(null);
  const evolTimer   = useRef(null);
  const tabelaTimer = useRef(null);
  const configTimer = useRef(null);
  const metasTimer  = useRef(null);
  const historicoTimer = useRef(null);
  const historicoRef = useRef({});
  useEffect(()=>{historicoRef.current=historicoDiario;},[historicoDiario]);

  // ── LOAD ─────────────────────────────────────────────────────────────────────
  const loadData = async () => {
    let leitoAtualId = LEITOS_INICIAIS[0].id;
    let utiPadrao="uti-principal";
    try{
      const {data:hd}=await supabase.from("config").select("value").eq("key","hospitais_data").single();
      if(hd?.value){const parsed=JSON.parse(hd.value);if(Array.isArray(parsed)&&parsed.length)setHospitais(parsed);}
    }catch{}
    try{
      const {data:ud}=await supabase.from("config").select("value").eq("key","utis_data").single();
      if(ud?.value){const parsed=JSON.parse(ud.value);if(Array.isArray(parsed)&&parsed.length){const migradas=parsed.map(u=>({...u,nome:u.id==="uti-principal"&&u.nome==="UTI Principal"?"UTI G1":u.nome,hospitalId:u.hospitalId||"hsp"}));setUtis(migradas);utiPadrao=migradas[0].id;if(JSON.stringify(migradas)!==JSON.stringify(parsed))await supabase.from("config").upsert({key:"utis_data",value:JSON.stringify(migradas)});}}
    }catch{}
    try {
      const { data: ld } = await supabase.from("config").select("value").eq("key","leitos_data").single();
      if (ld?.value) {
        const p = JSON.parse(ld.value);
        if (Array.isArray(p) && p.length) {
          const agora=new Date().toISOString();
          const normalizados=p.map(l=>({...l,utiId:l.utiId||utiPadrao,...(!l.paciente?{}:{patientId:l.patientId||(globalThis.crypto?.randomUUID?.()||`pac-${Date.now()}-${l.id}`),admissionId:l.admissionId||(globalThis.crypto?.randomUUID?.()||`adm-${Date.now()}-${l.id}`),admissionStartedAt:l.admissionStartedAt||agora})}));
          setLeitos(normalizados);
          leitoAtualId = normalizados[0].id;
          setLeitoSelId(normalizados[0].id);
          if(normalizados.some((l,i)=>JSON.stringify(l)!==JSON.stringify(p[i])))await supabase.from("config").upsert({key:"leitos_data",value:JSON.stringify(normalizados)});
        }
      }
    } catch {}
    try {
      const { data: td } = await supabase.from("config").select("value").eq("key","tabela_data").single();
      if (td?.value) {
        const p = JSON.parse(td.value);
        if (p && typeof p === 'object') setTabelaData(p);
      }
    } catch {}
    try {
      const { data: cd } = await supabase.from("config").select("value").eq("key","app_config").single();
      if (cd?.value) {
        const p = JSON.parse(cd.value);
        if (p && typeof p === 'object') setConfig(c=>({...c,...p}));
      }
    } catch {}
    try {
      const { data: ed } = await supabase.from("config").select("value").eq("key","evolucao_data").single();
      if (ed?.value) {
        const p = JSON.parse(ed.value);
        if (p && typeof p === 'object') {
          setEvolPorLeito(p);
          if (p[leitoAtualId]) { setEvolCampos(p[leitoAtualId]); setEvolVersion(v=>v+1); }
        }
      }
    } catch {}
    try {
      const { data: md } = await supabase.from("config").select("value").eq("key","metas_data").single();
      if (md?.value) {
        const p = JSON.parse(md.value);
        if (p && typeof p === 'object') setMetasPorLeito(p);
      }
    } catch {}
    try {
      const {data:ad}=await supabase.from("config").select("value").eq("key","pacientes_arquivados").single();
      if(ad?.value){const p=JSON.parse(ad.value);if(Array.isArray(p))setPacientesArquivados(p);}
    } catch {}
    try {
      const {data:hd}=await supabase.from("config").select("value").eq("key","historico_diario").single();
      if(hd?.value){const p=JSON.parse(hd.value);if(p&&typeof p==="object")setHistoricoDiario(p);}
    } catch {}
    // Libera saves e dispara a criação do snapshot de hoje após o load completo.
    setDataLoaded(true);
    setTimeout(() => { isLoaded.current = true; }, 300);
  };

  // ── INIT ──────────────────────────────────────────────────────────────────────
  useEffect(()=>{
    (async()=>{
      const sess = sessionStorage.getItem(SESSION_KEY);
      if (sess) {
        try {
          const { data } = await supabase.from("config").select("value").eq("key","pwd_hash").single();
          if (data && data.value === sess) { await loadData(); setAuthed(true); }
        } catch {}
      }
      setAppReady(true);
    })();
  // eslint-disable-next-line
  },[]);

  // ── Favicon + título ──────────────────────────────────────────────────────────
  useEffect(()=>{
    document.title = "UTI Evolve";
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'><rect width='100' height='100' rx='20' fill='%230d1117'/><path d='M50 22 Q68 18 76 32 Q84 46 80 60 Q76 72 62 76 Q56 78 50 77 Q44 78 38 76 Q24 72 20 60 Q16 46 24 32 Q32 18 50 22Z' fill='none' stroke='%237dd3fc' stroke-width='5' stroke-linecap='round'/><path d='M50 22 Q51 40 50 77' fill='none' stroke='%230ea5e9' stroke-width='2' stroke-dasharray='5 6' opacity='0.45'/><path d='M57 26 Q60 38 58 52' fill='none' stroke='%2393c5fd' stroke-width='3' stroke-linecap='round' opacity='0.6'/><path d='M43 26 Q40 38 42 52' fill='none' stroke='%2393c5fd' stroke-width='3' stroke-linecap='round' opacity='0.6'/><path d='M60 52 Q70 50 76 55' fill='none' stroke='%237dd3fc' stroke-width='3' stroke-linecap='round' opacity='0.65'/><path d='M40 52 Q30 50 24 55' fill='none' stroke='%237dd3fc' stroke-width='3' stroke-linecap='round' opacity='0.65'/><path d='M45 77 Q45 85 50 87 Q55 85 55 77' fill='none' stroke='%237dd3fc' stroke-width='3.5' stroke-linecap='round' opacity='0.65'/><path d='M28 21 Q50 13 72 21' fill='none' stroke='%2338bdf8' stroke-width='4.5' stroke-linecap='round'/><rect x='40' y='6' width='20' height='9' rx='4' fill='%230ea5e9' opacity='0.9'/><path d='M72 21 Q80 17 85 12' fill='none' stroke='%230ea5e9' stroke-width='3' stroke-linecap='round' opacity='0.8'/><rect x='83' y='8' width='8' height='5' rx='2' fill='%230ea5e9' opacity='0.8'/></svg>`;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; link.type = 'image/svg+xml'; document.head.appendChild(link); }
    link.href = `data:image/svg+xml,${svg}`;
  },[]);

  const onLogin = async () => { await loadData(); setAuthed(true); };

  const isLoaded    = useRef(false);

  // Sincroniza lançamentos recebidos pelo WhatsApp ao voltar para o aplicativo.
  useEffect(()=>{
    if(!authed) return;
    const atualizarLeitosRemotos=async()=>{
      if(document.visibilityState!=="visible" || saveTimer.current) return;
      try{
        const {data}=await supabase.from("config").select("value").eq("key","leitos_data").single();
        if(!data?.value) return;
        const remotos=JSON.parse(data.value);
        if(!Array.isArray(remotos) || !remotos.length) return;
        setLeitos(remotos);
        if(!remotos.some(l=>l.id===leitoSelId)) setLeitoSelId(remotos[0].id);
      }catch(e){ console.warn("Falha ao sincronizar lançamentos do WhatsApp",e); }
    };
    window.addEventListener("focus",atualizarLeitosRemotos);
    document.addEventListener("visibilitychange",atualizarLeitosRemotos);
    return ()=>{
      window.removeEventListener("focus",atualizarLeitosRemotos);
      document.removeEventListener("visibilitychange",atualizarLeitosRemotos);
    };
  },[authed,leitoSelId]);

  // ── SAVES manuais (chamados explicitamente, não por useEffect) ────────────────
  const salvarLeitos = (val) => {
    if (!isLoaded.current) return;
    clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async()=>{
      try { await supabase.from("config").upsert({key:"leitos_data",value:JSON.stringify(val)}); } catch {}
      saveTimer.current = null;
      setSaving(false);
    }, 800);
  };

  const salvarEvol = (val) => {
    if (!isLoaded.current) return;
    clearTimeout(evolTimer.current);
    evolTimer.current = setTimeout(async()=>{
      try { await supabase.from("config").upsert({key:"evolucao_data",value:JSON.stringify(val)}); } catch {}
    }, 800);
  };

  const salvarTabela = (val) => {
    if (!isLoaded.current) return;
    clearTimeout(tabelaTimer.current);
    tabelaTimer.current = setTimeout(async()=>{
      try { await supabase.from("config").upsert({key:"tabela_data",value:JSON.stringify(val)}); } catch {}
    }, 800);
  };

  const salvarConfig = (val) => {
    if (!isLoaded.current) return;
    clearTimeout(configTimer.current);
    configTimer.current = setTimeout(async()=>{
      try { await supabase.from("config").upsert({key:"app_config",value:JSON.stringify(val)}); } catch {}
    }, 800);
  };

  const salvarMetas = (val) => {
    if (!isLoaded.current) return;
    clearTimeout(metasTimer.current);
    metasTimer.current = setTimeout(async()=>{
      try { await supabase.from("config").upsert({key:"metas_data",value:JSON.stringify(val)}); } catch {}
    }, 800);
  };

  // Compatibilidade longitudinal: cada paciente ativo recebe IDs permanentes de
  // paciente/internação. O registro de hoje é atualizado enquanto dias anteriores
  // permanecem preservados em historico_diario.
  useEffect(()=>{
    if(!dataLoaded)return;
    const faltam=leitos.some(l=>l.paciente&&(!l.patientId||!l.admissionId));
    if(!faltam)return;
    const agora=new Date().toISOString();
    const normalizados=leitos.map(l=>!l.paciente?l:{...l,patientId:l.patientId||(globalThis.crypto?.randomUUID?.()||`pac-${Date.now()}-${l.id}`),admissionId:l.admissionId||(globalThis.crypto?.randomUUID?.()||`adm-${Date.now()}-${l.id}`),admissionStartedAt:l.admissionStartedAt||agora});
    setLeitos(normalizados);salvarLeitos(normalizados);
  },[leitos,dataLoaded]);

  useEffect(()=>{
    if(!dataLoaded)return;
    clearTimeout(historicoTimer.current);
    historicoTimer.current=setTimeout(async()=>{
      const hoje=new Date().toISOString().slice(0,10),agora=new Date().toISOString();
      const ativos=leitos.filter(l=>l.paciente&&l.admissionId);
      if(!ativos.length)return;
      const novo={...historicoRef.current};
      ativos.forEach(l=>{
        const adm=novo[l.admissionId]||{admissionId:l.admissionId,patientId:l.patientId,startedAt:l.admissionStartedAt||agora,bedId:l.id,days:{}};
        adm.patientId=l.patientId;adm.bedId=l.id;adm.patientName=l.paciente;adm.days={...(adm.days||{}),[hoje]:{
          clinicalDate:hoje,recordedAt:agora,status:"draft",source:"uti-evolve",
          patient:{id:l.patientId,nome:l.paciente,sexo:l.sexo,idade:idadeDoLeito(l),peso:l.peso,diagnostico:l.diagnostico},
          bedside:JSON.parse(JSON.stringify(l)),
          evolution:JSON.parse(JSON.stringify(evolPorLeito[l.id]||{})),
          clinicalTable:JSON.parse(JSON.stringify((tabelaData[l.id]||{})[hoje]||{})),
          nutrition:calcularNutriDia(l,(tabelaData[l.id]||{})[hoje]||{},config),
          goals:JSON.parse(JSON.stringify(metasPorLeito[l.id]||[])),
        }};novo[l.admissionId]=adm;
      });
      setHistoricoDiario(novo);
      try{await supabase.from("config").upsert({key:"historico_diario",value:JSON.stringify(novo)});}catch(e){console.warn("Falha ao salvar histórico diário",e);}
    },1200);
    return()=>clearTimeout(historicoTimer.current);
  },[leitos,evolPorLeito,tabelaData,metasPorLeito,config,dataLoaded]);

  // Recupera a linha do tempo já existente na Tabela Clínica. Como as versões
  // antigas não guardavam snapshots completos, esses dias entram identificados
  // como parciais, preservando controles, exames, gasometrias e escores datados.
  useEffect(()=>{
    if(!dataLoaded)return;
    let mudou=false;const novo={...historicoDiario};
    leitos.filter(l=>l.paciente&&l.admissionId).forEach(l=>{
      const adm={...(novo[l.admissionId]||{admissionId:l.admissionId,patientId:l.patientId,patientName:l.paciente,startedAt:l.admissionStartedAt,bedId:l.id,days:{}}),days:{...(novo[l.admissionId]?.days||{})}};
      Object.entries(tabelaData[l.id]||{}).filter(([d])=>/^\d{4}-\d{2}-\d{2}/.test(d)).forEach(([d,row])=>{
        const dataClinica=d.slice(0,10);
        if(adm.days[dataClinica])return;
        adm.days[dataClinica]={clinicalDate:dataClinica,recordedAt:`${dataClinica}T23:59:00`,status:"legacy-partial",source:"clinical-table-backfill",patient:{id:l.patientId,nome:l.paciente,sexo:l.sexo,idade:idadeDoLeito(l),peso:l.peso,diagnostico:l.diagnostico},bedside:{},evolution:{},clinicalTable:JSON.parse(JSON.stringify(row||{})),goals:[]};mudou=true;
      });
      novo[l.admissionId]=adm;
    });
    if(!mudou)return;
    setHistoricoDiario(novo);
    supabase.from("config").upsert({key:"historico_diario",value:JSON.stringify(novo)}).then(({error})=>{if(error)console.warn("Falha ao recuperar histórico da tabela",error);});
  },[leitos,tabelaData,historicoDiario,dataLoaded]);

  const utiAtiva=utis.find(u=>u.id===utiAtivaId)||utis[0];
  const hospitalAtivo=hospitais.find(h=>h.id===utiAtiva?.hospitalId)||hospitais[0];
  const leitosDaUti=leitos.filter(l=>(l.utiId||utis[0]?.id)===utiAtiva?.id);
  const leito = leitos.find(l=>l.id===leitoSelId)||leitosDaUti[0]||leitos[0];
  const selecionarUti=id=>{
    const lista=leitos.filter(l=>(l.utiId||utis[0]?.id)===id);
    setUtiAtivaId(id);sessionStorage.setItem("uti_ativa_id",id);
    if(lista.length)setLeitoSelId(lista[0].id);
    setAba("evolucao");setViewGlobal("leitos");setDadosIA(null);
  };
  const criarUti=async(hospitalId=undefined)=>{
    const nome=window.prompt("Nome da nova UTI:","")?.trim();if(!nome)return;
    const id=`uti-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const novas=[...utis,{id,nome,hospitalId:hospitalId||hospitalAtivo?.id||hospitais[0]?.id||"hsp"}];setUtis(novas);
    try{await supabase.from("config").upsert({key:"utis_data",value:JSON.stringify(novas)});}catch{}
    const novoLeito={id:Date.now()+1,utiId:id,nome:"Leito 01",paciente:"",diagnostico:"",dataInternacao:"",rankinAdmissao:"",peso:"",altura:"",sexo:"M",acompanhantes:[],procedimentos:[],dispositivos:{}};
    const todos=[...leitos,novoLeito];setLeitos(todos);salvarLeitos(todos);
    setUtiAtivaId(id);sessionStorage.setItem("uti_ativa_id",id);setLeitoSelId(novoLeito.id);setAba("evolucao");setViewGlobal("leitos");
  };
  const criarHospital=async()=>{
    const nome=window.prompt("Nome do hospital:","")?.trim();if(!nome)return;
    const sigla=window.prompt("Sigla do hospital (opcional):","")?.trim()||nome.slice(0,4).toUpperCase();
    const hospital={id:`hospital-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,nome,sigla};
    const novos=[...hospitais,hospital];setHospitais(novos);
    try{await supabase.from("config").upsert({key:"hospitais_data",value:JSON.stringify(novos)});}catch{}
    await criarUti(hospital.id);
  };
  const mudarPerfil=proximo=>{setPerfil(proximo);sessionStorage.setItem("uti_perfil",proximo);if(proximo==="plantonista")setViewGlobal("leitos");};
  const sincronizarSbari=async()=>{
    const raw=config.sbariLinks?.[utiAtiva?.id];
    const links=(Array.isArray(raw)?raw:(raw?[{label:"SBARI",url:raw}]:[])).filter(x=>x?.url);
    if(!links.length){window.alert("Cadastre ao menos um link do SBARI desta UTI em Configurações.");return;}
    setSbariSyncing(true);
    try{
      const retornos=await Promise.all(links.map(async link=>{const resposta=await fetch("/api/sbari",{method:"POST",headers:{"content-type":"application/json","x-uti-session":sessionStorage.getItem(SESSION_KEY)||""},body:JSON.stringify({url:link.url})});const payload=await resposta.json().catch(()=>({}));if(!resposta.ok)throw new Error(`${link.label||"SBARI"}: ${payload.error||"não foi possível ler o documento"}`);return {...payload,linkLabel:link.label||payload.source?.name||"SBARI"};}));
      const porNomeRecebido=new Map();retornos.flatMap(r=>(r.pacientes||[]).map(p=>({...p,sbariOrigem:r.linkLabel}))).forEach(p=>porNomeRecebido.set(normalizarNomeSbari(p.paciente),p));
      const recebidos=[...porNomeRecebido.values()];
      const porLeitoVago=new Map();retornos.flatMap(r=>r.leitosVagos||[]).forEach(v=>porLeitoVago.set(normalizarNomeSbari(v.leito),v));
      const vagosDeclarados=[...porLeitoVago.values()];
      const payload={source:{name:retornos.map(r=>r.linkLabel).join(" + ")}};
      const atuais=leitos.filter(l=>(l.utiId||utis[0]?.id)===utiAtiva.id);
      const ocupados=atuais.filter(l=>l.paciente);
      const porPaciente=new Map(ocupados.map(l=>[normalizarNomeSbari(l.paciente),l]));
      const correspondencias=new Map(),idsCorrespondidos=new Set();
      recebidos.forEach(p=>{
        const chave=normalizarNomeSbari(p.paciente);
        let existente=porPaciente.get(chave);
        if(existente&&idsCorrespondidos.has(String(existente.id)))existente=null;
        if(!existente){
          const candidatos=ocupados.filter(l=>!idsCorrespondidos.has(String(l.id))&&nomesCompativeisSbari(l.paciente,p.paciente));
          if(candidatos.length===1)existente=candidatos[0];
        }
        if(existente){correspondencias.set(chave,existente);idsCorrespondidos.add(String(existente.id));}
      });
      const preservados=recebidos.filter(p=>correspondencias.has(normalizarNomeSbari(p.paciente)));
      const novos=recebidos.filter(p=>!correspondencias.has(normalizarNomeSbari(p.paciente)));
      const removidos=ocupados.filter(l=>!idsCorrespondidos.has(String(l.id)));
      const listaMantidos=preservados.length?preservados.map(p=>{
        const atual=correspondencias.get(normalizarNomeSbari(p.paciente));
        const mudouLeito=normalizarNomeSbari(atual?.nome)!==normalizarNomeSbari(p.leito);
        return `• ${p.leito} — ${p.paciente}${mudouLeito?` (era ${atual?.nome||"outro leito"})`:""}`;
      }).join("\n"):"— nenhum";
      const listaNovos=novos.length?novos.map(p=>`• ${p.leito} — ${p.paciente}`).join("\n"):"— nenhum";
      const listaAusentes=removidos.length?removidos.map(l=>`• ${l.nome} — ${l.paciente}`).join("\n"):"— nenhum";
      const listaVagos=vagosDeclarados.length?vagosDeclarados.map(v=>`• ${v.leito}`).join("\n"):"— nenhum informado explicitamente";
      const alerta=(ocupados.length>=5&&(recebidos.length<Math.ceil(ocupados.length*0.5)||removidos.length>ocupados.length*0.6))
        ?"\n\n⚠️ ATENÇÃO: muitos pacientes seriam arquivados. Revise cuidadosamente as listas antes de continuar."
        :"";
      const resumo=`Atualização do SBARI — ${utiAtiva.nome}\n\nMANTIDOS (${preservados.length}) — dados clínicos preservados\n${listaMantidos}\n\nNOVOS (${novos.length})\n${listaNovos}\n\nLEITOS VAGOS NO SBARI (${vagosDeclarados.length})\n${listaVagos}\n\nAUSENTES (${removidos.length}) — serão arquivados com alta pendente\n${listaAusentes}${alerta}\n\nDeseja aplicar exatamente estas alterações?`;
      if(!window.confirm(resumo))return;
      const agora=new Date().toISOString();
      const vagas=atuais.filter(l=>!l.paciente);
      const usados=new Set();
      const leitosSbari=recebidos.map((p,indice)=>{
        const existente=correspondencias.get(normalizarNomeSbari(p.paciente));
        if(existente){usados.add(String(existente.id));return {...existente,nome:p.leito,utiId:utiAtiva.id};}
        const vaga=vagas.find(v=>!usados.has(String(v.id))&&normalizarNomeSbari(v.nome)===normalizarNomeSbari(p.leito))||vagas.find(v=>!usados.has(String(v.id)));
        const id=vaga?.id||`sbari-${Date.now()}-${indice}`;usados.add(String(id));
        return {...leitoVazio({id,nome:p.leito}),id,nome:p.leito,utiId:utiAtiva.id,paciente:p.paciente,idadeAnos:p.idadeAnos||"",dataInternacao:dataSbariParaIso(p.admUti),diagnostico:p.situacao||"",equipe:p.equipe||"",patientId:globalThis.crypto?.randomUUID?.()||`pac-${Date.now()}-${indice}`,admissionId:globalThis.crypto?.randomUUID?.()||`adm-${Date.now()}-${indice}`,admissionStartedAt:agora,fonteCadastro:"sbari",sbariOrigem:p.sbariOrigem||""};
      });
      const nomesLeitos=new Set(leitosSbari.map(l=>normalizarNomeSbari(l.nome)));
      const nomesParaVaga=new Map();
      [...atuais.map(l=>({leito:l.nome})),...vagosDeclarados].forEach(v=>{const chave=normalizarNomeSbari(v.leito);if(chave&&!nomesLeitos.has(chave))nomesParaVaga.set(chave,v.leito);});
      const vagasRestantes=[...nomesParaVaga.values()].map((nome,indice)=>{
        const base=atuais.find(l=>normalizarNomeSbari(l.nome)===normalizarNomeSbari(nome)&&!usados.has(String(l.id)));
        const id=base?.id||`sbari-vaga-${Date.now()}-${indice}`;usados.add(String(id));
        return {...leitoVazio({id,nome}),id,nome,utiId:utiAtiva.id};
      });
      const foraDaUti=leitos.filter(l=>(l.utiId||utis[0]?.id)!==utiAtiva.id);
      const novosLeitos=[...foraDaUti,...leitosSbari,...vagasRestantes];
      const registrosArquivo=removidos.map(l=>({id:globalThis.crypto?.randomUUID?.()||`sbari-alta-${Date.now()}-${l.id}`,dataAlta:"",destino:"",rankinAlta:"",status:"pendente_complementacao",motivoArquivo:`Ausente no SBARI ${payload.source?.name||"da UTI"}`,arquivadoEm:agora,patientId:l.patientId||null,admissionId:l.admissionId||null,utiId:utiAtiva.id,utiNome:utiAtiva.nome,leito:JSON.parse(JSON.stringify(l)),tabelaClinica:JSON.parse(JSON.stringify(tabelaData[l.id]||{})),evolucao:JSON.parse(JSON.stringify(evolPorLeito[l.id]||{})),metas:JSON.parse(JSON.stringify(metasPorLeito[l.id]||[])),historicoDiario:JSON.parse(JSON.stringify(historicoDiario[l.admissionId]?.days||{}))}));
      const novoArquivo=[...pacientesArquivados,...registrosArquivo];
      const novaTabela={...tabelaData},novaEvol={...evolPorLeito},novasMetas={...metasPorLeito},novoHistorico={...historicoDiario};
      removidos.forEach(l=>{delete novaTabela[l.id];delete novaEvol[l.id];delete novasMetas[l.id];if(l.admissionId)novoHistorico[l.admissionId]={...(novoHistorico[l.admissionId]||{}),status:"archived-pending-discharge",archivedAt:agora,days:{...(novoHistorico[l.admissionId]?.days||{})}};});
      leitosSbari.filter(l=>l.fonteCadastro==="sbari").forEach(l=>{const p=recebidos.find(x=>normalizarNomeSbari(x.paciente)===normalizarNomeSbari(l.paciente));novaEvol[l.id]=evolucaoInicialSbari(p);});
      const resultados=await Promise.all([
        ["leitos_data",novosLeitos],["pacientes_arquivados",novoArquivo],["tabela_data",novaTabela],["evolucao_data",novaEvol],["metas_data",novasMetas],["historico_diario",novoHistorico]
      ].map(([key,value])=>supabase.from("config").upsert({key,value:JSON.stringify(value)})));
      const falha=resultados.find(r=>r.error);if(falha)throw falha.error;
      setLeitos(novosLeitos);setPacientesArquivados(novoArquivo);setTabelaData(novaTabela);setEvolPorLeito(novaEvol);setMetasPorLeito(novasMetas);setHistoricoDiario(novoHistorico);
      const novaConfig={...config,sbariStatus:{...(config.sbariStatus||{}),[utiAtiva.id]:{at:agora,source:payload.source?.name||"SBARI",preservados:preservados.length,novos:novos.length,arquivados:removidos.length}}};
      setConfig(novaConfig);salvarConfig(novaConfig);
      if(leitosSbari.length)setLeitoSelId(leitosSbari[0].id);
      window.alert(`SBARI atualizado: ${preservados.length} preservado(s), ${novos.length} novo(s) e ${removidos.length} arquivado(s).`);
    }catch(e){console.error("Falha ao sincronizar SBARI",e);window.alert(e?.message||"Falha ao atualizar leitos pelo SBARI.");}
    finally{setSbariSyncing(false);}
  };
  const atualizar = (d) => {
    setLeitos(ls=>{
      const novo = ls.map(l=>{
        if(l.id!==leitoSelId)return l;
        const atualizado={...l,...d};
        if(atualizado.paciente&&!atualizado.patientId)atualizado.patientId=globalThis.crypto?.randomUUID?.()||`pac-${Date.now()}`;
        if(atualizado.paciente&&!atualizado.admissionId){atualizado.admissionId=globalThis.crypto?.randomUUID?.()||`adm-${Date.now()}`;atualizado.admissionStartedAt=new Date().toISOString();}
        return atualizado;
      });
      salvarLeitos(novo);
      return novo;
    });
  };

  const transferirPaciente = async (destinoId) => {
    const origem=leito;
    const destino=leitos.find(l=>String(l.id)===String(destinoId));
    if(!origem?.paciente||!destino||destino.paciente||String(origem.id)===String(destino.id)){
      window.alert("Selecione um leito vago da mesma UTI.");return false;
    }
    if(!window.confirm(`Transferir ${origem.paciente} de ${origem.nome} para ${destino.nome}?`))return false;
    const registroTransferencia={de:origem.nome,para:destino.nome,em:new Date().toISOString()};
    const pacienteMovido={...origem,id:destino.id,nome:destino.nome,utiId:destino.utiId||origem.utiId,
      transferencias:[...(origem.transferencias||[]),registroTransferencia]};
    const novosLeitos=leitos.map(l=>String(l.id)===String(origem.id)?leitoVazio(l):String(l.id)===String(destino.id)?pacienteMovido:l);
    const mover=(obj,valor)=>{const novo={...obj};delete novo[origem.id];delete novo[destino.id];if(valor!==undefined)novo[destino.id]=JSON.parse(JSON.stringify(valor));return novo;};
    const novaTabela=mover(tabelaData,tabelaData[origem.id]);
    const novaEvol=mover(evolPorLeito,evolCampos||evolPorLeito[origem.id]);
    const novasMetas=mover(metasPorLeito,metasPorLeito[origem.id]);
    const novoHistorico={...historicoDiario};
    if(origem.admissionId)novoHistorico[origem.admissionId]={...(novoHistorico[origem.admissionId]||{}),currentBedId:destino.id,currentBedName:destino.nome,
      transfers:[...(novoHistorico[origem.admissionId]?.transfers||[]),registroTransferencia]};
    setSaving(true);
    try{
      const resultados=await Promise.all([
        supabase.from("config").upsert({key:"leitos_data",value:JSON.stringify(novosLeitos)}),
        supabase.from("config").upsert({key:"tabela_data",value:JSON.stringify(novaTabela)}),
        supabase.from("config").upsert({key:"evolucao_data",value:JSON.stringify(novaEvol)}),
        supabase.from("config").upsert({key:"metas_data",value:JSON.stringify(novasMetas)}),
        supabase.from("config").upsert({key:"historico_diario",value:JSON.stringify(novoHistorico)}),
      ]);
      const falha=resultados.find(r=>r.error);if(falha)throw falha.error;
      setLeitos(novosLeitos);setTabelaData(novaTabela);setEvolPorLeito(novaEvol);setMetasPorLeito(novasMetas);setHistoricoDiario(novoHistorico);
      setLeitoSelId(destino.id);setEvolCampos(novaEvol[destino.id]||EVOLUCAO_VAZIA);setEvolVersion(v=>v+1);setPacienteEditorAberto(false);
      window.alert(`Paciente transferido para ${destino.nome}. Todos os dados clínicos foram preservados.`);return true;
    }catch(e){console.error("Falha ao transferir paciente",e);window.alert("Não foi possível transferir. Nenhum dado foi alterado.");return false;}
    finally{setSaving(false);}
  };

  const darAltaPaciente = () => {
    if(!leito?.paciente)return;
    setAltaEditor({dataAlta:new Date().toISOString().slice(0,10),destino:"",destinoOutro:"",rankinAlta:""});
  };
  const confirmarAltaPaciente = async () => {
    if(!leito?.paciente||!altaEditor)return;
    if(!altaEditor.dataAlta){window.alert("Informe a data da alta.");return;}
    if(!altaEditor.destino){window.alert("Selecione o destino da alta.");return;}
    if(altaEditor.destino==="Outro"&&!altaEditor.destinoOutro.trim()){window.alert("Digite o outro destino.");return;}
    if(altaEditor.rankinAlta===""){window.alert("Selecione a escala de Rankin modificada na alta.");return;}
    const destino=altaEditor.destino==="Outro"?altaEditor.destinoOutro.trim():altaEditor.destino;
    const dataAlta=altaEditor.dataAlta;
    const rankinAlta=altaEditor.rankinAlta;
    const registro={
      id:(globalThis.crypto?.randomUUID?.()||`alta-${Date.now()}`),dataAlta,destino,rankinAlta,arquivadoEm:new Date().toISOString(),
      patientId:leito.patientId||null,admissionId:leito.admissionId||null,
      utiId:leito.utiId||utiAtiva?.id,utiNome:utiAtiva?.nome||"UTI G1",
      leito:JSON.parse(JSON.stringify(leito)),
      tabelaClinica:JSON.parse(JSON.stringify(tabelaData[leitoSelId]||{})),
      evolucao:JSON.parse(JSON.stringify(evolCampos||evolPorLeito[leitoSelId]||{})),
      metas:JSON.parse(JSON.stringify(metasPorLeito[leitoSelId]||[])),
      historicoDiario:JSON.parse(JSON.stringify(historicoDiario[leito.admissionId]?.days||{})),
    };
    const novoArquivo=[...pacientesArquivados,registro];
    const novosLeitos=leitos.map(l=>l.id===leitoSelId?leitoVazio(l):l);
    const novaTabela={...tabelaData};delete novaTabela[leitoSelId];
    const novaEvol={...evolPorLeito};delete novaEvol[leitoSelId];
    const novasMetas={...metasPorLeito};delete novasMetas[leitoSelId];
    const novoHistorico={...historicoDiario};
    if(leito.admissionId){novoHistorico[leito.admissionId]={...(novoHistorico[leito.admissionId]||{}),admissionId:leito.admissionId,patientId:leito.patientId,status:"discharged",dischargedAt:new Date().toISOString(),dischargeDate:dataAlta,outcome:destino,rankinAdmission:leito.rankinAdmissao||null,rankinDischarge:rankinAlta,days:{...(novoHistorico[leito.admissionId]?.days||{})}};}
    setSaving(true);
    try {
      const resultados=await Promise.all([
        supabase.from("config").upsert({key:"pacientes_arquivados",value:JSON.stringify(novoArquivo)}),
        supabase.from("config").upsert({key:"leitos_data",value:JSON.stringify(novosLeitos)}),
        supabase.from("config").upsert({key:"tabela_data",value:JSON.stringify(novaTabela)}),
        supabase.from("config").upsert({key:"evolucao_data",value:JSON.stringify(novaEvol)}),
        supabase.from("config").upsert({key:"metas_data",value:JSON.stringify(novasMetas)}),
        supabase.from("config").upsert({key:"historico_diario",value:JSON.stringify(novoHistorico)}),
      ]);
      const falha=resultados.find(r=>r.error);
      if(falha) throw falha.error;
      setPacientesArquivados(novoArquivo);setLeitos(novosLeitos);setTabelaData(novaTabela);setEvolPorLeito(novaEvol);setMetasPorLeito(novasMetas);setHistoricoDiario(novoHistorico);setAltaEditor(null);
      setEvolCampos(EVOLUCAO_VAZIA);setEvolVersion(v=>v+1);setDadosIA(null);setAba("evolucao");
      window.alert("Alta concluída. O prontuário foi preservado no Arquivo de pacientes.");
    } catch(e) {
      console.error("Falha ao arquivar paciente",e);window.alert("Não foi possível arquivar. O leito não foi limpo; tente novamente.");
    } finally {setSaving(false);}
  };
  const logout = () => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false); setLeitos(LEITOS_INICIAIS); };

  // Sincroniza evolCampos quando troca de leito
  const evolPorLeitoRef = useRef({});
  useEffect(()=>{
    evolPorLeitoRef.current = evolPorLeito;
  },[evolPorLeito]);

  useEffect(()=>{
    const saved = evolPorLeitoRef.current[leitoSelId] || evolPorLeito[leitoSelId];
    setEvolCampos(saved || EVOLUCAO_VAZIA);
    setEvolVersion(v=>v+1);
  },[leitoSelId]);

  // Quando evolCampos muda, persiste no evolPorLeito
  const setEvolCamposComPersistencia = (updater) => {
    setEvolCampos(prev => {
      const hoje = new Date().toISOString().split("T")[0];
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const novasDatas = { ...(prev._datas||{}) };
      Object.keys(next).forEach(k => {
        if (k !== '_datas' && next[k] !== prev[k]) novasDatas[k] = hoje;
      });
      const comData = { ...next, _datas: novasDatas };
      setEvolPorLeito(ep => {
        const novo = { ...ep, [leitoSelId]: comData };
        salvarEvol(novo);
        return novo;
      });
      return comData;
    });
  };

  const ABAS = [
    {id:"evolucao",      label:"🏥 Beira-leito"},
    {id:"tabela",        label:"📊 Tabela Clínica"},
    {id:"upload",        label:"📤 Importar Print"},
    {id:"metas",         label:"🎯 Metas & Pendências"},
  ];

  const dias = diasInternacao(leito.dataInternacao);
  const idadeAnos = idadeDoLeito(leito);
  const pp   = pesoPredito(leito.altura, leito.sexo);
  const isMobile   = window.innerWidth <= 768;
  const railMode   = !isMobile && sidebarCollapsed;
  const alertCount = leitosDaUti.filter(l=>l.paciente).reduce((acc,l)=>acc+contarAlertasLeito(l, tabelaData, config), 0);
  const metasPendentes = leitosDaUti.flatMap(l=>metasPorLeito[l.id]||[]).filter(m=>!m.feito&&m.status!=="cumprido").length;
  const diasHistorico = leito?.admissionId?Object.keys(historicoDiario[leito.admissionId]?.days||{}).sort():[];
  const numeroLeito=l=>{const n=String(l.nome||"").match(/\d+/);return n?parseInt(n[0],10):Number.MAX_SAFE_INTEGER;};
  const leitosOrdenados=[...leitosDaUti].sort((a,b)=>Number(!!b.prioritario)-Number(!!a.prioritario)||numeroLeito(a)-numeroLeito(b)||String(a.nome||"").localeCompare(String(b.nome||""),"pt-BR"));
  const aplicarFolhaColeta=resultado=>{
    const hoje=new Date().toISOString().split("T")[0],data=/^\d{4}-\d{2}-\d{2}$/.test(resultado?.data||"")?resultado.data:hoje;
    const normal=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/gi,"").toLowerCase();
    const encontrar=r=>{const nr=String(r.leito||"").match(/\d+/)?.[0];let l=nr?leitosDaUti.find(x=>String(x.nome||"").match(/\d+/)?.[0]?.replace(/^0+/,"")===nr.replace(/^0+/,"")):null;if(!l&&r.paciente){const n=normal(r.paciente);l=leitosDaUti.find(x=>{const p=normal(x.paciente);return n&&p&&(n===p||(Math.min(n.length,p.length)>4&&(n.includes(p)||p.includes(n))));});}return l;};
    const reconhecidos=(resultado?.leitos||[]).map(r=>({r,l:encontrar(r)})),validos=reconhecidos.filter(x=>x.l);
    if(!validos.length){window.alert("Nenhum dos leitos reconhecidos corresponde aos pacientes desta UTI.");return;}
    setTabelaData(prev=>{const novo={...prev};validos.forEach(({r,l})=>{const valores={};Object.entries({...r.labs,...r.controles}).forEach(([k,v])=>{if(v!==""&&v!=null)valores[k]=String(v);});novo[l.id]={...(novo[l.id]||{}),[data]:{...(novo[l.id]?.[data]||{}),...valores}};});salvarTabela(novo);return novo;});
    setLeitos(prev=>{let mudou=false;const novo=prev.map(l=>{const item=validos.find(x=>String(x.l.id)===String(l.id));if(!item)return l;const bombas=Object.fromEntries(Object.entries(item.r.bombas||{}).filter(([,v])=>v!==""&&v!=null).map(([k,v])=>[k,String(v).replace(/\s*mL\/?h\s*$/i,"").trim()]));if(!Object.keys(bombas).length)return l;mudou=true;return {...l,drogasVazao:{...(l.drogasVazao||{}),...bombas}};});if(mudou)salvarLeitos(novo);return novo;});
    setEvolPorLeito(prev=>{const novo={...prev};validos.forEach(({r,l})=>{const atual={...EVOLUCAO_VAZIA,...(novo[l.id]||{})},ev=r.evolucao||{};Object.entries(ev).forEach(([k,v])=>{if(v)atual[k]=atual[k]?`${atual[k]}\n${v}`:v;});if(r.observacoes)atual.impressao=atual.impressao?`${atual.impressao}\n${r.observacoes}`:r.observacoes;atual._datas={...(atual._datas||{})};[...Object.keys(ev),...(r.observacoes?["impressao"]:[])].forEach(k=>{if(ev[k]||k==="impressao")atual._datas[k]=data;});novo[l.id]=atual;});salvarEvol(novo);return novo;});
    const atualSel=validos.find(x=>x.l.id===leitoSelId);if(atualSel)setEvolCampos(c=>{const n={...c};Object.entries(atualSel.r.evolucao||{}).forEach(([k,v])=>{if(v)n[k]=n[k]?`${n[k]}\n${v}`:v;});if(atualSel.r.observacoes)n.impressao=n.impressao?`${n.impressao}\n${atualSel.r.observacoes}`:atualSel.r.observacoes;return n;});
    window.alert(`${validos.length} leito(s) atualizado(s).${validos.length<reconhecidos.length?` ${reconhecidos.length-validos.length} não foi/foram associado(s).`:""}`);
  };

  if (!appReady) return (
    <div style={{minHeight:"100vh",background:"#080f0a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{color:"#38bdf8",fontSize:14}}>Carregando…</div>
    </div>
  );

  if (!authed) return <LoginScreen onLogin={onLogin}/>;

  return (
    <ThemeCtx.Provider value={T}>
    <div className={theme==="light"?"theme-light":"theme-dark"} style={{minHeight:"100vh",background:T.bgPage,fontFamily:"'Sora','DM Sans',sans-serif",color:T.text1,display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box} textarea,input{outline:none;color-scheme:${T.colorScheme}}
        ::placeholder{color:${T.text4}!important;opacity:0.7}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:${T.accent}44;border-radius:4px}
        input[type=date]::-webkit-calendar-picker-indicator{filter:${theme==="light"?"none":"invert(0.5)"}} button:hover{opacity:0.88}
        .uti-tab-btn{transition:color 0.15s,border-color 0.15s}
        .system-card{transition:border-color .18s,box-shadow .18s}
        .system-card:focus-within{border-color:rgba(56,189,248,.34)!important;box-shadow:0 0 0 1px rgba(56,189,248,.08)}
        .theme-light .app-header{border-bottom-color:#94a3b8!important;box-shadow:0 2px 10px rgba(15,23,42,.14)}
        .theme-light .app-sidebar{background:#edf2f7!important;border-right-color:#94a3b8!important}
        .theme-light .patient-tabs{background:#dde6f0!important;padding:7px 8px 0 18px!important;gap:4px;border-bottom-color:#94a3b8!important}
        .theme-light .patient-tabs.patient-navigation-with-problems{padding-right:296px!important}
        .theme-light .uti-tab-btn{padding:9px 14px!important;border:1px solid transparent!important;border-bottom:0!important;border-radius:9px 9px 0 0!important;color:#475569!important}
        .theme-light .uti-tab-btn:hover{background:rgba(248,250,252,.75)!important;color:#0f172a!important}
        .theme-light .uti-tab-btn[data-active="true"]{background:#f8fafc!important;color:#075985!important;border-color:#94a3b8!important;box-shadow:0 -2px 7px rgba(15,23,42,.10)}
        .theme-light .system-card{border-color:#8493a5!important;border-radius:14px!important;box-shadow:0 4px 12px rgba(15,23,42,.13)!important;background:#f8fafc!important}
        .theme-light .system-card>div:first-child{background:#e7edf4!important;min-height:44px;border-bottom:1px solid #91a1b3}
        .theme-light .system-card-body{background:#fff;padding:16px!important}
        .theme-light .clinical-group{background:#f1f5f9;border:1px solid #9eacbd;border-radius:10px;padding:10px 12px;margin-bottom:12px!important}
        .theme-light .clinical-group:last-child{margin-bottom:0!important}
        .theme-light input:not([type=checkbox]):not([type=radio]):not([type=range]),.theme-light textarea,.theme-light select{background:#fff!important;border-color:#94a3b8!important;color:#0f172a!important}
        .theme-light input:not([type=checkbox]):not([type=radio]):not([type=range]):focus,.theme-light textarea:focus,.theme-light select:focus{border-color:#0284c7!important;box-shadow:0 0 0 2px rgba(2,132,199,.10)}
        .theme-light .mini-bomba-row>span:first-child{color:#334155!important}
        .theme-light .mini-bomba-row>span:nth-of-type(2){color:#0369a1!important}
        .theme-light option{background:#fff;color:#0f172a}
        .theme-light [style*="color: rgb(226, 232, 240)"],.theme-light [style*="color:#e2e8f0"],.theme-light [style*="color: #e2e8f0"]{color:#0f172a!important}
        .theme-light [style*="color: rgb(203, 213, 225)"],.theme-light [style*="color:#cbd5e1"],.theme-light [style*="color: #cbd5e1"]{color:#1e293b!important}
        .theme-light [style*="color: rgb(148, 163, 184)"],.theme-light [style*="color:#94a3b8"],.theme-light [style*="color: #94a3b8"]{color:#475569!important}
        .theme-light [style*="color: rgb(100, 116, 139)"],.theme-light [style*="color:#64748b"],.theme-light [style*="color: #64748b"]{color:#475569!important}
        .theme-light [style*="color: rgb(56, 189, 248)"],.theme-light [style*="color:#38bdf8"],.theme-light [style*="color: #38bdf8"]{color:#0369a1!important}
        .theme-light [style*="color: rgb(167, 139, 250)"],.theme-light [style*="color:#a78bfa"],.theme-light [style*="color: #a78bfa"]{color:#6d28d9!important}
        .theme-light [style*="color: rgb(251, 146, 60)"],.theme-light [style*="color:#fb923c"],.theme-light [style*="color: #fb923c"]{color:#c2410c!important}
        .theme-light [style*="color: rgb(52, 211, 153)"],.theme-light [style*="color:#34d399"],.theme-light [style*="color: #34d399"]{color:#047857!important}
        .theme-light [style*="color: rgb(248, 113, 113)"],.theme-light [style*="color:#f87171"],.theme-light [style*="color: #f87171"]{color:#b91c1c!important}
        .theme-light [style*="color: rgb(252, 211, 77)"],.theme-light [style*="color:#fcd34d"],.theme-light [style*="color: #fcd34d"]{color:#92400e!important}
        .theme-light [style*="color: rgb(196, 181, 253)"],.theme-light [style*="color:#c4b5fd"],.theme-light [style*="color: #c4b5fd"]{color:#6d28d9!important}
        .theme-light .config-panel{background:#fff;border:1px solid #94a3b8;border-radius:14px;padding:18px;box-shadow:0 4px 14px rgba(15,23,42,.10)}
        .theme-light .config-panel>div[style*="overflow: hidden"]{background:#f8fafc!important;border-color:#94a3b8!important}
        .theme-light .config-panel>div[style*="overflow: hidden"]>div{border-color:#cbd5e1!important}
        .theme-light button{font-weight:600}
        .mini-bomba-row{display:grid;grid-template-columns:minmax(120px,220px) 72px minmax(145px,220px) 18px;gap:6px;align-items:center;justify-content:start;max-width:560px}
        @media(min-width:701px){.patient-content-with-problems{padding-right:312px!important}.patient-navigation-with-problems{padding-right:296px!important}}
        @media(max-width:700px){.prob-floating{position:static!important;width:100%!important;margin-bottom:12px;filter:none!important}}
        @media(max-width:700px){
          .prob-sticky-col{position:static!important;width:100%!important;order:-1}
          .mini-bomba-row{grid-template-columns:minmax(100px,1fr) 68px 18px;max-width:none}
          .mini-bomba-row>span:nth-of-type(2){grid-column:1/3;grid-row:2}
          .mini-bomba-row>button{grid-column:3;grid-row:1}
        }
      `}</style>

      <div className="app-header" style={{padding:"0 24px",height:56,display:"flex",alignItems:"center",borderBottom:`1px solid ${T.borderAccent}`,background:T.bgHeader,position:"sticky",top:0,zIndex:100,backdropFilter:"blur(12px)"}}>
        <button onClick={()=>{
          if (isMobile) { setShowSidebar(s=>!s); }
          else { setSidebarCollapsed(c=>{ const next=!c; localStorage.setItem("uti_sidebar_collapsed", next?"1":"0"); return next; }); }
        }} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,color:T.text3,cursor:"pointer",fontSize:16,padding:"4px 8px",marginRight:14}} title={railMode?"Expandir sidebar":"Recolher sidebar"}>{railMode?"»":"☰"}</button>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>mudarPerfil(perfil==="plantonista"?"coordenacao":"plantonista")} title={perfil==="plantonista"?"Abrir perfil Coordenação":"Voltar ao perfil Plantonista"} style={{border:0,background:"transparent",padding:0,cursor:"pointer",display:"flex",alignItems:"center"}}><BrainLogo size={32}/></button>
          <div>
            <div style={{fontSize:14,fontWeight:700,letterSpacing:0.5,color:T.text1}}>UTI Evolve</div>
            <div style={{fontSize:9,color:T.accent,fontFamily:mono,letterSpacing:2}}>{perfil==="coordenacao"?"PERFIL COORDENAÇÃO":"PERFIL PLANTONISTA"}</div>
          </div>
        </div>
        <button onClick={e=>{if(isMobile){const r=e.currentTarget.getBoundingClientRect();setUtiMenu({x:Math.max(8,r.left),y:r.bottom+6});return;}sessionStorage.removeItem("uti_ativa_id");setUtiAtivaId("");}} onContextMenu={e=>{e.preventDefault();setUtiMenu({x:e.clientX,y:e.clientY});}} title={isMobile?"Abrir menu da UTI":"Clique para trocar de UTI · botão direito para ações"} style={{marginLeft:16,padding:"5px 10px",borderRadius:7,border:`1px solid ${T.accentBorder}`,background:T.accentBg,color:T.accent,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>🏥 {hospitalAtivo?.sigla||hospitalAtivo?.nome} · {utiAtiva?.nome||"Selecionar UTI"} {isMobile?"⋮":"▾"}</button>
        {utiMenu&&<div onMouseDown={()=>setUtiMenu(null)} onContextMenu={e=>{e.preventDefault();setUtiMenu(null);}} style={{position:"fixed",inset:0,zIndex:19990}}><div onMouseDown={e=>e.stopPropagation()} style={{position:"fixed",left:Math.min(utiMenu.x,window.innerWidth-230),top:Math.min(utiMenu.y,window.innerHeight-130),width:220,padding:5,borderRadius:9,border:`1px solid ${T.borderStrong}`,background:T.bgPicker,boxShadow:"0 14px 38px rgba(0,0,0,.35)",zIndex:19991}}>
          <button onClick={()=>{setUtiMenu(null);sessionStorage.removeItem("uti_ativa_id");setUtiAtivaId("");}} style={{width:"100%",padding:"9px 10px",border:0,borderRadius:6,background:"transparent",color:T.text2,textAlign:"left",cursor:"pointer",fontSize:11,fontWeight:700}}>🏥 Trocar hospital ou UTI</button>
          {(Array.isArray(config.sbariLinks?.[utiAtiva?.id])?config.sbariLinks[utiAtiva.id].some(x=>x?.url):!!config.sbariLinks?.[utiAtiva?.id])&&<button onClick={()=>{setUtiMenu(null);sincronizarSbari();}} disabled={sbariSyncing} style={{width:"100%",padding:"9px 10px",border:0,borderRadius:6,background:"transparent",color:T.text2,textAlign:"left",cursor:sbariSyncing?"wait":"pointer",fontSize:11,fontWeight:700}}>{sbariSyncing?"⏳ Atualizando SBARI…":"↻ Atualizar leitos pelo SBARI"}</button>}
          <button onClick={()=>{setUtiMenu(null);if(perfil!=="plantonista")mudarPerfil("plantonista");setViewGlobal("coleta");}} style={{width:"100%",padding:"9px 10px",border:0,borderRadius:6,background:viewGlobal==="coleta"?"rgba(168,85,247,.12)":"transparent",color:viewGlobal==="coleta"?"#a855f7":T.text2,textAlign:"left",cursor:"pointer",fontSize:11,fontWeight:700}}>📝 Folha de coleta dos leitos</button>
        </div></div>}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontSize:11,fontFamily:mono,color:saving?"#f59e0b":T.accent,display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:saving?"#f59e0b":T.accent}}/>
            {saving?"Salvando…":"Salvo"}
          </div>
          <div style={{fontSize:12,color:T.text3,fontFamily:mono}}>
            {new Date().toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"}).toUpperCase()}
          </div>
          <button onClick={toggleTheme} title={theme==="dark"?"Modo claro":"Modo escuro"} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,color:T.text3,cursor:"pointer",fontSize:15,padding:"4px 8px",lineHeight:1}}>
            {theme==="dark"?"☀️":"🌙"}
          </button>
          <button onClick={logout} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,color:T.text3,cursor:"pointer",fontSize:11,padding:"4px 10px",fontFamily:mono}}>Sair</button>
          <button onClick={()=>{setViewGlobal("leitos");setAba("config");}} title="Configurações" style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,color:T.text3,cursor:"pointer",fontSize:14,padding:"4px 8px"}}>⚙️</button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden",height:"calc(100vh - 56px)"}}>
        {perfil==="plantonista"&&(!isMobile || showSidebar) && <div className="app-sidebar" style={{width:railMode?64:228,borderRight:`1px solid ${T.borderAccent}`,padding:railMode?"20px 8px":"20px 14px",overflowY:"auto",background:T.bgSidebar,flexShrink:0,transition:"width 0.18s ease"}}>
          {railMode ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              {leitosOrdenados.map(l=>{
                const rotulo = (l.nome.match(/\d+/)||[])[0] || l.nome.slice(0,2).toUpperCase();
                const precaucao = precaucaoMicrobiologica(l.culturas||[]);
                const ativo = l.id===leitoSelId&&viewGlobal==="leitos";
                return (
                  <button key={l.id}
                    onClick={()=>{if(l.id!==leitoSelId){setDadosIA(null);setEvolCampos(EVOLUCAO_VAZIA);setEvolVersion(0);}setLeitoSelId(l.id);setAba("evolucao");setViewGlobal("leitos");}}
                    title={`${l.nome}${l.paciente?" — "+l.paciente:""}${precaucao?" · "+precaucao.label:""}`}
                    style={{width:40,height:40,borderRadius:10,background:precaucao?precaucao.fundo:(ativo?T.accentBg:T.bgCard),border:`2px solid ${precaucao?precaucao.cor:(ativo?T.accent:T.border)}`,boxShadow:ativo?`0 0 0 2px ${T.accent}55`:"none",color:precaucao?precaucao.cor:(ativo?T.accent:T.text3),fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:mono,flexShrink:0}}>
                    {rotulo}
                  </button>
                );
              })}
              <div style={{width:"100%",borderTop:`1px solid ${T.border}`,margin:"6px 0"}}/>
              <button onClick={()=>setViewGlobal(v=>v==="visao_geral"?"leitos":"visao_geral")} title="Visão Geral"
                style={{position:"relative",width:40,height:40,borderRadius:10,background:viewGlobal==="visao_geral"?"rgba(56,189,248,0.12)":"transparent",border:`1px solid ${viewGlobal==="visao_geral"?"rgba(56,189,248,0.35)":T.border}`,color:viewGlobal==="visao_geral"?"#38bdf8":T.text3,cursor:"pointer",fontSize:16,flexShrink:0}}>
                🏥
                {alertCount>0 && <span style={{position:"absolute",top:-4,right:-4,minWidth:16,height:16,borderRadius:8,background:"#f87171",color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",lineHeight:1}}>{alertCount}</span>}
              </button>
              <button onClick={()=>setViewGlobal(v=>v==="plantao"?"leitos":"plantao")} title="Metas & Pendências"
                style={{position:"relative",width:40,height:40,borderRadius:10,background:viewGlobal==="plantao"?"rgba(167,139,250,0.12)":"transparent",border:`1px solid ${viewGlobal==="plantao"?"rgba(167,139,250,0.35)":T.border}`,color:viewGlobal==="plantao"?"#c084fc":T.text3,cursor:"pointer",fontSize:16,flexShrink:0}}>
                ✅
                {metasPendentes>0 && <span style={{position:"absolute",top:-4,right:-4,minWidth:16,height:16,borderRadius:8,background:"#f59e0b",color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",lineHeight:1}}>{metasPendentes}</span>}
              </button>
              <button onClick={()=>setViewGlobal(v=>v==="arquivo"?"leitos":"arquivo")} title="Pacientes arquivados"
                style={{position:"relative",width:40,height:40,borderRadius:10,background:viewGlobal==="arquivo"?"rgba(251,191,36,0.12)":"transparent",border:`1px solid ${viewGlobal==="arquivo"?"rgba(251,191,36,0.35)":T.border}`,color:viewGlobal==="arquivo"?"#fbbf24":T.text3,cursor:"pointer",fontSize:16,flexShrink:0}}>
                🗄️
                {pacientesArquivados.length>0&&<span style={{position:"absolute",top:-4,right:-4,minWidth:16,height:16,borderRadius:8,background:"#475569",color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{pacientesArquivados.length}</span>}
              </button>
              <button onClick={()=>setViewGlobal(v=>v==="ferramentas"?"leitos":"ferramentas")} title="Links & Protocolos"
                style={{width:40,height:40,borderRadius:10,background:viewGlobal==="ferramentas"?T.accentBg:"transparent",border:`1px solid ${viewGlobal==="ferramentas"?T.accentBorder:T.border}`,color:viewGlobal==="ferramentas"?T.accent:T.text3,cursor:"pointer",fontSize:16,flexShrink:0}}>
                📚
              </button>
            </div>
          ) : (<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingLeft:4}}>
            <div style={{fontSize:9,color:T.text3,fontFamily:mono,letterSpacing:2.5}}>LEITOS</div>
            <button
              onClick={()=>{
                const novoId = Date.now();
                const novoNum = leitosDaUti.length + 1;
                setLeitos(ls=>{
                  const novo = [...ls,{id:novoId,utiId:utiAtiva.id,nome:`Leito ${String(novoNum).padStart(2,"0")}`,paciente:"",diagnostico:"",dataInternacao:"",rankinAdmissao:"",peso:"",altura:"",sexo:"M",acompanhantes:[],procedimentos:[],dispositivos:{}}];
                  salvarLeitos(novo);
                  return novo;
                });
                setLeitoSelId(novoId);
                setAba("evolucao");setPacienteEditorAberto(true);
              }}
              title="Adicionar leito"
              style={{background:T.accentBg,border:`1px solid ${T.accentBorder}`,borderRadius:6,color:T.accent,cursor:"pointer",fontSize:14,padding:"2px 8px",fontWeight:700,lineHeight:1.4}}>+</button>
          </div>
          {/* ── Visões globais — acima dos leitos ── */}
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <button onClick={()=>setViewGlobal(v=>v==="visao_geral"?"leitos":"visao_geral")}
              style={{flex:1,padding:"7px 4px",background:viewGlobal==="visao_geral"?"rgba(56,189,248,0.12)":"rgba(255,255,255,0.03)",
                border:`1px solid ${viewGlobal==="visao_geral"?"rgba(56,189,248,0.35)":"rgba(255,255,255,0.08)"}`,
                borderRadius:7,color:viewGlobal==="visao_geral"?"#38bdf8":"#64748b",cursor:"pointer",fontSize:10,fontWeight:600}}>
              🏥 Geral
            </button>
            <button onClick={()=>setViewGlobal(v=>v==="plantao"?"leitos":"plantao")}
              style={{flex:1,padding:"7px 4px",background:viewGlobal==="plantao"?"rgba(167,139,250,0.12)":"rgba(255,255,255,0.03)",
                border:`1px solid ${viewGlobal==="plantao"?"rgba(167,139,250,0.35)":"rgba(255,255,255,0.08)"}`,
                borderRadius:7,color:viewGlobal==="plantao"?"#c084fc":"#64748b",cursor:"pointer",fontSize:10,fontWeight:600}}>
              ✅ Metas
            </button>
            <button onClick={()=>setViewGlobal(v=>v==="arquivo"?"leitos":"arquivo")}
              style={{flex:1,padding:"7px 4px",background:viewGlobal==="arquivo"?"rgba(251,191,36,0.12)":"rgba(255,255,255,0.03)",border:`1px solid ${viewGlobal==="arquivo"?"rgba(251,191,36,0.35)":"rgba(255,255,255,0.08)"}`,borderRadius:7,color:viewGlobal==="arquivo"?"#fbbf24":"#64748b",cursor:"pointer",fontSize:10,fontWeight:600}}>
              🗄️ Arquivo
            </button>
          </div>
          {leitosOrdenados.map(l=>(
            <div key={l.id} style={{display:"flex",alignItems:"stretch",gap:4,marginBottom:0}}>
              <div style={{flex:1}}>
                <LeitoCard leito={l} selecionado={l.id===leitoSelId} config={config}
                  onClick={()=>{if(l.id!==leitoSelId){setDadosIA(null);setEvolCampos(EVOLUCAO_VAZIA);setEvolVersion(0);}setLeitoSelId(l.id);setAba("evolucao");setViewGlobal("leitos");if(window.innerWidth<=768)setShowSidebar(false);}}
                  onRename={nome=>{setLeitos(ls=>{const novo=ls.map(x=>x.id===l.id?{...x,nome}:x);salvarLeitos(novo);return novo;})}}
                  onTogglePrioridade={()=>setLeitos(ls=>{const novo=ls.map(x=>x.id===l.id?{...x,prioritario:!x.prioritario}:x);salvarLeitos(novo);return novo;})}
                  onRemove={leitosDaUti.length>1?()=>{
                    if(l.paciente){window.alert("Este leito possui um paciente. Use “Dar alta” para preservar os dados antes de remover o leito.");return;}
                    setLeitos(ls=>{const novo=ls.filter(x=>x.id!==l.id);salvarLeitos(novo);const proximo=novo.find(x=>(x.utiId||utis[0]?.id)===utiAtiva.id);if(proximo)setLeitoSelId(proximo.id);return novo;});
                    setViewGlobal("leitos");
                  }:null}
                />
              </div>
            </div>
          ))}
          <div style={{marginTop:16,borderTop:`1px solid ${T.border}`,paddingTop:12}}>
          <button onClick={()=>setViewGlobal(v=>v==="ferramentas"?"leitos":"ferramentas")} style={{width:"100%",padding:"9px 12px",background:viewGlobal==="ferramentas"?T.accentBg:"none",border:`1px solid ${viewGlobal==="ferramentas"?T.accentBorder:T.border}`,borderRadius:8,color:viewGlobal==="ferramentas"?T.accent:T.text3,cursor:"pointer",fontSize:12,fontWeight:600,textAlign:"left",fontFamily:"inherit"}}>
              📚 Links & Protocolos
            </button>
          </div>
          </>)}
        </div>}

        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {perfil==="coordenacao" ? (
            <CoordenacaoPanel uti={utiAtiva} hospital={hospitalAtivo} leitos={leitosDaUti} altaSheetUrl={config.altaSheetUrls?.[hospitalAtivo?.id]} onVoltar={()=>mudarPerfil("plantonista")} onAbrirLeito={id=>{setLeitoSelId(id);setAba("evolucao");setViewGlobal("leitos");mudarPerfil("plantonista");}}/>
          ) : viewGlobal==="coleta" ? (
            <ColetaPlantaoPanel uti={utiAtiva} leitos={leitosDaUti} evolPorLeito={evolPorLeito} onAplicar={aplicarFolhaColeta}/>
          ) : viewGlobal==="ferramentas" ? (
            <div style={{flex:1,overflowY:"auto"}}><FerramentasPanel/></div>
          ) : viewGlobal==="pesquisa" ? (
            <div style={{flex:1,overflowY:"auto",background:T.bgPage}}><AnalysisErrorBoundary><PesquisaPanel historico={historicoDiario} arquivos={pacientesArquivados} leitos={leitos} utis={utis}/></AnalysisErrorBoundary></div>
          ) : viewGlobal==="arquivo" ? (
            <div style={{flex:1,overflowY:"auto",background:T.bgPage}}><ArquivoPacientesPanel arquivos={pacientesArquivados}/></div>
          ) : viewGlobal==="visao_geral" ? (
            <div style={{flex:1,overflowY:"auto"}}>
              <VisaoGeralPanel leitos={leitosDaUti} tabelaData={tabelaData} metasPorLeito={metasPorLeito} config={config} evolCamposPorLeito={evolPorLeito}
                onLeitoChange={novoLeito=>{setLeitos(ls=>{const novo=ls.map(l=>l.id===novoLeito.id?novoLeito:l);salvarLeitos(novo);return novo;});}}
                onMetaChange={(leitoId, novasMetas)=>{setMetasPorLeito(mp=>{const novo={...mp,[leitoId]:novasMetas};salvarMetas(novo);return novo;});}}/>
            </div>
          ) : viewGlobal==="plantao" ? (
            <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
              <PlantaoPanel
                leitos={leitosDaUti} tabelaData={tabelaData} metasPorLeito={metasPorLeito} config={config}
                onClearAll={()=>setMetasPorLeito(mp=>{const novo={...mp};leitosDaUti.forEach(l=>{novo[l.id]=[];});salvarMetas(novo);return novo;})}
                onMetaChange={(leitoId, novasMetas)=>{
                  setMetasPorLeito(mp=>{const novo={...mp,[leitoId]:novasMetas};salvarMetas(novo);return novo;});
                }}/>
            </div>
          ) : (<>
          {(
            <div style={{padding:"13px 28px",borderBottom:`1px solid ${T.border}`,background:T.bgCard}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <div style={{fontSize:16,fontWeight:700,color:leito.paciente?T.text1:T.text3}}>{leito.paciente||"Leito sem paciente cadastrado"}</div>
                {leito.paciente&&<button onClick={()=>setPacienteEditorAberto(true)} title={idadeAnos===null?"Clique para informar a idade":"Clique para editar a idade"} style={{padding:"3px 9px",borderRadius:10,border:`1px solid ${idadeAnos===null?T.border:"rgba(192,132,252,.38)"}`,background:idadeAnos===null?"transparent":"rgba(192,132,252,.11)",color:idadeAnos===null?T.text3:"#c084fc",fontSize:11,fontFamily:mono,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{idadeAnos===null?"Idade não informada":`${idadeAnos} anos`}</button>}
                {(()=>{const tb=tabelaData[leitoSelId]||{};const datas=Object.keys(tb).sort();let acum=0,algum=false;datas.forEach(d=>{const bh=parseFloat(tb[d]?.c24_bh_ac||tb[d]?.c24_bh);if(!isNaN(bh)){acum+=bh;algum=true;}});const prev=parseFloat(leito.bhPrevio||0)||0;const tot=acum+prev;if(!algum&&!prev)return null;const cor=tot>0?"#f87171":tot<0?"#34d399":"#94a3b8";const sig=tot>=0?"+":"";return(<span style={{fontSize:11,fontFamily:mono,color:cor,fontWeight:700,padding:"2px 8px",borderRadius:10,background:`${cor}15`,border:`1px solid ${cor}30`}}>BH {sig}{Math.round(tot).toLocaleString("pt-BR")} mL</span>);})()}
                <button onClick={()=>setHistoricoAberto(true)} title="Abrir histórico e comparar dias" style={{fontSize:10,fontFamily:mono,color:T.accent,padding:"2px 8px",borderRadius:10,background:T.accentBg,border:`1px solid ${T.accentBorder}`,cursor:"pointer"}}>◷ {diasHistorico.length||1} dia{(diasHistorico.length||1)!==1?'s':''} registrado{(diasHistorico.length||1)!==1?'s':''}</button>
                <button onClick={()=>setPacienteEditorAberto(true)} title="Editar cadastro, histórico e procedimentos" style={{marginLeft:"auto",padding:"5px 10px",borderRadius:7,border:`1px solid ${T.accentBorder}`,background:T.accentBg,color:T.accent,fontSize:11,fontWeight:700,cursor:"pointer"}}>✎ {leito.paciente?"Editar paciente":"Cadastrar paciente"}</button>
                {leito.paciente&&<button onClick={darAltaPaciente} title="Arquivar todos os dados e liberar o leito" style={{padding:"5px 10px",borderRadius:7,border:"1px solid rgba(251,191,36,.35)",background:"rgba(251,191,36,.08)",color:"#fbbf24",fontSize:11,fontWeight:700,cursor:"pointer"}}>Dar alta</button>}
              </div>
              <div style={{fontSize:12,color:T.text3,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginTop:2}}>
                <span>{leito.diagnostico}{dias!==null&&` · D${dias}`}{leito.peso&&` · ${leito.peso} kg`}{pp&&` · PP ${pp} kg`}</span>
                {(leito.procedimentos||[]).map(p=>{
                  const po=Math.floor((new Date()-new Date(p.data+"T00:00:00"))/86400000);
                  const cor=po===0?"#f87171":po<=3?"#fb923c":po<=7?"#fbbf24":"#34d399";
                  return <span key={p.id} style={{fontSize:10,fontFamily:mono,color:cor,background:`rgba(${po===0?"248,113,113":po<=3?"251,146,60":po<=7?"245,158,11":"52,211,153"},0.12)`,border:`1px solid ${cor}55`,borderRadius:4,padding:"1px 7px"}}>{p.nome.split(" ")[0]} {po===0?"POI":`PO${po}`}</span>;
                })}
                {[
                  ...DISP_MULTIPLO.flatMap(def=>(Array.isArray((leito.dispositivos||{})[def.key])?(leito.dispositivos||{})[def.key]:[]).map((inst,i)=>({label:`${def.label.split(" ")[0]}${((leito.dispositivos||{})[def.key].length>1)?` ${i+1}`:""}`,alertaDias:def.alertaDias,data:inst.data}))),
                  ...DISP_SINGULAR.filter(def=>(leito.dispositivos||{})[def.key]?.ativo).map(def=>({label:def.label.split(" ")[0],alertaDias:def.alertaDias,data:(leito.dispositivos||{})[def.key].data})),
                  ...(Array.isArray((leito.dispositivos||{}).custom)?(leito.dispositivos||{}).custom:[]).map(d=>({label:d.nome||"Outro",alertaDias:d.alertaDias||21,data:d.data})),
                ].map((a,i)=>{
                  const po=Math.floor((new Date()-new Date(a.data+"T00:00:00"))/86400000);
                  const cor=po>a.alertaDias?"#f87171":"#38bdf8";
                  return <span key={i} style={{fontSize:10,fontFamily:mono,color:cor,background:`${cor}18`,border:`1px solid ${cor}44`,borderRadius:4,padding:"1px 7px"}}>{a.label} D{po}{po>a.alertaDias?" ⚠️":""}</span>;
                })}
              </div>
            </div>
          )}

          <div className={`patient-tabs ${leito.paciente?"patient-navigation-with-problems":""}`} style={{display:"flex",borderBottom:`1px solid ${T.border}`,paddingLeft:16,overflowX:"auto",flexShrink:0,background:T.bgCard}}>
            {ABAS.map(a=>(
              <button key={a.id} data-active={aba===a.id?"true":"false"} onClick={()=>setAba(a.id)} className="uti-tab-btn" style={{padding:"14px 16px",background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:aba===a.id?700:500,color:aba===a.id?T.accent:T.text3,borderBottom:aba===a.id?`2px solid ${T.accent}`:"2px solid transparent",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                {a.label}
              </button>
            ))}
          </div>


          <div className={leito.paciente&&ABAS.some(a=>a.id===aba)?"patient-content-with-problems":""} style={{flex:1,overflowY:"auto",padding:"28px 32px",background:T.bgPage}}>
            {aba==="config" ? (
              <ConfigPanel config={config} onChange={c=>{setConfig(c);salvarConfig(c);}} onVoltar={()=>setAba("evolucao")} onAbrirPesquisa={()=>setViewGlobal("pesquisa")} utiAtiva={utiAtiva} onSyncSbari={sincronizarSbari} sbariSyncing={sbariSyncing}/>
            ) : aba==="dadosclinicos_legacy" ? (
              <div style={{display:"flex",gap:24,flexWrap:"wrap",alignItems:"flex-start"}}>
                {/* Coluna esquerda: Ventilatório + Nutricional */}
                <div style={{flex:2,minWidth:320}}>
                  <VentilacaoPanel leito={leito} onChange={atualizar}/>
                  <DietaPanel dados={leito} config={config} onChange={atualizar}
                    diureseHojeVol={(()=>{const tb=tabelaData[leitoSelId]||{};const ds=Object.keys(tb).sort().reverse();for(const d of ds)if(tb[d]?.c24_diet_vol)return tb[d].c24_diet_vol;return "";})()}/>
                </div>
                {/* Coluna direita: Drogas → ATB → Dispositivos */}
                <div style={{flex:3,minWidth:320}}>
                  {leito.peso && <>
                    <SecTitle>CALCULADORA DE DROGAS — VAZÃO → DOSE</SecTitle>
                    <DrogasCalculadora peso={leito.peso} pesoPreditoValor={pesoPredito(leito.altura,leito.sexo)} onLancarDroga={(linha,campo)=>{
                      setEvolCamposComPersistencia(c=>({...c,[campo]:c[campo]?`${c[campo]}
${linha}`:linha}));
                      setEvolVersion(v=>v+1);
                    }} config={config}
                      vazoes={leito.drogasVazao||{}}
                      onVazaoChange={(key,val)=>atualizar({...leito,drogasVazao:{...(leito.drogasVazao||{}),[key]:val}})}
                    />
                  </>}
                  <Collapsible title="ANTIBIOTICOTERAPIA" defaultOpen={true}
                    badge={(leito.antibioticos||[]).filter(a=>!a.dataFim).length > 0 ? `${(leito.antibioticos||[]).filter(a=>!a.dataFim).length} ativo(s)` : null}>
                  <AntibioticosPanel
                    antibioticos={leito.antibioticos||[]}
                    onChange={atbs=>atualizar({...leito,antibioticos:atbs})}
                    crSerico={(()=>{const tb=tabelaData[leitoSelId]||{};const ds=Object.keys(tb).sort().reverse();for(const d of ds)if(tb[d]?.cr)return tb[d].cr;return "";})()}
                    peso={leito.peso||""}
                    idadeAnos={idadeAnos}
                    sexo={leito.sexo||"M"}
                    vancocinemia={ultimoValorTabela(tabelaData[leitoSelId]||{},["_extra_vancocinemia","_extra_vancomicinemia"])}
                    clcrOverride={(()=>{
                      const hoje2=new Date().toISOString().split("T")[0];
                      const sel=(leito.tfgSel||{})[hoje2];
                      const tb=tabelaData[leitoSelId]||{};
                      const ds=Object.keys(tb).sort().reverse();
                      const cr=ds.length?tb[ds[0]]?.cr:null;
                      const p=parseFloat(leito.peso)||null;
                      const ia=idadeAnos;const sx=leito.sexo||"M";
                      if(!sel||!cr||!p||!ia)return null;
                      if(sel==="ckdepi")return calcCKDEPI(cr,ia,sx);
                      if(sel==="cg")return calcCockcroftGault(cr,ia,p,sx);
                      return null;
                    })()}
                  />
                  </Collapsible>
                  <Collapsible title="DISPOSITIVOS" defaultOpen={true}>
                  <DispositivosPanel
                    dispositivos={leito.dispositivos||{}}
                    onChange={disps=>atualizar({...leito,dispositivos:disps})}
                    alertas={config}
                  />
                  </Collapsible>
                </div>
              </div>
            ) : aba==="tabela" ? (
              <TabelaClinica
                leito={leito}
                evolCampos={evolCampos}
                config={config}
                onLeitoChange={novoLeito=>atualizar(novoLeito)}
                data={tabelaData[leitoSelId] || {}}
                onChange={d=>{
                  setTabelaData(t=>{
                    const novo = {...t,[leitoSelId]:d};
                    salvarTabela(novo);
                    return novo;
                  });
                }}
                onAplicarEvolucao={(campos,opcoes={})=>{ setEvolCamposComPersistencia(c=>({...c,...campos})); setEvolVersion(v=>v+1); if(opcoes.navegar)setAba("evolucao"); }}
              />
            ) : aba==="upload" ? (
              <div style={{maxWidth:600}}>
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:15,fontWeight:700,marginBottom:6,color:T.text1}}>Importar dados via imagem</div>
                  <div style={{fontSize:13,color:T.text3}}>Faça upload do print do Tasy. A IA extrai os dados e você revisa antes de aplicar na evolução.</div>
                </div>
                <UploadAnalyzer
                  onManualResult={parsed=>{
                    const hoje = new Date().toISOString().split("T")[0];
                    setTabelaData(t=>{
                      const novo = {...t,[leitoSelId]:{...(t[leitoSelId]||{}),[hoje]:{...((t[leitoSelId]||{})[hoje]||{}),...parsed}}};
                      salvarTabela(novo);
                      return novo;
                    });
                  }}
                  onResult={d=>{
                  const hoje = new Date().toISOString().split("T")[0];
                  // Usa a data de coleta do exame se disponível, senão hoje
                  const dataAlvo = d.dataColeta || hoje;

                  // Merge extras categorizados nos sistemas
                  const sistemasFinais = { ...(d.sistemas||{}) };
                  (d.extras||[]).forEach(ex=>{
                    const cat = ex.categoria || ex.sugestao;
                    if (cat && sistemasFinais[cat] !== undefined) {
                      const linha = `${ex.nome}: ${ex.valor}`;
                      sistemasFinais[cat] = sistemasFinais[cat]
                        ? `${sistemasFinais[cat]} / ${linha}` : linha;
                    }
                  });

                  const s = sistemasFinais;
                  // Regex: captura números com vírgula OU ponto como decimal
                  const NUM = `([0-9]+[.,][0-9]+|[0-9]+)`;
                  const extrair = (texto, patterns) => {
                    if (!texto) return {};
                    const vals = {};
                    patterns.forEach(([key, regex]) => {
                      const m = texto.match(regex);
                      if (m?.[1]) vals[key] = m[1].replace(',','.');
                    });
                    return vals;
                  };

                  const re = s => new RegExp(s, 'i');
                  const novos = {};

                  Object.assign(novos, extrair(s["Hemodinâmico"]||"", [
                    ["lact",  re(`[Ll]actato[:\\s]+${NUM}`)],
                    ["trop",  re(`[Tt]roponina[:\\s]+${NUM}`)],
                    ["bnp",   re(`\\bBNP[:\\s]+${NUM}`)],
                  ]));
                  Object.assign(novos, extrair(s["Renal/Metabólico"]||"", [
                    ["cr",   re(`\\bCr[eatinina\\s]*[:/\\s]+${NUM}`)],
                    ["ur",   re(`\\bUr[eia\\s]*[:/\\s]+${NUM}`)],
                    ["k",    re(`\\bK[+\\s]*[:/\\s]+${NUM}`)],
                    ["na",   re(`\\bNa[+\\s]*[:/\\s]+${NUM}`)],
                    ["mg",   re(`\\bMg[:\\s]+${NUM}`)],
                    ["cai",  re(`\\bCa[i\\s]*[:/\\s]+${NUM}`)],
                    ["p",    re(`\\bP[:\\s]+${NUM}`)],
                    ["ph",   re(`\\bpH[:\\s]+${NUM}`)],
                    ["hco3", re(`\\bHCO3[:\\s]+${NUM}`)],
                    ["diur", re(`[Dd]iurese[:\\s]+${NUM}`)],
                    ["bh",   re(`\\bBH[:\\s]+([+-]?${NUM.slice(1)}`)],
                    ["lact", re(`\\bLactato[:\\s]+${NUM}`)],
                  ]));
                  Object.assign(novos, extrair(s["Hematológico/Infeccioso"]||"", [
                    ["hb",    re(`\\bHb[:\\s]+${NUM}`)],
                    ["ht",    re(`\\bHt[:\\s]+${NUM}`)],
                    ["leuco", re(`[Ll]euco[citos\\s]*[:/\\s]+${NUM}`)],
                    ["neut",  re(`[Nn]eutr[óo\\s]*[:/\\s]+${NUM}`)],
                    ["bast",  re(`[Bb]ast[ões\\s]*[:/\\s]+${NUM}`)],
                    ["linf",  re(`[Ll]inf[ócitos\\s]*[:/\\s]+${NUM}`)],
                    ["plaq",  re(`[Pp]laq[uetas\\s]*[:/\\s]+${NUM}`)],
                    ["rni",   re(`\\bRNI[:\\s]+${NUM}`)],
                    ["ttpa",  re(`\\bTTPA[:\\s]+${NUM}`)],
                  ]));
                  Object.assign(novos, extrair(s["Respiratório"]||"", [
                    ["po2",  re(`pO2[:\\s]+${NUM}`)],
                    ["pco2", re(`pCO2[:\\s]+${NUM}`)],
                  ]));
                  Object.assign(novos, extrair(s["Gastrointestinal"]||"", [
                    ["tgo",   re(`\\bTGO[:\\s]+${NUM}`)],
                    ["tgp",   re(`\\bTGP[:\\s]+${NUM}`)],
                    ["alb",   re(`[Aa]lbumina[:\\s]+${NUM}`)],
                    ["bttot", re(`[Bb]ili.*[Tt]otal[:\\s]+${NUM}`)],
                    ["ggt",   re(`\\bGGT[:\\s]+${NUM}`)],
                    ["falc",  re(`[Ff]osf.*[Aa]lc[:\\s]+${NUM}`)],
                  ]));

                  // Extras com categoria selecionada → também vai para a tabela
                  const EXTRAS_PARA_KEY = {
                    'hemoglobina':'hb','hematócrito':'ht','hematocrito':'ht',
                    'leucócito':'leuco','leucocito':'leuco',
                    'neutrófilo':'neut','neutrofilo':'neut',
                    'bastão':'bast','bastao':'bast','bastonete':'bast',
                    'linfócito':'linf','linfocito':'linf',
                    'plaqueta':'plaq',
                    'rni':'rni','inr':'rni','fibrinogênio':'fibri','fibrinogenio':'fibri','ttpa':'ttpa',
                    'creatinina':'cr','ureia':'ur','uréia':'ur',
                    'sódio':'na','sodio':'na','potássio':'k','potassio':'k',
                    'magnésio':'mg','magnesio':'mg',
                    'cálcio':'cai','calcio':'cai',
                    'fósforo':'p','fosforo':'p',
                    'hco3':'hco3','bicarbonato':'hco3',
                    'lactato':'lact','troponina':'trop','bnp':'bnp',
                    'po2':'po2','pco2':'pco2',
                    'tgo':'tgo','ast':'tgo','tgp':'tgp','alt':'tgp',
                    'albumina':'alb','ggt':'ggt',
                    'fosfatase':'falc','bilirrubina total':'bttot','bilirrubina direta':'btdir',
                    'diurese':'diur','balanço':'bh','balanco':'bh',
                  };
                  (d.extras||[]).forEach(ex=>{
                    const cat = ex.categoria || ex.sugestao;
                    if (!cat) return; // só lança se categoria foi selecionada
                    const nl = (ex.nome||'').toLowerCase();
                    const numMatch = (ex.valor||'').match(/([0-9]+[.,][0-9]+|[0-9]+)/);
                    if (!numMatch) return;
                    const numVal = numMatch[1].replace(',','.');
                    // Tenta achar key padrão
                    let achou = false;
                    for (const [k, tkey] of Object.entries(EXTRAS_PARA_KEY)) {
                      if (nl.includes(k)) { novos[tkey] = numVal; achou = true; break; }
                    }
                    // Se não achou key padrão, usa o nome do exame como key dinâmica
                    if (!achou) {
                      const keyDinamica = `_extra_${ex.nome.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')}`;
                      novos[keyDinamica] = numVal; // salva só o valor numérico
                    }
                  });

                  setTabelaData(t=>{
                    // Merge labs extraídos via regex + controles extraídos direto pela IA
                    const controles = d.controles || {};
                    // Map controles keys to tabela keys (same keys c24_*)
                    const controlesNovos = {};
                    Object.entries(controles).forEach(([k,v])=>{ if(v) controlesNovos[k]=v; });

                    const novo = {
                      ...t,
                      [leitoSelId]: {
                        ...(t[leitoSelId]||{}),
                        [dataAlvo]: { ...(t[leitoSelId]?.[dataAlvo]||{}), ...novos, ...controlesNovos }
                      }
                    };
                    salvarTabela(novo);
                    return novo;
                  });
                  setDadosIA(d);
                  setTimeout(()=>setAba("tabela"), 50);
                }}/>
              </div>
            ) : aba==="evolucao" ? (
              !leito.paciente ? (
                <div style={{textAlign:"center",padding:60,color:"#334155"}}>
                  <div style={{fontSize:40,marginBottom:12}}>📝</div>
                  <div>Cadastre o paciente primeiro na aba <strong style={{color:"#38bdf8"}}>Paciente & Cálculos</strong></div>
                </div>
              ) : (
                <div style={{maxWidth:1100}}>
                  {dadosIA&&<div style={{background:"rgba(56,189,248,0.07)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#86efac"}}>✅ Dados da IA aplicados — revise e edite abaixo</div>}
                  <EvolucaoEditor leito={leito} campos={evolCampos} key={`${leito.id}-${evolVersion}`}
                    onLeitoChange={atualizar}
                    tabelaDataLeito={tabelaData[leitoSelId]||{}}
                    metas={metasPorLeito[leitoSelId]||[]}
                    onMetaChange={(novas)=>{
                      setMetasPorLeito(mp=>{const novo={...mp,[leitoSelId]:novas};salvarMetas(novo);return novo;});
                    }}
                    config={config}
                    tabelaHoje={(()=>{
                      const tb = tabelaData[leitoSelId]||{};
                      const datas = Object.keys(tb).sort().reverse();
                      for (const d of datas) if (tb[d]?.c24_diet_vol) return tb[d];
                      return tb[datas[0]]||{};
                    })()}
                    onCampoEdit={(field, value)=>{
                      setEvolCamposComPersistencia(c=>({...c, [field]: value}));
                    }}
                  />
                </div>
              )
            ) : (
              <div style={{maxWidth:600}}>
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:15,fontWeight:700,marginBottom:6,color:T.text1}}>Metas do plantão</div>
                  <div style={{fontSize:13,color:T.text3}}>Adicione metas e acompanhe o cumprimento durante o plantão.</div>
                </div>
                <MetasPanel
                  metas={metasPorLeito[leitoSelId]||[]}
                  onChange={m=>{setMetasPorLeito(mp=>{const novo={...mp,[leitoSelId]:m};salvarMetas(novo);return novo;});}}
                  leito={leito} config={config}
                  tabelaHoje={(()=>{const tb=tabelaData[leitoSelId]||{};const ds=Object.keys(tb).sort().reverse();for(const d of ds)if(tb[d]?.cr)return tb[d];return tb[ds[0]]||{};})()} />
              </div>
            )}
          </div>
          {/* ── Problemas Ativos + Metas: painel flutuante, visível nas 5 abas do paciente ── */}
          {leito.paciente && ABAS.some(a=>a.id===aba) && (
            <ProbFloating
              campos={evolCampos}
              onCampoEdit={(field, value)=>{ setEvolCamposComPersistencia(c=>({...c, [field]: value})); }}
              metas={metasPorLeito[leitoSelId]||[]}
              leito={leito}
              config={config}
              tabelaDataLeito={tabelaData[leitoSelId]||{}}
              onLeitoChange={atualizar}
              onMetaChange={(novas)=>{ setMetasPorLeito(mp=>{const novo={...mp,[leitoSelId]:novas};salvarMetas(novo);return novo;}); }}/>
          )}
        </>)}
        </div>
      </div>
      {!utiAtivaId&&authed&&<div style={{position:"fixed",inset:0,zIndex:3000,background:T.bgPage,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{width:"min(650px,96vw)",maxHeight:"90vh",overflowY:"auto",padding:24,border:`1px solid ${T.borderStrong}`,borderRadius:16,background:T.bgCard,boxShadow:T.shadowCard}}>
          <div style={{fontSize:20,fontWeight:800,color:T.text1}}>Selecione o hospital e a UTI</div>
          <div style={{fontSize:12,color:T.text3,margin:"6px 0 18px"}}>Cada hospital mantém suas unidades, configurações e particularidades assistenciais organizadas separadamente.</div>
          <div style={{display:"grid",gap:14}}>{hospitais.map(h=><section key={h.id} style={{padding:12,borderRadius:12,border:`1px solid ${T.border}`,background:T.bgInput}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}><div><b style={{fontSize:13,color:T.text1}}>{h.nome}</b>{h.sigla&&<span style={{fontSize:9,color:T.text3,marginLeft:7,fontFamily:mono}}>{h.sigla}</span>}</div><button onClick={()=>criarUti(h.id)} style={{marginLeft:"auto",padding:"5px 8px",borderRadius:7,border:`1px solid ${T.accentBorder}`,background:T.accentBg,color:T.accent,fontSize:10,fontWeight:750,cursor:"pointer"}}>＋ UTI</button></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:7}}>{utis.filter(u=>(u.hospitalId||"hsp")===h.id).map(u=><button key={u.id} onClick={()=>selecionarUti(u.id)} style={{padding:"11px 12px",textAlign:"left",borderRadius:9,border:`1px solid ${T.accentBorder}`,background:T.bgCard,color:T.text1,fontSize:12,fontWeight:700,cursor:"pointer"}}>🏥 {u.nome}<span style={{float:"right",color:T.text3,fontSize:10}}>{leitos.filter(l=>(l.utiId||utis[0]?.id)===u.id).length} leitos ›</span></button>)}</div></section>)}</div>
          <button onClick={criarHospital} style={{width:"100%",marginTop:14,padding:"11px",borderRadius:10,border:"1px solid rgba(52,211,153,.35)",background:"rgba(52,211,153,.08)",color:"#34d399",fontSize:12,fontWeight:750,cursor:"pointer"}}>＋ Adicionar outro hospital</button>
        </div>
      </div>}
      {altaEditor&&<div onMouseDown={e=>{if(e.target===e.currentTarget)setAltaEditor(null);}} style={{position:"fixed",inset:0,zIndex:1800,background:"rgba(2,6,23,.78)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}><div style={{width:"min(560px,96vw)",background:T.bgCard,border:`1px solid ${T.borderStrong}`,borderRadius:14,padding:20,boxShadow:"0 24px 70px rgba(0,0,0,.5)"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:16}}><div><div style={{fontSize:16,fontWeight:800,color:T.text1}}>Dar alta · {leito.paciente}</div><div style={{fontSize:11,color:T.text3,marginTop:3}}>O prontuário será arquivado e o {leito.nome} ficará disponível.</div></div><button onClick={()=>setAltaEditor(null)} style={{marginLeft:"auto",border:0,background:"transparent",color:T.text3,cursor:"pointer",fontSize:18}}>✕</button></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}><label style={{fontSize:10,color:T.text3,fontFamily:mono}}>DATA DA ALTA<input type="date" value={altaEditor.dataAlta} onChange={e=>setAltaEditor(x=>({...x,dataAlta:e.target.value}))} style={{display:"block",width:"100%",marginTop:5,padding:"9px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1}}/></label><label style={{fontSize:10,color:T.text3,fontFamily:mono}}>DESTINO<select value={altaEditor.destino} onChange={e=>setAltaEditor(x=>({...x,destino:e.target.value,rankinAlta:e.target.value==="Óbito"?"6":x.rankinAlta}))} style={{display:"block",width:"100%",marginTop:5,padding:"9px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1}}><option value="">— selecionar —</option>{["Óbito","Enfermaria","Casa","Outro"].map(x=><option key={x}>{x}</option>)}</select></label></div>
        {altaEditor.destino==="Outro"&&<label style={{display:"block",fontSize:10,color:T.text3,fontFamily:mono,marginTop:12}}>OUTRO DESTINO<input value={altaEditor.destinoOutro} onChange={e=>setAltaEditor(x=>({...x,destinoOutro:e.target.value}))} placeholder="Digite o destino..." style={{display:"block",width:"100%",marginTop:5,padding:"9px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1}}/></label>}
        <label style={{display:"block",fontSize:10,color:T.text3,fontFamily:mono,marginTop:12}}>RANKIN MODIFICADA — ALTA<select value={altaEditor.rankinAlta} onChange={e=>setAltaEditor(x=>({...x,rankinAlta:e.target.value}))} style={{display:"block",width:"100%",marginTop:5,padding:"9px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bgInput,color:T.text1}}><option value="">— selecionar —</option>{RANKIN_OPCOES.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></label>
        {leito.rankinAdmissao!==undefined&&leito.rankinAdmissao!==""&&<div style={{marginTop:10,padding:"8px 10px",borderRadius:8,background:T.accentBg,border:`1px solid ${T.accentBorder}`,fontSize:11,color:T.text2}}>Rankin na admissão: <b style={{color:T.accent}}>{leito.rankinAdmissao}</b></div>}
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18}}><button onClick={()=>setAltaEditor(null)} style={{padding:"8px 13px",borderRadius:8,border:`1px solid ${T.border}`,background:"transparent",color:T.text2,cursor:"pointer"}}>Cancelar</button><button onClick={confirmarAltaPaciente} disabled={saving} style={{padding:"8px 14px",borderRadius:8,border:"1px solid rgba(251,191,36,.4)",background:"rgba(251,191,36,.12)",color:"#fbbf24",fontWeight:800,cursor:"pointer"}}>{saving?"Arquivando...":"Confirmar alta e arquivar"}</button></div>
      </div></div>}
      {pacienteEditorAberto&&<div onMouseDown={e=>{if(e.target===e.currentTarget)setPacienteEditorAberto(false);}} style={{position:"fixed",inset:0,zIndex:1200,background:"rgba(2,6,23,.74)",backdropFilter:"blur(3px)",display:"flex",justifyContent:"center",alignItems:"flex-start",padding:"4vh 18px"}}>
        <div style={{width:"min(1050px,96vw)",maxHeight:"92vh",display:"flex",flexDirection:"column",background:T.bgPage,border:`1px solid ${T.borderStrong}`,borderRadius:14,boxShadow:"0 24px 70px rgba(0,0,0,.45)",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${T.border}`,background:T.bgCard}}>
            <div><div style={{fontSize:14,fontWeight:750,color:T.text1}}>{leito.paciente?`Editar ${leito.paciente}`:"Cadastrar paciente"}</div><div style={{fontSize:10,color:T.text3,marginTop:2}}>Cadastro, histórico clínico e procedimentos do leito</div></div>
            <button onClick={()=>setPacienteEditorAberto(false)} style={{marginLeft:"auto",border:`1px solid ${T.border}`,background:T.bgInput,color:T.text2,borderRadius:7,padding:"5px 10px",cursor:"pointer",fontWeight:700}}>✕ Fechar</button>
          </div>
          <div style={{overflowY:"auto",padding:"20px 22px"}}><PacientePanel
            dados={leito} onChange={atualizar} config={config}
            leitosDisponiveis={leitosDaUti.filter(l=>String(l.id)!==String(leito.id)&&!l.paciente)} onTransferir={transferirPaciente}
            onConfigChange={c=>{setConfig(c);salvarConfig(c);}}
            diureseHoje={(()=>{const tb=tabelaData[leitoSelId]||{};const datas=Object.keys(tb).sort().reverse();for(const d of datas)if(tb[d]?.c24_diur)return tb[d].c24_diur;return "";})()}
            tabelaHoje={(()=>{const tb=tabelaData[leitoSelId]||{};const datas=Object.keys(tb).sort().reverse();for(const d of datas)if(tb[d]?.c24_diet_vol)return tb[d];return tb[datas[0]]||{};})()}
            onLancarDroga={(linha,campo)=>{setEvolCamposComPersistencia(c=>({...c,[campo]:c[campo]?`${c[campo]}\n${linha}`:linha}));setEvolVersion(v=>v+1);}}/>
          </div>
        </div>
      </div>}
      {historicoAberto&&leito?.admissionId&&<HistoricoDiarioPanel internacao={historicoDiario[leito.admissionId]||{patientName:leito.paciente,days:{}}} onClose={()=>setHistoricoAberto(false)}/>}
    </div>
    </ThemeCtx.Provider>
  );
}

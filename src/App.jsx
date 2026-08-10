import { useState, useRef, useCallback, useEffect } from "react";
import React from "react";
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

const LEITOS_INICIAIS = [
  { id:1, nome:"Leito 01", paciente:"", diagnostico:"", dataInternacao:"", dataNascimento:"", idadeAnos:"", peso:"", altura:"", sexo:"M", bhPrevio:"", procedimentos:[], dispositivos:{} },
  { id:2, nome:"Leito 02", paciente:"", diagnostico:"", dataInternacao:"", dataNascimento:"", idadeAnos:"", peso:"", altura:"", sexo:"M", bhPrevio:"", procedimentos:[], dispositivos:{} },
  { id:3, nome:"Leito 03", paciente:"", diagnostico:"", dataInternacao:"", dataNascimento:"", idadeAnos:"", peso:"", altura:"", sexo:"M", bhPrevio:"", procedimentos:[], dispositivos:{} },
  { id:4, nome:"Leito 04", paciente:"", diagnostico:"", dataInternacao:"", dataNascimento:"", idadeAnos:"", peso:"", altura:"", sexo:"M", bhPrevio:"", procedimentos:[], dispositivos:{} },
];

const leitoVazio = (leito) => ({
  id:leito.id,nome:leito.nome,paciente:"",diagnostico:"",dataInternacao:"",dataNascimento:"",idadeAnos:"",
  peso:"",altura:"",sexo:"M",bhPrevio:"",procedimentos:[],dispositivos:{},antibioticos:[],culturas:[],
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
    label:"Precedex (Dex)", grupo:"sedacao",
    diluicaoDesc:"4 mL (200 mcg) em SF0,9% 96 mL → 100 mL",
    concMcgML: 2,
    modoCalcDefault:"mcg_kg_h",
    modoCalcOpcoes:["mcg_kg_h"],
    max:0.7, unidadeLabel:"mcg/kg/h",
    doseInfo:"0,2 – 1,5 mcg/kg/h\nSem ventilação mecânica: 0,2–0,7 mcg/kg/h\nCom VM: pode usar até 1,5 mcg/kg/h\nVantagem: manutenção da cooperação (sedação colaborativa)",
  },
  cetamina: {
    label:"Cetamina (S+)", grupo:"analgesia",
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
  "mg_h":       { label:"mg/h",       fn:(mlh,conc,_)=>((mlh*conc/1000)).toFixed(2) },
  "mcg_min":    { label:"mcg/min",    fn:(mlh,conc,_)=>((mlh*conc)/60).toFixed(1) },
  "ui_min":     { label:"UI/min",     fn:(mlh,_,__)=>null }, // tratado separado
};

// mL/h → dose
function calcDoseFromMLH(drogaKey, mlh, peso, concCustom, modoCustom, config={}) {
  const mlhN = parseFloat(mlh), p = parseFloat(peso);
  if (!mlhN || mlhN <= 0) return null;
  // Check protocol first, then custom drugs from config
  const conf = DROGAS_PROTOCOLO[drogaKey]
    || (config?.drogasCustom||[]).find(d=>d.key===drogaKey)
    || null;
  if (!conf) return null;
  const conc = concCustom !== undefined ? parseFloat(concCustom) : conf.concMcgML;
  // vasopressina UI
  if (conf.modoCalcDefault === "ui_min" && !modoCustom) {
    const uiMin = mlhN * conf.concUIML / 60;
    return { dose: uiMin.toFixed(4), label: "UI/min" };
  }
  if (!conc || conc <= 0) return null;
  // Modo: config override > modoCustom > default do protocolo
  const modoKey = modoCustom || (config?.drogasModo?.[drogaKey]) || conf.modoCalcDefault;
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
  bgPage:           "#d6dee8",
  bgCard:           "#f8fafc",
  bgCardHover:      "#e6edf4",
  bgSidebar:        "#e1e7ee",
  bgHeader:         "rgba(238,243,248,0.98)",
  bgInput:          "#ffffff",
  bgPicker:         "#ffffff",
  bgSel:            "rgba(2,132,199,0.07)",
  text1:            "#0f172a",
  text2:            "#334155",
  text3:            "#64748b",
  text4:            "#475569",
  textDim:          "#64748b",
  border:           "#9eacbd",
  borderStrong:     "#718096",
  borderAccent:     "rgba(2,132,199,0.18)",
  accent:           "#0284c7",
  accentBg:         "rgba(2,132,199,0.08)",
  accentBorder:     "rgba(2,132,199,0.35)",
  shadow:           "0 1px 3px rgba(0,0,0,0.08)",
  shadowCard:       "0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)",
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

function DrogasCalculadora({ peso, onLancarDroga, vazoes={}, onVazaoChange, config={} }) {
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
    ...Object.entries(DROGAS_PROTOCOLO).map(([k,v])=>({key:k, label:v.label})),
    ...(config?.drogasCustom||[]).map(d=>({key:d.key, label:d.label})),
  ];
  // Merged protocol for dose calc
  const getConf = (key) => DROGAS_PROTOCOLO[key] || (config?.drogasCustom||[]).find(d=>d.key===key) || null;

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
        const resultado = (conf && drug.mlh) ? calcDoseFromMLH(drug.key, drug.mlh, peso, undefined, conf?.modoCalcDefault, config) : null;
        const acimaDose = resultado && conf?.max && parseFloat(resultado.dose)>conf.max;
        const filtered = allDrugs.filter(d=>d.label.toLowerCase().includes((drug.customName||"").toLowerCase()));

        return (
          <div key={drug.id} style={{marginBottom:8, position:"relative"}}>
            {/* Row: name | mlh | × */}
            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <div style={{flex:1, position:"relative"}}>
                <input value={drug.customName||""}
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
                          {DROGAS_PROTOCOLO[d.key]?.diluicaoDesc?.split("→")[1]?.trim()||""}
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
  { id:"olig_trat",    tipo:"parenteral",
    nome:"Oligoelementos para nutrição parenteral total - 2 mL",
    comercial:"OLIG-TRAT®",
    kcalML:0, ptnML:0, choML:0, lipML:0 },
  { id:"cerne12",      tipo:"parenteral",
    nome:"Polivitamínicos - 5 mL pó liofilizado",
    comercial:"Cerne 12 — Baxter",
    kcalML:0, ptnML:0, choML:0, lipML:0 },
  { id:"fitomenadiona",tipo:"parenteral",
    nome:"Fitomenadiona MM 10 mg/mL - 1 mL",
    comercial:"Vitamina K",
    kcalML:0, ptnML:0, choML:0, lipML:0 },
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

// ── DietaPanel ────────────────────────────────────────────────────────────────
function DietaPanel({ dados, onChange, config={}, diureseHojeVol="", integrated=false }) {
  const dieta = dados.dieta || {
    tipo:"enteral", catalogId:"", formula:"",
    vazao:"",
    meta:{ modo:"kg", kcalKg:"25", ptnKg:"1.5", kcalTotal:"", ptnTotal:"" },
    obs:"", moduloProteina:{ativo:false,gramas:""}
  };
  const upd     = (field, val) => onChange({ ...dados, dieta: { ...dieta, [field]: val } });
  const updMeta = (field, val) => upd("meta", { ...(dieta.meta||{}), [field]: val });

  const [showCatalog, setShowCatalog] = useState(false);
  const [showDetails, setShowDetails] = useState(!integrated);
  const [showMetas, setShowMetas] = useState(!integrated);

  const peso     = parseFloat(dados.peso) || 0;
  const catalogo = getDietasCatalogo(config);
  const dietaSel = catalogo.find(d=>d.id===dieta.catalogId) || null;
  const meta     = dieta.meta || { modo:"kg" };
  const metaAbs  = calcMetaAbsoluta(meta, peso);
  const volHoje  = parseFloat(diureseHojeVol) || 0;
  const moduloProteina = dieta.moduloProteina || {ativo:false,gramas:""};
  const moduloPtn = moduloProteina.ativo ? (parseFloat(moduloProteina.gramas)||0) : 0;
  const somarModulo = n => n ? {...n,ptn:Math.round((n.ptn+moduloPtn)*10)/10} : (moduloPtn?{kcal:0,ptn:moduloPtn}:null);
  const nutriHoje = somarModulo(calcNutri(dietaSel, volHoje));
  const kcalPct = metaAbs?.kcal && nutriHoje?.kcal ? Math.round(nutriHoje.kcal/metaAbs.kcal*100) : null;
  const ptnPct = metaAbs?.ptn && nutriHoje?.ptn ? Math.round(nutriHoje.ptn/metaAbs.ptn*100) : null;
  const adequacao = kcalPct!==null && ptnPct!==null ? Math.min(kcalPct,ptnPct) : (kcalPct ?? ptnPct);
  const adequacaoCor = adequacao===null ? "#94a3b8" : adequacao>=80 ? "#34d399" : "#f87171";
  const tipoLabel = {enteral:"Enteral",parenteral:"NPT",oral:"Via oral",mista:"Mista",jejum:"Jejum"}[dieta.tipo] || "Não definida";

  const TIPOS = [
    {k:"enteral",   label:"🥤 Enteral"},
    {k:"parenteral",label:"💉 Parenteral"},
    {k:"oral",      label:"🍽️ Oral"},
    {k:"mista",     label:"🔀 Mista"},
    {k:"jejum",     label:"⛔ Jejum"},
  ];
  const filtrados = dieta.tipo==="parenteral"
    ? catalogo.filter(d=>d.tipo==="parenteral")
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
                {volHoje>0&&<span>24h: {volHoje} mL</span>}
                {nutriHoje&&<span>{nutriHoje.kcal} kcal · {nutriHoje.ptn} g ptn{moduloPtn?` (inclui módulo +${moduloPtn} g)`:""}</span>}
              </div>
              {dieta.obs&&<div style={{marginTop:5,fontSize:10,color:"#94a3b8"}}>Tolerância: {dieta.obs}</div>}
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
              <button onClick={()=>setShowCatalog(s=>!s)} style={{flex:1,padding:"9px 14px",textAlign:"left",background:dietaSel?"rgba(56,189,248,0.08)":"rgba(255,255,255,0.04)",border:`1px solid ${dietaSel?"rgba(56,189,248,0.3)":"rgba(255,255,255,0.1)"}`,borderRadius:8,color:dietaSel?"#e2e8f0":"#64748b",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
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
              <div style={{marginTop:6,background:"#0c1a10",border:"1px solid rgba(56,189,248,0.2)",borderRadius:10,maxHeight:200,overflowY:"auto",padding:"4px"}}>
                {filtrados.length===0 ? <div style={{padding:"12px",textAlign:"center",color:"#475569",fontSize:12}}>Adicione fórmulas em ⚙️ Configurações.</div>
                  : filtrados.map(d=>(
                    <button key={d.id} onClick={()=>{
                      onChange({...dados, dieta:{...dieta, catalogId:d.id, formula:d.nome}});
                      setShowCatalog(false);
                    }}
                      style={{width:"100%",padding:"8px 12px",textAlign:"left",background:dieta.catalogId===d.id?"rgba(56,189,248,0.1)":"transparent",border:"none",borderRadius:7,cursor:"pointer",color:"#e2e8f0",fontSize:12,fontFamily:"inherit"}}>
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
              const nutriProj = somarModulo(calcNutri(dietaSel, volProj));
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
          </div>

          {/* Módulo proteico */}
          <div style={{padding:"10px 12px",marginBottom:14,border:"1px solid rgba(251,146,60,.2)",borderRadius:9,background:"rgba(251,146,60,.04)"}}>
            <label style={{display:"flex",alignItems:"center",gap:8,color:"#fdba74",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              <input type="checkbox" checked={!!moduloProteina.ativo} onChange={e=>upd("moduloProteina",{...moduloProteina,ativo:e.target.checked})}/>
              Adicionar módulo de proteína
            </label>
            {moduloProteina.ativo&&<div style={{display:"flex",gap:8,alignItems:"center",marginTop:9,maxWidth:280}}>
              <input type="number" min="0" step="1" value={moduloProteina.gramas||""} onChange={e=>upd("moduloProteina",{...moduloProteina,gramas:e.target.value})} placeholder="Ex.: 30"
                style={{width:110,background:"rgba(255,255,255,.04)",border:"1px solid rgba(251,146,60,.3)",borderRadius:7,padding:"7px 9px",color:"#e2e8f0",fontSize:13}}/>
              <span style={{fontSize:11,color:"#94a3b8"}}>g de proteína/dia</span>
            </div>}
          </div>

          {dieta.tipo==="parenteral"&&<div style={{padding:"10px 12px",marginBottom:14,border:"1px solid rgba(56,189,248,.22)",borderRadius:9,background:"rgba(56,189,248,.04)"}}>
            <div style={{fontSize:10,color:"#38bdf8",fontFamily:mono,letterSpacing:1,marginBottom:7}}>SUPLEMENTAÇÃO ASSOCIADA À NPT</div>
            <input value={dieta.suplementacaoNPT||""} onChange={e=>upd("suplementacaoNPT",e.target.value)} placeholder="Ex.: Vitamina K 10 mg/semana · Tiamina 100 mg/dia"
              style={{width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid rgba(56,189,248,.25)",borderRadius:7,padding:"7px 9px",color:"#e2e8f0",fontSize:12}}/>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6}}>
              {["Vitamina K","Tiamina","Polivitamínico","Oligoelementos"].map(s=><button key={s} onClick={()=>{const atual=dieta.suplementacaoNPT||"";if(!atual.toLowerCase().includes(s.toLowerCase()))upd("suplementacaoNPT",[atual,s].filter(Boolean).join(" · "));}} style={{padding:"2px 8px",borderRadius:12,border:"1px solid rgba(56,189,248,.2)",background:"transparent",color:"#7dd3fc",fontSize:10,cursor:"pointer"}}>+ {s}</button>)}
            </div>
          </div>}

          {/* Metas nutricionais */}
          <div style={{padding:"12px 14px",background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:10,marginBottom:14}}>
            <button onClick={()=>setShowMetas(v=>!v)} style={{width:"100%",display:"flex",justifyContent:"space-between",background:"none",border:"none",padding:0,color:"#c4b5fd",cursor:"pointer",fontFamily:mono,fontSize:10,letterSpacing:1}}><span>🎯 METAS NUTRICIONAIS{metaAbs?` · ${metaAbs.kcal||"—"} kcal · ${metaAbs.ptn||"—"} g ptn/d`:""}</span><span>{showMetas?"▲":"▼"}</span></button>
            {showMetas&&<div style={{marginTop:10}}>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {[{k:"kg",label:"Por kg/dia"},{k:"total",label:"Total fixo/dia"}].map(m=>(
                <button key={m.k} onClick={()=>updMeta("modo",m.k)}
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
                    <input type="number" step="0.5" value={meta.kcalKg||""} onChange={e=>updMeta("kcalKg",e.target.value)} placeholder="25"
                      style={{flex:1,background:"none",border:"none",padding:"7px 9px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
                    <span style={{paddingRight:8,color:"#475569",fontSize:11,alignSelf:"center"}}>kcal/kg</span>
                  </div>
                  {meta.kcalKg&&peso>0&&<div style={{fontSize:10,color:"#94a3b8",marginTop:3}}>= {(parseFloat(meta.kcalKg)*peso).toFixed(0)} kcal/dia</div>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>PTN G/KG/DIA</div>
                  <div style={{display:"flex",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:7,overflow:"hidden"}}>
                    <input type="number" step="0.1" value={meta.ptnKg||""} onChange={e=>updMeta("ptnKg",e.target.value)} placeholder="1.5"
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
                    <input type="number" value={meta.kcalTotal||""} onChange={e=>updMeta("kcalTotal",e.target.value)} placeholder="1800"
                      style={{flex:1,background:"none",border:"none",padding:"7px 9px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
                    <span style={{paddingRight:8,color:"#475569",fontSize:11,alignSelf:"center"}}>kcal</span>
                  </div>
                  {meta.kcalTotal&&peso>0&&<div style={{fontSize:10,color:"#94a3b8",marginTop:3}}>= {(parseFloat(meta.kcalTotal)/peso).toFixed(1)} kcal/kg/dia</div>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:"#64748b",fontFamily:mono,marginBottom:3}}>PTN TOTAL/DIA (g)</div>
                  <div style={{display:"flex",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:7,overflow:"hidden"}}>
                    <input type="number" value={meta.ptnTotal||""} onChange={e=>updMeta("ptnTotal",e.target.value)} placeholder="105"
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
          {dietaSel && metaAbs && (
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
  const dias = diasDisp(disp.data);
  const alerta = dias !== null && dias > alertaDias;
  const [showObs, setShowObs] = useState(false);
  return (
    <div style={{borderRadius:10,border:`1px solid ${alerta?"rgba(248,113,113,0.4)":"rgba(56,189,248,0.2)"}`,background:alerta?"rgba(248,113,113,0.04)":"rgba(56,189,248,0.03)",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px"}}>
        <span style={{fontSize:14}}>{icone}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:600,color:"#e2e8f0"}}>{label}</div>
          {disp.site&&<div style={{fontSize:10,color:"#64748b"}}>{disp.site}</div>}
        </div>
        {dias!==null&&<div style={{textAlign:"center",padding:"3px 8px",borderRadius:6,minWidth:40,background:alerta?"rgba(248,113,113,0.12)":"rgba(56,189,248,0.1)",border:`1px solid ${alerta?"rgba(248,113,113,0.35)":"rgba(56,189,248,0.25)"}`}}>
          <div style={{fontSize:13,fontWeight:700,color:alerta?"#f87171":"#38bdf8",lineHeight:1}}>{dias===0?"D0":`D${dias}`}</div>
          {alerta&&<div style={{fontSize:8,color:"#f87171",fontFamily:mono}}>REVISAR</div>}
        </div>}
        <button onClick={()=>setShowObs(s=>!s)} title="Obs" style={{background:"none",border:"none",color:showObs?"#38bdf8":"#475569",cursor:"pointer",fontSize:13,padding:"2px 4px"}}>📝</button>
        <button onClick={onRemove} style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:6,color:"#f87171",cursor:"pointer",fontSize:10,padding:"3px 8px",fontWeight:600}}>✕</button>
      </div>
      <div style={{padding:"0 12px 8px",borderTop:"1px solid rgba(255,255,255,0.04)",paddingTop:8,display:"flex",gap:8,flexWrap:"wrap"}}>
        <div style={{minWidth:130,flex:1}}>
          <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>DATA INSERÇÃO</div>
          <input type="date" value={disp.data||""} onChange={e=>onUpdate("data",e.target.value)} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"5px 8px",color:"#e2e8f0",fontSize:11}}/>
        </div>
        <div style={{minWidth:140,flex:2}}>
          <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>SÍTIO / LOCALIZAÇÃO</div>
          <input value={disp.site||""} onChange={e=>onUpdate("site",e.target.value)} placeholder="Femoral E / Tórax D" style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"5px 8px",color:"#e2e8f0",fontSize:11}}/>
        </div>
      </div>
      {showObs&&<div style={{padding:"0 12px 8px"}}>
        <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>OBSERVAÇÕES</div>
        <input value={disp.obs||""} onChange={e=>onUpdate("obs",e.target.value)} placeholder="Curativo ok..." style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"5px 8px",color:"#e2e8f0",fontSize:11}}/>
      </div>}
    </div>
  );
}

function DispositivosPanel({ dispositivos={}, onChange, alertas={} }) {
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
      <SecTitle>DISPOSITIVOS INVASIVOS</SecTitle>

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
          background:showPicker?"rgba(56,189,248,0.1)":"rgba(255,255,255,0.03)",
          border:`1px solid ${showPicker?"rgba(56,189,248,0.4)":"rgba(255,255,255,0.1)"}`,
          borderRadius:10,color:showPicker?"#38bdf8":"#64748b",
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
               { key:"vm_p01",  label:"P0.1 (cmH₂O)", type:"number",placeholder:"" },
               { key:"vm_pocc", label:"Pocc (cmH₂O)", type:"number",placeholder:"" },
               { key:"vm_pmusc",label:"Pmusc (cmH₂O)",type:"number",placeholder:"" }],
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

function gerarTextoVM(leito) {
  const modo = leito.vm_modo;
  if (!modo || modo === "ar_ambiente") return leito.vm_sato2 ? `Ar ambiente / SatO2 ${leito.vm_sato2}%` : "Ar ambiente";
  const m = VM_MODOS.find(x=>x.id===modo);
  const label = m ? m.label : modo;
  const campos = VM_CAMPOS[modo] || [];
  const partes = campos.map(c=>{
    const v = leito[c.key];
    if (!v) return null;
    return `${c.label.replace(/ \(.*\)/,"")}: ${v}`;
  }).filter(Boolean);
  if (leito.vm_sato2) partes.push(`SatO2: ${leito.vm_sato2}%`);
  const modosVMFull = ["vm_psv","vm_pcv","vm_vcv","vm_aprv"];
  if (modosVMFull.includes(modo) && leito.dispositivos?.tqt?.ativo && leito.vm_cuff) partes.push(`Cuff: ${leito.vm_cuff}`);
  if (leito.vm_obs) partes.push(leito.vm_obs);
  // Calculados
  if ((modo==="vm_pcv"||modo==="vm_vcv")&&leito.vm_pplat&&leito.vm_peep) {
    const dp = parseFloat(leito.vm_pplat)-parseFloat(leito.vm_peep);
    if (!isNaN(dp)) partes.push(`DP: ${Math.round(dp*10)/10} cmH₂O`);
  }
  if (modo==="vm_vcv"&&leito.vm_vt&&leito.vm_pplat&&leito.vm_peep) {
    const csr = parseFloat(leito.vm_vt)/(parseFloat(leito.vm_pplat)-parseFloat(leito.vm_peep));
    if (!isNaN(csr)&&isFinite(csr)) partes.push(`Csr: ${Math.round(csr)} mL/cmH₂O`);
  }
  const mp=calcMechanicalPower(leito);
  if(mp) partes.push(`Mechanical Power: ${mp.valor.toFixed(1)} J/min (${mp.formula})`);
  return `${label}: ${partes.join(" / ")}`;
}

function VentilacaoPanel({ leito, onChange, integrated=false }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";
  const [busca, setBusca] = useState("");
  const [showBusca, setShowBusca] = useState(false);
  const [showDetails, setShowDetails] = useState(!integrated);

  const modoAtual = VM_MODOS.find(m=>m.id===leito.vm_modo);
  const campos = VM_CAMPOS[leito.vm_modo] || [];

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

  const set = (key, val) => onChange({...leito, [key]: val});

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

      {(!integrated || showDetails) && <div style={integrated?{padding:"12px 14px 2px",marginTop:-12,marginBottom:12,border:"1px solid rgba(56,189,248,.18)",borderTop:"none",borderRadius:"0 0 12px 12px",background:"rgba(56,189,248,.025)"}:undefined}>

      {/* Seletor de modo */}
      <div style={{marginBottom:12,position:"relative"}}>
        {modoAtual ? (
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{modoAtual.label}</div>
            </div>
            <button onClick={()=>{onChange({...leito,vm_modo:""});setBusca("");}} style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:6,color:"#f87171",cursor:"pointer",fontSize:11,padding:"3px 10px"}}>Trocar modo</button>
          </div>
        ) : (
          <div>
            <input value={busca} onChange={e=>{setBusca(e.target.value);setShowBusca(true);}} onFocus={()=>setShowBusca(true)}
              onKeyDown={e=>{if(e.key==="Enter"&&modosFiltrados.length>0)onChange({...leito,vm_modo:modosFiltrados[0].id});if(e.key==="Escape")setShowBusca(false);}}
              placeholder="Buscar modo ventilação... (ex: PSV, CNAF, VNI)"
              style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:8,padding:"10px 14px",color:"#e2e8f0",fontSize:13,outline:"none"}}/>
            {showBusca&&modosFiltrados.length>0&&(
              <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:99,background:"#0c1a10",border:"1px solid rgba(56,189,248,0.25)",borderRadius:8,marginTop:4,maxHeight:280,overflowY:"auto"}}>
                {modosFiltrados.map(m=>(
                  <div key={m.id} onClick={()=>{onChange({...leito,vm_modo:m.id});setBusca("");setShowBusca(false);}}
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
                <button key={m.id} onClick={()=>onChange({...leito,vm_modo:m.id})}
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
              style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
          </div>
          {["vm_psv","vm_pcv","vm_vcv","vm_aprv"].includes(leito.vm_modo) && leito.dispositivos?.tqt?.ativo && (
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
                <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>{c.label.toUpperCase()}</div>
                <input type={c.type||"text"} value={leito[c.key]||""} onChange={e=>set(c.key,e.target.value)}
                  placeholder={c.placeholder}
                  style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
              </div>
            ))}
          </div>

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
          {(dp!==null||csr!==null||pf_calc!==null) && (
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
            </div>
          )}

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

          {/* P/F manual se não calculado */}
          {!pf_calc&&(leito.vm_modo==="vm_psv"||leito.vm_modo==="vm_pcv"||leito.vm_modo==="vm_vcv")&&(
            <div style={{display:"flex",gap:10,marginBottom:10}}>
              <div style={{minWidth:120,flex:1}}>
                <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>PaO₂ (mmHg) — calcula P/F</div>
                <input type="number" value={leito.vm_pf||""} onChange={e=>set("vm_pf",e.target.value)}
                  placeholder="Ex: 280"
                  style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"7px 10px",color:"#e2e8f0",fontSize:12}}/>
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>OBSERVAÇÕES / PARÂMETROS ADICIONAIS</div>
            <textarea value={leito.vm_obs||""} onChange={e=>set("vm_obs",e.target.value)}
              placeholder="Ex: Prone 16h, sincronismo adequado, ajuste de sedação..." rows={2}
              style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 10px",color:"#e2e8f0",fontSize:12,resize:"vertical",fontFamily:"inherit"}}/>
          </div>
        </>
      )}
      {modoAtual&&<div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
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

function AntibioticosPanel({ antibioticos=[], onChange, crSerico="", peso="", idadeAnos=null, sexo="M", clcrOverride=null }) {
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
    "Pip/Tazo (Piperacilina-Tazobactam)","Amp/Sulbactam","Ampicilina",
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
    onChange([...antibioticos, { id: Date.now(), nome, via:"EV", dose:"", dataInicio: hoje, horaInicio: horaAtual, dataFim:"", doseConfirmada:false }]);
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
              </div>

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
function PacientePanel({ dados, onChange, config={}, onLancarDroga, onConfigChange, diureseHoje="", tabelaHoje={} }) {
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
      </div>


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
  const [showSug, setShowSug] = useState(false);
  const cleanPlaceholder = placeholder && !sugestao ? placeholder : ""; // só usa placeholder se não tem sugestão separada
  return (
    <div style={{position:"relative"}}>
      <textarea ref={fieldRef} defaultValue={defaultValue||""} placeholder={cleanPlaceholder||""} rows={rows}
        style={{width:"100%",
          background: isAntigo ? T.bgTableGroup : T.bgInput,
          border: `1px solid ${isAntigo?T.borderStrong:T.border}`,
          borderRadius:8, padding:"8px 32px 8px 10px",
          color: isAntigo ? T.text3 : T.text1,
          fontSize:12, resize:"vertical", fontFamily:"inherit", boxSizing:"border-box", lineHeight:1.5}}
        onFocus={e=>e.target.style.borderColor="rgba(56,189,248,0.4)"}
        onBlur={e=>{
          e.target.style.borderColor = isAntigo ? T.borderStrong : T.border;
          if (onBlurSave && fieldName) onBlurSave(fieldName, e.target.value);
        }}/>
      {/* Stamp de sugestão */}
      {(sugestao||placeholder) && (
        <button onClick={()=>setShowSug(s=>!s)}
          style={{position:"absolute",top:5,right:6,background:showSug?T.accentBg:T.bgCardHover,border:`1px solid ${showSug?T.accentBorder:T.border}`,borderRadius:4,color:showSug?T.accent:T.text4,fontSize:9,cursor:"pointer",padding:"1px 5px",fontFamily:mono,lineHeight:1.4}}
          title="Ver sugestão">
          💡
        </button>
      )}
      {showSug && (sugestao||placeholder) && (
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:20,background:T.bgPicker,border:`1px solid ${T.accentBorder}`,borderRadius:8,padding:"8px 10px",boxShadow:"0 6px 20px rgba(0,0,0,0.18)"}}>
          <div style={{fontSize:9,color:"#38bdf8",fontFamily:mono,letterSpacing:1,marginBottom:4}}>SUGESTÃO</div>
          <div style={{fontSize:11,color:T.text2,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{sugestao||placeholder}</div>
          <button onClick={()=>{
            if(fieldRef?.current) fieldRef.current.value = sugestao||placeholder;
            if(onBlurSave&&fieldName) onBlurSave(fieldName, sugestao||placeholder);
            setShowSug(false);
          }} style={{marginTop:6,background:"rgba(56,189,248,0.12)",border:"1px solid rgba(56,189,248,0.25)",borderRadius:4,color:"#38bdf8",fontSize:10,cursor:"pointer",padding:"2px 8px",fontFamily:"inherit"}}>
            ↙ Usar
          </button>
          <button onClick={()=>setShowSug(false)} style={{marginTop:6,marginLeft:4,background:"none",border:"none",color:"#475569",fontSize:10,cursor:"pointer"}}>✕</button>
        </div>
      )}
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
  "mg_kg_h":"mg/kg/h", "mg_h":"mg/h", "mcg_min":"mcg/min",
};

function DrogasCustomConfig({ config, onChange }) {
  const mono = "'DM Mono',monospace";
  const T = useTheme();
  const [show, setShow] = useState(false);
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

  return (
    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,marginBottom:20,overflow:"hidden"}}>
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

function ConfigPanel({ config, onChange, onVoltar }) {
  const upd = (key, val) => onChange({...config, [key]: parseInt(val)||0});
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
    <div style={{maxWidth:620}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={onVoltar} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#64748b",cursor:"pointer",fontSize:12,padding:"6px 12px"}}>← Voltar</button>
        <div>
          <div style={{fontSize:15,fontWeight:700}}>⚙️ Configurações</div>
          <div style={{fontSize:12,color:"#64748b"}}>Dispositivos, drogas e catálogo de dietas</div>
        </div>
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
    {key:"c24_diet_vol",     label:"Vol. Dieta recebida", unit:"mL"},
    {key:"c24_propofol_vol", label:"Propofol (volume)",   unit:"mL", opcional:true},
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

  const gasosData = date => { try { const v=data[date]?._gasos; return v?(typeof v==="string"?JSON.parse(v):v):[]; } catch{return [];} };
  const scoreInputs = date => {
    const row=data[date]||{}, salvo=row._scoreInputs||{};
    const gasos=gasosData(date), g=gasos[gasos.length-1]||{};
    const fio2=numScore(date===hoje?leito.vm_fio2:salvo.fio2);
    const po2=numScore(g.po2), sat=numScore(g.sato2)??numScore(row.c24_sat);
    const nora=date===hoje?calcDoseFromMLH("noradrenalina",leito.drogasVazao?.noradrenalina,leito.peso,undefined,undefined,config)?.dose:null;
    const autoCirc=nora?(numScore(nora)>0.1?"dva_alta":"dva_media"):(date===hoje&&Object.values(leito.drogasVazao||{}).some(Boolean)?"dva_baixa":numScore(row.c24_pam)!==null&&numScore(row.c24_pam)<70?"pam_baixa":"normal");
    return {bilirrubina:row.bttot||"",creatinina:row.cr||"",inr:row.rni||"",leucocitos:row.leuco||"",plaquetas:row.plaq||"",diurese:row.c24_diur||"",
      pf:po2!==null&&fio2?String(Math.round(po2/(fio2/100))):"",sf:sat!==null&&fio2?String(Math.round(sat/(fio2/100))):"",fio2:fio2??"",
      gcs:date===hoje?(evolCampos.nGlasgow||""):"",suporteResp:date===hoje&&!!leito.vm_modo,circulacao:autoCirc,circulacaoSofa:autoCirc,
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
      ...gasoExtraLines("na","Na","mEq/L"), ...gasoExtraLines("k","K","mEq/L"),
      ...gasoExtraLines("ca","Ca","mmol/L"), ...gasoExtraLines("cl","Cl","mEq/L"),
    ];
    if (rmGasoExtra.length) rmStr = [rmStr, ...rmGasoExtra].filter(Boolean).join("\n");
    const tgGasoExtra = gasoExtraLines("glic","Glicemia","mg/dL");
    if (tgGasoExtra.length) tgStr = [tgStr, ...tgGasoExtra].filter(Boolean).join("\n");
    const heGasoExtra = gasoExtraLines("hb","Hb","g/dL");
    if (heGasoExtra.length) heStr = [heStr, ...heGasoExtra].filter(Boolean).join("\n");
    const lactTabela = pegar(["lact"]).replace(/^Lactato\s*/i,"");
    const lactGaso = gasoEntries.filter(g=>g.lact).map(g=>`${g.horario?`[${g.horario}] `:""}${g.lact}`).join(" / ");

    // Controles → campos certos em cada sistema
    const tempStr  = pegarCtrl(["c24_temp"]);           // He: Infeccioso/Temperatura
    const cvCtrl   = pegarCtrl(["c24_fc","c24_pam","c24_pas"]); // Cv: 24h
    const reCtrl   = pegarCtrl(["c24_fr","c24_sat"]);   // Res: 24h
    const bhStr    = pegarCtrl(["c24_diur","c24_bh"]);  // ReMe: 24h
    const dextroStr= pegarCtrl(["c24_dextro"]);          // TGI: 24h
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
      const nome = k.replace(/^_extra_/,'').replace(/_/g,' ');
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
    if (bhStr)    campos.rm24h   = bhStr;

    // TGI: glicemia + drenos dinâmicos
    const tgCtrl = [dextroStr, drenosStr].filter(Boolean).join(" · ");
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
      const pp4 = pesoPredito(leito.altura, leito.sexo);
      const vt4 = parseFloat(leito.vm_vt||0);
      const vtInfo = (pp4 && vt4) ? ` · VC ${vt4}mL = ${(vt4/parseFloat(pp4)).toFixed(1)}mL/kg PP` : "";
      campos.reVM = vmTexto + vtInfo;
    }

    // Antibioticoterapia → heAtb (campo "Antibióticos" na seção Infeccioso)
    const atbTexto = (leito.antibioticos||[]).filter(a=>a.nome&&!a.dataFim).map(a=>{
      const diasAtb = diasAtb24h(a.dataInicio, a.horaInicio);
      const partes = [a.nome, a.dose, a.via||"EV"].filter(Boolean).join(" ");
      const lbl = lblDiaAtb(diasAtb);
      return `${partes}${lbl ? " ("+lbl+")" : ""}`;
    }).join("\n");
    if (atbTexto) campos.heAtb = atbTexto;

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
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14,padding:"12px 14px",background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:10}}>
          <div style={{fontSize:12,color:"#c4b5fd"}}>Nome do exame:</div>
          <input value={novoExame} onChange={e=>setNovoExame(e.target.value)}
            onKeyDown={e=>{
              if(e.key==="Enter"&&novoExame.trim()){
                const key=`_extra_${novoExame.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')}`;
                // Garante que a chave existe para aparecer na tabela
                const hoje2=new Date().toISOString().split("T")[0];
                onChange({...data,[hoje2]:{...(data[hoje2]||{}),[key]:data[hoje2]?.[key]||""}});
                setNovoExame(""); setShowAddExame(false);
              }
            }}
            placeholder="Ex: PCR, Procalcitonina, Troponina..."
            style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(167,139,250,0.3)",borderRadius:6,padding:"6px 10px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
          <button onClick={()=>{
            if(!novoExame.trim()) return;
            const key=`_extra_${novoExame.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')}`;
            const hoje2=new Date().toISOString().split("T")[0];
            onChange({...data,[hoje2]:{...(data[hoje2]||{}),[key]:data[hoje2]?.[key]||""}});
            setNovoExame(""); setShowAddExame(false);
          }} disabled={!novoExame.trim()}
            style={{padding:"6px 14px",background:novoExame.trim()?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.04)",border:`1px solid ${novoExame.trim()?"#a78bfa":"rgba(255,255,255,0.08)"}`,borderRadius:6,color:novoExame.trim()?"#c4b5fd":"#475569",fontWeight:600,fontSize:12,cursor:novoExame.trim()?"pointer":"default"}}>
            Adicionar
          </button>
        </div>
      )}
      {tabela==="labs" && (
        <div style={{display:"flex",gap:5,paddingBottom:8,borderBottom:`1px solid ${T.border}`,marginBottom:8,flexShrink:0}}>
          {[["labs","🔬 Laboratório"],["gasos","🫁 Gasometrias"],["tropos","🫀 Troponina"],["culturas","🧫 Culturas"]].map(([id,lbl])=>(
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
                      {k:"hb",      label:"🩸 Hematológico",    cor:"#f87171"},
                      {k:"cr",      label:"🫘 Renal/Metabólico", cor:"#34d399"},
                      {k:"tgo",     label:"🫀 Hepatograma",      cor:"#fb923c"},
                      {k:"trop",    label:"❤️ Cardíaco",         cor:"#f87171"},
                      {k:"po2",     label:"🫁 Gasometria",       cor:"#38bdf8"},
                      {k:"he",      label:"🔴 Infeccioso",       cor:"#f59e0b"},
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
                        const metaAbs  = calcMetaAbsoluta(leito.dieta?.meta, parseFloat(leito.peso));
                        if (!dietaSel) return null;
                        const rows = [
                          { lbl:"↳ Kcal recebida", unit:"kcal", calc:(vol)=>(vol*dietaSel.kcalML).toFixed(0), meta:metaAbs?.kcal, cor:(v,m)=>m?(v/m>=0.8?"#34d399":"#f87171"):"#94a3b8" },
                          { lbl:"↳ Ptn recebida",  unit:"g",    calc:(vol)=>(vol*dietaSel.ptnML ).toFixed(1), meta:metaAbs?.ptn,  cor:(v,m)=>m?(v/m>=0.8?"#34d399":"#f87171"):"#94a3b8" },
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
function ProbFloating({ campos={}, onCampoEdit, metas=[], onMetaChange }) {
  const T=useTheme();
  const [open, setOpen] = useState(true);
  const [openResolvidos, setOpenResolvidos] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [copiado, setCopiado] = useState({});
  const mono2 = "'DM Mono',monospace";
  const refs = React.useRef({});
  if (!refs.current.probAtivos) refs.current.probAtivos = React.createRef();
  if (!refs.current.probResolvidos) refs.current.probResolvidos = React.createRef();
  const hoje = new Date().toISOString().split("T")[0];
  const isAntigo = (fieldName) => { const d = campos._datas?.[fieldName]; return d && d < hoje; };
  const salvar = onCampoEdit || (()=>{});
  const pendentes = metas.filter(m=>!m.feito&&m.status!=="cumprido").length;

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
          <TA fieldRef={refs.current.probAtivos} defaultValue={campos.probAtivos} isAntigo={isAntigo("probAtivos")}
            sugestao={"1. Sepse foco pulmonar\n2. IRA oligúrica\n3. FA com RVR"}
            rows={7} fieldName="probAtivos" onBlurSave={salvar}/>
          <button onClick={()=>{
            const t=refs.current.probAtivos?.current?.value||campos.probAtivos||"";
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
          {/* ── Metas / Pendências ── */}
          <div style={{marginTop:10,borderTop:"1px solid rgba(56,189,248,0.2)",paddingTop:8}}>
            <div style={{fontSize:9,fontFamily:mono2,letterSpacing:2,color:"#38bdf8",marginBottom:6}}>📌 METAS</div>
            {ordenarMetas(metas).map((m,i)=>(
              <div key={m.id||i} style={{display:"flex",alignItems:"flex-start",gap:5,marginBottom:4}}>
                <MetaPriorityDot meta={m} metas={metas} onChange={onMetaChange}/>
                <button onClick={()=>onMetaChange&&onMetaChange(metas.map(x=>x.id===m.id?{...x,feito:!x.feito}:x))}
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:12,padding:0,color:m.feito?"#34d399":"#334155",flexShrink:0}}>
                  {m.feito?"☑":"☐"}
                </button>
                <span title={metaPrioridade(m).label} style={{fontSize:10,color:m.feito?T.text4:T.text2,flex:1,borderLeft:`3px solid ${metaPrioridade(m).cor}`,paddingLeft:5,
                  textDecoration:m.feito?"line-through":"none",lineHeight:1.4}}>{m.texto||m}</span>
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

function GasometriaPanel({ data={}, onChange, datas=[], hoje="" }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";
  const [expandidos, setExpandidos] = useState({});
  const CAMPOS_GASO = [
    {k:"ph",   lbl:"pH"},
    {k:"hco3", lbl:"HCO₃", unit:"mEq/L"},
    {k:"pco2", lbl:"pCO₂", unit:"mmHg"},
    {k:"po2",  lbl:"pO₂",  unit:"mmHg"},
    {k:"be",   lbl:"BE",   unit:"mEq/L"},
    {k:"sato2",lbl:"SatO₂",unit:"%"},
  ];
  const CAMPOS_GASO_EXTRA = [
    {k:"na",   lbl:"Na",   unit:"mEq/L"},
    {k:"k",    lbl:"K",    unit:"mEq/L"},
    {k:"ca",   lbl:"Ca",   unit:"mmol/L"},
    {k:"cl",   lbl:"Cl",   unit:"mEq/L"},
    {k:"glic", lbl:"Glic", unit:"mg/dL"},
    {k:"lact", lbl:"Lact", unit:"mmol/L"},
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
        <span style={{fontSize:9,color:"#334155",fontFamily:mono}}>Na/K/Ca/Cl/Glic/Lact/Hb → lançados nos respectivos sistemas</span>
      </div>
      {datas.map(d => {
        const gasos = getGasos(d);
        if(!gasos.length) return null;
        const isHoje2 = d===hoje||d.startsWith(hoje+"T");
        return (
          <div key={d} style={{marginBottom:10}}>
            <div style={{fontSize:9,fontFamily:mono,color:"#334155",marginBottom:4}}>
              {new Date(d+"T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}
            </div>
            {gasos.map(g=>{
              const open = !!expandidos[g.id];
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
                    title="Mais parâmetros (Na/K/Ca/Cl/Glic/Lact/Hb)"
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
              </div>
              );
            })}
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
const CULTURA_TIPOS = ["Hemocultura","AT - Aspirado Traqueal","Urocultura","Swab Retal","Swab Nasal","Líquido Pleural","LCR","Swab Ferida","Outro"];
const CULTURA_STATUS = ["Aguardando","Negativa","Parcial","Resistente","Sensível"];

function CulturasPanel({ culturas=[], onChange }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";
  const [show, setShow] = useState(false);
  const [nova, setNova] = useState({tipo:"Hemocultura",material:"",dataColeta:new Date().toISOString().split("T")[0],status:"Aguardando",resultado:""});

  const adicionar = () => {
    if(!nova.tipo) return;
    onChange([...culturas, {...nova, id:Date.now()+""}]);
    setNova({tipo:"Hemocultura",material:"",dataColeta:new Date().toISOString().split("T")[0],status:"Aguardando",resultado:""});
    setShow(false);
  };

  const atualizar = (id, field, val) => onChange(culturas.map(c=>c.id===id?{...c,[field]:val}:c));
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
            <select value={nova.tipo} onChange={e=>setNova(n=>({...n,tipo:e.target.value}))}
              style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 8px",color:"#e2e8f0",fontSize:12}}>
              {CULTURA_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Material (ex: periférico, cateter)" value={nova.material}
              onChange={e=>setNova(n=>({...n,material:e.target.value}))}
              style={{flex:1,minWidth:120,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 8px",color:"#e2e8f0",fontSize:12}}/>
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
            <div style={{fontSize:11,color:"#cbd5e1",fontWeight:600}}>{c.tipo}{c.material?` — ${c.material}`:""}</div>
            <div style={{fontSize:10,color:"#64748b",fontFamily:mono}}>{c.dataColeta&&new Date(c.dataColeta+"T00:00:00").toLocaleDateString("pt-BR")}</div>
          </div>
          <select value={c.status} onChange={e=>atualizar(c.id,"status",e.target.value)}
            style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${corStatus(c.status)}40`,borderRadius:5,
              padding:"3px 6px",color:corStatus(c.status),fontSize:10,fontFamily:mono,cursor:"pointer"}}>
            {CULTURA_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <input value={c.resultado||""} onChange={e=>atualizar(c.id,"resultado",e.target.value)}
            placeholder="Resultado..."
            style={{flex:2,minWidth:120,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:5,padding:"3px 7px",color:"#e2e8f0",fontSize:11}}/>
          <button onClick={()=>remover(c.id)}
            style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:13}}>✕</button>
        </div>
      ))}
    </div>
  );
}



// ── MiniBombas — drogas de bomba embedadas dentro de cada SysB ───────────────
function MiniBombas({ title="BOMBAS", drogaKeys=[], peso, vazoes={}, onVazaoChange, config={} }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";
  const getConf = (k) => DROGAS_PROTOCOLO[k]||(config?.drogasCustom||[]).find(d=>d.key===k)||null;
  const fmtDose = (d) => {
    const n=parseFloat(d); if(isNaN(n)) return d;
    if(n<0.001) return n.toExponential(2); if(n<0.01) return n.toFixed(4);
    if(n<1) return n.toFixed(3); return n.toFixed(2);
  };

  // chips de drogas disponíveis (que ainda não têm vazão)
  const comVazao = drogaKeys.filter(k=>vazoes[k]&&parseFloat(vazoes[k])>0);
  const semVazao = drogaKeys.filter(k=>!vazoes[k]||parseFloat(vazoes[k])<=0);
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
        const res=conf&&mlh?calcDoseFromMLH(k,mlh,peso,undefined,conf.modoCalcDefault,config):null;
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
const SysB = ({id, sigla, label, color, txtFn, children, opcionais=[], adicionaveis=[], camposVisiveis, setCamposVisiveis, statusFields=[], customFields=[], onAddCustomField, onUpdateCustomField, onRemoveCustomField, controlledOpen, onRequestOpen, reviewMode=false}) => {
  const T=useTheme();
  const [localOpen,setLocalOpen]=useState(true);
  const open = controlledOpen===undefined ? localOpen : controlledOpen;
  const [showAdd,setShowAdd]=useState(false);
  const [preview,setPreview]=useState(null); // null=fechado, string=texto editável
  const [cp2,setCp2]=useState(false);
  const vis = camposVisiveis || {};
  const toggle = (key) => setCamposVisiveis && setCamposVisiveis(prev=>({...prev,[key]:!prev[key]}));
  const adicionaveisNaoAtivos = adicionaveis.filter(a=>!vis[`add_${id}_${a.key}`]);
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
        {open&&<button onClick={abrirPreview}
          style={{margin:"4px 2px",padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600,
            background:preview!==null?"rgba(251,191,36,0.15)":T.bgInput,
            border:`1px solid ${preview!==null?"rgba(217,119,6,0.55)":T.border}`,
            color:preview!==null?"#d97706":T.text3,cursor:"pointer",fontFamily:"inherit"}}
          title="Ver e editar o texto que será copiado">
          {preview!==null?"✕":"👁"}
        </button>}
        {open&&<button onClick={copiar}
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
          {adicionaveisNaoAtivos.map(a=>(
            <button key={a.key} onClick={()=>{toggle(`add_${id}_${a.key}`);setShowAdd(false);}}
              style={{padding:"2px 9px",borderRadius:12,border:"1px solid rgba(167,139,250,0.3)",background:"rgba(167,139,250,0.08)",color:"#a78bfa",cursor:"pointer",fontSize:11}}>
              + {a.label}
            </button>
          ))}
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

// Row/Col já existem no escopo de módulo (definidos mais acima, usados por SysBlock) — reaproveitados aqui, não redeclarados.
const FL=({children})=>{const T=useTheme();return <div style={{fontSize:10,color:T.text3,fontFamily:mono,letterSpacing:1,marginBottom:3}}>{children}</div>;};
const ClinicalGroup=({label,color="#64748b",children})=>{const T=useTheme();return <section className="clinical-group" style={{marginBottom:10}}>
  <div style={{display:"flex",alignItems:"center",gap:8,margin:"2px 0 7px",fontSize:9,color:T.colorScheme==="light"?T.text2:color,fontFamily:mono,letterSpacing:1.5,fontWeight:700}}>
    <span>{label}</span><span style={{height:1,flex:1,background:T.colorScheme==="light"?T.border:`${color}25`}}/>
  </div>
  {children}
</section>;};

function EvolucaoEditor({ leito, campos, onCampoEdit, config={}, tabelaHoje={}, tabelaDataLeito={}, onMetaChange, metas=[], onLeitoChange }) {
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
    if(get("reVM"))    p.push(`- Ventilação: ${get("reVM")}`);
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
    if(get("rmTRS"))  p.push(`- TRS: ${get("rmTRS")}`);
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
      if(d.tipo==="parenteral"&&d.suplementacaoNPT) dl+=` · suplementação: ${d.suplementacaoNPT}`;
      if(d.volTotal24) dl+=` ${d.volTotal24}mL/24h`;
      if(d.kcalManual&&peso) dl+=` (${(parseFloat(d.kcalManual)/peso).toFixed(1)} kcal/kg/d`;
      else if(d.catalogId&&d.volTotal24){
        // recalculate inline
      }
      if(d.ptnManual&&peso)  dl+=` / ${(parseFloat(d.ptnManual)/peso).toFixed(2)} g ptn/kg/d)`;
      p.push(`- ${dl}`);
    }else if(d?.tipo==="jejum") p.push(`- Dieta: Jejum`);
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
    if(get("probAtivos"))    p.push(`ATIVOS:\n${get("probAtivos")}`);
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
    {const NK=["propofol","midazolam","fentanil","cetamina","precedex","morfina","clonidina"];
    const vz=leito.drogasVazao||{};const fD=d=>{const n=parseFloat(d);if(isNaN(n))return d;return n<1?n.toFixed(3):n.toFixed(2);};
    const nd=NK.filter(k=>vz[k]&&parseFloat(vz[k])>0).map(k=>{
      const cf=DROGAS_PROTOCOLO[k]||(config?.drogasCustom||[]).find(d=>d.key===k);
      const rs=cf?calcDoseFromMLH(k,vz[k],leito.peso,undefined,cf.modoCalcDefault,config):null;
      return `${cf?.label||k} ${vz[k]}mL/h${rs?` (≈${fD(rs.dose)} ${rs.label})`:""}`;
    });if(nd.length)p.push(`- Sedação/Analgesia (bombas): ${nd.join(" · ")}`);}
    if(vis.add_n_interconsulta&&getExtra("add_n_interconsulta")) p.push(`- IC: ${getExtra("add_n_interconsulta")}`);
    if(vis.add_n_exames&&getExtra("add_n_exames")) p.push(`- Exames: ${getExtra("add_n_exames")}`);
    if(vis.add_n_pocus&&getExtra("add_n_pocus")) p.push(`- POCUS: ${getExtra("add_n_pocus")}`);
    if(vis.nObs&&get("nObs")) p.push(`*${get("nObs")}`);
    p.push(...customLines("n"));
    return p.join("\n");
  };
  const txtCvFull = () => {
    const p=[];
    // DVA drogas de bomba
    {const CK=["noradrenalina","adrenalina","dobutamina","levossimendana","vasopressina","nitroglicerina","nitroprussiato","amiodarona","furosemida"];
    const vz=leito.drogasVazao||{};const fD=d=>{const n=parseFloat(d);if(isNaN(n))return d;return n<0.01?n.toFixed(4):n<1?n.toFixed(3):n.toFixed(2);};
    const cd=CK.filter(k=>vz[k]&&parseFloat(vz[k])>0).map(k=>{
      const cf=DROGAS_PROTOCOLO[k]||(config?.drogasCustom||[]).find(d=>d.key===k);
      const rs=cf?calcDoseFromMLH(k,vz[k],leito.peso,undefined,cf.modoCalcDefault,config):null;
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
    if(vis.add_cv_pocus&&getExtra("add_cv_pocus")) p.push(`- POCUS: ${getExtra("add_cv_pocus")}`);
    if(vis.add_cv_picco&&getExtra("add_cv_picco")) p.push(`- PiCCO: ${getExtra("add_cv_picco")}`);
    if(vis.add_cv_swan&&getExtra("add_cv_swan")) p.push(`- Swan-Ganz: ${getExtra("add_cv_swan")}`);
    if(vis.add_cv_interconsulta&&getExtra("add_cv_interconsulta")) p.push(`- IC: ${getExtra("add_cv_interconsulta")}`);
    if(vis.cvObs&&get("cvObs")) p.push(`*${get("cvObs")}`);
    p.push(...customLines("cv"));
    return p.join("\n");
  };
  const txtResFull = () => {
    const p=[];
    // Ventilação: nebulização incluída
    const nebTxt = (leito.nebMed||leito.nebFreq) ? ` | Neb: ${[leito.nebMed,leito.nebFreq].filter(Boolean).join(" ")}` : "";
    if(get("reVM")) p.push(`- Ventilação: ${get("reVM")}${nebTxt}`);
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
    if(vis.reLUS&&get("reLUS")) p.push(`- LUS: ${get("reLUS")}`);
    if(vis.rePocus&&get("rePocus")) p.push(`- POCUS: ${get("rePocus")}`);
    if(vis.add_res_interconsulta&&getExtra("add_res_interconsulta")) p.push(`- IC: ${getExtra("add_res_interconsulta")}`);
    if(vis.reObs&&get("reObs")) p.push(`*${get("reObs")}`);
    p.push(...customLines("res"));
    return p.join("\n");
  };
  const txtReMeFull = () => {
    const p=[];
    if(get("rm24h"))  p.push(`- 24h: ${get("rm24h")}`);
    if(get("rmLabs")) p.push(`- Labs: ${get("rmLabs")}`);
    if(vis.rmTRS&&get("rmTRS")) p.push(`- TRS: ${get("rmTRS")}`);
    if(vis.add_reme_interconsulta&&getExtra("add_reme_interconsulta")) p.push(`- IC: ${getExtra("add_reme_interconsulta")}`);
    if(vis.rmObs&&get("rmObs")) p.push(`*${get("rmObs")}`);
    p.push(...customLines("reme"));
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
      if(d.tipo==="parenteral"&&d.suplementacaoNPT) dl+=` · suplementação: ${d.suplementacaoNPT}`;
      p.push(dl);
    } else if(d?.tipo==="jejum") p.push(`- Dieta: Jejum`);
    if(get("tgEF"))  p.push(`- EF: ${get("tgEF")}`);
    if(get("tg24h")) p.push(`- 24h: ${get("tg24h")}`);
    const _ultEvac=get("tgUltEvac")||leito.tgUltEvac;
    const _lamg=get("tgLAMG")||leito.tgLAMG;
    if(_ultEvac){const dx=Math.floor((new Date()-new Date(_ultEvac+"T00:00:00"))/86400000);p.push(`- Última evacuação: ${dx}d atrás`);}
    if(_lamg) p.push(`- LAMG: ${_lamg}`);
    if(get("tgLaxativos")) p.push(`- Laxativos: ${get("tgLaxativos")}`);
    if(get("tgLabs")) p.push(`- Labs: ${get("tgLabs")}`);
    if(vis.tgPocus&&get("tgPocus")) p.push(`- POCUS: ${get("tgPocus")}`);
    if(vis.add_tgi_interconsulta&&getExtra("add_tgi_interconsulta")) p.push(`- IC: ${getExtra("add_tgi_interconsulta")}`);
    if(vis.add_tgi_exames&&getExtra("add_tgi_exames")) p.push(`- Exames: ${getExtra("add_tgi_exames")}`);
    if(vis.tgObs&&get("tgObs")) p.push(`*${get("tgObs")}`);
    p.push(...customLines("tgi"));
    return p.join("\n");
  };
  const txtHeFull = () => {
    const p=[];
    if(get("heLabs")) p.push(`- Labs: ${get("heLabs")}`);
    if(get("heProf")) p.push(`- Profilaxia TEV: ${get("heProf")}`);
    if(vis.add_he_interconsulta&&getExtra("add_he_interconsulta")) p.push(`- IC: ${getExtra("add_he_interconsulta")}`);
    if(vis.add_he_exames&&getExtra("add_he_exames")) p.push(`- Exames: ${getExtra("add_he_exames")}`);
    if(vis.heObs&&get("heObs")) p.push(`*${get("heObs")}`);
    p.push(...customLines("he"));
    return p.join("\n");
  };
  const txtInFull = () => {
    const p=[];
    if(get("heTemp")) p.push(`- Temperatura: ${get("heTemp")}`);
    if(vis.inProf&&get("heMed")) p.push(get("heMed"));
    if(get("heAtb"))      p.push(get("heAtb"));
    // Auto-build culturas text from leito.culturas
    const cText = (()=>{
      const cs = leito.culturas||[];
      if(!cs.length) return "";
      return cs.map(c=>{
        const tipo=(CULTURA_TIPOS.find(x=>x.id===c.tipo)||{lbl:c.tipo||""}).lbl;
        const data=c.dataColeta?new Date(c.dataColeta+"T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}):"";
        const hdr=`${tipo}${c.material?" ("+c.material+")":""} ${data}`;
        const germes=(c.germes||[]).map(g=>{let t=g.nome||"";if(g.ufc)t+=`, ${g.ufc} UFC/mL`;if(g.resistencia)t+=`, ${g.resistencia}`;return t;}).filter(Boolean).join("; ");
        return `${hdr}: ${germes||c.resultado||"aguardando resultado"}`;
      }).join("\n");
    })();
    if(cText) p.push(`- Culturas:\n${cText}`);
    if(vis.add_in_interconsulta&&getExtra("add_in_interconsulta")) p.push(`- IC: ${getExtra("add_in_interconsulta")}`);
    if(vis.add_in_exames&&getExtra("add_in_exames")) p.push(`- Exames: ${getExtra("add_in_exames")}`);
    if(vis.inObs&&getExtra("inObs")) p.push(`*${getExtra("inObs")}`);
    p.push(...customLines("in"));
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
        <div style={{marginBottom:10,border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,overflow:"hidden"}}>
          <div style={{background:"rgba(255,255,255,0.03)",padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:3,height:16,background:"#94a3b8",borderRadius:2,flexShrink:0}}/>
            <span style={{fontSize:12,fontWeight:700,color:"#94a3b8",fontFamily:mono,letterSpacing:1.5}}>== Ctx:</span>
            <span style={{fontSize:12,color:"#475569",fontWeight:400}}>Diagnóstico · Procedimentos · Dispositivos</span>
          </div>
          <div style={{padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,0.05)",display:"flex",flexDirection:"column",gap:8}}>
            {leito.diagnostico && (
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <span style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,flexShrink:0}}>DIAGNÓSTICO</span>
                <span style={{fontSize:13,color:"#e2e8f0",fontWeight:600}}>{leito.diagnostico}</span>
              </div>
            )}
            {(leito.procedimentos||[]).length>0 && (
              <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,flexShrink:0}}>PROCEDIMENTOS</span>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {(leito.procedimentos||[]).map(p=>{
                    const po=Math.floor((new Date()-new Date(p.data+"T00:00:00"))/86400000);
                    const cor=po<=0?"#f87171":po<=3?"#fb923c":po<=7?"#fbbf24":"#34d399";
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
                    return <span key={i} style={{fontSize:11,fontFamily:mono,color:al?"#f87171":"#94a3b8",background:al?"rgba(248,113,113,0.08)":"rgba(255,255,255,0.04)",border:`1px solid ${al?"rgba(248,113,113,0.25)":"rgba(255,255,255,0.08)"}`,borderRadius:6,padding:"2px 10px"}}>
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
        opcionais={[{key:"n24h",label:"Controles 24h"},{key:"nEFExtra",label:"EF — Detalhe adicional"},{key:"nPsiq",label:"Psicoativos"},{key:"nObs",label:"Obs"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."},{key:"pocus",label:"POCUS"}]}
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
          peso={leito.peso} vazoes={leito.drogasVazao||{}} config={config}
          onVazaoChange={(k,v)=>onLeitoChange&&onLeitoChange({...leito,drogasVazao:{...(leito.drogasVazao||{}),[k]:v}})}/>
        </ClinicalGroup>
        {vis["nPsiq"]&&<Row><Col><FL>PSICOATIVOS</FL><TA fieldRef={refs.nPsiq} defaultValue={campos.nPsiq} isAntigo={isAntigo("nPsiq")} rows={2} fieldName="nPsiq" onBlurSave={salvar}/></Col></Row>}
        {vis["add_n_interconsulta"]&&<Row><Col><FL>INTERCONSULTA</FL><TA fieldRef={ExtraRef("add_n_interconsulta")} defaultValue={campos["add_n_interconsulta"]} isAntigo={isAntigo("add_n_interconsulta")} rows={2} fieldName="add_n_interconsulta" onBlurSave={salvar}/></Col></Row>}
        {vis["add_n_exames"]&&<Row><Col><FL>EXAMES COMPLEMENTARES</FL><TA fieldRef={ExtraRef("add_n_exames")} defaultValue={campos["add_n_exames"]} isAntigo={isAntigo("add_n_exames")} rows={2} fieldName="add_n_exames" onBlurSave={salvar}/></Col></Row>}
        {vis["add_n_pocus"]&&<Row><Col><FL>POCUS</FL><TA fieldRef={ExtraRef("add_n_pocus")} defaultValue={campos["add_n_pocus"]} isAntigo={isAntigo("add_n_pocus")} rows={2} fieldName="add_n_pocus" onBlurSave={salvar}/></Col></Row>}
        {vis["nObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.nObs} defaultValue={campos.nObs} isAntigo={isAntigo("nObs")} rows={2} fieldName="nObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="cv" sigla="== Cv:" label="Cardiovascular" color={"#f87171"} txtFn={txtCvFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"cvMed",label:"Medicações"},{key:"cvTropo",label:"Troponina"},{key:"cvDeltaCO2",label:"ΔCO₂/ΔPP"},{key:"cvObs",label:"Obs"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."},{key:"pocus",label:"POCUS"},{key:"picco",label:"PiCCO"},{key:"swan",label:"Swan-Ganz"}]}
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
            <FL>EF Cardiovascular (outros)</FL>
            <TA fieldRef={refs.cvEF} defaultValue={campos.cvEF} isAntigo={isAntigo("cvEF")} rows={2} fieldName="cvEF" onBlurSave={salvar}/>
          </Col>
        </Row>
        </ClinicalGroup>
                {/* ── DVA / Bombas Cardiovasculares ── */}
        <ClinicalGroup label="TRATAMENTO E SUPORTE" color="#f87171">
        {onLeitoChange&&<MiniBombas title="DVA / BOMBAS CARDIOVASCULARES"
          drogaKeys={["noradrenalina","adrenalina","dobutamina","levossimendana","vasopressina","nitroglicerina","nitroprussiato","amiodarona","furosemida"]}
          peso={leito.peso} vazoes={leito.drogasVazao||{}} config={config}
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
      {vis["cvDeltaCO2"]&&<Row>
        <Col><FL>ΔCO₂ — Gap venoarterial</FL>
          <input defaultValue={campos.cvDeltaCO2||""}
            placeholder="mmHg (normal < 6)" onBlur={e=>salvar("cvDeltaCO2",e.target.value)}
            style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12,fontFamily:mono}}/></Col>
        <Col><FL>ΔPP — Var. pressão de pulso</FL>
          <input defaultValue={campos.cvDeltaPP||""}
            placeholder="% (responde > 13%)" onBlur={e=>salvar("cvDeltaPP",e.target.value)}
            style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,padding:"7px 10px",color:"#e2e8f0",fontSize:12,fontFamily:mono}}/></Col>
      </Row>}
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
        {vis["add_cv_interconsulta"]&&<Row><Col><FL>INTERCONSULTA</FL><TA fieldRef={ExtraRef("add_cv_interconsulta")} defaultValue={campos["add_cv_interconsulta"]||""} sugestao="Cardiologia 29/04: Eco TT marcado" rows={1} fieldName="add_cv_interconsulta" onBlurSave={salvar}/></Col></Row>}
        {vis["add_cv_exames"]&&<Row><Col><FL>EXAMES COMPLEMENTARES</FL><TA fieldRef={ExtraRef("add_cv_exames")} defaultValue={campos["add_cv_exames"]||""} sugestao="ECG 29/04: RS, sem alterações" rows={1} fieldName="add_cv_exames" onBlurSave={salvar}/></Col></Row>}
        {vis["add_cv_pocus"]&&<Row><Col><FL>POCUS</FL><TA fieldRef={ExtraRef("add_cv_pocus")} defaultValue={campos["add_cv_pocus"]||""} sugestao="POCUS 29/04: FE ~50%, sem derrame" rows={1} fieldName="add_cv_pocus" onBlurSave={salvar}/></Col></Row>}
        {vis["add_cv_picco"]&&<Row><Col><FL>PiCCO</FL><TA fieldRef={ExtraRef("add_cv_picco")} defaultValue={campos["add_cv_picco"]||""} sugestao="IC 2,8 / GEDVI 720 / EVLWI 8" rows={1} fieldName="add_cv_picco" onBlurSave={salvar}/></Col></Row>}
        {vis["add_cv_swan"]&&<Row><Col><FL>SWAN-GANZ</FL><TA fieldRef={ExtraRef("add_cv_swan")} defaultValue={campos["add_cv_swan"]||""} sugestao="PCP 15 / DC 4,2 / RVS 1200" rows={1} fieldName="add_cv_swan" onBlurSave={salvar}/></Col></Row>}
        {vis["cvObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.cvObs} defaultValue={campos.cvObs} isAntigo={isAntigo("cvObs")} sugestao="Eco beira-leito amanhã" rows={1} fieldName="cvObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="res" sigla="== Res:" label="Respiratório" color={"#38bdf8"} txtFn={txtResFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"rePocus",label:"POCUS Pulmonar"},{key:"reLUS",label:"LUS"},{key:"reObs",label:"Obs"}]}
        adicionaveis={[{key:"exames",label:"Exames Compl."},{key:"outro",label:"+ outro"}]}
        statusFields={[{label:"Modo de suporte",value:leito.vm_modo},{label:"EF — Ausculta",value:campos.reEF}]} {...customProps("res")}>
        {/* ── Suporte Ventilatório ── */}
        <ClinicalGroup label="SUPORTE VENTILATÓRIO" color="#38bdf8">
        {onLeitoChange&&<VentilacaoPanel leito={leito} onChange={onLeitoChange} integrated/>}
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
        {vis["add_res_exames"]&&<Row><Col><FL>EXAMES COMPLEMENTARES</FL><TA fieldRef={ExtraRef("add_res_exames")} defaultValue={campos["add_res_exames"]||""} sugestao="Rx tórax 29/04: sem novidades" rows={1} fieldName="add_res_exames" onBlurSave={salvar}/></Col></Row>}
        {vis["add_res_outro"]&&<Row><Col><FL>OUTRO</FL><TA fieldRef={ExtraRef("add_res_outro")} defaultValue={campos["add_res_outro"]||""} rows={1} fieldName="add_res_outro" onBlurSave={salvar}/></Col></Row>}
        {vis["reObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.reObs} defaultValue={campos.reObs} isAntigo={isAntigo("reObs")} sugestao="Tentar reduzir PS amanhã" rows={1} fieldName="reObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="reme" sigla="== ReMe:" label="Renal / Metabólico" color={"#34d399"} txtFn={txtReMeFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"rmTRS",label:"TRS"},{key:"rmObs",label:"Obs"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"}]}
        statusFields={[{label:"24h — HD/BH",value:campos.rm24h},{label:"Labs renais",value:campos.rmLabs}]} {...customProps("reme")}>
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
        <Row><Col><FL>24h — HD · BH</FL><TA fieldRef={refs.rm24h} defaultValue={campos.rm24h} isAntigo={isAntigo("rm24h")} sugestao="HD 3000 / BH +1084 > +1508" rows={1} fieldName="rm24h" onBlurSave={salvar}/></Col></Row>
        <Row><Col><FL>Labs — Cr · Ur · K · Na · Cai · Mg · P</FL><TA fieldRef={refs.rmLabs} defaultValue={campos.rmLabs} isAntigo={isAntigo("rmLabs")} sugestao="Cr 1,56 > 1,27 / Ur 66 > 47 / K 4,2 > 4,1 / Na 143 > 141" rows={1} fieldName="rmLabs" onBlurSave={salvar}/></Col></Row>
        </ClinicalGroup>
        {vis["rmTRS"]&&<ClinicalGroup label="TERAPIA RENAL SUBSTITUTIVA" color="#34d399"><Row><Col><FL>TRS</FL><TA fieldRef={refs.rmTRS} defaultValue={campos.rmTRS} isAntigo={isAntigo("rmTRS")} sugestao="CRRT citrato 150ml/h" rows={1} fieldName="rmTRS" onBlurSave={salvar}/></Col></Row></ClinicalGroup>}
        {vis["add_reme_interconsulta"]&&<Row><Col><FL>INTERCONSULTA</FL><TA fieldRef={ExtraRef("add_reme_interconsulta")} defaultValue={campos["add_reme_interconsulta"]||""} sugestao="Nefrologia 29/04: avaliou TRS — manter CRRT" rows={1} fieldName="add_reme_interconsulta" onBlurSave={salvar}/></Col></Row>}
        {vis["rmObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.rmObs} defaultValue={campos.rmObs} isAntigo={isAntigo("rmObs")} sugestao="Repor K se < 3,5" rows={1} fieldName="rmObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="tgi" sigla="== TGI:" label="Gastrointestinal" color={"#fb923c"} txtFn={txtTGIFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"tgLabs",label:"Labs hepáticos"},{key:"tgPocus",label:"POCUS Abdominal"},{key:"tgObs",label:"Obs"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."}]}
        statusFields={[{label:"Via/Dieta",value:leito.dieta?.tipo},{label:"Última evacuação",value:campos.tgUltEvac}]} {...customProps("tgi")}>
                {/* ── Dieta ── */}
        <ClinicalGroup label="NUTRIÇÃO E TERAPIA" color="#fb923c">
        {onLeitoChange&&<DietaPanel dados={leito} config={config} onChange={onLeitoChange} integrated
          diureseHojeVol={(()=>{const v=tabelaHoje?.c24_diet_vol;return v?parseFloat(v):0;})()}/>}
        {!onLeitoChange&&leito.dieta?.tipo&&<div style={{padding:"6px 10px",background:"rgba(251,146,60,0.05)",borderRadius:7,marginBottom:8,fontSize:11,color:"#94a3b8"}}>
          🍽 {leito.dieta.tipo} {leito.dieta.formula} {leito.dieta.vazao&&`@ ${leito.dieta.vazao} mL/h`}
        </div>}
        </ClinicalGroup>
        <ClinicalGroup label="AVALIAÇÃO E MONITORIZAÇÃO" color="#fb923c">
        <div style={{padding:"12px 14px",border:"1px solid rgba(251,146,60,.22)",borderRadius:12,background:"linear-gradient(135deg,rgba(251,146,60,.055),rgba(251,146,60,.015))"}}>
        <Row>
          <Col><FL>Última evacuação</FL>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <input type="date" value={campos.tgUltEvac||""} onChange={e=>onCampoEdit("tgUltEvac",e.target.value)}
                style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"5px 8px",color:"#e2e8f0",fontSize:12}}/>
              {campos.tgUltEvac&&<span style={{fontSize:11,color:"#94a3b8",fontFamily:"'DM Mono',monospace"}}>
                {Math.floor((new Date()-new Date(campos.tgUltEvac+"T00:00:00"))/86400000)}d atrás
              </span>}
            </div>
          </Col>
          <Col><PickField label="Laxativos" options={["Sem laxativos","Lactulose","Macrogol","Bisacodil","Enema","Lactulose + Macrogol"]} value={campos.tgLaxativos||""} onChange={v=>onCampoEdit("tgLaxativos",v)} rows={1} placeholder="Digite o esquema..."/></Col>
          <Col><FL>Profilaxia LAMG</FL>
            <select value={campos.tgLAMG||""} onChange={e=>onCampoEdit("tgLAMG",e.target.value)}
              style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"5px 8px",color:"#e2e8f0",fontSize:12,cursor:"pointer"}}>
              <option value="">— sem profilaxia —</option>
              <option value="Omeprazol 40mg EV 1x/d">Omeprazol 40mg EV</option>
              <option value="Esomeprazol 40mg SNE 1x/d">Esomeprazol SNE</option>
              <option value="Omeprazol 80mg EV 1x/d">Omeprazol 80mg EV</option>
              <option value="Pantoprazol 40mg EV 1x/d">Pantoprazol 40mg EV</option>
            </select>
          </Col>
        </Row>
<Row>
          <Col><FL>EF — Abdome</FL><TA fieldRef={refs.tgEF} defaultValue={campos.tgEF} isAntigo={isAntigo("tgEF")} sugestao="Abdômen globoso, flácido, indolor à palpação." rows={2} fieldName="tgEF" onBlurSave={salvar}/></Col>
          <Col><FL>24h — Dex · Evacuação</FL><TA fieldRef={refs.tg24h} defaultValue={campos.tg24h} isAntigo={isAntigo("tg24h")} sugestao="Dex 105 - 167 | última evacuação 21/04" rows={2} fieldName="tg24h" onBlurSave={salvar}/></Col>
        </Row>
        {(vis["tgLabs"]||campos.tgLabs)&&<Row><Col><FL>Labs — TGO · TGP · Bili · FA · GGT · Alb</FL><TA fieldRef={refs.tgLabs} defaultValue={campos.tgLabs} isAntigo={isAntigo("tgLabs")} sugestao="TGO 45 / TGP 32 / BT 1.2 / Alb 2.8" rows={1} fieldName="tgLabs" onBlurSave={salvar}/></Col></Row>}
        </div>
        </ClinicalGroup>
        {vis["add_tgi_interconsulta"]&&<Row><Col><FL>INTERCONSULTA</FL><TA fieldRef={ExtraRef("add_tgi_interconsulta")} defaultValue={campos["add_tgi_interconsulta"]||""} sugestao="Gastro 29/04: endoscopia não indicada no momento" rows={1} fieldName="add_tgi_interconsulta" onBlurSave={salvar}/></Col></Row>}
        {vis["add_tgi_exames"]&&<Row><Col><FL>EXAMES COMPLEMENTARES</FL><TA fieldRef={ExtraRef("add_tgi_exames")} defaultValue={campos["add_tgi_exames"]||""} sugestao="USG abdome 29/04: sem novidades" rows={1} fieldName="add_tgi_exames" onBlurSave={salvar}/></Col></Row>}
        {vis["tgObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.tgObs} defaultValue={campos.tgObs} isAntigo={isAntigo("tgObs")} sugestao="Omeprazol para LAMG" rows={1} fieldName="tgObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="he" sigla="== He:" label="Hematológico" color={"#f59e0b"} txtFn={txtHeFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"heObs",label:"Obs"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."}]}
        statusFields={[{label:"Labs hematológicos",value:campos.heLabs},{label:"Profilaxia TEV",value:campos.heProf}]} {...customProps("he")}>
        <ClinicalGroup label="AVALIAÇÃO E MONITORIZAÇÃO" color="#f59e0b">
        <Row><Col><FL>Labs — Hb · Leuco · Bastões · Plaq</FL><TA fieldRef={refs.heLabs} defaultValue={campos.heLabs} isAntigo={isAntigo("heLabs")} sugestao="7,6 > 7,5 / Leuco 21k > 14k / Bastões 5% > 4% / Plaq 191k > 251k" rows={1} fieldName="heLabs" onBlurSave={salvar}/></Col></Row>
        </ClinicalGroup>
        <ClinicalGroup label="PROFILAXIA TEV" color="#f59e0b"><Row><Col><PickField label="Modalidade" options={["Sem profilaxia TEV","HNF","Enoxaparina 40mg","Enoxaparina 20mg"]} value={campos.heProf||""} onChange={v=>onCampoEdit("heProf",v)} rows={1} placeholder="Digite outra modalidade..."/></Col></Row></ClinicalGroup>
        {vis["add_he_interconsulta"]&&<Row><Col><FL>INTERCONSULTA</FL><TA fieldRef={ExtraRef("add_he_interconsulta")} defaultValue={campos["add_he_interconsulta"]||""} sugestao="Hematologia 29/04: sem indicação de transfusão" rows={1} fieldName="add_he_interconsulta" onBlurSave={salvar}/></Col></Row>}
        {vis["add_he_exames"]&&<Row><Col><FL>EXAMES COMPLEMENTARES</FL><TA fieldRef={ExtraRef("add_he_exames")} defaultValue={campos["add_he_exames"]||""} sugestao="Mielograma solicitado" rows={1} fieldName="add_he_exames" onBlurSave={salvar}/></Col></Row>}
        {vis["heObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.heObs} defaultValue={campos.heObs} isAntigo={isAntigo("heObs")} sugestao="Aguarda cultura / BAAR negativo" rows={1} fieldName="heObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="in" sigla="== In:" label="Infeccioso" color={"#94a3b8"} txtFn={txtInFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"inProf",label:"Profilaxias"},{key:"inObs",label:"Obs"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."}]}
        statusFields={[{label:"Temperatura",value:campos.heTemp},{label:"Antibióticos/Culturas",value:((leito.antibioticos||[]).length>0||(leito.culturas||[]).length>0)?"1":""}]} {...customProps("in")}>

        <ClinicalGroup label="ANTIMICROBIANOS E TRATAMENTO" color="#94a3b8">
        <Row><Col><FL>Temperatura — mín · máx</FL><TA fieldRef={refs.heTemp} defaultValue={campos.heTemp} isAntigo={isAntigo("heTemp")} sugestao="37,2 - 36,2" rows={1} fieldName="heTemp" onBlurSave={salvar}/></Col></Row>
        {vis["inProf"]&&<Row><Col><FL>Profilaxias / Outros medicamentos</FL><TA fieldRef={refs.heMed} defaultValue={campos.heMed} isAntigo={isAntigo("heMed")} sugestao="Bactrim + Ác fólico / Eritropoietina 4000 UI 48/48h" rows={2} fieldName="heMed" onBlurSave={salvar}/></Col></Row>}
                {/* ── Antibioticoterapia ── */}
        {onLeitoChange?(<>
          <AntibioticosPanel
            antibioticos={leito.antibioticos||[]}
            onChange={atbs=>onLeitoChange({...leito,antibioticos:atbs})}
            crSerico={(()=>{const ds=Object.keys(tabelaDataLeito||{}).filter(k=>!k.startsWith("_")).sort().reverse();for(const d of ds){if(tabelaDataLeito[d]?.cr)return tabelaDataLeito[d].cr;}return "";})()}
            peso={leito.peso||""}
            idadeAnos={idadeDoLeito(leito)}
            sexo={leito.sexo||"M"}/>
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
        {vis["add_in_interconsulta"]&&<Row><Col><FL>INTERCONSULTA</FL><TA fieldRef={ExtraRef("add_in_interconsulta")} defaultValue={campos["add_in_interconsulta"]||""} sugestao="ID 29/04: avaliar troca ATB aguardando culturas" rows={1} fieldName="add_in_interconsulta" onBlurSave={salvar}/></Col></Row>}
        {vis["add_in_exames"]&&<Row><Col><FL>EXAMES COMPLEMENTARES</FL><TA fieldRef={ExtraRef("add_in_exames")} defaultValue={campos["add_in_exames"]||""} sugestao="Beta-D-glucana 29/04: pendente" rows={1} fieldName="add_in_exames" onBlurSave={salvar}/></Col></Row>}
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
  const LINKS = [
    {
      emoji:"🔗", cor:"#34d399", bg:"rgba(52,211,153,0.08)", borda:"rgba(52,211,153,0.25)",
      titulo:"MCBEV — Links e Recursos", desc:"Protocolos, guias e materiais da equipe",
      href:"https://linktr.ee/mcbev",
      label:"Abrir Linktree"
    },
    {
      emoji:"🫁", cor:"#38bdf8", bg:"rgba(56,189,248,0.08)", borda:"rgba(56,189,248,0.25)",
      titulo:"Checklist de IOT", desc:"Passo a passo para intubação e via aérea difícil",
      href:"https://docs.google.com/forms/d/e/1FAIpQLSdGRgBUwki8uJGM2_IAEo1oFHiNlR-QIIZzt9a3oRKa11lPHw/viewform?usp=send_form",
      label:"Abrir Checklist"
    },
    {
      emoji:"💊", cor:"#f59e0b", bg:"rgba(245,158,11,0.08)", borda:"rgba(245,158,11,0.25)",
      titulo:"Profilaxia Antibiótica Cirúrgica", desc:"Hospital São Paulo / UNIFESP — Rev. 2024 · Ortopedia, Neuro, GI, Gineco, Cardíaca, Vascular, Transplante...",
      href:"/atb_profilaxia.pdf",
      label:"Abrir PDF"
    },
    {
      emoji:"🫀", cor:"#f87171", bg:"rgba(248,113,113,0.08)", borda:"rgba(248,113,113,0.25)",
      titulo:"Protocolo Pós-op Transplante Hepático", desc:"Rotina de atendimento, prescrição, monitorização e complicações no pós-operatório",
      href:"/tx_hepatico.pdf",
      label:"Abrir PDF"
    },
    {
      emoji:"🧮", cor:"#a78bfa", bg:"rgba(167,139,250,0.08)", borda:"rgba(167,139,250,0.25)",
      titulo:"MDCalc", desc:"Calculadoras médicas, escores (APACHE, SAPS, SOFA, Glasgow...)",
      href:"https://www.mdcalc.com/",
      label:"Abrir Site"
    },
  ];

  return (
    <div style={{padding:"24px", maxWidth:"800px", margin:"0 auto", width:"100%"}}>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:22, fontWeight:700, color:"#e2e8f0", marginBottom:6}}>📚 Links & Protocolos</div>
        <div style={{fontSize:13, color:"#64748b"}}>Acesso rápido a protocolos, checklists e guias da unidade.</div>
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:12}}>
        {LINKS.map((l,i)=>(
          <a key={i} href={l.href} target="_blank" rel="noreferrer" style={{
            textDecoration:"none", padding:"18px 20px",
            background:l.bg, border:`1px solid ${l.borda}`, borderRadius:14,
            color:"#e2e8f0", display:"flex", alignItems:"center", gap:18, transition:"all 0.2s"
          }}>
            <div style={{fontSize:36, flexShrink:0}}>{l.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700, color:l.cor, marginBottom:4, fontSize:15}}>{l.titulo}</div>
              <div style={{fontSize:12, color:"#94a3b8", lineHeight:1.4}}>{l.desc}</div>
            </div>
            <div style={{padding:"8px 16px", borderRadius:8, background:l.bg, border:`1px solid ${l.borda}`, color:l.cor, fontSize:12, fontWeight:700, flexShrink:0}}>
              {l.label} →
            </div>
          </a>
        ))}
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


// ── LeitoCard ─────────────────────────────────────────────────────────────────
function LeitoCard({ leito, selecionado, onClick, onRename, onRemove }) {
  const T = useTheme();
  const dias = diasInternacao(leito.dataInternacao);
  const vago = !leito.paciente;
  const [editingNome, setEditingNome] = useState(false);
  const [nomeTemp, setNomeTemp] = useState(leito.nome);

  const confirmarNome = () => {
    if (nomeTemp.trim()) onRename(nomeTemp.trim());
    setEditingNome(false);
  };

  return (
    <div style={{cursor:"pointer",borderRadius:12,padding:"14px 16px",background:selecionado?T.bgSel:T.bgCard,border:`1.5px solid ${selecionado?T.accent:T.border}`,transition:"all 0.2s",marginBottom:8,boxShadow:selecionado?"none":T.shadowCard}} onClick={e=>{if(!editingNome) onClick();}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
        {editingNome ? (
          <input autoFocus value={nomeTemp}
            onChange={e=>setNomeTemp(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")confirmarNome(); if(e.key==="Escape"){setEditingNome(false);setNomeTemp(leito.nome);}}}
            onBlur={confirmarNome}
            onClick={e=>e.stopPropagation()}
            style={{fontSize:11,fontFamily:mono,letterSpacing:1,color:T.accent,background:T.accentBg,border:`1px solid ${T.accentBorder}`,borderRadius:4,padding:"2px 6px",width:"100%"}}/>
        ) : (
          <span style={{fontSize:11,color:T.text3,fontFamily:mono,letterSpacing:2}}
            onDoubleClick={e=>{e.stopPropagation();setEditingNome(true);setNomeTemp(leito.nome);}}>
            {leito.nome}
          </span>
        )}
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {!editingNome && dias!==null && !vago && <span style={{fontSize:11,color:"#a78bfa",fontWeight:700}}>D{dias}</span>}
          {!editingNome && (
            <button onClick={e=>{e.stopPropagation();setEditingNome(true);setNomeTemp(leito.nome);}}
              title="Renomear leito"
              style={{background:"none",border:"none",color:T.text4,cursor:"pointer",fontSize:11,padding:"0 2px",lineHeight:1}}>✏️</button>
          )}
          {onRemove && (
            <button onClick={e=>{e.stopPropagation();if(confirm(`Remover ${leito.nome}?`))onRemove();}}
              title="Remover leito"
              style={{background:"none",border:"none",color:T.text4,cursor:"pointer",fontSize:11,padding:"0 2px",lineHeight:1}}>🗑️</button>
          )}
        </div>
      </div>
      {vago ? <div style={{fontSize:13,color:T.textDim,marginTop:4,fontStyle:"italic"}}>Vago</div> : <>
        <div style={{fontSize:14,color:T.text1,marginTop:2,fontWeight:600}}>{leito.paciente}</div>
        <div style={{fontSize:12,color:T.text2,marginTop:2}}>{leito.diagnostico}</div>
        {(leito.peso||leito.altura)&&<div style={{fontSize:11,color:T.text3,marginTop:3}}>{leito.peso?`${leito.peso} kg`:""}{leito.peso&&leito.altura?" · ":""}{leito.altura?`${leito.altura} cm`:""}</div>}
        {(leito.procedimentos||[]).length>0&&(
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:5}}>
            {leito.procedimentos.map(p=>{
              const po=Math.floor((new Date()-new Date(p.data+"T00:00:00"))/86400000);
              const cor=po===0?"#f87171":po<=3?"#fb923c":po<=7?"#fbbf24":"#34d399";
              return <span key={p.id} style={{fontSize:10,fontFamily:mono,color:cor,background:`rgba(${po===0?"248,113,113":po<=3?"251,146,60":po<=7?"245,158,11":"52,211,153"},0.1)`,border:`1px solid ${cor}44`,borderRadius:4,padding:"1px 6px"}}>{po===0?"POI":`PO${po}`}</span>;
            })}
          </div>
        )}
        {(() => {
          const d = leito.dispositivos || {};
          const temAlerta =
            DISP_MULTIPLO.some(def=>(Array.isArray(d[def.key])?d[def.key]:[]).some(inst=>{
              const dd=Math.floor((new Date()-new Date(inst.data+"T00:00:00"))/86400000);
              return dd>def.alertaDias;
            })) ||
            DISP_SINGULAR.some(def=>{
              if (!d[def.key]?.ativo||!d[def.key].data) return false;
              const dd=Math.floor((new Date()-new Date(d[def.key].data+"T00:00:00"))/86400000);
              return dd>def.alertaDias;
            }) || (Array.isArray(d.custom)?d.custom:[]).some(inst=>{
              if(!inst.data)return false;const dd=Math.floor((new Date()-new Date(inst.data+"T00:00:00"))/86400000);
              return dd>(inst.alertaDias||21);
            });
          return temAlerta ? <div style={{marginTop:5,fontSize:10,color:"#f87171",fontFamily:mono}}>⚠️ Dispositivo p/ revisão</div> : null;
        })()}
      </>}
    </div>
  );
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
    "RENAL / METABÓLICO":[{k:"rm24h",l:"24h Renal"},{k:"rmLabs",l:"Labs"},{k:"rmTRS",l:"TRS"},{k:"rmObs",l:"Obs"}],
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
    cetamina:"Cetamina (S+)", precedex:"Precedex (Dex)", morfina:"Morfina",
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
                <div key={i} style={{fontSize:11,color:"#cbd5e1"}}>
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
          const trs = h.c24_hd ? `TRS ${h.c24_hd}mL` : null;
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
            <div style={{display:"grid",gridTemplateColumns:"64px repeat(6,1fr) 76px",gap:0,fontSize:9,fontWeight:700,color:"#64748b",fontFamily:mono,letterSpacing:1,padding:"0 2px 6px"}}>
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
                  <div style={{display:"grid",gridTemplateColumns:"64px repeat(6,1fr) 76px",gap:8,alignItems:"start",borderTop:`1px solid ${T.border}`,padding:"9px 2px"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:T.text1}}>{numero}</div>
                      <div style={{fontSize:9,color:T.text3}}>{l.paciente}</div>
                    </div>
                    {cols.map((c,i)=>c ? (
                      <div key={i} style={{fontSize:10,color:"#cbd5e1",lineHeight:1.5,borderLeft:`2px solid ${c.cor}`,paddingLeft:7}}>
                        {c.lines.map((ln,j)=><div key={j}>{ln}</div>)}
                      </div>
                    ) : (
                      <div key={i} style={{fontSize:10,color:"#334155",paddingLeft:7}}>— sem dado —</div>
                    ))}
                    <button onClick={()=>setMetasAbertas(s=>({...s,[l.id]:!s[l.id]}))}
                      style={{fontSize:10,fontFamily:mono,color:pend>0?"#38bdf8":"#475569",fontWeight:700,padding:"4px 6px",borderRadius:6,
                        background:pend>0?"rgba(56,189,248,0.1)":"rgba(255,255,255,0.03)",
                        border:`1px dashed ${pend>0?"rgba(56,189,248,0.4)":"rgba(255,255,255,0.1)"}`,cursor:"pointer",textAlign:"center"}}>
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
                          <span style={{fontSize:10,color:m.feito?"#475569":"#cbd5e1",borderLeft:`3px solid ${metaPrioridade(m).cor}`,paddingLeft:5,textDecoration:m.feito?"line-through":"none",lineHeight:1.4,flex:1}}>{m.texto||m}</span>
                          <button onClick={()=>editarTextoMeta(metasL,m,novas=>onMetaChange(l.id,novas))} title="Editar" style={{background:"none",border:"none",color:"#38bdf8",cursor:"pointer",padding:0}}>✎</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{fontSize:9,color:"#475569",paddingTop:8,borderTop:`1px solid ${T.border}`,marginTop:4}}>
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
function PlantaoPanel({ leitos, tabelaData, metasPorLeito, onMetaChange, config={} }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";
  const [filtro, setFiltro] = useState("todos");
  const [filtroEquipePlantao, setFiltroEquipePlantao] = useState("");

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
              style={{padding:"4px 10px",borderRadius:7,border:`1px solid ${filtro===f?"rgba(56,189,248,0.4)":"rgba(255,255,255,0.1)"}`,
                background:filtro===f?"rgba(56,189,248,0.1)":"rgba(255,255,255,0.03)",
                color:filtro===f?"#38bdf8":"#64748b",cursor:"pointer",fontSize:11}}>
              {f==="todos"?"Todos":"Só pendentes"}
            </button>
          ))}
          <button onClick={()=>window.print()}
            style={{padding:"4px 12px",borderRadius:7,border:"1px solid rgba(52,211,153,0.3)",
              background:"rgba(52,211,153,0.08)",color:"#34d399",cursor:"pointer",fontSize:11,fontWeight:600}}>
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* Filtro por equipe */}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
        <button onClick={()=>setFiltroEquipePlantao("")}
          style={{padding:"4px 12px",borderRadius:10,border:`1px solid ${!filtroEquipePlantao?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.08)"}`,
            background:!filtroEquipePlantao?"rgba(255,255,255,0.1)":"transparent",
            color:!filtroEquipePlantao?"#e2e8f0":"#64748b",cursor:"pointer",fontSize:11,fontWeight:!filtroEquipePlantao?600:400}}>
          Todas equipes
        </button>
        {EQUIPES.map(e=>{
          const cnt = Object.values(metasPorLeito).flat().filter(m=>m.equipe===e.id&&!m.feito&&m.status!=="cumprido").length;
          return (
            <button key={e.id} onClick={()=>setFiltroEquipePlantao(filtroEquipePlantao===e.id?"":e.id)}
              style={{padding:"4px 12px",borderRadius:10,
                border:`1px solid ${filtroEquipePlantao===e.id?e.cor+"80":"rgba(255,255,255,0.08)"}`,
                background:filtroEquipePlantao===e.id?e.cor+"18":"transparent",
                color:filtroEquipePlantao===e.id?e.cor:"#64748b",cursor:"pointer",fontSize:11,
                fontWeight:filtroEquipePlantao===e.id?600:400}}>
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
            <div key={l.id} style={{background:T.bgCard,border:`1px solid ${pendentes.length>0||alerts.length>0?"rgba(248,113,113,0.25)":T.border}`,borderRadius:10,overflow:"hidden"}}>
              <div style={{padding:"8px 12px",background:"rgba(255,255,255,0.02)",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
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
                  <div key={m.id||i} style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:3}}>
                    <MetaPriorityDot meta={m} metas={metas} onChange={novas=>onMetaChange(l.id,novas)}/>
                    <button onClick={()=>{
                      const novas=metas.map(x=>x.id===m.id?{...x,feito:!x.feito}:x);
                      onMetaChange(l.id,novas);
                    }} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:0,
                      color:m.feito?"#34d399":"#334155",flexShrink:0}}>
                      {m.feito?"☑":"☐"}
                    </button>
                    <span style={{fontSize:11,color:m.feito?"#475569":"#cbd5e1",flex:1,borderLeft:`3px solid ${metaPrioridade(m).cor}`,paddingLeft:5,
                      textDecoration:m.feito?"line-through":"none",lineHeight:1.4}}>{m.texto||m}</span>
                    <button onClick={()=>editarTextoMeta(metas,m,novas=>onMetaChange(l.id,novas))} title="Editar meta" style={{background:"none",border:"none",cursor:"pointer",fontSize:10,padding:0,color:"#38bdf8"}}>✎</button>
                    <button onClick={()=>onMetaChange(l.id, metas.filter(x=>x.id!==m.id))}
                      title="Excluir meta"
                      style={{background:"none",border:"none",cursor:"pointer",fontSize:10,padding:0,color:"#475569",flexShrink:0}}>
                      ✕
                    </button>
                  </div>
                )) : alerts.length===0 && (
                  <div style={{fontSize:10,color:"#334155"}}>Sem metas</div>
                )}
                <button onClick={()=>{
                  const txt=window.prompt("Nova meta:");
                  if(txt&&txt.trim()) onMetaChange(l.id,[...metas,{id:Date.now()+"",texto:txt.trim(),feito:false,prioridade:"amarelo"}]);
                }} style={{marginTop:5,width:"100%",padding:"3px 0",background:"rgba(56,189,248,0.06)",
                  border:"1px solid rgba(56,189,248,0.15)",borderRadius:5,color:"#38bdf8",cursor:"pointer",fontSize:10}}>
                  + meta
                </button>
              </div>
            </div>
          );
        })}
      </div>

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
    const cols=["codigo_paciente","leito","sexo","idade_anos","peso_kg","diagnostico","data_internacao","data_alta","destino","arquivado_em"];
    const esc=v=>`"${String(v??"").replace(/"/g,'""')}"`;
    const linhas=arquivos.map(a=>{const l=a.leito||{};return [a.id,l.nome,l.sexo,idadeDoLeito(l),l.peso,l.diagnostico,l.dataInternacao,a.dataAlta,a.destino,a.arquivadoEm].map(esc).join(",");});
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
        <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:10}}><span>Internação: <b>{l.dataInternacao||"—"}</b></span><span>Sexo: <b>{l.sexo||"—"}</b></span><span>Idade: <b>{idadeDoLeito(l)??"—"}</b></span><span>Peso: <b>{l.peso?`${l.peso} kg`:"—"}</b></span><span>Dias de tabela: <b>{Object.keys(a.tabelaClinica||{}).filter(k=>!k.startsWith("_")).length}</b></span></div>
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
  const [leitoSelId, setLeitoSelId] = useState(LEITOS_INICIAIS[0].id);
  const [aba,        setAba]        = useState("paciente");
  const [dadosIA,    setDadosIA]    = useState(null);
  const [evolCampos, setEvolCampos] = useState(EVOLUCAO_VAZIA);
  const [evolVersion, setEvolVersion] = useState(0);
  const [evolPorLeito, setEvolPorLeito] = useState({});
  const [tabelaData, setTabelaData] = useState({});
  const [metasPorLeito, setMetasPorLeito] = useState({});
  const [pacientesArquivados,setPacientesArquivados]=useState([]);
  const [historicoDiario,setHistoricoDiario]=useState({});
  const [historicoAberto,setHistoricoAberto]=useState(false);
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
    try {
      const { data: ld } = await supabase.from("config").select("value").eq("key","leitos_data").single();
      if (ld?.value) {
        const p = JSON.parse(ld.value);
        if (Array.isArray(p) && p.length) {
          const agora=new Date().toISOString();
          const normalizados=p.map(l=>!l.paciente?l:{...l,patientId:l.patientId||(globalThis.crypto?.randomUUID?.()||`pac-${Date.now()}-${l.id}`),admissionId:l.admissionId||(globalThis.crypto?.randomUUID?.()||`adm-${Date.now()}-${l.id}`),admissionStartedAt:l.admissionStartedAt||agora});
          setLeitos(normalizados);
          leitoAtualId = normalizados[0].id;
          setLeitoSelId(normalizados[0].id);
          if(normalizados.some((l,i)=>l!==p[i]))await supabase.from("config").upsert({key:"leitos_data",value:JSON.stringify(normalizados)});
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
          goals:JSON.parse(JSON.stringify(metasPorLeito[l.id]||[])),
        }};novo[l.admissionId]=adm;
      });
      setHistoricoDiario(novo);
      try{await supabase.from("config").upsert({key:"historico_diario",value:JSON.stringify(novo)});}catch(e){console.warn("Falha ao salvar histórico diário",e);}
    },1200);
    return()=>clearTimeout(historicoTimer.current);
  },[leitos,evolPorLeito,tabelaData,metasPorLeito,dataLoaded]);

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

  const leito = leitos.find(l=>l.id===leitoSelId)||leitos[0];
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

  const darAltaPaciente = async () => {
    if(!leito?.paciente) return;
    if(!window.confirm(`Dar alta para ${leito.paciente}?\n\nTodos os dados serão arquivados e o ${leito.nome} ficará livre para um novo paciente.`)) return;
    const destino=window.prompt("Destino após a alta (ex.: enfermaria, domicílio, transferência, óbito):","")||"Não informado";
    const dataAlta=new Date().toISOString().slice(0,10);
    const registro={
      id:(globalThis.crypto?.randomUUID?.()||`alta-${Date.now()}`),dataAlta,destino,arquivadoEm:new Date().toISOString(),
      patientId:leito.patientId||null,admissionId:leito.admissionId||null,
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
    if(leito.admissionId){novoHistorico[leito.admissionId]={...(novoHistorico[leito.admissionId]||{}),admissionId:leito.admissionId,patientId:leito.patientId,status:"discharged",dischargedAt:new Date().toISOString(),outcome:destino,days:{...(novoHistorico[leito.admissionId]?.days||{})}};}
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
      setPacientesArquivados(novoArquivo);setLeitos(novosLeitos);setTabelaData(novaTabela);setEvolPorLeito(novaEvol);setMetasPorLeito(novasMetas);setHistoricoDiario(novoHistorico);
      setEvolCampos(EVOLUCAO_VAZIA);setEvolVersion(v=>v+1);setDadosIA(null);setAba("paciente");
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
    {id:"paciente",      label:"👤 Paciente"},
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
  const alertCount = leitos.filter(l=>l.paciente).reduce((acc,l)=>acc+contarAlertasLeito(l, tabelaData, config), 0);
  const metasPendentes = Object.values(metasPorLeito).flat().filter(m=>!m.feito&&m.status!=="cumprido").length;
  const diasHistorico = leito?.admissionId?Object.keys(historicoDiario[leito.admissionId]?.days||{}).sort():[];

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
        .theme-light .app-sidebar{background:#e1e7ee!important;border-right-color:#94a3b8!important}
        .theme-light .patient-tabs{background:#c7d2df!important;padding:7px 8px 0 18px!important;gap:4px;border-bottom-color:#94a3b8!important}
        .theme-light .patient-tabs.patient-navigation-with-problems{padding-right:296px!important}
        .theme-light .uti-tab-btn{padding:9px 14px!important;border:1px solid transparent!important;border-bottom:0!important;border-radius:9px 9px 0 0!important;color:#475569!important}
        .theme-light .uti-tab-btn:hover{background:rgba(248,250,252,.75)!important;color:#0f172a!important}
        .theme-light .uti-tab-btn[data-active="true"]{background:#f8fafc!important;color:#075985!important;border-color:#94a3b8!important;box-shadow:0 -2px 7px rgba(15,23,42,.10)}
        .theme-light .system-card{border-color:#8493a5!important;border-radius:14px!important;box-shadow:0 4px 12px rgba(15,23,42,.13)!important;background:#f8fafc!important}
        .theme-light .system-card>div:first-child{background:#dbe5ee!important;min-height:44px;border-bottom:1px solid #aebccb}
        .theme-light .system-card-body{background:#f8fafc;padding:16px!important}
        .theme-light .clinical-group{background:#e7edf4;border:1px solid #b8c5d3;border-radius:10px;padding:10px 12px;margin-bottom:12px!important}
        .theme-light .clinical-group:last-child{margin-bottom:0!important}
        .theme-light input:not([type=checkbox]):not([type=radio]):not([type=range]),.theme-light textarea,.theme-light select{background:#fff!important;border-color:#94a3b8!important;color:#0f172a!important}
        .theme-light input:not([type=checkbox]):not([type=radio]):not([type=range]):focus,.theme-light textarea:focus,.theme-light select:focus{border-color:#0284c7!important;box-shadow:0 0 0 2px rgba(2,132,199,.10)}
        .theme-light .mini-bomba-row>span:first-child{color:#334155!important}
        .theme-light .mini-bomba-row>span:nth-of-type(2){color:#0369a1!important}
        .theme-light option{background:#fff;color:#0f172a}
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
          <BrainLogo size={32}/>
          <div>
            <div style={{fontSize:14,fontWeight:700,letterSpacing:0.5,color:T.text1}}>UTI Evolve</div>
            <div style={{fontSize:9,color:T.accent,fontFamily:mono,letterSpacing:2}}>ASSISTENTE DE EVOLUÇÃO</div>
          </div>
        </div>
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
        {(!isMobile || showSidebar) && <div className="app-sidebar" style={{width:railMode?64:228,borderRight:`1px solid ${T.borderAccent}`,padding:railMode?"20px 8px":"20px 14px",overflowY:"auto",background:T.bgSidebar,flexShrink:0,transition:"width 0.18s ease"}}>
          {railMode ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              {leitos.map(l=>{
                const rotulo = (l.nome.match(/\d+/)||[])[0] || l.nome.slice(0,2).toUpperCase();
                return (
                  <button key={l.id}
                    onClick={()=>{if(l.id!==leitoSelId){setDadosIA(null);setEvolCampos(EVOLUCAO_VAZIA);setEvolVersion(0);}setLeitoSelId(l.id);setAba("evolucao");setAba("paciente");setViewGlobal("leitos");}}
                    title={`${l.nome}${l.paciente?" — "+l.paciente:""}`}
                    style={{width:40,height:40,borderRadius:10,background:(l.id===leitoSelId&&viewGlobal==="leitos")?T.accentBg:T.bgCard,border:`1.5px solid ${(l.id===leitoSelId&&viewGlobal==="leitos")?T.accent:T.border}`,color:(l.id===leitoSelId&&viewGlobal==="leitos")?T.accent:T.text3,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:mono,flexShrink:0}}>
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
                const novoNum = leitos.length + 1;
                setLeitos(ls=>{
                  const novo = [...ls,{id:novoId,nome:`Leito ${String(novoNum).padStart(2,"0")}`,paciente:"",diagnostico:"",dataInternacao:"",peso:"",altura:"",sexo:"M",procedimentos:[],dispositivos:{}}];
                  salvarLeitos(novo);
                  return novo;
                });
                setLeitoSelId(novoId);
                setAba("paciente");
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
          {leitos.map((l, idx)=>(
            <div key={l.id} style={{display:"flex",alignItems:"stretch",gap:4,marginBottom:0}}>
              <div style={{display:"flex",flexDirection:"column",gap:2,justifyContent:"center",paddingBottom:8}}>
                <button onClick={()=>{
                  if(idx===0) return;
                  setLeitos(ls=>{const n=[...ls];[n[idx-1],n[idx]]=[n[idx],n[idx-1]];salvarLeitos(n);return n;});
                }} style={{background:"none",border:"none",color:idx===0?"#1e293b":"#475569",cursor:idx===0?"default":"pointer",fontSize:10,padding:"1px 3px",lineHeight:1}}>▲</button>
                <button onClick={()=>{
                  if(idx===leitos.length-1) return;
                  setLeitos(ls=>{const n=[...ls];[n[idx],n[idx+1]]=[n[idx+1],n[idx]];salvarLeitos(n);return n;});
                }} style={{background:"none",border:"none",color:idx===leitos.length-1?"#1e293b":"#475569",cursor:idx===leitos.length-1?"default":"pointer",fontSize:10,padding:"1px 3px",lineHeight:1}}>▼</button>
              </div>
              <div style={{flex:1}}>
                <LeitoCard leito={l} selecionado={l.id===leitoSelId} config={config}
                  onClick={()=>{if(l.id!==leitoSelId){setDadosIA(null);setEvolCampos(EVOLUCAO_VAZIA);setEvolVersion(0);}setLeitoSelId(l.id);setAba("evolucao");setAba("paciente");setViewGlobal("leitos");if(window.innerWidth<=768)setShowSidebar(false);}}
                  onRename={nome=>{setLeitos(ls=>{const novo=ls.map(x=>x.id===l.id?{...x,nome}:x);salvarLeitos(novo);return novo;})}}
                  onRemove={leitos.length>1?()=>{
                    if(l.paciente){window.alert("Este leito possui um paciente. Use “Dar alta” para preservar os dados antes de remover o leito.");return;}
                    setLeitos(ls=>{const novo=ls.filter(x=>x.id!==l.id);salvarLeitos(novo);setLeitoSelId(novo[0].id);return novo;});
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
          {viewGlobal==="ferramentas" ? (
            <div style={{flex:1,overflowY:"auto"}}><FerramentasPanel/></div>
          ) : viewGlobal==="arquivo" ? (
            <div style={{flex:1,overflowY:"auto",background:T.bgPage}}><ArquivoPacientesPanel arquivos={pacientesArquivados}/></div>
          ) : viewGlobal==="visao_geral" ? (
            <div style={{flex:1,overflowY:"auto"}}>
              <VisaoGeralPanel leitos={leitos} tabelaData={tabelaData} metasPorLeito={metasPorLeito} config={config} evolCamposPorLeito={evolPorLeito}
                onLeitoChange={novoLeito=>{setLeitos(ls=>{const novo=ls.map(l=>l.id===novoLeito.id?novoLeito:l);salvarLeitos(novo);return novo;});}}
                onMetaChange={(leitoId, novasMetas)=>{setMetasPorLeito(mp=>{const novo={...mp,[leitoId]:novasMetas};salvarMetas(novo);return novo;});}}/>
            </div>
          ) : viewGlobal==="plantao" ? (
            <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
              <PlantaoPanel
                leitos={leitos} tabelaData={tabelaData} metasPorLeito={metasPorLeito} config={config}
                onMetaChange={(leitoId, novasMetas)=>{
                  setMetasPorLeito(mp=>{const novo={...mp,[leitoId]:novasMetas};salvarMetas(novo);return novo;});
                }}/>
            </div>
          ) : (<>
          {leito.paciente && (
            <div style={{padding:"13px 28px",borderBottom:`1px solid ${T.border}`,background:T.bgCard}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <div style={{fontSize:16,fontWeight:700,color:T.text1}}>{leito.paciente}</div>
                {idadeAnos!==null&&<span style={{fontSize:12,fontFamily:mono,color:"#c084fc",fontWeight:600}}>{idadeAnos}a</span>}
                {(()=>{const tb=tabelaData[leitoSelId]||{};const datas=Object.keys(tb).sort();let acum=0,algum=false;datas.forEach(d=>{const bh=parseFloat(tb[d]?.c24_bh_ac||tb[d]?.c24_bh);if(!isNaN(bh)){acum+=bh;algum=true;}});const prev=parseFloat(leito.bhPrevio||0)||0;const tot=acum+prev;if(!algum&&!prev)return null;const cor=tot>0?"#f87171":tot<0?"#34d399":"#94a3b8";const sig=tot>=0?"+":"";return(<span style={{fontSize:11,fontFamily:mono,color:cor,fontWeight:700,padding:"2px 8px",borderRadius:10,background:`${cor}15`,border:`1px solid ${cor}30`}}>BH {sig}{Math.round(tot).toLocaleString("pt-BR")} mL</span>);})()}
                <button onClick={()=>setHistoricoAberto(true)} title="Abrir histórico e comparar dias" style={{fontSize:10,fontFamily:mono,color:T.accent,padding:"2px 8px",borderRadius:10,background:T.accentBg,border:`1px solid ${T.accentBorder}`,cursor:"pointer"}}>◷ {diasHistorico.length||1} dia{(diasHistorico.length||1)!==1?'s':''} registrado{(diasHistorico.length||1)!==1?'s':''}</button>
                <button onClick={darAltaPaciente} title="Arquivar todos os dados e liberar o leito" style={{marginLeft:"auto",padding:"5px 10px",borderRadius:7,border:"1px solid rgba(251,191,36,.35)",background:"rgba(251,191,36,.08)",color:"#fbbf24",fontSize:11,fontWeight:700,cursor:"pointer"}}>Dar alta</button>
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
              <ConfigPanel config={config} onChange={c=>{setConfig(c);salvarConfig(c);}} onVoltar={()=>setAba("paciente")}/>
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
                    <DrogasCalculadora peso={leito.peso} onLancarDroga={(linha,campo)=>{
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
            ) : aba==="paciente" ? (
              <div><PacientePanel
                dados={leito} onChange={atualizar} config={config}
                onConfigChange={c=>{setConfig(c);salvarConfig(c);}}
                diureseHoje={(()=>{
                  const tb = tabelaData[leitoSelId]||{};
                  const datas = Object.keys(tb).sort().reverse();
                  for (const d of datas) if (tb[d]?.c24_diur) return tb[d].c24_diur;
                  return "";
                })()}
                tabelaHoje={(()=>{
                  const tb = tabelaData[leitoSelId]||{};
                  const datas = Object.keys(tb).sort().reverse();
                  for (const d of datas) if (tb[d]?.c24_diet_vol) return tb[d];
                  return tb[Object.keys(tb).sort().reverse()[0]]||{};
                })()}
                onLancarDroga={(linha, campo)=>{
                  setEvolCamposComPersistencia(c=>({...c, [campo]: c[campo] ? `${c[campo]}\n${linha}` : linha}));
                  setEvolVersion(v=>v+1);
                }}/></div>
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
              onMetaChange={(novas)=>{ setMetasPorLeito(mp=>{const novo={...mp,[leitoSelId]:novas};salvarMetas(novo);return novo;}); }}/>
          )}
        </>)}
        </div>
      </div>
      {historicoAberto&&leito?.admissionId&&<HistoricoDiarioPanel internacao={historicoDiario[leito.admissionId]||{patientName:leito.paciente,days:{}}} onClose={()=>setHistoricoAberto(false)}/>}
    </div>
    </ThemeCtx.Provider>
  );
}

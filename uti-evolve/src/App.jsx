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
  { id:1, nome:"Leito 01", paciente:"", diagnostico:"", dataInternacao:"", dataNascimento:"", peso:"", altura:"", sexo:"M", bhPrevio:"", procedimentos:[], dispositivos:{} },
  { id:2, nome:"Leito 02", paciente:"", diagnostico:"", dataInternacao:"", dataNascimento:"", peso:"", altura:"", sexo:"M", bhPrevio:"", procedimentos:[], dispositivos:{} },
  { id:3, nome:"Leito 03", paciente:"", diagnostico:"", dataInternacao:"", dataNascimento:"", peso:"", altura:"", sexo:"M", bhPrevio:"", procedimentos:[], dispositivos:{} },
  { id:4, nome:"Leito 04", paciente:"", diagnostico:"", dataInternacao:"", dataNascimento:"", peso:"", altura:"", sexo:"M", bhPrevio:"", procedimentos:[], dispositivos:{} },
];

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
    diluicaoDesc:"80 mL (250 mg) em SG5% 170 mL → 250 mL",
    concMcgML: 1000,
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
  const conf = DROGAS_PROTOCOLO[drogaKey];
  if (!conf) return null;
  const conc = concCustom !== undefined ? parseFloat(concCustom) : conf.concMcgML;
  // vasopressina UI
  if (conf.modoCalcDefault === "ui_min" && !modoCustom) {
    const uiMin = mlhN * conf.concUIML / 60;
    return { dose: uiMin.toFixed(4), label: "UI/min" };
  }
  if (!conc || conc <= 0) return null;
  // Modo: config override > modoCustom > default do protocolo
  const modoKey = (config?.drogasModo?.[drogaKey]) || modoCustom || conf.modoCalcDefault;
  const modo = MODOS_CALC[modoKey];
  if (!modo) return null;
  const dose = modo.fn(mlhN, conc, p);
  if (dose === null) return null;
  return { dose, label: modo.label };
}



// ── helpers ──────────────────────────────────────────────────────────────────
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
  bgPage:           "#e8edf4",
  bgCard:           "#ffffff",
  bgCardHover:      "#f8fafc",
  bgSidebar:        "#ffffff",
  bgHeader:         "rgba(255,255,255,0.97)",
  bgInput:          "#f8fafc",
  bgPicker:         "#ffffff",
  bgSel:            "rgba(2,132,199,0.07)",
  text1:            "#0f172a",
  text2:            "#334155",
  text3:            "#64748b",
  text4:            "#94a3b8",
  textDim:          "#cbd5e1",
  border:           "rgba(0,0,0,0.1)",
  borderStrong:     "rgba(0,0,0,0.18)",
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
  const [drogaSel, setDrogaSel] = useState("noradrenalina");
  const [concCustom, setConcCustom] = useState("");
  const [editandoConc, setEditandoConc] = useState(false);
  const [lancado, setLancado]   = useState(false);
  const [infoAberta, setInfoAberta] = useState(null); // key da droga com popup aberto

  // mlh vem do estado persistido por droga
  const mlh = vazoes[drogaSel] || "";
  const setMlh = (val) => onVazaoChange && onVazaoChange(drogaSel, val);

  const conf = DROGAS_PROTOCOLO[drogaSel];
  const modoAtual = (vazoes||{})[`${drogaSel}_modo`] || (config?.drogasModo?.[drogaSel]) || conf.modoCalcDefault;
  const resultado = calcDoseFromMLH(drogaSel, mlh, peso, concCustom !== "" ? parseFloat(concCustom) : undefined, modoAtual, config);
  // Normalize max check: conf.max is in conf.modoCalcDefault unit
  const acimaDose = resultado && conf.max && (() => {
    if (modoAtual === conf.modoCalcDefault) return parseFloat(resultado.dose) > conf.max;
    // convert resultado to default unit for comparison
    const dose = parseFloat(resultado.dose);
    if (modoAtual==="mcg_kg_min" && conf.modoCalcDefault==="mg_kg_h") return dose*60/1000 > conf.max;
    if (modoAtual==="mg_kg_h" && conf.modoCalcDefault==="mcg_kg_min") return dose*1000/60 > conf.max;
    return dose > conf.max;
  })();
  const resBg     = acimaDose ? "rgba(248,113,113,0.1)" : resultado ? "rgba(56,189,248,0.08)" : "rgba(255,255,255,0.04)";
  const resBorder = acimaDose ? "rgba(248,113,113,0.4)" : resultado ? "rgba(56,189,248,0.3)"  : "rgba(255,255,255,0.08)";
  const resCor    = acimaDose ? "#f87171" : resultado ? "#38bdf8" : "#475569";

  const porGrupo = Object.entries(DROGAS_PROTOCOLO).reduce((acc,[k,v])=>{
    (acc[v.grupo]||(acc[v.grupo]=[])).push([k,v]); return acc;
  },{});

  const fmtDose = (d) => {
    const n = parseFloat(d);
    if (isNaN(n)) return d;
    if (n < 0.001) return n.toExponential(2);
    if (n < 0.01)  return n.toFixed(4);
    if (n < 1)     return n.toFixed(3);
    return n.toFixed(2);
  };

  // Mapeia grupo → campo da evolução
  const CAMPO_EVOLUCAO = {
    vasoativa: "cvDVA",
    sedacao:   "nSeda",
    analgesia: "nAnalg",
  };

  const lancarNaEvolucao = () => {
    if (!resultado || !onLancarDroga) return;
    const dose = `${fmtDose(resultado.dose)} ${resultado.label}`;
    const kcalProp = drogaSel==="propofol" && parseFloat(mlh) > 0
      ? ` · ${(parseFloat(mlh)*1.1).toFixed(0)} kcal/h`
      : "";
    const linha = `${conf.label} ${mlh}mL/h (${dose})`;
    const campo = CAMPO_EVOLUCAO[conf.grupo] || "cvDVA";
    onLancarDroga(linha, campo);
    setLancado(true);
    setTimeout(()=>setLancado(false), 2000);
  };

  return (
    <div>
      <div style={{fontSize:12,color:"#64748b",marginBottom:12}}>
        Informe a <strong style={{color:"#e2e8f0"}}>vazão da bomba (mL/h)</strong> — o sistema calcula a dose com base na diluição padrão do protocolo.
      </div>
      {Object.entries(porGrupo).map(([grupo, drogas])=>(
        <div key={grupo} style={{marginBottom:10}}>
          <div style={{fontSize:9,color:"#475569",fontFamily:mono,letterSpacing:2,marginBottom:5,textTransform:"uppercase"}}>{GRUPOS[grupo]||grupo}</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {drogas.map(([key,d])=>{
              const temVazao = !!(vazoes[key]);
              const isSel = drogaSel===key;
              const infoOpen = infoAberta===key;
              return (
                <div key={key} style={{position:"relative"}}>
                  <div style={{display:"flex",border:`1px solid ${isSel?"#38bdf8":temVazao?"rgba(251,146,60,0.6)":"rgba(255,255,255,0.1)"}`,borderRadius:20,background:isSel?"rgba(56,189,248,0.14)":temVazao?"rgba(251,146,60,0.1)":"rgba(255,255,255,0.02)",overflow:"hidden"}}>
                    <button onClick={()=>{setDrogaSel(key);setConcCustom("");setEditandoConc(false);}}
                      style={{padding:"5px 10px 5px 11px",background:"none",border:"none",color:isSel?"#38bdf8":temVazao?"#fb923c":"#64748b",fontSize:11,cursor:"pointer",fontFamily:mono,display:"flex",alignItems:"center",gap:5}}>
                      {d.label}
                      {temVazao && <span style={{fontSize:10,fontWeight:700}}>{vazoes[key]}mL/h</span>}
                    </button>
                    {d.doseInfo && (
                      <button onClick={e=>{e.stopPropagation();setInfoAberta(infoOpen?null:key);}}
                        style={{padding:"0 7px",background:infoOpen?"rgba(167,139,250,0.2)":"none",border:"none",borderLeft:`1px solid ${isSel?"rgba(56,189,248,0.3)":"rgba(255,255,255,0.08)"}`,color:infoOpen?"#c4b5fd":"#475569",fontSize:9,cursor:"pointer",lineHeight:1}}
                        title="Ver doses de referência">ⓘ</button>
                    )}
                  </div>
                  {infoOpen && d.doseInfo && (
                    <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:50,minWidth:260,maxWidth:320,padding:"12px 14px",background:"#102010",border:"1px solid rgba(167,139,250,0.35)",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}}>
                      <div style={{fontSize:10,color:"#c4b5fd",fontFamily:mono,letterSpacing:1,marginBottom:6}}>📋 DOSES DE REFERÊNCIA — {d.label.toUpperCase()}</div>
                      {d.doseInfo.split("\n").map((l,i)=>(
                        <div key={i} style={{fontSize:12,color:i===0?"#e2e8f0":"#94a3b8",lineHeight:1.6,fontWeight:i===0?700:400}}>{l}</div>
                      ))}
                      <button onClick={()=>setInfoAberta(null)} style={{marginTop:8,background:"none",border:"none",color:"#475569",fontSize:10,cursor:"pointer",padding:0}}>✕ Fechar</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{marginTop:14,padding:"14px 16px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0"}}>{conf.label}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{conf.diluicaoDesc}</div>
            {conf.concMcgML && <div style={{fontSize:11,color:concCustom?"#f59e0b":"#38bdf8",marginTop:1,fontFamily:mono}}>
              {concCustom ? `★ ${concCustom} mcg/mL (personalizado)` : `= ${conf.concMcgML} mcg/mL`}
            </div>}
            {conf.concUIML && <div style={{fontSize:11,color:"#38bdf8",marginTop:1,fontFamily:mono}}>= {conf.concUIML} UI/mL</div>}
          </div>
          <button onClick={()=>setEditandoConc(e=>!e)} style={{padding:"4px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#64748b",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
            {editandoConc?"✕ Fechar":"✏️ Diluição personalizada"}
          </button>
        </div>

        {/* Seletor de modo de cálculo (se mais de 1 opção) */}
        {conf.modoCalcOpcoes && conf.modoCalcOpcoes.length > 1 && (
          <div style={{marginBottom:12,display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:10,color:"#475569",fontFamily:mono,marginRight:4}}>UNIDADE:</span>
            {conf.modoCalcOpcoes.map(m=>(
              <button key={m} onClick={()=>onVazaoChange&&onVazaoChange(`${drogaSel}_modo`,m)}
                style={{padding:"3px 10px",borderRadius:14,border:`1px solid ${modoAtual===m?"#f59e0b":"rgba(255,255,255,0.1)"}`,background:modoAtual===m?"rgba(245,158,11,0.12)":"rgba(255,255,255,0.02)",color:modoAtual===m?"#f59e0b":"#64748b",fontSize:10,cursor:"pointer",fontFamily:mono}}>
                {MODOS_CALC[m]?.label||m}
              </button>
            ))}
          </div>
        )}

        {editandoConc && (
          <div style={{marginBottom:14,padding:"10px 12px",background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8}}>
            <div style={{fontSize:10,color:"#f59e0b",fontFamily:mono,letterSpacing:1,marginBottom:8}}>CONCENTRAÇÃO PERSONALIZADA (mcg/mL)</div>
            <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap"}}>
              <Field label="CONCENTRAÇÃO" value={concCustom} onChange={setConcCustom} type="number" placeholder={String(conf.concMcgML||"")} suffix="mcg/mL"/>
              <button onClick={()=>setConcCustom("")} style={{padding:"8px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#64748b",fontSize:12,cursor:"pointer",marginBottom:1}}>
                Resetar
              </button>
            </div>
            <div style={{fontSize:11,color:"#64748b",marginTop:6}}>Padrão do protocolo: {conf.concMcgML} mcg/mL</div>
          </div>
        )}

        <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
          <Field label="VAZÃO DA BOMBA (mL/h)" value={mlh} onChange={setMlh} type="number" placeholder="5.0" suffix="mL/h"/>
          <div style={{flex:1,minWidth:150}}>
            <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:4}}>DOSE RESULTANTE</div>
            <div style={{padding:"9px 14px",borderRadius:8,textAlign:"center",background:resBg,border:`1px solid ${resBorder}`,fontSize:16,fontWeight:700,color:resCor,minHeight:38,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {resultado ? `${fmtDose(resultado.dose)} ${resultado.label}` : "—"}
            </div>
          </div>
        </div>

        {acimaDose && (
          <div style={{marginTop:8,padding:"6px 10px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:6,fontSize:12,color:"#f87171"}}>
            ⚠️ Acima do máximo recomendado: {conf.max} {conf.unidadeLabel}
          </div>
        )}
        {resultado && !acimaDose && conf.max && (
          <div style={{marginTop:6,fontSize:11,color:"#475569"}}>
            Máx. recomendado: {conf.max} {conf.unidadeLabel}
          </div>
        )}
        {resultado && onLancarDroga && (
          <button onClick={lancarNaEvolucao} style={{
            width:"100%", marginTop:10, padding:"9px",
            background: lancado ? "rgba(56,189,248,0.15)" : "rgba(56,189,248,0.1)",
            border: `1px solid ${lancado ? "#38bdf8" : "#38bdf8"}`,
            borderRadius:8, color: lancado ? "#38bdf8" : "#38bdf8",
            fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s",
          }}>
            {lancado ? "✅ Lançado na evolução!" : `📋 Lançar na evolução (${conf.grupo === "vasoativa" ? "== Cv: DVA" : conf.grupo === "sedacao" ? "== N: Sedação" : "== N: Analgesia"})`}
          </button>
        )}
      </div>
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
function DietaPanel({ dados, onChange, config={}, diureseHojeVol="" }) {
  const dieta = dados.dieta || {
    tipo:"enteral", catalogId:"", formula:"",
    vazao:"",
    meta:{ modo:"kg", kcalKg:"25", ptnKg:"1.5", kcalTotal:"", ptnTotal:"" },
    obs:""
  };
  const upd     = (field, val) => onChange({ ...dados, dieta: { ...dieta, [field]: val } });
  const updMeta = (field, val) => upd("meta", { ...(dieta.meta||{}), [field]: val });

  const [showCatalog, setShowCatalog] = useState(false);

  const peso     = parseFloat(dados.peso) || 0;
  const catalogo = getDietasCatalogo(config);
  const dietaSel = catalogo.find(d=>d.id===dieta.catalogId) || null;
  const meta     = dieta.meta || { modo:"kg" };
  const metaAbs  = calcMetaAbsoluta(meta, peso);
  const volHoje  = parseFloat(diureseHojeVol) || 0;
  const nutriHoje = calcNutri(dietaSel, volHoje);

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
      <SecTitle>SUPORTE NUTRICIONAL</SecTitle>

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
          </div>

          {/* Metas nutricionais */}
          <div style={{padding:"12px 14px",background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:10,marginBottom:14}}>
            <div style={{fontSize:10,color:"#c4b5fd",fontFamily:mono,letterSpacing:1,marginBottom:10}}>🎯 METAS NUTRICIONAIS</div>
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

  // Quais singulares ainda não foram inseridos
  const singularesDisponiveis = DISP_SINGULAR.filter(d => !isSingularAtivo(d.key));
  // Múltiplos sempre disponíveis para adicionar mais
  const temAlgumAtivo =
    DISP_SINGULAR.some(d=>isSingularAtivo(d.key)) ||
    DISP_MULTIPLO.some(d=>getMultiplos(d.key).length>0);

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
      </div>

      {/* Botão + picker */}
      <div style={{position:"relative"}}>
        <button onClick={()=>setShowPicker(v=>!v)} style={{
          display:"flex",alignItems:"center",gap:8,padding:"9px 16px",width:"100%",
          background:showPicker?"rgba(56,189,248,0.1)":"rgba(255,255,255,0.03)",
          border:`1px solid ${showPicker?"rgba(56,189,248,0.4)":"rgba(255,255,255,0.1)"}`,
          borderRadius:10,color:showPicker?"#38bdf8":"#64748b",
          cursor:"pointer",fontSize:13,fontWeight:600,transition:"all 0.15s",
        }}>
          <span style={{fontSize:16}}>{showPicker?"✕":"+"}</span>
          {showPicker?"Fechar":"Adicionar dispositivo"}
        </button>

        {showPicker && (
          <div style={{marginTop:8,padding:"8px",background:"#0c1a10",border:"1px solid rgba(56,189,248,0.2)",borderRadius:12,display:"flex",flexDirection:"column",gap:4}}>
            {/* Múltiplos sempre disponíveis */}
            {DISP_MULTIPLO.map(({key,label,icone,siteDefault})=>(
              <button key={key} onClick={()=>inserirMultiplo(key,siteDefault)} style={{
                display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",
                borderRadius:8,cursor:"pointer",textAlign:"left",
              }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(56,189,248,0.08)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}>
                <span style={{fontSize:18}}>{icone}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#cbd5e1"}}>{label}</div>
                  <div style={{fontSize:10,color:"#38bdf8",fontFamily:mono,marginTop:1}}>pode adicionar múltiplos</div>
                </div>
              </button>
            ))}
            {/* Separador se houver os dois grupos */}
            {singularesDisponiveis.length>0 && (
              <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",margin:"4px 0",paddingTop:4}}>
                <div style={{fontSize:9,color:"#334155",fontFamily:mono,letterSpacing:2,paddingLeft:14,paddingBottom:4}}>DISPOSITIVO ÚNICO</div>
                {singularesDisponiveis.map(({key,label,icone,siteDefault})=>(
                  <button key={key} onClick={()=>inserirSingular(key,siteDefault)} style={{
                    display:"flex",alignItems:"center",gap:10,padding:"10px 14px",width:"100%",
                    background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",
                    borderRadius:8,cursor:"pointer",textAlign:"left",marginBottom:4,
                  }}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(56,189,248,0.08)"}
                    onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}>
                    <span style={{fontSize:18}}>{icone}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#cbd5e1"}}>{label}</div>
                      {siteDefault&&<div style={{fontSize:11,color:"#475569",marginTop:1}}>Sítio padrão: {siteDefault}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
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
  vm_pcv:     [{ key:"vm_pins", label:"Pins (cmH₂O)", type:"number",placeholder:"" },
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

function gerarTextoVM(leito) {
  const modo = leito.vm_modo;
  if (!modo || modo === "ar_ambiente") return "Ar ambiente";
  const m = VM_MODOS.find(x=>x.id===modo);
  const label = m ? m.label : modo;
  const campos = VM_CAMPOS[modo] || [];
  const partes = campos.map(c=>{
    const v = leito[c.key];
    if (!v) return null;
    return `${c.label.replace(/ \(.*\)/,"")}: ${v}`;
  }).filter(Boolean);
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
  return `${label}: ${partes.join(" / ")}`;
}

function VentilacaoPanel({ leito, onChange }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";
  const [busca, setBusca] = useState("");
  const [showBusca, setShowBusca] = useState(false);

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

  const set = (key, val) => onChange({...leito, [key]: val});

  return (
    <div>
      <SecTitle>SUPORTE VENTILATÓRIO</SecTitle>

      {/* Seletor de modo */}
      <div style={{marginBottom:12,position:"relative"}}>
        {modoAtual ? (
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:10}}>
            <span style={{fontSize:20}}>{modoAtual.icone}</span>
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
                    <span style={{fontSize:18}}>{m.icone}</span>{m.label}
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
                  {m.icone} {m.label.replace("VM — ","").replace(" (Cateter Nasal Alto Fluxo)","").replace("Modo ","").split(" ")[0]}
                </button>
              ))}
            </div>}
          </div>
        )}
      </div>

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

          {/* P/F manual se não calculado */}
          {!pf_calc&&(leito.vm_modo==="vm_psv"||leito.vm_modo==="vm_pcv"||leito.vm_modo==="vm_vcv")&&(
            <div style={{display:"flex",gap:10,marginBottom:10}}>
              <div style={{minWidth:120,flex:1}}>
                <div style={{fontSize:9,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>PaO₂ / P/F (mmHg)</div>
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
    onChange([...antibioticos, { id: Date.now(), nome, via:"EV", dose:"", dataInicio: hoje, dataFim:"", doseConfirmada:false }]);
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
          const diasAtb = atb.dataInicio ? Math.floor((new Date() - new Date(atb.dataInicio+"T00:00:00")) / 86400000) : null;
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
                    background:diasAtb===0?"rgba(56,189,248,0.12)":diasAtb<7?"rgba(52,211,153,0.1)":"rgba(251,146,60,0.1)",
                    color:diasAtb===0?"#38bdf8":diasAtb<7?"#34d399":"#fb923c",whiteSpace:"nowrap"}}>
                    {diasAtb===0?"D1":`D${diasAtb+1}`}
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
                  style={{minWidth:115,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,padding:"4px 6px",color:T.text2,fontSize:11}}/>
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
  const idadeAnos = dados.dataNascimento
    ? Math.floor((new Date() - new Date(dados.dataNascimento)) / (365.25*86400000))
    : null;
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
        <Field label="DATA NASCIMENTO"   value={dados.dataNascimento||""} onChange={v=>onChange({...dados,dataNascimento:v})} type="date" style={{minWidth:150}}/>
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
  const [showSug, setShowSug] = useState(false);
  const cleanPlaceholder = placeholder && !sugestao ? placeholder : ""; // só usa placeholder se não tem sugestão separada
  return (
    <div style={{position:"relative"}}>
      <textarea ref={fieldRef} defaultValue={defaultValue||""} placeholder={cleanPlaceholder||""} rows={rows}
        style={{width:"100%",
          background: isAntigo ? "rgba(100,116,139,0.08)" : "rgba(255,255,255,0.03)",
          border: isAntigo ? "1px solid rgba(100,116,139,0.25)" : "1px solid rgba(255,255,255,0.07)",
          borderRadius:8, padding:"8px 32px 8px 10px",
          color: isAntigo ? "#64748b" : "#cbd5e1",
          fontSize:12, resize:"vertical", fontFamily:"inherit", boxSizing:"border-box", lineHeight:1.5}}
        onFocus={e=>e.target.style.borderColor="rgba(56,189,248,0.4)"}
        onBlur={e=>{
          e.target.style.borderColor = isAntigo ? "rgba(100,116,139,0.25)" : "rgba(255,255,255,0.07)";
          if (onBlurSave && fieldName) onBlurSave(fieldName, e.target.value);
        }}/>
      {/* Stamp de sugestão */}
      {(sugestao||placeholder) && (
        <button onClick={()=>setShowSug(s=>!s)}
          style={{position:"absolute",top:5,right:6,background:showSug?"rgba(56,189,248,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${showSug?"rgba(56,189,248,0.3)":"rgba(255,255,255,0.1)"}`,borderRadius:4,color:showSug?"#38bdf8":"#334155",fontSize:9,cursor:"pointer",padding:"1px 5px",fontFamily:mono,lineHeight:1.4}}
          title="Ver sugestão">
          💡
        </button>
      )}
      {showSug && (sugestao||placeholder) && (
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:20,background:"#102010",border:"1px solid rgba(56,189,248,0.3)",borderRadius:8,padding:"8px 10px",boxShadow:"0 6px 20px rgba(0,0,0,0.5)"}}>
          <div style={{fontSize:9,color:"#38bdf8",fontFamily:mono,letterSpacing:1,marginBottom:4}}>SUGESTÃO</div>
          <div style={{fontSize:11,color:"#94a3b8",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{sugestao||placeholder}</div>
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
          <div style={{fontSize:12,color:"#64748b"}}>Dispositivos e catálogo de dietas</div>
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
    {key:"trop",  label:"Troponina",        unit:"ng/mL"},
    {key:"bnp",   label:"BNP",              unit:"pg/mL"},
    {key:"ntpro", label:"NT-proBNP",        unit:"pg/mL"},
    {key:"lact",  label:"Lactato",          unit:"mmol/L"},
  ]},
  { grupo:"🫁 Respiratório", params:[
    {key:"po2",   label:"pO2",              unit:"mmHg"},
    {key:"pco2",  label:"pCO2",             unit:"mmHg"},
    {key:"ph",    label:"pH",               unit:""},
    {key:"hco3",  label:"HCO3",             unit:"mEq/L"},
    {key:"be",    label:"BE",               unit:"mEq/L"},
  ]},
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
    {key:"c24_dve",   label:"DVE débito",              unit:"mL"},
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
  c24_hd:"HD/CRRT", c24_pad:"PAD",
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
function TabelaClinica({ leito, data, onChange, onAplicarEvolucao, onLeitoChange, config={} }) {
  const customCtrls = leito.customCtrls || [];
  const onCustomCtrlChange = (ctrls) => { if(onLeitoChange) onLeitoChange({...leito, customCtrls:ctrls}); };
  const T = useTheme();
  const hoje = new Date().toISOString().split("T")[0];
  const [novaData, setNovaData] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);
  const [showAddExame, setShowAddExame] = useState(false);
  const [novoExame, setNovoExame] = useState("");
  const [tabela, setTabela] = useState("labs"); // "labs" | "controles"

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

  const [autoApply, setAutoApply] = useState(false);
  const autoRef = useRef(autoApply);
  useEffect(()=>{ autoRef.current = autoApply; }, [autoApply]);
  const prevDataHash = useRef(null);
  useEffect(()=>{
    if (!autoRef.current) return;
    const hash = JSON.stringify({d: data[hoje]||{}, v: leito.drogasVazao||{}});
    if (prevDataHash.current !== null && prevDataHash.current !== hash) {
      gerarEvolucao();
    }
    prevDataHash.current = hash;
  });

  const gerarEvolucao = () => {
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
    const heStr  = pegar(["hb","ht","leuco","neut","bast","linf","plaq","rni","ttpa","fibri"]);
    const rmStr  = pegar(["cr","ur","na","k","mg","cai","p","ph","hco3"]);
    const cvStr  = pegar(["trop","bnp","ntpro","be","lact"]);
    const resStr = pegar(["po2","pco2"]);
    const tgStr  = pegar(["tgo","tgp","bttot","btdir","btind","falc","ggt","alb"]);

    // Controles → campos certos em cada sistema
    const tempStr  = pegarCtrl(["c24_temp"]);           // He: Infeccioso/Temperatura
    const cvCtrl   = pegarCtrl(["c24_fc","c24_pam","c24_pas"]); // Cv: 24h
    const reCtrl   = pegarCtrl(["c24_fr","c24_sat"]);   // Res: 24h
    const bhStr    = pegarCtrl(["c24_diur","c24_bh"]);  // ReMe: 24h
    const dextroStr= pegarCtrl(["c24_dextro"]);          // TGI: 24h

    // Aplica labs
    if (heStr)  campos.heLabs = heStr;
    if (rmStr)  campos.rmLabs = rmStr;
    if (cvStr)  campos.cvPerf = cvStr;
    if (resStr) campos.reGaso = resStr;
    if (tgStr)  campos.tgLabs = tgStr;

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
      const ia3 = leito.dataNascimento ? Math.floor((new Date()-new Date(leito.dataNascimento+"T00:00:00"))/(365.25*86400000)) : null;
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
      const diasAtb = a.dataInicio ? Math.floor((new Date()-new Date(a.dataInicio+"T00:00:00"))/86400000)+1 : null;
      const partes = [a.nome, a.dose, a.via||"EV"].filter(Boolean).join(" ");
      return `${partes}${diasAtb ? " (D"+diasAtb+")" : ""}`;
    }).join("\n");
    if (atbTexto) campos.heAtb = atbTexto;

    onAplicarEvolucao(campos);
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
          <div style={{fontSize:12,color:T.text3}}>Registre valores diários · depois aplique na evolução</div>
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
            {autoApply?"⚡ Auto":"○ Manual"}
          </button>
          <button onClick={gerarEvolucao} style={{padding:"8px 16px",background:"linear-gradient(135deg,#0ea5e9,#0284c7)",border:"none",borderRadius:8,color:"white",fontWeight:700,fontSize:12,cursor:"pointer"}}>
            📝 Aplicar na evolução
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{display:"flex",gap:4,marginBottom:14,background:T.bgInput,borderRadius:10,padding:4}}>
        {[["labs","🔬 Exames Laboratoriais"],["controles","📊 Controles 24h"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTabela(id)} style={{flex:1,padding:"8px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:tabela===id?700:400,background:tabela===id?T.accentBg:"transparent",color:tabela===id?T.accent:T.text3,transition:"all 0.2s"}}>
            {label}
          </button>
        ))}
        {tabela==="controles" && (
          <button onClick={()=>atualizar({...leito,ctrlGrupoNeurologico:!leito.ctrlGrupoNeurologico})}
            style={{padding:"4px 10px",background:leito.ctrlGrupoNeurologico?"rgba(167,139,250,0.12)":"rgba(255,255,255,0.03)",
              border:`1px solid ${leito.ctrlGrupoNeurologico?"rgba(167,139,250,0.35)":"rgba(255,255,255,0.08)"}`,
              borderRadius:6,color:leito.ctrlGrupoNeurologico?"#c084fc":"#475569",cursor:"pointer",fontSize:11}}>
            🧠 Neurocrítico
          </button>
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
      {tabela==="labs" && (datas.length === 0 ? (
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
                        const subiu=val&&ant&&val!==ant&&parseFloat(val)>parseFloat(ant);
                        const caiu=val&&ant&&val!==ant&&parseFloat(val)<parseFloat(ant);
                        return (
                          <td key={d} style={{...tdBase,background:ativo?"rgba(56,189,248,0.03)":undefined}}>
                            <input data-nav value={val} onChange={e=>setVal(d,key,e.target.value)} onKeyDown={e=>navCell(e,key,datas.indexOf(d))}
                              style={{width:"100%",background:"transparent",border:"none",
                                color:ativo&&subiu?"#f87171":ativo&&caiu?"#34d399":T.colorTableInput,
                                fontSize:12,fontFamily:mono,textAlign:"center",padding:"3px 4px",outline:"none",
                                fontWeight:ativo?700:400}}
                              placeholder="—"
                            />
                          </td>
                        );
                      })}
                    </tr>
                    {/* TFG abaixo da creatinina */}
                    {key==="cr" && (leito.dataNascimento||leito.peso) && (()=>{
                      const idadeA = leito.dataNascimento
                        ? Math.floor((new Date()-new Date(leito.dataNascimento+"T00:00:00"))/(365.25*86400000))
                        : null;
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
            <OptionalDrenosUI data={data} onChange={onChange} datas={datas} hoje={hoje} customCtrls={customCtrls} onCustomCtrlChange={onCustomCtrlChange}/>
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
    </div>
  );
}


// ── EvolucaoEditor ────────────────────────────────────────────────────────────
const EVOLUCAO_VAZIA = {
  hda:"",
  nEF:"", nSeda:"", nAnalg:"", nPsiq:"", nObs:"",
  cvEF:"", cv24h:"", cvDVA:"", cvMed:"", cvPerf:"", cvObs:"",
  reVM:"", reEF:"", re24h:"", reGaso:"", rePocus:"", reObs:"",
  rm24h:"", rmLabs:"", rmTRS:"", rmObs:"",
  tgEF:"", tg24h:"", tgLabs:"", tgObs:"",
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
function ProbFloating({ refs, campos, isAntigo, copiado, setCopiado, salvar }) {
  const [open, setOpen] = useState(true);
  const mono2 = "'DM Mono',monospace";
  return (
    <div style={{
      position:"fixed", right:20, top:100, zIndex:200,
      width:260, maxHeight:"80vh", display:"flex", flexDirection:"column",
      filter:"drop-shadow(0 4px 24px rgba(0,0,0,0.5))",
      borderRadius:12, overflow:"hidden",
    }} className="prob-floating">
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",
        background:"rgba(15,23,42,0.98)",border:"1px solid rgba(248,113,113,0.3)",
        borderBottom:"none",borderRadius:"12px 12px 0 0",cursor:"pointer"}}
        onClick={()=>setOpen(o=>!o)}>
        <span style={{fontSize:11,fontFamily:mono2,color:"#f87171",fontWeight:700,flex:1}}>🔴 PROBLEMAS ATIVOS</span>
        <span style={{color:"#475569",fontSize:11}}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div style={{background:"rgba(10,15,30,0.97)",border:"1px solid rgba(248,113,113,0.25)",
          borderRadius:"0 0 12px 12px",padding:"10px 12px",overflowY:"auto",flex:1}}>
          <TA fieldRef={refs.probAtivos} defaultValue={campos.probAtivos} isAntigo={isAntigo("probAtivos")}
            sugestao={"1. Sepse foco pulmonar\n2. IRA oligúrica\n3. FA com RVR"}
            rows={7} fieldName="probAtivos" onBlurSave={salvar}/>
          <button onClick={()=>{
            const t=refs.probAtivos?.current?.value||campos.probAtivos||"";
            if(t){navigator.clipboard?.writeText(t).catch(()=>{});
              setCopiado(c=>({...c,probAtivos:true}));
              setTimeout(()=>setCopiado(c=>({...c,probAtivos:false})),2000);}}}
            style={{width:"100%",marginTop:5,padding:"3px",background:"rgba(248,113,113,0.08)",
              border:"1px solid rgba(248,113,113,0.15)",borderRadius:6,
              color:"#f87171",cursor:"pointer",fontSize:10}}>
            {copiado.probAtivos?"✅ Copiado":"📋 Copiar"}
          </button>
          <div style={{marginTop:10,borderTop:"1px solid rgba(52,211,153,0.2)",paddingTop:8}}>
            <div style={{fontSize:9,fontFamily:mono2,letterSpacing:2,color:"#34d399",marginBottom:5}}>✅ RESOLVIDOS</div>
            <TA fieldRef={refs.probResolvidos} defaultValue={campos.probResolvidos} isAntigo={isAntigo("probResolvidos")}
              sugestao={"1. Choque séptico (D5)\n2. Acidose metabólica"} rows={3} fieldName="probResolvidos" onBlurSave={salvar}/>
          </div>
        </div>
      )}
    </div>
  );
}


function EvolucaoEditor({ leito, campos, onCampoEdit, config={}, tabelaHoje={}, onBoletim }) {
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
  const idade = leito.dataNascimento
    ? Math.floor((new Date() - new Date(leito.dataNascimento)) / (365.25*86400000))
    : null;
  const disps = leito.dispositivos || {};
  const ativos = [
    ...DISP_MULTIPLO.flatMap(d=>(Array.isArray(disps[d.key])?disps[d.key]:[]).map((inst,i)=>({
      label:(Array.isArray(disps[d.key])&&disps[d.key].length>1)?`${d.label} ${i+1}`:d.label,
      icone:d.icone, alertaDias:d.alertaDias, disp:inst
    }))),
    ...DISP_SINGULAR.filter(d=>disps[d.key]?.ativo).map(d=>({
      label:d.label, icone:d.icone, alertaDias:d.alertaDias, disp:disps[d.key]
    })),
  ];

  // Refs para cada campo
  const refs = {
    hda:useRef(),
    nEF:useRef(), nSeda:useRef(), nAnalg:useRef(), nPsiq:useRef(), nObs:useRef(),
    cvEF:useRef(), cv24h:useRef(), cvDVA:useRef(), cvMed:useRef(), cvPerf:useRef(), cvObs:useRef(),
    reVM:useRef(), reEF:useRef(), re24h:useRef(), reGaso:useRef(), rePocus:useRef(), reObs:useRef(),
    rm24h:useRef(), rmLabs:useRef(), rmTRS:useRef(), rmObs:useRef(),
    tgEF:useRef(), tg24h:useRef(), tgLabs:useRef(), tgObs:useRef(),
    heTemp:useRef(), heLabs:useRef(), heMed:useRef(), heAtb:useRef(), heProf:useRef(), heObs:useRef(), heCulturas:useRef(),
    probAtivos:useRef(), probResolvidos:useRef(),
    impressao:useRef(),
  };

  const get = (key) => refs[key]?.current?.value?.trim() || "";

  const txtN = () => {
    const p=[];
    if(get("nEF"))    p.push(`- EF: ${get("nEF")}`);
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
    if(get("tgUltEvac")){const d=Math.floor((new Date()-new Date(get("tgUltEvac")+"T00:00:00"))/86400000);p.push(`- Última evacuação: ${d}d atrás`);}
    if(get("tgLAMG"))   p.push(`- LAMG: ${get("tgLAMG")}`);
    if(get("tgLabs")) p.push(`- Labs: ${get("tgLabs")}`);
    if(get("tgObs"))  p.push(`*${get("tgObs")}`);
    return p.join("\n");
  };
  const txtHe = () => {
    const p=[];
    if(get("heTemp"))  p.push(`T ${get("heTemp")}`);
    if(get("heLabs"))  p.push(`- Labs: ${get("heLabs")}`);
    if(get("heProf"))  p.push(`** ${get("heProf")}`);
    if(get("heObs"))   p.push(`*${get("heObs")}`);
    return p.join("\n");
  };
  const txtIn = () => {
    const p=[];
    if(get("heMed")) p.push(get("heMed"));
    if(ativos.length){
      const lista=ativos.map(a=>{
        const dd=Math.floor((new Date()-new Date(a.disp.data+"T00:00:00"))/86400000);
        return `${a.label}${a.disp.site?` ${a.disp.site}`:""} D${dd}`;
      }).join(", ");
      p.push(`Dispositivos: ${lista}`);
    }
    if(get("heAtb"))      p.push(get("heAtb"));
    if(get("heCulturas")) p.push(`- Culturas: ${get("heCulturas")}`);
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

  const gerarImpressao = () => {
    const linhas = [];
    // Cabeçalho clínico
    const ident = [
      leito.paciente,
      leito.diagnostico && `diagnóstico de ${leito.diagnostico}`,
      dias !== null && `D${dias} de UTI`,
      leito.peso && `${leito.peso} kg`,
      pp && `PP ${pp} kg`,
    ].filter(Boolean).join(", ");
    if (ident) linhas.push(ident + ".");
    // HDA
    if (get("hda")) linhas.push("\n" + get("hda"));
    // Procedimentos
    const procs = leito.procedimentos || [];
    if (procs.length) {
      const ps = procs.map(p => {
        const po = Math.floor((new Date()-new Date(p.data+"T00:00:00"))/86400000);
        return `${p.nome} (${po===0?"POI":`PO${po}`})`;
      }).join(", ");
      linhas.push(`\nSubmetido a: ${ps}.`);
    }
    // Dispositivos
    if (ativos.length) {
      const ds = ativos.map(a=>{
        const dd = Math.floor((new Date()-new Date(a.disp.data+"T00:00:00"))/86400000);
        return `${a.label}${a.disp.site?` (${a.disp.site})`:""} D${dd}`;
      }).join(", ");
      linhas.push(`Dispositivos: ${ds}.`);
    }
    // Sistemas — resumo por sistema
    const sist = [];
    if (get("cvEF")||get("cvDVA")) {
      let s = `Cv: ${get("cvEF")||""}`;
      if (get("cvDVA")) s += ` | DVA: ${get("cvDVA")}`;
      if (get("cvPerf")) s += ` | Perfusão: ${get("cvPerf")}`;
      sist.push(s);
    }
    if (get("reVM")||get("reGaso")) {
      let s = `Res: ${get("reVM")||""}`;
      if (get("re24h")) s += ` | ${get("re24h")}`;
      if (get("reGaso")) s += ` | Gaso: ${get("reGaso")}`;
      sist.push(s);
    }
    if (get("nEF")) sist.push(`N: ${get("nEF")}${get("nSeda")?" | Sed: "+get("nSeda"):""}`);
    if (get("rm24h")||get("rmLabs")) sist.push(`ReMe: ${[get("rm24h"),get("rmLabs")].filter(Boolean).join(" | ")}`);
    if (leito.dieta?.tipo) {
      const tl={enteral:"Enteral",parenteral:"NPT",oral:"VO",mista:"Mista",jejum:"Jejum"}[leito.dieta.tipo]||leito.dieta.tipo;
      let nut = `TGI: Dieta ${tl}`;
      if (leito.dieta.formula) nut += ` (${leito.dieta.formula})`;
      if (leito.dieta.vazao) nut += ` @ ${leito.dieta.vazao} mL/h`;
      if (get("tgEF")) nut += ` | ${get("tgEF")}`;
      sist.push(nut);
    }
    if (get("heTemp")||get("heLabs")) {
      let s = "He:";
      if (get("heTemp")) s += ` T ${get("heTemp")}`;
      if (get("heLabs")) s += ` | ${get("heLabs")}`;
      if (get("heAtb")) s += ` | ATB: ${get("heAtb")}`;
      sist.push(s);
    }
    if (sist.length) linhas.push("\n" + sist.join(".\n") + ".");
    // Problemas ativos
    if (get("probAtivos")) linhas.push(`\nProblemas ativos:\n${get("probAtivos")}`);
    return linhas.join("\n");
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
    const get = k => refs[k]?.current?.value || campos[k] || "";
    const dt=new Date().toLocaleDateString("pt-BR");
    let t=`EVOLUÇÃO UTI — ${dt}`;
    if(leito.paciente) t+=`\nPaciente: ${leito.paciente}`;
    // Collect all SysB content
    const secs = ["hda","re","cv","neuro","rm","tg","he","in"];
    secs.forEach(s=>{
      const v = get(s)||get(s+"24h")||get(s+"Gaso")||get(s+"VM")||"";
      if(v) t+=`\n${v}`;
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
    if(get("hda")) t+=`\n\n== HDA:\n${get("hda")}`;
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

  const SysB = ({id, sigla, label, color, txtFn, children, opcionais=[], adicionaveis=[], camposVisiveis, setCamposVisiveis}) => {
    const [open,setOpen]=useState(true);
    const [showAdd,setShowAdd]=useState(false);
    const cp=copiado[id];
    const vis = camposVisiveis || {};
    const toggle = (key) => setCamposVisiveis && setCamposVisiveis(prev=>({...prev,[key]:!prev[key]}));
    const adicionaveisNaoAtivos = adicionaveis.filter(a=>!vis[`add_${id}_${a.key}`]);
    return (
      <div style={{marginBottom:10,border:`1px solid ${open?"rgba(255,255,255,0.09)":"rgba(255,255,255,0.05)"}`,borderRadius:10,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",background:"rgba(255,255,255,0.03)"}}>
          <button onClick={()=>setOpen(o=>!o)} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"none",border:"none",cursor:"pointer",textAlign:"left"}}>
            <div style={{width:3,height:16,background:color,borderRadius:2,flexShrink:0}}/>
            <span style={{fontSize:12,fontWeight:700,color,fontFamily:mono,letterSpacing:1.5}}>{sigla}</span>
            <span style={{fontSize:12,color:"#475569",fontWeight:400}}>{label}</span>
            <span style={{marginLeft:"auto",color:"#475569",fontSize:11}}>{open?"▲":"▼"}</span>
          </button>
          {open && opcionais.length>0 && (
            <div style={{display:"flex",gap:3,marginRight:4}}>
              {opcionais.map(o=>(
                <button key={o.key} onClick={()=>toggle(o.key)}
                  title={`${vis[o.key]?"Ocultar":"Mostrar"} ${o.label}`}
                  style={{padding:"2px 7px",borderRadius:4,border:`1px solid ${vis[o.key]?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.06)"}`,background:vis[o.key]?"rgba(255,255,255,0.08)":"transparent",color:vis[o.key]?"#94a3b8":"#334155",fontSize:9,cursor:"pointer",fontFamily:mono,whiteSpace:"nowrap"}}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
          {open && adicionaveis.length>0 && (
            <button onClick={()=>setShowAdd(s=>!s)}
              style={{margin:"4px 2px",padding:"2px 8px",borderRadius:4,border:`1px solid ${showAdd?"rgba(167,139,250,0.4)":"rgba(255,255,255,0.08)"}`,background:showAdd?"rgba(167,139,250,0.1)":"transparent",color:showAdd?"#c4b5fd":"#334155",fontSize:11,cursor:"pointer"}}
              title="Adicionar campo">+</button>
          )}
          <button onClick={()=>copiarBloco(id,txtFn)} style={{margin:"6px 10px",padding:"4px 12px",borderRadius:6,fontSize:11,fontWeight:600,background:cp?"rgba(56,189,248,0.15)":"rgba(255,255,255,0.05)",border:`1px solid ${cp?"#38bdf8":"rgba(255,255,255,0.1)"}`,color:cp?"#38bdf8":"#94a3b8",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>
            {cp?"✓ Copiado":"📋 Copiar"}
          </button>
        </div>
        {open && showAdd && adicionaveisNaoAtivos.length>0 && (
          <div style={{padding:"8px 14px",borderTop:"1px solid rgba(255,255,255,0.05)",background:"rgba(167,139,250,0.04)",display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:9,color:"#64748b",fontFamily:mono}}>ADICIONAR:</span>
            {adicionaveisNaoAtivos.map(a=>(
              <button key={a.key} onClick={()=>{toggle(`add_${id}_${a.key}`);setShowAdd(false);}}
                style={{padding:"2px 9px",borderRadius:12,border:"1px solid rgba(167,139,250,0.3)",background:"rgba(167,139,250,0.08)",color:"#c4b5fd",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>
                + {a.label}
              </button>
            ))}
          </div>
        )}
        {open&&<div style={{padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>{children}</div>}
      </div>
    );
  };

  const Row=({children})=><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>{children}</div>;
  const Col=({children,flex=1,min=120})=><div style={{flex,minWidth:min}}>{children}</div>;
  const FL=({children})=><div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>{children}</div>;

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

  // ── txt funções completas (incluem opcionais/adicionáveis) ──
  const txtNFull = () => {
    const p=[];
    if(get("nEF"))    p.push(`- EF: ${get("nEF")}`);
    if(get("nSeda"))  p.push(`- P: ${get("nSeda")}`);
    if(get("nAnalg")) p.push(`- A: ${get("nAnalg")}`);
    if(vis.nPsiq&&get("nPsiq"))  p.push(`- Psiq: ${get("nPsiq")}`);
    if(vis.add_n_interconsulta&&getExtra("add_n_interconsulta")) p.push(`- IC: ${getExtra("add_n_interconsulta")}`);
    if(vis.add_n_exames&&getExtra("add_n_exames")) p.push(`- Exames: ${getExtra("add_n_exames")}`);
    if(vis.add_n_pocus&&getExtra("add_n_pocus")) p.push(`- POCUS: ${getExtra("add_n_pocus")}`);
    if(vis.nObs&&get("nObs"))   p.push(`*${get("nObs")}`);
    return p.join("\n");
  };
  const txtCvFull = () => {
    const p=[];
    if(get("cvEF"))   p.push(`- EF: ${get("cvEF")}`);
    if(get("cv24h"))  p.push(`- 24h: ${get("cv24h")}`);
    if(get("cvDVA"))  p.push(`- DVA: ${get("cvDVA")}`);
    if(vis.cvMed&&get("cvMed")) p.push(`- P: ${get("cvMed")}`);
    if(get("cvPerf")) p.push(`- Perfusão: ${get("cvPerf")}`);
    if(vis.add_cv_interconsulta&&getExtra("add_cv_interconsulta")) p.push(`- IC: ${getExtra("add_cv_interconsulta")}`);
    if(vis.add_cv_exames&&getExtra("add_cv_exames")) p.push(`- Exames: ${getExtra("add_cv_exames")}`);
    if(vis.add_cv_pocus&&getExtra("add_cv_pocus")) p.push(`- POCUS: ${getExtra("add_cv_pocus")}`);
    if(vis.add_cv_picco&&getExtra("add_cv_picco")) p.push(`- PiCCO: ${getExtra("add_cv_picco")}`);
    if(vis.add_cv_swan&&getExtra("add_cv_swan")) p.push(`- Swan-Ganz: ${getExtra("add_cv_swan")}`);
    if(vis.cvObs&&get("cvObs"))  p.push(`*${get("cvObs")}`);
    return p.join("\n");
  };
  const txtResFull = () => {
    const p=[];
    if(get("reVM"))   p.push(`- Ventilação: ${get("reVM")}`);
    if(get("reEF"))   p.push(`- EF: ${get("reEF")}`);
    if(get("re24h"))  p.push(`- 24h: ${get("re24h")}`);
    if(get("reGaso")) p.push(`Gaso: ${get("reGaso")}`);
    if(vis.rePocus&&get("rePocus")) p.push(`- POCUS: ${get("rePocus")}`);
    if(vis.reObs&&get("reObs")) p.push(`*${get("reObs")}`);
    return p.join("\n");
  };
  const txtReMeFull = () => {
    const p=[];
    if(get("rm24h"))  p.push(`- 24h: ${get("rm24h")}`);
    if(get("rmLabs")) p.push(`- Labs: ${get("rmLabs")}`);
    if(vis.rmTRS&&get("rmTRS")) p.push(`- TRS: ${get("rmTRS")}`);
    if(vis.add_reme_interconsulta&&getExtra("add_reme_interconsulta")) p.push(`- IC: ${getExtra("add_reme_interconsulta")}`);
    if(vis.rmObs&&get("rmObs")) p.push(`*${get("rmObs")}`);
    return p.join("\n");
  };
  const txtTGIFull = () => {
    const p=[];
    const d=leito.dieta;
    if(d?.tipo&&d.tipo!=="jejum"){
      const tl={enteral:"via SNE",parenteral:"NPT",oral:"VO",mista:"Mista"}[d.tipo]||d.tipo;
      let dl=`Dieta: ${tl}`;
      if(d.formula) dl+=` ${d.formula}`;
      if(d.vazao) dl+=` @ ${d.vazao}mL/h`;
      p.push(`- ${dl}`);
    } else if(d?.tipo==="jejum") p.push(`- Dieta: Jejum`);
    if(get("tgEF"))   p.push(`- EF: ${get("tgEF")}`);
    if(get("tg24h"))  p.push(`- 24h: ${get("tg24h")}`);
    if(get("tgUltEvac")){const d=Math.floor((new Date()-new Date(get("tgUltEvac")+"T00:00:00"))/86400000);p.push(`- Última evacuação: ${d}d atrás`);}
    if(get("tgLAMG"))   p.push(`- LAMG: ${get("tgLAMG")}`);
    if(get("tgLabs")) p.push(`- Labs: ${get("tgLabs")}`);
    if(vis.add_tgi_interconsulta&&getExtra("add_tgi_interconsulta")) p.push(`- IC: ${getExtra("add_tgi_interconsulta")}`);
    if(vis.add_tgi_exames&&getExtra("add_tgi_exames")) p.push(`- Exames: ${getExtra("add_tgi_exames")}`);
    if(vis.tgObs&&get("tgObs")) p.push(`*${get("tgObs")}`);
    return p.join("\n");
  };
  const txtHeFull = () => {
    const p=[];
    if(get("heTemp")) p.push(`T ${get("heTemp")}`);
    if(get("heLabs")) p.push(`- Labs: ${get("heLabs")}`);
    if(vis.heProf&&get("heProf")) p.push(`** ${get("heProf")}`);
    if(vis.add_he_interconsulta&&getExtra("add_he_interconsulta")) p.push(`- IC: ${getExtra("add_he_interconsulta")}`);
    if(vis.add_he_exames&&getExtra("add_he_exames")) p.push(`- Exames: ${getExtra("add_he_exames")}`);
    if(vis.heObs&&get("heObs")) p.push(`*${get("heObs")}`);
    return p.join("\n");
  };
  const txtInFull = () => {
    const p=[];
    if(vis.inProf&&get("heMed")) p.push(get("heMed"));
    if(ativos.length){
      const lista=ativos.map(a=>{
        const dd=Math.floor((new Date()-new Date(a.disp.data+"T00:00:00"))/86400000);
        return `${a.label}${a.disp.site?` ${a.disp.site}`:""} D${dd}`;
      }).join(", ");
      p.push(`Dispositivos: ${lista}`);
    }
    if(get("heAtb"))      p.push(get("heAtb"));
    if(get("heCulturas")) p.push(`- Culturas: ${get("heCulturas")}`);
    if(vis.add_in_interconsulta&&getExtra("add_in_interconsulta")) p.push(`- IC: ${getExtra("add_in_interconsulta")}`);
    if(vis.add_in_exames&&getExtra("add_in_exames")) p.push(`- Exames: ${getExtra("add_in_exames")}`);
    if(vis.inObs&&getExtra("inObs")) p.push(`*${getExtra("inObs")}`);
    return p.join("\n");
  };

  const [impGerado, setImpGerado] = useState(false);

  return (
    <div>
      <div>
      {/* ── Cabeçalho clínico (pills) ── */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
        {idade!==null && <Pill label="IDADE" value={idade} unit="anos" color="#c084fc"/>}
          {dias!==null&&<Pill label="D UTI" value={`D${dias}`} unit="" color="#a78bfa"/>}
        {leito.peso&&<Pill label="PESO" value={leito.peso} unit="kg" color="#f59e0b"/>}
        {pp&&<Pill label="PP" value={pp} unit="kg" color="#fb923c"/>}
        {vc6&&<Pill label="VC 6×" value={vc6} unit="mL" color="#34d399"/>}
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
      <SysB id="hda" sigla="== HDA:" label="História da Doença Atual" color={"#c084fc"} txtFn={()=>get("hda")}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[]} adicionaveis={[]}>
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

      <SysB id="n" sigla="== N:" label="Neurológico" color={"#a78bfa"} txtFn={txtNFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"nPsiq",label:"Psicoativos"},{key:"nObs",label:"Obs"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."},{key:"pocus",label:"POCUS"}]}>
        <Row><Col><FL>EF — GCS · RASS · Pupilas · Déficit</FL><TA fieldRef={refs.nEF} defaultValue={campos.nEF} isAntigo={isAntigo("nEF")} sugestao="GCS 12T (AO4 RV2 RM6) / RASS 0 / Pupilas isofotorreagentes 2-2" rows={2} fieldName="nEF" onBlurSave={salvar}/></Col></Row>
        <Row>
          <Col><FL>P — SEDAÇÃO</FL><TA fieldRef={refs.nSeda} defaultValue={campos.nSeda} isAntigo={isAntigo("nSeda")} sugestao="Precedex 10ml/h (0,57 mcg/kg/h) + Quetiapina 150mg/d" rows={2} fieldName="nSeda" onBlurSave={salvar}/></Col>
          <Col><FL>A — ANALGESIA</FL><TA fieldRef={refs.nAnalg} defaultValue={campos.nAnalg} isAntigo={isAntigo("nAnalg")} sugestao="Metadona 22,5mg/d + Cetamina 5ml/h" rows={2} fieldName="nAnalg" onBlurSave={salvar}/></Col>
        </Row>
        {vis["nPsiq"]&&<Row><Col><FL>PSICOATIVOS</FL><TA fieldRef={refs.nPsiq} defaultValue={campos.nPsiq} isAntigo={isAntigo("nPsiq")} sugestao="Diazepam 40mg/d + Sertralina 50mg/d" rows={1} fieldName="nPsiq" onBlurSave={salvar}/></Col></Row>}
        {vis["add_n_interconsulta"]&&<Row><Col><FL>INTERCONSULTA</FL><TA fieldRef={ExtraRef("add_n_interconsulta")} defaultValue={campos["add_n_interconsulta"]||""} sugestao="Neurologia 29/04: aguarda avaliação" rows={1} fieldName="add_n_interconsulta" onBlurSave={salvar}/></Col></Row>}
        {vis["add_n_exames"]&&<Row><Col><FL>EXAMES COMPLEMENTARES</FL><TA fieldRef={ExtraRef("add_n_exames")} defaultValue={campos["add_n_exames"]||""} sugestao="RM crânio solicitada / EEG pendente" rows={1} fieldName="add_n_exames" onBlurSave={salvar}/></Col></Row>}
        {vis["add_n_pocus"]&&<Row><Col><FL>POCUS</FL><TA fieldRef={ExtraRef("add_n_pocus")} defaultValue={campos["add_n_pocus"]||""} sugestao="POCUS 29/04: sem alterações" rows={1} fieldName="add_n_pocus" onBlurSave={salvar}/></Col></Row>}
        {vis["nObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.nObs} defaultValue={campos.nObs} isAntigo={isAntigo("nObs")} sugestao="Avaliação neuro 21/04: área hipodensa em tronco — aguarda RM" rows={1} fieldName="nObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="cv" sigla="== Cv:" label="Cardiovascular" color={"#f87171"} txtFn={txtCvFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"cvMed",label:"Medicações"},{key:"cvObs",label:"Obs"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."},{key:"pocus",label:"POCUS"},{key:"picco",label:"PiCCO"},{key:"swan",label:"Swan-Ganz"}]}>
        <Row><Col><FL>EF — Estabilidade · Ritmo · Bulhas</FL><TA fieldRef={refs.cvEF} defaultValue={campos.cvEF} isAntigo={isAntigo("cvEF")} sugestao="Hemodinamicamente estável, sem DVA. RCR, 2T, BNF SS." rows={2} fieldName="cvEF" onBlurSave={salvar}/></Col></Row>
        <Row>
          <Col><FL>24h — FC / PAM (mín-máx)</FL><TA fieldRef={refs.cv24h} defaultValue={campos.cv24h} isAntigo={isAntigo("cv24h")} sugestao="FC 109 - 58 / PAM 121 - 58" rows={1} fieldName="cv24h" onBlurSave={salvar}/></Col>
          <Col><FL>DVA — Droga + vazão + dose</FL><TA fieldRef={refs.cvDVA} defaultValue={campos.cvDVA} isAntigo={isAntigo("cvDVA")} sugestao="Nora 5ml/h (0,08 mcg/kg/min)" rows={1} fieldName="cvDVA" onBlurSave={salvar}/></Col>
        </Row>
        {vis["cvMed"]&&<Row><Col><FL>P — MEDICAÇÕES CV</FL><TA fieldRef={refs.cvMed} defaultValue={campos.cvMed} isAntigo={isAntigo("cvMed")} sugestao="Atenolol 25mg / Furosemida 40mg/d" rows={1} fieldName="cvMed" onBlurSave={salvar}/></Col></Row>}
        <Row><Col><FL>Perfusão — TEC · Lactato</FL><TA fieldRef={refs.cvPerf} defaultValue={campos.cvPerf} isAntigo={isAntigo("cvPerf")} sugestao="TEC 2 seg / Lactato 12 > 22" rows={1} fieldName="cvPerf" onBlurSave={salvar}/></Col></Row>
        {vis["add_cv_interconsulta"]&&<Row><Col><FL>INTERCONSULTA</FL><TA fieldRef={ExtraRef("add_cv_interconsulta")} defaultValue={campos["add_cv_interconsulta"]||""} sugestao="Cardiologia 29/04: Eco TT marcado" rows={1} fieldName="add_cv_interconsulta" onBlurSave={salvar}/></Col></Row>}
        {vis["add_cv_exames"]&&<Row><Col><FL>EXAMES COMPLEMENTARES</FL><TA fieldRef={ExtraRef("add_cv_exames")} defaultValue={campos["add_cv_exames"]||""} sugestao="ECG 29/04: RS, sem alterações" rows={1} fieldName="add_cv_exames" onBlurSave={salvar}/></Col></Row>}
        {vis["add_cv_pocus"]&&<Row><Col><FL>POCUS</FL><TA fieldRef={ExtraRef("add_cv_pocus")} defaultValue={campos["add_cv_pocus"]||""} sugestao="POCUS 29/04: FE ~50%, sem derrame" rows={1} fieldName="add_cv_pocus" onBlurSave={salvar}/></Col></Row>}
        {vis["add_cv_picco"]&&<Row><Col><FL>PiCCO</FL><TA fieldRef={ExtraRef("add_cv_picco")} defaultValue={campos["add_cv_picco"]||""} sugestao="IC 2,8 / GEDVI 720 / EVLWI 8" rows={1} fieldName="add_cv_picco" onBlurSave={salvar}/></Col></Row>}
        {vis["add_cv_swan"]&&<Row><Col><FL>SWAN-GANZ</FL><TA fieldRef={ExtraRef("add_cv_swan")} defaultValue={campos["add_cv_swan"]||""} sugestao="PCP 15 / DC 4,2 / RVS 1200" rows={1} fieldName="add_cv_swan" onBlurSave={salvar}/></Col></Row>}
        {vis["cvObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.cvObs} defaultValue={campos.cvObs} isAntigo={isAntigo("cvObs")} sugestao="Eco beira-leito amanhã" rows={1} fieldName="cvObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="res" sigla="== Res:" label="Respiratório" color={"#38bdf8"} txtFn={txtResFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"rePocus",label:"POCUS"},{key:"reObs",label:"Obs"}]}>
        <Row><Col><FL>Ventilação — Modo · PS · PEEP · FiO2 · Pocc</FL><TA fieldRef={refs.reVM} defaultValue={campos.reVM} isAntigo={isAntigo("reVM")} sugestao="TQT em VM modo PSV, PS12 PEEP6 Fi30% / Pocc 7" rows={2} fieldName="reVM" onBlurSave={salvar}/></Col></Row>
        <Row>
          <Col><FL>EF — Ausculta</FL><TA fieldRef={refs.reEF} defaultValue={campos.reEF} isAntigo={isAntigo("reEF")} sugestao="MV + bilateralmente c/ roncos" rows={1} fieldName="reEF" onBlurSave={salvar}/></Col>
          <Col><FL>24h — FR / Sat (mín-máx)</FL><TA fieldRef={refs.re24h} defaultValue={campos.re24h} isAntigo={isAntigo("re24h")} sugestao="FR 41 - 20 / Sat 96 - 92" rows={1} fieldName="re24h" onBlurSave={salvar}/></Col>
        </Row>
        <Row><Col><FL>Gasometria</FL><TA fieldRef={refs.reGaso} defaultValue={campos.reGaso} isAntigo={isAntigo("reGaso")} sugestao="pH 7,41 / pCO2 40 / pO2 69 / bic 25 / SatO2 94%" rows={1} fieldName="reGaso" onBlurSave={salvar}/></Col></Row>
        {vis["rePocus"]&&<Row><Col><FL>POCUS — Data · Achados</FL><TA fieldRef={refs.rePocus} defaultValue={campos.rePocus} isAntigo={isAntigo("rePocus")} sugestao="22/04: Excursão 0,87 / Fen 12%" rows={1} fieldName="rePocus" onBlurSave={salvar}/></Col></Row>}
        {vis["reObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.reObs} defaultValue={campos.reObs} isAntigo={isAntigo("reObs")} sugestao="Tentar reduzir PS amanhã" rows={1} fieldName="reObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="reme" sigla="== ReMe:" label="Renal / Metabólico" color={"#34d399"} txtFn={txtReMeFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"rmTRS",label:"TRS"},{key:"rmObs",label:"Obs"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"}]}>
        <Row><Col><FL>24h — HD · BH</FL><TA fieldRef={refs.rm24h} defaultValue={campos.rm24h} isAntigo={isAntigo("rm24h")} sugestao="HD 3000 / BH +1084 > +1508" rows={1} fieldName="rm24h" onBlurSave={salvar}/></Col></Row>
        {vis["rmTRS"]&&<Row><Col><FL>TRS</FL><TA fieldRef={refs.rmTRS} defaultValue={campos.rmTRS} isAntigo={isAntigo("rmTRS")} sugestao="CRRT citrato 150ml/h" rows={1} fieldName="rmTRS" onBlurSave={salvar}/></Col></Row>}
        <Row><Col><FL>Labs — Cr · Ur · K · Na · Cai · Mg · P</FL><TA fieldRef={refs.rmLabs} defaultValue={campos.rmLabs} isAntigo={isAntigo("rmLabs")} sugestao="Cr 1,56 > 1,27 / Ur 66 > 47 / K 4,2 > 4,1 / Na 143 > 141" rows={2} fieldName="rmLabs" onBlurSave={salvar}/></Col></Row>
        {vis["add_reme_interconsulta"]&&<Row><Col><FL>INTERCONSULTA</FL><TA fieldRef={ExtraRef("add_reme_interconsulta")} defaultValue={campos["add_reme_interconsulta"]||""} sugestao="Nefrologia 29/04: avaliou TRS — manter CRRT" rows={1} fieldName="add_reme_interconsulta" onBlurSave={salvar}/></Col></Row>}
        {vis["rmObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.rmObs} defaultValue={campos.rmObs} isAntigo={isAntigo("rmObs")} sugestao="Repor K se < 3,5" rows={1} fieldName="rmObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="tgi" sigla="== TGI:" label="Gastrointestinal" color={"#fb923c"} txtFn={txtTGIFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"tgObs",label:"Obs"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."}]}>
        {leito.dieta?.tipo&&<div style={{padding:"6px 10px",background:"rgba(251,146,60,0.07)",border:"1px solid rgba(251,146,60,0.2)",borderRadius:6,fontSize:11,color:"#fb923c",marginBottom:8}}>
          🍽 <strong>{leito.dieta.tipo}</strong>{leito.dieta.formula&&` — ${leito.dieta.formula}`}{leito.dieta.vazao&&` @ ${leito.dieta.vazao} mL/h`}
          {(()=>{
            const volHoje = parseFloat(tabelaHoje?.c24_diet_vol)||0;
            const dietaSel = getDietasCatalogo(config).find(d=>d.id===leito.dieta?.catalogId);
            const metaAbs = calcMetaAbsoluta(leito.dieta?.meta, parseFloat(leito.peso));
            if (!dietaSel || !volHoje || !metaAbs) return null;
            const propofolVol = parseFloat(tabelaHoje?.c24_propofol_vol)||0;
            const kcalPropofol = propofolVol > 0 ? propofolVol * 1.1 : 0; // 1.1 kcal/mL
            const kcalRec = ((volHoje * dietaSel.kcalML) + kcalPropofol).toFixed(0);
            const ptnRec  = (volHoje * dietaSel.ptnML ).toFixed(1);
            const pctKcal = metaAbs.kcal ? Math.round(kcalRec/metaAbs.kcal*100) : null;
            const pctPtn  = metaAbs.ptn  ? Math.round(ptnRec /metaAbs.ptn *100) : null;
            return <span style={{marginLeft:8,color:"#94a3b8"}}>· Kcal{kcalPropofol>0?` (incl. ${Math.round(kcalPropofol)} prop.)`:""}: <strong style={{color:pctKcal>=80?"#34d399":"#f87171"}}>{pctKcal}%</strong> · Ptn: <strong style={{color:pctPtn>=80?"#34d399":"#f87171"}}>{pctPtn}%</strong></span>;
          })()}
        </div>}
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
        <Row><Col><FL>Labs — TGO · TGP · Bili · FA · GGT · Alb</FL><TA fieldRef={refs.tgLabs} defaultValue={campos.tgLabs} isAntigo={isAntigo("tgLabs")} sugestao="TGO 45 / TGP 32 / BT 1.2 / Alb 2.8" rows={1} fieldName="tgLabs" onBlurSave={salvar}/></Col></Row>
        {vis["add_tgi_interconsulta"]&&<Row><Col><FL>INTERCONSULTA</FL><TA fieldRef={ExtraRef("add_tgi_interconsulta")} defaultValue={campos["add_tgi_interconsulta"]||""} sugestao="Gastro 29/04: endoscopia não indicada no momento" rows={1} fieldName="add_tgi_interconsulta" onBlurSave={salvar}/></Col></Row>}
        {vis["add_tgi_exames"]&&<Row><Col><FL>EXAMES COMPLEMENTARES</FL><TA fieldRef={ExtraRef("add_tgi_exames")} defaultValue={campos["add_tgi_exames"]||""} sugestao="USG abdome 29/04: sem novidades" rows={1} fieldName="add_tgi_exames" onBlurSave={salvar}/></Col></Row>}
        {vis["tgObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.tgObs} defaultValue={campos.tgObs} isAntigo={isAntigo("tgObs")} sugestao="Omeprazol para LAMG" rows={1} fieldName="tgObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="he" sigla="== He:" label="Hematológico" color={"#f59e0b"} txtFn={txtHeFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"heProf",label:"Profilaxias"},{key:"heObs",label:"Obs"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."}]}>
        <Row>
          <Col><FL>Temperatura — mín · máx</FL><TA fieldRef={refs.heTemp} defaultValue={campos.heTemp} isAntigo={isAntigo("heTemp")} sugestao="37,2 - 36,2" rows={1} fieldName="heTemp" onBlurSave={salvar}/></Col>
          {vis["heProf"]&&<Col><FL>** Profilaxias / TEV</FL><TA fieldRef={refs.heProf} defaultValue={campos.heProf} isAntigo={isAntigo("heProf")} sugestao="HNF 5kUI 12/12h / Bactrim + Ác fólico" rows={1} fieldName="heProf" onBlurSave={salvar}/></Col>}
        </Row>
        <Row><Col><FL>Labs — Hb · Leuco · Bastões · Plaq</FL><TA fieldRef={refs.heLabs} defaultValue={campos.heLabs} isAntigo={isAntigo("heLabs")} sugestao="7,6 > 7,5 / Leuco 21k > 14k / Bastões 5% > 4% / Plaq 191k > 251k" rows={2} fieldName="heLabs" onBlurSave={salvar}/></Col></Row>
        {vis["add_he_interconsulta"]&&<Row><Col><FL>INTERCONSULTA</FL><TA fieldRef={ExtraRef("add_he_interconsulta")} defaultValue={campos["add_he_interconsulta"]||""} sugestao="Hematologia 29/04: sem indicação de transfusão" rows={1} fieldName="add_he_interconsulta" onBlurSave={salvar}/></Col></Row>}
        {vis["add_he_exames"]&&<Row><Col><FL>EXAMES COMPLEMENTARES</FL><TA fieldRef={ExtraRef("add_he_exames")} defaultValue={campos["add_he_exames"]||""} sugestao="Mielograma solicitado" rows={1} fieldName="add_he_exames" onBlurSave={salvar}/></Col></Row>}
        {vis["heObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.heObs} defaultValue={campos.heObs} isAntigo={isAntigo("heObs")} sugestao="Aguarda cultura / BAAR negativo" rows={1} fieldName="heObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>

      <SysB id="in" sigla="== In:" label="Infeccioso / Dispositivos" color={"#94a3b8"} txtFn={txtInFull}
        camposVisiveis={vis} setCamposVisiveis={setCamposVis}
        opcionais={[{key:"inProf",label:"Profilaxias"},{key:"inObs",label:"Obs"}]}
        adicionaveis={[{key:"interconsulta",label:"Interconsulta"},{key:"exames",label:"Exames Compl."}]}>
        {ativos.length>0&&<div style={{padding:"6px 10px",background:"rgba(148,163,184,0.07)",border:"1px solid rgba(148,163,184,0.15)",borderRadius:6,fontSize:11,color:"#94a3b8",marginBottom:8}}>
          📎 {ativos.map(a=>{const dd=Math.floor((new Date()-new Date(a.disp.data+"T00:00:00"))/86400000);return `${a.label}${a.disp.site?` (${a.disp.site})`:""} D${dd}`;}).join(" / ")}
        </div>}
        {vis["inProf"]&&<Row><Col><FL>Profilaxias / Outros medicamentos</FL><TA fieldRef={refs.heMed} defaultValue={campos.heMed} isAntigo={isAntigo("heMed")} sugestao="Bactrim + Ác fólico / Eritropoietina 4000 UI 48/48h" rows={2} fieldName="heMed" onBlurSave={salvar}/></Col></Row>}
        <Row><Col><FL>Antibióticos — nome + período</FL><TA fieldRef={refs.heAtb} defaultValue={campos.heAtb} isAntigo={isAntigo("heAtb")} sugestao={"- Meropenem + Vanco (15/04 - 22/04)\n- Tazocin + Claritromicina (21/03-27/03/2026)"} rows={3} fieldName="heAtb" onBlurSave={salvar}/></Col></Row>
        <Row><Col><FL>🧫 Culturas — material · data · resultado</FL><TA fieldRef={refs.heCulturas} defaultValue={campos.heCulturas} isAntigo={isAntigo("heCulturas")} sugestao={"- Hemocultura 23/04: pendente\n- Urinocultura 22/04: E.coli ESBL"} rows={3} fieldName="heCulturas" onBlurSave={salvar}/></Col></Row>
        {vis["add_in_interconsulta"]&&<Row><Col><FL>INTERCONSULTA</FL><TA fieldRef={ExtraRef("add_in_interconsulta")} defaultValue={campos["add_in_interconsulta"]||""} sugestao="ID 29/04: avaliar troca ATB aguardando culturas" rows={1} fieldName="add_in_interconsulta" onBlurSave={salvar}/></Col></Row>}
        {vis["add_in_exames"]&&<Row><Col><FL>EXAMES COMPLEMENTARES</FL><TA fieldRef={ExtraRef("add_in_exames")} defaultValue={campos["add_in_exames"]||""} sugestao="Beta-D-glucana 29/04: pendente" rows={1} fieldName="add_in_exames" onBlurSave={salvar}/></Col></Row>}
        {vis["inObs"]&&<Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={ExtraRef("inObs")} defaultValue={campos["inObs"]||""} sugestao="Reavaliação com culturas em 48h" rows={1} fieldName="inObs" onBlurSave={salvar}/></Col></Row>}
      </SysB>



      <div style={{
        position:"sticky", top:16,
        width:260, flexShrink:0,
        alignSelf:"flex-start",
        display:"flex", flexDirection:"column", gap:10,
      }} className="prob-sticky-col">
        {/* Problemas Ativos */}
        <div style={{background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:10,padding:"10px 12px"}}>
          <div style={{fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:2,color:"#f87171",marginBottom:6}}>🔴 PROBLEMAS ATIVOS</div>
          <TA fieldRef={refs.probAtivos} defaultValue={campos.probAtivos} isAntigo={isAntigo("probAtivos")}
            sugestao={`Problemas Ativos:\n1. `} rows={8} fieldName="probAtivos" onBlurSave={salvar}/>
          <button onClick={()=>{const t=refs.probAtivos?.current?.value||campos.probAtivos||"";if(t){navigator.clipboard?.writeText(t).catch(()=>{});setCopiado(c=>({...c,probAtivos:true}));setTimeout(()=>setCopiado(c=>({...c,probAtivos:false})),2000);}}}
            style={{marginTop:6,width:"100%",padding:"4px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.15)",borderRadius:6,color:"#f87171",cursor:"pointer",fontSize:10}}>
            {copiado.probAtivos?"✅ Copiado":"📋 Copiar"}
          </button>
        </div>
        {/* Problemas Resolvidos */}
        <div style={{background:"rgba(52,211,153,0.05)",border:"1px solid rgba(52,211,153,0.15)",borderRadius:10,padding:"10px 12px"}}>
          <div style={{fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:2,color:"#34d399",marginBottom:6}}>✅ PROBLEMAS RESOLVIDOS</div>
          <TA fieldRef={refs.probResolvidos} defaultValue={campos.probResolvidos} isAntigo={isAntigo("probResolvidos")}
            rows={4} fieldName="probResolvidos" onBlurSave={salvar}/>
        </div>
      </div>

      {/* ── Impressão ── */}
      <div style={{marginBottom:10,border:`1px solid rgba(56,189,248,0.2)`,borderRadius:10,overflow:"hidden",background:"rgba(56,189,248,0.02)"}}>
        <div style={{display:"flex",alignItems:"center",background:"rgba(56,189,248,0.05)",padding:"10px 14px",gap:8}}>
          <div style={{width:3,height:16,background:"#38bdf8",borderRadius:2,flexShrink:0}}/>
          <span style={{fontSize:12,fontWeight:700,color:"#38bdf8",fontFamily:mono,letterSpacing:1.5}}>== Impressão:</span>
          <span style={{fontSize:12,color:"#475569",fontWeight:400}}>Resumo automático para passagem de caso</span>
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            <button onClick={()=>{
              const txt = gerarImpressao();
              if (refs.impressao?.current) refs.impressao.current.value = txt;
              salvar("impressao", txt);
              setImpGerado(true);
              setTimeout(()=>setImpGerado(false), 2000);
            }} style={{padding:"4px 12px",borderRadius:6,border:"1px solid rgba(56,189,248,0.4)",background:"rgba(56,189,248,0.1)",color:"#38bdf8",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {impGerado ? "✓ Gerado!" : "⚡ Gerar resumo"}
            </button>
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
            IMPRESSÃO CLÍNICA — clique em ⚡ Gerar para montar a partir dos dados preenchidos · edite à vontade
          </div>
          <textarea ref={refs.impressao} defaultValue={campos.impressao||""} rows={6}
            onBlur={e=>salvar("impressao", e.target.value)}
            placeholder={"Clique em ⚡ Gerar resumo para montar automaticamente a partir dos dados já preenchidos.\n\nOu escreva diretamente aqui sua impressão do quadro."}
            style={{width:"100%",background:"rgba(56,189,248,0.04)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.7}}/>
        </div>
      </div>

      <button onClick={copiarTudo} style={{width:"100%",padding:"13px",marginTop:6,background:copiado.tudo?"rgba(56,189,248,0.15)":"linear-gradient(135deg,rgba(22,163,74,0.25),rgba(21,128,61,0.25))",border:`1.5px solid ${copiado.tudo?"#38bdf8":"#0ea5e9"}`,borderRadius:10,color:copiado.tudo?"#38bdf8":"#38bdf8",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
        {copiado.tudo?"✅ Evolução completa copiada!":"📋 Copiar evolução completa"}
      </button>
      </div>

      {/* ── Problemas: painel fixo flutuante ── */}
      <ProbFloating
        refs={refs} campos={campos} isAntigo={isAntigo}
        copiado={copiado} setCopiado={setCopiado} salvar={salvar}/>
    </div>
  );
}

// ── FerramentasPanel ──────────────────────────────────────────────────────────
function FerramentasPanel() {
  const LINKS = [
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
function MetasPanel({ metas, onChange, leito={}, config={}, tabelaHoje={} }) {
  const [nova, setNova] = useState("");
  const [show, setShow] = useState(false);
  
  const add = (t) => {
    if (!t.trim()) return;
    onChange([...metas, { id: Date.now(), texto: t.trim(), status: "pendente" }]);
    setNova(""); setShow(false);
  };
  const s = { total:metas.length, ok:metas.filter(m=>m.status==="cumprido").length, pend:metas.filter(m=>m.status==="pendente").length };

  return (
    <div>
      {metas.length>0 && (
        <div style={{display:"flex",gap:12,marginBottom:16,padding:"10px 14px",background:"rgba(255,255,255,0.03)",borderRadius:8}}>
          {[["TOTAL",s.total,"#e2e8f0"],["CUMPRIDAS",s.ok,"#38bdf8"],["PENDENTES",s.pend,"#f59e0b"]].map(([l,v,c])=>(
            <div key={l} style={{textAlign:"center",flex:1}}>
              <div style={{fontSize:20,fontWeight:700,color:c}}>{v}</div>
              <div style={{fontSize:10,color:"#64748b",fontFamily:mono}}>{l}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <input value={nova} onChange={e=>setNova(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add(nova)} placeholder="Nova meta ou pendência…"
          style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"9px 12px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
        <button onClick={()=>add(nova)} style={{padding:"9px 14px",background:"rgba(56,189,248,0.15)",border:"1px solid #38bdf8",borderRadius:8,color:"#38bdf8",fontWeight:700,cursor:"pointer",fontSize:16}}>+</button>
      </div>
      {(()=>{const sugs=[];const cr=parseFloat(tabelaHoje?.cr||0),peso=parseFloat(leito.peso||0);const idadeA=leito.dataNascimento?Math.floor((new Date()-new Date(leito.dataNascimento))/(365.25*86400000)):null;const clcr=cr&&peso&&idadeA?Math.round(((140-idadeA)*peso)/(72*cr)*(leito.sexo==="F"?0.85:1)):null;(leito.antibioticos||[]).filter(a=>!a.dataFim).forEach(atb=>{if(!atb.nome||!atb.dataInicio)return;const dias=Math.floor((new Date()-new Date(atb.dataInicio+"T00:00:00"))/86400000);if(dias<2)return;const lc=atb.nome.toLowerCase();const key=lc.includes("pip")&&lc.includes("tazo")?"pip/tazo":lc.includes("amp")&&lc.includes("sulbactam")?"amp/sulbactam":lc.includes("imipenem")?"imipenem":lc.split(" ")[0].replace(/[^a-z]/g,"");if(clcr!==null&&ATB_RENAL[key]?.length>0){const aj=ATB_RENAL[key].find(a=>clcr<a.tfg);if(aj)sugs.push({txt:`⚠️ Ajustar ${atb.nome}: ClCr ${clcr}→${aj.rec}`,alert:true});}});const disps=leito.dispositivos||{},alts={cvc:config.alertaCVC||7,pai:config.alertaPAI||7,svd:config.alertaSVD||14,dialise:config.alertaDialise||14,tot:config.alertaTOT||99,tqt:config.alertaTQT||99,sng:config.alertaSNG||21,dreno:config.alertaDreno||21};DISP_MULTIPLO.forEach(d=>(Array.isArray(disps[d.key])?disps[d.key]:[]).forEach((inst,i)=>{if(!inst.data)return;const dd=Math.floor((new Date()-new Date(inst.data+"T00:00:00"))/86400000);if(dd>(alts[d.key]||99))sugs.push({txt:`🔴 ${d.label}${disps[d.key].length>1?` ${i+1}`:""}:D${dd}(lim${alts[d.key]}d)`,alert:true});}));DISP_SINGULAR.forEach(d=>{const inst=disps[d.key];if(!inst?.ativo||!inst.data)return;const dd=Math.floor((new Date()-new Date(inst.data+"T00:00:00"))/86400000);if(dd>(alts[d.key]||99))sugs.push({txt:`🔴 ${d.label}:D${dd}(lim${alts[d.key]}d)`,alert:true});});METAS_SUGESTOES.forEach(s=>sugs.push({txt:s,alert:false}));const ac=sugs.filter(s=>s.alert).length;return(<><button onClick={()=>setShow(s=>!s)} style={{width:"100%",padding:"7px",background:"transparent",border:"1px dashed rgba(255,255,255,0.1)",borderRadius:8,color:ac?"#f87171":"#64748b",fontSize:12,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>{show?"▲ Fechar":"▼ Ver sugestões"}{ac>0&&<span style={{padding:"1px 7px",background:"rgba(248,113,113,0.15)",borderRadius:10,fontSize:10}}>{ac} alertas</span>}</button>{show&&<div style={{marginBottom:14}}>{sugs.map((sg,i)=>(<div key={i} onClick={()=>add(sg.txt)} style={{padding:"7px 12px",borderRadius:6,fontSize:12,marginBottom:4,cursor:"pointer",color:sg.alert?"#f87171":"#94a3b8",background:sg.alert?"rgba(248,113,113,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${sg.alert?"rgba(248,113,113,0.2)":"rgba(255,255,255,0.05)"}`}} onMouseEnter={e=>e.currentTarget.style.opacity="0.7"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{sg.alert?"":"+  "}{sg.txt}</div>))}</div>}</>);})()}
      {metas.length===0 && <div style={{textAlign:"center",padding:24,color:"#334155",fontSize:13}}>Nenhuma meta cadastrada para este plantão</div>}
      {metas.map(m=>(
        <div key={m.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",background:"rgba(255,255,255,0.03)",borderRadius:8,marginBottom:6,border:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:"#cbd5e1",marginBottom:6}}>{m.texto}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["pendente","andamento","cumprido"].map(st=>(
                <button key={st} onClick={()=>onChange(metas.map(x=>x.id===m.id?{...x,status:st}:x))}
                  style={{padding:"2px 10px",borderRadius:20,border:`1px solid ${m.status===st?"#38bdf8":"rgba(255,255,255,0.1)"}`,background:m.status===st?"rgba(56,189,248,0.12)":"transparent",color:m.status===st?"#38bdf8":"#64748b",fontSize:11,cursor:"pointer",fontFamily:mono}}>
                  {st==="pendente"?"● Pendente":st==="andamento"?"◑ Andamento":"✓ Cumprido"}
                </button>
              ))}
            </div>
          </div>
          <button onClick={()=>onChange(metas.filter(x=>x.id!==m.id))} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:16,padding:2}}>✕</button>
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
function VisaoGeralPanel({ leitos, tabelaData, metasPorLeito, config={} }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";

  const NEURO_DRUGS  = ["propofol","midazolam","fentanil","cetamina","precedex","morfina"];
  const CARDIO_DRUGS = ["noradrenalina","dobutamina","vasopressina","nitroglicerina","nitroprussiato","furosemida","amiodarona"];

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

  const getAlerts = (leito) => {
    const h=getHoje(leito.id);
    const alerts=[];
    const idade=leito.dataNascimento?Math.floor((new Date()-new Date(leito.dataNascimento+"T00:00:00"))/(365.25*86400000)):null;
    const clcr=(h.cr&&leito.peso&&idade)?Math.round(((140-idade)*parseFloat(leito.peso))/(72*parseFloat(h.cr))*(leito.sexo==="F"?0.85:1)):null;
    (leito.antibioticos||[]).filter(a=>!a.dataFim&&a.nome&&a.dataInicio).forEach(a=>{
      const dias=Math.floor((new Date()-new Date(a.dataInicio+"T00:00:00"))/86400000);
      if(dias<2) return;
      const lc=a.nome.toLowerCase();
      const key=lc.includes("pip")&&lc.includes("tazo")?"pip/tazo":lc.includes("amp")&&lc.includes("sulbactam")?"amp/sulbactam":lc.split(" ")[0].replace(/[^a-z]/g,"");
      if(clcr&&ATB_RENAL[key]?.length>0){const aj=ATB_RENAL[key].find(x=>clcr<x.tfg);if(aj)alerts.push(`ATB ${a.nome}: ajuste (ClCr ${clcr})`);}
    });
    DISP_MULTIPLO.forEach(d=>(Array.isArray((leito.dispositivos||{})[d.key])?(leito.dispositivos[d.key]):[]).forEach(inst=>{
      if(!inst.data) return;
      const dd=Math.floor((new Date()-new Date(inst.data+"T00:00:00"))/86400000);
      if(dd>(config[`alerta${d.key.charAt(0).toUpperCase()+d.key.slice(1)}`]||99)) alerts.push(`${d.label}: D${dd}`);
    }));
    return alerts;
  };

  // Helper: row with label + value
  const R = ({lbl, val, unit="", cor="#cbd5e1"}) => !val ? null : (
    <div style={{display:"flex",justifyContent:"space-between",padding:"2px 0",borderBottom:"1px solid rgba(255,255,255,0.025)"}}>
      <span style={{fontSize:10,color:"#64748b",fontFamily:mono}}>{lbl}</span>
      <span style={{fontSize:11,fontFamily:mono,color:cor,fontWeight:600}}>{val}{unit&&<span style={{fontSize:9,color:"#475569",marginLeft:2}}>{unit}</span>}</span>
    </div>
  );

  // Section header
  const Sec = ({ico, lbl, cor="#475569"}) => (
    <div style={{fontSize:9,fontFamily:mono,letterSpacing:1.5,color:cor,marginTop:8,marginBottom:3,paddingBottom:2,borderBottom:`1px solid ${cor}25`}}>{ico} {lbl}</div>
  );

  // Drug row from drogasVazao
  const DrugRow = ({dKey, vazoes}) => {
    const v = vazoes[dKey];
    const conf = DROGAS_CONFIG[dKey];
    if(!v||!conf||parseFloat(v)<=0) return null;
    const res = calcDoseFromMLH(dKey, parseFloat(v), null, null, null); // peso not available here
    return <R lbl={conf.label} val={`${v}mL/h`} unit={res?`(${Math.round(parseFloat(res.dose)*100)/100} ${res.label})`:"" } cor="#fbbf24"/>;
  };

  return (
    <div style={{padding:"20px 24px",overflowY:"auto"}}>
      <div style={{fontSize:16,fontWeight:700,color:T.text1,marginBottom:14}}>🏥 Visão Geral da UTI</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:12}}>
        {leitos.map(l=>{
          if(!l.paciente) return(
            <div key={l.id} style={{padding:14,background:"rgba(255,255,255,0.015)",border:"1px dashed rgba(255,255,255,0.06)",borderRadius:10,color:"#1e293b",fontSize:12,textAlign:"center"}}>
              {l.nome} — Vago
            </div>
          );

          const h=getHoje(l.id);
          const dias=diasInternacao(l.dataInternacao);
          const idade=l.dataNascimento?Math.floor((new Date()-new Date(l.dataNascimento+"T00:00:00"))/(365.25*86400000)):null;
          const bh=fmtBH(l.id,l);
          const alerts=getAlerts(l);
          const vaz=l.drogasVazao||{};
          const atbAtivos=(l.antibioticos||[]).filter(a=>!a.dataFim&&a.nome);
          const vm=l.vm_modo?VM_MODOS.find(m=>m.id===l.vm_modo):null;
          const pp=pesoPredito(l.altura,l.sexo);
          const boletim=l.boletim;

          const hasNeuro = NEURO_DRUGS.some(k=>vaz[k]&&parseFloat(vaz[k])>0)||h.c24_pic||h.c24_ppc;
          const hasCardio = CARDIO_DRUGS.some(k=>vaz[k]&&parseFloat(vaz[k])>0)||h.c24_fc||h.c24_pam;
          const hasResp = vm||h.c24_sat||h.c24_fr||h.po2||h.ph||h.pco2;
          const hasRenal = h.cr||h.na||h.k||h.c24_diur||h.c24_bh;
          const hasHema = h.hb||h.leuco||h.plaq||h.c24_temp||h.lact;
          const hasInf = atbAtivos.length>0||h.heCulturas;
          const hasTgi = h.c24_dextro||l.tgUltEvac||h.c24_diet_vol;

          return(
            <div key={l.id} style={{background:T.bgCard,border:`1px solid ${alerts.length>0?"rgba(248,113,113,0.3)":T.border}`,borderRadius:10,overflow:"hidden",display:"flex",flexDirection:"column"}}>
              {/* Header */}
              <div style={{padding:"10px 13px",background:"rgba(255,255,255,0.02)",borderBottom:`1px solid ${T.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,color:T.text1,fontSize:13,flex:1}}>{l.paciente}</span>
                  {idade&&<span style={{fontSize:10,fontFamily:mono,color:"#c084fc"}}>{idade}a</span>}
                  {dias!==null&&<span style={{fontSize:10,fontFamily:mono,color:"#a78bfa",background:"rgba(167,139,250,0.1)",padding:"1px 6px",borderRadius:8}}>D{dias}</span>}
                  {bh&&<span style={{fontSize:10,fontFamily:mono,color:bh.cor,fontWeight:700,padding:"1px 6px",borderRadius:8,background:`${bh.cor}15`}}>{bh.val>=0?"+":""}{Math.round(bh.val)}mL</span>}
                </div>
                <div style={{fontSize:10,color:T.text3}}>{l.diagnostico}</div>
              </div>

              <div style={{padding:"8px 13px",flex:1}}>

                {/* Boletim (Ctrl+B) */}
                {boletim&&(
                  <div style={{background:"rgba(56,189,248,0.05)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:6,padding:"6px 9px",marginBottom:8,fontSize:10,color:"#94a3b8",whiteSpace:"pre-wrap",maxHeight:120,overflowY:"auto",fontFamily:mono,lineHeight:1.5}}>
                    {boletim}
                  </div>
                )}

                {/* Alertas */}
                {alerts.length>0&&(
                  <div style={{marginBottom:6,display:"flex",flexDirection:"column",gap:2}}>
                    {alerts.map((a,i)=><div key={i} style={{fontSize:10,color:"#f87171",fontFamily:mono,background:"rgba(248,113,113,0.06)",padding:"2px 7px",borderRadius:4}}>⚠️ {a}</div>)}
                  </div>
                )}

                {/* 🧠 Neurológico */}
                {hasNeuro&&<>
                  <Sec ico="🧠" lbl="NEUROLÓGICO" cor="#c084fc"/>
                  {NEURO_DRUGS.map(k=><DrugRow key={k} dKey={k} vazoes={vaz}/>)}
                  <R lbl="PIC" val={h.c24_pic} unit="mmHg" cor={parseFloat(h.c24_pic)>20?"#f87171":"#cbd5e1"}/>
                  <R lbl="PPC" val={h.c24_ppc} unit="mmHg" cor={parseFloat(h.c24_ppc)<60?"#f87171":"#34d399"}/>
                  <R lbl="DVE" val={h.c24_dve} unit="mL"/>
                </>}

                {/* ❤️ Cardiovascular */}
                {hasCardio&&<>
                  <Sec ico="❤️" lbl="CARDIOVASCULAR" cor="#f87171"/>
                  {CARDIO_DRUGS.map(k=><DrugRow key={k} dKey={k} vazoes={vaz}/>)}
                  <R lbl="FC" val={h.c24_fc} unit="bpm" cor={parseFloat(h.c24_fc)>100||parseFloat(h.c24_fc)<60?"#fbbf24":"#34d399"}/>
                  <R lbl="PAM" val={h.c24_pam} unit="mmHg" cor={parseFloat(h.c24_pam)<65?"#f87171":"#34d399"}/>
                  {h.c24_pas&&<R lbl="PAS/PAD" val={h.c24_pas+(h.c24_pad?"/"+h.c24_pad:"")} unit="mmHg"/>}
                </>}

                {/* 🫁 Respiratório */}
                {hasResp&&<>
                  <Sec ico="🫁" lbl="RESPIRATÓRIO" cor="#38bdf8"/>
                  {vm&&<R lbl="Modo" val={vm.label} cor="#38bdf8"/>}
                  {l.vm_fio2&&<R lbl="FiO₂" val={l.vm_fio2} unit="%"/>}
                  {l.vm_peep&&<R lbl="PEEP" val={l.vm_peep} unit="cmH₂O"/>}
                  {l.vm_ps&&<R lbl="PS" val={l.vm_ps} unit="cmH₂O"/>}
                  {l.vm_pplat&&l.vm_peep&&<R lbl="DP" val={parseFloat(l.vm_pplat)-parseFloat(l.vm_peep)} unit="cmH₂O" cor={parseFloat(l.vm_pplat)-parseFloat(l.vm_peep)>15?"#f87171":"#34d399"}/>}
                  {pp&&l.vm_vt&&<R lbl="VC mL/kg" val={(parseFloat(l.vm_vt)/parseFloat(pp)).toFixed(1)} cor={parseFloat(l.vm_vt)/parseFloat(pp)>8?"#f87171":parseFloat(l.vm_vt)/parseFloat(pp)<=6?"#34d399":"#fbbf24"}/>}
                  <R lbl="SpO₂" val={h.c24_sat} unit="%" cor={parseFloat(h.c24_sat)<92?"#f87171":"#34d399"}/>
                  <R lbl="FR" val={h.c24_fr} unit="irpm" cor={parseFloat(h.c24_fr)>25?"#fbbf24":"#cbd5e1"}/>
                  <R lbl="pH" val={h.ph} cor={parseFloat(h.ph)<7.35?"#f87171":parseFloat(h.ph)>7.45?"#fbbf24":"#34d399"}/>
                  <R lbl="HCO₃" val={h.hco3} unit="mEq/L"/>
                  <R lbl="pO₂" val={h.po2} unit="mmHg"/>
                  <R lbl="pCO₂" val={h.pco2} unit="mmHg" cor={parseFloat(h.pco2)>50?"#fbbf24":parseFloat(h.pco2)<35?"#fbbf24":"#34d399"}/>
                  <R lbl="BE" val={h.be} unit="mEq/L" cor={parseFloat(h.be)<-4?"#f87171":parseFloat(h.be)>4?"#fbbf24":"#34d399"}/>
                </>}

                {/* 🫘 Renal / Metabólico */}
                {hasRenal&&<>
                  <Sec ico="🫘" lbl="RENAL / METABÓLICO" cor="#34d399"/>
                  <R lbl="Creatinina" val={h.cr} unit="mg/dL" cor={parseFloat(h.cr)>1.2?"#fbbf24":"#34d399"}/>
                  <R lbl="Ureia" val={h.ur} unit="mg/dL" cor={parseFloat(h.ur)>60?"#fbbf24":"#cbd5e1"}/>
                  <R lbl="Sódio" val={h.na} unit="mEq/L" cor={parseFloat(h.na)<135||parseFloat(h.na)>145?"#fbbf24":"#34d399"}/>
                  <R lbl="Potássio" val={h.k} unit="mEq/L" cor={parseFloat(h.k)<3.5||parseFloat(h.k)>5.5?"#f87171":parseFloat(h.k)<3.8?"#fbbf24":"#34d399"}/>
                  <R lbl="Magnésio" val={h.mg} unit="mg/dL"/>
                  <R lbl="Cálcio iônico" val={h.cai} unit="mmol/L"/>
                  <R lbl="Fósforo" val={h.p} unit="mg/dL"/>
                  <R lbl="Diurese" val={h.c24_diur} unit="mL"/>
                  {h.c24_hd&&<R lbl="HD/CRRT" val={h.c24_hd} unit="mL"/>}
                  <R lbl="BH 24h" val={h.c24_bh&&(parseFloat(h.c24_bh)>=0?"+":"")+h.c24_bh} unit="mL" cor={parseFloat(h.c24_bh)>500?"#f87171":parseFloat(h.c24_bh)<-500?"#34d399":"#94a3b8"}/>
                </>}

                {/* 🩸 Hematológico */}
                {hasHema&&<>
                  <Sec ico="🩸" lbl="HEMATOLÓGICO" cor="#fb923c"/>
                  <R lbl="Temperatura" val={h.c24_temp} unit="°C" cor={parseFloat(h.c24_temp)>38?"#f87171":parseFloat(h.c24_temp)<36?"#38bdf8":"#34d399"}/>
                  <R lbl="Hb" val={h.hb} unit="g/dL" cor={parseFloat(h.hb)<7?"#f87171":parseFloat(h.hb)<8?"#fbbf24":"#34d399"}/>
                  <R lbl="Leucócitos" val={h.leuco} unit="/mm³" cor={parseFloat(h.leuco)>12000||parseFloat(h.leuco)<4000?"#fbbf24":"#34d399"}/>
                  <R lbl="Plaquetas" val={h.plaq} unit="/mm³" cor={parseFloat(h.plaq)<50000?"#f87171":parseFloat(h.plaq)<100000?"#fbbf24":"#34d399"}/>
                  <R lbl="Lactato" val={h.lact} unit="mmol/L" cor={parseFloat(h.lact)>2?"#fbbf24":parseFloat(h.lact)>4?"#f87171":"#34d399"}/>
                  <R lbl="TGO/AST" val={h.tgo} unit="U/L" cor={parseFloat(h.tgo)>40?"#fbbf24":"#cbd5e1"}/>
                  <R lbl="TGP/ALT" val={h.tgp} unit="U/L" cor={parseFloat(h.tgp)>40?"#fbbf24":"#cbd5e1"}/>
                  <R lbl="Bilirrubina" val={h.bttot} unit="mg/dL"/>
                  <R lbl="RNI" val={h.rni} cor={parseFloat(h.rni)>1.5?"#fbbf24":"#34d399"}/>
                  <R lbl="PCR" val={h.pcr} unit="mg/dL" cor={parseFloat(h.pcr)>10?"#fbbf24":"#34d399"}/>
                </>}

                {/* 🦠 Infeccioso */}
                {hasInf&&<>
                  <Sec ico="🦠" lbl="INFECCIOSO" cor="#a3e635"/>
                  {atbAtivos.map(a=>{
                    const dd=a.dataInicio?Math.floor((new Date()-new Date(a.dataInicio+"T00:00:00"))/86400000)+1:null;
                    const doseInfo=[a.dose,a.intervalo].filter(Boolean).join(" ");
                    return <R key={a.id} lbl={a.nome} val={dd?`D${dd}`:""} unit={doseInfo} cor="#a3e635"/>;
                  })}
                  {h.heCulturas&&<div style={{marginTop:3,fontSize:10,color:"#94a3b8",fontFamily:mono,padding:"2px 0"}}>🧫 {h.heCulturas}</div>}
                </>}

                {/* 🍽 TGI */}
                {hasTgi&&<>
                  <Sec ico="🍽" lbl="TGI" cor="#fb923c"/>
                  <R lbl="Glicemia" val={h.c24_dextro} unit="mg/dL" cor={parseFloat(h.c24_dextro)>180||parseFloat(h.c24_dextro)<70?"#fbbf24":"#34d399"}/>
                  {l.tgUltEvac&&<R lbl="Última evacuação" val={`${Math.floor((new Date()-new Date(l.tgUltEvac+"T00:00:00"))/86400000)}d atrás`}/>}
                  {h.c24_diet_vol&&<R lbl="Dieta" val={h.c24_diet_vol} unit="mL"/>}
                  <R lbl="Albumina" val={h.alb} unit="g/dL" cor={parseFloat(h.alb)<3?"#f87171":parseFloat(h.alb)<3.5?"#fbbf24":"#34d399"}/>
                </>}

                {!hasNeuro&&!hasCardio&&!hasResp&&!hasRenal&&!hasHema&&!hasInf&&!hasTgi&&!boletim&&!alerts.length&&(
                  <div style={{fontSize:11,color:"#334155",textAlign:"center",padding:"12px 0"}}>Sem dados lançados hoje</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ── PlantaoPanel ──────────────────────────────────────────────────────────────
function PlantaoPanel({ leitos, tabelaData, metasPorLeito, onMetaChange, config={} }) {
  const T = useTheme();
  const mono = "'DM Mono',monospace";
  const [filtro, setFiltro] = useState("todos"); // "todos" | "pendentes"

  const getAlerts = (leito) => {
    const alerts = [];
    const tb=tabelaData[leito.id]||{};
    const ds=Object.keys(tb).sort().reverse();
    const crHoje=ds.length?tb[ds[0]]?.cr:null;
    const idade=leito.dataNascimento?Math.floor((new Date()-new Date(leito.dataNascimento+"T00:00:00"))/(365.25*86400000)):null;
    const clcr=(crHoje&&leito.peso&&idade)?Math.round(((140-idade)*parseFloat(leito.peso))/(72*parseFloat(crHoje))*(leito.sexo==="F"?0.85:1)):null;
    (leito.antibioticos||[]).filter(a=>!a.dataFim&&a.nome&&a.dataInicio).forEach(a=>{
      const dias=Math.floor((new Date()-new Date(a.dataInicio+"T00:00:00"))/86400000);
      if(dias<2) return;
      const lc=a.nome.toLowerCase();
      const key=lc.includes("pip")&&lc.includes("tazo")?"pip/tazo":lc.includes("amp")&&lc.includes("sulbactam")?"amp/sulbactam":lc.split(" ")[0].replace(/[^a-z]/g,"");
      if(clcr!==null&&ATB_RENAL[key]?.length>0){const aj=ATB_RENAL[key].find(x=>clcr<x.tfg);if(aj)alerts.push(`⚠️ Ajustar ${a.nome} (ClCr ${clcr} mL/min → ${aj.rec})`);}
    });
    const disps=leito.dispositivos||{};
    const alts={cvc:config.alertaCVC||7,pai:config.alertaPAI||7,svd:config.alertaSVD||14,dialise:config.alertaDialise||14,tot:config.alertaTOT||99,tqt:config.alertaTQT||99,sng:config.alertaSNG||21,dreno:config.alertaDreno||21};
    DISP_MULTIPLO.forEach(d=>(Array.isArray(disps[d.key])?disps[d.key]:[]).forEach((inst,i)=>{if(!inst.data)return;const dd=Math.floor((new Date()-new Date(inst.data+"T00:00:00"))/86400000);if(dd>(alts[d.key]||99))alerts.push(`🔴 Revisar ${d.label}${disps[d.key].length>1?" "+(i+1):"" }: D${dd}`);}));
    DISP_SINGULAR.forEach(d=>{const inst=disps[d.key];if(!inst?.ativo||!inst.data)return;const dd=Math.floor((new Date()-new Date(inst.data+"T00:00:00"))/86400000);if(dd>(alts[d.key]||99))alerts.push(`🔴 Revisar ${d.label}: D${dd}`);});
    return alerts;
  };

  const leitosComDados = leitos.filter(l=>l.paciente);

  return (
    <div style={{padding:"20px 24px",height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{fontSize:18,fontWeight:700,color:T.text1}}>📋 Metas & Pendências — Plantão</div>
        <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
          {["todos","pendentes"].map(f=>(
            <button key={f} onClick={()=>setFiltro(f)}
              style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${filtro===f?"rgba(56,189,248,0.4)":"rgba(255,255,255,0.1)"}`,
                background:filtro===f?"rgba(56,189,248,0.1)":"rgba(255,255,255,0.03)",
                color:filtro===f?"#38bdf8":"#64748b",cursor:"pointer",fontSize:11}}>
              {f==="todos"?"Todos":"Só pendentes"}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:12}}>
        {leitosComDados.map(l=>{
          const metas = (metasPorLeito[l.id]||[]);
          const autoAlerts = getAlerts(l);
          const dias = diasInternacao(l.dataInternacao);
          const pendentes = metas.filter(m=>!m.feito);
          if (filtro==="pendentes" && pendentes.length===0 && autoAlerts.length===0) return null;

          return (
            <div key={l.id} style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
              {/* Header */}
              <div style={{padding:"10px 16px",background:"rgba(255,255,255,0.02)",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${T.border}`}}>
                <span style={{fontWeight:700,color:T.text1,fontSize:13}}>{l.paciente}</span>
                {dias!==null&&<span style={{fontSize:10,fontFamily:mono,color:"#a78bfa",background:"rgba(167,139,250,0.1)",padding:"1px 6px",borderRadius:8}}>D{dias}</span>}
                <span style={{fontSize:11,color:T.text3,flex:1}}>{l.diagnostico}</span>
                <span style={{fontSize:11,fontFamily:mono,color:pendentes.length>0?"#f87171":"#34d399"}}>
                  {pendentes.length>0?`${pendentes.length} pendente${pendentes.length>1?"s":""}`:metas.length>0?"✅ Em dia":"Sem metas"}
                </span>
              </div>

              {/* Alertas automáticos */}
              {autoAlerts.length>0&&(
                <div style={{padding:"6px 16px",background:"rgba(248,113,113,0.04)",borderBottom:`1px solid rgba(248,113,113,0.1)`}}>
                  {autoAlerts.map((a,i)=>(
                    <div key={i} style={{fontSize:11,color:"#f87171",fontFamily:mono,marginBottom:i<autoAlerts.length-1?3:0}}>{a}</div>
                  ))}
                </div>
              )}

              {/* Metas editáveis */}
              {metas.length>0&&(
                <div style={{padding:"8px 16px",display:"flex",flexDirection:"column",gap:4}}>
                  {metas.map((m,i)=>(
                    <div key={m.id||i} style={{display:"flex",alignItems:"flex-start",gap:8}}>
                      <button onClick={()=>{
                        const novas=metas.map((x,j)=>j===i?{...x,feito:!x.feito}:x);
                        onMetaChange(l.id,novas);
                      }} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,padding:"0",marginTop:-1,
                        color:(m.feito?"#34d399":"#334155"),flexShrink:0}}>
                        {m.feito?"☑":"☐"}
                      </button>
                      <span style={{fontSize:12,color:m.feito?"#475569":"#cbd5e1",textDecoration:m.feito?"line-through":"none",flex:1}}>{m.texto||m}</span>
                    </div>
                  ))}
                </div>
              )}

              {metas.length===0&&autoAlerts.length===0&&(
                <div style={{padding:"8px 16px",fontSize:11,color:"#334155"}}>Nenhuma meta lançada para este leito</div>
              )}
            </div>
          );
        })}
        {leitosComDados.length===0&&(
          <div style={{padding:40,textAlign:"center",color:"#334155",fontSize:14}}>Nenhum paciente cadastrado</div>
        )}
      </div>
    </div>
  );
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
  const [config, setConfig] = useState({
    alertaCVC: 7, alertaPAI: 7, alertaSVD: 14, alertaTQT: 99,
    alertaTOT: 99, alertaSNG: 21, alertaDreno: 21, alertaDialise: 14,
  });
  const [saving, setSaving] = useState(false);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [viewGlobal, setViewGlobal]   = useState("leitos");
  const [theme, setTheme] = useState(() => localStorage.getItem("uti_theme") || "dark");
  const T = theme === "light" ? LIGHT : DARK;
  const toggleTheme = () => setTheme(t => { const next = t==="dark"?"light":"dark"; localStorage.setItem("uti_theme",next); return next; });
  const saveTimer   = useRef(null);
  const evolTimer   = useRef(null);
  const tabelaTimer = useRef(null);
  const configTimer = useRef(null);
  const metasTimer  = useRef(null);

  // ── LOAD ─────────────────────────────────────────────────────────────────────
  const loadData = async () => {
    let leitoAtualId = LEITOS_INICIAIS[0].id;
    try {
      const { data: ld } = await supabase.from("config").select("value").eq("key","leitos_data").single();
      if (ld?.value) {
        const p = JSON.parse(ld.value);
        if (Array.isArray(p) && p.length) {
          setLeitos(p);
          leitoAtualId = p[0].id;
          setLeitoSelId(p[0].id);
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
    // Libera saves apenas após load completo
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

  // ── SAVES manuais (chamados explicitamente, não por useEffect) ────────────────
  const salvarLeitos = (val) => {
    if (!isLoaded.current) return;
    clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async()=>{
      try { await supabase.from("config").upsert({key:"leitos_data",value:JSON.stringify(val)}); } catch {}
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

  const leito = leitos.find(l=>l.id===leitoSelId)||leitos[0];
  const atualizar = (d) => {
    setLeitos(ls=>{
      const novo = ls.map(l=>l.id===leitoSelId?{...l,...d}:l);
      salvarLeitos(novo);
      return novo;
    });
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
    {id:"dadosclinicos", label:"🫁 Dados Clínicos"},
    {id:"tabela",        label:"📊 Tabela Clínica"},
    {id:"upload",        label:"📤 Importar Print"},
    {id:"evolucao",      label:"📝 Evolução"},
    {id:"metas",         label:"🎯 Metas & Pendências"},
  ];

  const dias = diasInternacao(leito.dataInternacao);
  const idadeAnos = leito.dataNascimento
    ? Math.floor((new Date()-new Date(leito.dataNascimento+'T00:00:00'))/(365.25*86400000))
    : null;
  const pp   = pesoPredito(leito.altura, leito.sexo);

  if (!appReady) return (
    <div style={{minHeight:"100vh",background:"#080f0a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{color:"#38bdf8",fontSize:14}}>Carregando…</div>
    </div>
  );

  if (!authed) return <LoginScreen onLogin={onLogin}/>;

  return (
    <ThemeCtx.Provider value={T}>
    <div style={{minHeight:"100vh",background:T.bgPage,fontFamily:"'Sora','DM Sans',sans-serif",color:T.text1,display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box} textarea,input{outline:none;color-scheme:${T.colorScheme}}
        ::placeholder{color:${T.text4}!important;opacity:0.7}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:${T.accent}44;border-radius:4px}
        input[type=date]::-webkit-calendar-picker-indicator{filter:${theme==="light"?"none":"invert(0.5)"}} button:hover{opacity:0.88}
        .uti-tab-btn{transition:color 0.15s,border-color 0.15s}
        @media(max-width:700px){.prob-floating{position:static!important;width:100%!important;margin-bottom:12px;filter:none!important}}
        @media(max-width:700px){
          .prob-sticky-col{position:static!important;width:100%!important;order:-1}
        }
      `}</style>

      <div style={{padding:"0 24px",height:56,display:"flex",alignItems:"center",borderBottom:`1px solid ${T.borderAccent}`,background:T.bgHeader,position:"sticky",top:0,zIndex:100,backdropFilter:"blur(12px)"}}>
        <button onClick={()=>setShowSidebar(s=>!s)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,color:T.text3,cursor:"pointer",fontSize:16,padding:"4px 8px",marginRight:14}} title="Toggle sidebar">☰</button>
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
          <button onClick={()=>setAba("config")} title="Configurações" style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,color:T.text3,cursor:"pointer",fontSize:14,padding:"4px 8px"}}>⚙️</button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden",height:"calc(100vh - 56px)"}}>
        {showSidebar && <div style={{width:228,borderRight:`1px solid ${T.borderAccent}`,padding:"20px 14px",overflowY:"auto",background:T.bgSidebar,flexShrink:0}}>
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
                  onClick={()=>{setLeitoSelId(l.id);setDadosIA(null);setEvolCampos(EVOLUCAO_VAZIA);setEvolVersion(0);setAba("paciente");setViewGlobal("leitos");if(window.innerWidth<=768)setShowSidebar(false);}}
                  onRename={nome=>{setLeitos(ls=>{const novo=ls.map(x=>x.id===l.id?{...x,nome}:x);salvarLeitos(novo);return novo;})}}
                  onRemove={leitos.length>1?()=>{
                    setLeitos(ls=>{const novo=ls.filter(x=>x.id!==l.id);salvarLeitos(novo);setLeitoSelId(novo[0].id);return novo;});
                    setViewGlobal("leitos");
                  }:null}
                />
              </div>
            </div>
          ))}
          <div style={{marginTop:16,borderTop:`1px solid ${T.border}`,paddingTop:12}}>
            <button onClick={()=>setViewGlobal(v=>v==="visao_geral"?"leitos":"visao_geral")}
            style={{width:"100%",padding:"7px",marginBottom:4,background:viewGlobal==="visao_geral"?"rgba(56,189,248,0.1)":"rgba(255,255,255,0.03)",
              border:`1px solid ${viewGlobal==="visao_geral"?"rgba(56,189,248,0.3)":"rgba(255,255,255,0.08)"}`,
              borderRadius:7,color:viewGlobal==="visao_geral"?"#38bdf8":"#64748b",cursor:"pointer",fontSize:11,fontWeight:600}}>
            🏥 Visão Geral
          </button>
          <button onClick={()=>setViewGlobal(v=>v==="plantao"?"leitos":"plantao")}
            style={{width:"100%",padding:"7px",marginBottom:4,background:viewGlobal==="plantao"?"rgba(167,139,250,0.1)":"rgba(255,255,255,0.03)",
              border:`1px solid ${viewGlobal==="plantao"?"rgba(167,139,250,0.3)":"rgba(255,255,255,0.08)"}`,
              borderRadius:7,color:viewGlobal==="plantao"?"#c084fc":"#64748b",cursor:"pointer",fontSize:11,fontWeight:600}}>
            📋 Plantão
          </button>
          <button onClick={()=>setViewGlobal(v=>v==="ferramentas"?"leitos":"ferramentas")} style={{width:"100%",padding:"9px 12px",background:viewGlobal==="ferramentas"?T.accentBg:"none",border:`1px solid ${viewGlobal==="ferramentas"?T.accentBorder:T.border}`,borderRadius:8,color:viewGlobal==="ferramentas"?T.accent:T.text3,cursor:"pointer",fontSize:12,fontWeight:600,textAlign:"left",fontFamily:"inherit"}}>
              📚 Links & Protocolos
            </button>
          </div>
        </div>}

        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {viewGlobal==="ferramentas" ? (
            <div style={{flex:1,overflowY:"auto"}}><FerramentasPanel/></div>
          ) : viewGlobal==="visao_geral" ? (
            <div style={{flex:1,overflowY:"auto"}}>
              <VisaoGeralPanel leitos={leitos} tabelaData={tabelaData} metasPorLeito={metasPorLeito} config={config}/>
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
                ].map((a,i)=>{
                  const po=Math.floor((new Date()-new Date(a.data+"T00:00:00"))/86400000);
                  const cor=po>a.alertaDias?"#f87171":"#38bdf8";
                  return <span key={i} style={{fontSize:10,fontFamily:mono,color:cor,background:`${cor}18`,border:`1px solid ${cor}44`,borderRadius:4,padding:"1px 7px"}}>{a.label} D{po}{po>a.alertaDias?" ⚠️":""}</span>;
                })}
              </div>
            </div>
          )}

          <div style={{display:"flex",borderBottom:`1px solid ${T.border}`,paddingLeft:16,overflowX:"auto",flexShrink:0,background:T.bgCard}}>
            {ABAS.map(a=>(
              <button key={a.id} onClick={()=>setAba(a.id)} className="uti-tab-btn" style={{padding:"14px 16px",background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:aba===a.id?700:500,color:aba===a.id?T.accent:T.text3,borderBottom:aba===a.id?`2px solid ${T.accent}`:"2px solid transparent",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                {a.label}
              </button>
            ))}
          </div>


          <div style={{flex:1,overflowY:"auto",padding:"28px 32px",background:T.bgPage}}>
            {aba==="config" ? (
              <ConfigPanel config={config} onChange={c=>{setConfig(c);salvarConfig(c);}} onVoltar={()=>setAba("paciente")}/>
            ) : aba==="dadosclinicos" ? (
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
                onAplicarEvolucao={(campos)=>{ setEvolCamposComPersistencia(c=>({...c,...campos})); setEvolVersion(v=>v+1); setAba("evolucao"); }}
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
                <div style={{maxWidth:700}}>
                  {dadosIA&&<div style={{background:"rgba(56,189,248,0.07)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#86efac"}}>✅ Dados da IA aplicados — revise e edite abaixo</div>}
                  <EvolucaoEditor leito={leito} campos={evolCampos} key={`${leito.id}-${evolVersion}`}
                    onBoletim={txt=>atualizar({...leito,boletim:txt})}
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
        </>)}
        </div>
      </div>
    </div>
    </ThemeCtx.Provider>
  );
}

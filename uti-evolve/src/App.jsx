import { useState, useRef, useCallback, useEffect } from "react";
import React from "react";
import { supabase } from './supabase.js';

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
  { id:1, nome:"Leito 01", paciente:"", diagnostico:"", dataInternacao:"", peso:"", altura:"", sexo:"M", procedimentos:[], dispositivos:{} },
  { id:2, nome:"Leito 02", paciente:"", diagnostico:"", dataInternacao:"", peso:"", altura:"", sexo:"M", procedimentos:[], dispositivos:{} },
  { id:3, nome:"Leito 03", paciente:"", diagnostico:"", dataInternacao:"", peso:"", altura:"", sexo:"M", procedimentos:[], dispositivos:{} },
  { id:4, nome:"Leito 04", paciente:"", diagnostico:"", dataInternacao:"", peso:"", altura:"", sexo:"M", procedimentos:[], dispositivos:{} },
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
    doseInfo:"5 – 50 mcg/kg/min  (= 0,3 – 3 mg/kg/h)\nSedação leve: 5–10 mcg/kg/min\nSedação profunda: 25–50 mcg/kg/min\nAlerta PRIS: > 4 mg/kg/h por > 48h",
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

function Pill({ label, value, unit, color="#38bdf8", warn=false }) {
  return (
    <div style={{ background: warn?"rgba(248,113,113,0.08)":"rgba(255,255,255,0.04)", border:`1px solid ${warn?"rgba(248,113,113,0.3)":"rgba(255,255,255,0.08)"}`, borderRadius:8, padding:"8px 12px", minWidth:90, textAlign:"center" }}>
      <div style={{ fontSize:10, color:"#64748b", fontFamily:mono, letterSpacing:1, marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:700, color: warn?"#f87171":color }}>{value??"-"}</div>
      {unit&&<div style={{ fontSize:10, color:"#64748b", marginTop:1 }}>{unit}</div>}
    </div>
  );
}

function SecTitle({ children }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, margin:"20px 0 10px" }}>
      <div style={{ width:3, height:14, background:"#38bdf8", borderRadius:2 }}/>
      <span style={{ fontSize:11, color:"#38bdf8", fontFamily:mono, letterSpacing:2 }}>{children}</span>
    </div>
  );
}

function Field({ label, value, onChange, type="text", placeholder="", suffix="" }) {
  return (
    <div style={{ flex:1 }}>
      <div style={{ fontSize:10, color:"#64748b", fontFamily:mono, letterSpacing:1, marginBottom:4 }}>{label}</div>
      <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, overflow:"hidden" }}>
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{ flex:1, background:"none", border:"none", padding:"8px 10px", color:"#e2e8f0", fontSize:13, fontFamily:"inherit", width:"100%" }}/>
        {suffix&&<span style={{ paddingRight:10, color:"#475569", fontSize:12, alignSelf:"center" }}>{suffix}</span>}
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
  const acimaDose = resultado && conf.max && parseFloat(resultado.dose) > conf.max;
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
  // Enterais
  { id:"isosource_std",  nome:"Isosource Standard 1.0",  tipo:"enteral",    kcalML:1.00, ptnML:0.040, choML:0.132, lipML:0.035 },
  { id:"isosource_15",   nome:"Isosource 1.5",            tipo:"enteral",    kcalML:1.50, ptnML:0.059, choML:0.166, lipML:0.058 },
  { id:"isosource_hpn",  nome:"Isosource HPN",            tipo:"enteral",    kcalML:1.00, ptnML:0.056, choML:0.110, lipML:0.039 },
  { id:"fresubin_1000",  nome:"Fresubin 1000",             tipo:"enteral",    kcalML:1.00, ptnML:0.038, choML:0.134, lipML:0.034 },
  { id:"fresubin_2kcal", nome:"Fresubin 2 kcal",          tipo:"enteral",    kcalML:2.00, ptnML:0.075, choML:0.228, lipML:0.098 },
  { id:"fresubin_hp",    nome:"Fresubin HP Energy",        tipo:"enteral",    kcalML:1.50, ptnML:0.075, choML:0.174, lipML:0.058 },
  { id:"nutrison_std",   nome:"Nutrison Standard",         tipo:"enteral",    kcalML:1.00, ptnML:0.040, choML:0.124, lipML:0.039 },
  { id:"nutrison_energy",nome:"Nutrison Energy",           tipo:"enteral",    kcalML:1.50, ptnML:0.060, choML:0.186, lipML:0.058 },
  { id:"nutrison_prot",  nome:"Nutrison Protein Intense",  tipo:"enteral",    kcalML:1.28, ptnML:0.100, choML:0.116, lipML:0.050 },
  { id:"peptamen_std",   nome:"Peptamen Standard",         tipo:"enteral",    kcalML:1.00, ptnML:0.040, choML:0.127, lipML:0.039 },
  { id:"peptamen_15",    nome:"Peptamen 1.5",              tipo:"enteral",    kcalML:1.50, ptnML:0.069, choML:0.143, lipML:0.071 },
  { id:"osmolite_10",    nome:"Osmolite 1.0",              tipo:"enteral",    kcalML:1.06, ptnML:0.044, choML:0.143, lipML:0.034 },
  { id:"osmolite_15",    nome:"Osmolite 1.5",              tipo:"enteral",    kcalML:1.50, ptnML:0.062, choML:0.194, lipML:0.049 },
  { id:"novasource_gi",  nome:"Novasource GI",             tipo:"enteral",    kcalML:1.00, ptnML:0.045, choML:0.122, lipML:0.033 },
  { id:"novasource_gcn", nome:"Novasource GCN",            tipo:"enteral",    kcalML:1.00, ptnML:0.040, choML:0.138, lipML:0.030 },
  { id:"jevity_10",      nome:"Jevity 1.0",                tipo:"enteral",    kcalML:1.06, ptnML:0.044, choML:0.154, lipML:0.035 },
  { id:"impact",         nome:"Impact (imunomoduladora)",  tipo:"enteral",    kcalML:1.00, ptnML:0.056, choML:0.130, lipML:0.028 },
  { id:"glucerna",       nome:"Glucerna",                  tipo:"enteral",    kcalML:1.00, ptnML:0.042, choML:0.096, lipML:0.054 },
  // Parenterais
  { id:"npt_3em1_c",     nome:"NPT 3 em 1 Central (padrão)",  tipo:"parenteral", kcalML:1.00, ptnML:0.050, choML:0.140, lipML:0.030, obs:"Ajustar conforme prescrição" },
  { id:"npt_3em1_p",     nome:"NPT 3 em 1 Periférica",         tipo:"parenteral", kcalML:0.70, ptnML:0.040, choML:0.100, lipML:0.025, obs:"Osmolaridade <800 mOsm/L" },
  { id:"smof_lipid",     nome:"SMOFlipid 20% (lipídeo isolado)",tipo:"parenteral", kcalML:1.90, ptnML:0,    choML:0,     lipML:0.200 },
  { id:"glutamine",      nome:"Dipeptiven (glutamina)",         tipo:"parenteral", kcalML:0,    ptnML:0.082, choML:0,     lipML:0 },
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
                {dietaSel ? <><strong>{dietaSel.nome}</strong><span style={{fontSize:11,color:"#64748b",marginLeft:8}}>{dietaSel.kcalML} kcal/mL · {(dietaSel.ptnML*100).toFixed(1)} g ptn/100mL</span></> : "📋 Selecionar do catálogo..."}
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
                      style={{width:"100%",padding:"8px 12px",textAlign:"left",background:dieta.catalogId===d.id?"rgba(56,189,248,0.1)":"transparent",border:"none",borderRadius:7,cursor:"pointer",color:"#e2e8f0",fontSize:12,fontFamily:"inherit",display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontWeight:600}}>{d.nome}{d.id.startsWith("custom_")&&<span style={{fontSize:9,color:"#c4b5fd",marginLeft:4}}> ★</span>}</span>
                      <span style={{fontSize:10,color:"#64748b",fontFamily:mono}}>{d.kcalML} kcal/mL · {(d.ptnML*100).toFixed(1)} g ptn</span>
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
  return (
    <div style={{
      borderRadius:10,
      border:`1px solid ${alerta?"rgba(248,113,113,0.4)":"rgba(56,189,248,0.2)"}`,
      background:alerta?"rgba(248,113,113,0.04)":"rgba(56,189,248,0.03)",
      overflow:"hidden", marginBottom:8,
    }}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px"}}>
        <span style={{fontSize:15}}>{icone}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{label}</div>
          {disp.site && <div style={{fontSize:11,color:"#64748b",marginTop:1}}>{disp.site}</div>}
        </div>
        {dias !== null && (
          <div style={{textAlign:"center",padding:"4px 10px",borderRadius:8,minWidth:50,
            background:alerta?"rgba(248,113,113,0.12)":"rgba(56,189,248,0.1)",
            border:`1px solid ${alerta?"rgba(248,113,113,0.35)":"rgba(56,189,248,0.25)"}`}}>
            <div style={{fontSize:15,fontWeight:700,color:alerta?"#f87171":"#38bdf8",lineHeight:1}}>
              {dias===0?"D0":`D${dias}`}
            </div>
            {alerta&&<div style={{fontSize:9,color:"#f87171",fontFamily:mono,marginTop:1}}>REVISAR</div>}
          </div>
        )}
        <button onClick={onRemove} style={{
          background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.25)",
          borderRadius:8,color:"#f87171",cursor:"pointer",fontSize:11,padding:"4px 10px",fontWeight:600,
        }}>Retirar</button>
      </div>
      <div style={{padding:"0 14px 12px",borderTop:"1px solid rgba(255,255,255,0.04)",paddingTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:120}}>
          <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:4}}>DATA INSERÇÃO</div>
          <input type="date" value={disp.data||""} onChange={e=>onUpdate("data",e.target.value)}
            style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"7px 10px",color:"#e2e8f0",fontSize:12,fontFamily:"inherit"}}/>
        </div>
        <div style={{flex:1,minWidth:130}}>
          <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:4}}>SÍTIO / LOCALIZAÇÃO</div>
          <input value={disp.site||""} onChange={e=>onUpdate("site",e.target.value)} placeholder="Ex: Femoral E / Tórax D / Peritônio"
            style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"7px 10px",color:"#e2e8f0",fontSize:12,fontFamily:"inherit"}}/>
        </div>
        <div style={{flex:2,minWidth:160}}>
          <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:4}}>OBSERVAÇÕES</div>
          <input value={disp.obs||""} onChange={e=>onUpdate("obs",e.target.value)} placeholder="Curativo ok, sem sinais de infecção…"
            style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"7px 10px",color:"#e2e8f0",fontSize:12,fontFamily:"inherit"}}/>
        </div>
      </div>
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

      {/* Múltiplos */}
      {DISP_MULTIPLO.map(({key,label,icone})=>{
        const lista = getMultiplos(key);
        if (!lista.length) return null;
        return (
          <div key={key}>
            {lista.map((disp,i)=>(
              <DispCard key={disp.id}
                label={lista.length>1?`${label} ${i+1}`:label}
                icone={icone} alertaDias={getAlerta(key)} disp={disp}
                onUpdate={(f,v)=>updMultiplo(key,disp.id,f,v)}
                onRemove={()=>retirarMultiplo(key,disp.id)}
              />
            ))}
          </div>
        );
      })}

      {/* Singulares */}
      {DISP_SINGULAR.map(({key,label,icone})=>{
        if (!isSingularAtivo(key)) return null;
        const disp = dispositivos[key];
        return (
          <DispCard key={key} label={label} icone={icone} alertaDias={getAlerta(key)} disp={disp}
            onUpdate={(f,v)=>updSingular(key,f,v)}
            onRemove={()=>retirarSingular(key)}
          />
        );
      })}

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

// ── PacientePanel ─────────────────────────────────────────────────────────────
function PacientePanel({ dados, onChange, config={}, onLancarDroga, onConfigChange, diureseHoje="", tabelaHoje={} }) {
  const dias  = diasInternacao(dados.dataInternacao);
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
        <Field label="NOME / ID"      value={dados.paciente}    onChange={v=>onChange({...dados,paciente:v})}    placeholder="Nome ou prontuário"/>
        <Field label="DIAGNÓSTICO"    value={dados.diagnostico} onChange={v=>onChange({...dados,diagnostico:v})} placeholder="Diagnóstico principal"/>
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:10 }}>
        <Field label="DATA INTERNAÇÃO" value={dados.dataInternacao} onChange={v=>onChange({...dados,dataInternacao:v})} type="date"/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10, color:"#64748b", fontFamily:mono, letterSpacing:1, marginBottom:4 }}>SEXO BIOLÓGICO</div>
          <div style={{ display:"flex", gap:6 }}>
            {["M","F"].map(s=>(
              <button key={s} onClick={()=>onChange({...dados,sexo:s})} style={{ flex:1, padding:"8px", borderRadius:8, border:`1px solid ${dados.sexo===s?"#38bdf8":"rgba(255,255,255,0.1)"}`, background:dados.sexo===s?"rgba(56,189,248,0.12)":"rgba(255,255,255,0.03)", color:dados.sexo===s?"#38bdf8":"#64748b", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                {s==="M"?"♂ Masculino":"♀ Feminino"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <Field label="PESO ATUAL (kg)" value={dados.peso}   onChange={v=>onChange({...dados,peso:v})}   type="number" placeholder="70" suffix="kg"/>
        <Field label="ALTURA (cm)"     value={dados.altura} onChange={v=>onChange({...dados,altura:v})} type="number" placeholder="170" suffix="cm"/>
      </div>

      {(dias!==null||pp||dados.peso) && <>
        <SecTitle>PARÂMETROS CALCULADOS</SecTitle>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {dias!==null && <Pill label="INTERNAÇÃO"   value={`D${dias}`}   unit="dias"            color="#a78bfa"/>}
          {dados.peso  && <Pill label="PESO ATUAL"   value={dados.peso}   unit="kg"              color="#f59e0b"/>}
          {pp          && <Pill label="PESO PREDITO" value={pp}           unit="kg (ARDSNet)"    color="#fb923c"/>}
          {vc6         && <Pill label="VC 6 mL/kg"   value={vc6}          unit="mL (protetor)"   color="#34d399"/>}
          {vc8         && <Pill label="VC 8 mL/kg"   value={vc8}          unit="mL (máx ARDSNet)"color="#34d399"/>}
        </div>
        {pp && (
          <div style={{ marginTop:10, padding:"10px 14px", background:"rgba(251,146,60,0.07)", border:"1px solid rgba(251,146,60,0.25)", borderRadius:8, fontSize:12, color:"#fdba74" }}>
            💡 <strong>Peso predito (ARDSNet):</strong> {dados.sexo==="M"?"♂":"♀"} {dados.altura} cm → {pp} kg.
            Use <strong>{vc6} mL</strong> como ponto de partida para VM protetora (6 mL/kg PP) e não ultrapasse <strong>{vc8} mL</strong> (8 mL/kg PP) no SDRA.
          </div>
        )}
      </>}

      {dados.peso && <>
        <SecTitle>CALCULADORA DE DROGAS — VAZÃO → DOSE</SecTitle>
        <DrogasCalculadora peso={dados.peso} onLancarDroga={onLancarDroga} config={config}
          vazoes={dados.drogasVazao||{}}
          onVazaoChange={(key,val)=>onChange({...dados,drogasVazao:{...(dados.drogasVazao||{}),[key]:val}})}
        />
      </>}

      <DietaPanel dados={dados} config={config} onChange={onChange}
        diureseHojeVol={(tabelaHoje||{}).c24_diet_vol||""}/>

      <DispositivosPanel
        dispositivos={dados.dispositivos||{}}
        onChange={disps=>onChange({...dados,dispositivos:disps})}
        alertas={{
          cvc:config.alertaCVC||7, pai:config.alertaPAI||7,
          svd:config.alertaSVD||14, dialise:config.alertaDialise||14,
          tot:config.alertaTOT||99, tqt:config.alertaTQT||99,
          sng:config.alertaSNG||21, dreno:config.alertaDreno||21,
        }}
      />

      <ProcedimentosPanel
        procedimentos={dados.procedimentos||[]}
        onChange={procs=>onChange({...dados,procedimentos:procs})}
      />

      <SecTitle>HISTÓRICO CLÍNICO</SecTitle>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:4}}>DOENÇAS PRÉVIAS / COMORBIDADES</div>
        <textarea value={dados.doencasPrevias||""} onChange={e=>onChange({...dados,doencasPrevias:e.target.value})}
          placeholder={"HAS · DM2 · ICC (FEVE 35%) · DRC estágio 3 · DPOC · FA crônica..."}
          rows={3}
          style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 10px",color:"#cbd5e1",fontSize:12,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box",lineHeight:1.5}}/>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:4}}>MEDICAÇÕES DE USO CONTÍNUO (domiciliar)</div>
        <textarea value={dados.medicacoesContinuas||""} onChange={e=>onChange({...dados,medicacoesContinuas:e.target.value})}
          placeholder={"- Losartana 50mg 1x/d\n- Metformina 500mg 2x/d\n- AAS 100mg 1x/d\n- Furosemida 40mg 1x/d"}
          rows={4}
          style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 10px",color:"#cbd5e1",fontSize:12,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box",lineHeight:1.5}}/>
      </div>
    </div>
  );
}

// ── UploadAnalyzer ────────────────────────────────────────────────────────────
function UploadAnalyzer({ onResult }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [draft,   setDraft]   = useState(null);
  const [rev,     setRev]     = useState(false);
  const fileRef = useRef();
  const areaRef = useRef();

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
                <div style={{fontSize:12,color:"#cbd5e1"}}>{d.nome}</div>
                <div style={{fontSize:10,color:"#475569",fontFamily:mono}}>{d.tipo} · {d.kcalML} kcal/mL · {(d.ptnML*100).toFixed(1)} g ptn/100mL{d.choML?` · CHO ${(d.choML*100).toFixed(0)} g`:""}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
    {key:"ph",    label:"pH",               unit:""},
    {key:"hco3",  label:"HCO3",             unit:"mEq/L"},
  ]},
  { grupo:"❤️ Cardiovascular", params:[
    {key:"trop",  label:"Troponina",        unit:"ng/mL"},
    {key:"bnp",   label:"BNP",              unit:"pg/mL"},
    {key:"ntpro", label:"NT-proBNP",        unit:"pg/mL"},
    {key:"be",    label:"BE",               unit:"mEq/L"},
    {key:"lact",  label:"Lactato",          unit:"mmol/L"},
  ]},
  { grupo:"🫁 Respiratório", params:[
    {key:"po2",   label:"pO2",              unit:"mmHg"},
    {key:"pco2",  label:"pCO2",             unit:"mmHg"},
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
  { grupo:"🌡️ Sinais Vitais", params:[
    {key:"c24_temp",  label:"T (mín/máx)",    unit:"°C"},
    {key:"c24_fc",    label:"FC (mín/máx)",   unit:"bpm"},
    {key:"c24_fr",    label:"FR (mín/máx)",   unit:"irpm"},
    {key:"c24_sat",   label:"SpO2 (mín/máx)", unit:"%"},
    {key:"c24_pam",   label:"PAM (mín/máx)",  unit:"mmHg"},
    {key:"c24_pas",   label:"PAS/PAD",         unit:"mmHg"},
  ]},
  { grupo:"🩺 Metabólico", params:[
    {key:"c24_dextro", label:"Glic cap (mín/máx)", unit:"mg/dL"},
  ]},
  { grupo:"💧 Balanço Hídrico", params:[
    {key:"c24_diur",     label:"Diurese",         unit:"mL"},
    {key:"c24_bh",       label:"Balanço Hídrico",  unit:"mL"},
    {key:"c24_diet_vol", label:"Vol. Dieta recebida", unit:"mL"},
  ]},
  // Drenos/SNG/Evac: adicionados dinamicamente como _dreno_[nome]
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
  c24_diur:"Diurese", c24_bh:"BH",
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

// ── OptionalDrenosUI ─────────────────────────────────────────────────────────
function OptionalDrenosUI({ data, onChange, datas, hoje }) {
  const [show, setShow] = useState(false);
  const [nome, setNome] = useState("");
  const SUGESTOES = ["Dreno abdominal", "Dreno torácico D", "Dreno torácico E", "Dreno pélvico", "Dreno Jackson-Pratt", "Resíduo SNG", "Evacuações"];

  const adicionar = (n = nome) => {
    if (!n.trim()) return;
    const key = `_dreno_${n.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')}`;
    const dataHoje = hoje;
    onChange({ ...data, [dataHoje]: { ...(data[dataHoje]||{}), [key]: data[dataHoje]?.[key] || "" }});
    setNome(""); setShow(false);
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
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <input value={nome} onChange={e=>setNome(e.target.value)} onKeyDown={e=>e.key==="Enter"&&adicionar()}
              placeholder="Ex: Dreno abdominal"
              style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(52,211,153,0.3)",borderRadius:6,padding:"7px 10px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
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
function TabelaClinica({ leito, data, onChange, onAplicarEvolucao, config={} }) {
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
      const antRaw = dtAnt ? getVal(dtAnt, k) : "";
      if (!atuRaw && !antRaw) return null;
      const atu = fmtVal(k, atuRaw);
      const ant = fmtVal(k, antRaw);
      const val = (ant && atu && ant !== atu) ? `${ant} > ${atu}` : (atu || ant);
      return `${abrev} ${val}`;
    }).filter(Boolean).join(" / ");

    // Controles 24h: mantém string bruta inteira (preserva intervalos "36 / 37.2")
    const pegarCtrl = (keys) => keys.map(k=>{
      const abrev = ABREV[k] || k;
      const val = getVal(chaveHoje, k);
      if (!val) return null;
      return `${abrev}: ${val}`;
    }).filter(Boolean).join(" · ");

    // Drenos dinâmicos (_dreno_*) → TGI
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

    onAplicarEvolucao(campos);
  };

  const thStyle = (ativo) => ({
    padding:"6px 8px", fontSize:11, fontFamily:mono, letterSpacing:1,
    color:ativo?"#38bdf8":"#64748b",
    background:ativo?"rgba(56,189,248,0.08)":"rgba(255,255,255,0.03)",
    borderBottom:ativo?"2px solid #38bdf8":"2px solid rgba(255,255,255,0.06)",
    whiteSpace:"pre", textAlign:"center", minWidth:72, position:"sticky", top:0,
  });
  const tdBase = {padding:"2px 3px", borderBottom:"1px solid rgba(255,255,255,0.04)", textAlign:"center"};

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:15,fontWeight:700}}>Tabela Clínica</div>
          <div style={{fontSize:12,color:"#64748b"}}>Registre valores diários · depois aplique na evolução</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setShowAddCol(v=>!v)} style={{padding:"8px 14px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:"#94a3b8",fontWeight:600,fontSize:12,cursor:"pointer"}}>
            {showAddCol?"✕ Fechar":"📅 Adicionar dia"}
          </button>
          {tabela==="labs" && <button onClick={()=>setShowAddExame(v=>!v)} style={{padding:"8px 14px",background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.25)",borderRadius:8,color:"#c4b5fd",fontWeight:600,fontSize:12,cursor:"pointer"}}>
            {showAddExame?"✕ Fechar":"🧪 Novo exame"}
          </button>}
          <button onClick={gerarEvolucao} style={{padding:"8px 16px",background:"linear-gradient(135deg,#0ea5e9,#0284c7)",border:"none",borderRadius:8,color:"white",fontWeight:700,fontSize:12,cursor:"pointer"}}>
            📝 Aplicar na evolução
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{display:"flex",gap:4,marginBottom:14,background:"rgba(255,255,255,0.03)",borderRadius:10,padding:4}}>
        {[["labs","🔬 Exames Laboratoriais"],["controles","📊 Controles 24h"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTabela(id)} style={{flex:1,padding:"8px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:tabela===id?700:400,background:tabela===id?"rgba(56,189,248,0.15)":"transparent",color:tabela===id?"#38bdf8":"#64748b",transition:"all 0.2s"}}>
            {label}
          </button>
        ))}
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
        <div style={{padding:40,textAlign:"center",color:"#334155",fontSize:13}}>
          Nenhum dado ainda. Cole um print na aba 📤 ou adicione um dia manualmente.
        </div>
      ) : (
        <div style={{overflowX:"auto",borderRadius:10,border:"1px solid rgba(255,255,255,0.07)"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={{...thStyle(false),textAlign:"left",minWidth:155,padding:"8px 12px",position:"sticky",left:0,zIndex:2,background:"#0b1510"}}>Parâmetro</th>
                <th style={{...thStyle(false),minWidth:46,position:"sticky",left:155,zIndex:2,background:"#0b1510"}}>Un.</th>
                {datas.map(d=>(
                  <th key={d} style={thStyle(isHoje(d))}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                      {fmtData(d).split('\n').map((linha,i)=>(
                        <span key={i} style={{fontSize:i===1?10:11}}>{linha}</span>
                      ))}
                      {isHoje(d)&&<span style={{fontSize:9,letterSpacing:0.5,color:"#38bdf8"}}>HOJE</span>}
                      {!isHoje(d)&&<button onClick={()=>removerColuna(d)} style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:9,padding:0}}>✕</button>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GRUPOS_LAB.map(({grupo,params})=>(
                <React.Fragment key={grupo}>
                  <tr>
                    <td colSpan={2+datas.length} style={{padding:"7px 12px",fontSize:10,fontWeight:700,color:"#475569",background:"rgba(255,255,255,0.025)",fontFamily:mono,letterSpacing:1.5,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                      {grupo}
                    </td>
                  </tr>
                  {params.map(({key,label,unit})=>(
                    <tr key={key}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{...tdBase,padding:"4px 12px",fontSize:12,color:"#94a3b8",textAlign:"left",position:"sticky",left:0,background:"#080f0a"}}>{label}</td>
                      <td style={{...tdBase,fontSize:10,color:"#475569",fontFamily:mono,position:"sticky",left:155,background:"#080f0a"}}>{unit}</td>
                      {datas.map(d=>{
                        const ativo=isHoje(d);
                        const val=getVal(d,key);
                        const idxD=datas.indexOf(d);
                        const ant=idxD>0?getVal(datas[idxD-1],key):"";
                        const subiu=val&&ant&&val!==ant&&parseFloat(val)>parseFloat(ant);
                        const caiu=val&&ant&&val!==ant&&parseFloat(val)<parseFloat(ant);
                        return (
                          <td key={d} style={{...tdBase,background:ativo?"rgba(56,189,248,0.03)":undefined}}>
                            <input value={val} onChange={e=>setVal(d,key,e.target.value)}
                              style={{width:"100%",background:"transparent",border:"none",
                                color:ativo&&subiu?"#f87171":ativo&&caiu?"#34d399":"#e2e8f0",
                                fontSize:12,fontFamily:mono,textAlign:"center",padding:"3px 4px",outline:"none",
                                fontWeight:ativo?700:400}}
                              placeholder="—"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {/* Exames extras dinâmicos */}
              {extrasKeys.length > 0 && (
                <React.Fragment>
                  <tr>
                    <td colSpan={2+datas.length} style={{padding:"7px 12px",fontSize:10,fontWeight:700,color:"#475569",background:"rgba(255,255,255,0.025)",fontFamily:mono,letterSpacing:1.5,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
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
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{...tdBase,padding:"4px 8px 4px 12px",textAlign:"left",position:"sticky",left:0,background:"#080f0a"}}>
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
                        <td style={{...tdBase,fontSize:10,color:"#475569",fontFamily:mono,position:"sticky",left:155,background:"#080f0a"}}>—</td>
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
            <OptionalDrenosUI data={data} onChange={onChange} datas={datas} hoje={hoje}/>
            <div style={{overflowX:"auto",borderRadius:10,border:"1px solid rgba(255,255,255,0.07)",marginTop:8}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  <th style={{...thStyle(false),textAlign:"left",minWidth:155,padding:"8px 12px",position:"sticky",left:0,zIndex:2,background:"#0b1510"}}>Parâmetro</th>
                  <th style={{...thStyle(false),minWidth:46,position:"sticky",left:155,zIndex:2,background:"#0b1510"}}>Un.</th>
                  {datas.map(d=>(
                    <th key={d} style={thStyle(isHoje(d))}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                        {fmtData(d).split('\n').map((linha,i)=>(
                          <span key={i} style={{fontSize:i===1?10:11}}>{linha}</span>
                        ))}
                        {isHoje(d)&&<span style={{fontSize:9,letterSpacing:0.5,color:"#38bdf8"}}>HOJE</span>}
                        {!isHoje(d)&&<button onClick={()=>removerColuna(d)} style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:9,padding:0}}>✕</button>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GRUPOS_CONTROLES.map(({grupo,params})=>(
                  <React.Fragment key={grupo}>
                    <tr>
                      <td colSpan={2+datas.length} style={{padding:"7px 12px",fontSize:10,fontWeight:700,color:"#38bdf8",background:"rgba(56,189,248,0.04)",fontFamily:mono,letterSpacing:1.5,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                        {grupo}
                      </td>
                    </tr>
                    {params.map(({key,label,unit})=>(
                      <React.Fragment key={key}>
                      <tr
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{...tdBase,padding:"4px 12px",fontSize:12,color:"#94a3b8",textAlign:"left",position:"sticky",left:0,background:"#080f0a"}}>{label}</td>
                        <td style={{...tdBase,fontSize:10,color:"#475569",fontFamily:mono,position:"sticky",left:155,background:"#080f0a"}}>{unit}</td>
                        {datas.map(d=>{
                          const ativo=isHoje(d);
                          const val=getVal(d,key);
                          return (
                            <td key={d} style={{...tdBase,background:ativo?"rgba(56,189,248,0.04)":undefined}}>
                              <input value={val} onChange={e=>setVal(d,key,e.target.value)}
                                style={{width:"100%",background:"transparent",border:"none",
                                  color:ativo?"#38bdf8":"#e2e8f0",
                                  fontSize:12,fontFamily:mono,textAlign:"center",padding:"3px 4px",outline:"none",
                                  fontWeight:ativo?700:400}}
                                placeholder="—"
                              />
                            </td>
                          );
                        })}
                      </tr>
                      {/* Débito urinário calculado — logo abaixo da Diurese */}
                      {key==="c24_diur" && parseFloat(leito.peso) > 0 && (
                        <tr style={{opacity:0.75}}>
                          <td style={{...tdBase,padding:"4px 12px",fontSize:11,color:"#64748b",textAlign:"left",position:"sticky",left:0,background:"#080f0a",fontStyle:"italic"}}>↳ Débito urinário</td>
                          <td style={{...tdBase,fontSize:10,color:"#334155",fontFamily:mono,position:"sticky",left:155,background:"#080f0a"}}>mL/kg/h</td>
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
                            <td style={{...tdBase,padding:"4px 12px",fontSize:11,color:"#64748b",textAlign:"left",position:"sticky",left:0,background:"#080f0a",fontStyle:"italic"}}>{row.lbl}</td>
                            <td style={{...tdBase,fontSize:10,color:"#334155",fontFamily:mono,position:"sticky",left:155,background:"#080f0a"}}>{row.unit}</td>
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
                ))}
                {/* Drenos dinâmicos (_dreno_*) */}
                {(()=>{
                  const drenoKeys = Array.from(new Set(datas.flatMap(d=>Object.keys(data[d]||{}).filter(k=>k.startsWith('_dreno_')))));
                  if (!drenoKeys.length) return null;
                  return (
                    <React.Fragment>
                      <tr><td colSpan={2+datas.length} style={{padding:"7px 12px",fontSize:10,fontWeight:700,color:"#34d399",background:"rgba(52,211,153,0.04)",fontFamily:mono,letterSpacing:1.5,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                        💧 Drenos / SNG / Evacuações (opcionais)
                      </td></tr>
                      {drenoKeys.map(k=>{
                        const nomeBruto = k.replace(/^_dreno_/,'').replace(/_/g,' ');
                        const nome = nomeBruto.charAt(0).toUpperCase()+nomeBruto.slice(1);
                        return (
                          <tr key={k}
                            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <td style={{...tdBase,padding:"4px 12px",fontSize:12,color:"#34d399",textAlign:"left",position:"sticky",left:0,background:"#080f0a",display:"flex",alignItems:"center",gap:6}}>
                              {nome}
                              <button title="Remover linha" onClick={()=>{
                                const novo={...data};
                                datas.forEach(d=>{if(novo[d]){delete novo[d][k];}});
                                onChange(novo);
                              }} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:10,padding:0}}>✕</button>
                            </td>
                            <td style={{...tdBase,fontSize:10,color:"#475569",fontFamily:mono,position:"sticky",left:155,background:"#080f0a"}}>mL/x</td>
                            {datas.map(d=>{
                              const ativo=isHoje(d);
                              const val=getVal(d,k);
                              return (
                                <td key={d} style={{...tdBase,background:ativo?"rgba(52,211,153,0.04)":undefined}}>
                                  <input value={val} onChange={e=>setVal(d,k,e.target.value)}
                                    style={{width:"100%",background:"transparent",border:"none",
                                      color:ativo?"#34d399":"#e2e8f0",
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
  nEF:"", nSeda:"", nAnalg:"", nPsiq:"", nObs:"",
  cvEF:"", cv24h:"", cvDVA:"", cvMed:"", cvPerf:"", cvObs:"",
  reVM:"", reEF:"", re24h:"", reGaso:"", rePocus:"", reObs:"",
  rm24h:"", rmLabs:"", rmTRS:"", rmObs:"",
  tgEF:"", tg24h:"", tgLabs:"", tgObs:"",
  heTemp:"", heLabs:"", heMed:"", heAtb:"", heProf:"", heObs:"", heCulturas:"",
  probAtivos:"", probResolvidos:"",
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

function EvolucaoEditor({ leito, campos, onCampoEdit, config={}, tabelaHoje={} }) {
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
    nEF:useRef(), nSeda:useRef(), nAnalg:useRef(), nPsiq:useRef(), nObs:useRef(),
    cvEF:useRef(), cv24h:useRef(), cvDVA:useRef(), cvMed:useRef(), cvPerf:useRef(), cvObs:useRef(),
    reVM:useRef(), reEF:useRef(), re24h:useRef(), reGaso:useRef(), rePocus:useRef(), reObs:useRef(),
    rm24h:useRef(), rmLabs:useRef(), rmTRS:useRef(), rmObs:useRef(),
    tgEF:useRef(), tg24h:useRef(), tgLabs:useRef(), tgObs:useRef(),
    heTemp:useRef(), heLabs:useRef(), heMed:useRef(), heAtb:useRef(), heProf:useRef(), heObs:useRef(), heCulturas:useRef(),
    probAtivos:useRef(), probResolvidos:useRef(),
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
    if(get("reGaso"))  p.push(`- *nova* Gaso: ${get("reGaso")}`);
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
    t+="\n\n";
    const blocos=[["== N:",txtNFull],["== Cv:",txtCvFull],["== Res:",txtResFull],["== ReMe:",txtReMeFull],["== TGI:",txtTGIFull],["== He:",txtHeFull],["== In:",txtInFull]];
    blocos.forEach(([h,fn])=>{ const c=fn(); if(c) t+=`${h}\n${c}\n\n`; });
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
    if(get("reGaso")) p.push(`- *nova* Gaso: ${get("reGaso")}`);
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

  return (
    <div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
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

      {/* Legenda */}
      <div style={{display:"flex",gap:16,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
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
            const kcalRec = (volHoje * dietaSel.kcalML).toFixed(0);
            const ptnRec  = (volHoje * dietaSel.ptnML ).toFixed(1);
            const pctKcal = metaAbs.kcal ? Math.round(kcalRec/metaAbs.kcal*100) : null;
            const pctPtn  = metaAbs.ptn  ? Math.round(ptnRec /metaAbs.ptn *100) : null;
            return <span style={{marginLeft:8,color:"#94a3b8"}}>· Kcal: <strong style={{color:pctKcal>=80?"#34d399":"#f87171"}}>{pctKcal}%</strong> · Ptn: <strong style={{color:pctPtn>=80?"#34d399":"#f87171"}}>{pctPtn}%</strong></span>;
          })()}
        </div>}
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

      <SysB id="prob" sigla="📋 Prob:" label="Problemas" color="#94a3b8" txtFn={txtProblemas}>
        <Row>
          <Col>
            <FL>🔴 Problemas Ativos</FL>
            <TA fieldRef={refs.probAtivos} defaultValue={campos.probAtivos} isAntigo={isAntigo("probAtivos")} sugestao={"1. Sepse foco pulmonar\n2. IRA oligúrica\n3. FA com RVR"} rows={4} fieldName="probAtivos" onBlurSave={salvar}/>
          </Col>
          <Col>
            <FL>✅ Problemas Resolvidos</FL>
            <TA fieldRef={refs.probResolvidos} defaultValue={campos.probResolvidos} isAntigo={isAntigo("probResolvidos")} sugestao={"1. Choque séptico (resolvido D5)\n2. Acidose metabólica"} rows={4} fieldName="probResolvidos" onBlurSave={salvar}/>
          </Col>
        </Row>
      </SysB>

            <button onClick={copiarTudo} style={{width:"100%",padding:"13px",marginTop:6,background:copiado.tudo?"rgba(56,189,248,0.15)":"linear-gradient(135deg,rgba(22,163,74,0.25),rgba(21,128,61,0.25))",border:`1.5px solid ${copiado.tudo?"#38bdf8":"#0ea5e9"}`,borderRadius:10,color:copiado.tudo?"#38bdf8":"#38bdf8",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
        {copiado.tudo?"✅ Evolução completa copiada!":"📋 Copiar evolução completa"}
      </button>
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
function MetasPanel({ metas, onChange }) {
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
      <button onClick={()=>setShow(s=>!s)} style={{width:"100%",padding:"7px",background:"transparent",border:"1px dashed rgba(255,255,255,0.1)",borderRadius:8,color:"#64748b",fontSize:12,cursor:"pointer",marginBottom:12}}>
        {show?"▲ Ocultar sugestões":"▼ Ver sugestões de metas comuns"}
      </button>
      {show && <div style={{marginBottom:14}}>{METAS_SUGESTOES.map(sg=><div key={sg} onClick={()=>add(sg)} style={{padding:"7px 12px",borderRadius:6,fontSize:12,color:"#94a3b8",cursor:"pointer",background:"rgba(255,255,255,0.02)",marginBottom:4,border:"1px solid rgba(255,255,255,0.05)"}}>+ {sg}</div>)}</div>}
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
  const dias = diasInternacao(leito.dataInternacao);
  const vago = !leito.paciente;
  const [editingNome, setEditingNome] = useState(false);
  const [nomeTemp, setNomeTemp] = useState(leito.nome);

  const confirmarNome = () => {
    if (nomeTemp.trim()) onRename(nomeTemp.trim());
    setEditingNome(false);
  };

  return (
    <div style={{cursor:"pointer",borderRadius:12,padding:"14px 16px",background:selecionado?"rgba(56,189,248,0.1)":"rgba(255,255,255,0.03)",border:selecionado?"1.5px solid #38bdf8":"1.5px solid rgba(255,255,255,0.08)",transition:"all 0.2s",marginBottom:8}} onClick={e=>{if(!editingNome) onClick();}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
        {editingNome ? (
          <input autoFocus value={nomeTemp}
            onChange={e=>setNomeTemp(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")confirmarNome(); if(e.key==="Escape"){setEditingNome(false);setNomeTemp(leito.nome);}}}
            onBlur={confirmarNome}
            onClick={e=>e.stopPropagation()}
            style={{fontSize:11,fontFamily:mono,letterSpacing:1,color:"#38bdf8",background:"rgba(56,189,248,0.1)",border:"1px solid rgba(56,189,248,0.4)",borderRadius:4,padding:"2px 6px",width:"100%"}}/>
        ) : (
          <span style={{fontSize:11,color:"#64748b",fontFamily:mono,letterSpacing:2}}
            onDoubleClick={e=>{e.stopPropagation();setEditingNome(true);setNomeTemp(leito.nome);}}>
            {leito.nome}
          </span>
        )}
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {!editingNome && dias!==null && !vago && <span style={{fontSize:11,color:"#a78bfa",fontWeight:700}}>D{dias}</span>}
          {!editingNome && (
            <button onClick={e=>{e.stopPropagation();setEditingNome(true);setNomeTemp(leito.nome);}}
              title="Renomear leito"
              style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:11,padding:"0 2px",lineHeight:1}}>✏️</button>
          )}
          {onRemove && (
            <button onClick={e=>{e.stopPropagation();if(confirm(`Remover ${leito.nome}?`))onRemove();}}
              title="Remover leito"
              style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:11,padding:"0 2px",lineHeight:1}}>🗑️</button>
          )}
        </div>
      </div>
      {vago ? <div style={{fontSize:13,color:"#334155",marginTop:4,fontStyle:"italic"}}>Vago</div> : <>
        <div style={{fontSize:14,color:"#e2e8f0",marginTop:2,fontWeight:600}}>{leito.paciente}</div>
        <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{leito.diagnostico}</div>
        {(leito.peso||leito.altura)&&<div style={{fontSize:11,color:"#475569",marginTop:3}}>{leito.peso?`${leito.peso} kg`:""}{leito.peso&&leito.altura?" · ":""}{leito.altura?`${leito.altura} cm`:""}</div>}
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
    {id:"paciente", label:"👤 Paciente & Cálculos"},
    {id:"tabela",   label:"📊 Tabela Clínica"},
    {id:"upload",   label:"📤 Importar Print"},
    {id:"evolucao", label:"📝 Evolução"},
    {id:"metas",    label:"🎯 Metas & Pendências"},
  ];

  const dias = diasInternacao(leito.dataInternacao);
  const pp   = pesoPredito(leito.altura, leito.sexo);

  if (!appReady) return (
    <div style={{minHeight:"100vh",background:"#080f0a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{color:"#38bdf8",fontSize:14}}>Carregando…</div>
    </div>
  );

  if (!authed) return <LoginScreen onLogin={onLogin}/>;

  return (
    <div style={{minHeight:"100vh",background:"#080f0a",fontFamily:"'Sora','DM Sans',sans-serif",color:"#e2e8f0",display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box} textarea,input{outline:none;color-scheme:dark}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(56,189,248,0.25);border-radius:4px}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.5)} button:hover{opacity:0.88}
      `}</style>

      <div style={{padding:"0 20px",height:52,display:"flex",alignItems:"center",borderBottom:"1px solid rgba(56,189,248,0.08)",background:"rgba(8,15,10,0.95)",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(8px)"}}>
        <button onClick={()=>setShowSidebar(s=>!s)} style={{background:"none",border:"1px solid rgba(56,189,248,0.12)",borderRadius:6,color:"#475569",cursor:"pointer",fontSize:16,padding:"4px 8px",marginRight:12}} title="Toggle sidebar">☰</button>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <BrainLogo size={32}/>
          <div>
            <div style={{fontSize:14,fontWeight:700,letterSpacing:0.5,color:"#e2e8f0"}}>UTI Evolve</div>
            <div style={{fontSize:9,color:"#38bdf8",fontFamily:mono,letterSpacing:2}}>ASSISTENTE DE EVOLUÇÃO</div>
          </div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:16}}>
          <div style={{fontSize:11,fontFamily:mono,color:saving?"#f59e0b":"#38bdf8",display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:saving?"#f59e0b":"#38bdf8"}}/>
            {saving?"Salvando…":"Salvo"}
          </div>
          <div style={{fontSize:12,color:"#475569",fontFamily:mono}}>
            {new Date().toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"}).toUpperCase()}
          </div>
          <button onClick={logout} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,color:"#475569",cursor:"pointer",fontSize:11,padding:"4px 10px",fontFamily:mono}}>Sair</button>
          <button onClick={()=>setAba("config")} title="Configurações" style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,color:"#475569",cursor:"pointer",fontSize:14,padding:"4px 8px"}}>⚙️</button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden",height:"calc(100vh - 52px)"}}>
        {showSidebar && <div style={{width:220,borderRight:"1px solid rgba(56,189,248,0.08)",padding:"16px 12px",overflowY:"auto",background:"rgba(255,255,255,0.01)",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,paddingLeft:4}}>
            <div style={{fontSize:9,color:"#38bdf8",fontFamily:mono,letterSpacing:2.5}}>LEITOS</div>
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
              style={{background:"rgba(56,189,248,0.12)",border:"1px solid rgba(56,189,248,0.3)",borderRadius:6,color:"#38bdf8",cursor:"pointer",fontSize:14,padding:"2px 8px",fontWeight:700,lineHeight:1.4}}>+</button>
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
          <div style={{marginTop:16,borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:12}}>
            <button onClick={()=>setViewGlobal(v=>v==="ferramentas"?"leitos":"ferramentas")} style={{width:"100%",padding:"8px 10px",background:viewGlobal==="ferramentas"?"rgba(56,189,248,0.1)":"none",border:`1px solid ${viewGlobal==="ferramentas"?"rgba(56,189,248,0.3)":"rgba(255,255,255,0.06)"}`,borderRadius:8,color:viewGlobal==="ferramentas"?"#38bdf8":"#64748b",cursor:"pointer",fontSize:12,fontWeight:600,textAlign:"left",fontFamily:"inherit"}}>
              📚 Links & Protocolos
            </button>
          </div>
        </div>}

        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {viewGlobal==="ferramentas" ? (
            <div style={{flex:1,overflowY:"auto"}}><FerramentasPanel/></div>
          ) : (<>
          {leito.paciente && (
            <div style={{padding:"11px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.02)"}}>
              <div style={{fontSize:16,fontWeight:700}}>{leito.paciente}</div>
              <div style={{fontSize:12,color:"#64748b",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
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

          <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.06)",paddingLeft:12,overflowX:"auto",flexShrink:0}}>
            {ABAS.map(a=>(
              <button key={a.id} onClick={()=>setAba(a.id)} style={{padding:"12px 14px",background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:aba===a.id?700:400,color:aba===a.id?"#38bdf8":"#64748b",borderBottom:aba===a.id?"2px solid #38bdf8":"2px solid transparent",fontFamily:"inherit",transition:"all 0.2s",whiteSpace:"nowrap"}}>
                {a.label}
              </button>
            ))}
          </div>

          <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
            {aba==="config" ? (
              <ConfigPanel config={config} onChange={c=>{setConfig(c);salvarConfig(c);}} onVoltar={()=>setAba("paciente")}/>
            ) : aba==="paciente" ? (
              <div style={{maxWidth:680}}><PacientePanel
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
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>Importar dados via imagem</div>
                  <div style={{fontSize:13,color:"#64748b"}}>Faça upload do print do Tasy. A IA extrai os dados e você revisa antes de aplicar na evolução.</div>
                </div>
                <UploadAnalyzer onResult={d=>{
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
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>Metas do plantão</div>
                  <div style={{fontSize:13,color:"#64748b"}}>Adicione metas e acompanhe o cumprimento durante o plantão.</div>
                </div>
                <MetasPanel
                  metas={metasPorLeito[leitoSelId] || []}
                  onChange={m=>{
                    setMetasPorLeito(mp=>{
                      const novo = {...mp,[leitoSelId]:m};
                      salvarMetas(novo);
                      return novo;
                    });
                  }}
                />
              </div>
            )}
          </div>
        </>)}
        </div>
      </div>
    </div>
  );
}

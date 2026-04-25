import { useState, useRef, useCallback, useEffect } from "react";
import React from "react";
import { supabase } from './supabase.js';

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
    // 4 amp (4mg cada = 16mg) em SG5% 234 mL → total 250mL, 16mg/250mL = 64 mcg/mL
    diluicaoDesc:"4 amp (16 mg) em SG5% 234 mL → 250 mL",
    concMcgML: 64,          // mcg/mL
    modoCalc:"mcg_kg_min",  // resultado em mcg/kg/min
    max:3, unidadeLabel:"mcg/kg/min",
  },
  dobutamina: {
    label:"Dobutamina", grupo:"vasoativa",
    // 80mL (250mg) em SG5% 170mL → 250mL, 250mg/250mL = 1000 mcg/mL
    diluicaoDesc:"80 mL (250 mg) em SG5% 170 mL → 250 mL",
    concMcgML: 1000,
    modoCalc:"mcg_kg_min",
    max:20, unidadeLabel:"mcg/kg/min",
  },
  vasopressina: {
    label:"Vasopressina", grupo:"vasoativa",
    // 2mL (20UI) em SG5% 98mL → 100mL, 20UI/100mL = 0,2 UI/mL
    diluicaoDesc:"2 mL (20 UI) em SG5% 98 mL → 100 mL",
    concMcgML: null, concUIML: 0.2,  // UI/mL
    modoCalc:"ui_min",
    max:0.04, unidadeLabel:"UI/min",
  },
  nitroglicerina: {
    label:"Nitroglicerina", grupo:"vasoativa",
    // 10mL (50mg) em SG5% 90mL → 100mL, 50mg/100mL = 500mcg/mL
    diluicaoDesc:"10 mL (50 mg) em SG5% 90 mL → 100 mL",
    concMcgML: 500,
    modoCalc:"mcg_min",   // mcg/min, sem peso
    max:400, unidadeLabel:"mcg/min",
  },
  nitroprussiato: {
    label:"Nitroprussiato", grupo:"vasoativa",
    // 2mL (50mg) em SG5% 248mL → 250mL, 50mg/250mL = 200mcg/mL
    diluicaoDesc:"2 mL (50 mg) em SG5% 248 mL → 250 mL",
    concMcgML: 200,
    modoCalc:"mcg_kg_min",
    max:10, unidadeLabel:"mcg/kg/min",
  },
  propofol: {
    label:"Propofol", grupo:"sedacao",
    // 10mg/mL, 100mL puro → 100mL, 10mg/mL = 10000 mcg/mL
    diluicaoDesc:"10 mg/mL — 100 mL puro (sem diluição)",
    concMcgML: 10000,
    modoCalc:"mcg_kg_min",
    max:67, unidadeLabel:"mcg/kg/min",
  },
  midazolam: {
    label:"Midazolam", grupo:"sedacao",
    // 5mg/mL, 20mL (100mg) em SG5% 80mL → 100mL, 100mg/100mL = 1000 mcg/mL
    diluicaoDesc:"20 mL (100 mg) em SG5% 80 mL → 100 mL",
    concMcgML: 1000,
    modoCalc:"mcg_kg_h",
    max:150, unidadeLabel:"mcg/kg/h",
  },
  fentanil: {
    label:"Fentanil", grupo:"analgesia",
    // 0,05mg/mL, 20mL (1000mcg) em SF0,9% 80mL → 100mL, 1000mcg/100mL = 10 mcg/mL
    diluicaoDesc:"20 mL (1000 mcg) em SF0,9% 80 mL → 100 mL",
    concMcgML: 10,
    modoCalc:"mcg_kg_h",
    max:5, unidadeLabel:"mcg/kg/h",
  },
  precedex: {
    label:"Precedex (Dex)", grupo:"sedacao",
    // 4mL (200mcg) em SF0,9% 96mL → 100mL, 200mcg/100mL = 2 mcg/mL
    diluicaoDesc:"4 mL (200 mcg) em SF0,9% 96 mL → 100 mL",
    concMcgML: 2,
    modoCalc:"mcg_kg_h",
    max:0.7, unidadeLabel:"mcg/kg/h",
  },
};

// mL/h → dose: dado vazão e concentração, calcula dose por kg
function calcDoseFromMLH(drogaKey, mlh, peso, concCustom) {
  const mlhN = parseFloat(mlh), p = parseFloat(peso);
  if (!mlhN || mlhN <= 0) return null;
  const conf = DROGAS_PROTOCOLO[drogaKey];
  if (!conf) return null;
  const conc = concCustom !== undefined ? parseFloat(concCustom) : conf.concMcgML;
  if (!conc || conc <= 0) {
    // vasopressina: UI/mL
    if (conf.modoCalc === "ui_min") {
      const uiMin = mlhN * conf.concUIML / 60;
      return { dose: uiMin.toFixed(4), label: conf.unidadeLabel };
    }
    return null;
  }
  if (conf.modoCalc === "mcg_kg_min") {
    if (!p) return null;
    const dose = (mlhN * conc) / (p * 60);
    return { dose: dose.toFixed(4), label: conf.unidadeLabel };
  }
  if (conf.modoCalc === "mcg_kg_h") {
    if (!p) return null;
    const dose = (mlhN * conc) / p;
    return { dose: dose.toFixed(2), label: conf.unidadeLabel };
  }
  if (conf.modoCalc === "mcg_min") {
    const dose = (mlhN * conc) / 60;
    return { dose: dose.toFixed(1), label: conf.unidadeLabel };
  }
  return null;
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

      {procedimentos.map(p=>{
        const po = diasPO(p.data);
        const editing = editId === p.id;
        return (
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,marginBottom:8,position:"relative",overflow:"hidden"}}>
            {/* barra lateral colorida por tempo */}
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background: po===0?"#f87171":po<=3?"#fb923c":po<=7?"#f59e0b":"#34d399",borderRadius:"3px 0 0 3px"}}/>
            <div style={{flex:1,paddingLeft:4}}>
              {editing ? (
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <input value={p.nome} onChange={e=>updateProc(p.id,"nome",e.target.value)}
                    style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(56,189,248,0.4)",borderRadius:6,padding:"5px 8px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
                  <input type="date" value={p.data} onChange={e=>updateProc(p.id,"data",e.target.value)}
                    style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(56,189,248,0.4)",borderRadius:6,padding:"5px 8px",color:"#e2e8f0",fontSize:12,fontFamily:"inherit"}}/>
                  <button onClick={()=>setEditId(null)} style={{padding:"5px 10px",borderRadius:6,border:"1px solid #22c55e",background:"rgba(34,197,94,0.1)",color:"#22c55e",cursor:"pointer",fontSize:12}}>✓ Ok</button>
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

            {/* Badge PO */}
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

            {/* Ações */}
            {!editing && (
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <button onClick={()=>setEditId(p.id)} title="Editar" style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:13,padding:2}}>✏️</button>
                <button onClick={()=>removeProc(p.id)} title="Remover" style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:13,padding:2}}>🗑️</button>
              </div>
            )}
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
            <button onClick={()=>addProc()} style={{padding:"8px 18px",background:"linear-gradient(135deg,#0284c7,#0369a1)",border:"none",borderRadius:8,color:"white",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>
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

function DrogasCalculadora({ peso, onLancarDroga }) {
  const [drogaSel, setDrogaSel] = useState("noradrenalina");
  const [mlh, setMlh]           = useState("");
  const [concCustom, setConcCustom] = useState("");
  const [editandoConc, setEditandoConc] = useState(false);
  const [lancado, setLancado]   = useState(false);

  const conf = DROGAS_PROTOCOLO[drogaSel];
  const resultado = calcDoseFromMLH(drogaSel, mlh, peso, concCustom !== "" ? parseFloat(concCustom) : undefined);
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
            {drogas.map(([key,d])=>(
              <button key={key} onClick={()=>{setDrogaSel(key);setMlh("");setConcCustom("");setEditandoConc(false);}}
                style={{padding:"5px 11px",borderRadius:20,border:`1px solid ${drogaSel===key?"#38bdf8":"rgba(255,255,255,0.1)"}`,background:drogaSel===key?"rgba(56,189,248,0.14)":"rgba(255,255,255,0.02)",color:drogaSel===key?"#38bdf8":"#64748b",fontSize:11,cursor:"pointer",fontFamily:mono,transition:"all 0.15s"}}>
                {d.label}
              </button>
            ))}
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
            background: lancado ? "rgba(34,197,94,0.15)" : "rgba(56,189,248,0.1)",
            border: `1px solid ${lancado ? "#22c55e" : "#38bdf8"}`,
            borderRadius:8, color: lancado ? "#22c55e" : "#38bdf8",
            fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s",
          }}>
            {lancado ? "✅ Lançado na evolução!" : `📋 Lançar na evolução (${conf.grupo === "vasoativa" ? "== Cv: DVA" : conf.grupo === "sedacao" ? "== N: Sedação" : "== N: Analgesia"})`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── DietaPanel ────────────────────────────────────────────────────────────────
function DietaPanel({ dados, onChange }) {
  const dieta = dados.dieta || { tipo:"enteral", vazao:"", formula:"", kcalTotal:"", ptnTotal:"", obs:"" };
  const upd = (field, val) => onChange({ ...dados, dieta: { ...dieta, [field]: val } });

  const peso = parseFloat(dados.peso);
  const kcalKg = (dieta.kcalTotal && peso) ? (parseFloat(dieta.kcalTotal)/peso).toFixed(1) : null;
  const ptnKg  = (dieta.ptnTotal  && peso) ? (parseFloat(dieta.ptnTotal) /peso).toFixed(2) : null;
  const kcalBaixo = kcalKg && parseFloat(kcalKg) < 20;
  const kcalAlto  = kcalKg && parseFloat(kcalKg) > 35;
  const ptnBaixo  = ptnKg  && parseFloat(ptnKg)  < 1.0;
  const ptnAlto   = ptnKg  && parseFloat(ptnKg)  > 2.5;

  const TIPOS = [
    {k:"enteral",   label:"🥤 Enteral"},
    {k:"parenteral",label:"💉 Parenteral"},
    {k:"oral",      label:"🍽️ Oral"},
    {k:"mista",     label:"🔀 Mista"},
    {k:"jejum",     label:"⛔ Jejum"},
  ];

  return (
    <div>
      <SecTitle>SUPORTE NUTRICIONAL</SecTitle>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {TIPOS.map(t=>(
          <button key={t.k} onClick={()=>upd("tipo",t.k)}
            style={{padding:"6px 13px",borderRadius:20,border:`1px solid ${dieta.tipo===t.k?"#38bdf8":"rgba(255,255,255,0.1)"}`,background:dieta.tipo===t.k?"rgba(56,189,248,0.12)":"rgba(255,255,255,0.02)",color:dieta.tipo===t.k?"#38bdf8":"#64748b",fontSize:12,cursor:"pointer",fontWeight:dieta.tipo===t.k?700:400,transition:"all 0.15s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {dieta.tipo !== "jejum" ? (
        <>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
            <Field label="FÓRMULA / DIETA" value={dieta.formula} onChange={v=>upd("formula",v)} placeholder="Ex: Isosource 1.5, NPT 3 em 1…"/>
            <Field label="VAZÃO (mL/h)" value={dieta.vazao} onChange={v=>upd("vazao",v)} type="number" placeholder="50" suffix="mL/h"/>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
            <Field label="TOTAL KCAL/DIA" value={dieta.kcalTotal} onChange={v=>upd("kcalTotal",v)} type="number" placeholder="1800" suffix="kcal"/>
            <Field label="PROTEÍNA TOTAL/DIA" value={dieta.ptnTotal} onChange={v=>upd("ptnTotal",v)} type="number" placeholder="90" suffix="g/dia"/>
          </div>

          {(kcalKg||ptnKg) && (
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
              {kcalKg && (
                <div style={{flex:1,minWidth:110,padding:"10px 14px",borderRadius:8,textAlign:"center",background:kcalBaixo||kcalAlto?"rgba(248,113,113,0.08)":"rgba(34,197,94,0.08)",border:`1px solid ${kcalBaixo||kcalAlto?"rgba(248,113,113,0.3)":"rgba(34,197,94,0.3)"}`}}>
                  <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>KCAL/KG/DIA</div>
                  <div style={{fontSize:22,fontWeight:700,color:kcalBaixo||kcalAlto?"#f87171":"#4ade80"}}>{kcalKg}</div>
                  <div style={{fontSize:10,color:"#64748b",marginTop:1}}>meta 25–30</div>
                </div>
              )}
              {ptnKg && (
                <div style={{flex:1,minWidth:110,padding:"10px 14px",borderRadius:8,textAlign:"center",background:ptnBaixo||ptnAlto?"rgba(248,113,113,0.08)":"rgba(34,197,94,0.08)",border:`1px solid ${ptnBaixo||ptnAlto?"rgba(248,113,113,0.3)":"rgba(34,197,94,0.3)"}`}}>
                  <div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>PTN/KG/DIA</div>
                  <div style={{fontSize:22,fontWeight:700,color:ptnBaixo||ptnAlto?"#f87171":"#4ade80"}}>{ptnKg}</div>
                  <div style={{fontSize:10,color:"#64748b",marginTop:1}}>meta 1,2–2,0 g/kg</div>
                </div>
              )}
            </div>
          )}

          {(kcalBaixo||kcalAlto||ptnBaixo||ptnAlto) && (
            <div style={{padding:"8px 12px",background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:8,fontSize:12,color:"#fca5a5",lineHeight:1.8,marginBottom:10}}>
              {kcalBaixo && <div>⚠️ Hipocaloria — aporte abaixo de 20 kcal/kg/dia</div>}
              {kcalAlto  && <div>⚠️ Hipercaloria — aporte acima de 35 kcal/kg/dia</div>}
              {ptnBaixo  && <div>⚠️ Aporte proteico insuficiente ({"<"} 1,0 g/kg/dia)</div>}
              {ptnAlto   && <div>⚠️ Aporte proteico muito elevado ({">"}2,5 g/kg/dia)</div>}
            </div>
          )}
        </>
      ) : (
        <div style={{padding:"12px 14px",background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:8,fontSize:13,color:"#fca5a5",marginBottom:10}}>
          ⛔ Paciente em jejum — registre o motivo nas observações.
        </div>
      )}

      <Field label="OBSERVAÇÕES" value={dieta.obs} onChange={v=>upd("obs",v)} placeholder="Tolerando bem, vômitos, resíduo gástrico elevado, data de introdução…"/>
    </div>
  );
}

// ── DispositivosPanel ─────────────────────────────────────────────────────────
// Dispositivos singulares (máx 1 ativo por vez)
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
          <div style={{marginTop:8,padding:"8px",background:"#0f1929",border:"1px solid rgba(56,189,248,0.2)",borderRadius:12,display:"flex",flexDirection:"column",gap:4}}>
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
function PacientePanel({ dados, onChange, config={}, onLancarDroga }) {
  const dias  = diasInternacao(dados.dataInternacao);
  const pp    = pesoPredito(dados.altura, dados.sexo);
  const vc6   = pp ? Math.round(parseFloat(pp)*6) : null;
  const vc8   = pp ? Math.round(parseFloat(pp)*8) : null;

  const [volUrina, setVolUrina] = useState("");
  const [hUrina,   setHUrina]   = useState("6");
  const diurese = (volUrina && hUrina && dados.peso)
    ? (parseFloat(volUrina)/(parseFloat(hUrina)*parseFloat(dados.peso))).toFixed(2) : null;

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
        <SecTitle>CALCULADORA DE DIURESE</SecTitle>
        <div style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
          <Field label="VOLUME URINADO (mL)" value={volUrina} onChange={setVolUrina} type="number" placeholder="300"/>
          <Field label="PERÍODO (horas)"     value={hUrina}   onChange={setHUrina}   type="number" placeholder="6"/>
          <div style={{ flex:1, minWidth:110 }}>
            <div style={{ fontSize:10, color:"#64748b", fontFamily:mono, letterSpacing:1, marginBottom:4 }}>RESULTADO</div>
            <div style={{ padding:"8px 12px", borderRadius:8, textAlign:"center",
              background: diurese ? (parseFloat(diurese)<0.5?"rgba(248,113,113,0.1)":"rgba(34,197,94,0.1)") : "rgba(255,255,255,0.04)",
              border:`1px solid ${diurese ? (parseFloat(diurese)<0.5?"rgba(248,113,113,0.35)":"rgba(34,197,94,0.35)") : "rgba(255,255,255,0.08)"}`,
              fontSize:17, fontWeight:700, color: diurese ? (parseFloat(diurese)<0.5?"#f87171":"#4ade80") : "#475569" }}>
              {diurese ? `${diurese} mL/kg/h` : "—"}
            </div>
          </div>
        </div>
        {diurese && (
          <div style={{ marginTop:6, fontSize:12, color: parseFloat(diurese)<0.5?"#f87171":"#4ade80" }}>
            {parseFloat(diurese)<0.5 ? "⚠️ Oligúria — diurese abaixo de 0,5 mL/kg/h. Avaliar volemia e função renal." : "✅ Diurese adequada (≥ 0,5 mL/kg/h)."}
          </div>
        )}
      </>}

      {dados.peso && <>
        <SecTitle>CALCULADORA DE DROGAS — VAZÃO → DOSE</SecTitle>
        <DrogasCalculadora peso={dados.peso} onLancarDroga={onLancarDroga} />
      </>}

      <DietaPanel dados={dados} onChange={onChange} />

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
      {preview && <img src={preview} alt="preview" style={{width:"100%",borderRadius:8,marginBottom:12,maxHeight:180,objectFit:"contain",background:"#0f172a"}}/>}
      {loading && <div style={{textAlign:"center",color:"#38bdf8",padding:16,fontSize:14}}>⏳ Analisando imagem com IA…</div>}
      {draft && !draft.error && rev && (
        <div>
          {draft.resumo && !draft.resumo.startsWith('{') && !draft.resumo.startsWith('[ERRO') && !draft.resumo.startsWith('[SEM') && (
            <div style={{background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:"#7dd3fc"}}>
              <strong>Resumo IA:</strong> {draft.resumo}
            </div>
          )}
          {draft.dataColeta && (
            <div style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:8,padding:"8px 14px",marginBottom:12,fontSize:12,color:"#4ade80",display:"flex",alignItems:"center",gap:8}}>
              📅 <strong>Data/hora de coleta detectada:</strong> {(() => {
                const [datePart, timePart] = draft.dataColeta.split('T');
                const [y,m,d] = datePart.split('-');
                return `${d}/${m}/${y}${timePart ? ` às ${timePart}h` : ''}`;
              })()} — os valores serão lançados nesta coluna da tabela
            </div>
          )}
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:8,fontFamily:mono}}>REVISÃO — edite se necessário</div>
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
                    style={{flex:1,minWidth:160,background:"#1e2a3a",border:"1px solid rgba(245,158,11,0.3)",borderRadius:6,padding:"6px 8px",color:"#e2e8f0",fontSize:12,fontFamily:"inherit"}}>
                    <option value="" style={{background:"#1e2a3a",color:"#94a3b8"}}>— Ignorar —</option>
                    {SISTEMAS.map(s=><option key={s} value={s} style={{background:"#1e2a3a",color:"#e2e8f0"}}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          <button onClick={()=>{onResult(draft);setRev(false);}}
            style={{width:"100%",padding:"10px",background:"linear-gradient(135deg,#0284c7,#0369a1)",border:"none",borderRadius:8,color:"white",fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4}}>
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

function TA({ fieldRef, defaultValue, placeholder, rows=2, isAntigo=false, fieldName, onBlurSave }) {
  return (
    <div style={{position:"relative"}}>
      <textarea ref={fieldRef} defaultValue={defaultValue||""} placeholder={placeholder} rows={rows}
        style={{width:"100%",
          background: isAntigo ? "rgba(100,116,139,0.08)" : "rgba(255,255,255,0.03)",
          border: isAntigo ? "1px solid rgba(100,116,139,0.25)" : "1px solid rgba(255,255,255,0.07)",
          borderRadius:8,padding:"8px 10px",
          color: isAntigo ? "#64748b" : "#cbd5e1",
          fontSize:12,resize:"vertical",fontFamily:"inherit",boxSizing:"border-box",lineHeight:1.5}}
        onFocus={e=>e.target.style.borderColor="rgba(56,189,248,0.4)"}
        onBlur={e=>{
          e.target.style.borderColor = isAntigo ? "rgba(100,116,139,0.25)" : "rgba(255,255,255,0.07)";
          if (onBlurSave && fieldName) onBlurSave(fieldName, e.target.value);
        }}/>
      {isAntigo && (
        <span style={{position:"absolute",top:4,right:6,fontSize:9,color:"#475569",fontFamily:mono,letterSpacing:0.5,pointerEvents:"none"}}>
          dia anterior
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
          background: copiado?"rgba(34,197,94,0.15)":"rgba(255,255,255,0.05)",
          border:`1px solid ${copiado?"#22c55e":preview?.trim()?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.05)"}`,
          color: copiado?"#22c55e":preview?.trim()?"#94a3b8":"#334155",
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

  return (
    <div style={{maxWidth:560}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={onVoltar} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#64748b",cursor:"pointer",fontSize:12,padding:"6px 12px"}}>← Voltar</button>
        <div>
          <div style={{fontSize:15,fontWeight:700}}>⚙️ Configurações</div>
          <div style={{fontSize:12,color:"#64748b"}}>Personalize os alertas de revisão de dispositivos invasivos</div>
        </div>
      </div>

      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,overflow:"hidden"}}>
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

      <div style={{marginTop:12,padding:"10px 14px",background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8,fontSize:12,color:"#fcd34d"}}>
        💡 Dica: para dispositivos sem limite de troca (TOT, TQT), deixe em 99 dias — o alerta não será disparado.
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
  { grupo:"💧 Controles 24h", params:[
    {key:"diur",  label:"Diurese",          unit:"mL"},
    {key:"bh",    label:"Balanço Hídrico",  unit:"mL"},
    {key:"dreno1",label:"Dreno 1",          unit:"mL"},
    {key:"dreno2",label:"Dreno 2",          unit:"mL"},
    {key:"dreno3",label:"Dreno 3",          unit:"mL"},
    {key:"evac",  label:"Evacuações",       unit:"x/dia"},
  ]},
];

const TODOS_PARAMS = GRUPOS_LAB.flatMap(g=>g.params);

// Abreviações para a evolução e formatação especial
const ABREV = {
  hb:"Hb", ht:"Ht", leuco:"Leuco", neut:"Neut", bast:"Bast", linf:"Linf",
  plaq:"Plaq", rni:"RNI", ttpa:"TTPA", fibri:"Fibri",
  cr:"Cr", ur:"Ur", na:"Na", k:"K", mg:"Mg", cai:"Cai", p:"P", ph:"pH", hco3:"HCO3",
  trop:"Trop", bnp:"BNP", ntpro:"NT-proBNP", be:"BE", lact:"Lactato",
  po2:"pO2", pco2:"pCO2",
  tgo:"TGO", tgp:"TGP", bttot:"BT", btdir:"BD", btind:"BI",
  falc:"FA", ggt:"GGT", alb:"Alb",
  diur:"Diurese", bh:"BH", dreno1:"Dreno1", dreno2:"Dreno2", dreno3:"Dreno3", evac:"Evac",
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

function TabelaClinica({ leito, data, onChange, onAplicarEvolucao }) {
  const hoje = new Date().toISOString().split("T")[0];
  const [novaData, setNovaData] = useState("");
  const [showAddCol, setShowAddCol] = useState(false);

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
    // Encontra a coluna mais recente de hoje (pode ter hora: "2026-04-25T05:15")
    const datasHoje = datas.filter(d => isHoje(d)).sort();
    const chaveHoje = datasHoje[datasHoje.length - 1] || hoje;
    const idxHoje = datas.indexOf(chaveHoje);
    const dtAnt = idxHoje > 0 ? datas[idxHoje-1] : null;
    const campos = {};
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

    const heStr  = pegar(["hb","ht","leuco","neut","bast","linf","plaq","rni","ttpa","fibri"]);
    const rmStr  = pegar(["cr","ur","na","k","mg","cai","p","ph","hco3"]);
    const ctStr  = pegar(["diur","bh","dreno1","dreno2","dreno3","evac"]);
    const cvStr  = pegar(["trop","bnp","ntpro","be","lact"]);
    const resStr = pegar(["po2","pco2"]);
    const tgStr  = pegar(["tgo","tgp","bttot","btdir","btind","falc","ggt","alb"]);

    if (heStr)  campos.heLabs = heStr;
    if (rmStr)  campos.rmLabs = rmStr;
    if (ctStr)  campos.rm24h  = ctStr;
    if (cvStr)  campos.cvPerf = cvStr;
    if (resStr) campos.reGaso = resStr;
    if (tgStr)  campos.tgEF   = tgStr;
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
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowAddCol(v=>!v)} style={{padding:"8px 14px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:"#94a3b8",fontWeight:600,fontSize:12,cursor:"pointer"}}>
            {showAddCol?"✕ Fechar":"+ Adicionar dia"}
          </button>
          <button onClick={gerarEvolucao} style={{padding:"8px 16px",background:"linear-gradient(135deg,#0284c7,#0369a1)",border:"none",borderRadius:8,color:"white",fontWeight:700,fontSize:12,cursor:"pointer"}}>
            📝 Aplicar na evolução
          </button>
        </div>
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

      {datas.length === 0 ? (
        <div style={{padding:40,textAlign:"center",color:"#334155",fontSize:13}}>
          Nenhum dado ainda. Cole um print na aba 📤 ou adicione um dia manualmente.
        </div>
      ) : (
        <div style={{overflowX:"auto",borderRadius:10,border:"1px solid rgba(255,255,255,0.07)"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={{...thStyle(false),textAlign:"left",minWidth:155,padding:"8px 12px",position:"sticky",left:0,zIndex:2,background:"#0d1424"}}>Parâmetro</th>
                <th style={{...thStyle(false),minWidth:46,position:"sticky",left:155,zIndex:2,background:"#0d1424"}}>Un.</th>
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
                      <td style={{...tdBase,padding:"4px 12px",fontSize:12,color:"#94a3b8",textAlign:"left",position:"sticky",left:0,background:"#0a0f1e"}}>{label}</td>
                      <td style={{...tdBase,fontSize:10,color:"#475569",fontFamily:mono,position:"sticky",left:155,background:"#0a0f1e"}}>{unit}</td>
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
                    // Nome amigável: remove prefixo _extra_ e underscores
                    const nomeAmigavel = k.replace(/^_extra_/,'').replace(/_/g,' ');
                    const nomeCapitalizado = nomeAmigavel.charAt(0).toUpperCase() + nomeAmigavel.slice(1);
                    return (
                      <tr key={k}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{...tdBase,padding:"4px 12px",fontSize:12,color:"#fcd34d",textAlign:"left",position:"sticky",left:0,background:"#0a0f1e"}}>{nomeCapitalizado}</td>
                        <td style={{...tdBase,fontSize:10,color:"#475569",fontFamily:mono,position:"sticky",left:155,background:"#0a0f1e"}}>—</td>
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
      )}
      <div style={{marginTop:8,fontSize:11,color:"#475569",display:"flex",gap:16,flexWrap:"wrap"}}>
        <span style={{color:"#34d399"}}>▼ verde = queda</span>
        <span style={{color:"#f87171"}}>▲ vermelho = subida</span>
        <span>· Clique para editar · ✕ remove a coluna do dia</span>
      </div>
    </div>
  );
}


// ── EvolucaoEditor ────────────────────────────────────────────────────────────
const EVOLUCAO_VAZIA = {
  nEF:"", nSeda:"", nAnalg:"", nPsiq:"", nObs:"",
  cvEF:"", cv24h:"", cvDVA:"", cvMed:"", cvPerf:"", cvObs:"",
  reVM:"", reEF:"", re24h:"", reGaso:"", rePocus:"", reObs:"",
  rm24h:"", rmLabs:"", rmTRS:"", rmObs:"",
  tgEF:"", tg24h:"", tgObs:"",
  heTemp:"", heLabs:"", heMed:"", heAtb:"", heProf:"", heObs:"",
  _datas:{}, // { fieldName: "2026-04-25" } — data da última edição de cada campo
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

function EvolucaoEditor({ leito, campos, onCampoEdit }) {
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
    tgEF:useRef(), tg24h:useRef(), tgObs:useRef(),
    heTemp:useRef(), heLabs:useRef(), heMed:useRef(), heAtb:useRef(), heProf:useRef(), heObs:useRef(),
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
      if(d.vazao)   dl+=` ${d.vazao}ml/h`;
      if(d.kcalTotal&&peso) dl+=` (${(parseFloat(d.kcalTotal)/peso).toFixed(1)} kcal/kg/d`;
      if(d.ptnTotal&&peso)  dl+=` / ${(parseFloat(d.ptnTotal)/peso).toFixed(2)} g ptn/kg/d)`;
      p.push(`- ${dl}`);
    }else if(d?.tipo==="jejum") p.push(`- Dieta: Jejum`);
    if(get("tgEF"))   p.push(`- EF: ${get("tgEF")}`);
    if(get("tg24h"))  p.push(`- 24h: ${get("tg24h")}`);
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
    if(get("heAtb")) p.push(get("heAtb"));
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
    const blocos=[["== N:",txtN],["== Cv:",txtCv],["== Res:",txtRes],["== ReMe:",txtReMe],["== TGI:",txtTGI],["== He:",txtHe],["== In:",txtIn]];
    blocos.forEach(([h,fn])=>{ const c=fn(); if(c) t+=`${h}\n${c}\n\n`; });
    navigator.clipboard.writeText(t);
    setCopiado(c=>({...c,tudo:true}));
    setTimeout(()=>setCopiado(c=>({...c,tudo:false})),2500);
  };

  const colors={N:"#a78bfa",Cv:"#f87171",Res:"#38bdf8",ReMe:"#34d399",TGI:"#fb923c",He:"#f59e0b",In:"#94a3b8"};

  const SysB = ({id,sigla,label,color,txtFn,children}) => {
    const [open,setOpen]=useState(true);
    const cp=copiado[id];
    return (
      <div style={{marginBottom:10,border:`1px solid ${open?"rgba(255,255,255,0.09)":"rgba(255,255,255,0.05)"}`,borderRadius:10,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",background:"rgba(255,255,255,0.03)"}}>
          <button onClick={()=>setOpen(o=>!o)} style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"none",border:"none",cursor:"pointer",textAlign:"left"}}>
            <div style={{width:3,height:16,background:color,borderRadius:2,flexShrink:0}}/>
            <span style={{fontSize:12,fontWeight:700,color,fontFamily:mono,letterSpacing:1.5}}>{sigla}</span>
            <span style={{fontSize:12,color:"#475569",fontWeight:400}}>{label}</span>
            <span style={{marginLeft:"auto",color:"#475569",fontSize:11}}>{open?"▲":"▼"}</span>
          </button>
          <button onClick={()=>copiarBloco(id,txtFn)} style={{margin:"6px 10px",padding:"4px 12px",borderRadius:6,fontSize:11,fontWeight:600,background:cp?"rgba(34,197,94,0.15)":"rgba(255,255,255,0.05)",border:`1px solid ${cp?"#22c55e":"rgba(255,255,255,0.1)"}`,color:cp?"#22c55e":"#94a3b8",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>
            {cp?"✓ Copiado":"📋 Copiar"}
          </button>
        </div>
        {open&&<div style={{padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>{children}</div>}
      </div>
    );
  };

  const Row=({children})=><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>{children}</div>;
  const Col=({children,flex=1,min=120})=><div style={{flex,minWidth:min}}>{children}</div>;
  const FL=({children})=><div style={{fontSize:10,color:"#64748b",fontFamily:mono,letterSpacing:1,marginBottom:3}}>{children}</div>;

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
        <Row><Col><FL>EF — GCS · RASS · Pupilas · Déficit</FL><TA fieldRef={refs.nEF} defaultValue={campos.nEF} isAntigo={isAntigo("nEF")} placeholder="GCS 12T (AO4 RV2 RM6) / RASS 0 / Pupilas isofotorreagentes 2-2" rows={2} fieldName="nEF" onBlurSave={salvar}/></Col></Row>
        <Row>
          <Col><FL>P — SEDAÇÃO</FL><TA fieldRef={refs.nSeda} defaultValue={campos.nSeda} isAntigo={isAntigo("nSeda")} placeholder="Precedex 10ml/h (0,57 mcg/kg/h) + Quetiapina 150mg/d" rows={2} fieldName="nSeda" onBlurSave={salvar}/></Col>
          <Col><FL>A — ANALGESIA</FL><TA fieldRef={refs.nAnalg} defaultValue={campos.nAnalg} isAntigo={isAntigo("nAnalg")} placeholder="Metadona 22,5mg/d + Lido 140mg 12/12h" rows={2} fieldName="nAnalg" onBlurSave={salvar}/></Col>
        </Row>
        <Row><Col><FL>PSIQ / OUTROS</FL><TA fieldRef={refs.nPsiq} defaultValue={campos.nPsiq} isAntigo={isAntigo("nPsiq")} placeholder="Diazepam 40mg/d + Sertralina 50mg/d" rows={1} fieldName="nPsiq" onBlurSave={salvar}/></Col></Row>
        <Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.nObs} defaultValue={campos.nObs} isAntigo={isAntigo("nObs")} placeholder="Avaliação neuro 21/04: área hipodensa em tronco — aguarda RM" rows={1} fieldName="nObs" onBlurSave={salvar}/></Col></Row>
      </SysB>

      <SysB id="cv" sigla="== Cv:" label="Cardiovascular" color={colors.Cv} txtFn={txtCv}>
        <Row><Col><FL>EF — Estabilidade · Ritmo · Bulhas</FL><TA fieldRef={refs.cvEF} defaultValue={campos.cvEF} isAntigo={isAntigo("cvEF")} placeholder="Hemodinamicamente estável, sem DVA. RCR, 2T, BNF SS." rows={2} fieldName="cvEF" onBlurSave={salvar}/></Col></Row>
        <Row>
          <Col><FL>24h — FC / PAM (min-máx)</FL><TA fieldRef={refs.cv24h} defaultValue={campos.cv24h} isAntigo={isAntigo("cv24h")} placeholder="FC 109 - 58 / PAM 121 - 58" rows={1} fieldName="cv24h" onBlurSave={salvar}/></Col>
          <Col><FL>DVA — Droga + vazão + dose</FL><TA fieldRef={refs.cvDVA} defaultValue={campos.cvDVA} isAntigo={isAntigo("cvDVA")} placeholder="Nora 5ml/h (0,08 mcg/kg/min)" rows={1} fieldName="cvDVA" onBlurSave={salvar}/></Col>
        </Row>
        <Row>
          <Col><FL>P — MEDICAÇÕES CV</FL><TA fieldRef={refs.cvMed} defaultValue={campos.cvMed} isAntigo={isAntigo("cvMed")} placeholder="Atenolol 25mg" rows={1} fieldName="cvMed" onBlurSave={salvar}/></Col>
          <Col><FL>Perfusão — TEC · Lactato</FL><TA fieldRef={refs.cvPerf} defaultValue={campos.cvPerf} isAntigo={isAntigo("cvPerf")} placeholder="TEC 2 seg / Lactato 12 > 22" rows={1} fieldName="cvPerf" onBlurSave={salvar}/></Col>
        </Row>
        <Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.cvObs} defaultValue={campos.cvObs} isAntigo={isAntigo("cvObs")} placeholder="Eco beira-leito amanhã" rows={1} fieldName="cvObs" onBlurSave={salvar}/></Col></Row>
      </SysB>

      <SysB id="res" sigla="== Res:" label="Respiratório" color={colors.Res} txtFn={txtRes}>
        <Row><Col><FL>Ventilação — Modo · PS · PEEP · FiO2 · Pocc</FL><TA fieldRef={refs.reVM} defaultValue={campos.reVM} isAntigo={isAntigo("reVM")} placeholder="TQT em VM modo PSV, PS12 PEEP6 Fi30% / Pocc 7" rows={2} fieldName="reVM" onBlurSave={salvar}/></Col></Row>
        <Row>
          <Col><FL>EF — Ausculta</FL><TA fieldRef={refs.reEF} defaultValue={campos.reEF} isAntigo={isAntigo("reEF")} placeholder="MV + bilateralmente c/ roncos" rows={1} fieldName="reEF" onBlurSave={salvar}/></Col>
          <Col><FL>24h — FR / Sat</FL><TA fieldRef={refs.re24h} defaultValue={campos.re24h} isAntigo={isAntigo("re24h")} placeholder="FR 41 - 20 / Sat 96 - 92" rows={1} fieldName="re24h" onBlurSave={salvar}/></Col>
        </Row>
        <Row>
          <Col><FL>Gasometria</FL><TA fieldRef={refs.reGaso} defaultValue={campos.reGaso} isAntigo={isAntigo("reGaso")} placeholder="pH 7,41 / pCO2 40 / pO2 69 / bic 25 / SataO2 94%" rows={1} fieldName="reGaso" onBlurSave={salvar}/></Col>
          <Col><FL>POCUS — Data · Achados</FL><TA fieldRef={refs.rePocus} defaultValue={campos.rePocus} isAntigo={isAntigo("rePocus")} placeholder="22/04: Excursão 0,87 / Fen 12%" rows={1} fieldName="rePocus" onBlurSave={salvar}/></Col>
        </Row>
        <Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.reObs} defaultValue={campos.reObs} isAntigo={isAntigo("reObs")} placeholder="Tentar reduzir PS amanhã" rows={1} fieldName="reObs" onBlurSave={salvar}/></Col></Row>
      </SysB>

      <SysB id="reme" sigla="== ReMe:" label="Renal / Metabólico" color={colors.ReMe} txtFn={txtReMe}>
        <Row>
          <Col><FL>24h — HD · BH</FL><TA fieldRef={refs.rm24h} defaultValue={campos.rm24h} isAntigo={isAntigo("rm24h")} placeholder="HD 3000 / BH +1084 > +1508" rows={1} fieldName="rm24h" onBlurSave={salvar}/></Col>
          <Col><FL>TRS</FL><TA fieldRef={refs.rmTRS} defaultValue={campos.rmTRS} isAntigo={isAntigo("rmTRS")} placeholder="CRRT citrato 150ml/h" rows={1} fieldName="rmTRS" onBlurSave={salvar}/></Col>
        </Row>
        <Row><Col><FL>Labs — Cr · Ur · K · Na · Cai · Mg · P · Cl</FL><TA fieldRef={refs.rmLabs} defaultValue={campos.rmLabs} isAntigo={isAntigo("rmLabs")} placeholder="Cr 1,56 > 1,27 / Ur 66 > 47 / K 4,2 > 4,1 / Na 143 > 141" rows={2} fieldName="rmLabs" onBlurSave={salvar}/></Col></Row>
        <Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.rmObs} defaultValue={campos.rmObs} isAntigo={isAntigo("rmObs")} placeholder="Repor K se < 3,5" rows={1} fieldName="rmObs" onBlurSave={salvar}/></Col></Row>
      </SysB>

      <SysB id="tgi" sigla="== TGI:" label="Gastrointestinal" color={colors.TGI} txtFn={txtTGI}>
        {leito.dieta?.tipo&&<div style={{padding:"6px 10px",background:"rgba(251,146,60,0.07)",border:"1px solid rgba(251,146,60,0.2)",borderRadius:6,fontSize:11,color:"#fb923c",marginBottom:8}}>🍽 Dieta cadastrada: <strong>{leito.dieta.tipo}</strong>{leito.dieta.formula&&` — ${leito.dieta.formula}`}{leito.dieta.vazao&&` @ ${leito.dieta.vazao} mL/h`}</div>}
        <Row>
          <Col><FL>EF — Abdome</FL><TA fieldRef={refs.tgEF} defaultValue={campos.tgEF} isAntigo={isAntigo("tgEF")} placeholder="Abdômen globoso, flácido, indolor à palpação." rows={2} fieldName="tgEF" onBlurSave={salvar}/></Col>
          <Col><FL>24h — Dex · Evacuação</FL><TA fieldRef={refs.tg24h} defaultValue={campos.tg24h} isAntigo={isAntigo("tg24h")} placeholder="Dex 105 - 167 | última evacuação 21/04" rows={2} fieldName="tg24h" onBlurSave={salvar}/></Col>
        </Row>
        <Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.tgObs} defaultValue={campos.tgObs} isAntigo={isAntigo("tgObs")} placeholder="Omeprazol para LAMG" rows={1} fieldName="tgObs" onBlurSave={salvar}/></Col></Row>
      </SysB>

      <SysB id="he" sigla="== He:" label="Hematológico" color={colors.He} txtFn={txtHe}>
        <Row>
          <Col><FL>Temperatura — mín · máx</FL><TA fieldRef={refs.heTemp} defaultValue={campos.heTemp} isAntigo={isAntigo("heTemp")} placeholder="37,2 - 36,2" rows={1} fieldName="heTemp" onBlurSave={salvar}/></Col>
          <Col><FL>** Profilaxias / TEV</FL><TA fieldRef={refs.heProf} defaultValue={campos.heProf} isAntigo={isAntigo("heProf")} placeholder="HNF 5kUI 12/12h / Bactrim + Ác fólico" rows={1} fieldName="heProf" onBlurSave={salvar}/></Col>
        </Row>
        <Row><Col><FL>Labs — Hb · Leuco · Bastões · Plaq</FL><TA fieldRef={refs.heLabs} defaultValue={campos.heLabs} isAntigo={isAntigo("heLabs")} placeholder="7,6 > 7,5 / Leuco 21k > 14k / Bastões 5% > 4% / Plaq 191k > 251k" rows={2} fieldName="heLabs" onBlurSave={salvar}/></Col></Row>
        <Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.heObs} defaultValue={campos.heObs} isAntigo={isAntigo("heObs")} placeholder="Aguarda cultura / BAAR negativo" rows={1} fieldName="heObs" onBlurSave={salvar}/></Col></Row>
      </SysB>

      <SysB id="in" sigla="== In:" label="Infeccioso / Dispositivos" color={colors.In} txtFn={txtIn}>
        {ativos.length>0&&<div style={{padding:"6px 10px",background:"rgba(148,163,184,0.07)",border:"1px solid rgba(148,163,184,0.15)",borderRadius:6,fontSize:11,color:"#94a3b8",marginBottom:8}}>
          📎 {ativos.map(a=>{const dd=Math.floor((new Date()-new Date(a.disp.data+"T00:00:00"))/86400000);return `${a.label}${a.disp.site?` (${a.disp.site})`:""} D${dd}`;}).join(" / ")}
        </div>}
        <Row><Col><FL>Profilaxias / Outros medicamentos</FL><TA fieldRef={refs.heMed} defaultValue={campos.heMed} isAntigo={isAntigo("heMed")} placeholder="Bactrim + Ác fólico / Eritropoietina 4000 UI 48/48h" rows={2} fieldName="heMed" onBlurSave={salvar}/></Col></Row>
        <Row><Col><FL>Antibióticos — nome + período</FL><TA fieldRef={refs.heAtb} defaultValue={campos.heAtb} isAntigo={isAntigo("heAtb")} placeholder={"- Meropenem + Vanco (15/04 - 22/04)\n- Tazocin + Claritromicina (21/03-27/03/2026)"} rows={3} fieldName="heAtb" onBlurSave={salvar}/></Col></Row>
      </SysB>

      <button onClick={copiarTudo} style={{width:"100%",padding:"13px",marginTop:6,background:copiado.tudo?"rgba(34,197,94,0.15)":"linear-gradient(135deg,rgba(2,132,199,0.25),rgba(3,105,161,0.25))",border:`1.5px solid ${copiado.tudo?"#22c55e":"#0284c7"}`,borderRadius:10,color:copiado.tudo?"#22c55e":"#38bdf8",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
        {copiado.tudo?"✅ Evolução completa copiada!":"📋 Copiar evolução completa"}
      </button>
    </div>
  );
}

// ── MetasPanel ────────────────────────────────────────────────────────────────
function MetasPanel() {
  const [metas, setMetas] = useState([]);
  const [nova,  setNova]  = useState("");
  const [show,  setShow]  = useState(false);
  const add = (t) => { if(!t.trim()) return; setMetas(m=>[...m,{id:Date.now(),texto:t.trim(),status:"pendente"}]); setNova(""); setShow(false); };
  const s = { total:metas.length, ok:metas.filter(m=>m.status==="cumprido").length, pend:metas.filter(m=>m.status==="pendente").length };

  return (
    <div>
      {metas.length>0 && (
        <div style={{display:"flex",gap:12,marginBottom:16,padding:"10px 14px",background:"rgba(255,255,255,0.03)",borderRadius:8}}>
          {[["TOTAL",s.total,"#e2e8f0"],["CUMPRIDAS",s.ok,"#22c55e"],["PENDENTES",s.pend,"#f59e0b"]].map(([l,v,c])=>(
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
      {show && <div style={{marginBottom:14}}>{METAS_SUGESTOES.map(s=><div key={s} onClick={()=>add(s)} style={{padding:"7px 12px",borderRadius:6,fontSize:12,color:"#94a3b8",cursor:"pointer",background:"rgba(255,255,255,0.02)",marginBottom:4,border:"1px solid rgba(255,255,255,0.05)"}}>+ {s}</div>)}</div>}
      {metas.length===0 && <div style={{textAlign:"center",padding:24,color:"#334155",fontSize:13}}>Nenhuma meta cadastrada para este plantão</div>}
      {metas.map(m=>(
        <div key={m.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",background:"rgba(255,255,255,0.03)",borderRadius:8,marginBottom:6,border:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:"#cbd5e1",marginBottom:6}}>{m.texto}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["pendente","andamento","cumprido"].map(st=>(
                <button key={st} onClick={()=>setMetas(ms=>ms.map(x=>x.id===m.id?{...x,status:st}:x))}
                  style={{padding:"2px 10px",borderRadius:20,border:`1px solid ${m.status===st?"#38bdf8":"rgba(255,255,255,0.1)"}`,background:m.status===st?"rgba(56,189,248,0.12)":"transparent",color:m.status===st?"#38bdf8":"#64748b",fontSize:11,cursor:"pointer",fontFamily:mono}}>
                  {st==="pendente"?"● Pendente":st==="andamento"?"◑ Andamento":"✓ Cumprido"}
                </button>
              ))}
            </div>
          </div>
          <button onClick={()=>setMetas(ms=>ms.filter(x=>x.id!==m.id))} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:16,padding:2}}>✕</button>
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
    <div style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{color:"#38bdf8"}}>Carregando…</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora','DM Sans',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box}input{outline:none;color-scheme:dark}`}</style>
      <div style={{width:"100%",maxWidth:380,padding:32}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,#0284c7,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 14px"}}>⚕️</div>
          <div style={{fontSize:22,fontWeight:700,color:"#e2e8f0",letterSpacing:0.3}}>UTI Evolve</div>
          <div style={{fontSize:12,color:"#475569",fontFamily:"'DM Mono',monospace",letterSpacing:1.5,marginTop:4}}>ASSISTENTE DE EVOLUÇÃO</div>
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
            style={{width:"100%",padding:"11px",background:loading||!senha?"rgba(56,189,248,0.1)":"linear-gradient(135deg,#0284c7,#0369a1)",border:"1px solid rgba(56,189,248,0.3)",borderRadius:8,color:loading||!senha?"#475569":"white",fontWeight:700,fontSize:14,cursor:loading||!senha?"not-allowed":"pointer",fontFamily:"inherit"}}>
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
  const [evolPorLeito, setEvolPorLeito] = useState({}); // { leitoId: evolCampos }
  const [tabelaData, setTabelaData] = useState({});
  const [config, setConfig] = useState({
    alertaCVC: 7, alertaPAI: 7, alertaSVD: 14, alertaTQT: 99,
    alertaTOT: 99, alertaSNG: 21, alertaDreno: 21, alertaDialise: 14,
  });
  const [saving, setSaving] = useState(false);
  const saveTimer   = useRef(null);
  const evolTimer   = useRef(null);
  const tabelaTimer = useRef(null);
  const configTimer = useRef(null);

  // Trava de segurança para impedir o salvamento automático antes do carregamento
  const isLoaded = useRef(false);

  // ── LOAD ─────────────────────────────────────────────────────────────────────
  const loadData = async () => {
    try {
      const { data: ld } = await supabase.from("config").select("value").eq("key","leitos_data").single();
      if (ld?.value) {
        const p = JSON.parse(ld.value);
        if (Array.isArray(p) && p.length) setLeitos(p);
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
          const firstId = LEITOS_INICIAIS[0].id;
          if (p[firstId]) { setEvolCampos(p[firstId]); setEvolVersion(v=>v+1); }
        }
      }
    } catch {}

    // Libera a trava após o carregamento de todos os dados do Supabase
    isLoaded.current = true;
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

  const onLogin = async () => { await loadData(); setAuthed(true); };

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
    <div style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{color:"#38bdf8",fontSize:14}}>Carregando…</div>
    </div>
  );

  if (!authed) return <LoginScreen onLogin={onLogin}/>;

  return (
    <div style={{minHeight:"100vh",background:"#0a0f1e",fontFamily:"'Sora','DM Sans',sans-serif",color:"#e2e8f0",display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box} textarea,input{outline:none;color-scheme:dark}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(56,189,248,0.3);border-radius:4px}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.5)} button:hover{opacity:0.85}
      `}</style>

      <div style={{padding:"0 24px",height:56,display:"flex",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.02)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#0284c7,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚕️</div>
          <div>
            <div style={{fontSize:14,fontWeight:700,letterSpacing:0.5}}>UTI Evolve</div>
            <div style={{fontSize:10,color:"#475569",fontFamily:mono,letterSpacing:1}}>ASSISTENTE DE EVOLUÇÃO</div>
          </div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:16}}>
          <div style={{fontSize:11,fontFamily:mono,color:saving?"#f59e0b":"#22c55e",display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:saving?"#f59e0b":"#22c55e"}}/>
            {saving?"Salvando…":"Salvo"}
          </div>
          <div style={{fontSize:12,color:"#475569",fontFamily:mono}}>
            {new Date().toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"}).toUpperCase()}
          </div>
          <button onClick={logout} style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,color:"#475569",cursor:"pointer",fontSize:11,padding:"4px 10px",fontFamily:mono}}>Sair</button>
          <button onClick={()=>setAba("config")} title="Configurações" style={{background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:6,color:"#475569",cursor:"pointer",fontSize:14,padding:"4px 8px"}}>⚙️</button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden",height:"calc(100vh - 56px)"}}>
        <div style={{width:220,borderRight:"1px solid rgba(255,255,255,0.06)",padding:"16px 12px",overflowY:"auto",background:"rgba(255,255,255,0.01)",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,paddingLeft:4}}>
            <div style={{fontSize:10,color:"#475569",fontFamily:mono,letterSpacing:2}}>LEITOS</div>
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
          {leitos.map(l=><LeitoCard key={l.id} leito={l} selecionado={l.id===leitoSelId}
            onClick={()=>{setLeitoSelId(l.id);setDadosIA(null);setEvolCampos(EVOLUCAO_VAZIA);setEvolVersion(0);setAba("paciente");}}
            onRename={nome=>{setLeitos(ls=>{const novo=ls.map(x=>x.id===l.id?{...x,nome}:x);salvarLeitos(novo);return novo;})}}
            onRemove={leitos.length>1?()=>{
              setLeitos(ls=>{
                const novo = ls.filter(x=>x.id!==l.id);
                salvarLeitos(novo);
                setLeitoSelId(novo[0].id);
                return novo;
              });
            }:null}
          />)}
        </div>

        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
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
              <div style={{maxWidth:680}}><PacientePanel dados={leito} onChange={atualizar} config={config} onLancarDroga={(linha, campo)=>{
                setEvolCamposComPersistencia(c=>({...c, [campo]: c[campo] ? `${c[campo]}\n${linha}` : linha}));
                setEvolVersion(v=>v+1);
              }}/></div>
            ) : aba==="tabela" ? (
              <TabelaClinica
                leito={leito}
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
                    const novo = {
                      ...t,
                      [leitoSelId]: {
                        ...(t[leitoSelId]||{}),
                        [dataAlvo]: { ...(t[leitoSelId]?.[dataAlvo]||{}), ...novos }
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
                  {dadosIA&&<div style={{background:"rgba(56,189,248,0.07)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#7dd3fc"}}>✅ Dados da IA aplicados — revise e edite abaixo</div>}
                  <EvolucaoEditor leito={leito} campos={evolCampos} key={`${leito.id}-${evolVersion}`}
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
                <MetasPanel key={leito.id}/>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

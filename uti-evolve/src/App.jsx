import { useState, useRef, useCallback, useEffect } from "react";
import React from "react";
import { supabase } from './supabase.js';

const SISTEMAS = [
  "Neurológico","Respiratório","Hemodinâmico",
  "Renal/Metabólico","Gastrointestinal","Hematológico/Infeccioso","Pele/Acessos",
];

const LEITOS_INICIAIS = [
  { id:1, nome:"Leito 01", paciente:"", diagnostico:"", dataInternacao:"", peso:"", altura:"", sexo:"M", procedimentos:[], dispositivos:{}, metas:[] },
  { id:2, nome:"Leito 02", paciente:"", diagnostico:"", dataInternacao:"", peso:"", altura:"", sexo:"M", procedimentos:[], dispositivos:{}, metas:[] },
  { id:3, nome:"Leito 03", paciente:"", diagnostico:"", dataInternacao:"", peso:"", altura:"", sexo:"M", procedimentos:[], dispositivos:{}, metas:[] },
  { id:4, nome:"Leito 04", paciente:"", diagnostico:"", dataInternacao:"", peso:"", altura:"", sexo:"M", procedimentos:[], dispositivos:{}, metas:[] },
];

const METAS_SUGESTOES = [
  "Meta de diurese > 0,5 mL/kg/h","Desmame ventilatório — reduzir FiO2",
  "Controle glicêmico 140-180 mg/dL","Mobilização precoce",
  "Reposição de K+ se < 3,5","Hemoculturas antes de ATB",
  "Ecocardiograma beira-leito","Discutir retirada de DVA",
];

// Diluições padrão do protocolo da UTI
const DROGAS_PROTOCOLO = {
  noradrenalina: {
    label:"Noradrenalina", grupo:"vasoativa",
    diluicaoDesc:"4 amp (16 mg) em SG5% 234 mL → 250 mL",
    concMcgML: 64, modoCalc:"mcg_kg_min", max:3, unidadeLabel:"mcg/kg/min",
  },
  dobutamina: {
    label:"Dobutamina", grupo:"vasoativa",
    diluicaoDesc:"80 mL (250 mg) em SG5% 170 mL → 250 mL",
    concMcgML: 1000, modoCalc:"mcg_kg_min", max:20, unidadeLabel:"mcg/kg/min",
  },
  vasopressina: {
    label:"Vasopressina", grupo:"vasoativa",
    diluicaoDesc:"2 mL (20 UI) em SG5% 98 mL → 100 mL",
    concMcgML: null, concUIML: 0.2, modoCalc:"ui_min", max:0.04, unidadeLabel:"UI/min",
  },
  nitroglicerina: {
    label:"Nitroglicerina", grupo:"vasoativa",
    diluicaoDesc:"10 mL (50 mg) em SG5% 90 mL → 100 mL",
    concMcgML: 500, modoCalc:"mcg_min", max:400, unidadeLabel:"mcg/min",
  },
  nitroprussiato: {
    label:"Nitroprussiato", grupo:"vasoativa",
    diluicaoDesc:"2 mL (50 mg) em SG5% 248 mL → 250 mL",
    concMcgML: 200, modoCalc:"mcg_kg_min", max:10, unidadeLabel:"mcg/kg/min",
  },
  propofol: {
    label:"Propofol", grupo:"sedacao",
    diluicaoDesc:"10 mg/mL — 100 mL puro (sem diluição)",
    concMcgML: 10000, modoCalc:"mg_h", max:400, unidadeLabel:"mg/h",
    tooltip:"Manutenção: 5-50 mcg/kg/min (0,3-3 mg/kg/h)\nMáximo: 4 mg/kg/h"
  },
  midazolam: {
    label:"Midazolam", grupo:"sedacao",
    diluicaoDesc:"20 mL (100 mg) em SG5% 80 mL → 100 mL",
    concMcgML: 1000, modoCalc:"mg_h", max:15, unidadeLabel:"mg/h",
    tooltip:"Manutenção: 0,02-0,1 mg/kg/h (1-7 mg/h)"
  },
  precedex: {
    label:"Precedex (Dex)", grupo:"sedacao",
    diluicaoDesc:"4 mL (200 mcg) em SF0,9% 96 mL → 100 mL",
    concMcgML: 2, modoCalc:"mcg_kg_h", max:1.4, unidadeLabel:"mcg/kg/h",
    tooltip:"Manutenção: 0,2-0,7 mcg/kg/h (até 1,4 mcg/kg/h em estudos recentes)\n↓ em Hepatopatas e >65 anos"
  },
  fentanil: {
    label:"Fentanil", grupo:"analgesia",
    diluicaoDesc:"20 mL (1000 mcg) em SF0,9% 80 mL → 100 mL",
    concMcgML: 10, modoCalc:"mcg_kg_h", max:5, unidadeLabel:"mcg/kg/h",
  },
  cetamina: {
    label:"Cetamina (Escetamina)", grupo:"analgesia",
    diluicaoDesc:"10 mL (500 mg) em SG5% 90 mL → 100 mL",
    concMcgML: 5000, modoCalc:"mg_kg_h", max:0.3, unidadeLabel:"mg/kg/h",
    tooltip:"Início: 0,5 mg/kg IV em bolus\nManutenção: 1-2 mcg/kg/min (0,06-0,12 mg/kg/h)\nDoses baixas: 0,06-0,3 mg/kg/h"
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
  if (conf.modoCalc === "mg_kg_h") { 
    if (!p) return null;
    const dose = (mlhN * (conc / 1000)) / p;
    return { dose: dose.toFixed(3), label: conf.unidadeLabel };
  }
  if (conf.modoCalc === "mg_h") { 
    const dose = (mlhN * conc) / 1000;
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

  const moveUp = (idx) => {
    if (idx === 0) return;
    const arr = [...procedimentos];
    [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
    onChange(arr);
  };

  const moveDown = (idx) => {
    if (idx === procedimentos.length - 1) return;
    const arr = [...procedimentos];
    [arr[idx+1], arr[idx]] = [arr[idx], arr[idx+1]];
    onChange(arr);
  };

  return (
    <div>
      <SecTitle>PROCEDIMENTOS CIRÚRGICOS / INVASIVOS</SecTitle>

      {procedimentos.length === 0 && (
        <div style={{padding:"18px 14px",background:"rgba(255,255,255,0.02)",border:"1px dashed rgba(255,255,255,0.08)",borderRadius:8,textAlign:"center",color:"#334155",fontSize:13,marginBottom:12}}>
          Nenhum procedimento registrado
        </div>
      )}

      {procedimentos.map((p, idx)=>{
        const po = diasPO(p.data);
        const editing = editId === p.id;
        return (
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,marginBottom:8,position:"relative",overflow:"hidden"}}>
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
              <div style={{display:"flex",flexDirection:"column",gap:4, alignItems:"center", paddingLeft:4}}>
                <div style={{display:"flex", gap:2}}>
                  <button onClick={()=>moveUp(idx)} disabled={idx===0} title="Mover para cima" style={{background:"none",border:"none",color:idx===0?"#334155":"#94a3b8",cursor:idx===0?"default":"pointer",fontSize:14,padding:2}}>▲</button>
                  <button onClick={()=>moveDown(idx)} disabled={idx===procedimentos.length-1} title="Mover para baixo" style={{background:"none",border:"none",color:idx===procedimentos.length-1?"#334155":"#94a3b8",cursor:idx===procedimentos.length-1?"default":"pointer",fontSize:14,padding:2}}>▼</button>
                </div>
                <div style={{display:"flex", gap:6}}>
                  <button onClick={()=>setEditId(p.id)} title="Editar" style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:13,padding:2}}>✏️</button>
                  <button onClick={()=>removeProc(p.id)} title="Remover" style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:13,padding:2}}>🗑️</button>
                </div>
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
    </div>
  );
}


// ── DrogasCalculadora ─────────────────────────────────────────────────────────
const GRUPOS = { vasoativa:"Vasoativas", sedacao:"Sedação", analgesia:"Analgesia" };

function DrogasCalculadora({ peso, onLancarDroga, drogasState={}, onChangeDrogas }) {
  const [drogaSel, setDrogaSel] = useState("noradrenalina");
  const [editandoConc, setEditandoConc] = useState(false);
  const [lancado, setLancado]   = useState(false);

  const dState = drogasState[drogaSel] || { mlh:"", concCustom:"", lastEdit:"" };
  const mlh = dState.mlh;
  const concCustom = dState.concCustom;

  const setVal = (field, val) => {
    onChangeDrogas({
      ...drogasState,
      [drogaSel]: {
        ...dState,
        [field]: val,
        lastEdit: new Date().toLocaleString("pt-BR", {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})
      }
    });
  };

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

  const CAMPO_EVOLUCAO = { vasoativa: "cvDVA", sedacao: "nSeda", analgesia: "nAnalg" };

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
        Informe a <strong style={{color:"#e2e8f0"}}>vazão da bomba (mL/h)</strong> — o valor ficará salvo na memória do leito.
      </div>
      {Object.entries(porGrupo).map(([grupo, drogas])=>(
        <div key={grupo} style={{marginBottom:10}}>
          <div style={{fontSize:9,color:"#475569",fontFamily:mono,letterSpacing:2,marginBottom:5,textTransform:"uppercase"}}>{GRUPOS[grupo]||grupo}</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {drogas.map(([key,d])=>(
              <button key={key} onClick={()=>{setDrogaSel(key); setEditandoConc(false);}}
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
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0"}}>{conf.label}</div>
              {conf.tooltip && (
                <span title={conf.tooltip} style={{cursor:"help",fontSize:15}}>📌</span>
              )}
            </div>
            <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{conf.diluicaoDesc}</div>
            {conf.concMcgML && <div style={{fontSize:11,color:concCustom?"#f59e0b":"#38bdf8",marginTop:1,fontFamily:mono}}>
              {concCustom ? `★ ${concCustom} mcg/mL (personalizado)` : `= ${conf.concMcgML} mcg/mL`}
            </div>}
            {conf.concUIML && <div style={{fontSize:11,color:"#38bdf8",marginTop:1,fontFamily:mono}}>= {conf.concUIML} UI/mL</div>}
            
            {dState.lastEdit && (
              <div style={{fontSize:10, color:"#94a3b8", marginTop:6, display:"flex", alignItems:"center", gap:4}}>
                <span style={{color:"#38bdf8"}}>🕒</span> Atualizado em {dState.lastEdit}
              </div>
            )}
          </div>
          <button onClick={()=>setEditandoConc(e=>!e)} style={{padding:"4px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#64748b",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
            {editandoConc?"✕ Fechar":"✏️ Diluição personalizada"}
          </button>
        </div>

        {editandoConc && (
          <div style={{marginBottom:14,padding:"10px 12px",background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:8}}>
            <div style={{fontSize:10,color:"#f59e0b",fontFamily:mono,letterSpacing:1,marginBottom:8}}>CONCENTRAÇÃO PERSONALIZADA (mcg/mL)</div>
            <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap"}}>
              <Field label="CONCENTRAÇÃO" value={concCustom} onChange={v => setVal("concCustom", v)} type="number" placeholder={String(conf.concMcgML||"")} suffix="mcg/mL"/>
              <button onClick={()=>setVal("concCustom", "")} style={{padding:"8px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#64748b",fontSize:12,cursor:"pointer",marginBottom:1}}>
                Resetar
              </button>
            </div>
            <div style={{fontSize:11,color:"#64748b",marginTop:6}}>Padrão do protocolo: {conf.concMcgML} mcg/mL</div>
          </div>
        )}

        <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
          <Field label="VAZÃO DA BOMBA (mL/h)" value={mlh} onChange={v => setVal("mlh", v)} type="number" placeholder="5.0" suffix="mL/h"/>
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
        
        {drogaSel === "noradrenalina" && resultado && (
          <div style={{marginTop:8, display:"flex", flexDirection:"column", gap:6}}>
            {parseFloat(resultado.dose) > 0.25 && (
              <div style={{padding:"6px 10px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:6,fontSize:12,color:"#fbbf24"}}>
                ⚠️ <strong>Dose &gt; 0,25 mcg/kg/min:</strong> Lembrete para associar Vasopressina.
              </div>
            )}
            {parseFloat(resultado.dose) > 0.8 && (
              <div style={{padding:"6px 10px",background:"rgba(225,29,72,0.08)",border:"1px solid rgba(225,29,72,0.25)",borderRadius:6,fontSize:12,color:"#fb7185"}}>
                🚨 <strong>Dose &gt; 0,8 mcg/kg/min:</strong> Lembrete para associar Adrenalina em infusão contínua.
              </div>
            )}
          </div>
        )}

        {resultado && !acimaDose && conf.max && drogaSel !== "noradrenalina" && (
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

  const propofolMLH = parseFloat(dados.drogasCalc?.propofol?.mlh);
  const kcalPropofol = !isNaN(propofolMLH) && propofolMLH > 0 ? Math.round(propofolMLH * 24 * 1.1) : 0;

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

      {kcalPropofol > 0 && (
        <div style={{marginBottom:10,padding:"10px 14px",background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.25)",borderRadius:8,fontSize:12,color:"#c4b5fd", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10}}>
          <span>💡 <strong>Aporte Lipídico (Propofol a {propofolMLH} mL/h):</strong> aprox. <strong>{kcalPropofol} kcal/dia</strong>.</span>
          <button onClick={() => upd("obs", dieta.obs ? `${dieta.obs} | Aporte Propofol: ${kcalPropofol} kcal/dia` : `Aporte Propofol: ${kcalPropofol} kcal/dia`)} 
            style={{padding:"6px 12px", background:"rgba(167,139,250,0.15)", border:"1px solid #a78bfa", borderRadius:6, color:"#c4b5fd", cursor:"pointer", fontSize:11, fontWeight:600}}>
            + Adicionar à Obs
          </button>
        </div>
      )}

      <Field label="OBSERVAÇÕES" value={dieta.obs} onChange={v=>upd("obs",v)} placeholder="Tolerando bem, vômitos, resíduo gástrico elevado, data de introdução…"/>
    </div>
  );
}

// ── DispositivosPanel ─────────────────────────────────────────────────────────
const DISP_SINGULAR = [
  { key:"tot",   label:"Tubo Orotraqueal (TOT)", icone:"🫁", siteDefault:"",         alertaDias:99 },
  { key:"tqt",   label:"Traqueostomia (TQT)",    icone:"🫁", siteDefault:"",         alertaDias:99 },
  { key:"svd",   label:"Sonda Vesical de Demora",icone:"💧", siteDefault:"",         alertaDias:14 },
  { key:"pai",   label:"Cateter Arterial (PAI)", icone:"📈", siteDefault:"Radial D", alertaDias:7  },
  { key:"sng",   label:"Sonda Naso/Nasoenteral", icone:"🔧", siteDefault:"",         alertaDias:21 },
];

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

  const novoDisp = (siteDefault="") => ({
    id: Date.now() + Math.random(),
    data: new Date().toISOString().split("T")[0],
    site: siteDefault,
    obs: "",
  });

  const isSingularAtivo = (key) => !!dispositivos[key]?.ativo;

  const inserirSingular = (key, siteDefault="") => {
    onChange({ ...dispositivos, [key]: { ativo:true, data:new Date().toISOString().split("T")[0], site:siteDefault, obs:"" }});
    setShowPicker(false);
  };
  const retirarSingular = (key) =>
    onChange({ ...dispositivos, [key]: { ativo:false, data:"", site:"", obs:"" }});
  const updSingular = (key, field, val) =>
    onChange({ ...dispositivos, [key]: { ...(dispositivos[key]||{}), [field]:val }});

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

  const singularesDisponiveis = DISP_SINGULAR.filter(d => !isSingularAtivo(d.key));
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

  const dCalc = dados.diureseCalc || { vol:"", h:"", lastEdit:"" };
  const setDCalc = (field, val) => {
    onChange({
      ...dados,
      diureseCalc: {
        ...dCalc,
        [field]: val,
        lastEdit: new Date().toLocaleString("pt-BR", {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})
      }
    });
  };
  const volUrina = dCalc.vol;
  const hUrina = dCalc.h;
  const diurese = (volUrina && hUrina && dados.peso)
    ? (parseFloat(volUrina)/(parseFloat(hUrina)*parseFloat(dados.peso))).toFixed(2) : null;

  const [lancadoDiur, setLancadoDiur] = useState(false);
  const lancarNaEvolucaoDiur = () => {
    if (!diurese || !onLancarDroga) return;
    onLancarDroga(`Diurese: ${diurese} mL/kg/h (${volUrina}mL em ${hUrina}h)`, "rm24h");
    setLancadoDiur(true);
    setTimeout(()=>setLancadoDiur(false), 2000);
  };

  return (
    <div>
      <SecTitle>DADOS DO PACIENTE</SecTitle>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:10 }}>
        <Field label="NOME / ID"      value={dados.paciente}    onChange={v=>onChange({...dados,paciente:v})}    placeholder="Nome ou prontuário"/>
        <Field label="DIAGNÓSTICO"    value={dados.diagnostico} onChange={v=>onChange({...dados,diagnostico:v})} placeholder="Diagnóstico principal"/>
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:10 }}>
        <Field label="DATA INTERNAÇÃO" value={dados.dataInternacao} onChange={v=>onChange({...dados,dataInternacao:

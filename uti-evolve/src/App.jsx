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
          <Field label="VOLUME URINADO (mL)" value={volUrina} onChange={v=>setDCalc("vol",v)} type="number" placeholder="300"/>
          <Field label="PERÍODO (horas)"     value={hUrina}   onChange={v=>setDCalc("h",v)}   type="number" placeholder="6"/>
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
        
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", marginTop:8, gap:10 }}>
          <div style={{ fontSize:12, color: diurese ? (parseFloat(diurese)<0.5?"#f87171":"#4ade80") : "#64748b" }}>
            {diurese ? (parseFloat(diurese)<0.5 ? "⚠️ Oligúria — avaliar volemia e função renal." : "✅ Diurese adequada.") : "Informe os dados para calcular."}
            {dCalc.lastEdit && <span style={{color:"#94a3b8", marginLeft:6}}>· 🕒 Atualizado em {dCalc.lastEdit}</span>}
          </div>
          
          {diurese && (
            <button onClick={lancarNaEvolucaoDiur} style={{
              padding:"6px 14px",
              background: lancadoDiur ? "rgba(34,197,94,0.15)" : "rgba(56,189,248,0.1)",
              border: `1px solid ${lancadoDiur ? "#22c55e" : "#38bdf8"}`,
              borderRadius:8, color: lancadoDiur ? "#22c55e" : "#38bdf8",
              fontWeight:700, fontSize:12, cursor:"pointer", transition:"all 0.2s",
            }}>
              {lancadoDiur ? "✅ Lançado!" : "📋 Lançar na evolução (== ReMe)"}
            </button>
          )}
        </div>
      </>}

      {dados.peso && <>
        <SecTitle>CALCULADORA DE DROGAS — VAZÃO → DOSE</SecTitle>
        <DrogasCalculadora 
          peso={dados.peso} 
          onLancarDroga={onLancarDroga}
          drogasState={dados.drogasCalc || {}}
          onChangeDrogas={dc => onChange({...dados, drogasCalc: dc})}
        />
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
          <button onClick={()=>{
              const d = draft;
              const hoje = new Date().toISOString().split("T")[0];
              const dataAlvo = d.dataColeta || hoje;

              const sistemasFinais = { ...(d.sistemas||{}) };
              (d.extras||[]).forEach(ex=>{
                const cat = ex.categoria || ex.sugestao;
                if (cat && sistemasFinais[cat] !== undefined) {
                  const linha = `${ex.nome}: ${ex.valor}`;
                  sistemasFinais[cat] = sistemasFinais[cat] ? `${sistemasFinais[cat]} / ${linha}` : linha;
                }
              });

              const s = sistemasFinais;
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

              Object.assign(novos, extrair(s["Hemodinâmico"]||"", [ ["lact",  re(`[Ll]actato[:\\s]*${NUM}`)], ["trop",  re(`[Tt]roponina[:\\s]*${NUM}`)], ["bnp",   re(`\\bBNP[:\\s]*${NUM}`)] ]));
              Object.assign(novos, extrair(s["Renal/Metabólico"]||"", [ ["cr",   re(`\\bCr[eatinina\\s]*[:/\\s]*${NUM}`)], ["ur",   re(`\\bUr[eia\\s]*[:/\\s]*${NUM}`)], ["k",    re(`\\bK[+\\s]*[:/\\s]*${NUM}`)], ["na",   re(`\\bNa[+\\s]*[:/\\s]*${NUM}`)], ["mg",   re(`\\bMg[:\\s]*${NUM}`)], ["cai",  re(`\\bCa[i\\s]*[:/\\s]*${NUM}`)], ["p",    re(`\\bP[:\\s]*${NUM}`)], ["ph",   re(`\\bpH[:\\s]*${NUM}`)], ["hco3", re(`\\bHCO3[:\\s]*${NUM}`)], ["diur", re(`[Dd]iurese[:\\s]*${NUM}`)], ["bh",   re(`\\bBH[:\\s]*([+-]?${NUM.slice(1)}`)], ["lact", re(`\\bLactato[:\\s]*${NUM}`)] ]));
              Object.assign(novos, extrair(s["Hematológico/Infeccioso"]||"", [ 
                ["hb",    re(`(?:\\bHb|Hemoglobina)[:\\s]*${NUM}`)], 
                ["ht",    re(`(?:\\bHt|Hemat[óo]crito)[:\\s]*${NUM}`)], 
                ["leuco", re(`(?:Leuco|Leuc[óo]citos)[:\\s]*${NUM}`)], 
                ["neut",  re(`(?:Neut|Neutr[óo]filos)[:\\s]*${NUM}`)], 
                ["bast",  re(`(?:Bast|Bast[õo]es)[:\\s]*${NUM}`)], 
                ["linf",  re(`(?:Linf|Linf[óo]citos)[:\\s]*${NUM}`)], 
                ["plaq",  re(`(?:Plaq|Plaquetas)[:\\s]*${NUM}`)], 
                ["rni",   re(`\\bRNI[:\\s]*${NUM}`)], 
                ["ttpa",  re(`\\bTTPA[:\\s]*${NUM}`)] 
              ]));
              Object.assign(novos, extrair(s["Respiratório"]||"", [ ["po2",  re(`pO2[:\\s]*${NUM}`)], ["pco2", re(`pCO2[:\\s]*${NUM}`)] ]));
              Object.assign(novos, extrair(s["Gastrointestinal"]||"", [ ["tgo",   re(`\\bTGO[:\\s]*${NUM}`)], ["tgp",   re(`\\bTGP[:\\s]*${NUM}`)], ["alb",   re(`[Aa]lbumina[:\\s]*${NUM}`)], ["bttot", re(`[Bb]ili.*[Tt]otal[:\\s]*${NUM}`)], ["ggt",   re(`\\bGGT[:\\s]*${NUM}`)], ["falc",  re(`[Ff]osf.*[Aa]lc[:\\s]*${NUM}`)] ]));

              const EXTRAS_PARA_KEY = {
                'hemoglobina':'hb','hematócrito':'ht','hematocrito':'ht', 'leucócito':'leuco','leucocito':'leuco', 'neutrófilo':'neut','neutrofilo':'neut', 'bastão':'bast','bastao':'bast','bastonete':'bast', 'linfócito':'linf','linfocito':'linf', 'plaqueta':'plaq', 'rni':'rni','inr':'rni','fibrinogênio':'fibri','fibrinogenio':'fibri','ttpa':'ttpa', 'creatinina':'cr','ureia':'ur','uréia':'ur', 'sódio':'na','sodio':'na','potássio':'k','potassio':'k', 'magnésio':'mg','magnesio':'mg', 'cálcio':'cai','calcio':'cai', 'fósforo':'p','fosforo':'p', 'hco3':'hco3','bicarbonato':'hco3', 'lactato':'lact','troponina':'trop','bnp':'bnp', 'po2':'po2','pco2':'pco2', 'tgo':'tgo','ast':'tgo','tgp':'tgp','alt':'tgp', 'albumina':'alb','ggt':'ggt', 'fosfatase':'falc','bilirrubina total':'bttot','bilirrubina direta':'btdir', 'diurese':'diur','balanço':'bh','balanco':'bh',
              };
              (d.extras||[]).forEach(ex=>{
                const cat = ex.categoria || ex.sugestao;
                if (!cat) return; 
                const nl = (ex.nome||'').toLowerCase();
                const numMatch = (ex.valor||'').match(/([0-9]+[.,][0-9]+|[0-9]+)/);
                if (!numMatch) return;
                const numVal = numMatch[1].replace(',','.');
                let achou = false;
                for (const [k, tkey] of Object.entries(EXTRAS_PARA_KEY)) {
                  if (nl.includes(k)) { novos[tkey] = numVal; achou = true; break; }
                }
                if (!achou) {
                  const keyDinamica = `_extra_${ex.nome.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')}`;
                  novos[keyDinamica] = numVal; 
                }
              });

              setTabelaData(t=>{
                const novo = { ...t, [leitoSelId]: { ...(t[leitoSelId]||{}), [dataAlvo]: { ...(t[leitoSelId]?.[dataAlvo]||{}), ...novos } } };
                salvarTabela(novo);
                return novo;
              });
              setDadosIA(d);
              setTimeout(()=>setAba("tabela"), 50);
          }}
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
const EVOLUCAO_VAZIA = {
  nEF:"", nSeda:"", nAnalg:"", nPsiq:"", nObs:"",
  cvEF:"", cv24h:"", cvDVA:"", cvMed:"", cvPerf:"", cvObs:"",
  reVM:"", reEF:"", re24h:"", reGaso:"", rePocus:"", reObs:"",
  rm24h:"", rmLabs:"", rmTRS:"", rmObs:"",
  tgEF:"", tg24h:"", tgLabs:"", tgObs:"",
  heTemp:"", heLabs:"", heMed:"", heAtb:"", heProf:"", heObs:"",
  inCult:"",
  _datas:{},
};

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

function EvolucaoEditor({ leito, campos, onCampoEdit, config={} }) {
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

  const getAlertaDias = (key, defaultDias) => {
    const map = {cvc:"alertaCVC", dialise:"alertaDialise", dreno:"alertaDreno", tot:"alertaTOT", tqt:"alertaTQT", svd:"alertaSVD", pai:"alertaPAI", sng:"alertaSNG"};
    return config[map[key]] ?? defaultDias;
  };

  const ativos = [
    ...DISP_MULTIPLO.flatMap(d=>(Array.isArray(disps[d.key])?disps[d.key]:[]).map((inst,i)=>({
      label:(Array.isArray(disps[d.key])&&disps[d.key].length>1)?`${d.label} ${i+1}`:d.label,
      icone:d.icone, alertaDias:getAlertaDias(d.key, d.alertaDias), disp:inst
    }))),
    ...DISP_SINGULAR.filter(d=>disps[d.key]?.ativo).map(d=>({
      label:d.label, icone:d.icone, alertaDias:getAlertaDias(d.key, d.alertaDias), disp:disps[d.key]
    })),
  ];

  const refs = {
    nEF:useRef(), nSeda:useRef(), nAnalg:useRef(), nPsiq:useRef(), nObs:useRef(),
    cvEF:useRef(), cv24h:useRef(), cvDVA:useRef(), cvMed:useRef(), cvPerf:useRef(), cvObs:useRef(),
    reVM:useRef(), reEF:useRef(), re24h:useRef(), reGaso:useRef(), rePocus:useRef(), reObs:useRef(),
    rm24h:useRef(), rmLabs:useRef(), rmTRS:useRef(), rmObs:useRef(),
    tgEF:useRef(), tg24h:useRef(), tgLabs:useRef(), tgObs:useRef(),
    heTemp:useRef(), heLabs:useRef(), heMed:useRef(), heAtb:useRef(), heProf:useRef(), heObs:useRef(),
    inCult:useRef(),
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
    if(get("heAtb")) p.push(get("heAtb"));
    if(get("inCult")) p.push(`- Culturas: ${get("inCult")}`);
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

      <div style={{display:"flex",gap:16,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#64748b"}}>
          <div style={{width:12,height:12,borderRadius:3,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.15)"}}/>
          Editado hoje
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#64748b"}}>
          <div style={{width:12,height:12,borderRadius:3,background:"rgba(100,116,139,0.15)",border:"1px solid rgba(100,116,139,0.3)"}}/>
          Dia anterior
        </div>
        <button onClick={()=>{
          if(confirm("Limpar toda a evolução deste leito?")) {
            onCampoEdit && Object.keys(EVOLUCAO_VAZIA).filter(k=>k!=='_datas').forEach(k=>onCampoEdit(k,''));
          }
        }} style={{marginLeft:"auto",padding:"4px 10px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:6,color:"#f87171",fontSize:11,cursor:"pointer"}}>
          🗑 Limpar evolução
        </button>
      </div>

      <SysB id="n" sigla="== N:" label="Neurológico" color={colors.N} txtFn={txtN}>
        <Row><Col><FL>EF — GCS · RASS · Pupilas · Déficit</FL><TA fieldRef={refs.nEF} defaultValue={campos.nEF} isAntigo={isAntigo("nEF")} placeholder="GCS 12T (AO4 RV2 RM6) / RASS 0 / Pupilas isofotorreagentes 2-2" rows={2} fieldName="nEF" onBlurSave={salvar}/></Col></Row>
        <Row>
          <Col><FL>P — SEDAÇÃO</FL><TA fieldRef={refs.nSeda} defaultValue={campos.nSeda} isAntigo={isAntigo("nSeda")} placeholder="Precedex 10ml/h (0,57 mcg/kg/h)" rows={2} fieldName="nSeda" onBlurSave={salvar}/></Col>
          <Col><FL>A — ANALGESIA</FL><TA fieldRef={refs.nAnalg} defaultValue={campos.nAnalg} isAntigo={isAntigo("nAnalg")} placeholder="Fentanil" rows={2} fieldName="nAnalg" onBlurSave={salvar}/></Col>
        </Row>
        <Row><Col><FL>PSIQ / OUTROS</FL><TA fieldRef={refs.nPsiq} defaultValue={campos.nPsiq} isAntigo={isAntigo("nPsiq")} placeholder="Quetiapina" rows={1} fieldName="nPsiq" onBlurSave={salvar}/></Col></Row>
        <Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.nObs} defaultValue={campos.nObs} isAntigo={isAntigo("nObs")} placeholder="Obs neuro..." rows={1} fieldName="nObs" onBlurSave={salvar}/></Col></Row>
      </SysB>

      <SysB id="cv" sigla="== Cv:" label="Cardiovascular" color={colors.Cv} txtFn={txtCv}>
        <Row><Col><FL>EF — Estabilidade · Ritmo · Bulhas</FL><TA fieldRef={refs.cvEF} defaultValue={campos.cvEF} isAntigo={isAntigo("cvEF")} placeholder="Estável..." rows={2} fieldName="cvEF" onBlurSave={salvar}/></Col></Row>
        <Row>
          <Col><FL>24h — FC / PAM (min-máx)</FL><TA fieldRef={refs.cv24h} defaultValue={campos.cv24h} isAntigo={isAntigo("cv24h")} rows={1} fieldName="cv24h" onBlurSave={salvar}/></Col>
          <Col><FL>DVA — Droga + vazão + dose</FL><TA fieldRef={refs.cvDVA} defaultValue={campos.cvDVA} isAntigo={isAntigo("cvDVA")} rows={1} fieldName="cvDVA" onBlurSave={salvar}/></Col>
        </Row>
        <Row>
          <Col><FL>P — MEDICAÇÕES CV</FL><TA fieldRef={refs.cvMed} defaultValue={campos.cvMed} isAntigo={isAntigo("cvMed")} rows={1} fieldName="cvMed" onBlurSave={salvar}/></Col>
          <Col><FL>Perfusão — TEC · Lactato</FL><TA fieldRef={refs.cvPerf} defaultValue={campos.cvPerf} isAntigo={isAntigo("cvPerf")} rows={1} fieldName="cvPerf" onBlurSave={salvar}/></Col>
        </Row>
        <Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.cvObs} defaultValue={campos.cvObs} isAntigo={isAntigo("cvObs")} rows={1} fieldName="cvObs" onBlurSave={salvar}/></Col></Row>
      </SysB>

      <SysB id="res" sigla="== Res:" label="Respiratório" color={colors.Res} txtFn={txtRes}>
        <Row><Col><FL>Ventilação</FL><TA fieldRef={refs.reVM} defaultValue={campos.reVM} isAntigo={isAntigo("reVM")} rows={2} fieldName="reVM" onBlurSave={salvar}/></Col></Row>
        <Row>
          <Col><FL>EF — Ausculta</FL><TA fieldRef={refs.reEF} defaultValue={campos.reEF} isAntigo={isAntigo("reEF")} rows={1} fieldName="reEF" onBlurSave={salvar}/></Col>
          <Col><FL>24h — FR / Sat</FL><TA fieldRef={refs.re24h} defaultValue={campos.re24h} isAntigo={isAntigo("re24h")} rows={1} fieldName="re24h" onBlurSave={salvar}/></Col>
        </Row>
        <Row>
          <Col><FL>Gasometria</FL><TA fieldRef={refs.reGaso} defaultValue={campos.reGaso} isAntigo={isAntigo("reGaso")} rows={1} fieldName="reGaso" onBlurSave={salvar}/></Col>
          <Col><FL>POCUS</FL><TA fieldRef={refs.rePocus} defaultValue={campos.rePocus} isAntigo={isAntigo("rePocus")} rows={1} fieldName="rePocus" onBlurSave={salvar}/></Col>
        </Row>
        <Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.reObs} defaultValue={campos.reObs} isAntigo={isAntigo("reObs")} rows={1} fieldName="reObs" onBlurSave={salvar}/></Col></Row>
      </SysB>

      <SysB id="reme" sigla="== ReMe:" label="Renal / Metabólico" color={colors.ReMe} txtFn={txtReMe}>
        <Row>
          <Col><FL>24h — Diurese · HD · BH</FL><TA fieldRef={refs.rm24h} defaultValue={campos.rm24h} isAntigo={isAntigo("rm24h")} rows={1} fieldName="rm24h" onBlurSave={salvar}/></Col>
          <Col><FL>TRS</FL><TA fieldRef={refs.rmTRS} defaultValue={campos.rmTRS} isAntigo={isAntigo("rmTRS")} rows={1} fieldName="rmTRS" onBlurSave={salvar}/></Col>
        </Row>
        <Row><Col><FL>Labs</FL><TA fieldRef={refs.rmLabs} defaultValue={campos.rmLabs} isAntigo={isAntigo("rmLabs")} rows={2} fieldName="rmLabs" onBlurSave={salvar}/></Col></Row>
        <Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.rmObs} defaultValue={campos.rmObs} isAntigo={isAntigo("rmObs")} rows={1} fieldName="rmObs" onBlurSave={salvar}/></Col></Row>
      </SysB>

      <SysB id="tgi" sigla="== TGI:" label="Gastrointestinal" color={colors.TGI} txtFn={txtTGI}>
        <Row>
          <Col><FL>EF — Abdome</FL><TA fieldRef={refs.tgEF} defaultValue={campos.tgEF} isAntigo={isAntigo("tgEF")} rows={2} fieldName="tgEF" onBlurSave={salvar}/></Col>
          <Col><FL>24h — Dex · Evacuação</FL><TA fieldRef={refs.tg24h} defaultValue={campos.tg24h} isAntigo={isAntigo("tg24h")} rows={2} fieldName="tg24h" onBlurSave={salvar}/></Col>
        </Row>
        <Row><Col><FL>Labs</FL><TA fieldRef={refs.tgLabs} defaultValue={campos.tgLabs} isAntigo={isAntigo("tgLabs")} rows={1} fieldName="tgLabs" onBlurSave={salvar}/></Col></Row>
        <Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.tgObs} defaultValue={campos.tgObs} isAntigo={isAntigo("tgObs")} rows={1} fieldName="tgObs" onBlurSave={salvar}/></Col></Row>
      </SysB>

      <SysB id="he" sigla="== He:" label="Hematológico" color={colors.He} txtFn={txtHe}>
        <Row>
          <Col><FL>Temperatura</FL><TA fieldRef={refs.heTemp} defaultValue={campos.heTemp} isAntigo={isAntigo("heTemp")} rows={1} fieldName="heTemp" onBlurSave={salvar}/></Col>
          <Col><FL>Profilaxias</FL><TA fieldRef={refs.heProf} defaultValue={campos.heProf} isAntigo={isAntigo("heProf")} rows={1} fieldName="heProf" onBlurSave={salvar}/></Col>
        </Row>
        <Row><Col><FL>Labs</FL><TA fieldRef={refs.heLabs} defaultValue={campos.heLabs} isAntigo={isAntigo("heLabs")} rows={2} fieldName="heLabs" onBlurSave={salvar}/></Col></Row>
        <Row><Col><FL>* OBSERVAÇÃO</FL><TA fieldRef={refs.heObs} defaultValue={campos.heObs} isAntigo={isAntigo("heObs")} rows={1} fieldName="heObs" onBlurSave={salvar}/></Col></Row>
      </SysB>

      <SysB id="in" sigla="== In:" label="Infeccioso / Dispositivos" color={colors.In} txtFn={txtIn}>
        <Row><Col><FL>Medicamentos</FL><TA fieldRef={refs.heMed} defaultValue={campos.heMed} isAntigo={isAntigo("heMed")} rows={2} fieldName="heMed" onBlurSave={salvar}/></Col></Row>
        <Row><Col><FL>Antibióticos</FL><TA fieldRef={refs.heAtb} defaultValue={campos.heAtb} isAntigo={isAntigo("heAtb")} rows={3} fieldName="heAtb" onBlurSave={salvar}/></Col></Row>
        <Row><Col><FL>Culturas</FL><TA fieldRef={refs.inCult} defaultValue={campos.inCult} isAntigo={isAntigo("inCult")} rows={2} fieldName="inCult" onBlurSave={salvar}/></Col></Row>
      </SysB>

      <button onClick={copiarTudo} style={{width:"100%",padding:"13px",marginTop:6,background:copiado.tudo?"rgba(34,197,94,0.15)":"linear-gradient(135deg,rgba(2,132,199,0.25),rgba(3,105,161,0.25))",border:`1.5px solid ${copiado.tudo?"#22c55e":"#0284c7"}`,borderRadius:10,color:copiado.tudo?"#22c55e":"#38bdf8",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
        {copiado.tudo?"✅ Evolução completa copiada!":"📋 Copiar evolução completa"}
      </button>
    </div>
  );
}

function MetasPanel({ metas=[], onChange }) {
  const [nova,  setNova]  = useState("");
  const [show,  setShow]  = useState(false);
  const add = (t) => { if(!t.trim()) return; onChange([...metas,{id:Date.now(),texto:t.trim(),status:"pendente"}]); setNova(""); setShow(false); };
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

function LeitoCard({ leito, selecionado, onClick, onRename, onRemove, config={}, onMoveUp, onMoveDown, isFirst, isLast }) {
  const dias = diasInternacao(leito.dataInternacao);
  const vago = !leito.paciente;
  const [editingNome, setEditingNome] = useState(false);
  const [nomeTemp, setNomeTemp] = useState(leito.nome);

  const confirmarNome = () => {
    if (nomeTemp.trim()) onRename(nomeTemp.trim());
    setEditingNome(false);
  };

  const getAlertaDias = (key, defaultDias) => {
    const map = {cvc:"alertaCVC", dialise:"alertaDialise", dreno:"alertaDreno", tot:"alertaTOT", tqt:"alertaTQT", svd:"alertaSVD", pai:"alertaPAI", sng:"alertaSNG"};
    return config[map[key]] ?? defaultDias;
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
            <div style={{display:"flex", flexDirection:"column", gap:0, marginRight:2}}>
              <button onClick={e=>{e.stopPropagation();onMoveUp();}} disabled={isFirst} title="Mover para cima" style={{background:"none",border:"none",color:isFirst?"#334155":"#64748b",cursor:isFirst?"default":"pointer",fontSize:10,padding:0,lineHeight:0.8}}>▲</button>
              <button onClick={e=>{e.stopPropagation();onMoveDown();}} disabled={isLast} title="Mover para baixo" style={{background:"none",border:"none",color:isLast?"#334155":"#64748b",cursor:isLast?"default":"pointer",fontSize:10,padding:0,lineHeight:0.8}}>▼</button>
            </div>
          )}

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
              return dd>getAlertaDias(def.key, def.alertaDias);
            })) ||
            DISP_SINGULAR.some(def=>{
              if (!d[def.key]?.ativo||!d[def.key].data) return false;
              const dd=Math.floor((new Date()-new Date(d[def.key].data+"T00:00:00"))/86400000);
              return dd>getAlertaDias(def.key, def.alertaDias);
            });
          return temAlerta ? <div style={{marginTop:5,fontSize:10,color:"#f87171",fontFamily:mono}}>⚠️ Dispositivo p/ revisão</div> : null;
        })()}
      </>}
    </div>
  );
}

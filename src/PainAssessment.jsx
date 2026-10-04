import React, {useState,useRef,useEffect,useId} from 'react';
import {painItems,painTotal,painSummary} from './pain.js';
export default function PainAssessment({value,legacy,onChange,theme={}}){
 const a=value||{};const total=painTotal(a);
 const [open,setOpen]=useState(false);
 const root=useRef(null),trigger=useRef(null),menuId=useId();
 useEffect(()=>{
  if(!open)return;
  const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};
  document.addEventListener('pointerdown',outside);
  return ()=>document.removeEventListener('pointerdown',outside);
 },[open]);
 const result=a.method==='Não avaliável'?'Não avaliável':total!==null?`${a.method} ${String(total).replace('.',',')}/${a.method==='CPOT'?8:a.method==='EVA'?10:12}`:a.method?`${a.method} · incompleta`:legacy||'';
 const mono="'DM Mono',monospace";
 const update=next=>onChange(next,painSummary(next));
 const style={border:`1px solid ${theme.border||'#cbd5e1'}`,borderRadius:8,padding:8,background:theme.bgInput||'#fff',color:theme.text1||'#172033',minWidth:0};
 const optionStyle=selected=>({...style,textAlign:'left',cursor:'pointer',fontSize:12,lineHeight:1.4,borderColor:selected?'#0284c7':theme.border,background:selected?'#e0f2fe':style.background,color:selected?'#075985':style.color});
 return <section ref={root} aria-label="Avaliação de dor" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);trigger.current?.focus();}}} style={{minWidth:0,marginBottom:6,border:`1px solid ${theme.border||'#cbd5e1'}`,borderRadius:8,overflow:'hidden',background:theme.bgInput}}>
 <button ref={trigger} type="button" aria-label="Avaliação de dor" aria-expanded={open} aria-controls={menuId} onClick={()=>setOpen(v=>!v)} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',width:'100%',border:0,textAlign:'left',cursor:'pointer',background:theme.bgCardHover||'#f1f5f9',fontFamily:mono}}>
 <span style={{fontSize:10,color:theme.text3,letterSpacing:1,flex:1}}>Avaliação de dor</span>
 {!open&&result&&<span title={result} style={{fontSize:10,color:theme.accent||'#0284c7',maxWidth:200,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{result}</span>}
 <span aria-hidden="true" style={{fontSize:10,color:theme.text4}}>{open?'▲':'▼'}</span>
 </button>
 {open&&<div id={menuId} style={{padding:'8px 10px',background:theme.bgTableGroup}}>
 <label style={{display:'grid',gap:6,fontSize:12,color:theme.text2}}>Avaliação de dor
 <select aria-label="Método de avaliação de dor" value={a.method||''} style={{...style,width:'100%'}} onChange={e=>update({method:e.target.value,values:{}})}>
 <option value="">Selecionar escala</option>{['BPS','BPS-NI','CPOT','EVA','Não avaliável'].map(m=><option key={m}>{m}</option>)}
 </select></label>
 {!a.method&&legacy&&<div style={{fontSize:12,marginTop:6}}>Registro atual: {legacy}</div>}
 {a.method==='CPOT'&&<select aria-label="Via aérea para CPOT" value={a.airway||''} style={{...style,width:'100%',marginTop:8}} onChange={e=>update({...a,airway:e.target.value,values:{...a.values,vent:undefined,voice:undefined}})}><option value="">Selecionar via aérea</option><option value="intubado">Intubado — ventilação</option><option value="nao-intubado">Não intubado — vocalização</option></select>}
 {painItems(a.method,a.airway).map(item=><fieldset key={item.id} style={{border:0,padding:0,margin:'10px 0',minWidth:0}}><legend style={{fontSize:12,marginBottom:6,color:theme.text2}}>{item.label}</legend><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(135px,100%),1fr))',gap:5}}>{item.options.map(o=><button type="button" key={o.value} aria-pressed={a.values?.[item.id]===o.value} style={optionStyle(a.values?.[item.id]===o.value)} onClick={()=>update({...a,values:{...a.values,[item.id]:o.value}})}><strong>{o.value}</strong> · {o.label}</button>)}</div></fieldset>)}
 {a.method==='EVA'&&<label style={{display:'grid',gap:6,marginTop:10,fontSize:12,color:theme.text2}}>EVA — intensidade da dor (0 a 10)
 <input type="number" inputMode="decimal" min="0" max="10" step="0.1" aria-label="Valor da EVA" placeholder="0 a 10" value={typeof a.eva==='number'?a.eva/10:''} onChange={e=>{const n=e.target.valueAsNumber;update({...a,eva:Number.isFinite(n)&&n>=0&&n<=10?Math.round(n*10):null});}} style={{...style,width:'100%',boxSizing:'border-box'}}/>
 </label>}
 {a.method&&a.method!=='Não avaliável'&&<div role="status" style={{fontSize:12,fontWeight:600,marginTop:10,color:theme.text2}}>{total===null?'Avaliação incompleta':`${a.method}: ${String(total).replace('.',',')}/${a.method==='CPOT'?8:a.method==='EVA'?10:12}`}</div>}
 </div>}
 </section>;
}

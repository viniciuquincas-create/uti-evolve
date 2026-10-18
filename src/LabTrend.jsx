import React, {useState,useRef,useEffect} from 'react';
import {createPortal} from 'react-dom';
export function labPoints(dates,getValue,key){
 return dates.slice().sort().flatMap(date=>{const raw=String(getValue(date,key)??'').trim();if(!/^-?\d+(?:[.,]\d+)?$/.test(raw))return [];const value=Number(raw.replace(',','.'));const time=new Date(date.length===10?date+'T12:00:00':date).getTime();return Number.isFinite(value)&&Number.isFinite(time)?[{date,value,time}]:[];});
}
export default function LabTrend({group,params,dates,getValue,theme:T}){
 const [pos,setPos]=useState(null),[hidden,setHidden]=useState([]),[activeDate,setActiveDate]=useState(null);
 const trigger=useRef(null),panel=useRef(null),timer=useRef(null);
 const cancel=()=>clearTimeout(timer.current);
 const close=()=>{cancel();setPos(null);};
 const open=()=>{cancel();const rect=trigger.current.getBoundingClientRect();setPos({left:Math.max(8,Math.min(rect.left,window.innerWidth-Math.min(520,window.innerWidth-16)-8)),top:Math.max(8,Math.min(rect.bottom+4,window.innerHeight-360))});};
 const leave=()=>{cancel();timer.current=setTimeout(close,180);};
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{if(!pos)return;const outside=e=>{if(!trigger.current?.contains(e.target)&&!panel.current?.contains(e.target))close();};const key=e=>{if(e.key==='Escape'){trigger.current?.focus();close();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);window.addEventListener('resize',close);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);window.removeEventListener('resize',close);};},[!!pos]);
 const colors=['#0284c7','#e11d48','#059669','#9333ea','#d97706','#0891b2','#db2777','#4f46e5','#65a30d','#a16207'];
 const available=params.map((p,i)=>({...p,color:colors[i%colors.length],points:labPoints(dates,getValue,p.key)})).filter(p=>p.points.length);
 const visible=available.filter(p=>!hidden.includes(p.key));
 const all=available.flatMap(p=>p.points),start=Math.min(...all.map(p=>p.time)),end=Math.max(...all.map(p=>p.time));
 const percent=(p,series)=>series.points[0].value===0?null:100*(p.value-series.points[0].value)/Math.abs(series.points[0].value);
 const values=visible.flatMap(series=>series.points.map(p=>percent(p,series))).filter(v=>v!==null);
 const lo=Math.min(0,...values),hi=Math.max(0,...values),span=hi-lo||1;
 const x=p=>start===end?260:55+(p.time-start)/(end-start)*420;
 const y=v=>160-(v-lo)/span*125;
 const shownDate=activeDate||all.slice().sort((a,b)=>a.time-b.time).at(-1)?.date;
 const dateLabel=d=>d.slice(0,10).split('-').reverse().join('/')+(d.length>10?' '+d.slice(11,16):'');
 return <><button ref={trigger} type="button" aria-expanded={!!pos} aria-label={`Evolução dos exames — ${group}`} onMouseEnter={open} onMouseLeave={leave} onFocus={open} onClick={open} style={{border:0,background:'transparent',color:'inherit',font:'inherit',letterSpacing:'inherit',cursor:'pointer',padding:0}}>{group} <span aria-hidden="true" style={{opacity:.55}}>⌁</span></button>{pos&&createPortal(<div ref={panel} role="dialog" aria-label={`Gráfico evolutivo — ${group}`} onMouseEnter={cancel} onMouseLeave={leave} style={{position:'fixed',...pos,width:'min(520px, calc(100vw - 16px))',maxHeight:'calc(100vh - 16px)',overflow:'auto',boxSizing:'border-box',zIndex:10000,padding:14,border:`1px solid ${T.borderStrong}`,borderRadius:12,background:T.bgCard,color:T.text1,boxShadow:'0 8px 32px #0003'}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:10}}><strong>{group} · evolução</strong><button aria-label="Fechar gráfico" onClick={close} style={{background:'transparent',border:0,color:T.text2,cursor:'pointer'}}>✕</button></div>
 <p style={{fontSize:11,color:T.text3,margin:'0 0 10px'}}>Variação (%) desde o primeiro resultado de cada exame. Valores originais abaixo. Toque na legenda para ocultar ou mostrar.</p>
 <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{available.map(p=><button key={p.key} aria-pressed={!hidden.includes(p.key)} onClick={()=>setHidden(h=>h.includes(p.key)?h.filter(k=>k!==p.key):[...h,p.key])} style={{padding:'4px 7px',border:`1px solid ${p.color}`,borderRadius:12,color:T.text1,background:'transparent',opacity:hidden.includes(p.key)?.4:1,cursor:'pointer',fontSize:11}}><span style={{color:p.color}}>●</span> {p.label}</button>)}</div>
 {all.length?<><svg viewBox="0 0 500 195" role="img" aria-label="Evolução conjunta dos exames em variação percentual" style={{width:'100%',display:'block'}}>
 {[lo,(hi+lo)/2,hi].map((v,i)=><g key={i}><line x1="55" y1={y(v)} x2="475" y2={y(v)} stroke={T.borderStrong} strokeDasharray="3 4"/><text x="2" y={y(v)+4} fill={T.text3} fontSize="10">{v.toFixed(0)}%</text></g>)}
 {visible.filter(series=>series.points[0].value!==0).map(series=><g key={series.key}>
 <polyline points={series.points.map(p=>`${x(p)},${y(percent(p,series))}`).join(' ')} fill="none" stroke={series.color} strokeWidth="2"/>
 {series.points.map(p=><circle key={p.date} cx={x(p)} cy={y(percent(p,series))} r={shownDate===p.date?5:3.5} fill={series.color} tabIndex="0" aria-label={`${series.label}: ${p.value} ${series.unit}, ${dateLabel(p.date)}`} onFocus={()=>setActiveDate(p.date)} onMouseEnter={()=>setActiveDate(p.date)} onClick={()=>setActiveDate(p.date)}><title>{series.label}: {p.value} {series.unit} — {dateLabel(p.date)}</title></circle>)}</g>)}
 <text x="55" y="187" fill={T.text3} fontSize="10">{dateLabel(all.slice().sort((a,b)=>a.time-b.time)[0].date)}</text><text x="475" y="187" textAnchor="end" fill={T.text3} fontSize="10">{start!==end?dateLabel(all.slice().sort((a,b)=>a.time-b.time).at(-1).date):''}</text></svg>
 {visible.some(p=>p.points[0].value===0)&&<p style={{fontSize:11}}>Exames com primeiro valor zero aparecem nos valores abaixo, sem linha percentual.</p>}
 {!visible.length&&<p style={{fontSize:12}}>Selecione um exame na legenda.</p>}
 <label style={{fontSize:12}}>Valores em <select aria-label="Data dos resultados" value={shownDate||''} onChange={e=>setActiveDate(e.target.value)} style={{background:T.bgInput,color:T.text1,border:`1px solid ${T.borderStrong}`,borderRadius:5,padding:4}}>{[...new Set(all.map(p=>p.date))].sort().map(date=><option key={date} value={date}>{dateLabel(date)}</option>)}</select></label>
 <div style={{fontSize:12,maxHeight:120,overflowY:'auto',marginTop:8}}>{visible.map(series=>{const point=series.points.find(p=>p.date===shownDate);return <div key={series.key} style={{display:'flex',justifyContent:'space-between',gap:12,padding:'3px 0'}}><span><span style={{color:series.color}}>●</span> {series.label}</span><b>{point?`${point.value.toLocaleString('pt-BR')} ${series.unit}`:'Sem coleta'}</b></div>;})}</div></>:<p style={{fontSize:12}}>Sem resultados numéricos nesta categoria.</p>}

 </div>,document.body)}</>;
}

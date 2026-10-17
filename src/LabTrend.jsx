import React, {useState,useRef,useEffect} from 'react';
import {createPortal} from 'react-dom';
export function labPoints(dates,getValue,key){
 return dates.slice().sort().flatMap(date=>{const raw=String(getValue(date,key)??'').trim();if(!/^-?\d+(?:[.,]\d+)?$/.test(raw))return [];const value=Number(raw.replace(',','.'));const time=new Date(date.length===10?date+'T12:00:00':date).getTime();return Number.isFinite(value)&&Number.isFinite(time)?[{date,value,time}]:[];});
}
export default function LabTrend({group,params,dates,getValue,theme:T}){
 const [pos,setPos]=useState(null),[selected,setSelected]=useState('');
 const trigger=useRef(null),panel=useRef(null),timer=useRef(null);
 const cancel=()=>clearTimeout(timer.current);
 const close=()=>{cancel();setPos(null);};
 const open=()=>{cancel();const rect=trigger.current.getBoundingClientRect();setPos({left:Math.max(8,Math.min(rect.left,window.innerWidth-Math.min(520,window.innerWidth-16)-8)),top:Math.max(8,Math.min(rect.bottom+4,window.innerHeight-360))});};
 const leave=()=>{cancel();timer.current=setTimeout(close,180);};
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{if(!pos)return;const outside=e=>{if(!trigger.current?.contains(e.target)&&!panel.current?.contains(e.target))close();};const key=e=>{if(e.key==='Escape'){trigger.current?.focus();close();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);window.addEventListener('resize',close);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);window.removeEventListener('resize',close);};},[!!pos]);
 const available=params.map(p=>({...p,points:labPoints(dates,getValue,p.key)}));
 const param=available.find(p=>p.key===selected)||available.find(p=>p.points.length)||available[0];
 const points=param?.points||[],lo=Math.min(...points.map(p=>p.value)),hi=Math.max(...points.map(p=>p.value));
 const x=p=>points.length<2||points.at(-1).time===points[0].time?250:50+(p.time-points[0].time)/(points.at(-1).time-points[0].time)*410;
 const y=p=>hi===lo?95:155-(p.value-lo)/(hi-lo)*120;
 const dateLabel=d=>d.slice(0,10).split('-').reverse().join('/')+(d.length>10?' '+d.slice(11,16):'');
 return <><button ref={trigger} type="button" aria-expanded={!!pos} aria-label={`Evolução dos exames — ${group}`} onMouseEnter={open} onMouseLeave={leave} onFocus={open} onClick={open} style={{border:0,background:'transparent',color:'inherit',font:'inherit',letterSpacing:'inherit',cursor:'pointer',padding:0}}>{group} <span aria-hidden="true" style={{opacity:.55}}>⌁</span></button>{pos&&createPortal(<div ref={panel} role="dialog" aria-label={`Gráfico evolutivo — ${group}`} onMouseEnter={cancel} onMouseLeave={leave} style={{position:'fixed',...pos,width:'min(520px, calc(100vw - 16px))',maxHeight:'calc(100vh - 16px)',overflow:'auto',boxSizing:'border-box',zIndex:10000,padding:14,border:`1px solid ${T.borderStrong}`,borderRadius:12,background:T.bgCard,color:T.text1,boxShadow:'0 8px 32px #0003'}}>
 <div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:10}}><strong>{group} · evolução</strong><button aria-label="Fechar gráfico" onClick={close} style={{background:'transparent',border:0,color:T.text2,cursor:'pointer'}}>✕</button></div>
 <select aria-label="Exame do gráfico" value={param?.key||''} onChange={e=>setSelected(e.target.value)} style={{width:'100%',padding:7,borderRadius:6,background:T.bgInput,color:T.text1,border:`1px solid ${T.borderStrong}`}}>{available.map(p=><option key={p.key} value={p.key}>{p.label}{p.unit?` (${p.unit})`:''}{p.points.length?'':' — sem dados'}</option>)}</select>
 {points.length?<><svg viewBox="0 0 500 190" role="img" aria-label={`${param.label}, ${points.length} resultados em ${param.unit||'valor absoluto'}`} style={{width:'100%',display:'block'}}>
 <line x1="50" y1="155" x2="460" y2="155" stroke={T.borderStrong}/><text x="5" y="38" fill={T.text3} fontSize="11">{hi}</text><text x="5" y="155" fill={T.text3} fontSize="11">{lo}</text>
 <polyline points={points.map(p=>`${x(p)},${y(p)}`).join(' ')} fill="none" stroke={T.accent} strokeWidth="2"/>
 {points.map(p=><circle key={p.date} cx={x(p)} cy={y(p)} r="4" fill={T.accent}><title>{dateLabel(p.date)}: {p.value} {param.unit}</title></circle>)}
 <text x="50" y="180" fill={T.text3} fontSize="10">{dateLabel(points[0].date)}</text><text x="460" y="180" textAnchor="end" fill={T.text3} fontSize="10">{points.length>1?dateLabel(points.at(-1).date):''}</text></svg>
 <div style={{fontSize:12,maxHeight:75,overflowY:'auto'}}>{points.map(p=><div key={p.date} style={{display:'flex',justifyContent:'space-between',gap:12}}><span>{dateLabel(p.date)}</span><b>{p.value.toLocaleString('pt-BR')} {param.unit}</b></div>)}</div></>:<p style={{fontSize:12}}>Sem resultados numéricos para este exame.</p>}
 </div>,document.body)}</>;
}

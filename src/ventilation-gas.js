import {hojeLocal} from './fasting.js';
export function gasosDoDia(table={},day=hojeLocal()){
 return Object.entries(table).filter(([key])=>key.slice(0,10)===day).flatMap(([key,row])=>{
  let gases=row?._gasos||[];try{if(typeof gases==='string')gases=JSON.parse(gases);}catch{gases=[];}
  return (Array.isArray(gases)?gases:[]).filter(g=>g&&String(g.data||key).slice(0,10)===day).map(g=>({...g,data:day}));
 }).sort((a,b)=>String(a.horario||'').localeCompare(String(b.horario||'')));
}
export function ventilacaoGasometria(patient={},table={},day=hojeLocal()){
 if(patient.vm_semGasoData===day)return {pao2:'',paco2:'',gas:null};
 const gas=gasosDoDia(table,day).filter(g=>g.po2!==undefined&&g.po2!==null&&String(g.po2).trim()!=='').at(-1)||null;
 const manual=patient.vm_pfData===day;
 return {pao2:manual?(patient.vm_pf??''):(gas?.po2??''),paco2:patient.vm_paco2Data===day?(patient.vm_paco2??''):(manual?'':gas?.pco2??''),gas:manual?null:gas};
}

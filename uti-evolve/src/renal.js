// Chen, JASN 2013, doi:10.1681/ASN.2012070653; CG-based kinetic clearance.
// Kwong et al., PLoS ONE 2019, doi:10.1371/journal.pone.0225601.
export const renalNumber=v=>{if(v==null||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null;};
const adult=(age,sex)=>age>=18&&age<140&&['M','F'].includes(sex);
export function cgRaw(cr,age,weight,sex){[cr,age,weight]=[cr,age,weight].map(renalNumber);return cr>0&&weight>0&&adult(age,sex)?(140-age)*weight/(72*cr)*(sex==='F'?.85:1):null;}
export function epiRaw(cr,age,sex){[cr,age]=[cr,age].map(renalNumber);if(!(cr>0)||!adult(age,sex))return null;const female=sex==='F',r=cr/(female?.7:.9);return 142*Math.min(r,1)**(female?-.241:-.302)*Math.max(r,1)**-1.2*.9938**age*(female?1.012:1);}
const rounded=n=>n===null?null:Math.round(n);
export const calcCKDEPI=(cr,age,sex)=>rounded(epiRaw(cr,age,sex));
export const calcCockcroftGault=(cr,age,weight,sex)=>rounded(cgRaw(cr,age,weight,sex));
export function kineticRaw(c1,c2,weight,sex,age,hours){
 [c1,c2,weight,age,hours]=[c1,c2,weight,age,hours].map(renalNumber);
 if(!(c1>0&&c2>0&&weight>0&&hours>0)||!adult(age,sex))return null;
 // In the CG-based variant, baselineCr * CG(baselineCr) cancels baselineCr.
 // generationTerm is that product, not an assumed baseline creatinine.
 const generationTerm=(140-age)*weight/72*(sex==='F'?.85:1);
 const mean=(c1+c2)/2;
 const result=generationTerm/mean-(.6*weight*1000)*(c2-c1)/(hours*60*mean);
 return Number.isFinite(result)&&result>=0?result:null;
}
export const calcKeGFR=(...args)=>rounded(kineticRaw(...args));
export const RENAL_EQUATIONS={cg:'Cockcroft–Gault',ckdepi:'CKD-EPI 2021 absoluto',kegfr:'Cinética de Chen (base CG)'};
export function renalEstimate(patient,table={},config={},area='padrao',until='9999-12-31'){
 const pref=config.equacaoRenal||{};const equation=pref[area]||pref.padrao||'cg';
 const label=RENAL_EQUATIONS[equation]||'Equação desconhecida';
 const rows=Object.entries(table).filter(([d,r])=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&d<=until&&renalNumber(r?.cr)>0).sort(([a],[b])=>a.localeCompare(b));
 const last=rows.at(-1),previous=rows.at(-2);
 let value=null,reason='',hours=null,approximate=false;
 if(patient.emTRS||patient.trsAtiva||patient.dialiseAtiva||patient.terapiaRenalSubstitutiva)reason='Em terapia renal substitutiva: revisar dose pelo método dialítico.';
 else if(!last)reason='Falta creatinina válida.';
 else if(equation==='cg'){value=cgRaw(last[1].cr,patient.renalAge,patient.peso,patient.sexo);}
 else if(equation==='ckdepi'){
 const indexed=epiRaw(last[1].cr,patient.renalAge,patient.sexo),w=renalNumber(patient.peso),h=renalNumber(patient.altura);
 if(indexed!==null&&w>0&&h>0)value=indexed*Math.sqrt(w*h/3600)/1.73;
 else reason='CKD-EPI absoluto requer idade, sexo, peso e altura.';
 }else if(equation==='kegfr'){
 if(!previous)reason='Cinética requer duas creatininas em datas distintas.';
 else if(!adult(renalNumber(patient.renalAge),patient.sexo)||!(renalNumber(patient.peso)>0))reason='Informe idade adulta, sexo e peso no cadastro.';
 else{
 const validTime=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t||'');
 approximate=!(validTime(last[1].crHora)&&validTime(previous[1].crHora));
 const stamp=row=>Date.parse(`${row[0]}T${approximate?'00:00':row[1].crHora}:00Z`);
 hours=(stamp(last)-stamp(previous))/3600000;
 value=kineticRaw(previous[1].cr,last[1].cr,patient.peso,patient.sexo,patient.renalAge,hours);
 if(value===null)reason='Cinética indisponível: confira dados, intervalo e pressupostos (resultado negativo não é exibido como zero).';
 }
 }
 if(value===null&&!reason)reason='Dados insuficientes: confira idade adulta, sexo, peso e creatinina.';
 return {value,label,equation,reason,hours,approximate,date:last?.[0],previousDate:previous?.[0],unit:'mL/min'};
}

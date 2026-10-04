// BPS: Payen et al.; BPS-NI: Chanques et al. (2009); CPOT: Gélinas et al.
// EVA digital: posição relativa na linha, expressa em 0–10.
const item=(id,label,labels,min)=>({id,label,options:labels.map((label,i)=>({label,value:i+min}))});
export function painItems(method,airway){
 if(method==='BPS'||method==='BPS-NI')return [
 item('face','Expressão facial',['Relaxada','Parcialmente contraída','Totalmente contraída','Careta'],1),
 item('limbs','Membros superiores',['Sem movimento','Parcialmente flexionados','Totalmente flexionados, com flexão dos dedos','Permanentemente retraídos'],1),
 method==='BPS'?item('vent','Adaptação à ventilação',['Tolera a ventilação','Tosse, mas tolera a maior parte do tempo','Luta contra o ventilador','Impossível controlar a ventilação'],1):item('voice','Vocalização',['Sem vocalização de dor','Gemidos pouco frequentes e breves','Gemidos frequentes ou prolongados','Gritos ou queixa verbal de dor'],1)];
 if(method==='CPOT')return [
 item('face','Expressão facial',['Relaxada / neutra','Tensa','Careta'],0),
 item('body','Movimentos corporais',['Ausentes ou normais','Proteção','Inquietação / agitação'],0),
 item('muscle','Tensão muscular',['Relaxada','Tensa / rígida','Muito tensa / rígida'],0),
 ...(airway==='intubado'?[item('vent','Adaptação à ventilação',['Tolera o ventilador','Tosse, mas tolera','Luta contra o ventilador'],0)]:airway==='nao-intubado'?[item('voice','Vocalização',['Tom normal ou sem som','Suspiros / gemidos','Choro / soluços'],0)]:[])];
 return [];
}
export function painTotal(a){
 if(!a)return null;
 if(a.method==='EVA')return typeof a.eva==='number'&&Number.isFinite(a.eva)&&a.eva>=0&&a.eva<=100?a.eva/10:null;
 if(a.method==='CPOT'&&!['intubado','nao-intubado'].includes(a.airway))return null;
 const items=painItems(a.method,a.airway);
 if(!items.length||items.some(i=>!i.options.some(o=>o.value===a.values?.[i.id])))return null;
 return items.reduce((n,i)=>n+a.values[i.id],0);
}
export function painSummary(a){
 if(a?.method==='Não avaliável')return 'Dor: não avaliável';
 const total=painTotal(a);
 if(total===null)return '';
 if(a.method==='EVA')return `EVA ${String(total).replace('.',',')}/10`;
 return `${a.method} ${total}/${a.method==='CPOT'?8:12}`;
}
// Also shorten assessments saved before structured score copying was introduced.
export function painCopy(assessment,legacy=''){
 if(assessment)return painSummary(assessment);
 return String(legacy||'').replace(/^(BPS(?:-NI)?|CPOT|EVA)(\s+\d+(?:[.,]\d+)?\/\d+)\s*\([^)]*\)\s*$/i,'$1$2');
}

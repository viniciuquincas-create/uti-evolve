const number=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)&&n>=0?n:null;};
export function enteralSummary({dieta={},formula,peso,meta={},glicoseKcal=0,volumeRecebido}={}){
 if(dieta.tipo!=='enteral'||!formula)return [];
 const rate=number(dieta.vazao),weight=number(peso),module=dieta.moduloProteina?.ativo?(number(dieta.moduloProteina.gramas)||0):0;
 const kcalML=number(formula.kcalML),ptnML=number(formula.ptnML);
 if(kcalML===null||ptnML===null)return [];
 const fmt=(n,d=1)=>n.toLocaleString('pt-BR',{maximumFractionDigits:d});
 const nutrients=(volume,extras)=>{
 const kcal=volume*kcalML+(extras?glicoseKcal:0),ptn=volume*ptnML+(extras?module:0);
 return `${fmt(kcal)} kcal/dia${weight>0?` (${fmt(kcal/weight)} kcal/kg/dia)`:''}${meta?.kcal>0?`; ${fmt(kcal/meta.kcal*100)}% da meta calórica`:''} / ${fmt(ptn)} g proteína/dia${weight>0?` (${fmt(ptn/weight,2)} g/kg/dia)`:''}${meta?.ptn>0?`; ${fmt(ptn/meta.ptn*100)}% da meta proteica`:''}`;
 };
 const lines=[];
 if(rate!==null)lines.push(`- Nutrição enteral projetada (20h): ${fmt(rate)} mL/h; ${fmt(rate*20)} mL/dia; ${nutrients(rate*20,true)}${module||glicoseKcal?' (inclui adicionais prescritos)':''}`);
 const actual=number(volumeRecebido);
 if(actual!==null)lines.push(`- Nutrição recebida (Controles 24h; estimativa pela fórmula atual): ${fmt(actual)} mL; ${nutrients(actual,false)}${module||glicoseKcal?' (módulo proteico e glicose não incluídos sem confirmação do recebido)':''}`);
 return lines;
}

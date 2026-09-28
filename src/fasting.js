export function hojeLocal(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function dia(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
  const ms=Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value?ms:null;
}
export function avaliarJejum(dieta={},hoje=hojeLocal()){
  const ativo=dieta.tipo==='jejum',inicio=dieta.jejumInicio||'';
  const fim=ativo?hoje:(dieta.jejumFim||dieta.dataInicio||'');
  const a=dia(inicio),b=dia(fim),agora=dia(hoje);
  const valido=a!==null&&b!==null&&agora!==null&&a<=b&&b<=agora;
  const dias=valido?Math.floor((b-a)/86400000):null;
  return {ativo,inicio,fim,dias,resumo:dias===null?'Jejum — início não informado ou data inválida':`Jejum desde ${inicio.split('-').reverse().join('/')} · ${dias} dia${dias===1?'':'s'} decorridos`};
}
export function mudarTipoDieta(dieta,tipo,hoje=hojeLocal()){
  if(tipo===dieta.tipo)return dieta;
  if(tipo==='jejum')return {...dieta,tipo,jejumInicio:'',jejumFim:''};
  if(dieta.tipo==='jejum')return {...dieta,tipo,jejumFim:hoje};
  return {...dieta,tipo};
}
export function diasIngestaReduzida(dieta={},hoje=hojeLocal()){
  const jejum=avaliarJejum(dieta,hoje);
  const raw=dieta.refeeding?.diasSemIngesta;
  const manual=raw!==''&&raw!=null?Number(String(raw).replace(',','.')):NaN;
  const valores=[jejum.dias,Number.isFinite(manual)&&manual>=0?manual:null].filter(v=>v!==null);
  return valores.length?Math.max(...valores):null;
}

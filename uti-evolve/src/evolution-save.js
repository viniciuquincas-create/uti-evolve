const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keyed=a=>Array.isArray(a)&&a.every(v=>object(v)&&v.id!==undefined)&&new Set(a.map(v=>String(v.id))).size===a.length;
const conflict=()=>{throw new Error('Conflito de edição: o mesmo campo foi alterado em outra sessão. Sua edição permanece nesta tela; copie-a antes de recarregar para conferir as versões.');};
// Three-way merge: only fields changed locally may replace the server version.
export function mergeEvolution(base,local,remote,path=[]){
 if(equal(local,base))return remote;
 if(equal(remote,base)||equal(local,remote))return local;
 if(path.includes('_datas')&&typeof local==='string'&&typeof remote==='string')return local>remote?local:remote;
 if(object(local)&&object(remote)&&(base===undefined||object(base))){
  const out={};for(const k of new Set([...Object.keys(base||{}),...Object.keys(local),...Object.keys(remote)])){
   const value=mergeEvolution(base?.[k],local[k],remote[k],[...path,k]);if(value!==undefined)out[k]=value;
  }return out;
 }
 if(keyed(local)&&keyed(remote)&&(base===undefined||keyed(base))){
  const b=Object.fromEntries((base||[]).map(v=>[v.id,v])),l=Object.fromEntries(local.map(v=>[v.id,v])),r=Object.fromEntries(remote.map(v=>[v.id,v]));
  const order=[...local.map(v=>String(v.id)),...remote.map(v=>String(v.id)).filter(id=>!Object.hasOwn(l,id))];
  const merged=mergeEvolution(b,l,r,path);return order.filter(id=>Object.hasOwn(merged,id)).map(id=>merged[id]);
 }
 return conflict();
}
export function createEvolutionWriter(db){
 let baseline,loaded=false;
 return {
  seed(value){baseline=value||{};loaded=true;},
  async write(serialized){
   if(!loaded)throw new Error('A evolução ainda não terminou de carregar.');
   const local=JSON.parse(serialized);
   for(let attempt=0;attempt<4;attempt++){
    const {data,error}=await db.from('config').select('value,updated_at').eq('key','evolucao_data').maybeSingle();
    if(error)throw error;
    const remote=data?.value?JSON.parse(data.value):{};
    const merged=mergeEvolution(baseline,local,remote);
    if(equal(merged,remote)){baseline=local;return;}
    if(!data){
     const result=await db.from('config').insert({key:'evolucao_data',value:JSON.stringify(merged)});
     if(result.error?.code==='23505')continue;
     if(result.error)throw result.error;
     baseline=local;return;
    }
    let query=db.from('config').update({value:JSON.stringify(merged)}).eq('key','evolucao_data');
    query=data.updated_at===null?query.is('updated_at',null):query.eq('updated_at',data.updated_at);
    const result=await query.select('key');
    if(result.error)throw result.error;
    if(result.data?.length){baseline=local;return;}
   }
   throw new Error('A evolução foi atualizada por outra sessão. Tente salvar novamente.');
  }
 };
}

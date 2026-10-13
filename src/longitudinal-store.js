import {createEvolutionWriter} from './evolution-save.js';
import {isTransientSaveError} from './save-queue.js';
export async function readWithRetry(read,{sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 for(let attempt=0;;attempt++){
  try{const result=await read();if(result.error)throw Object.assign(new Error(result.error.message),{code:result.error.code,status:result.status});return result;}
  catch(error){if(attempt>=2||!isTransientSaveError(error))throw error;await sleep([400,1200][attempt]);}
 }
}
const prefixes={historico_diario:'long-v2/history/',pacientes_arquivados:'long-v2/archive/'};
export function createLongitudinalStore(db){
 const loaded=new Set(),writers=new Map(),snapshots=new Map(),legacy=new Set();
 return {
  async load(kind){
   if(loaded.has(kind))return JSON.parse(snapshots.get(kind));
   if(!prefixes[kind])throw new Error('Tipo de histórico inválido.');
   const marker=await readWithRetry(()=>db.from('config').select('value').eq('key','long-v2-ready').maybeSingle());
   if(marker.data?.value!=='1'){
    // Compatibility until the separately approved production migration is applied.
    const result=await readWithRetry(()=>db.from('config').select('value').eq('key',kind).maybeSingle());
    const value=result.data?.value?JSON.parse(result.data.value):(kind==='pacientes_arquivados'?[]:{});
    const writer=createEvolutionWriter(db,kind);writer.seed(value);writers.set(kind,writer);legacy.add(kind);
    snapshots.set(kind,JSON.stringify(value));loaded.add(kind);return value;
   }
   const rows=[];let cursor='';
   for(;;){
    const result=await readWithRetry(()=>{let q=db.from('config').select('key,value').like('key',prefixes[kind]+'%').order('key').limit(2);return cursor?q.gt('key',cursor):q;});
    if(!Array.isArray(result.data))throw new Error('Resposta incompleta ao carregar histórico.');
    rows.push(...result.data);if(result.data.length<2)break;cursor=result.data.at(-1).key;
   }
   const value=kind==='pacientes_arquivados'?[]:{};
   for(const row of rows){const parsed=JSON.parse(row.value);if(kind==='pacientes_arquivados')value.push(parsed);else value[row.key.slice(prefixes[kind].length)]=parsed;const writer=createEvolutionWriter(db,row.key);writer.seed(parsed);writers.set(row.key,writer);}
   snapshots.set(kind,JSON.stringify(value));loaded.add(kind);return value;
  },
  async write(kind,serialized){
   if(!loaded.has(kind))throw new Error('O histórico ainda não terminou de carregar. Tente novamente após o carregamento.');
   if(legacy.has(kind)){await writers.get(kind).write(serialized);snapshots.set(kind,serialized);return;}
   const value=JSON.parse(serialized),before=JSON.parse(snapshots.get(kind));
   const entries=kind==='pacientes_arquivados'?value.map(v=>[v.id,v]):Object.entries(value);
   const previous=kind==='pacientes_arquivados'?Object.fromEntries(before.map(v=>[v.id,v])):before;
   for(const [id,record] of entries){
    if(!id)throw new Error('Registro histórico sem identificação.');
    if(JSON.stringify(previous[id])===JSON.stringify(record))continue;
    const key=prefixes[kind]+id;
    if(!writers.has(key)){const writer=createEvolutionWriter(db,key);writer.seed({});writers.set(key,writer);}
    await writers.get(key).write(JSON.stringify(record));
   }
   // Absence in a client snapshot never deletes a stored historical record.
   snapshots.set(kind,serialized);
  }
 };
}

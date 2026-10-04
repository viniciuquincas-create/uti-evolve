// One ordered writer per key; transient failures retry the latest pending snapshot.
export function isTransientSaveError(error){
 const status=Number(error?.status),code=String(error?.code||'');
 if([401,403,400,409,422].includes(status)||/^23|^28|^42/.test(code))return false;
 return [408,429,500,502,503,504].includes(status)||['57014','53300','57P01','08000','08003','08006','PGRST000','PGRST001','PGRST002'].includes(code)||/failed to fetch|fetch failed|network|load failed|timeout|timed out|aborterror/i.test(String(error?.message||''));
}
export function createSaveQueue({write,onState=()=>{},delay=500,retryDelays=[400,1200],sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 const entries=new Map();let revision=0;
 const notify=()=>onState({pending:[...entries.values()].some(e=>e.value!==undefined),error:[...entries.values()].some(e=>e.error),message:[...entries.values()].find(e=>e.error)?.message||''});
 const flush=async key=>{
  const e=entries.get(key);if(!e)return;
  clearTimeout(e.timer);e.timer=null;
  if(e.running){await e.running;return e.value!==undefined?flush(key):undefined;}
  if(e.value===undefined)return;
  e.error=false;e.message='';
  // Assign running before invoking write, including writers that throw synchronously.
  e.running=Promise.resolve().then(async()=>{
   try{
    for(let attempt=0;;attempt++){
     const value=e.value,version=e.version;
     try{await write(key,value);if(e.version===version)e.value=undefined;break;}
     catch(err){if(attempt>=retryDelays.length||!isTransientSaveError(err))throw err;await sleep(retryDelays[attempt]);}
    }
   }catch(err){e.error=true;e.message=err?.message||'Não foi possível salvar no servidor.';throw err;}
   finally{e.running=null;notify();}
  });
  notify();await e.running;
  if(e.value!==undefined)return flush(key);
 };
 return {
  enqueue(key,value,{immediate=false}={}){
   let e=entries.get(key);if(!e){e={};entries.set(key,e);}
   e.value=JSON.stringify(value);e.version=++revision;e.error=false;e.message='';clearTimeout(e.timer);notify();
   if(immediate)return flush(key);
   e.timer=setTimeout(()=>flush(key).catch(()=>{}),delay);
  },
  flushAll:()=>Promise.allSettled([...entries.keys()].map(flush)),
  hasPending:key=>key?entries.get(key)?.value!==undefined:[...entries.values()].some(e=>e.value!==undefined),
  revision:()=>revision,
  snapshot:()=>Object.fromEntries([...entries].filter(([,e])=>e.value!==undefined).map(([k,e])=>[k,JSON.parse(e.value)])),
 };
}

// One ordered writer per config key; failed writes remain pending until retry.
export function createSaveQueue({write,onState=()=>{},delay=500}){
  const entries=new Map();let revision=0;
  const notify=()=>onState({pending:[...entries.values()].some(e=>e.value!==undefined),error:[...entries.values()].some(e=>e.error),message:[...entries.values()].find(e=>e.error)?.message||''});
  const flush=async key=>{
    const e=entries.get(key);if(!e)return;
    clearTimeout(e.timer);e.timer=null;
    if(e.running){await e.running;return e.value!==undefined?flush(key):undefined;}
    if(e.value===undefined)return;
    const value=e.value,version=e.version;
    e.error=false;
    e.running=(async()=>{try{await write(key,value);if(e.version===version)e.value=undefined;}catch(err){e.error=true;e.message=err?.message||'Não foi possível salvar no servidor.';throw err;}finally{e.running=null;notify();}})();
    notify();await e.running;
    if(e.value!==undefined)return flush(key);
  };
  return {
    enqueue(key,value,{immediate=false}={}){
      let e=entries.get(key);if(!e){e={};entries.set(key,e);}
      e.value=JSON.stringify(value);e.version=++revision;e.error=false;clearTimeout(e.timer);notify();
      if(immediate)return flush(key);
      e.timer=setTimeout(()=>flush(key).catch(()=>{}),delay);
    },
    flushAll:()=>Promise.allSettled([...entries.keys()].map(flush)),
    hasPending:key=>key?entries.get(key)?.value!==undefined:[...entries.values()].some(e=>e.value!==undefined),
    revision:()=>revision,
    snapshot:()=>Object.fromEntries([...entries].filter(([,e])=>e.value!==undefined).map(([k,e])=>[k,JSON.parse(e.value)])),
  };
}

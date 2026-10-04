const filled=value=>typeof value==='string'?value.trim().length>0:Array.isArray(value)?value.length>0:value!==undefined&&value!==null&&value!==false;
// New imports carry explicit visibility metadata; older SBARI imports used noon timestamps.
export function sbariVisibleFields(campos={}){
 const result={};
 for(const key of Object.keys(campos))if(!key.startsWith('_')&&filled(campos[key])&&(campos._sbariVisibleFields?.[key]||/T12:00:00/.test(campos._datas?.[key]||'')))result[key]=true;
 return result;
}
export function revealSbariFields(merged,incoming){
 const flags={...(merged._sbariVisibleFields||{})},vis={...(merged._vis_||{})};
 for(const [key,value] of Object.entries(incoming||{}))if(!key.startsWith('_')&&filled(value)&&filled(merged[key])){
  flags[key]=true;vis[key]=true;
  if(/_(interconsulta|exames)$/.test(key))vis[`add_${key}`]=true;
 }
 return {...merged,_sbariVisibleFields:flags,_vis_:vis};
}

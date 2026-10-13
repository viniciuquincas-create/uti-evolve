import test from 'node:test';
import assert from 'node:assert/strict';
import {createLongitudinalStore,readWithRetry} from '../src/longitudinal-store.js';
function database(){
 const rows=new Map([['long-v2-ready',{value:'1'}],...Array.from({length:5},(_,i)=>['long-v2/history/a'+i,{value:JSON.stringify({admissionId:'a'+i,days:{old:{text:'preservado'}}}),updated_at:1}])]);
 const reads=[],writes=[];let fail=false;
 const db={rows,reads,writes,set fail(v){fail=v},from(){let key,pattern,cursor='',revision;const q={select(){return q},eq(k,v){if(k==='key')key=v;else revision=v;return q},is(k,v){revision=v;return q},like(k,v){pattern=v.slice(0,-1);return q},order(){return q},limit(){return q},gt(k,v){cursor=v;return q},async maybeSingle(){return {data:rows.get(key)||null}},then(resolve,reject){reads.push(pattern);return Promise.resolve(fail?{error:{message:'unavailable'},status:503}:{data:[...rows].filter(([k])=>k.startsWith(pattern)&&k>cursor).sort(([a],[b])=>a.localeCompare(b)).slice(0,2).map(([key,r])=>({key,...r}))}).then(resolve,reject)},update(row){const update={eq(k,v){if(k==='key')key=v;else revision=v;return update},is(k,v){revision=v;return update},async select(){if(rows.get(key)?.updated_at!==revision)return {data:[]};rows.set(key,{...row,updated_at:revision+1});writes.push(key);return {data:[{key}]}}};return update},async insert(row){if(rows.has(row.key))return {error:{code:'23505'}};rows.set(row.key,{value:row.value,updated_at:1});writes.push(row.key);return {error:null}}};return q}};
 return db;
}
test('paginated load and differential save preserve unrelated admissions and remote fields',async()=>{
 const db=database(),store=createLongitudinalStore(db),value=await store.load('historico_diario');assert.equal(Object.keys(value).length,5);assert.equal(db.reads.length,3);
 const remote=JSON.parse(db.rows.get('long-v2/history/a0').value);remote.days.remote={text:'outro computador'};db.rows.set('long-v2/history/a0',{value:JSON.stringify(remote),updated_at:2});
 value.a0.days.today={text:'novo'};await store.write('historico_diario',JSON.stringify(value));assert.deepEqual(db.writes,['long-v2/history/a0']);const saved=JSON.parse(db.rows.get('long-v2/history/a0').value);assert.equal(saved.days.old.text,'preservado');assert.equal(saved.days.remote.text,'outro computador');assert.equal(saved.days.today.text,'novo');
 await store.write('historico_diario',JSON.stringify(value));assert.equal(db.writes.length,1);
});
test('unloaded collection cannot be overwritten',async()=>{const db=database(),store=createLongitudinalStore(db);await assert.rejects(store.write('historico_diario','{}'),/carregar/);assert.equal(db.writes.length,0)});
test('no deletion when client omits historical record',async()=>{const db=database(),store=createLongitudinalStore(db);await store.load('historico_diario');await store.write('historico_diario','{}');assert.equal(db.writes.length,0);assert(db.rows.has('long-v2/history/a0'))});
test('transient reads retry while permission failures remain explicit',async()=>{let calls=0;await readWithRetry(async()=>++calls<3?{error:{message:'timeout'},status:503}:{data:1},{sleep:async()=>{}});assert.equal(calls,3);calls=0;await assert.rejects(readWithRetry(async()=>{calls++;return {error:{message:'forbidden'},status:403}},{sleep:async()=>{}}),/forbidden/);assert.equal(calls,1)});

test('compatibility with legacy storage preserves data before migration',async()=>{const db=database();db.rows.delete('long-v2-ready');db.rows.set('historico_diario',{value:JSON.stringify({a1:{days:{old:{text:'existing'}}}}),updated_at:1});const store=createLongitudinalStore(db);const value=await store.load('historico_diario');value.a1.days.today={text:'new'};await store.write('historico_diario',JSON.stringify(value));assert.deepEqual(db.writes,['historico_diario']);assert.equal(JSON.parse(db.rows.get('historico_diario').value).a1.days.old.text,'existing');});

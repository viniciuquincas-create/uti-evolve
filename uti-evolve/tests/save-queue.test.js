import test from 'node:test';
import assert from 'node:assert/strict';
import {createSaveQueue} from '../src/save-queue.js';
test('failure is visible and keeps latest data for explicit retry',async()=>{
 let fail=true,last,state;const q=createSaveQueue({delay:10000,onState:s=>state=s,write:async(k,v)=>{if(fail)throw Error('offline');last=JSON.parse(v);}});
 await assert.rejects(q.enqueue('evolucao_data',{hda:'rascunho'},{immediate:true}));
 assert.equal(state.error,true);assert.equal(q.hasPending(),true);
 fail=false;await q.flushAll();assert.deepEqual(last,{hda:'rascunho'});assert.equal(state.pending,false);assert.equal(state.error,false);
});
test('in-flight writes cannot overwrite a newer edit',async()=>{
 const written=[];let release;const q=createSaveQueue({delay:10000,write:async(k,v)=>{written.push(JSON.parse(v));if(written.length===1)await new Promise(r=>release=r);}});
 const first=q.enqueue('leitos_data',{value:1},{immediate:true});
 await Promise.resolve();q.enqueue('leitos_data',{value:2});release();await first;
 assert.deepEqual(written,[{value:1},{value:2}]);assert.equal(q.hasPending(),false);
});
test('one failed data group does not mark all data saved',async()=>{
 const q=createSaveQueue({delay:10000,write:async k=>{if(k==='tabela_data')throw Error('500');}});
 q.enqueue('leitos_data',{});q.enqueue('tabela_data',{hb:'10'});await q.flushAll();
 assert.equal(q.hasPending('leitos_data'),false);assert.equal(q.hasPending('tabela_data'),true);
});

test('first transient failure retries without displaying a false saved state or error',async()=>{
 let calls=0,saved;const states=[];
 const q=createSaveQueue({sleep:async()=>{},onState:s=>states.push(s),write:async(k,v)=>{if(++calls===1)throw Object.assign(Error('Service unavailable'),{status:503});saved=JSON.parse(v);}});
 await q.enqueue('evolucao_data',{exam:'preservado'},{immediate:true});assert.equal(calls,2);assert.deepEqual(saved,{exam:'preservado'});assert.ok(states.every(s=>!s.error));assert.equal(states.at(-1).pending,false);
});
test('retry sends the newest edit and remains a single writer',async()=>{
 let wake,attempts=0,active=0;const written=[];
 const q=createSaveQueue({delay:10000,sleep:()=>new Promise(r=>wake=r),write:async(k,v)=>{active++;assert.equal(active,1);written.push(JSON.parse(v));active--;if(++attempts===1)throw new TypeError('Failed to fetch');}});
 const run=q.enqueue('evolucao_data',{exam:'primeiro'},{immediate:true});while(!wake)await Promise.resolve();q.enqueue('evolucao_data',{exam:'mais recente'});wake();await run;await q.flushAll();assert.deepEqual(written,[{exam:'primeiro'},{exam:'mais recente'}]);
});
test('retries stop after three attempts, preserve data and allow manual retry',async()=>{
 let calls=0,fail=true;const q=createSaveQueue({sleep:async()=>{},write:async()=>{calls++;if(fail)throw Object.assign(Error('Unavailable'),{status:503});}});
 await assert.rejects(q.enqueue('evolucao_data',{exam:'guardado'},{immediate:true}));assert.equal(calls,3);assert.deepEqual(q.snapshot(),{evolucao_data:{exam:'guardado'}});fail=false;await q.flushAll();assert.equal(q.hasPending(),false);
});
test('conflicts and permission failures are never retried automatically',async()=>{
 for(const err of [Error('Conflito de edição'),Object.assign(Error('Forbidden'),{status:403})]){
 let calls=0;const q=createSaveQueue({sleep:async()=>{},write:()=>{calls++;throw err;}});await assert.rejects(q.enqueue('evolucao_data',{}, {immediate:true}));assert.equal(calls,1);assert.equal(q.hasPending(),true);
 }
});

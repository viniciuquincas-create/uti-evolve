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
 q.enqueue('leitos_data',{value:2});release();await first;
 assert.deepEqual(written,[{value:1},{value:2}]);assert.equal(q.hasPending(),false);
});
test('one failed data group does not mark all data saved',async()=>{
 const q=createSaveQueue({delay:10000,write:async k=>{if(k==='tabela_data')throw Error('500');}});
 q.enqueue('leitos_data',{});q.enqueue('tabela_data',{hb:'10'});await q.flushAll();
 assert.equal(q.hasPending('leitos_data'),false);assert.equal(q.hasPending('tabela_data'),true);
});

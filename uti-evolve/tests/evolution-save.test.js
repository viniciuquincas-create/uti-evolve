import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeEvolution,createEvolutionWriter} from '../src/evolution-save.js';
function dbFake(initial){let value=JSON.stringify(initial),version=1;return {read:()=>JSON.parse(value),get version(){return version},remote(next){value=JSON.stringify(next);version++;},from(){return {select(){return {eq(){return {maybeSingle:async()=>({data:{value,updated_at:version}})}}}},update(row){const filters={};const q={eq(k,v){filters[k]=v;return q;},select:async()=>{if(filters.updated_at!==version)return {data:[]};value=row.value;version++;return {data:[{key:'evolucao_data'}]};}};return q;}}}};}
test('outra sessão não apaga exame físico, interconsulta ou exame complementar',async()=>{
 const initial={1:{reEF:'MV presente',n_interconsulta:[{id:'i',avaliacao:'Parecer'}],res_exames:[{id:'x',resultado:'Laudo'}]}};
 const db=dbFake(initial),a=createEvolutionWriter(db),b=createEvolutionWriter(db);a.seed(initial);b.seed(initial);
 await a.write(JSON.stringify({1:{...initial[1],reEF:'Roncos bilaterais'}}));
 await b.write(JSON.stringify({1:{...initial[1],cvEF:'Ritmo regular'}}));
 assert.equal(db.read()[1].reEF,'Roncos bilaterais');assert.equal(db.read()[1].n_interconsulta[0].avaliacao,'Parecer');assert.equal(db.read()[1].res_exames[0].resultado,'Laudo');
 await b.write(JSON.stringify({1:{...initial[1],cvEF:'Ritmo irregular'}}));assert.equal(db.read()[1].reEF,'Roncos bilaterais');
});
test('edições concorrentes de eventos distintos são preservadas',()=>{
 const b={1:{n_interconsulta:[{id:'a',avaliacao:'A'},{id:'b',avaliacao:'B'}]}};
 const l=structuredClone(b),r=structuredClone(b);l[1].n_interconsulta[0].avaliacao='A2';r[1].n_interconsulta[1].avaliacao='B2';
 assert.deepEqual(mergeEvolution(b,l,r)[1].n_interconsulta.map(x=>x.avaliacao),['A2','B2']);
});
test('conflito no mesmo campo não sobrescreve o servidor',async()=>{
 const db=dbFake({1:{reEF:'A'}}),writer=createEvolutionWriter(db);writer.seed(db.read());db.remote({1:{reEF:'B'}});
 await assert.rejects(writer.write(JSON.stringify({1:{reEF:'C'}})),/Conflito/);assert.equal(db.read()[1].reEF,'B');
});
test('exclusão intencional e conflito de exclusão não ressuscitam dados',()=>{
 assert.deepEqual(mergeEvolution({1:{a:'x',b:'y'}},{1:{b:'y'}},{1:{a:'x',b:'z'}}),{1:{b:'z'}});
 assert.throws(()=>mergeEvolution({1:{a:'x'}},{},{1:{a:'novo'}}),/Conflito/);
});
test('revisão concorrente provoca nova leitura e merge',async()=>{
 const db=dbFake({1:{a:'x'}}),original=db.from.bind(db);let raced=false;
 db.from=()=>{const q=original();const update=q.update;q.update=row=>{if(!raced){raced=true;db.remote({1:{a:'x',b:'remoto'}});}return update(row);};return q;};
 const writer=createEvolutionWriter(db);writer.seed({1:{a:'x'}});await writer.write(JSON.stringify({1:{a:'local'}}));assert.deepEqual(db.read(),{1:{a:'local',b:'remoto'}});
});

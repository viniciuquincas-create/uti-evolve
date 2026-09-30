import test from 'node:test';
import assert from 'node:assert/strict';
import {painItems,painTotal,painSummary} from '../src/pain.js';
for(const method of ['BPS','BPS-NI','CPOT'])for(const airway of (method==='CPOT'?['intubado','nao-intubado']:[undefined]))test(`${method} ${airway||''}: limites, incompleto e inválido`,()=>{
 const items=painItems(method,airway);const values={};const a={method,airway,values};
 assert.equal(painTotal(a),null);
 for(const i of items)values[i.id]=i.options[0].value;
 assert.equal(painTotal(a),method==='CPOT'?0:3);
 for(const i of items)values[i.id]=i.options.at(-1).value;
 assert.equal(painTotal(a),method==='CPOT'?8:12);
 assert.match(painSummary(a),new RegExp(method));
 delete values[items[0].id];assert.equal(painTotal(a),null);assert.equal(painSummary(a),'');
 values[items[0].id]=99;assert.equal(painTotal(a),null);
});
test('CPOT exige via aérea e não soma vocalização e ventilação juntas',()=>{
 const values={face:1,body:1,muscle:1,voice:2,vent:0};
 assert.equal(painTotal({method:'CPOT',values}),null);
 assert.equal(painTotal({method:'CPOT',airway:'intubado',values}),3);
 assert.equal(painTotal({method:'CPOT',airway:'nao-intubado',values}),5);
});
test('EVA exige marcação explícita e aceita os extremos',()=>{
 for(const eva of [undefined,null,'0',NaN,-1,101])assert.equal(painTotal({method:'EVA',eva}),null);
 assert.equal(painTotal({method:'EVA',eva:0}),0);
 assert.equal(painTotal({method:'EVA',eva:100}),10);
 assert.equal(painSummary({method:'EVA',eva:37}),'EVA 3,7/10');
 assert.equal(painSummary({method:'Não avaliável'}),'Dor: não avaliável');
});

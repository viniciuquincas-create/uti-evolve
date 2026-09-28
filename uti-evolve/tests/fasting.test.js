import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {avaliarJejum,diasIngestaReduzida,mudarTipoDieta} from '../src/fasting.js';
test('dates use elapsed calendar days, with no invented or future start',()=>{
 assert.equal(avaliarJejum({tipo:'jejum',jejumInicio:'2026-09-28'},'2026-09-28').dias,0);
 assert.equal(avaliarJejum({tipo:'jejum',jejumInicio:'2026-09-17'},'2026-09-28').dias,11);
 for(const jejumInicio of ['', '2026-02-30','2026-09-29'])assert.equal(avaliarJejum({tipo:'jejum',jejumInicio},'2026-09-28').dias,null);
});
test('ending fasting freezes duration; a new episode requires a new start',()=>{
 const dieta=mudarTipoDieta({tipo:'jejum',jejumInicio:'2026-09-17'},'oral','2026-09-28');
 assert.equal(avaliarJejum(dieta,'2026-10-02').dias,11);assert.equal(avaliarJejum(dieta).ativo,false);
 assert.equal(mudarTipoDieta(dieta,'jejum','2026-10-02').jejumInicio,'');
});
test('manual low-intake days and fasting are not double counted',()=>{
 const dieta={tipo:'jejum',jejumInicio:'2026-09-17',refeeding:{diasSemIngesta:'15'}};
 assert.equal(diasIngestaReduzida(dieta,'2026-09-28'),15);
 dieta.refeeding.diasSemIngesta='3';assert.equal(diasIngestaReduzida(dieta,'2026-09-28'),11);
});
test('fasting feeds actual NICE assessment, maintaining >5 and >10 thresholds',()=>{
 const src=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 const code=src.slice(src.indexOf('const numClinico ='),src.indexOf('// Jing et al.'));
 const ctx={avaliarJejum:d=>avaliarJejum(d,'2026-09-28'),diasIngestaReduzida:d=>diasIngestaReduzida(d,'2026-09-28')};vm.createContext(ctx);vm.runInContext(code,ctx);
 const risk=(start,extra={})=>ctx.avaliarRealimentacao({peso:'70',altura:'175',dieta:{tipo:'jejum',jejumInicio:start,refeeding:extra}});
 assert.equal(risk('2026-09-18').alto,false);assert.equal(risk('2026-09-17').alto,true);
 assert.equal(risk('2026-09-23',{alcool:true}).alto,false);assert.equal(risk('2026-09-22',{alcool:true}).alto,true);
 assert.equal(risk('').dias,null);
});

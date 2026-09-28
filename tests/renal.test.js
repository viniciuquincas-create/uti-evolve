import test from 'node:test';
import assert from 'node:assert/strict';
import {cgRaw,epiRaw,kineticRaw,renalEstimate} from '../src/renal.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const p={renalAge:60,peso:70,altura:170,sexo:'M',creatininaBasal:1};
test('CG/CKD-EPI validate units, commas and adult inputs',()=>{
 near(cgRaw('1,0',60,70,'M'),77.77777777777777);
 near(cgRaw(1,60,70,'F'),66.1111111111111);
 assert.equal(cgRaw(1,60,-1,'M'),null);assert.equal(epiRaw(1,12,'M'),null);assert.equal(epiRaw(1,60,''),null);
});
test('Chen agrees with independent mass balance and is defined at steady creatinine',()=>{
 near(kineticRaw(1,1,70,'M',60,24,1),77.77777777777777);
 // GFR = generation/meanCr - volume(mL)*deltaCr/(minutes*meanCr).
 for(const [a,b,h]of [[1,2,24],[2,1,24],[1,2,48],[1,1.01,12]]){
 const mean=(a+b)/2,expected=(80*70/72)/mean-42000*(b-a)/(h*60*mean);
 near(kineticRaw(a,b,70,'M',60,h,1),expected);
 }
 assert.equal(kineticRaw(1,20,70,'M',60,1,1),null);
 assert.equal(kineticRaw(1,2,70,'M',60,0,1),null);
 assert.equal(kineticRaw(1,2,70,'M',60,24,''),null);
});
test('dated samples skip empty days and use actual hours, or label date approximation',()=>{
 const cfg={equacaoRenal:{padrao:'kegfr'}};
 const t={'2026-09-20':{cr:1,crHora:'18:00'},'2026-09-21':{hb:10},'2026-09-22':{cr:2,crHora:'06:00'}};
 const r=renalEstimate(p,t,cfg);assert.equal(r.hours,36);assert.equal(r.approximate,false);
 delete t['2026-09-20'].crHora;assert.equal(renalEstimate(p,t,cfg).hours,48);assert.equal(renalEstimate(p,t,cfg).approximate,true);
});
test('drug configuration overrides only its category and CKD-EPI is absolute',()=>{
 const t={'2026-09-20':{cr:1}};const cfg={equacaoRenal:{padrao:'cg',antibioticos:'ckdepi',analgesicos:'kegfr'}};
 near(renalEstimate(p,t,cfg,'antibioticos').value,epiRaw(1,60,'M')*Math.sqrt(70*170/3600)/1.73);
 assert.equal(renalEstimate(p,t,cfg,'analgesicos').value,null);
 near(renalEstimate(p,t,cfg).value,cgRaw(1,60,70,'M'));
 assert.equal(renalEstimate({...p,altura:''},t,cfg,'antibioticos').value,null);
 assert.equal(renalEstimate({...p,emTRS:true},t,cfg).value,null);
});

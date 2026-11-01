import assert from 'node:assert/strict';
import {enteralSummary} from '../src/nutrition-summary.js';
const input={dieta:{tipo:'enteral',vazao:'60'},formula:{kcalML:1.5,ptnML:.06},peso:70,meta:{kcal:2000,ptn:100}};
const lines=enteralSummary({...input,volumeRecebido:1000});
assert(lines[0].includes('1.200 mL/dia'));assert(lines[0].includes('25,7 kcal/kg/dia'));assert(lines[0].includes('1,03 g/kg/dia'));assert(lines[0].includes('90%'));assert(lines[0].includes('72%'));
assert(lines[1].includes('75%'));assert(lines[1].includes('60%'));assert.equal(enteralSummary(input).length,1);assert(enteralSummary({...input,volumeRecebido:0})[1].includes('0%'));
const extra=enteralSummary({...input,dieta:{...input.dieta,moduloProteina:{ativo:true,gramas:10}},glicoseKcal:100,volumeRecebido:1000});assert(extra[0].includes('95%'));assert(extra[0].includes('82%'));assert(extra[1].includes('60%'));assert.equal(enteralSummary({...input,dieta:{tipo:'jejum'}}).length,0);
console.log('PASS 20h projection, actual intake, missing/zero volume, supplements and fasting');

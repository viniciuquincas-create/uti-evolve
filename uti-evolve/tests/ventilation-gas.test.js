import test from 'node:test';
import assert from 'node:assert/strict';
import {gasosDoDia,ventilacaoGasometria} from '../src/ventilation-gas.js';
const day='2026-10-13',old='2026-10-12',table={[old]:{_gasos:[{po2:'90',pco2:'40'}]},[day]:{_gasos:[{data:old,po2:'99'},{horario:'08:00',po2:'80',pco2:'38'},{horario:'14:00',po2:'100',pco2:'35'}]}};
test('only gases from the requested day can be returned',()=>{assert.equal(gasosDoDia(table,day).length,2);assert.equal(ventilacaoGasometria({},table,day).pao2,'100');assert.equal(ventilacaoGasometria({},table,'2026-10-14').pao2,'');assert.equal(ventilacaoGasometria({vm_pf:'90',vm_pfData:old},{},day).pao2,'');assert.equal(ventilacaoGasometria({vm_pf:'90'},{},day).pao2,'');});
test('explicit none persists and manual clearing does not refill',()=>{assert.equal(ventilacaoGasometria({vm_semGasoData:day},table,day).pao2,'');assert.equal(ventilacaoGasometria({vm_pfData:day,vm_pf:''},table,day).pao2,'');assert.equal(ventilacaoGasometria({vm_pfData:day,vm_pf:'75'},table,day).pao2,'75');assert.equal(ventilacaoGasometria({vm_pfData:day,vm_pf:'75'},table,day).paco2,'');});
test('empty, malformed and serialized gasometries',()=>{assert.deepEqual(gasosDoDia({[day]:{_gasos:'invalid'}},day),[]);assert.equal(gasosDoDia({[day]:{_gasos:'[{"po2":"80"}]'}},day)[0].po2,'80');});

import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalEventDetail} from '../src/clinical-event-text.js';
test('pasted lists remain beneath their field, without double bullets',()=>{
 assert.equal(clinicalEventDetail('Conduta','- Primeira conduta\r\n- Segunda conduta\n\nContinuação'), '  • Conduta:\n    ◦ Primeira conduta\n    ◦ Segunda conduta\n    ◦ Continuação');
 assert.equal(clinicalEventDetail('Resultado','1. Achado A\n• Achado B'), '  • Resultado:\n    ◦ Achado A\n    ◦ Achado B');
});
test('single lines remain compact and clinical values are preserved',()=>{
 assert.equal(clinicalEventDetail('Avaliação','-5 mmHg'), '  • Avaliação: -5 mmHg');
 assert.equal(clinicalEventDetail('Resultado','1.5 cm'), '  • Resultado: 1.5 cm');
 assert.equal(clinicalEventDetail('Conduta','  '), '');
});

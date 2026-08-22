import test from "node:test";
import assert from "node:assert/strict";
import {parseSbari} from "../lib/sbari-parser.js";

test("interpreta pacientes e seções do SBARI",()=>{
  const [p]=parseSbari(`Leito 1: Maria da Silva, 67 anos
Adm Hosp: 20/08 Adm UTI: 21/08
Equipe: Clínica
S: Sepse pulmonar
B: HAS e DM
A:
N: Glasgow 15
CV: Estável
R: Cateter nasal
TGI: Dieta enteral
R/M: Cr 1,2
H/I: Afebril
ATB: Ceftriaxona D2
Prévio: Piperacilina 10-15/08
R: Desmame de O2
I: Reavaliar amanhã`);
  assert.equal(p.leito,"Leito 01");
  assert.equal(p.paciente,"Maria da Silva");
  assert.equal(p.assessment.CV,"Estável");
  assert.equal(p.instrucoes,"Reavaliar amanhã");
});

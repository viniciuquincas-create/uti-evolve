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

test("aceita Box, leito em outra linha e cabeçalho sem vírgula",()=>{
  const pacientes=parseSbari(`BOX 601 - Maria Aparecida dos Santos 67 anos RH12345
Adm Hosp: 20/08 Adm UTI: 21/08
Equipe: Clínica
S: Sepse
A:
N: Glasgow 15

Leito 602
Paciente: João da Silva - 54 anos - Prontuário 9988
Adm Hosp: 21/08 Adm UTI: 22/08
Equipe: Cirurgia
S: Pós-operatório`);
  assert.equal(pacientes.length,2);
  assert.equal(pacientes[0].paciente,"Maria Aparecida dos Santos");
  assert.equal(pacientes[0].idadeAnos,"67");
  assert.equal(pacientes[1].paciente,"João da Silva");
  assert.equal(pacientes[1].leito,"Leito 602");
});

test("aceita tabela exportada sem a palavra leito e idade abreviada",()=>{
  const pacientes=parseSbari(`603
Ana Maria de Souza, 72 a.
Adm Hosp: 20/08 Adm UTI: 21/08
S: Pneumonia

604 - Carlos Alberto Lima 58 anos RH 123456
Adm Hosp: 22/08 Adm UTI: 23/08
S: Choque`);
  assert.equal(pacientes.length,2);
  assert.equal(pacientes[0].paciente,"Ana Maria de Souza");
  assert.equal(pacientes[0].idadeAnos,"72");
  assert.equal(pacientes[1].paciente,"Carlos Alberto Lima");
});

test("infere leito omitido entre dois cabeçalhos numerados",()=>{
  const pacientes=parseSbari(`Leito 04: Maria da Rocha, 87a
S: Observação
Leito Aparecida de Cassia Martins Parvo, 63 anos
S: Pós-operatório
Leito 06: Fabio Laurindo, 46 anos
S: Choque`);
  assert.equal(pacientes.length,3);
  assert.equal(pacientes[1].leito,"Leito 05");
  assert.equal(pacientes[1].paciente,"Aparecida de Cassia Martins Parvo");
});

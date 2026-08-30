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

test("identifica leitos vagos explícitos ou sem nome",()=>{
  const registros=parseSbari(`Leito 01: Maria da Silva, 60 anos
S: Estável
Leito 02: Vago
Leito 03:
Leito 04: sem paciente`);
  assert.equal(registros.length,4);
  assert.equal(registros[1].vago,true);
  assert.equal(registros[2].vago,true);
  assert.equal(registros[3].vago,true);
});

test("extrai múltiplos diagnósticos, equipe e procedimentos com ou sem PO",()=>{
  const [p]=parseSbari(`Leito 12: Ana Maria da Silva, 55 anos
Equipe: Cirurgia do Fígado
S:
- Choque séptico
- Insuficiência respiratória
- POI Transplante hepático
- Traqueostomia
B: HAS`);
  assert.deepEqual(p.diagnosticos,["Choque séptico","Insuficiência respiratória"]);
  assert.equal(p.equipe,"Cirurgia do Fígado");
  assert.deepEqual(p.procedimentos.map(x=>x.nome),["Transplante hepático","Traqueostomia"]);
  assert.match(p.procedimentos[0].data,/^\d{4}-\d{2}-\d{2}$/);
});

test("estrutura dados clínicos do SBARI para lançamento no dia anterior",()=>{
  const [p]=parseSbari(`Leito 02: Emanoel Inacio Cavalcante, 49 anos
Adm Hosp: 27/08 Adm UTI: 27/08
Equipe: Vascular
S:
- POI 27/08 Correção de pseudoaneurisma de ilíaca interna E
- Fechamento a. radial E (trombose distal)
- LRA isquêmica → CVVHDF 28/08
A:
N: RASS -5 | PPF 08 Mida 15 Fenta 3
CV: [Nora 14] + Vaso 6, Lac 4.6 mmol
R: IOT VM PCV 16 FiO2 50% PEEP 10 PF 187
R/M: CVVHDF, CK 4641, Cr 4.96, Ur 117, Na 139, K 5, pH 7.38, pCO2 36, HCO3 20
H/I: Hb 8.8, Plqts 78k, Leuco 22k, Fib 561, TP 1.6, TTPa 0.91
ATB: Cefuroxima (27/08-)
R:
- Nefro acompanha - início de HD 28/08
- Vigiar perfusão mão E`);
  assert.equal(p.procedimentos[0].data,`${new Date().getFullYear()}-08-27`);
  assert.ok(p.diagnosticos.some(x=>/Fechamento a\. radial/i.test(x)));
  assert.deepEqual(p.clinical.pumps,{propofol:"08",midazolam:"15",fentanil:"3",noradrenalina:"14",vasopressina:"6"});
  assert.equal(p.clinical.concentratedNoradrenaline,true);
  assert.equal(p.clinical.rass,"-5");
  assert.equal(p.clinical.ventilation.vm_modo,"vm_pcv");
  assert.equal(p.clinical.ventilation.vm_pins,"16");
  assert.equal(p.clinical.labs.cr,"4.96");
  assert.equal(p.clinical.labs.plaq,"78000");
  assert.equal(p.clinical.labs.leuco,"22000");
  assert.equal(p.clinical.gasometry.lact,"4.6");
  assert.equal(p.clinical.antibiotics[0].nome,"Cefuroxima");
  assert.match(p.clinical.impression,/Vigiar perfusão/);
});

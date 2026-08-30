import test from "node:test";
import assert from "node:assert/strict";
import { applyConfirmedBatch, applyConfirmedPreview, buildBatchPreview, buildPreview, parseClinicalRequest, parseClinicalRequests, safeTokenEqual, tokenDigest } from "../lib/chatgpt-clinical-flow.js";

const leitos=[{id:1,nome:"Leito 01",paciente:"Paciente Teste",drogasVazao:{fentanil:"2"},dieta:{tipo:"enteral",meta:{modo:"kg"}},dispositivos:{}}];

test("mantém compatibilidade com mensagem clínica simples",()=>{
  const parsed=parseClinicalRequest({transcript:"Leito 1, nora 20, propofol 10, psv, ps 10, fi 30, peep 6"});
  const preview=buildPreview(leitos,parsed,{});
  assert.equal(preview.bedId,1);
  assert.equal(preview.updates.bedUpdates.vm_modo,"vm_psv");
  assert.equal(leitos[0].drogasVazao.noradrenalina,undefined);
});

test("prévia estruturada inclui exame físico e dieta sem gravar",()=>{
  const parsed=parseClinicalRequest({transcript:"Leito 1...",clinicalData:{bedNumber:1,evolutionUpdates:{nEF:"RASS -2, pupilas isocóricas",cvEF:"RCR 2T"},dietUpdates:{tipo:"enteral",formula:"Nutrison",vazao:"40",meta:{modo:"kg",kcalKg:"25"}}}});
  assert.equal(parsed.error,undefined);
  const preview=buildPreview(leitos,parsed,{});
  assert.match(preview.updateLabels.join(" "),/Neurológico/);
  assert.equal(leitos[0].dieta.formula,undefined);
});

test("confirmação aplica leito, evolução, dieta e dispositivo",()=>{
  const parsed=parseClinicalRequest({transcript:"Atualizar leito 1",clinicalData:{bedNumber:1,bedUpdates:{vm_modo:"vm_psv",vm_peep:6},drugUpdates:{noradrenalina:20},evolutionUpdates:{reEF:"MV presente"},dietUpdates:{tipo:"enteral",vazao:40},deviceOperations:[{action:"add",type:"tot",site:"oral"}]}});
  const preview=buildPreview(leitos,parsed,{});
  const result=applyConfirmedPreview(leitos,{}, {command:parsed.command,preview});
  assert.equal(result.updatedBed.vm_peep,"6");
  assert.equal(result.updatedBed.drogasVazao.noradrenalina,"20");
  assert.equal(result.updatedBed.dieta.vazao,"40");
  assert.equal(result.updatedBed.dispositivos.tot.ativo,true);
  assert.equal(result.updatedEvolutions[1].reEF,"MV presente");
});

test("rejeita campo não autorizado",()=>{
  const parsed=parseClinicalRequest({transcript:"teste",clinicalData:{bedNumber:1,bedUpdates:{campoInventado:"x"}}});
  assert.match(parsed.error,/não permitidos/);
});

test("diferencia leitos repetidos pelo nome-alvo do paciente",()=>{
  const repetidos=[
    {id:"g1-01",nome:"Leito 01",paciente:"Outro Paciente",drogasVazao:{},dieta:{},dispositivos:{}},
    {id:"g2-01",nome:"Leito 01",paciente:"Lineu Matos Junior",drogasVazao:{},dieta:{},dispositivos:{}},
  ];
  const parsed=parseClinicalRequest({transcript:"Dados da folha do leito 01",clinicalData:{bedNumber:1,targetPatientName:"Lineu Matos Junior",evolutionUpdates:{nRASS:"0"}}});
  const preview=buildPreview(repetidos,parsed,{});
  assert.equal(preview.bedId,"g2-01");
  assert.equal(preview.patientName,"Lineu Matos Junior");
});

test("bloqueia confirmação se paciente mudou",()=>{
  const parsed=parseClinicalRequest({transcript:"teste",clinicalData:{bedNumber:1,evolutionUpdates:{nEF:"alerta"}}});
  const preview=buildPreview(leitos,parsed,{});
  const changed=[{...leitos[0],paciente:"Outro paciente"}];
  assert.match(applyConfirmedPreview(changed,{}, {command:parsed.command,preview}).error,/mudou/);
});

test("token de confirmação é verificável por HMAC",()=>{
  const digest=tokenDigest("token-unico","chave-servidor");
  assert.equal(safeTokenEqual("token-unico",digest,"chave-servidor"),true);
  assert.equal(safeTokenEqual("errado",digest,"chave-servidor"),false);
});

test("folha com vários pacientes gera uma prévia única e grava todos",()=>{
  const beds=[
    {id:"g2-01",nome:"Leito 01",paciente:"Lineu Matos Junior",drogasVazao:{},dieta:{},dispositivos:{}},
    {id:"g2-02",nome:"Leito 02",paciente:"Paciente Dois",drogasVazao:{},dieta:{},dispositivos:{}},
  ];
  const parsed=parseClinicalRequests({transcript:"Folha com leitos 1 e 2",clinicalDataList:[
    {bedNumber:1,targetPatientName:"Lineu Matos Junior",tableDate:"2026-08-30",tableUpdates:{hb:"8,3",cr:"1,4",c24_fc:"120"},evolutionUpdates:{nRASS:"0"}},
    {bedNumber:2,targetPatientName:"Paciente Dois",tableDate:"2026-08-30",tableUpdates:{na:"140",lact:"2,1"},evolutionUpdates:{cvEF:"RCR 2T"}},
  ]});
  const preview=buildBatchPreview(beds,parsed,{});
  assert.equal(preview.count,2);
  const result=applyConfirmedBatch(beds,{}, {},{transcript:parsed.transcript,commands:parsed.items.map(x=>x.command),preview});
  assert.equal(result.updatedEvolutions["g2-01"].nRASS,"0");
  assert.equal(result.updatedEvolutions["g2-02"].cvEF,"RCR 2T");
  assert.equal(result.updatedTables["g2-01"]["2026-08-30"].hb,"8,3");
  assert.equal(result.updatedTables["g2-02"]["2026-08-30"].lact,"2,1");
});

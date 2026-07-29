import test from "node:test";
import assert from "node:assert/strict";
import { buildPreview, parseClinicalTranscript, safeTokenEqual, tokenDigest } from "../lib/chatgpt-clinical-flow.js";

test("gera prévia sem alterar o leito original",()=>{
  const leitos=[{id:1,nome:"Leito 01",paciente:"Paciente Teste",drogasVazao:{fentanil:"2"}}];
  const parsed=parseClinicalTranscript("Leito 1, nora 20, propofol 10, psv, ps 10, fi 30, peep 6");
  const preview=buildPreview(leitos,parsed);
  assert.equal(preview.bedId,1);
  assert.equal(preview.updates.vm_modo,"vm_psv");
  assert.equal(leitos[0].drogasVazao.noradrenalina,undefined);
});
test("token de confirmação é de uso verificável por HMAC",()=>{
  const digest=tokenDigest("token-unico","chave-servidor");
  assert.equal(safeTokenEqual("token-unico",digest,"chave-servidor"),true);
  assert.equal(safeTokenEqual("errado",digest,"chave-servidor"),false);
});

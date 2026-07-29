import test from "node:test";
import assert from "node:assert/strict";
import { applyCommandToLeitos, parseWhatsappCommand } from "../lib/whatsapp-command.js";

test("interpreta o comando clínico principal", () => {
  const parsed = parseWhatsappCommand("Leito 1, nora 20, propofol 10, psv, ps 10, fi 30, peep 6");
  assert.equal(parsed.bedNumber, 1);
  assert.deepEqual(parsed.updates, {
    drogasVazao: { noradrenalina:"20", propofol:"10" },
    vm_modo:"vm_psv", vm_ps:"10", vm_fio2:"30", vm_peep:"6",
  });
  assert.deepEqual(parsed.unknown, []);
});

test("aceita acentos, decimais com vírgula e aliases", () => {
  const parsed = parseWhatsappCommand("Leito 02; noradrenalina 12,5; FiO2 40; PCV; pressão de suporte 8");
  assert.equal(parsed.bedNumber, 2);
  assert.equal(parsed.updates.drogasVazao.noradrenalina, "12.5");
  assert.equal(parsed.updates.vm_modo, "vm_pcv");
  assert.equal(parsed.updates.vm_fio2, "40");
  assert.equal(parsed.updates.vm_ps, "8");
});

test("atualiza apenas o leito solicitado e preserva outros campos", () => {
  const leitos = [
    { id:1, nome:"Leito 01", paciente:"Ana", drogasVazao:{ fentanil:"3" }, peso:"70" },
    { id:2, nome:"Leito 02", paciente:"Bruno" },
  ];
  const result = applyCommandToLeitos(leitos, parseWhatsappCommand("Leito 1, nora 20, PSV, PEEP 6"));
  assert.equal(result.updatedBed.paciente, "Ana");
  assert.equal(result.updatedBed.peso, "70");
  assert.deepEqual(result.updatedBed.drogasVazao, { fentanil:"3", noradrenalina:"20" });
  assert.equal(result.updatedBed.vm_modo, "vm_psv");
  assert.equal(result.updatedLeitos[1], leitos[1]);
});

test("recusa leito vago", () => {
  const result = applyCommandToLeitos([{ id:1, nome:"Leito 01", paciente:"" }], parseWhatsappCommand("Leito 1, nora 20"));
  assert.match(result.error, /vago/i);
});

const FIELD_ALIASES = {
  noradrenalina: ["nora", "norad", "noradrenalina"],
  propofol: ["prop", "propofol"],
};

const MODE_ALIASES = {
  psv: "vm_psv",
  pcv: "vm_pcv",
  vcv: "vm_vcv",
  aprv: "vm_aprv",
  vni: "vni",
  cnaf: "cnaf",
  "ar ambiente": "ar_ambiente",
};

export function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function numericValue(segment) {
  const match = segment.match(/(-?\d+(?:[.,]\d+)?)/);
  return match ? match[1].replace(",", ".") : null;
}

export function parseWhatsappCommand(body = "") {
  const segments = normalizeText(body)
    .split(/(?:[;\n]+|,(?!\s*\d))/)
    .map((part) => part.trim())
    .filter(Boolean);

  let bedNumber = null;
  const updates = {};
  const recognized = [];
  const unknown = [];

  for (const segment of segments) {
    const bed = segment.match(/^(?:leito|lt|box)\s*0*(\d+)$/);
    if (bed) {
      bedNumber = Number(bed[1]);
      recognized.push(segment);
      continue;
    }

    const mode = Object.entries(MODE_ALIASES).find(([alias]) => segment === alias || segment === `modo ${alias}`);
    if (mode) {
      updates.vm_modo = mode[1];
      recognized.push(segment);
      continue;
    }

    let matchedDrug = false;
    for (const [drugKey, aliases] of Object.entries(FIELD_ALIASES)) {
      const alias = aliases.find((item) => new RegExp(`^${item}(?:\\s|$)`).test(segment));
      if (!alias) continue;
      const value = numericValue(segment.slice(alias.length));
      if (value === null) break;
      updates.drogasVazao = { ...(updates.drogasVazao || {}), [drugKey]: value };
      recognized.push(segment);
      matchedDrug = true;
      break;
    }
    if (matchedDrug) continue;

    const fields = [
      { pattern: /^(?:ps|pressao de suporte)\s+/, key: "vm_ps" },
      { pattern: /^(?:fi|fio2|fi o2)\s+/, key: "vm_fio2" },
      { pattern: /^peep\s+/, key: "vm_peep" },
      { pattern: /^(?:o2|oxigenio)\s+/, key: "vm_o2" },
      { pattern: /^(?:fluxo|flow)\s+/, key: "vm_flow" },
    ];
    const field = fields.find(({ pattern }) => pattern.test(segment));
    if (field) {
      const value = numericValue(segment);
      if (value !== null) {
        updates[field.key] = value;
        recognized.push(segment);
        continue;
      }
    }

    unknown.push(segment);
  }

  return { bedNumber, updates, recognized, unknown };
}

export function findBed(leitos, bedNumber) {
  const matches = (leitos || []).filter((leito) => {
    const numberFromName = String(leito.nome || "").match(/\d+/)?.[0];
    return Number(leito.id) === Number(bedNumber) || Number(numberFromName) === Number(bedNumber);
  });
  if (matches.length !== 1) return { error: matches.length ? "Leito ambíguo" : "Leito não encontrado" };
  if (!matches[0].paciente) return { error: `Leito ${bedNumber} está vago` };
  return { bed: matches[0] };
}

export function applyCommandToLeitos(leitos, command) {
  if (!command.bedNumber) return { error: "Informe o leito. Ex.: Leito 1" };
  const found = findBed(leitos, command.bedNumber);
  if (found.error) return found;
  if (!Object.keys(command.updates).length) return { error: "Nenhum dado clínico reconhecido" };

  const updatedBed = {
    ...found.bed,
    ...command.updates,
    drogasVazao: {
      ...(found.bed.drogasVazao || {}),
      ...(command.updates.drogasVazao || {}),
    },
    whatsappUltimaAtualizacao: new Date().toISOString(),
  };
  const updatedLeitos = leitos.map((leito) => leito.id === found.bed.id ? updatedBed : leito);
  return { updatedLeitos, updatedBed };
}

export function describeUpdates(updates) {
  const parts = [];
  if (updates.drogasVazao?.noradrenalina) parts.push(`noradrenalina ${updates.drogasVazao.noradrenalina} mL/h`);
  if (updates.drogasVazao?.propofol) parts.push(`propofol ${updates.drogasVazao.propofol} mL/h`);
  const modeLabels = { vm_psv:"PSV", vm_pcv:"PCV", vm_vcv:"VCV", vm_aprv:"APRV", vni:"VNI", cnaf:"CNAF", ar_ambiente:"ar ambiente" };
  if (updates.vm_modo) parts.push(`modo ${modeLabels[updates.vm_modo] || updates.vm_modo}`);
  if (updates.vm_ps) parts.push(`PS ${updates.vm_ps}`);
  if (updates.vm_fio2) parts.push(`FiO2 ${updates.vm_fio2}%`);
  if (updates.vm_peep) parts.push(`PEEP ${updates.vm_peep}`);
  if (updates.vm_o2) parts.push(`O2 ${updates.vm_o2} L/min`);
  if (updates.vm_flow) parts.push(`fluxo ${updates.vm_flow} L/min`);
  return parts;
}

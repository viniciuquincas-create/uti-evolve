const clean = value => String(value || "").replace(/\r/g, "").replace(/[ \t]+$/gm, "").trim();

function field(text, label) {
  const match = text.match(new RegExp(`^${label}\\s*:\\s*([^\\n]*)`, "im"));
  return clean(match?.[1]);
}

function section(text, start, ends) {
  const end = ends.map(x => `(?=^${x}\\s*:)`).join("|");
  const boundary = end ? `(?:${end}|$)` : "$";
  const match = text.match(new RegExp(`^${start}\\s*:\\s*([\\s\\S]*?)${boundary}`, "im"));
  return clean(match?.[1]);
}

export function parseSbari(textRaw) {
  const text = clean(textRaw);
  const header = /(?:^|\n)Leito\s*([A-Za-z0-9-]+)\s*:\s*([^\n,]+?)(?:\s*,\s*(\d+)\s*anos?)?\s*(?=\n|$)/gi;
  const matches = [...text.matchAll(header)];
  return matches.map((match, index) => {
    const body = text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length);
    const assessment = section(body, "A", ["ATB"]);
    const systems = {};
    const systemPattern = /^(N|CV|R|TGI|R\/M|H\/I)\s*:\s*([\s\S]*?)(?=^(?:N|CV|R|TGI|R\/M|H\/I)\s*:|$)/gim;
    for (const sm of assessment.matchAll(systemPattern)) systems[sm[1].toUpperCase()] = clean(sm[2]);
    const adm = body.match(/^Adm Hosp\s*:\s*([^\n]*?)\s+Adm UTI\s*:\s*([^\n]*)/im);
    const planoInicio=body.search(/^ATB\s*:/im);
    const plano=planoInicio>=0?body.slice(planoInicio):body;
    return {
      leito:`Leito ${String(match[1]).padStart(2,"0")}`,
      numero:String(match[1]), paciente:clean(match[2]), idadeAnos:match[3] || "",
      admHospital:clean(adm?.[1]), admUti:clean(adm?.[2]), equipe:field(body, "Equipe"),
      situacao:section(body, "S", ["B", "A", "ATB", "R", "I"]),
      background:section(body, "B", ["A", "ATB", "R", "I"]),
      assessment:systems,
      antibioticos:section(body, "ATB", ["Prévio", "R", "I"]),
      antibioticosPrevios:section(body, "Prévio", ["R", "I"]),
      recomendacoes:section(plano, "R", ["I"]), instrucoes:section(plano, "I", []), raw:clean(body)
    };
  }).filter(p => p.paciente);
}

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
  let ultimoLeito=0;
  const text = clean(textRaw).split("\n").map(linha=>{
    const numerado=linha.match(/^\s*(?:Leito|Box)\s*(?:n[º°o]\.?\s*)?[:#-]?\s*(\d{1,4})\b/i);
    if(numerado){ultimoLeito=Number(numerado[1]);return linha;}
    // Corrige cabeçalhos ocasionais como "Leito Nome, 63 anos" quando o
    // número foi apagado no documento, inferindo o próximo leito da sequência.
    if(ultimoLeito&&/^\s*(?:Leito|Box)\s+[A-Za-zÀ-ÿ]/i.test(linha)&&/\d{1,3}\s*(?:anos?|a\.?)(?:\s|$)/i.test(linha)){
      ultimoLeito+=1;return linha.replace(/^(\s*(?:Leito|Box))\s+/i,`$1 ${ultimoLeito}: `);
    }
    return linha;
  }).join("\n");
  // Alguns SBARIs exportados do Google Docs perdem a palavra "Leito" da
  // primeira coluna da tabela e chegam apenas como "601\nNome do paciente".
  const header = /(?:^|\n)(?:(?:Leito|Box)\s*(?:n[º°o]\.?\s*)?[:#-]?\s*([A-Za-z]?\d+[A-Za-z]?)|(\d{3,4}))\s*(?:[:|–—-]\s*|\n\s*(?:Paciente\s*:?\s*)?|\s+)([^\n]+?)\s*(?=\n|$)/gi;
  const matches = [...text.matchAll(header)];
  return matches.map((match, index) => {
    const body = text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length);
    const numero=String(match[1]||match[2]);
    const cabecalho=clean(match[3]);
    const idade=cabecalho.match(/(?:^|[,;|–—-]\s*|\s)(\d{1,3})\s*(?:anos?\b|a\.?\s*(?:$|[,;|–—-]))/i)?.[1]||"";
    const paciente=clean(cabecalho
      .replace(/\s*(?:[,;|–—-]\s*|\s)\d{1,3}\s*(?:anos?\b|a\.?(?=\s|$))[\s\S]*$/i,"")
      .replace(/\s+(?:RH|REG(?:ISTRO)?|PRONTU[ÁA]RIO)\s*[:#-]?\s*[A-Za-z0-9.-]+[\s\S]*$/i,""));
    const assessment = section(body, "A", ["ATB"]);
    const systems = {};
    const systemPattern = /^(N|CV|R|TGI|R\/M|H\/I)\s*:\s*([\s\S]*?)(?=^(?:N|CV|R|TGI|R\/M|H\/I)\s*:|$)/gim;
    for (const sm of assessment.matchAll(systemPattern)) systems[sm[1].toUpperCase()] = clean(sm[2]);
    const adm = body.match(/^Adm Hosp\s*:\s*([^\n]*?)\s+Adm UTI\s*:\s*([^\n]*)/im);
    const planoInicio=body.search(/^ATB\s*:/im);
    const plano=planoInicio>=0?body.slice(planoInicio):body;
    return {
      leito:`Leito ${numero.padStart(2,"0")}`,
      numero, paciente, idadeAnos:idade,
      admHospital:clean(adm?.[1]), admUti:clean(adm?.[2]), equipe:field(body, "Equipe"),
      situacao:section(body, "S", ["B", "A", "ATB", "R", "I"]),
      background:section(body, "B", ["A", "ATB", "R", "I"]),
      assessment:systems,
      antibioticos:section(body, "ATB", ["Prévio", "R", "I"]),
      antibioticosPrevios:section(body, "Prévio", ["R", "I"]),
      recomendacoes:section(plano, "R", ["I"]), instrucoes:section(plano, "I", []), raw:clean(body)
    };
  }).filter(p => p.paciente&&/[A-Za-zÀ-ÿ]/.test(p.paciente)&&p.paciente.split(/\s+/).length>=2);
}

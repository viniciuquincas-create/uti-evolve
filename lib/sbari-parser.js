const clean = value => String(value || "").replace(/\r/g, "").replace(/[ \t]+$/gm, "").trim();

function field(text, label) {
  const match = text.match(new RegExp(`^${label}\\s*:\\s*([^\\n]*)`, "im"));
  return clean(match?.[1]);
}

function section(text, start, ends) {
  const end = ends.map(x => `(?=^${x}\\s*:)`).join("|");
  // Não usar `$` aqui: com a flag multiline ele representa o fim de qualquer
  // linha e cortava seções do SBARI logo após a primeira linha.
  const eof = `(?![\\s\\S])`;
  const boundary = end ? `(?:${end}|${eof})` : eof;
  const match = text.match(new RegExp(`^${start}\\s*:\\s*([\\s\\S]*?)${boundary}`, "im"));
  return clean(match?.[1]);
}

const procedureWords=/\b(?:procedimento|cirurgia|laparotomia|relaparotomia|craniotomia|transplante|traqueostomia|toracotomia|drenagem|amputa[cç][aã]o|fasciotomia|embolectomia|bypass|revasculariza[cç][aã]o|angioplastia|cateterismo|endoscopia|broncoscopia|artrodese|fixa[cç][aã]o|implante|retirada|troca\s+valvar)\b|\b\w+(?:ectomia|plastia|tomia)\b/i;
function clinicalLines(value){return clean(value).split(/\n|\s*[•▪●]\s*|\s+[-–—]\s+(?=[A-ZÀ-Ý])/).map(x=>clean(x.replace(/^[-–—*]+\s*/,""))).filter(Boolean);}
function extractProcedures(...sources){
  const out=[];
  for(const line of sources.flatMap(clinicalLines)){
    const po=line.match(/\b(POI|PO)\s*(\d+)?\b\s*[:\-–—]?\s*(.*)/i);
    const explicitly=/^\s*(?:procedimentos?|cirurgias?)\s*:/i.test(line);
    if(!po&&!explicitly&&!procedureWords.test(line))continue;
    let nome=clean(po?.[3]||line.replace(/^\s*(?:procedimentos?|cirurgias?)\s*:\s*/i,""));
    nome=clean(nome.replace(/^\d+\s*(?:d|dias?)?\s*[:\-–—]?\s*/i,""));
    if(!nome||!/[A-Za-zÀ-ÿ]/.test(nome))continue;
    const day=po?.[1]?.toUpperCase()==="POI"?0:(po?.[2]?Number(po[2]):null);
    let data="";if(Number.isInteger(day)){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-day);data=d.toISOString().slice(0,10);}
    if(!out.some(p=>p.nome.toLowerCase()===nome.toLowerCase()))out.push({nome,data,poDia:day});
  }
  return out;
}

export function parseSbari(textRaw) {
  let ultimoLeito=0;
  let text = clean(textRaw).split("\n").map(linha=>{
    const numerado=linha.match(/^\s*(?:Leito|Box)\s*(?:n[º°o]\.?\s*)?[:#-]?\s*(\d{1,4})\b/i);
    if(numerado){ultimoLeito=Number(numerado[1]);return linha;}
    // Corrige cabeçalhos ocasionais como "Leito Nome, 63 anos" quando o
    // número foi apagado no documento, inferindo o próximo leito da sequência.
    if(ultimoLeito&&/^\s*(?:Leito|Box)\s+[A-Za-zÀ-ÿ]/i.test(linha)&&/\d{1,3}\s*(?:anos?|a\.?)(?:\s|$)/i.test(linha)){
      ultimoLeito+=1;return linha.replace(/^(\s*(?:Leito|Box))\s+/i,`$1 ${ultimoLeito}: `);
    }
    return linha;
  }).join("\n");
  text=text.replace(/(^|\n)(\s*(?:Leito|Box)\s*(?:n[º°o]\.?\s*)?[:#-]?\s*\d{1,4})\s*:\s*(?=\n|$)/gi,"$1$2: Vago");
  text=text.replace(/(^|\n)(\s*(?:Leito|Box)\s*(?:n[º°o]\.?\s*)?[:#-]?\s*\d{1,4})\s*(?=\n\s*(?:\n|(?:Leito|Box)\b|$))/gi,"$1$2: Vago");
  // Alguns SBARIs exportados do Google Docs perdem a palavra "Leito" da
  // primeira coluna da tabela e chegam apenas como "601\nNome do paciente".
  const header = /(?:^|\n)(?:(?:Leito|Box)\s*(?:n[º°o]\.?\s*)?[:#-]?\s*([A-Za-z]?\d+[A-Za-z]?)|(\d{3,4}))\s*(?:[:|–—-]\s*|\n\s*(?:Paciente\s*:?\s*)?|\s+)([^\n]+?)\s*(?=\n|$)/gi;
  const matches = [...text.matchAll(header)];
  return matches.map((match, index) => {
    const body = text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length);
    const numero=String(match[1]||match[2]);
    const cabecalho=clean(match[3]);
    const vago=/^(?:vag[oa]|livre|sem\s+paciente|sem\s+paciente\s+cadastrado|-+)\s*$/i.test(cabecalho);
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
    const situacao=section(body, "S", ["B", "A", "ATB", "R", "I"]);
    const background=section(body, "B", ["A", "ATB", "R", "I"]);
    const procedimentos=extractProcedures(situacao,background);
    const linhasProcedimento=new Set(procedimentos.map(p=>p.nome.toLowerCase()));
    const diagnosticos=clinicalLines(situacao).filter(x=>!linhasProcedimento.has(x.replace(/\b(?:POI|PO)\s*\d*\s*[:\-–—]?\s*/i,"").trim().toLowerCase())&&!/^\s*(?:POI|PO)\b/i.test(x)&&!procedureWords.test(x));
    return {
      leito:`Leito ${numero.padStart(2,"0")}`,
      numero, paciente:vago?"":paciente, idadeAnos:idade, vago,
      admHospital:clean(adm?.[1]), admUti:clean(adm?.[2]), equipe:field(body, "Equipe"),
      situacao,background,diagnosticos,procedimentos,
      assessment:systems,
      antibioticos:section(body, "ATB", ["Prévio", "R", "I"]),
      antibioticosPrevios:section(body, "Prévio", ["R", "I"]),
      recomendacoes:section(plano, "R", ["I"]), instrucoes:section(plano, "I", []), raw:clean(body)
    };
  }).filter(p => p.vago||(p.paciente&&/[A-Za-zÀ-ÿ]/.test(p.paciente)&&p.paciente.split(/\s+/).length>=2));
}

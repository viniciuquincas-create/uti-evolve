// api/impressao.js — Geração de Impressão Clínica via Gemini
// Deploy: copiar para /api/impressao.js no repositório

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { paciente, diagnostico, sexo, idade, peso, pp, dias,
          procedimentos, dispositivos, hda, campos, dieta } = req.body;

  // Monta contexto estruturado para o modelo
  const sexoStr = sexo === "F" ? "feminino" : sexo === "M" ? "masculino" : "";
  const header = [
    paciente,
    idade && `${idade} anos`,
    sexoStr,
    peso && `${peso} kg`,
    pp && `PP ${pp} kg`,
    dias != null && `D${dias} UTI`,
    diagnostico && `diagnóstico de ${diagnostico}`,
  ].filter(Boolean).join(", ");

  const procsStr = (procedimentos || []).map(p =>
    `${p.nome} em ${p.data}${p.po != null ? ` (${p.po === 0 ? "POI" : `PO${p.po}`})` : ""}`
  ).join("; ");

  const dispsStr = (dispositivos || []).map(d =>
    `${d.label}${d.site ? ` (${d.site})` : ""} D${d.dias}${d.alerta ? " ⚠️" : ""}`
  ).join(", ");

  const dietaStr = dieta?.tipo
    ? `${dieta.tipo}${dieta.formula ? ` (${dieta.formula})` : ""}${dieta.vazao ? ` @ ${dieta.vazao} mL/h` : ""}`
    : "";

  const c = campos || {};
  const sistemasStr = [
    c.nEF     && `Neurológico: ${c.nEF}${c.nSeda ? " | Sed: " + c.nSeda : ""}${c.nAnalg ? " | Analg: " + c.nAnalg : ""}`,
    (c.cvEF || c.cvDVA) && `Cardiovascular: ${c.cvEF || ""}${c.cvDVA ? " | DVA: " + c.cvDVA : ""}${c.cvPerf ? " | Perfusão: " + c.cvPerf : ""}${c.cv24h ? " | 24h: " + c.cv24h : ""}`,
    (c.reVM || c.reEF)  && `Respiratório: ${c.reVM || ""}${c.reEF ? " | " + c.reEF : ""}${c.re24h ? " | 24h: " + c.re24h : ""}${c.reGaso ? " | Gaso: " + c.reGaso : ""}`,
    (c.rm24h || c.rmLabs) && `Renal/Metabólico: ${c.rm24h || ""}${c.rmLabs ? " | Labs: " + c.rmLabs : ""}${c.rmTRS ? " | TRS: " + c.rmTRS : ""}`,
    (c.tgEF || dietaStr) && `TGI: ${dietaStr ? "Dieta " + dietaStr : ""}${c.tgEF ? " | " + c.tgEF : ""}${c.tg24h ? " | " + c.tg24h : ""}`,
    (c.heTemp || c.heLabs) && `Infeccioso/He: T ${c.heTemp || "?"}${c.heLabs ? " | " + c.heLabs : ""}${c.heAtb ? " | ATB: " + c.heAtb : ""}${c.heCulturas ? " | Culturas: " + c.heCulturas : ""}`,
  ].filter(Boolean).join("\n");

  const prompt = `Você é um médico intensivista experiente. Gere uma "Impressão Clínica" para passagem de caso para os chefes/preceptores da UTI.

REGRAS OBRIGATÓRIAS:
- Texto corrido, sem marcadores, bullets ou títulos
- Português médico formal e objetivo
- Máximo de 5 a 7 linhas
- Estrutura narrativa: [identificação do paciente + diagnóstico] → [procedimentos realizados com datas/PO se houver] → [estado atual sistema a sistema de forma sintética]
- Termine sempre com o estado atual: consciência, sedação/analgesia, ventilação, hemodinâmica, diurese, temperatura, dieta
- Use termos médicos como: "vigil e cooperativo", "confortável em VMI", "estável clínica e hemodinamicamente", "afebril", "diurese adequada", "recebendo dieta enteral" etc.
- Se a HDA estiver preenchida, use como base para o contexto clínico

DADOS DO PACIENTE:
Identificação: ${header || "não informado"}
HDA preenchida: ${hda || "não preenchida — use os dados disponíveis"}
Procedimentos: ${procsStr || "nenhum registrado"}
Dispositivos ativos: ${dispsStr || "nenhum"}
Sistemas:
${sistemasStr || "dados não preenchidos"}
Problemas ativos: ${c.probAtivos || "não listados"}

Gere APENAS a impressão clínica, sem introdução, sem comentários, sem aspas.`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.35, maxOutputTokens: 600 }
        })
      }
    );
    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error("Resposta vazia do modelo");
    res.json({ impressao: text });
  } catch (e) {
    console.error("impressao error:", e);
    res.status(500).json({ error: e.message || "Erro interno" });
  }
}

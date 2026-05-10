const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";
const BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // ── Modo Impressão Clínica ────────────────────────────────────────────────
  if (req.body?.mode === "impressao") {
    const d = req.body.dados || {};
    const prompt = `Você é um médico intensivista experiente. Escreva uma IMPRESSÃO CLÍNICA para passagem de caso para o chefe/preceptor da UTI.

REGRAS OBRIGATÓRIAS:
- Texto corrido, sem bullets, sem marcadores, sem títulos
- Português médico formal e objetivo
- 4 a 6 linhas contínuas
- Estrutura: [identificação + diagnóstico/contexto clínico] → [procedimentos realizados com datas/PO se houver] → [estado neurológico] → [estado cardiovascular e respiratório] → [renal, TGI, infeccioso resumidos] → [desfecho/situação atual]
- Use termos como: "vigil e cooperativo", "em analgesia contínua", "confortável em VMI", "estável clínica e hemodinamicamente", "afebril", "diurese adequada", "em dieta enteral"
- Se a HDA estiver preenchida, use-a como base narrativa principal
- Gere APENAS o texto, sem introdução, sem aspas, sem comentários

DADOS CLÍNICOS:
Paciente: ${d.paciente || "não informado"}
Diagnóstico: ${d.diagnostico || "não informado"}
HDA: ${d.hda || "não preenchida"}
Procedimentos: ${d.procedimentos || "nenhum"}
Dispositivos ativos: ${d.dispositivos || "nenhum"}
Neurológico: ${d.neurologico || "-"}
Cardiovascular: ${d.cardiovascular || "-"}
Respiratório: ${d.respiratorio || "-"}
Renal/Metabólico: ${d.renal || "-"}
TGI/Nutrição: ${d.tgi || "-"}
Infeccioso: ${d.infeccioso || "-"}
Problemas ativos: ${d.problemas || "não listados"}`;

    try {
      const r = await fetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 700 }
        })
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error.message || "Erro Gemini");
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) throw new Error("Resposta vazia");
      return res.json({ impressao: text });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── Modo Análise de Imagem (original) ────────────────────────────────────
  const { image, mimeType, prompt: customPrompt } = req.body || {};

  const defaultPrompt = `Você é um assistente médico especializado em UTI. Analise esta imagem de resultados clínicos do sistema hospitalar Tasy e extraia os dados em formato JSON estruturado.

Retorne APENAS um JSON válido (sem markdown, sem explicações) com esta estrutura:
{
  "exames": {
    "hemoglobina": "", "hematocrito": "", "leucocitos": "", "neutrofilos": "",
    "bastoes": "", "linfocitos": "", "plaquetas": "", "rni": "", "ttpa": "",
    "fibrinogenio": "", "creatinina": "", "ureia": "", "sodio": "", "potassio": "",
    "magnesio": "", "calcioIonico": "", "fosforo": "", "ph": "", "pco2": "",
    "po2": "", "hco3": "", "be": "", "lactato": "", "glicose": "",
    "albumina": "", "tgo": "", "tgp": "", "bilirubinaTotal": "",
    "bilirubinaDir": "", "ggt": "", "pcr": "", "procalcitonina": "",
    "troponina": "", "bnp": "", "dDimero": "", "fosfataseAlcalina": ""
  },
  "controles": {
    "fc": "", "pas": "", "pad": "", "pam": "", "temp": "",
    "spo2": "", "fr": "", "pesoAtual": "",
    "diurese": "", "bh": "", "oferta": ""
  },
  "outros": ""
}

Preencha apenas os campos que encontrar na imagem. Deixe os outros como string vazia "".`;

  if (!image) return res.status(400).json({ error: "Imagem não fornecida" });

  try {
    const r = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: customPrompt || defaultPrompt },
            { inline_data: { mime_type: mimeType || "image/png", data: image } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
      })
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error.message || "Erro Gemini");
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(clean);
      return res.json({ success: true, data: parsed });
    } catch {
      return res.json({ success: true, data: {}, raw: clean });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

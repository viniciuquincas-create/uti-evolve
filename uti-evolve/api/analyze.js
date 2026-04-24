export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: 'API key not configured' });

    const prompt = `Você é médico intensivista. Analise esta imagem (print de monitor, sistema hospitalar, exames laboratoriais ou controles de enfermagem de UTI) e extraia os dados clínicos.

Retorne SOMENTE JSON válido, sem markdown, sem texto extra. Formato exato:
{
  "sistemas": {
    "Neurológico": "",
    "Respiratório": "",
    "Hemodinâmico": "",
    "Renal/Metabólico": "",
    "Gastrointestinal": "",
    "Hematológico/Infeccioso": "",
    "Pele/Acessos": ""
  },
  "metas_sugeridas": [],
  "resumo": ""
}

Para cada sistema, preencha com os dados encontrados na imagem no formato de evolução médica de UTI (ex: "FC 88 bpm / PAM 75 mmHg / sem DVA"). Se não houver dados para um sistema, deixe string vazia. Seja conciso e clínico.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'Gemini error', details: err });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(clean);
      return res.status(200).json(parsed);
    } catch {
      return res.status(200).json({ raw: text, error: 'parse_failed' });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

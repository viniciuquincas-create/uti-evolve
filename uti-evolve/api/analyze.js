export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

    const prompt = `Você é médico intensivista. Analise a imagem de UTI (tabela de controles Tasy, exames laboratoriais, monitor ou PDF) e extraia os dados clínicos visíveis.

Regras:
- Tabela Tasy: use colunas Máxima/Mínima para sinais vitais, Total para volumes
- PDF de exames: extraia nome do exame e valor numérico
- Não invente valores. Deixe vazio se não visível.
- Coloque no sistema correto. Exames não listados nos sistemas vão em "extras"

Retorne EXATAMENTE este JSON (sem markdown, sem texto extra):
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
  "extras": [],
  "resumo": ""
}

O campo "extras" é uma lista de objetos para exames não categorizados:
[{"nome": "Nome do exame", "valor": "valor numérico com unidade", "sugestao": "Renal/Metabólico"}]

Exemplos de sistemas:
- Hemodinâmico: "FC 102-58 bpm / PAM 111-67 mmHg / sem DVA / Glic 179 mg/dL"
- Respiratório: "TQT / FiO2 25% / PEEP 8 cmH2O / Sat 100-94% / FR 30-14 rpm"
- Renal/Metabólico: "Cr 1,27 / Ur 47 / K 4,1 / Na 141 / BH +1508 mL / Diurese 3000 mL"
- Hematológico/Infeccioso: "Hb 7,5 / Leuco 14k / Bastões 4% / Plaq 251k"
- Gastrointestinal: "Dieta enteral 1340 mL / evacuação 21/04"`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } }
        ]}],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
      })
    });

    const rawText = await response.text();

    if (!response.ok) {
      console.error('Gemini error:', response.status, rawText.slice(0, 300));
      try {
        const e = JSON.parse(rawText);
        return res.status(502).json({ error: e.error?.message || `Gemini error ${response.status}` });
      } catch { return res.status(502).json({ error: `Gemini error ${response.status}` }); }
    }

    let geminiData;
    try { geminiData = JSON.parse(rawText); }
    catch { return res.status(500).json({ error: 'Resposta inválida do Gemini' }); }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Gemini text preview:', text.slice(0, 400));

    // Remove markdown
    let clean = text.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();

    // Tenta parsear
    const tryParse = (str) => {
      try { const p = JSON.parse(str); if (p.sistemas) return p; } catch {}
      return null;
    };

    let parsed = tryParse(clean);
    if (!parsed) {
      const m = clean.match(/\{[\s\S]*"sistemas"[\s\S]*\}/);
      if (m) parsed = tryParse(m[0]);
    }

    if (parsed) {
      if (!parsed.extras) parsed.extras = [];
      return res.status(200).json(parsed);
    }

    console.error('Parse failed. Raw:', clean.slice(0, 300));
    return res.status(200).json({
      sistemas: {"Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":""},
      extras: [],
      resumo: text.slice(0, 150)
    });

  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

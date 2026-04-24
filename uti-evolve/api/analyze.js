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

    const prompt = `Você é médico intensivista analisando uma tabela de controles de enfermagem do sistema Tasy (UTI).

A tabela tem:
- Primeira coluna: nome do parâmetro (Temp, FC, FR, PAS, PAD, PAM, Sat O2, Glic cap, FiO2, PEEP, Noradrenalina, Dieta Enteral, etc.)
- Segunda coluna: unidade de medida
- Colunas do meio: valores por horário
- Últimas colunas: Total, Máxima, Média, Mínima (use ESSAS para os valores)

Extraia os dados e monte a evolução no formato abaixo. Use os valores de Máxima e Mínima para mostrar a variação (ex: "FC 102-58 bpm"). Para BH use o Total de Ganhos menos o Total de Perdas.

Retorne SOMENTE JSON válido, sem markdown. Formato exato:
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

Preencha assim:
- Hemodinâmico: "FC máx-mín bpm / PAS máx-mín / PAM máx-mín mmHg / Noradrenalina Xml (total) / Glic cap máx-mín mg/dL"
- Respiratório: "FiO2 X% / PEEP X cmH2O / Sat O2 máx-mín% / FR máx-mín rpm / Disp acessório: [valor]"
- Renal/Metabólico: "Temp máx-mín °C / HD: X mL / BH: X mL / Ganhos: X mL / Perdas: X mL"
- Gastrointestinal: "Dieta Enteral: X mL total / Agua Enteral: X mL"
- Deixe vazio os sistemas sem dados visíveis na tabela`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } }
        ]}],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1500 }
      })
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error('Gemini error:', response.status, responseText);
      return res.status(502).json({ error: `Gemini API error ${response.status}`, details: responseText.slice(0, 300) });
    }

    const data = JSON.parse(responseText);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();

    try {
      return res.status(200).json(JSON.parse(clean));
    } catch {
      return res.status(200).json({
        sistemas: { "Neurológico":"","Respiratório":"","Hemodinâmico":"","Renal/Metabólico":"","Gastrointestinal":"","Hematológico/Infeccioso":"","Pele/Acessos":"" },
        metas_sugeridas: [],
        resumo: clean.slice(0, 500)
      });
    }

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}

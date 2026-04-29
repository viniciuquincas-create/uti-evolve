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
    if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY nao configurada no Vercel' });

    const SISTEMA_MAP = {
      'Neurologico':'Neurológico','Respiratorio':'Respiratório',
      'Hemodinamico':'Hemodinâmico','Renal_Metabolico':'Renal/Metabólico',
      'Gastrointestinal':'Gastrointestinal',
      'Hematologico_Infeccioso':'Hematológico/Infeccioso','Pele_Acessos':'Pele/Acessos'
    };

    function extractJSON(text) {
      let clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      try { return JSON.parse(clean); } catch {}
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try { return JSON.parse(clean.slice(start, end + 1)); } catch {}
      }
      return null;
    }

    const prompt = `Voce e medico intensivista. Analise esta imagem de sistema hospitalar e extraia dados clinicos. Retorne SOMENTE o JSON abaixo preenchido, sem texto adicional:

{"dataColeta":"YYYY-MM-DD","controles":{"c24_temp":"","c24_fc":"","c24_fr":"","c24_sat":"","c24_pam":"","c24_pas":"","c24_dextro":"","c24_diur":"","c24_bh":"","c24_dreno1":"","c24_dreno2":"","c24_dreno3":"","c24_sng":""},"sistemas":{"Neurologico":"","Respiratorio":"","Hemodinamico":"","Renal_Metabolico":"","Gastrointestinal":"","Hematologico_Infeccioso":"","Pele_Acessos":""},"exames":{},"resumo":""}

REGRAS controles - se tabela com colunas Total/Maxima/Media/Minima:
Sinais vitais use Minima e Maxima formato "min / max": c24_temp graus C, c24_fc bpm, c24_fr irpm, c24_sat %, c24_pam mmHg, c24_pas formato "PASmin-PASmax / PADmin-PADmax", c24_dextro se presente.
Balanco hidrico use coluna Total: c24_diur mL, c24_bh com sinal +/-, c24_dreno1/2/3 mL se presentes, c24_sng mL se presente.
Ausentes: string vazia. Sistemas: dados qualitativos. Exames: pares nome/valor. dataColeta: YYYY-MM-DD. resumo: frase curta.`;

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash-001', 'gemini-2.0-flash-lite'];
    const errors = [];

    for (const model of models) {
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } }
              ]}],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json'
              }
            })
          }
        );

        const bodyText = await r.text();
        if (!r.ok) { errors.push(`${model} HTTP ${r.status}: ${bodyText.slice(0,200)}`); continue; }

        const data = JSON.parse(bodyText);
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        const parsed = extractJSON(text);
        if (!parsed) { errors.push(`${model}: parse failed. Raw: ${text.slice(0,150)}`); continue; }

        if (parsed.sistemas) {
          const s = {};
          for (const [k,v] of Object.entries(parsed.sistemas)) s[SISTEMA_MAP[k]||k]=v;
          parsed.sistemas = s;
        }
        return res.status(200).json(parsed);

      } catch(e) { errors.push(`${model}: ${e.message}`); }
    }

    return res.status(502).json({ error: `Falha: ${errors.join(' | ')}` });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}

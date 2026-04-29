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
    if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no Vercel. Vá em Settings → Environment Variables.' });

    const prompt = `Voce e medico intensivista. Analise esta imagem de sistema hospitalar (Tasy, MV, monitor ou planilha de UTI) e extraia dados clinicos.

Retorne SOMENTE JSON valido, sem markdown:
{
  "dataColeta": "YYYY-MM-DD",
  "controles": {
    "c24_temp": "", "c24_fc": "", "c24_fr": "", "c24_sat": "",
    "c24_pam": "", "c24_pas": "", "c24_dextro": "",
    "c24_diur": "", "c24_bh": "", "c24_dreno1": "", "c24_dreno2": "", "c24_dreno3": "", "c24_sng": ""
  },
  "sistemas": {
    "Neurologico": "", "Respiratorio": "", "Hemodinamico": "",
    "Renal_Metabolico": "", "Gastrointestinal": "", "Hematologico_Infeccioso": "", "Pele_Acessos": ""
  },
  "exames": {},
  "resumo": ""
}

REGRAS controles - se tabela com colunas Total/Maxima/Media/Minima:
  Sinais vitais (use Minima e Maxima, formato "min / max"):
    c24_temp=temperatura, c24_fc=FC bpm, c24_fr=FR irpm, c24_sat=SpO2 %, c24_pam=PAM mmHg
    c24_pas=PAS e PAD formato "PASmin-PASmax / PADmin-PADmax" (ex: "123-141 / 65-76")
    c24_dextro=glicemia capilar se presente
  Balanco hidrico (use coluna Total):
    c24_diur=diurese mL, c24_bh=BH com sinal +/-, c24_dreno1/2/3=drenos mL, c24_sng=SNG mL
  Campos ausentes use string vazia.`;

    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro-vision'];
    const errors = [];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } }
            ]}],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
          })
        });

        const responseText = await response.text();

        if (!response.ok) {
          errors.push(`${model} (HTTP ${response.status}): ${responseText.slice(0, 300)}`);
          continue;
        }

        const data = JSON.parse(responseText);
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const clean = text.replace(/```json|```/g, '').trim();

        try {
          const parsed = JSON.parse(clean);
          // Normalize sistema keys back to accented versions
          if (parsed.sistemas) {
            const map = {
              'Neurologico':'Neurológico','Respiratorio':'Respiratório',
              'Hemodinamico':'Hemodinâmico','Renal_Metabolico':'Renal/Metabólico',
              'Gastrointestinal':'Gastrointestinal',
              'Hematologico_Infeccioso':'Hematológico/Infeccioso','Pele_Acessos':'Pele/Acessos'
            };
            const s = {};
            for (const [k, v] of Object.entries(parsed.sistemas)) s[map[k]||k] = v;
            parsed.sistemas = s;
          }
          return res.status(200).json(parsed);
        } catch {
          return res.status(200).json({ raw: text, error: 'parse_failed', model });
        }
      } catch (fetchErr) {
        errors.push(`${model}: ${fetchErr.message}`);
      }
    }

    return res.status(502).json({
      error: `Falha em todos os modelos Gemini. Detalhes: ${errors.join(' | ')}`
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

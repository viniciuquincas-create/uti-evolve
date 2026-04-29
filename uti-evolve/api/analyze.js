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
    if (!GEMINI_KEY) return res.status(500).json({ error: 'API key not configured' });

    const prompt = `Você é médico intensivista. Analise esta imagem de sistema hospitalar (Tasy, MV, monitor ou planilha de UTI) e extraia os dados clínicos conforme as regras abaixo.

Retorne SOMENTE JSON válido, sem markdown, sem texto extra:
{
  "dataColeta": "YYYY-MM-DD",
  "controles": {
    "c24_temp":   "",
    "c24_fc":     "",
    "c24_fr":     "",
    "c24_sat":    "",
    "c24_pam":    "",
    "c24_pas":    "",
    "c24_dextro": "",
    "c24_diur":   "",
    "c24_bh":     "",
    "c24_dreno1": "",
    "c24_dreno2": "",
    "c24_dreno3": "",
    "c24_sng":    ""
  },
  "sistemas": {
    "Neurologico": "",
    "Respiratorio": "",
    "Hemodinamico": "",
    "Renal_Metabolico": "",
    "Gastrointestinal": "",
    "Hematologico_Infeccioso": "",
    "Pele_Acessos": ""
  },
  "exames": {},
  "resumo": ""
}

REGRAS para "controles":
Se a imagem mostrar tabela com colunas Total / Maxima / Media / Minima:
  SINAIS VITAIS - use Minima e Maxima, formato "min / max":
  - c24_temp: temperatura "min / max" em graus C (ex: "35.8 / 37.3")
  - c24_fc: FC bpm "min / max" (ex: "78 / 99")
  - c24_fr: FR irpm "min / max" (ex: "18 / 24")
  - c24_sat: SpO2 percent "min / max" (ex: "96 / 100")
  - c24_pam: PAM mmHg "min / max" (ex: "84 / 96")
  - c24_pas: PAS e PAD formato "PASmin-PASmax / PADmin-PADmax" (ex: "123-141 / 65-76")
  - c24_dextro: glicemia capilar "min / max" se presente (ex: "95 / 180")
  BALANCO HIDRICO - use coluna Total:
  - c24_diur: diurese total em mL (ex: "2850")
  - c24_bh: balanco hidrico com sinal (ex: "+450" ou "-200")
  - c24_dreno1, c24_dreno2, c24_dreno3: volume total de drenos em mL se presentes
  - c24_sng: residuo gastrico SNG total em mL se presente
  Se parametro ausente use string vazia.

REGRAS para "sistemas": apenas dados qualitativos (gasometria, modos VM, drogas, labs). Nao repetir dados de controles.
REGRAS para "exames": pares nome/valor de exames laboratoriais encontrados.
dataColeta: data dos dados YYYY-MM-DD, se nao encontrar use string vazia.
resumo: frase curta sobre o conteudo da imagem.`;

    // Try models in order of preference
    const models = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-pro-vision',
    ];

    let lastError = null;

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } }
              ]}],
              generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
            })
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          lastError = `${model}: HTTP ${response.status} - ${errText.slice(0, 200)}`;
          continue; // try next model
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const clean = text.replace(/```json|```/g, '').trim();

        try {
          const parsed = JSON.parse(clean);
          // Normalize sistema keys (with accents) back
          if (parsed.sistemas) {
            const map = {
              'Neurologico': 'Neurológico',
              'Respiratorio': 'Respiratório',
              'Hemodinamico': 'Hemodinâmico',
              'Renal_Metabolico': 'Renal/Metabólico',
              'Gastrointestinal': 'Gastrointestinal',
              'Hematologico_Infeccioso': 'Hematológico/Infeccioso',
              'Pele_Acessos': 'Pele/Acessos',
            };
            const s = {};
            for (const [k, v] of Object.entries(parsed.sistemas)) {
              s[map[k] || k] = v;
            }
            parsed.sistemas = s;
          }
          return res.status(200).json(parsed);
        } catch {
          return res.status(200).json({ raw: text, error: 'parse_failed', model });
        }
      } catch (fetchErr) {
        lastError = `${model}: ${fetchErr.message}`;
        continue;
      }
    }

    // All models failed
    return res.status(502).json({ error: 'All Gemini models failed', details: lastError });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

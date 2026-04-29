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
    "Neurológico": "",
    "Respiratório": "",
    "Hemodinâmico": "",
    "Renal/Metabólico": "",
    "Gastrointestinal": "",
    "Hematológico/Infeccioso": "",
    "Pele/Acessos": ""
  },
  "exames": {},
  "resumo": ""
}

REGRAS OBRIGATÓRIAS para o campo "controles":

Se a imagem for uma tabela de parâmetros do Tasy/MV com colunas (Total, Máxima, Média, Mínima):

  SINAIS VITAIS — use Mínima e Máxima, formato "mín / máx":
  - c24_temp:   temperatura → "mín / máx" em °C  (ex: "35.8 / 37.3")
  - c24_fc:     FC bpm      → "mín / máx"        (ex: "78 / 99")
  - c24_fr:     FR irpm     → "mín / máx"        (ex: "18 / 24")
  - c24_sat:    SpO2/SatO2  → "mín / máx" em %   (ex: "96 / 100")
  - c24_pam:    PAM mmHg    → "mín / máx"        (ex: "84 / 96")
  - c24_pas:    PAS/PAD     → "PAS mín-máx / PAD mín-máx" (ex: "123-141 / 65-76")
  - c24_dextro: Glic cap/dextro → "mín / máx"   (ex: "95 / 180"), se não houver deixe ""

  BALANÇO HÍDRICO — use coluna Total:
  - c24_diur:   Diurese total mL    (ex: "2850")
  - c24_bh:     Balanço hídrico mL, inclua sinal (ex: "+450" ou "-200")
  - c24_dreno1: Volume total dreno 1 mL, se houver (ex: "120")
  - c24_dreno2: Volume total dreno 2 mL, se houver (ex: "80")
  - c24_dreno3: Volume total dreno 3 mL, se houver (ex: "")
  - c24_sng:    Resíduo gástrico/SNG total mL, se houver (ex: "30")

  Se algum parâmetro não estiver na imagem, use "".

Para o campo "sistemas": use apenas dados qualitativos/clínicos (gasometria, modos ventilatórios, drogas, exames laboratoriais). Não repita dados já em "controles".

Para o campo "exames": pares nome/valor de exames laboratoriais encontrados (ex: {"Hb":"10.2","K":"4.1"}).

dataColeta: data dos dados (YYYY-MM-DD). Se não encontrar, "".
resumo: frase curta descrevendo o conteúdo da imagem.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
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
      const err = await response.text();
      return res.status(502).json({ error: 'Gemini error', details: err });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    try {
      return res.status(200).json(JSON.parse(clean));
    } catch {
      return res.status(200).json({ raw: text, error: 'parse_failed' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

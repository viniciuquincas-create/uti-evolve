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

REGRAS para controles - se tabela com colunas Total/Maxima/Media/Minima:
  Sinais vitais (use Minima e Maxima, formato "min / max"):
    c24_temp=temperatura "min / max" graus C (ex: "35.8 / 37.3")
    c24_fc=FC bpm "min / max" (ex: "78 / 99")
    c24_fr=FR irpm "min / max" (ex: "18 / 24")
    c24_sat=SpO2 % "min / max" (ex: "96 / 100")
    c24_pam=PAM mmHg "min / max" (ex: "84 / 96")
    c24_pas=PAS e PAD formato "PASmin-PASmax / PADmin-PADmax" (ex: "123-141 / 65-76")
    c24_dextro=glicemia capilar "min / max" se presente
  Balanco hidrico (use coluna Total):
    c24_diur=diurese total mL (ex: "2850")
    c24_bh=BH com sinal +/- (ex: "+450" ou "-200")
    c24_dreno1/2/3=volume total drenos mL se presentes
    c24_sng=residuo gastrico SNG total mL se presente
  Campos ausentes = string vazia.
REGRAS sistemas: dados qualitativos (gasometria, modos VM, drogas, labs). Nao repetir controles.
REGRAS exames: pares nome/valor de labs encontrados.
dataColeta: data YYYY-MM-DD, se ausente string vazia.
resumo: frase curta sobre o conteudo.`;

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
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
              generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
            })
          }
        );

        const bodyText = await r.text();
        if (!r.ok) { errors.push(`${model} HTTP ${r.status}: ${bodyText.slice(0,200)}`); continue; }

        const data = JSON.parse(bodyText);
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const clean = text.replace(/```json|```/g, '').trim();

        try {
          const parsed = JSON.parse(clean);
          if (parsed.sistemas) {
            const map = {
              'Neurologico':'Neurológico','Respiratorio':'Respiratório',
              'Hemodinamico':'Hemodinâmico','Renal_Metabolico':'Renal/Metabólico',
              'Gastrointestinal':'Gastrointestinal',
              'Hematologico_Infeccioso':'Hematológico/Infeccioso','Pele_Acessos':'Pele/Acessos'
            };
            const s = {};
            for (const [k,v] of Object.entries(parsed.sistemas)) s[map[k]||k]=v;
            parsed.sistemas = s;
          }
          return res.status(200).json(parsed);
        } catch {
          return res.status(200).json({ raw: text, error: 'parse_failed', model });
        }
      } catch(e) { errors.push(`${model}: ${e.message}`); }
    }

    return res.status(502).json({ error: `Falha: ${errors.join(' | ')}` });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}

// WhatsApp webhook — sem dependências externas (só fetch nativo)
const GEMINI_KEY   = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_BASE  = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_KEY   = process.env.TWILIO_API_KEY_SID;
const TWILIO_SEC   = process.env.TWILIO_API_KEY_SECRET;
const TWILIO_FROM  = process.env.TWILIO_WHATSAPP_FROM;

// ── Supabase REST helper ───────────────────────────────────────────────────
async function sbGet(table, filters = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*${filters}&limit=200`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return res.json();
}

async function sbPatch(table, id, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

// ── Parse message via Gemini ──────────────────────────────────────────────
async function parseMessage(msg) {
  const prompt = `Você é um assistente de UTI. Interprete a mensagem e extraia dados clínicos estruturados.

MENSAGEM: "${msg}"

Retorne APENAS JSON válido (omita campos ausentes):
{
  "leito": "número ou nome do leito (string)",
  "drogasVazao": { "chave_droga": "vazão_mL_h" },
  "vm_modo": "um de: vm_psv, vm_pcv, vm_vcv, vni, cnaf, cn, ms, ar",
  "vm_ps": "cmH2O",
  "vm_peep": "cmH2O",
  "vm_fio2": "percentual sem % (ex: 40)",
  "vm_fr": "ipm",
  "vm_vt": "mL",
  "vm_pplat": "cmH2O",
  "glicemia": "mg/dL",
  "temp": "Celsius",
  "fc": "bpm",
  "pas": "mmHg",
  "pad": "mmHg"
}

Regras:
- nora=noradrenalina, ad=adrenalina, dob=dobutamina, vaso=vasopressina
- prop=propofol, mid=midazolam, fent=fentanil, ket=cetamina, prec=precedex
- cloni=clonidina, furo=furosemida, ins=insulina, levo=levossimendana
- psv=vm_psv, pcv=vm_pcv, vcv=vm_vcv
- fi/fio2=FiO2, ps=pressure support, peep=PEEP, vt/vc=volume corrente
- Se não souber o leito, use "desconhecido"
- Retorne APENAS o JSON, sem markdown, sem explicações`;

  const resp = await fetch(GEMINI_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await resp.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── Find leito in Supabase ─────────────────────────────────────────────────
async function findAndUpdateLeito(leitoNum, parsed) {
  const rows = await sbGet("leitos");
  if (!rows || !rows.length) return null;

  const num = leitoNum.toLowerCase().replace(/leito\s*/i, "").trim();
  let target = rows.find(r => {
    const d = typeof r.data === "string" ? JSON.parse(r.data || "{}") : (r.data || {});
    const nome = (d.nome || r.nome || "").toLowerCase().replace(/leito\s*/i, "").trim();
    return nome === num;
  }) || rows[0];

  const current = typeof target.data === "string"
    ? JSON.parse(target.data || "{}")
    : (target.data || {});

  // Merge drogasVazao
  const drogasVazao = { ...(current.drogasVazao || {}), ...(parsed.drogasVazao || {}) };
  const patch = { ...current, drogasVazao };

  // VM fields
  ["vm_modo","vm_ps","vm_peep","vm_fio2","vm_fr","vm_vt","vm_pplat"].forEach(k => {
    if (parsed[k]) patch[k] = parsed[k];
  });

  await sbPatch("leitos", target.id, { data: patch });
  return { leito: current.nome || leitoNum, patch };
}

// ── Reply via Twilio ───────────────────────────────────────────────────────
async function replyWhatsapp(to, body) {
  const auth = Buffer.from(`${TWILIO_KEY}:${TWILIO_SEC}`).toString("base64");
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const params = new URLSearchParams({ From: TWILIO_FROM, To: to, Body: body });
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
}

// ── Build summary for reply ─────────────────────────────────────────────────
function buildSummary(leitoNome, parsed) {
  const lines = [`✅ *Leito ${leitoNome}* atualizado`];

  if (parsed.drogasVazao && Object.keys(parsed.drogasVazao).length) {
    const drogas = Object.entries(parsed.drogasVazao)
      .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}mL/h`)
      .join(" · ");
    lines.push(drogas);
  }

  if (parsed.vm_modo) {
    const modeLabel = {
      vm_psv: "PSV", vm_pcv: "PCV", vm_vcv: "VCV",
      vni: "VNI", cnaf: "CNAF", cn: "Cateter nasal", ar: "Ar ambiente",
    };
    let vm = modeLabel[parsed.vm_modo] || parsed.vm_modo;
    if (parsed.vm_ps)   vm += ` PS ${parsed.vm_ps}`;
    if (parsed.vm_peep) vm += ` PEEP ${parsed.vm_peep}`;
    if (parsed.vm_fio2) vm += ` FiO₂ ${parsed.vm_fio2}%`;
    if (parsed.vm_fr)   vm += ` FR ${parsed.vm_fr}`;
    lines.push(vm);
  }

  const vitais = [
    parsed.fc       && `FC ${parsed.fc}`,
    parsed.glicemia && `Dextro ${parsed.glicemia}`,
    parsed.temp     && `T ${parsed.temp}°C`,
  ].filter(Boolean).join(" · ");
  if (vitais) lines.push(vitais);

  return lines.join("\n");
}

// ── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(200).send("<Response/>");
  }

  const from = req.body?.From || "";
  const msg  = (req.body?.Body || "").trim();
  if (!msg) return res.status(200).send("<Response/>");

  console.log(`WhatsApp from ${from}: ${msg}`);

  try {
    const parsed = await parseMessage(msg);
    console.log("Parsed:", JSON.stringify(parsed));

    if (!parsed.leito || parsed.leito === "desconhecido") {
      await replyWhatsapp(from,
        '❓ Não entendi o leito. Exemplo:\n"Leito 1, nora 20, propofol 10, psv ps 10 peep 6 fi 40"'
      );
      return res.status(200).send("<Response/>");
    }

    const result = await findAndUpdateLeito(parsed.leito, parsed);
    const summary = buildSummary(result?.leito || parsed.leito, parsed);
    await replyWhatsapp(from, summary);
  } catch (err) {
    console.error("Webhook error:", err.message);
    await replyWhatsapp(from, `⚠️ Erro: ${err.message}`);
  }

  return res.status(200).send("<Response/>");
}

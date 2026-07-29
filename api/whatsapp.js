// WhatsApp webhook — UTI Evolve
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, msg: "WhatsApp webhook online" });
  }

  if (req.method !== "POST") {
    return res.status(200).send("<Response/>");
  }

  const from = req.body?.From || "";
  const msg  = (req.body?.Body || "").trim();

  console.log("WhatsApp webhook received:", { from, msg });

  // Parse, update Supabase, reply via Twilio
  try {
    const parsed = await parseMsg(msg);
    const leitoNome = await updateLeito(parsed);
    await reply(from, buildSummary(leitoNome, parsed));
  } catch (err) {
    console.error("Webhook error:", err.message, err.stack);
    await reply(from, "⚠️ Erro interno. Tente novamente.");
  }

  return res.status(200).send("<Response/>");
}

async function parseMsg(msg) {
  const key = process.env.GEMINI_API_KEY;
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const prompt = `Interprete a mensagem de UTI e retorne APENAS JSON válido (sem markdown):
{"leito":"string","drogasVazao":{"chave":"mL_h"},"vm_modo":"vm_psv|vm_pcv|vm_vcv|vni|cnaf|cn|ar","vm_ps":"","vm_peep":"","vm_fio2":"","vm_fr":"","vm_vt":""}

Aliases: nora=noradrenalina,ad=adrenalina,dob=dobutamina,vaso=vasopressina,prop=propofol,mid=midazolam,fent=fentanil,ket=cetamina,prec=precedex,psv=vm_psv,pcv=vm_pcv,vcv=vm_vcv,fi/fio2=vm_fio2,ps=vm_ps,peep=vm_peep,vt/vc=vm_vt

MENSAGEM: ${JSON.stringify(msg)}`;
  const r = await fetch(url, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
  const d = await r.json();
  const raw = d?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return JSON.parse(raw.replace(/```json|```/g,"").trim());
}

async function updateLeito(parsed) {
  if (!parsed.leito || parsed.leito === "desconhecido") return "?";
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_KEY;
  const heads = {apikey:SB_KEY, Authorization:`Bearer ${SB_KEY}`, "Content-Type":"application/json", Prefer:"return=minimal"};
  // Fetch all leitos
  const r = await fetch(`${SB_URL}/rest/v1/leitos?select=id,data&limit=100`, {headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`}});
  const rows = await r.json();
  if (!rows?.length) return parsed.leito;
  const num = parsed.leito.toLowerCase().replace(/leito\s*/i,"").trim();
  const target = rows.find(row => {
    const d = typeof row.data==="string" ? JSON.parse(row.data||"{}") : (row.data||{});
    return (d.nome||"").toLowerCase().replace(/leito\s*/i,"").trim() === num;
  }) || rows[0];
  const cur = typeof target.data==="string" ? JSON.parse(target.data||"{}") : (target.data||{});
  const patch = {...cur, drogasVazao:{...(cur.drogasVazao||{}),...(parsed.drogasVazao||{})}};
  ["vm_modo","vm_ps","vm_peep","vm_fio2","vm_fr","vm_vt"].forEach(k=>{if(parsed[k])patch[k]=parsed[k];});
  await fetch(`${SB_URL}/rest/v1/leitos?id=eq.${target.id}`, {method:"PATCH",headers:heads,body:JSON.stringify({data:patch})});
  return cur.nome || parsed.leito;
}

async function reply(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const key = process.env.TWILIO_API_KEY_SID;
  const sec = process.env.TWILIO_API_KEY_SECRET;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const auth = Buffer.from(`${key}:${sec}`).toString("base64");
  const params = new URLSearchParams({From:from, To:to, Body:body});
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method:"POST",
    headers:{Authorization:`Basic ${auth}`,"Content-Type":"application/x-www-form-urlencoded"},
    body:params.toString()
  });
}

function buildSummary(leitoNome, parsed) {
  const lines = [`✅ *Leito ${leitoNome}* atualizado`];
  if (parsed.drogasVazao) {
    const d = Object.entries(parsed.drogasVazao).map(([k,v])=>`${k.charAt(0).toUpperCase()+k.slice(1)} ${v}mL/h`).join(" · ");
    if (d) lines.push(d);
  }
  if (parsed.vm_modo) {
    const m = {vm_psv:"PSV",vm_pcv:"PCV",vm_vcv:"VCV",vni:"VNI",cnaf:"CNAF",cn:"Cateter nasal",ar:"Ar ambiente"};
    let vm = m[parsed.vm_modo]||parsed.vm_modo;
    if (parsed.vm_ps) vm += ` PS ${parsed.vm_ps}`;
    if (parsed.vm_peep) vm += ` PEEP ${parsed.vm_peep}`;
    if (parsed.vm_fio2) vm += ` FiO₂ ${parsed.vm_fio2}%`;
    lines.push(vm);
  }
  return lines.join("\n");
}

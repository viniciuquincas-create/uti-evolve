import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";
import { applyCommandToLeitos, describeUpdates, normalizeText, parseWhatsappCommand } from "../lib/whatsapp-command.js";

const xmlEscape = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const twiml = (message) => `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xmlEscape(message)}</Message></Response>`;
function reply(res, status, message) {
  res.status(status);
  res.setHeader("Content-Type", "text/xml; charset=utf-8");
  return res.send(twiml(message));
}

function requestUrl(req) {
  if (process.env.TWILIO_WEBHOOK_URL) return process.env.TWILIO_WEBHOOK_URL;
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return `${proto}://${host}${req.url}`;
}

function senderAllowed(from) {
  const allowed = String(process.env.WHATSAPP_ALLOWED_SENDERS || "")
    .split(",")
    .map((item) => normalizeText(item).replace(/^whatsapp:/, ""))
    .filter(Boolean);
  return allowed.length > 0 && allowed.includes(normalizeText(from).replace(/^whatsapp:/, ""));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const params = typeof req.body === "string"
    ? Object.fromEntries(new URLSearchParams(req.body))
    : (req.body || {});
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers["x-twilio-signature"];
  if (!authToken) return reply(res, 503, "Integração indisponível: TWILIO_AUTH_TOKEN não configurado.");
  if (!twilio.validateRequest(authToken, signature || "", requestUrl(req), params)) {
    return reply(res, 403, "Requisição Twilio inválida.");
  }

  if (!senderAllowed(params.From)) return reply(res, 403, "Número de WhatsApp não autorizado para lançar dados.");

  const command = parseWhatsappCommand(params.Body || "");
  if (!command.bedNumber) return reply(res, 400, "Não identifiquei o leito. Exemplo: Leito 1, nora 20, propofol 10, psv, ps 10, fi 30, peep 6");
  if (!Object.keys(command.updates).length) return reply(res, 400, "Não identifiquei dados para lançar. Use campos separados por vírgulas.");

  const supabaseUrl = process.env.SUPABASE_URL || "https://scuqankwjemqmtjwgema.supabase.co";
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseSecret) return reply(res, 503, "Integração indisponível: chave secreta do Supabase não configurada.");

  try {
    const admin = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession:false, autoRefreshToken:false } });
    const { data, error } = await admin.from("config").select("value").eq("key", "leitos_data").single();
    if (error) throw error;
    const leitos = JSON.parse(data?.value || "[]");
    const result = applyCommandToLeitos(leitos, command);
    if (result.error) return reply(res, 400, result.error);

    const { error: saveError } = await admin.from("config").upsert({ key:"leitos_data", value:JSON.stringify(result.updatedLeitos) });
    if (saveError) throw saveError;

    const summary = describeUpdates(command.updates).join(", ");
    const ignored = command.unknown.length ? ` Não reconhecido: ${command.unknown.join(", ")}.` : "";
    return reply(res, 200, `✅ Lançado em ${result.updatedBed.nome} — ${result.updatedBed.paciente}: ${summary}.${ignored}`);
  } catch (error) {
    console.error("WhatsApp webhook error", error?.message || error);
    return reply(res, 500, "Não foi possível salvar os dados. Nenhum lançamento foi confirmado.");
  }
}

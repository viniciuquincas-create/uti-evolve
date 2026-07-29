import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export function json(res,status,payload) {
  res.status(status);
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  return res.json(payload);
}

export function requireApiKey(req,res) {
  const expected=String(process.env.CHATGPT_INTEGRATION_SECRET || "");
  const supplied=String(req.headers.authorization || "").replace(/^Bearer\s+/i,"");
  if (!expected) { json(res,503,{ok:false,error:"Integração ChatGPT não configurada"}); return false; }
  const a=Buffer.from(supplied); const b=Buffer.from(expected);
  if (!supplied || a.length!==b.length || !crypto.timingSafeEqual(a,b)) { json(res,401,{ok:false,error:"Não autorizado"}); return false; }
  return true;
}

export function supabaseAdmin() {
  const url=process.env.SUPABASE_URL || "https://scuqankwjemqmtjwgema.supabase.co";
  const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!key) throw new Error("Chave secreta do Supabase não configurada");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function readConfig(admin,key) {
  const {data,error}=await admin.from("config").select("value").eq("key",key).maybeSingle();
  if (error) throw error;
  return data?.value;
}
export async function writeConfig(admin,key,value) {
  const {error}=await admin.from("config").upsert({key,value:typeof value==="string"?value:JSON.stringify(value)});
  if (error) throw error;
}

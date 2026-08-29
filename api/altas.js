import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { parsePlanilhaAltas } from "../lib/alta-sheet-parser.js";

const b64url=value=>Buffer.from(value).toString("base64url");
function credentials(){
  let email=String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL||"").trim();
  let raw=String(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY||"").trim();
  if(raw.startsWith("{")&&raw.endsWith("}")){try{const j=JSON.parse(raw);email=email||j.client_email;raw=j.private_key||raw;}catch{}}
  if((raw.startsWith('"')&&raw.endsWith('"'))||(raw.startsWith("'")&&raw.endsWith("'")))raw=raw.slice(1,-1);
  if(raw&&!raw.includes("BEGIN PRIVATE KEY")){try{const decoded=Buffer.from(raw,"base64").toString("utf8").trim();if(decoded.includes("BEGIN PRIVATE KEY"))raw=decoded;}catch{}}
  raw=raw.replace(/\\r/g,"").replace(/\\n/g,"\n").replace(/\r/g,"").trim();
  const pem=raw.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
  if(pem){const body=pem[1].replace(/\s+/g,"");raw=`-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g)?.join("\n")||body}\n-----END PRIVATE KEY-----`;}
  return {email:String(email||"").trim(),privateKey:raw};
}
async function googleToken(){
  const {email,privateKey}=credentials();
  if(!email||!privateKey)throw new Error("A integração Google Drive não foi configurada no servidor.");
  const now=Math.floor(Date.now()/1000),head=b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const body=b64url(JSON.stringify({iss:email,scope:"https://www.googleapis.com/auth/drive.readonly",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600}));
  const unsigned=`${head}.${body}`;let signature;
  try{signature=crypto.sign("RSA-SHA256",Buffer.from(unsigned),privateKey).toString("base64url");}catch{throw new Error("A chave privada do Google está em formato inválido.");}
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:`${unsigned}.${signature}`})});
  if(!response.ok)throw new Error("Não foi possível autenticar no Google Drive.");
  return (await response.json()).access_token;
}
async function authorize(req){
  const session=String(req.headers["x-uti-session"]||""),url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!session||!url||!key)return false;
  const db=createClient(url,key,{auth:{persistSession:false}}),{data,error}=await db.from("config").select("value").eq("key","pwd_hash").single();
  if(error||!data?.value)return false;const a=Buffer.from(session),b=Buffer.from(String(data.value));return a.length===b.length&&crypto.timingSafeEqual(a,b);
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Método não permitido"});
  try{
    if(!await authorize(req))return res.status(401).json({error:"Sessão inválida. Entre novamente no UTI Evolve."});
    const url=String(req.body?.url||""),id=url.match(/\/d\/([\w-]+)/)?.[1];
    if(!id||!/^https:\/\/docs\.google\.com\/spreadsheets\//i.test(url))return res.status(400).json({error:"Informe um link válido do Google Sheets."});
    const token=await googleToken(),headers={authorization:`Bearer ${token}`};
    const meta=await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=name,mimeType,modifiedTime&supportsAllDrives=true`,{headers});
    if(!meta.ok){const email=credentials().email;throw new Error(`A planilha não está acessível para ${email}. Compartilhe-a com a conta de integração.`);}
    const info=await meta.json();
    const file=await fetch(`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=text%2Fcsv`,{headers});
    if(!file.ok)throw new Error("Não foi possível exportar a planilha de altas.");
    const registros=parsePlanilhaAltas(await file.text());
    return res.status(200).json({source:{id,name:info.name,modifiedTime:info.modifiedTime},registros});
  }catch(error){return res.status(500).json({error:error?.message||"Falha ao ler a planilha de altas."});}
}

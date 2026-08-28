import crypto from "node:crypto";
import mammoth from "mammoth";
import { createClient } from "@supabase/supabase-js";
import { parseSbari } from "../lib/sbari-parser.js";

const b64url = value => Buffer.from(value).toString("base64url");
function readGoogleCredentials(){
  let email=String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL||"").trim();
  let raw=String(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY||"").trim();
  if(raw.startsWith("{")&&raw.endsWith("}")){
    try{const json=JSON.parse(raw);email=email||String(json.client_email||"").trim();raw=String(json.private_key||"").trim();}catch{}
  }
  if((raw.startsWith('"')&&raw.endsWith('"'))||(raw.startsWith("'")&&raw.endsWith("'")))raw=raw.slice(1,-1);
  raw=raw.replace(/\\r/g,"").replace(/\\n/g,"\n").replace(/\r/g,"").trim();
  const pem=raw.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
  if(pem){
    const body=pem[1].replace(/\s+/g,"");
    if(body)raw=`-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g)?.join("\n")||body}\n-----END PRIVATE KEY-----`;
  }
  if(raw&&!raw.includes("BEGIN PRIVATE KEY")){
    try{const decoded=Buffer.from(raw,"base64").toString("utf8").trim();if(decoded.includes("BEGIN PRIVATE KEY"))raw=decoded;}catch{}
  }
  return {email,privateKey:raw};
}
async function serviceToken() {
  const {email,privateKey}=readGoogleCredentials();
  if(!email||!privateKey)return null;
  const now=Math.floor(Date.now()/1000);
  const head=b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const body=b64url(JSON.stringify({iss:email,scope:"https://www.googleapis.com/auth/drive.readonly",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600}));
  const unsigned=`${head}.${body}`;
  let signature;
  try{signature=crypto.sign("RSA-SHA256",Buffer.from(unsigned),privateKey).toString("base64url");}
  catch{throw new Error("A chave privada do Google está em formato inválido. Cole o valor completo de private_key do JSON, incluindo BEGIN e END PRIVATE KEY.");}
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:`${unsigned}.${signature}`})});
  if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(`Não foi possível autenticar no Google Drive${detail.error?` (${detail.error})`:""}. Confirme se o e-mail e a chave pertencem à mesma Service Account.`);}
  return (await response.json()).access_token;
}

async function downloadDrive(url) {
  const id=url.match(/\/d\/([\w-]+)/)?.[1]||url.match(/[?&]id=([\w-]+)/)?.[1];
  const resourceKey=url.match(/[?&]resourcekey=([^&#]+)/i)?.[1];
  if(!id)throw new Error("Link do Google Drive inválido.");
  const token=await serviceToken();
  if(!token){
    const publicRes=await fetch(`https://docs.google.com/document/d/${id}/export?format=txt`,{redirect:"follow"});
    if(!publicRes.ok)throw new Error("O SBARI não está público e a integração Google Drive ainda não foi configurada no servidor.");
    const buffer=Buffer.from(await publicRes.arrayBuffer());
    if(buffer.length>10_000_000)throw new Error("O arquivo SBARI excede o limite de 10 MB.");
    const text=buffer.toString("utf8");
    if(!text.trim()||/<html[\s>]/i.test(text))throw new Error("O SBARI não está público e a integração Google Drive ainda não foi configurada no servidor.");
    return {text,name:"SBARI público",id};
  }
  const headers={authorization:`Bearer ${token}`,...(resourceKey?{"X-Goog-Drive-Resource-Keys":`${id}/${decodeURIComponent(resourceKey)}`}:{})};
  const metaRes=await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=name,mimeType&supportsAllDrives=true`,{headers});
  if(!metaRes.ok){
    const googleError=await metaRes.json().catch(()=>({}));
    const reason=googleError?.error?.errors?.[0]?.reason||"";
    const email=readGoogleCredentials().email;
    if(metaRes.status===403)throw new Error(`O Google Drive recusou o acesso (${reason||"403"}). Confirme que a Drive API está ativa no projeto da Service Account ${email}.`);
    if(metaRes.status===404)throw new Error(`O documento não está acessível para ${email}. Confirme se este é exatamente o e-mail compartilhado e se o link corresponde ao documento correto.`);
    throw new Error(`Falha do Google Drive (${metaRes.status}${reason?` · ${reason}`:""}).`);
  }
  const meta=await metaRes.json();
  const native=meta.mimeType==="application/vnd.google-apps.document";
  // Não use o endpoint /document/.../export em arquivos .docx. Ele pode
  // responder 200 com apenas uma parte do documento convertido. Primeiro
  // consultamos o MIME real e baixamos Office pelo Drive para o Mammoth.
  const fileRes=await fetch(native?`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=text/plain`:`https://www.googleapis.com/drive/v3/files/${id}?alt=media`,{headers});
  if(!fileRes.ok)throw new Error("Não foi possível baixar o SBARI.");
  const buffer=Buffer.from(await fileRes.arrayBuffer());
  if(buffer.length>10_000_000)throw new Error("O arquivo SBARI excede o limite de 10 MB.");
  const text=native||meta.mimeType.startsWith("text/")?buffer.toString("utf8"):(await mammoth.extractRawText({buffer})).value;
  if(text.length>1_000_000)throw new Error("O conteúdo do SBARI excede o limite permitido.");
  return {text,name:meta.name,id};
}

async function authorize(req){
  const session=String(req.headers["x-uti-session"]||"");
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!session||!url||!key)return false;
  const db=createClient(url,key,{auth:{persistSession:false}});
  const {data,error}=await db.from("config").select("value").eq("key","pwd_hash").single();
  if(error||!data?.value)return false;
  const a=Buffer.from(session),b=Buffer.from(String(data.value));
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Método não permitido"});
  try{
    if(!await authorize(req))return res.status(401).json({error:"Sessão inválida. Entre novamente no UTI Evolve."});
    const {url}=req.body||{};
    if(!url||!/^https:\/\/(?:docs|drive)\.google\.com\//i.test(url))return res.status(400).json({error:"Informe um link válido do Google Drive."});
    const file=await downloadDrive(url);
    const registros=parseSbari(file.text);
    const pacientes=registros.filter(p=>!p.vago);
    const leitosVagos=registros.filter(p=>p.vago).map(p=>({leito:p.leito,numero:p.numero}));
    if(!registros.length)throw new Error("Nenhum leito foi identificado no formato Leito XX: Nome.");
    return res.status(200).json({source:{id:file.id,name:file.name},pacientes,leitosVagos});
  }catch(error){return res.status(500).json({error:error?.message||"Falha ao interpretar SBARI."});}
}

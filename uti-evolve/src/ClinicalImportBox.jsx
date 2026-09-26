import React,{useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {dataLocal,validarDataImportacao,parsearEntradaClinica,normalizarDadosExtraidos,tipoArquivoClinico} from "./clinical-import.js";
const base64=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]);r.onerror=()=>reject(new Error("Não foi possível ler o arquivo."));r.readAsDataURL(file);});
export default function ClinicalImportBox({T,destino,minimizada,onMinimize,onRestore,onClose,onSave}){
  const [texto,setTexto]=useState(""),[arquivo,setArquivo]=useState(null),[data,setData]=useState(dataLocal),[dataEditada,setDataEditada]=useState(false),[erro,setErro]=useState(""),[busy,setBusy]=useState(false);
  const input=useRef(null),fileInput=useRef(null),emAndamento=useRef(false),request=useRef(null),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort();};},[]);
  useEffect(()=>{if(!minimizada)input.current?.focus({preventScroll:true});},[minimizada]);
  const anexar=files=>{
    if(emAndamento.current)return;
    if(files.length!==1){setErro("Anexe um arquivo por vez.");return;}
    try{tipoArquivoClinico(files[0]);setArquivo(files[0]);setErro("");input.current?.focus();}catch(e){setErro(e.message);}
  };
  const lancar=async()=>{
    if(emAndamento.current||(!texto.trim()&&!arquivo))return;
    emAndamento.current=true;setBusy(true);setErro("");
    try{
      validarDataImportacao(data);
      let entrada=texto,binario=null;
      if(arquivo){const mime=tipoArquivoClinico(arquivo);if(mime.startsWith("text/"))entrada=[texto,await arquivo.text()].filter(Boolean).join("\n");else binario={fileBase64:await base64(arquivo),mimeType:mime};}
      if(entrada.length>50000)throw new Error("Envie até 50 mil caracteres por lançamento.");
      let resultado;
      const parsed=binario?null:parsearEntradaClinica(entrada);
      if(parsed&&!parsed.pendencias.length&&Object.keys(parsed.valores).length)resultado={valores:parsed.valores,data};
      else{
        request.current=new AbortController();
        const response=await fetch("/api/import-clinical",{method:"POST",headers:{"Content-Type":"application/json","x-uti-session":sessionStorage.getItem("uti_session_hash")||""},body:JSON.stringify({text:entrada,...binario}),signal:request.current.signal});
        const payload=await response.json().catch(()=>({error:"Não foi possível ler a resposta. Tente novamente."}));
        if(!response.ok||payload.error)throw new Error(payload.error||"Não foi possível reconhecer os dados.");
        resultado=normalizarDadosExtraidos(payload);
        resultado.data=dataEditada?data:(resultado.data||data);
      }
      if(!Object.keys(resultado.valores).length)throw new Error("Nenhum exame ou controle reconhecido. Confira o texto ou envie uma imagem mais nítida.");
      if(!mounted.current)return;
      await onSave(resultado);
      if(mounted.current)onClose();
    }catch(e){if(mounted.current){setErro(e.name==="AbortError"?"A leitura foi interrompida. Tente novamente.":e.message||"Não foi possível lançar os dados.");if(minimizada)onRestore();}}
    finally{emAndamento.current=false;if(mounted.current)setBusy(false);}
  };
  const btn={padding:"6px 9px",border:`1px solid ${T.border}`,borderRadius:7,background:T.bgInput,color:T.text2,cursor:"pointer",fontSize:11};
  const position={position:"fixed",right:16,bottom:16,zIndex:1500,fontFamily:"'Sora','DM Sans',sans-serif"};
  if(minimizada)return createPortal(<button onClick={onRestore} aria-label="Restaurar importação de dados clínicos" style={{...position,...btn,maxWidth:"calc(100vw - 32px)",boxShadow:"0 8px 24px #0003",background:T.bgCard}}>{busy?"Lançando…":"↑ Importar dados clínicos"} · {destino.paciente}{erro?" · confira o erro":""}</button>,document.body);
  return createPortal(<section role="dialog" aria-modal="false" aria-labelledby="clinical-import-title" style={{...position,width:"min(440px,calc(100vw - 32px))",maxHeight:"calc(100dvh - 32px)",overflowY:"auto",border:`1px solid ${T.borderStrong}`,borderRadius:14,background:T.bgCard,color:T.text1,boxShadow:"0 14px 45px #0004"}} onKeyDown={e=>{if(e.key==="Escape"&&!busy){e.stopPropagation();onMinimize();}}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();anexar(Array.from(e.dataTransfer.files));}}>
    <header style={{display:"flex",alignItems:"center",gap:8,padding:"12px 14px",borderBottom:`1px solid ${T.border}`}}><strong id="clinical-import-title" style={{flex:1,fontSize:13}}>Importar dados clínicos</strong><button type="button" onClick={onMinimize} aria-label="Minimizar importação" style={btn}>—</button><button type="button" disabled={busy} onClick={onClose} aria-label="Fechar importação" style={btn}>×</button></header>
    <div style={{padding:14}}>
      <div style={{fontSize:11,fontWeight:650,marginBottom:10}}>{destino.leito} · {destino.paciente}</div>
      <textarea ref={input} aria-label="Exames, controles ou imagem" value={texto} disabled={busy} onChange={e=>{setTexto(e.target.value);setErro("");}} onPaste={e=>{const files=Array.from(e.clipboardData?.files||[]);if(files.length){e.preventDefault();anexar(files);}}} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();lancar();}}} placeholder={"Cole exames, controles ou uma imagem…\nEx.: Hb 9,8 / Cr 1,2 / T 37 - 36 / FC 100 - 70"} rows={5} style={{width:"100%",boxSizing:"border-box",resize:"vertical",maxHeight:"40vh",padding:10,border:`1px solid ${T.borderStrong}`,borderRadius:9,background:T.bgInput,color:T.text1,fontFamily:"inherit",fontSize:12,lineHeight:1.5}}/>
      {arquivo&&<div style={{display:"flex",alignItems:"center",gap:7,padding:"7px 0",fontSize:11}}><span style={{flex:1,overflowWrap:"anywhere"}}>📎 {arquivo.name||"Imagem colada"}</span><button disabled={busy} onClick={()=>setArquivo(null)} aria-label="Remover arquivo" style={btn}>×</button></div>}
      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,flexWrap:"wrap"}}><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,.pdf,.txt,.csv,.tsv,.docx" disabled={busy} onChange={e=>{if(e.target.files?.length)anexar(Array.from(e.target.files));e.target.value="";}} style={{display:"none"}}/><button disabled={busy} onClick={()=>fileInput.current?.click()} style={btn}>Anexar arquivo</button><label style={{marginLeft:"auto",fontSize:10,color:T.text3}}>Data <input type="date" aria-label="Data dos dados" disabled={busy} value={data} onChange={e=>{setData(e.target.value);setDataEditada(true);}} style={{...btn,padding:5}}/></label></div>
      <div style={{fontSize:10,color:T.text3,marginTop:8}}>Enter lança e fecha · Shift+Enter quebra a linha<br/>Imagens, PDF, texto e DOCX · até 3 MB</div>
      {erro&&<p role="alert" style={{fontSize:11,lineHeight:1.4,color:T.colorScheme==="light"?"#b91c1c":"#fca5a5",margin:"10px 0 0"}}>{erro}</p>}
      <button disabled={busy||(!texto.trim()&&!arquivo)} onClick={lancar} style={{...btn,width:"100%",marginTop:12,padding:9,background:T.accentBg,color:T.accent,border:`1px solid ${T.accentBorder}`,fontWeight:700}}>{busy?"Reconhecendo e salvando…":"Lançar dados ↵"}</button>
    </div>
  </section>,document.body);
}

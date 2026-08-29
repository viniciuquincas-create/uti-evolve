const normalizar=valor=>String(valor||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase();

export function parseCsv(text=""){
  const rows=[];let row=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}
      else quoted=!quoted;
    }else if(ch===","&&!quoted){row.push(cell);cell="";}
    else if((ch==="\n"||ch==="\r")&&!quoted){
      if(ch==="\r"&&text[i+1]==="\n")i++;
      row.push(cell);if(row.some(v=>String(v).trim()))rows.push(row);row=[];cell="";
    }else cell+=ch;
  }
  row.push(cell);if(row.some(v=>String(v).trim()))rows.push(row);
  return rows;
}

const acharColuna=(headers,termos)=>headers.findIndex(h=>termos.some(t=>h.includes(t)));

export function parsePlanilhaAltas(csv=""){
  const rows=parseCsv(csv);
  const headerIndex=rows.findIndex(r=>r.some(c=>normalizar(c).includes("LEITO CEDIDO")));
  if(headerIndex<0)throw new Error('A coluna "Leito cedido" não foi localizada na planilha.');
  const headers=rows[headerIndex].map(normalizar);
  const idxCedido=acharColuna(headers,["LEITO CEDIDO"]);
  // Nesta planilha institucional, os pacientes não ficam em uma coluna chamada
  // "Paciente": a lista das quatro UTIs é lançada em "Altas de hoje".
  const idxPaciente=acharColuna(headers,["ALTAS DE HOJE","NOME DO PACIENTE","NOME PACIENTE","PACIENTE","NOME"]);
  const idxLeito=acharColuna(headers,["LEITO ATUAL","LEITO ORIGEM","LEITO"]);
  const idxDestino=acharColuna(headers,["DESTINO","UNIDADE DESTINO"]);
  const idxData=acharColuna(headers,["DATA DA ALTA","DATA ALTA","DATA"]);
  if(idxPaciente<0)throw new Error("A coluna com o nome do paciente não foi localizada na planilha.");
  return rows.slice(headerIndex+1).map((r,index)=>({
    id:`alta-${headerIndex+index+2}`,
    paciente:String(r[idxPaciente]||"").trim(),
    leitoAtual:idxLeito>=0?String(r[idxLeito]||"").trim():"",
    leitoCedido:String(r[idxCedido]||"").trim(),
    destino:idxDestino>=0?String(r[idxDestino]||"").trim():"",
    data:idxData>=0?String(r[idxData]||"").trim():"",
  })).filter(r=>r.paciente);
}

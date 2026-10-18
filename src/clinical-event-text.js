// Keep pasted lists inside their clinical field when copying plain text.
export function clinicalEventDetail(label, value) {
  const lines=String(value??'').split(/\r\n?|\n/).map(line=>line.trim()).filter(Boolean)
    .map(line=>line.replace(/^(?:[-•▪◦*‣]|\d+[.)])\s+/,''));
  if(!lines.length)return '';
  if(lines.length===1)return `  ${label}: ${lines[0]}`;
  return `  ${label}:\n${lines.map(line=>`    - ${line}`).join('\n')}`;
}

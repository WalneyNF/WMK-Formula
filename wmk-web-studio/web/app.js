'use strict';
const $ = id => document.getElementById(id);
function log(message, ok=true) { const d=document.createElement('div'); d.className='entry '+(ok?'ok':'error'); d.textContent=new Date().toLocaleTimeString()+' · '+message; $('log').prepend(d); }
async function request(method, params={}) {
  log('Enviando '+method);
  const response=await fetch('/api/v1/command',{method:'POST',headers:{'Content-Type':'application/json','X-WMK-Token':window.WMK_TOKEN},body:JSON.stringify({method,params})});
  const body=await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error||'Falha de comunicacao');
  log('Resposta '+method+' recebida');
  $('result').textContent=JSON.stringify(body.result,null,2);
  return body.result;
}
async function run(action){try{await action()}catch(e){log(e.message,false);$('result').textContent='ERRO: '+e.message}}
window.wmk={sheet:{getCell:cell=>request('cell.get',{cell}),setCell:(cell,input)=>request('cell.set',{cell,input:String(input)}),getRange:range=>request('sheet.read',{range})}};
$('read').onclick=()=>run(()=>wmk.sheet.getCell($('cell').value));
$('write').onclick=()=>run(()=>wmk.sheet.setCell($('cell').value,$('value').value));
$('inspect').onclick=()=>run(()=>request('document.inspect'));
$('rangeRead').onclick=()=>run(()=>wmk.sheet.getRange($('range').value));
$('demo').onclick=()=>run(()=>wmk.sheet.setCell('B1','250'));
log('Interface carregada; conecte ao WMK Formula com --control 7979');

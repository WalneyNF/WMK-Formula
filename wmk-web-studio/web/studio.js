'use strict';
const defaultCode = `// Teste real: A1 = 777 -> B1 = 1554\nconst celula = await wmk.sheet.getCell('A1');\nconst numero = Number(celula.value);\nif (!Number.isFinite(numero)) throw new Error('A1 nao e numerica');\nawait wmk.sheet.setCell('B1', numero * 2);\nconsole.log('B1 atualizado:', numero * 2);`;
const editorText = document.getElementById('code');
const status = document.getElementById('editor-status');
const output = document.getElementById('script-output');
const frame = document.getElementById('script-frame');
const runButton = document.getElementById('run-code');
const getCode = () => window.wmkMonaco ? window.wmkMonaco.getValue() : editorText.value;
const setCode = text => { if(window.wmkMonaco) window.wmkMonaco.setValue(text); else editorText.value=text; };
editorText.value = localStorage.getItem('wmk-studio-code-v02') || defaultCode;
const initialCode = editorText.value;
const STUDIO_VERSION = '0.3.0';
// Monaco is optional: CDN access is needed for this experimental build.
function loadMonaco() {
  const loader = document.createElement('script');
  loader.src='https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js';
  loader.onload=()=>{
    try {
      window.require.config({paths:{vs:'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'}});
      window.MonacoEnvironment={getWorkerUrl:()=> 'data:text/javascript;charset=utf-8,'+encodeURIComponent('self.MonacoEnvironment={baseUrl:"https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/"};importScripts("https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/base/worker/workerMain.js");')};
      window.require(['vs/editor/editor.main'],()=>{
        const container=document.getElementById('monaco');
        window.wmkMonaco=monaco.editor.create(container,{value:editorText.value,language:'javascript',theme:'vs-dark',automaticLayout:true,minimap:{enabled:true},fontSize:14});
        editorText.hidden=true;container.hidden=false;
        monaco.languages.typescript.javascriptDefaults.addExtraLib(`declare const wmk: { sheet: { getCell(cell: string): Promise<{cell:string;value:number|string;text:string;type:string}>; setCell(cell:string,value:string|number):Promise<unknown>; getRange(range:string):Promise<unknown> } };`, 'wmk-api.d.ts');
        status.textContent='Monaco carregado · v'+STUDIO_VERSION;
      },()=>{status.textContent='Monaco indisponivel; editor simples ativo · v'+STUDIO_VERSION;});
    } catch(e) {status.textContent='Monaco indisponivel: '+e.message;}
  };
  loader.onerror=()=>{status.textContent='Sem acesso ao Monaco CDN; editor simples ativo';};
  document.head.append(loader);
}
loadMonaco();
document.getElementById('save-code').onclick=()=>{localStorage.setItem('wmk-studio-code-v02',getCode());status.textContent='Codigo salvo neste navegador';};
document.getElementById('reset-code').onclick=()=>setCode(defaultCode);
let active=false;
let runTimeout=null;
window.addEventListener('message',async e=>{
  if(e.source!==frame.contentWindow || e.origin!=='null' || !active)return;
  const m=e.data||{};
  if(m.kind==='wmk-call'){
    const allowed=['cell.get','cell.set','sheet.read'];
    if(!allowed.includes(m.method)){frame.contentWindow.postMessage({kind:'wmk-result',id:m.id,error:'Metodo nao autorizado'},'*');return;}
    try {const result=await request(m.method,m.params);frame.contentWindow.postMessage({kind:'wmk-result',id:m.id,result},'*');}
    catch(err){frame.contentWindow.postMessage({kind:'wmk-result',id:m.id,error:String(err)},'*');}
  } else if(m.kind==='wmk-log'){output.textContent+='\n'+m.message;}
  else if(m.kind==='wmk-done'){output.textContent+='\nExecucao concluida.';finish();}
  else if(m.kind==='wmk-error'){output.textContent+='\nERRO: '+m.message;finish();}
});
function finish(){active=false;runButton.disabled=false;if(runTimeout){clearTimeout(runTimeout);runTimeout=null;}}
runButton.onclick=()=>{
  if(active)return;
  const code=getCode();if(code.length>32000){output.textContent='Codigo excede 32 KB';return;}
  output.textContent='Executando...';runButton.disabled=true;active=true;
  frame.onload=()=>frame.contentWindow.postMessage({kind:'wmk-run',code},'*');
  frame.src='/runner.html?v='+encodeURIComponent(STUDIO_VERSION);
  if(runTimeout)clearTimeout(runTimeout);
  runTimeout=setTimeout(()=>{if(active){output.textContent+='\nERRO: executor nao respondeu (verifique /runner.html)';finish();}},15000);
};

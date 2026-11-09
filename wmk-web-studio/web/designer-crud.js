"use strict";
// v0.5.2: CRUD baseado em controles reais do formulario (TextBox, TextArea, CheckBox, ComboBox).
const CRUD_WINDOW=40, CRUD_MAX_FIELDS=12;
let crudRows=[],crudSelectedRow=null,crudBusy=false,crudSchemaSignature='';
const crudEl=id=>document.getElementById(id);
function crudAddress(start,offset,column){return col(start.col+column)+(start.row+offset);}
function crudStart(){
 const m=/^([A-Z]{1,3})([1-9][0-9]{0,5})$/.exec(crudEl('start-cell').value.trim().toUpperCase());
 if(!m)throw Error('Célula inicial inválida. Exemplo: A1.');
 let n=0;for(const ch of m[1])n=n*26+ch.charCodeAt(0)-64;
 return {col:n-1,row:Number(m[2])};
}
function crudFields(){
 const allowed=new Set(['TextBox','TextArea','CheckBox','ComboBox']);
 const all=model.components.filter(c=>allowed.has(c.kind));
 const fields=[...['txtNome','txtCidade'].map(name=>all.find(c=>c.name===name)).filter(Boolean),...all.filter(c=>!['txtNome','txtCidade'].includes(c.name))];
 if(!fields.length)throw Error('Adicione controles TextBox, TextArea, CheckBox ou ComboBox.');
 if(fields.length>CRUD_MAX_FIELDS)throw Error('Limite de '+CRUD_MAX_FIELDS+' campos por cadastro.');
 if(new Set(fields.map(c=>c.name)).size!==fields.length)throw Error('Nomes de campos duplicados. Renomeie no painel Propriedades.');
 const start=crudStart();if(start.col+fields.length>16384)throw Error('O cadastro ultrapassa a última coluna da planilha.');
 return fields.map(c=>({name:c.name,kind:c.kind,text:c.text}));
}
function crudSignature(fields){return JSON.stringify(fields.map(f=>[f.name,f.kind]));}
function crudValue(field){
 const value=dataInputs[field.name];
 if(field.kind==='CheckBox')return value===true||value==='true'||value==='1'?'TRUE':'FALSE';
 if(field.kind==='ComboBox')return String(value??field.text.split(';')[0]??'').trim();
 return String(value??'').trim();
}
function crudValues(fields=crudFields()){return fields.map(crudValue);}
function crudCheckFields(fields){
 const values=crudValues(fields);
 for(const n of ['txtNome','txtCidade']){const i=fields.findIndex(f=>f.name===n);if(i>=0&&!values[i])throw Error('Preencha '+n+' antes de salvar.');}
 return values;
}
function crudInputs(values,fields=crudFields()){
 fields.forEach((f,i)=>{const v=String(values[i]??'');dataInputs[f.name]=f.kind==='CheckBox'?['TRUE','VERDADEIRO','SIM','1'].includes(v.toUpperCase()):v;});
}
async function crudGet(address){return String(valueFromResponse(await api('cell.get',{cell:address}))??'');}
async function crudSet(address,value){return api('cell.set',{cell:address,input:String(value??'')});}
function crudSetBusy(on){crudBusy=on;for(const id of ['crud-new','crud-add','crud-update','crud-delete','crud-find','crud-refresh'])crudEl(id).disabled=on;crudEl('crud-count').textContent=on?'Processando...':crudRows.filter(r=>r.values.some(v=>String(v).trim())).length+' registros';}
async function crudWork(task){if(crudBusy)return;crudSetBusy(true);try{await task();}catch(e){notice('ERRO CRUD: '+e.message);}finally{crudSetBusy(false);}}
function crudPaint(){gridData=crudRows.map(r=>r.values);crudEl('crud-count').textContent=crudRows.filter(r=>r.values.some(v=>String(v).trim())).length+' registros no intervalo consultado';render();}
function crudEnsureSchema(fields){const sig=crudSignature(fields);if(crudRows.length&&sig!==crudSchemaSignature)throw Error('Campos do formulário foram alterados. Clique em Atualizar antes de editar ou excluir.');}
async function crudReload(){
 const fields=crudFields(),start=crudStart(),rows=Array.from({length:CRUD_WINDOW},(_,i)=>({row:start.row+i,values:fields.map(()=>'')}));
 let cursor=0;async function worker(){while(cursor<rows.length*fields.length){const k=cursor++,i=Math.floor(k/fields.length),j=k%fields.length;rows[i].values[j]=await crudGet(crudAddress(start,i,j));}}
 await Promise.all(Array.from({length:5},worker));crudRows=rows;crudSchemaSignature=crudSignature(fields);crudSelectedRow=null;crudPaint();
 notice('DataGrid leu '+(rows.length*fields.length)+' células reais ('+fields.map((f,i)=>f.name+'='+col(start.col+i)).join(', ')+').');
}
function crudRequireSelected(){const i=crudRows.findIndex(r=>r.row===crudSelectedRow);if(i<0)throw Error('Selecione uma linha na DataGrid.');return i;}
async function crudWritePair(start,index,values){
 // Mantido o nome para preservar os testes da API anterior; agora escreve todos os campos.
 for(let j=0;j<values.length;j++)await crudSet(crudAddress(start,index,j),values[j]);
}
async function crudAppend(){const fields=crudFields(),values=crudCheckFields(fields),start=crudStart();await crudReload();
 let last=-1;for(let i=0;i<crudRows.length;i++)if(crudRows[i].values.some(v=>v.trim()))last=i;
 const next=last+1;if(next>=CRUD_WINDOW)throw Error('Intervalo cheio (40 linhas).');
 await crudWritePair(start,next,values);crudInputs(fields.map(()=>''),fields);await crudReload();crudSelectedRow=start.row+next;crudPaint();notice('Registro gravado na linha '+crudSelectedRow+' com '+fields.length+' campos.');
}
async function crudUpdate(){const fields=crudFields();crudEnsureSchema(fields);const i=crudRequireSelected(),values=crudCheckFields(fields),start=crudStart();
 const current=await Promise.all(fields.map((f,j)=>crudGet(crudAddress(start,i,j))));
 if(JSON.stringify(current)!==JSON.stringify(crudRows[i].values))throw Error('Linha alterada externamente. Clique em Atualizar.');
 await crudWritePair(start,i,values);await crudReload();crudSelectedRow=start.row+i;crudPaint();notice('Linha '+crudSelectedRow+' atualizada.');
}
async function crudDelete(){const fields=crudFields();crudEnsureSchema(fields);const i=crudRequireSelected(),line=crudSelectedRow,start=crudStart();
 if(!confirm('Remover registro da linha '+line+'? Serão compactadas somente as '+fields.length+' colunas mapeadas.'))return;
 const current=await Promise.all(fields.map((f,j)=>crudGet(crudAddress(start,i,j))));
 if(JSON.stringify(current)!==JSON.stringify(crudRows[i].values))throw Error('Linha alterada externamente. Clique em Atualizar.');
 let last=-1;for(let n=0;n<crudRows.length;n++)if(crudRows[n].values.some(v=>v.trim()))last=n;
 for(let n=i;n<last;n++)await crudWritePair(start,n,crudRows[n+1].values);
 await crudWritePair(start,Math.max(i,last),fields.map(()=>''));crudInputs(fields.map(()=>''),fields);await crudReload();notice('Registro removido da linha '+line+'.');
}
function crudSelect(row){const fields=crudFields();crudEnsureSchema(fields);const r=crudRows.find(x=>x.row===row);if(!r)return;crudSelectedRow=row;crudInputs(r.values,fields);crudPaint();notice('Linha '+row+' carregada nos controles do formulário.');}
function crudFind(){const term=crudEl('crud-search').value.trim().toLocaleLowerCase('pt-BR');if(!term)return notice('Digite algo para localizar.');
 const matches=crudRows.filter(r=>r.values.some(v=>v.toLocaleLowerCase('pt-BR').includes(term)));if(!matches.length)return notice('Nenhum registro encontrado.');
 const index=matches.findIndex(r=>r.row===crudSelectedRow),next=matches[(index+1)%matches.length];crudSelect(next.row);notice(matches.length+' resultado(s), linha '+next.row+'.');
}
gridHTML=function(){if(!crudRows.length)return '<div class="crud-empty">Clique em Atualizar para carregar registros reais.</div>';
 let fields;try{fields=crudFields();}catch(e){return '<div class="crud-empty">'+esc(e.message)+'</div>';}
 return '<table class="gridtable"><thead><tr><th class="row-num">Linha</th>'+fields.map(f=>'<th>'+esc(f.name)+'</th>').join('')+'</tr></thead><tbody>'+crudRows.map(r=>'<tr data-crud-row="'+r.row+'" class="'+(r.row===crudSelectedRow?'crud-selected':'')+'"><td class="row-num">'+r.row+'</td>'+r.values.map((v,j)=>'<td>'+esc(fields[j]?.kind==='CheckBox'?(v.toUpperCase()==='TRUE'?'☑':v.toUpperCase()==='FALSE'?'☐':v):v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
};
loadGrid=async function(){await crudWork(crudReload);};
buttonAction=async function(c){if(c.name==='btnEnviar')await crudWork(crudAppend);else notice('Botão '+c.name+' não possui evento configurado.');};
crudEl('canvas').addEventListener('click',e=>{if(!execute)return;const tr=e.target.closest('[data-crud-row]');if(tr){try{crudSelect(Number(tr.dataset.crudRow));}catch(err){notice('ERRO: '+err.message);}}});
crudEl('crud-new').onclick=()=>{try{crudSelectedRow=null;crudInputs(crudFields().map(()=>''));crudPaint();notice('Novo registro: preencha os campos e clique em Adicionar linha.');}catch(e){notice(e.message);}};
crudEl('crud-add').onclick=()=>crudWork(crudAppend);
crudEl('crud-update').onclick=()=>crudWork(crudUpdate);
crudEl('crud-delete').onclick=()=>crudWork(crudDelete);
crudEl('crud-refresh').onclick=()=>crudWork(crudReload);
crudEl('crud-find').onclick=crudFind;
crudEl('crud-search').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();crudFind();}};
crudEl('load-grid').onclick=()=>crudWork(crudReload);
crudEl('start-cell').addEventListener('change',()=>{crudRows=[];crudSelectedRow=null;crudSchemaSignature='';crudPaint();});

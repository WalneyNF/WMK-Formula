const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const code=fs.readFileSync(path.join(__dirname,'../web/designer-crud.js'),'utf8').split('gridHTML=function')[0];
const cells=new Map();const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,{value:id==='start-cell'?'A1':'',disabled:false,textContent:'',onclick:null,addEventListener(){}});return elements.get(id)}
const model={components:[{name:'txtNome',kind:'TextBox',text:'Nome'},{name:'txtCidade',kind:'TextBox',text:'Cidade'},{name:'chk6',kind:'CheckBox',text:'Ativo'},{name:'cmb7',kind:'ComboBox',text:'Opção A;Opção B'},{name:'memo8',kind:'TextArea',text:'Obs'}]};
const input={txtNome:'Maria',txtCidade:'Friburgo',chk6:true,cmb7:'Opção B',memo8:'Texto livre'};
const context={model,dataInputs:input,gridData:[],col(n){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s},api:async(method,params)=>method==='cell.get'?{text:cells.get(params.cell)||''}: (cells.set(params.cell,params.input),{ok:true}),valueFromResponse:r=>r.text,render(){},notice(){},document:{getElementById:el}};
vm.createContext(context);
vm.runInContext(code+`globalThis.crudApi={crudFields,crudAppend,crudReload,crudSelect,crudUpdate,crudDelete,crudValues,crudInputs,crudRows:()=>crudRows,select:i=>crudSelectedRow=i};`,context);
(async()=>{
 const a=context.crudApi;assert.equal(a.crudFields().length,5);
 await a.crudAppend();assert.equal(cells.get('A1'),'Maria');assert.equal(cells.get('B1'),'Friburgo');assert.equal(cells.get('C1'),'TRUE');assert.equal(cells.get('D1'),'Opção B');assert.equal(cells.get('E1'),'Texto livre');
 context.dataInputs.txtNome='João';context.dataInputs.txtCidade='Rio';context.dataInputs.chk6=false;context.dataInputs.cmb7='Opção A';context.dataInputs.memo8='Segunda';await a.crudAppend();assert.equal(cells.get('A2'),'João');assert.equal(cells.get('C2'),'FALSE');assert.equal(cells.get('D2'),'Opção A');
 a.crudSelect(1);assert.strictEqual(context.dataInputs.chk6,true);assert.equal(context.dataInputs.cmb7,'Opção B');
 context.dataInputs.chk6=false;context.dataInputs.cmb7='Opção A';await a.crudUpdate();assert.equal(cells.get('C1'),'FALSE');assert.equal(cells.get('D1'),'Opção A');
 a.crudSelect(2);assert.strictEqual(context.dataInputs.chk6,false);assert.equal(context.dataInputs.cmb7,'Opção A');
 console.log('PASSOU: append 2 linhas, CheckBox TRUE/FALSE, ComboBox escolha, TextArea, leitura/edição por seleção.');
})().catch(e=>{console.error(e);process.exitCode=1});

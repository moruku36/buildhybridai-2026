import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {previewCore} from '../src/policy.js';
import {recordInference,runtimeStatus} from '../src/runtime-status.js';
test('only recognized successful source labels establish session evidence',()=>{
 const observed={cloud:false,device:false,last:null};
 for(const source of ['PREVIEW','UNKNOWN',undefined,'cloud'])recordInference(observed,source);
 assert.match(runtimeStatus(true,observed),/Cloud unverified · Device unverified/);
 recordInference(observed,'in_cloud');assert.match(runtimeStatus(true,observed),/Cloud verified · Device unverified · last: in_cloud/);
 recordInference(observed,'on_device');assert.match(runtimeStatus(true,observed),/Cloud verified · Device verified · last: on_device/);
});
const bundle=await build({entryPoints:['src/main.js'],bundle:true,write:false,format:'esm',loader:{'.css':'empty'},define:{'import.meta.env':'{}'},plugins:[{name:'offline-ai',setup(b){
 b.onResolve({filter:/\/ai\.js$/},()=>({path:'offline-ai',namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`
 export const configured=true,debugRequested=false;
 export function initializeConnection(){return {debug:false}}
 export async function verifyAppCheck(){return {verified:true}}
 export function prepareModel(){return {}}
 export async function generateDraft(task){if(globalThis.onGenerate)return globalThis.onGenerate(task);if(task.mode==='local')throw Error('Local LanguageModel API not available in this environment');return {text:'Synthetic test draft',source:'in_cloud',createdAt:'2026-11-12T00:00:00Z'}}
 `}));
}}]});
const button=(w,text)=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===text);
async function boot(tasks){
 const dom=new JSDOM('<div id="app"></div>',{url:'http://localhost/',runScripts:'outside-only'}),w=dom.window;
 w.localStorage.setItem('relay-board-v1',JSON.stringify(tasks));
 w.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});
 w.WebAssembly={instantiate:async()=>({instance:{exports:previewCore}})};
 w.structuredClone=structuredClone;w.confirm=()=>true;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){this.dispatchEvent(new w.Event('close'))};
 await w.eval(`(async()=>{${bundle.outputFiles[0].text}\n})()`);
 return {dom,w};
}
test('cloud success updates banner through approval; App Check, failure and reload do not prove device inference',async()=>{
 const task=(id,mode,sequence,cloudAllowed)=>({id,title:'Synthetic task',brief:'Public test',priority:1,sequence,state:'queued',mode,cloudAllowed});
 const {dom,w}=await boot([task('local','local',0,false),task('cloud','cloud',1,true),task('hybrid','hybrid',2,false)]);
 assert.equal(w.document.querySelector('label[for="task-priority"]').control,w.document.querySelector('select[name="priority"]'));
 assert.equal(w.document.querySelector('label[for="task-mode"]').control,w.document.querySelector('select[name="mode"]'));
 await button(w,'Initialize connection').onclick();await button(w,'Verify App Check').onclick();
 assert.match(w.document.querySelector('.status').textContent,/Cloud unverified · Device unverified/);
 await button(w,'Start queue').onclick();
 assert.match(w.document.querySelector('.status').textContent,/Cloud unverified · Device unverified/);
 await button(w,'Start queue').onclick();
 assert.match(w.document.querySelector('.status').textContent,/Cloud verified · Device unverified · last: in_cloud/);
 assert.match(w.document.querySelector('.stats').textContent,/2 \/ 6Session attempts/);
 assert.match(w.document.querySelector('.notice').textContent,/cloud permission/);
 button(w,'Read result').onclick();button(w,'Approve result').onclick();
 assert.match(w.document.querySelector('.status').textContent,/Cloud verified · Device unverified/);
 const saved=JSON.parse(w.localStorage.getItem('relay-board-v1'));
 assert.equal(saved.find(t=>t.id==='cloud').state,'done');
 const reload=await boot(saved);await button(reload.w,'Initialize connection').onclick();
 assert.match(reload.w.document.querySelector('.status').textContent,/Cloud unverified · Device unverified/);
 reload.dom.window.close();dom.window.close();
});

test('paused execution edits repair consent and blocked routes without running or losing data',async()=>{
 const tasks=[{id:'fix',title:'Synthetic blocked task',brief:'Keep this brief',priority:2,sequence:0,state:'blocked',mode:'local',cloudAllowed:false,error:'Previous device failure'}];
 const {dom,w}=await boot(tasks);let requests=0;w.onGenerate=async()=>{requests++;throw Error('Should not run')};
 button(w,'Edit execution').onclick();let d=w.document.querySelector('dialog');
 d.querySelector('select').value='cloud';d.querySelector('select').onchange();d.querySelector('input').checked=true;
 button(w,'Cancel').onclick();assert.equal(JSON.parse(w.localStorage.getItem('relay-board-v1'))[0].mode,'local');
 button(w,'Edit execution').onclick();d=w.document.querySelector('dialog');
 d.querySelector('select').value='hybrid';d.querySelector('select').onchange();d.querySelector('input').checked=true;
 button(w,'Save execution settings').onclick();
 let saved=JSON.parse(w.localStorage.getItem('relay-board-v1'))[0];
 assert.equal(saved.mode,'hybrid');assert.equal(saved.cloudAllowed,true);assert.equal(saved.state,'blocked');assert.equal(saved.brief,'Keep this brief');assert.equal(requests,0);
 button(w,'Return to queue').onclick();assert.equal(requests,0);
 button(w,'Edit execution').onclick();d=w.document.querySelector('dialog');d.querySelector('input').checked=false;
 button(w,'Save execution settings').onclick();await button(w,'Start queue').onclick();assert.equal(requests,0);
 assert.match(w.document.querySelector('.notice').textContent,/cloud permission/);
 button(w,'Edit execution').onclick();d=w.document.querySelector('dialog');d.querySelector('select').value='local';d.querySelector('select').onchange();assert.equal(d.querySelector('input').checked,false);assert.equal(d.querySelector('input').disabled,true);
 button(w,'Save execution settings').onclick();saved=JSON.parse(w.localStorage.getItem('relay-board-v1'))[0];assert.equal(saved.mode,'local');assert.equal(saved.cloudAllowed,false);
 dom.window.close();
});
test('sending a review back pauses after the current request and requires explicit restart',async()=>{
 const base={title:'Synthetic task',brief:'Public test',priority:1,mode:'cloud',cloudAllowed:true};
 const {dom,w}=await boot([{...base,id:'review',sequence:0,state:'review',result:{text:'Existing draft',source:'in_cloud',createdAt:'2026-11-12'}},{...base,id:'running',sequence:1,state:'queued'}]);
 let finish,calls=0;w.onGenerate=()=>{calls++;return new Promise(resolve=>{finish=resolve})};
 const running=button(w,'Start queue').onclick();
 for(let n=0;n<10&&!finish;n++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(calls,1);
 assert.equal([...w.document.querySelectorAll('button')].filter(b=>b.textContent==='Edit execution').every(b=>b.disabled),true);
 button(w,'Read result').onclick();button(w,'Send back').onclick();
 finish({text:'Second draft',source:'in_cloud',createdAt:'2026-11-12'});await running;
 assert.match(w.document.querySelector('.notice').textContent,/Queue paused; press Start queue/);
 assert.equal(calls,1);let saved=JSON.parse(w.localStorage.getItem('relay-board-v1'));assert.equal(saved[0].state,'queued');assert.equal(saved[0].result,undefined);assert.equal(saved[1].state,'review');
 w.onGenerate=async()=>{calls++;return {text:'Explicit re-draft',source:'in_cloud',createdAt:'2026-11-12'}};
 await button(w,'Start queue').onclick();assert.equal(calls,2);
 saved=JSON.parse(w.localStorage.getItem('relay-board-v1'));assert.equal(saved[0].state,'review');
 dom.window.close();
});

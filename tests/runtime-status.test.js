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
 export async function generateDraft(task){if(task.mode==='local')throw Error('Local LanguageModel API not available in this environment');return {text:'Synthetic test draft',source:'in_cloud',createdAt:'2026-11-12T00:00:00Z'}}
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

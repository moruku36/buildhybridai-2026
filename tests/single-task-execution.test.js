import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {previewCore} from '../src/policy.js';

// Exercise the real UI/queue/lock/storage/receipt code. Only the SDK boundary
// and WASM loader are synthetic; these tests never establish live inference.
const bundle=await build({
 entryPoints:['src/main.js'],bundle:true,write:false,format:'esm',
 loader:{'.css':'empty'},define:{'import.meta.env':'{}'},
 plugins:[{name:'synthetic-ai',setup(b){
  b.onResolve({filter:/^\.\/ai\.js$/},()=>({path:'ai',namespace:'synthetic'}));
  b.onLoad({filter:/.*/,namespace:'synthetic'},()=>({contents:`
   export const configured=true;
   export function prepareModel(mode){
    globalThis.relayTest.preparations.push(mode);
    return {ready:Promise.resolve()};
   }
   export async function generateDraft(task,prepared){
    await prepared.ready;
    if(!globalThis.relayTest.held)throw Error('Test expected the board lock');
    globalThis.relayTest.calls.push(task.id);
    if(globalThis.relayTest.fail)throw Error('Synthetic inference failure');
    return {text:'Synthetic draft, not live inference',source:'in_cloud',createdAt:'2026-11-12T10:00:00Z'};
   }
  `}));
 }}],
});
const key='relay-board-v1';
const task=(id,priority=1)=>({id,title:id,brief:'Public synthetic validation task',priority,sequence:Number(id.split('-').at(-1))||0,state:'queued',mode:'hybrid',cloudAllowed:true});
const saved=w=>JSON.parse(w.localStorage.getItem(key));
const button=(w,title)=>[...w.document.querySelectorAll('article')].find(c=>c.querySelector('h4').textContent===title)?.querySelectorAll('button');
const runButton=(w,title)=>[...button(w,title)].find(b=>b.textContent==='Run this task only');
async function boot(t,tasks){
 const dom=new JSDOM('<div id="app"></div>',{url:'http://localhost/',runScripts:'outside-only'});
 t.after(()=>dom.window.close());
 const w=dom.window;
 w.localStorage.setItem(key,JSON.stringify(tasks));
 w.structuredClone=structuredClone;
 w.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});
 w.WebAssembly={instantiate:async()=>({instance:{exports:previewCore}})};
 const control={calls:[],preparations:[],held:false,deny:false,fail:false};
 w.relayTest=control;
 Object.defineProperty(w.navigator,'locks',{value:{request:async(name,options,callback)=>{
  assert.equal(name,'relay-board-v1-exclusive');
  assert.equal(options.ifAvailable,true);
  if(control.deny||control.held)return callback(null);
  control.held=true;
  try{return await callback({name});}finally{control.held=false;}
 }}});
 await w.eval(`(async()=>{${bundle.outputFiles[0].text}\n})()`);
 return {w,control};
}

test('an explicit single-task run skips higher priority work, preserves its route and receipt, and stops',async t=>{
 const {w,control}=await boot(t,[task('first-0'),task('chosen-1',3),task('last-2',3)]);
 assert.deepEqual(control.calls,[]);
 await runButton(w,'chosen-1').onclick();
 assert.deepEqual(control.calls,['chosen-1']);
 assert.deepEqual(control.preparations,['hybrid']);
 const board=saved(w);
 assert.deepEqual(board.map(t=>t.state),['queued','review','queued']);
 assert.equal(board[1].result.executionReceipt.requestedMode,'hybrid');
 assert.equal(board[1].result.executionReceipt.actualSource,'in_cloud');
 assert.match(w.document.querySelector('.notice').textContent,/Other queued tasks were not started/);
 assert.equal(control.held,false);
});

test('single-task execution cannot bypass cloud permission or run a different permitted task',async t=>{
 const denied={...task('denied-0'),cloudAllowed:false};
 const {w,control}=await boot(t,[denied,task('allowed-1')]);
 await runButton(w,'denied-0').onclick();
 assert.deepEqual(control.calls,[]);
 assert.deepEqual(control.preparations,[]);
 assert.deepEqual(saved(w).map(t=>t.state),['queued','queued']);
 assert.match(w.document.querySelector('.notice').textContent,/cloud permission/);
});

test('a failed single-task run blocks only that task and never retries or advances',async t=>{
 const {w,control}=await boot(t,[task('failed-0'),task('untouched-1')]);
 const staleButton=runButton(w,'failed-0');
 control.fail=true;
 await staleButton.onclick();
 assert.deepEqual(control.calls,['failed-0']);
 assert.deepEqual(saved(w).map(t=>t.state),['blocked','queued']);
 assert.match(saved(w)[0].error,/Synthetic inference failure/);
 // A stale handler must not fall back to running the remaining queue.
 await staleButton.onclick();
 assert.deepEqual(control.calls,['failed-0']);
 assert.match(w.document.querySelector('.notice').textContent,/no longer queued/);
 assert.equal(control.held,false);
});

test('another tab holding the board lock prevents any single-task execution or save',async t=>{
 const {w,control}=await boot(t,[task('locked-0')]);
 const before=w.localStorage.getItem(key);
 control.deny=true;
 await runButton(w,'locked-0').onclick();
 assert.deepEqual(control.calls,[]);
 assert.deepEqual(control.preparations,[]);
 assert.equal(w.localStorage.getItem(key),before);
 assert.match(w.document.querySelector('.notice').textContent,/Another tab owns/);
});

test('a changed storage snapshot rejects the stale single-task click without overwriting or execution',async t=>{
 const {w,control}=await boot(t,[task('stale-0'),task('other-1')]);
 const staleButton=runButton(w,'stale-0');
 const latest=JSON.stringify([{...task('stale-0'),state:'blocked'},task('other-1')]);
 w.localStorage.setItem(key,latest);
 await staleButton.onclick();
 assert.deepEqual(control.calls,[]);
 assert.deepEqual(control.preparations,[]);
 assert.equal(w.localStorage.getItem(key),latest);
 assert.match(w.document.querySelector('.notice').textContent,/Board changed in another tab/);
});

test('separate single-task starts share the existing six-attempt session limit',async t=>{
 const tasks=Array.from({length:7},(_,i)=>task('limit-'+i));
 const {w,control}=await boot(t,tasks);
 for(const task of tasks)await runButton(w,task.title).onclick();
 assert.equal(control.calls.length,6);
 assert.equal(control.preparations.length,6);
 assert.deepEqual(saved(w).map(t=>t.state),['review','review','review','review','review','review','queued']);
 assert.match(w.document.querySelector('.notice').textContent,/session request limit/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {previewCore} from '../src/policy.js';
import {isReviewFixtureEnabled} from '../src/review-fixture-mode.js';
const btn=(w,text)=>[...w.document.querySelectorAll('button')].find(x=>x.textContent===text);
async function boot({dev=true,host='localhost',saved=[]}={}){
 const bundle=await build({entryPoints:['src/main.js'],bundle:true,write:false,format:'esm',loader:{'.css':'empty'},define:{'import.meta.env':JSON.stringify({DEV:dev,VITE_REVIEW_FIXTURE:'true'})}});
 const dom=new JSDOM('<div id="app"></div>',{url:'http://'+host,runScripts:'outside-only'}),w=dom.window;
 w.localStorage.setItem('relay-board-v1',JSON.stringify(saved));w.structuredClone=structuredClone;
 Object.defineProperty(w.navigator,'locks',{value:{request:async(n,o,cb)=>cb({name:n})}});
 let fetches=0;w.fetch=async url=>{fetches++;assert.equal(url,'/relay_core.wasm');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)};};
 w.WebAssembly={instantiate:async()=>({instance:{exports:previewCore}})};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.dispatchEvent(new w.Event('close'))};
 await w.eval('(async()=>{'+bundle.outputFiles[0].text+'})()');return {dom,w,fetches:()=>fetches};
}
test('review fixtures require exact development opt-in and loopback',()=>{
 assert.equal(isReviewFixtureEnabled({dev:true,optIn:'true',hostname:'localhost'}),true);
 for(const x of [{dev:false,optIn:'true',hostname:'localhost'},{dev:true,optIn:'false',hostname:'localhost'},{dev:true,optIn:'true',hostname:'example.com'}])assert.equal(isReviewFixtureEnabled(x),false);
});
test('synthetic UI example edits and reapproves without inference, restores read-only when disabled',async()=>{
 const {w,dom,fetches}=await boot();const add=btn(w,'Add synthetic review example (no AI)');assert.ok(add);
 await add.onclick();await btn(w,'Add synthetic review example (no AI)').onclick();
 let saved=JSON.parse(w.localStorage.getItem('relay-board-v1'));assert.equal(saved.length,1);assert.equal(saved[0].result.source,'TEST_FIXTURE');
 assert.match(w.document.querySelector('.status').textContent,/AI not connected/);assert.match(w.document.querySelector('.stats').textContent,/0 \/ 6Session attempts/);
 btn(w,'Read result').onclick();assert.equal(btn(w,'Send back'),undefined);btn(w,'Edit result locally').onclick();
 w.document.querySelector('#human-result-text').value='Synthetic human edit, not AI';await btn(w,'Save local edit').onclick();
 btn(w,'Read result').onclick();await btn(w,'Approve result').onclick();
 saved=JSON.parse(w.localStorage.getItem('relay-board-v1'));assert.equal(saved[0].state,'done');assert.equal(saved[0].result.humanEdit.text,'Synthetic human edit, not AI');assert.equal(fetches(),1);
 const prod=await boot({dev:false,saved});assert.equal(btn(prod.w,'Add synthetic review example (no AI)'),undefined);
 btn(prod.w,'Read result').onclick();assert.equal(btn(prod.w,'Edit result locally'),undefined);assert.equal(btn(prod.w,'Show approved handoff text'),undefined);assert.match(prod.w.document.querySelector('dialog').textContent,/TEST_FIXTURE/);
 assert.equal(JSON.parse(prod.w.localStorage.getItem('relay-board-v1'))[0].result.humanEdit.text,'Synthetic human edit, not AI');
 const remote=await boot({host:'example.com'});assert.equal(btn(remote.w,'Add synthetic review example (no AI)'),undefined);
 dom.window.close();prod.dom.window.close();remote.dom.window.close();
});

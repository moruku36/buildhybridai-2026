import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {prepareIssueTask} from '../src/issue-intake.js';

const bundle=await build({
 entryPoints:['src/main.js'],bundle:true,write:false,format:'esm',
 loader:{'.css':'empty'},define:{'import.meta.env':'{}'},
});
const key='relay-board-v1';
const button=(w,text)=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===text);

// One end-to-end lifecycle, not live browser/download/inference acceptance.
test('a locally edited and reapproved draft downloads its inspected snapshot, then refuses a stale copy',async t=>{
 const dom=new JSDOM('<div id="app"></div>',{url:'http://localhost/',runScripts:'outside-only'});
 t.after(()=>dom.window.close());
 const w=dom.window;
 w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;
 w.Blob=Blob;
 let fetches=0,modelCalls=0,lockHeld=false;
 w.fetch=async()=>{fetches++;return {ok:false};};
 w.LanguageModel={availability:()=>{modelCalls++;throw Error('Unexpected model check');},create:()=>{modelCalls++;throw Error('Unexpected model creation');}};
 Object.defineProperty(w.navigator,'locks',{value:{request:async(name,options,callback)=>{
  assert.equal(name,'relay-board-v1-exclusive');
  assert.equal(options.ifAvailable,true);
  assert.equal(lockHeld,false);lockHeld=true;
  try{return await callback({name});}finally{lockHeld=false;}
 }}});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 const prepared=prepareIssueTask({title:'Synthetic public handoff',goal:'Public demo task',constraints:'Public data only',acceptanceCriteria:'Result names one verifiable step',priority:1});
 const original={
  id:'public-handoff',kind:'ai',title:prepared.title,brief:prepared.brief,
  priority:1,sequence:0,state:'review',mode:'hybrid',cloudAllowed:true,
  result:{text:'Original synthetic draft',source:'in_cloud',createdAt:'2026-11-12T10:00:00Z',
   executionReceipt:{version:1,requestedMode:'hybrid',actualSource:'in_cloud',elapsedMs:420}},
 };
 w.localStorage.setItem(key,JSON.stringify([original]));
 const downloads=[],revoked=[],cleanup=[];
 let file;
 w.URL.createObjectURL=blob=>{assert.equal(lockHeld,true);file=blob;return 'blob:relay-synthetic-packet';};
 w.URL.revokeObjectURL=url=>revoked.push(url);
 w.HTMLAnchorElement.prototype.click=function(){
  assert.equal(lockHeld,true);downloads.push({href:this.href,name:this.download});
 };
 const originalTimeout=w.setTimeout.bind(w);
 w.setTimeout=(callback,delay,...args)=>delay===1000?(cleanup.push({callback,delay}),0):originalTimeout(callback,delay,...args);
 await w.eval(`(async()=>{${bundle.outputFiles[0].text}\n})()`);
 const initialFetches=fetches;

 button(w,'Read result').click();
 assert.equal(button(w,'Show approved handoff packet'),undefined);
 button(w,'Edit result locally').click();
 w.document.querySelector('#human-result-text').value='Human-reviewed instructions <not HTML>';
 await button(w,'Save local edit').onclick();
 button(w,'Read result').click();
 assert.equal(button(w,'Show approved handoff packet'),undefined);
 const criterion=w.document.querySelector('dialog #criterion-0');
 assert.equal(criterion.value,'unverified');
 criterion.value='addressed';
 await button(w,'Approve result').onclick();
 button(w,'Read result').click();
 await button(w,'Show approved handoff packet').onclick();
 const area=w.document.querySelector('#approved-handoff-packet');
 assert.equal(area.readOnly,true);
 assert.equal(downloads.length,0);
 const inspected=area.value,packet=JSON.parse(inspected);
 assert.equal(packet.format,'relay-approved-handoff-v1');
 assert.equal(packet.approvedText,'Human-reviewed instructions <not HTML>');
 assert.equal(packet.originalText,original.result.text);
 assert.deepEqual(packet.provenance.executionReceipt,original.result.executionReceipt);
 assert.equal(packet.provenance.humanEdited,true);
 assert.ok(packet.provenance.approvedAt);
 assert.match(packet.notice,/not authority to execute/);
 assert.deepEqual(packet.draftContentReview.items,[{text:'Result names one verifiable step',status:'addressed'}]);
 const before=w.localStorage.getItem(key),download=button(w,'Download inspected packet');
 await download.onclick();
 assert.equal(file.type,'application/json;charset=utf-8');
 assert.equal(await file.text(),inspected);
 assert.deepEqual(downloads,[{href:'blob:relay-synthetic-packet',name:'relay-approved-handoff.json'}]);
 const dlg=area.closest('dialog');
 assert.match(dlg.querySelector('[role=status]').textContent,/browser downloads/i);
 assert.equal(dlg.querySelector('[role=alert]').textContent,'');
 assert.equal(w.localStorage.getItem(key),before);
 assert.equal(cleanup.length,1);cleanup[0].callback();
 assert.deepEqual(revoked,['blob:relay-synthetic-packet']);
 // Explicit attempt whose anchor click throws: recoverable alert, prior success cleared, nothing extra downloaded.
 const clickOk=w.HTMLAnchorElement.prototype.click;
 w.HTMLAnchorElement.prototype.click=function(){throw Error('Blocked internal detail');};
 await download.onclick();
 w.HTMLAnchorElement.prototype.click=clickOk;
 assert.equal(downloads.length,1,'no extra download');
 assert.equal(dlg.querySelector('[role=status]').textContent,'');
 assert.match(dlg.querySelector('[role=alert]').textContent,/copy/i);
 assert.doesNotMatch(dlg.querySelector('[role=alert]').textContent,/Blocked internal detail/);
 assert.equal(w.document.querySelector('#approved-handoff-packet').value,inspected);
 assert.equal(w.localStorage.getItem(key),before);
 assert.equal(cleanup.length,2);cleanup[1].callback();
 assert.deepEqual(revoked,['blob:relay-synthetic-packet','blob:relay-synthetic-packet']);
 // Explicit retry resets the alert and dispatches identical bytes.
 await download.onclick();
 assert.equal(downloads.length,2);
 assert.equal(await file.text(),inspected);
 assert.equal(dlg.querySelector('[role=alert]').textContent,'');
 assert.match(dlg.querySelector('[role=status]').textContent,/browser downloads/i);
 assert.equal(cleanup.length,3);cleanup[2].callback();

 // Another tab removes approval while this packet view is still open.
 const latest=JSON.parse(before);
 latest[0].state='review';
 delete latest[0].result.reviewApprovedAt;
 delete latest[0].result.humanEdit.approvedAt;
 delete latest[0].result.criteriaReview;
 const changed=JSON.stringify(latest);
 w.localStorage.setItem(key,changed);
 await download.onclick();
 assert.equal(downloads.length,2);
 assert.equal(w.document.querySelector('#approved-handoff-packet'),null);
 assert.match(w.document.querySelector('.notice').textContent,/Board changed in another tab/);
 assert.equal(w.localStorage.getItem(key),changed);
 assert.equal(fetches,initialFetches);
 assert.equal(modelCalls,0);
 assert.equal(lockHeld,false);
});

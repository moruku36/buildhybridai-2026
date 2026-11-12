import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveHumanEdit,reviewedText,handoffText,validateHumanEdits} from '../src/review-edit.js';
import {previewCore,move,validateTasks,loadCore} from '../src/policy.js';
import {archiveRejectedDraft,validateHistory} from '../src/draft-history.js';
import {buildDraftPrompt} from '../src/draft-prompt.js';
const task=()=>({id:'a',title:'Public',brief:'Draft plan',priority:1,sequence:0,state:'done',mode:'cloud',cloudAllowed:true,result:{text:'AI original',source:'in_cloud',createdAt:'2026-11-12T00:00:00Z'}});
test('human editing keeps original, uses explicit review transition and cannot enter prompts',()=>{
 const t=task();saveHumanEdit(t,'Human version','2026-11-12T01:00:00Z');move(previewCore,t,'edit');
 assert.equal(t.state,'review');assert.equal(t.result.text,'AI original');assert.equal(t.result.source,'in_cloud');assert.equal(reviewedText(t),'Human version');
 assert.throws(()=>handoffText(t));assert.ok(!buildDraftPrompt(t).includes('Human version'));
 move(previewCore,t,'approve');t.result.humanEdit.approvedAt='2026-11-12T02:00:00Z';validateTasks([t]);assert.equal(handoffText(t),'Human version');
 saveHumanEdit(t,'Another human version');move(previewCore,t,'edit');assert.equal(t.result.humanEdit.approvedAt,undefined);
 assert.throws(()=>saveHumanEdit(t,' '));assert.throws(()=>saveHumanEdit(t,'x'.repeat(20001)));
 assert.throws(()=>saveHumanEdit({...t,kind:'json-check'},'tampered report'));
 assert.throws(()=>validateHumanEdits([{...t,state:'done'}]));
});
test('sent-back history retains bounded original plus separately labeled edit within shared budget',()=>{
 const t=task();saveHumanEdit(t,'x'.repeat(9000));move(previewCore,t,'edit');archiveRejectedDraft([t],t);
 assert.equal(t.history[0].text,'AI original');assert.equal(t.history[0].humanEdit.text.length,8000);assert.equal(t.history[0].humanEdit.shortened,true);validateHistory([t]);
 assert.throws(()=>validateHistory([{history:[{...t.history[0],humanEdit:{text:3}}]}]));
});
test('old WASM without edit transition is rejected rather than silently mixing policies',async()=>{
 const fetch=globalThis.fetch,instantiate=WebAssembly.instantiate;
 try{globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});WebAssembly.instantiate=async()=>({instance:{exports:{...previewCore,transition:()=>-1}}});
 assert.equal((await loadCore()).rust,false);
 }finally{globalThis.fetch=fetch;WebAssembly.instantiate=instantiate;}
});

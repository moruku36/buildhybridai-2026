import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectDraft,generateInspectedDraft} from '../src/draft-preflight.js';

// Three synthetic cases PASS once on 2026-11-14 (3 cases / 1 invocation).
// Mocked unit evidence only; no browser, device, Firebase or live acceptance.
// Historical 10/3, additional 5/1 and this separate 3/1 allowance are exhausted.
// Do not rerun this file (including in CI) without a new explicit allowance.
const task=()=>({id:'output-limit',kind:'ai',title:'Public example',brief:'Draft a bounded plan.',state:'queued',mode:'local',cloudAllowed:false});
function setup(text){
 const current=task(),inspection=inspectDraft(current);current.state='running';
 const calls=[];
 const prepared={ready:Promise.resolve(),model:{generateContent:async prompt=>{
  calls.push(prompt);return {response:{text:()=>text,inferenceSource:'on_device'}};
 }}};
 return {current,inspection,prepared,calls};
}
test('oversized output fails instead of becoming a silently truncated review or handoff artifact',async()=>{
 const s=setup('x'.repeat(20001));let checks=0;
 await assert.rejects(generateInspectedDraft(s.current,s.prepared,s.inspection,()=>{checks++;}),/No partial draft was saved.*request already ran.*no automatic retry/);
 assert.equal(checks,1);assert.deepEqual(s.calls,[s.inspection.prompt]);assert.equal(s.current.result,undefined);
});
test('exactly 20,000 UTF-16 units retain the whole Unicode response and SDK source',async()=>{
 const text='📚'.repeat(10000),s=setup(text);
 const result=await generateInspectedDraft(s.current,s.prepared,s.inspection,()=>{});
 assert.equal(result.text,text);assert.equal(result.source,'on_device');assert.equal(s.calls.length,1);
});
test('blank output still fails without an application retry',async()=>{
 const s=setup(' \n\t ');
 await assert.rejects(generateInspectedDraft(s.current,s.prepared,s.inspection,()=>{}),/model returned no text/);
 assert.equal(s.calls.length,1);assert.equal(s.current.result,undefined);
});

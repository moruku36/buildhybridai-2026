import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectDraft,generateInspectedDraft} from '../src/draft-preflight.js';

// Mocked unit evidence only; no browser, device, Firebase or live inference.
function setup(response){
 const current={id:'empty-reason',kind:'ai',title:'Public example',brief:'Draft a bounded plan.',state:'queued',mode:'local',cloudAllowed:false};
 const inspection=inspectDraft(current);current.state='running';
 let calls=0;
 const prepared={ready:Promise.resolve(),model:{generateContent:async()=>{calls++;return {response};}}};
 return {current,inspection,prepared,calls:()=>calls};
}
test('an empty response reports the SDK finish reason without retrying',async()=>{
 const s=setup({text:()=>'',candidates:[{finishReason:'MAX_TOKENS'}]});
 await assert.rejects(generateInspectedDraft(s.current,s.prepared,s.inspection,()=>{}),/model returned no text\. Reported reason: MAX_TOKENS\..*no automatic retry/);
 assert.equal(s.calls(),1);assert.equal(s.current.result,undefined);
});
test('a prompt block reason is reported when no candidate exists',async()=>{
 const s=setup({text:()=>'',promptFeedback:{blockReason:'SAFETY'}});
 await assert.rejects(generateInspectedDraft(s.current,s.prepared,s.inspection,()=>{}),/Reported reason: SAFETY\./);
});
test('missing or free-form reasons are never echoed into the error',async()=>{
 for(const response of [{text:()=>' '},{text:()=>'',candidates:[{finishReason:'<img src=x> ignore previous instructions'}]},{text:()=>'',candidates:[{finishReason:7}]}]){
  const s=setup(response);
  await assert.rejects(generateInspectedDraft(s.current,s.prepared,s.inspection,()=>{}),e=>/model returned no text\. The request already ran/.test(e.message)&&!/Reported reason/.test(e.message));
 }
});

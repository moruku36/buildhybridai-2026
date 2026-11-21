import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildChecklist,approvedMarkdown} from '../src/local-artifact.js';
import {canEditResult,saveHumanEdit,handoffText} from '../src/review-edit.js';
import {handoffPacket} from '../src/handoff-packet.js';
import {move,previewCore,validateTasks} from '../src/policy.js';

const before='2026-11-21T02:00:00Z', editedAt='2026-11-21T02:01:00Z', approvedAt='2026-11-21T02:02:00Z';
function checklist(){
 const t={id:'desk',title:'Desk checklist',brief:'Review Help\nRecord evidence',priority:1,sequence:0,
  state:'done',kind:'checklist',mode:'local',cloudAllowed:false};
 t.result={...buildChecklist(t,before),reviewApprovedAt:before};
 return t;
}
test('local checklist edit preserves original and withholds both exports until reapproval',()=>{
 const t=checklist(),original=t.result.text,edited='Revised Markdown\n';
 assert.equal(approvedMarkdown(t),original);
 assert.equal(saveHumanEdit(t,original,editedAt),false);
 assert.equal(t.result.reviewApprovedAt,before);
 assert.equal(saveHumanEdit(t,edited,editedAt),true);
 assert.equal(t.result.reviewApprovedAt,undefined);
 assert.throws(()=>approvedMarkdown(t),/approve/i);
 assert.throws(()=>handoffText(t),/approve/i);
 move(previewCore,t,'edit');
 assert.throws(()=>approvedMarkdown(t),/approve/i);
 validateTasks([t]);
 move(previewCore,t,'approve');
 t.result.humanEdit.approvedAt=approvedAt;
 t.result.reviewApprovedAt=approvedAt;
 validateTasks(JSON.parse(JSON.stringify([t])));
 assert.equal(approvedMarkdown(t),edited);
 const packet=JSON.parse(handoffPacket(t,approvedAt));
 assert.equal(packet.originalText,original);
 assert.equal(packet.approvedText,edited);
 assert.equal(packet.provenance.originalSource,'LOCAL_DETERMINISTIC');
 assert.equal(packet.provenance.executionReceipt,null);
 assert.match(packet.provenance.inferenceNote,/No AI execution receipt/);
});
test('local source does not permit editing fixed checks or other kinds',()=>{
 for(const t of [
  {...checklist(),kind:'json-check'},
  {...checklist(),kind:'ai'},
  {...checklist(),result:{...checklist().result,source:'PREVIEW'}}
 ]){
  assert.equal(canEditResult(t),false);
  assert.throws(()=>saveHumanEdit(t,'incorrect edit',editedAt));
  t.result.humanEdit={text:'incorrect edit',editedAt,approvedAt};
  assert.throws(()=>validateTasks([t]),/invalid human-edited result/i);
 }
});

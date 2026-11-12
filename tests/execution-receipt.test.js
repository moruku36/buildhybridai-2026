import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createExecutionReceipt,validateExecutionReceipt,executionReceiptLines} from '../src/execution-receipt.js';
import {validateTasks} from '../src/policy.js';
import {archiveRejectedDraft,validateHistory} from '../src/draft-history.js';
import {handoffPacket} from '../src/handoff-packet.js';
import {saveHumanEdit} from '../src/review-edit.js';
import {buildDraftPrompt} from '../src/draft-prompt.js';
const task=()=>({id:'receipt-test',title:'Public plan',brief:'Fictional workshop',priority:1,sequence:0,state:'done',mode:'hybrid',cloudAllowed:true,result:{text:'Original draft',source:'in_cloud',executionReceipt:createExecutionReceipt('hybrid','in_cloud',1234.7)}});
test('receipts distinguish requested route from actual SDK source, elapsed time and unknowns',()=>{
 const t=task(),r=t.result.executionReceipt;assert.equal(r.elapsedMs,1235);validateTasks([t]);
 const lines=executionReceiptLines(t.result).join(' ');assert.match(lines,/Prefer device/);assert.match(lines,/Cloud \(SDK-reported\)/);assert.match(lines,/1,235 ms/);assert.match(lines,/fallback reason was not recorded/);assert.match(lines,/not a model benchmark or cost estimate/);
 assert.equal(createExecutionReceipt('cloud','unexpected',-1).actualSource,'UNKNOWN');
 for(const invalid of [-1,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.equal(createExecutionReceipt('local','on_device',invalid).elapsedMs,null);
 assert.throws(()=>createExecutionReceipt('invented','in_cloud',1));
 assert.match(executionReceiptLines({source:'in_cloud'}).join(' '),/unknown/);
 assert.match(executionReceiptLines({source:'TEST_FIXTURE'}).join(' '),/No AI execution receipt/);
 const legacy=task();legacy.result.source='future-source';delete legacy.result.executionReceipt;validateTasks([legacy]);
 const legacyLines=executionReceiptLines(legacy.result).join(' ');assert.match(legacyLines,/unknown/);assert.doesNotMatch(legacyLines,/preview, fixture or local|No AI/);
 assert.match(executionReceiptLines({source:'in_cloud',executionReceipt:createExecutionReceipt('local','in_cloud',1)}).join(' '),/Warning/);
});
test('receipt validation rejects forged shape, invalid bounds and mismatched source but accepts legacy',()=>{
 const r=task().result.executionReceipt;validateExecutionReceipt(undefined,'in_cloud');
 for(const bad of [null,{...r,version:2},{...r,requestedMode:'other'},{...r,elapsedMs:-1},{...r,elapsedMs:0.5},{...r,elapsedMs:Infinity},{...r,actualSource:'on_device'},{...r,extra:'arbitrary data'}])assert.throws(()=>validateExecutionReceipt(bad,'in_cloud'));
 for(const source of ['PREVIEW','LOCAL_DETERMINISTIC','TEST_FIXTURE'])assert.throws(()=>validateExecutionReceipt({...r,actualSource:'UNKNOWN'},source));
 assert.throws(()=>validateTasks([{...task(),kind:'checklist',mode:'local',cloudAllowed:false}]));
});
test('original receipt survives human edits and bounded history, enters handoff, never a model prompt',()=>{
 const t=task(),before=structuredClone(t.result.executionReceipt);saveHumanEdit(t,'Human edited plan');t.result.humanEdit.approvedAt='2026-11-12T00:00:00Z';
 assert.deepEqual(JSON.parse(handoffPacket(t)).provenance.executionReceipt,before);
 assert.doesNotMatch(buildDraftPrompt(t),/executionReceipt|elapsedMs|actualSource/);
 archiveRejectedDraft([t],t);assert.deepEqual(t.history[0].executionReceipt,before);validateHistory([t]);
 t.result.executionReceipt.elapsedMs=2;assert.equal(t.history[0].executionReceipt.elapsedMs,1235);
 const legacy=task();delete legacy.result.executionReceipt;assert.equal(JSON.parse(handoffPacket(legacy)).provenance.executionReceipt,null);
 assert.throws(()=>validateHistory([{history:[{...t.history[0],executionReceipt:{...before,elapsedMs:-2}}]}]));
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {archiveRejectedDraft,validateHistory,HISTORY_BOARD_BUDGET} from '../src/draft-history.js';
const result={text:'Draft',source:'in_cloud',createdAt:'2026-11-12T00:00:00Z'};
test('sent-back history retains source, timestamps and feedback with per-task truncation',()=>{
 const t={result:{...result,text:'x'.repeat(9000)},feedback:'Use fewer steps'},tasks=[t];
 for(let i=0;i<4;i++)archiveRejectedDraft(tasks,t,`2026-11-12T00:00:0${i}Z`);
 assert.equal(t.history.length,3);assert.equal(t.historyPruned,1);
 const h=t.history[0];assert.equal(h.text.length,8000);assert.equal(h.shortened,true);assert.equal(h.source,'in_cloud');assert.equal(h.reviewState,'sent_back');assert.equal(h.feedback,t.feedback);
 assert.equal(h.createdAt,result.createdAt);validateHistory(tasks);
});
test('global history budget prunes oldest records without changing live results',()=>{
 const tasks=Array.from({length:15},(_,i)=>({result:{...result,text:'x'.repeat(8000)},feedback:''}));
 tasks.forEach((t,i)=>archiveRejectedDraft(tasks,t,new Date(Date.UTC(2026,10,12,0,0,i)).toISOString()));
 const total=tasks.flatMap(t=>t.history||[]).reduce((n,h)=>n+h.text.length+h.feedback.length,0);
 assert.ok(total<=HISTORY_BOARD_BUDGET);assert.equal(tasks[0].historyPruned,1);
 assert.equal(tasks[0].result.text.length,8000);validateHistory(tasks);
});
test('history validation is backward compatible and rejects invalid persisted data',()=>{
 validateHistory([{}]);
 const t={result};archiveRejectedDraft([t],t);const h=t.history[0];
 for(const bad of [{...h,text:'x'.repeat(8001)},{...h,source:'fake-success'},{...h,reviewState:'approved'},{...h,archivedAt:'bad'},{...h,feedback:3}])assert.throws(()=>validateHistory([{history:[bad]}]));
});

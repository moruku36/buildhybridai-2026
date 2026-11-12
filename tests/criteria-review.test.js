import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {completionCriteria,criteriaSummary,recordCriteriaReview,validateCriteriaReviews,criteriaControls} from '../src/criteria-review.js';
import {prepareIssueTask} from '../src/issue-intake.js';
import {saveHumanEdit} from '../src/review-edit.js';
import {handoffPacket} from '../src/handoff-packet.js';
const task=()=>({...prepareIssueTask({title:'Synthetic',goal:'Plan',constraints:'No execution',acceptanceCriteria:'Describe validation\nDescribe manual test',priority:1}),id:'t',state:'review',result:{source:'in_cloud',text:'Draft',createdAt:'unknown'}});
test('criteria require explicit unresolved override; edited and regenerated drafts lose assessment',()=>{
 const t=task();assert.equal(completionCriteria(t).length,2);
 assert.throws(()=>recordCriteriaReview(t,['addressed','unverified'],false,''));assert.equal(t.result.criteriaReview,undefined);
 recordCriteriaReview(t,['addressed','missing'],true,'Follow-up needed');t.state='done';validateCriteriaReviews([t]);
 const p=JSON.parse(handoffPacket(t));assert.equal(p.draftContentReview.items[1].status,'missing');assert.match(p.draftContentReview.scope,/no tests/);
 saveHumanEdit(t,'Human replacement');assert.equal(t.result.criteriaReview,undefined);assert.equal(criteriaSummary(t).items[0].status,'unverified');
 t.result={text:'New draft',source:'in_cloud'};assert.equal(criteriaSummary(t).reviewedAt,null);
});
test('changed conditions and legacy approvals cannot inherit an assessment; bounded validation',()=>{
 const t=task();recordCriteriaReview(t,['addressed','addressed'],false,'');t.state='done';validateCriteriaReviews([t]);
 t.brief=t.brief.replace('Describe validation','Changed criterion');assert.equal(criteriaSummary(t).items[0].status,'unverified');
 assert.throws(()=>recordCriteriaReview(t,['missing','unverified'],true,'x'.repeat(501)));
 t.result.criteriaReview.statuses=['invented'];assert.throws(()=>validateCriteriaReviews([t]));
 delete t.result.criteriaReview;assert.equal(criteriaSummary(t).reviewedAt,null);
});
test('DOM uses text safely; controls require deliberate judgment and unresolved reason',()=>{
 const dom=new JSDOM('<main></main>'),d=dom.window.document,t=task();t.brief=t.brief.replace('Describe validation','<img src=x onerror=alert(1)>');
 const save=criteriaControls(d,t,d.querySelector('main'));assert.equal(d.querySelector('img'),null);assert.throws(save);
 const selects=d.querySelectorAll('select');assert.equal(selects[0].value,'unverified');
 selects[0].value='addressed';selects[1].value='missing';d.querySelector('input').checked=true;d.querySelector('textarea').value='Needs follow-up';save();
 assert.equal(t.result.criteriaReview.overrideReason,'Needs follow-up');
});

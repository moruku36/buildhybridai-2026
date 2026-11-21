import {reviewFixtureEnabled,isReviewFixture} from './review-fixture-mode.js';
import {LOCAL_SOURCE} from './local-artifact.js';
const sources=['in_cloud','on_device','UNKNOWN'];
const standardResult=t=>(t.kind===undefined||t.kind==='ai')&&['review','done'].includes(t.state)&&sources.includes(t.result?.source)&&typeof t.result?.text==='string';
const editableChecklist=t=>t.kind==='checklist'&&t.result?.source===LOCAL_SOURCE&&['review','done'].includes(t.state)&&typeof t.result.text==='string';
const editableResult=t=>standardResult(t)||editableChecklist(t);
export const canEditResult=t=>editableResult(t)||(reviewFixtureEnabled&&isReviewFixture(t)&&['review','done'].includes(t.state));
export const reviewedText=t=>t.result?.humanEdit?.text??t.result?.text;
export function saveHumanEdit(task,text,now=new Date().toISOString()){
 if(!canEditResult(task))throw Error('Only AI drafts and local checklists can be edited.');
 if(typeof text!=='string'||!text.trim()||text.length>20000)throw Error('Use 1–20,000 characters of nonblank text.');
 if(text===reviewedText(task))return false;
 task.result.humanEdit={text,editedAt:now};delete task.result.reviewApprovedAt;delete task.result.criteriaReview;return true;
}
export function handoffText(task){
 if(!canEditResult(task)||task.state!=='done'||(task.result.humanEdit&&!task.result.humanEdit.approvedAt))throw Error('Approve the current version before handoff.');
 return reviewedText(task);
}
export function validateHumanEdits(tasks){
 for(const task of tasks){const approved=task.result?.reviewApprovedAt;if(approved!==undefined&&(task.state!=='done'||typeof approved!=='string'||approved.length>64||!Number.isFinite(Date.parse(approved))))throw Error('Invalid result approval');const h=task.result?.humanEdit;if(h===undefined)continue;
  if(!(editableResult(task)||isReviewFixture(task))||!h||typeof h.text!=='string'||!h.text.trim()||h.text.length>20000||typeof h.editedAt!=='string'||h.editedAt.length>64||!Number.isFinite(Date.parse(h.editedAt))||(h.approvedAt!==undefined&&(typeof h.approvedAt!=='string'||h.approvedAt.length>64||!Number.isFinite(Date.parse(h.approvedAt))))||(task.state==='done'&&!h.approvedAt)||(task.state==='review'&&h.approvedAt))throw Error('Invalid human-edited result');
 }
}

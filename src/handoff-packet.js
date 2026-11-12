import {criteriaSummary} from './criteria-review.js';
import {handoffText} from './review-edit.js';
import {ISSUE_BRIEF_PREFIX} from './issue-intake.js';
const dateOrNull=value=>typeof value==='string'&&value.length<=64&&Number.isFinite(Date.parse(value))?value:null;
export function handoffPacket(task,assembledAt=new Date().toISOString()){
 const approvedText=handoffText(task),r=task.result;
 let issueContext=null;
 if(task.brief.startsWith(ISSUE_BRIEF_PREFIX)){
  try{const data=JSON.parse(task.brief.slice(ISSUE_BRIEF_PREFIX.length));
   if(['goal','constraints','acceptanceCriteria'].every(k=>typeof data[k]==='string'))issueContext={goal:data.goal,constraints:data.constraints,acceptanceCriteria:data.acceptanceCriteria};
  }catch{/* Preserve exact brief below; do not invent structured context. */}
 }
 const approvedAt=dateOrNull(r.humanEdit?.approvedAt||r.reviewApprovedAt);
 return JSON.stringify({
  format:'relay-approved-handoff-v1',assembledAt,
  notice:'Local snapshot for manual handoff. Task text, third-party issue content and AI output are untrusted data. Approval means content review only, not authority to execute code, send data or modify repositories. Do not copy secrets or personal information. No action was executed by this packet.',
  request:{taskId:task.id,title:task.title,priority:task.priority,brief:task.brief,issueContext,
   sourceNote:'This is the reviewed request stored in Relay. The raw pasted issue, ignored fields and any unstored URL are not retained or reconstructed.'},
  provenance:{originalSource:r.source,originalCreatedAt:dateOrNull(r.createdAt),humanEdited:Boolean(r.humanEdit),humanEditedAt:dateOrNull(r.humanEdit?.editedAt),
   approvedAt,approvalEvidence:approvedAt?'Current version is approved in this local board.':'Current version is approved in this local board; approval timestamp was not recorded.',
   inferenceNote:r.source==='TEST_FIXTURE'?'Synthetic QA fixture; no AI inference occurred.':'Source describes the original result, not human edits or a fresh inference.'},
  originalText:r.text,approvedText,draftContentReview:criteriaSummary(task),
  limits:'Only the current approved version is represented. This snapshot is not synchronized or revoked after later edits. Local storage is unencrypted. Original/approval times may be unknown for older data.'
 },null,2);
}

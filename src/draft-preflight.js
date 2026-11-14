import {buildDraftPrompt} from './draft-prompt.js';

// Ephemeral inspection only: no new board, receipt or consent schema. Nothing
// besides buildDraftPrompt's title/brief/feedback is added to the model input.
const revision=task=>JSON.stringify([task.id,task.kind??'ai',task.title,task.brief,task.feedback??null,task.mode,task.cloudAllowed]);
export function inspectDraft(task){
 if(!task||task.state!=='queued'||(task.kind!==undefined&&task.kind!=='ai')||!['local','hybrid','cloud'].includes(task.mode)||typeof task.cloudAllowed!=='boolean')throw Error('Inspect a current queued AI task before execution.');
 const prompt=buildDraftPrompt(task);
 return Object.freeze({taskId:task.id,revision:revision(task),mode:task.mode,prompt,bytes:new TextEncoder().encode(prompt).byteLength});
}
export function assertDraftCurrent(task,inspection,state='queued'){
 if(!inspection||!task||task.state!==state||revision(task)!==inspection.revision||buildDraftPrompt(task)!==inspection.prompt)throw Error('Task content or route changed. Reopen Run this task only and inspect again.');
 if(task.mode!=='local'&&!task.cloudAllowed)throw Error('Current cloud permission is required. Review Edit execution, then inspect again.');
}

// Check after asynchronous device preparation, immediately before the ONLY
// generateContent call. assertCurrent synchronously checks the real board lock,
// storage freshness, membership/lifecycle and page-session attempt cap.
export async function generateInspectedDraft(task,prepared,inspection,assertCurrent){
 await prepared.ready;
 assertCurrent();
 assertDraftCurrent(task,inspection,'running');
 const result=await prepared.model.generateContent(inspection.prompt);
 const text=result.response.text();if(!text.trim())throw Error('The model returned no text.');
 // Never make an incomplete draft look like the full result a human approved.
 // Inference has already happened; fail without saving a truncated artifact.
 if(text.length>20000)throw Error('The model returned more than 20,000 characters. No partial draft was saved. The request already ran and may have consumed quota; no automatic retry. Use a narrower brief before explicitly retrying.');
 return {text,source:result.response.inferenceSource||'UNKNOWN',createdAt:new Date().toISOString()};
}

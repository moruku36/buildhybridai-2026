import {createExecutionReceipt,executionReceiptLines} from './execution-receipt.js';
import {criteriaControls} from './criteria-review.js';
import {handoffPacket} from './handoff-packet.js';
import {canEditResult,reviewedText,saveHumanEdit,handoffText} from './review-edit.js';
import {reviewFixtureEnabled,isReviewFixture} from './review-fixture-mode.js';
import {makeReviewFixture} from './review-fixture.js';
import {showIssueIntake} from './issue-intake.js';
import {buildJsonReport} from './json-check.js';
import {buildChecklist,approvedMarkdown,LOCAL_SOURCE} from './local-artifact.js';
import {archiveRejectedDraft} from './draft-history.js';
import './style.css';
import {loadCore,move,nextTask,recover,validateTasks} from './policy.js';
import {recordInference,runtimeStatus} from './runtime-status.js';
import {checkDeviceAvailability,describeDeviceAvailability} from './device-diagnostics.js';
let checkingDevice=false;
const observed={cloud:false,device:false,last:null};
const {core,rust}=await loadCore();
import {withExclusiveBoardLock} from './board-lock.js';
const key='relay-board-v1';
const isLocalTask=t=>['checklist','json-check'].includes(t.kind);
let storageSnapshot=null,lockHeld=false;
const boardLocks=globalThis.navigator?.locks;
const locksAvailable=typeof boardLocks?.request==='function';
let tasks,storageError='';
const seed=[{id:'welcome',title:'Shape the launch story',brief:'Draft a concise launch narrative for Relay, a hybrid AI workboard that turns a prioritized backlog into reviewable work. Include the privacy benefit and a practical example.',priority:1,sequence:0,state:'queued',mode:'local',cloudAllowed:false},{id:'review-plan',title:'Plan a three-minute demo',brief:'Create a demo storyboard showing a local-only draft, an explicitly cloud-enabled draft, and a human review gate.',priority:2,sequence:1,state:'queued',mode:'hybrid',cloudAllowed:false}];
try{storageSnapshot=localStorage.getItem(key);tasks=validateTasks(JSON.parse(storageSnapshot||'null')||seed);}catch{tasks=structuredClone(seed);storageError='Saved board was invalid; showing sample tasks. Original storage is not overwritten until your next change.';}
let active=false,stop=false,calls=0,selected=null,notice=storageError,api=null;
const $=s=>document.querySelector(s);
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const STALE_BOARD_NOTICE="Board changed in another tab. Refreshed without saving; inspect it and retry explicitly.";
function checkSnapshot(){
 const current=localStorage.getItem(key);
 if(current!==storageSnapshot){
  tasks=validateTasks(JSON.parse(current||'null')||structuredClone(seed));storageSnapshot=current;
  for(const dialog of document.querySelectorAll('dialog')){if(dialog.dataset.preserveEdit){dialog.dataset.stale='true';dialog.querySelector('[data-save-edit]').disabled=true;dialog.append(node('p','Board changed elsewhere. Your unsaved text is kept here for manual copying. Cancel and reopen the latest result to edit.'));}else dialog.remove();}
  throw Error(STALE_BOARD_NOTICE);
 }
}
function persist(){
 if(!lockHeld)throw Error('Board lock required. No changes saved.');
 checkSnapshot();
 try{const value=JSON.stringify(tasks);localStorage.setItem(key,value);storageSnapshot=value;if(notice===STALE_BOARD_NOTICE)notice='Board changes saved.';}
 catch{throw Error('Storage is unavailable or full. No further execution; export your board before closing.');}
}
async function withBoardWrite(action,onError){
 try{
  if(lockHeld&&active){checkSnapshot();return await action();}
  return await withExclusiveBoardLock(boardLocks,async()=>{
   lockHeld=true;
   try{checkSnapshot();if(tasks.some(t=>t.state==='running')){tasks=recover(tasks);persist();throw Error('Interrupted work blocked. A previous request may have consumed quota; inspect and retry explicitly.');}return await action();}finally{lockHeld=false;}
  });
 }catch(e){notice=String(e.message||e);render();onError?.(notice);}
}
function log(text){notice=text;render();}
function render(){
 $('#app').replaceChildren();
 const shell=node('div',undefined,'shell');shell.innerHTML='<aside><a class="brand" href="#">◈ <b>Relay</b></a><div class="workspace">PERSONAL WORKSPACE</div><div class="nav active">▦ &nbsp; Workboard</div><div class="aside-note">Small tasks.<br>Real progress.<br><strong>You stay in control.</strong></div><div class="engine"></div></aside><main><header><div><span class="eyebrow">BUILD SOMETHING THAT MATTERS</span><h1>Your next move,<br>already in motion.</h1><p>A priority queue for AI drafts, local checklists and JSON checks. Every result comes back to you.</p></div><span class="tag">LOCAL-FIRST · WEB MVP</span></header><section class="toolbar"><div class="status"></div><div class="controls"></div></section><div class="notice" role="status" aria-live="polite"></div><section class="stats"></section><div class="section-title"><h2>Workboard</h2><span>Prioritize → draft → review → done</span></div><section class="board"></section><section class="composer"><h2>Add a task</h2><form><label for="task-kind">Task type<select id="task-kind" name="kind"><option value="ai">AI draft</option><option value="checklist">Local checklist · no AI or network</option><option value="json-check">Local backlog JSON check · no AI or network</option></select></label><p>For local checklists, enter one item per brief line. Items are organized, never executed. Reviewer notes are copied, not interpreted.</p><p>JSON check: array of objects with unique id (string, max 80 characters), title (string, max 160) and priority (integer 1–3). Strings must be nonblank. Max 4,000 characters, 50 records, depth 8, 500 nodes. Fixed checks only; no external resources. To correct input, add a new task.</p><label>Task title<input name="title" required maxlength="160" placeholder="What would you like to move forward?"></label><label>Brief<textarea name="brief" required maxlength="4000" placeholder="Provide public or non-sensitive task details. No passwords or personal data."></textarea></label><div class="form-row"><label for="task-priority">Priority<select id="task-priority" name="priority"><option value="1">P1 · Next up</option><option value="2" selected>P2 · Important</option><option value="3">P3 · Later</option></select></label><label for="task-mode">Inference route<select id="task-mode" name="mode"><option value="local">On-device only · no cloud fallback</option><option value="hybrid">Prefer device · cloud fallback</option><option value="cloud">Cloud only</option></select></label></div><label class="check"><input type="checkbox" name="consent"> Allow this task’s title, brief and revision feedback to be sent to Google through Firebase AI Logic, including cloud fallback. Requests may consume project quota.</label><button class="primary" type="submit">＋ Add to queue</button></form></section><footer>Runs only while this tab stays open; closing it stops local work. No shell execution or automatic publishing. Local storage is not encrypted. Keep sensitive data out.</footer></main>';
 $('#app').append(shell);
 $('.engine').textContent=rust?'◉ Rust / WASM core':'○ Preview core · Rust missing or outdated';
 $('.status').append(node('strong',active?'Queue is working': 'Agent is paused'),node('small',runtimeStatus(Boolean(api?.configured),observed)));
 const controls=$('.controls');const start=node('button',active?'Pause after current':'Start queue','primary');start.disabled=!locksAvailable||!rust||(!active&&!tasks.some(t=>t.state==='queued'));start.onclick=()=>active?(stop=true,log('Pausing after the current request. It may still consume quota.')):run();controls.append(start);
 const intake=node('button','Prepare public issue');intake.disabled=active||!locksAvailable;intake.onclick=()=>{if(active)return;const id=crypto.randomUUID();showIssueIntake({document,onCommit:draft=>withBoardWrite(()=>{if(active)throw Error('Pause the queue before adding an issue.');if(tasks.some(t=>t.id===id))throw Error('This issue was already added.');if(tasks.length>=100)throw Error('This MVP is limited to 100 tasks.');const task={...draft,id,sequence:Math.max(-1,...tasks.map(t=>t.sequence))+1,state:'queued',kind:'ai',mode:'local',cloudAllowed:false};validateTasks([...tasks,task]);tasks.push(task);try{persist();}catch(e){tasks=tasks.filter(t=>t!==task);throw e;}notice='Issue added, not executed. The device model may be unavailable in Brave. For cloud use, inspect and allow the content in Edit execution, then Start queue.';render();return true;})});};controls.append(intake);
 if(import.meta.env?.DEV&&reviewFixtureEnabled){const fixture=node('button','Add synthetic review example (no AI)');fixture.disabled=active||!locksAvailable;fixture.onclick=()=>withBoardWrite(()=>{if(active)throw Error('Pause first.');if(tasks.some(t=>t.id==='relay-review-fixture-v2'))return log('Synthetic review example already exists; no duplicate added.');if(tasks.length>=100)throw Error('Board limit reached.');const t=makeReviewFixture(Math.max(-1,...tasks.map(x=>x.sequence))+1);validateTasks([...tasks,t]);tasks.push(t);try{persist();}catch(e){tasks=tasks.filter(x=>x!==t);throw e;}notice='TEST_FIXTURE added locally. Synthetic data, no inference, no Firebase initialization.';render();});controls.append(fixture);}
 const demo=node('button','Preview workflow');demo.disabled=active||!locksAvailable;demo.onclick=()=>withBoardWrite(()=>{const t=nextTask(core,tasks);if(!t)return log('Add a task to preview.');move(core,t,'start');move(core,t,'result');t.result={text:'PREVIEW FIXTURE — not AI-generated.\n\nThis is where your completed draft will appear. Review it, then approve it or send it back to the queue. No inference request was made.',source:'PREVIEW',createdAt:new Date().toISOString()};persist();render();});controls.append(demo);
 const diagnose=node('button',checkingDevice?'Checking device…':'Check device availability');diagnose.disabled=active||checkingDevice;diagnose.onclick=async()=>{if(checkingDevice||active)return;checkingDevice=true;log('Checking browser availability only. No model creation, download, inference or Firebase initialization.');try{const result=await checkDeviceAvailability(globalThis.LanguageModel);notice=describeDeviceAvailability(result)+' Checked Relay text-only options: English text input and output.';}catch{notice='Device availability is unknown. No inference was run.';}finally{checkingDevice=false;render();}};controls.append(diagnose);
 const connect=node('button','Initialize connection');connect.disabled=active;connect.onclick=async()=>{connect.disabled=true;try{api=await import('./ai.js');if(api.debugRequested&&!globalThis.confirm('Initialize local App Check debugging? Firebase may generate and store a private debug credential in this browser and show it in the developer console. Keep it private. No model inference will run.'))return;const result=api.initializeConnection();log(result.debug?'Local debug initialized. Keep the browser console private; token registration is a separate authorized setup step. No inference sent.':'Firebase SDK initialized. Attestation and inference are not verified. No inference sent.');}catch(e){log(String(e.message||e));}finally{render();}};controls.append(connect);
 const verify=node('button','Verify App Check');verify.disabled=active;verify.onclick=async()=>{verify.disabled=true;try{api=await import('./ai.js');if(!globalThis.confirm('Have you completed App Check registration? Verify once with Firebase now. This sends app attestation to Firebase, but runs no model inference.'))return;await api.verifyAppCheck();log('App Check verified once. No model inference sent; inference remains unverified.');}catch{log('App Check verification failed. Check registration and configuration. No automatic retry or model inference.');}finally{render();}};controls.append(verify);
 const exp=node('button','Export');exp.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,tasks},null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download='relay-board.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};controls.append(exp);
 $('.notice').textContent=notice||(!rust?'Preview mode: build or rebuild the Rust core (npm run build:core) to enable task execution. Preview results are clearly labeled and never count as inference.':'Ready for configuration. Live requests only start after you press Start queue or Run this task only.');
 for(const [label,value] of [['Queued',tasks.filter(t=>t.state==='queued').length],['Awaiting review',tasks.filter(t=>t.state==='review').length],['Completed',tasks.filter(t=>t.state==='done').length],['Session attempts',`${calls} / 6`]]){const box=node('div',undefined,'stat');box.append(node('strong',value),node('span',label));$('.stats').append(box);}
 for(const [state,label] of [['queued','Up next'],['running','In motion'],['review','Your review'],['done','Done'],['blocked','Needs attention']]){const col=node('div',undefined,'column');const items=tasks.filter(t=>t.state===state).sort((a,b)=>core.rank(a.priority,a.sequence)-core.rank(b.priority,b.sequence));const heading=node('h3',label);heading.append(node('span',items.length));col.append(heading);if(!items.length)col.append(node('div',state==='review'?'Good work deserves a second look.':'Clear space for what’s next.','empty'));for(const t of items){const card=node('article',undefined,'card');const meta=node('div',undefined,'card-meta');meta.append(node('span',`P${t.priority}`,`priority p${t.priority}`),node('span',isReviewFixture(t)?'TEST_FIXTURE · not AI':t.kind==='json-check'?'▦ Local JSON check · no AI':t.kind==='checklist'?'▦ Local checklist · no AI':t.mode==='local'?'◉ On device':t.mode==='hybrid'?'◈ Hybrid':'☁ Cloud'));card.append(meta,node('h4',t.title),node('p',t.brief.slice(0,130)));if(t.history?.length){const history=node('button',`Previous drafts (${t.history.length})`);history.onclick=()=>showHistory(t);card.append(history);}if(t.historyPruned)card.append(node('small','Older saved drafts were trimmed to limit local storage.'));if(t.feedback)card.append(node('p','Revision feedback: '+t.feedback.slice(0,130)));if(t.error)card.append(node('p',t.error,'error'));if(t.result){card.append(node('span',t.result.source,'source'));const open=node('button','Read result');open.onclick=()=>showResult(t);card.append(open);}if(state==='queued'||state==='blocked'){const edit=node('button','Edit execution');edit.disabled=active||isLocalTask(t);edit.onclick=()=>{if(!active)showExecutionSettings(t);};card.append(edit);}if(state==='queued'){const runOne=node('button','Run this task only');runOne.disabled=active||!rust||!locksAvailable;runOne.title='Run only this task, then pause. Other queued tasks will not run.';runOne.onclick=()=>run(t.id);card.append(runOne);const p=node('button','Change priority');p.disabled=active;p.onclick=()=>withBoardWrite(()=>{t.priority=t.priority%3+1;persist();render();});card.append(p);}if(state==='blocked'){const retry=node('button','Return to queue');retry.disabled=active;retry.onclick=()=>withBoardWrite(()=>{move(core,t,'retry');delete t.error;persist();render();});card.append(retry);}col.append(card);}$('.board').append(col);}
 const kind=$('select[name=kind]');kind.onchange=()=>{const local=isLocalTask({kind:kind.value});const route=$('select[name=mode]'),consent=$('input[name=consent]');route.disabled=local;consent.disabled=local;if(local){route.value='local';consent.checked=false;}};
 $('form').onsubmit=e=>{e.preventDefault();const form=e.currentTarget;return withBoardWrite(()=>{if(tasks.length>=100)return log('This MVP is limited to 100 tasks.');const f=new FormData(form);if(!f.get('title').trim()||!f.get('brief').trim())return log('Add a title and a brief, not only spaces.');const kind=f.get('kind'),mode=isLocalTask({kind})?'local':f.get('mode'),cloudAllowed=!isLocalTask({kind})&&f.has('consent');if(mode!=='local'&&!cloudAllowed)return log('Select the cloud permission checkbox or use on-device only.');tasks.push({id:crypto.randomUUID(),title:f.get('title').trim(),brief:kind==='json-check'?f.get('brief'):f.get('brief').trim(),priority:Number(f.get('priority')),sequence:Math.max(-1,...tasks.map(t=>t.sequence))+1,state:'queued',kind,mode,cloudAllowed});persist();render();});};
}

function showExecutionSettings(t){
 if(active||isLocalTask(t)||!['queued','blocked'].includes(t.state))return;
 const d=node('dialog');d.append(node('h2','Edit execution'),node('p',t.title));
 const label=node('label','Inference route');label.htmlFor='execution-mode';
 const select=node('select');select.id='execution-mode';select.name='executionMode';
 for(const [value,text] of [['local','On-device only · no cloud fallback'],['hybrid','Prefer device · cloud fallback'],['cloud','Cloud only']]){const option=node('option',text);option.value=value;select.append(option);}
 select.value=t.mode;label.append(select);d.append(label);
 const consentLabel=node('label',undefined,'check'),consent=node('input');consent.type='checkbox';consent.name='executionConsent';
 consent.checked=t.mode!=='local'&&t.cloudAllowed;consent.disabled=t.mode==='local';
 consentLabel.append(consent,document.createTextNode(' Allow this task’s title, brief and revision feedback to be sent to Google through Firebase AI Logic, including cloud fallback. Requests may consume project quota.'));
 d.append(node('h3','Content covered by cloud permission'),node('pre',JSON.stringify({title:t.title,brief:t.brief,revisionFeedback:t.feedback||''},null,2)),consentLabel,node('p','Saving changes sends no request. Blocked tasks still require Return to queue; execution requires Start queue.'));
 select.onchange=()=>{consent.disabled=select.value==='local';if(consent.disabled)consent.checked=false;};
 const save=node('button','Save execution settings','primary');save.onclick=()=>withBoardWrite(()=>{
  if(active||isLocalTask(t)||!['queued','blocked'].includes(t.state))return;
  t.mode=select.value;t.cloudAllowed=t.mode!=='local'&&consent.checked;
  notice='Execution settings saved. No request sent. '+(t.state==='blocked'?'Use Return to queue, then Start queue when ready.':'Press Start queue when ready.');
  persist();d.close();render();
 });
 const cancel=node('button','Cancel');cancel.onclick=()=>d.close();
 d.append(save,cancel);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();
}


function showHistory(t){
 const d=node('dialog');d.append(node('h2','Previous drafts: '+t.title),node('p','Local, read-only history. These drafts are never added to model prompts. Only bounded excerpts may be retained.'));
 if(t.historyPruned)d.append(node('p',`${t.historyPruned} older draft(s) removed to limit storage.`));
 for(const h of [...(t.history||[])].reverse()){
  d.append(node('h3',h.source+' · Sent back'),node('p',h.createdAt ? `Generated: ${h.createdAt} · Saved: ${h.archivedAt}` : `Generation time unknown · Saved: ${h.archivedAt}`),node('pre',h.text));
  for(const line of executionReceiptLines(h))d.append(node('p',line));
  if(h.shortened)d.append(node('p','This saved draft was shortened to 8,000 characters.'));
  if(h.humanEdit)d.append(node('p','Human-edited locally · '+h.humanEdit.editedAt+(h.humanEdit.shortened?' · Edited excerpt shortened to 8,000 characters.':'')),node('pre',h.humanEdit.text));
  if(h.feedback)d.append(node('p','Next-draft instructions recorded at send-back: '+h.feedback));
 }
 const close=node('button','Close');close.onclick=()=>d.close();d.append(close);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();
}


function reviewWrite(action){
 const board=tasks,before=structuredClone(tasks);
 try{action();persist();}
 catch(e){if(tasks===board){for(let i=0;i<board.length;i++){for(const k of Object.keys(board[i]))delete board[i][k];Object.assign(board[i],before[i]);}}throw e;}
}
function showHumanEditor(t){
 const d=node('dialog'),label=node('label','Local edited text'),text=node('textarea');
 d.dataset.preserveEdit='true';
 text.id='human-result-text';text.maxLength=20000;text.value=reviewedText(t);label.htmlFor=text.id;label.append(text);
 const version=JSON.stringify(t.result),state=t.state;
 const original=node('details');original.append(node('summary','Original generated text (unchanged)'),node('pre',t.result.text));
 d.append(node('h2','Edit result locally'),node('p','Original text, source and generation time remain unchanged. Saving changed text removes approval and returns the task to review. No AI request or cloud transmission. Only the latest local edit is kept.'),original,label);
 const save=node('button','Save local edit');save.dataset.saveEdit='true';save.onclick=()=>withBoardWrite(()=>{
  if(d.dataset.stale||!tasks.includes(t)||JSON.stringify(t.result)!==version||t.state!==state)throw Error('Result changed. Copy unsaved text and reopen it before editing.');
  let changed=false;reviewWrite(()=>{changed=saveHumanEdit(t,text.value);if(changed)move(core,t,'edit');});
  notice=changed?'Human edit saved locally. Review and approve this version again.':'Text unchanged; existing review state retained.';
  d.close();render();
 });
 const cancel=node('button','Cancel');cancel.onclick=()=>d.close();d.append(save,cancel);
 d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();
}
function showHandoff(t,packet=false){
 return withBoardWrite(()=>{
  const text=packet?handoffPacket(t):handoffText(t),d=node('dialog'),area=node('textarea'),label=node('label',packet?'Approved handoff packet':'Approved handoff text');
  area.id=packet?'approved-handoff-packet':'approved-handoff-text';area.readOnly=true;area.value=text;label.htmlFor=area.id;label.append(area);
  d.append(node('h2',packet?'Approved context and result packet':'Approved text for manual handoff'),node('p','Original source: '+t.result.source+'. '+(t.result.humanEdit?'Human-edited locally and reapproved.':'Original draft approved.')+' Select and copy manually. Nothing is sent, downloaded or executed. This is a snapshot; edits later require approval again.'),label);
  if(packet)d.append(node('p','Inspect the whole packet before copying. Do not include secrets or personal information. Approval is content review, not permission for downstream execution.'));const close=node('button','Close');close.onclick=()=>d.close();d.append(close);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();area.focus();area.select();
 });
}

function showResult(t){const d=node('dialog');const head=node('h2',t.title);const output=node('pre',reviewedText(t));d.append(head,node('p',`${t.result.humanEdit?'Human-edited version; original source: ':''}${t.result.source} · Original created: ${t.result.createdAt}`),output);d.append(node('h3','Original draft execution'));for(const line of executionReceiptLines(t.result))d.append(node('p',line));if(t.result.humanEdit){d.append(node('p','Human-edited locally · '+t.result.humanEdit.editedAt+(t.result.humanEdit.approvedAt?' · Reapproved '+t.result.humanEdit.approvedAt:' · Approval required')));const original=node('details');original.append(node('summary','Original generated text (unchanged)'),node('pre',t.result.text));d.append(original);}const reviewError=node('p',undefined,'error');reviewError.setAttribute('role','alert');reviewError.setAttribute('aria-live','assertive');d.append(reviewError);const saveCriteria=criteriaControls(document,t,d);if(canEditResult(t)){const edit=node('button','Edit result locally');edit.onclick=()=>{d.close();showHumanEditor(t);};d.append(edit);if(t.state==='done'){const handoff=node('button','Show approved handoff text');handoff.onclick=()=>{d.close();return showHandoff(t);};d.append(handoff);const packet=node('button','Show approved handoff packet');packet.onclick=()=>{d.close();return showHandoff(t,true);};d.append(packet);}}if(isReviewFixture(t))d.append(node('p','TEST_FIXTURE: synthetic QA data, never an inference result. Outside explicitly enabled loopback development this is read-only.'));if(t.state==='review'&&(!isReviewFixture(t)||reviewFixtureEnabled)){const feedbackLabel=node('label','Next-draft instructions (optional)');feedbackLabel.htmlFor='revision-feedback';const feedback=node('textarea');feedback.id='revision-feedback';feedback.name='revisionFeedback';feedback.maxLength=2000;feedback.value=t.feedback||'';feedback.placeholder='Give self-contained changes for the next draft. Previous output is not resent. No sensitive data.';feedbackLabel.append(feedback);if(!isReviewFixture(t))d.append(feedbackLabel,node('p',t.kind==='json-check'?'Fixed JSON checks do not use these instructions. To correct input, add a new task; Send back and Start queue only check the same input again. Approval acknowledges the report, including FAIL or LIMITED, not input validity.':t.kind==='checklist'?'Local checklist: notes are copied into the next document, not interpreted or used to execute work. Send back saves locally; Start queue rebuilds.':'These instructions guide a new draft; the previous text is not sent. Send back saves them locally. Changing it clears cloud permission; re-enable it in Edit execution before Start queue.'));for(const [event,label] of [['approve','Approve result'],['reject','Send back']]){if(isReviewFixture(t)&&event==='reject')continue;const b=node('button',label,event==='approve'?'primary':'');b.onclick=()=>withBoardWrite(()=>{reviewWrite(()=>{if(event==='approve')saveCriteria();if(event==='reject'){const value=feedback.value.trim();if(value.length>2000){feedback.setCustomValidity('Use at most 2000 characters.');feedback.reportValidity();return;}if(value!==(t.feedback||''))t.cloudAllowed=false;if(value)t.feedback=value;else delete t.feedback;}move(core,t,event);if(event==='approve'&&t.result){const now=new Date().toISOString();t.result.reviewApprovedAt=now;if(t.result.humanEdit)t.result.humanEdit.approvedAt=now;}if(event==='reject'){archiveRejectedDraft(tasks,t);delete t.result;stop=true;notice=(active?'Sent back to queue. Pausing after the current request. ':'Sent back to queue. ')+(t.mode!=='local'&&!t.cloudAllowed?'Review cloud permission in Edit execution, then press Start queue.':'Press Start queue to draft again.');}});if(event==='approve')notice='Result approved and saved locally. Content review only; no work executed.';d.close();render();},message=>{if(d.isConnected)reviewError.textContent=message;});d.append(b);}}if(t.kind==='checklist'&&t.state==='done'&&t.result.source===LOCAL_SOURCE){const download=node('button','Download approved Markdown');download.onclick=()=>withBoardWrite(()=>{const text=approvedMarkdown(t);const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=node('a');a.href=url;a.download='relay-checklist.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});d.append(node('p','Download is manual and uses your browser save settings. Approval means you reviewed this document, not that its checklist work is done.'),download);}const close=node('button','Close');close.onclick=()=>d.close();d.append(close);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();}
async function run(taskId){if(active||!rust)return;return withBoardWrite(()=>runLocked(taskId));}
async function runLocked(taskId){
 if(active||!rust)return;active=true;stop=false;
 try{
 while(!stop){const task=taskId===undefined?nextTask(core,tasks):tasks.find(t=>t.id===taskId&&t.state==='queued');if(!task){if(taskId!==undefined)notice='Task is no longer queued. Nothing was executed.';break;}const local=isLocalTask(task);
 if(!local){
  if(!core.may_run(Number(task.cloudAllowed),Number(task.mode==='local'),0,calls)){notice='Stopped: cloud permission or session request limit prevents execution.';break;}
  api=await import('./ai.js');if(!api.configured)throw Error('Set Firebase app configuration and App Check first. No inference sent.');
 }
 move(core,task,'start');delete task.error;persist();render();
 try{
  if(local){task.result=task.kind==='json-check'?buildJsonReport(task):buildChecklist(task);}
  else{const requestedMode=task.mode,startedAt=performance.now();const prepared=api.prepareModel(requestedMode,p=>log(`Preparing device model: ${Math.round(p*100)}%. You can pause the queue.`));calls++;task.result=await api.generateDraft(task,prepared);task.result.executionReceipt=createExecutionReceipt(requestedMode,task.result.source,performance.now()-startedAt);task.result.source=task.result.executionReceipt.actualSource;recordInference(observed,task.result.source);}
  move(core,task,'result');notice=local?'Local result ready for review. No AI or external work executed.':`Draft ready for review. Actual inference: ${task.result.source}.`;
  if(stop)notice+=' Queue paused; press Start queue to continue.';
 }catch(e){move(core,task,'fail');task.error=String(e.message||e);notice=local?'Local formatting failed. No automatic retry.':'Request failed. No automatic retry; check quota before retrying.';stop=true;}
 if(taskId!==undefined){stop=true;notice+=' Other queued tasks were not started.';}
 persist();render();
 // Yield between items so Pause can take effect; local work needs an open tab.
 await new Promise(resolve=>setTimeout(resolve,0));
 }

 }catch(e){notice=String(e.message||e);}finally{active=false;render();}
}
// Recovery must own the same lock as live execution, never run from a stale tab.
await withBoardWrite(()=>{
 if(tasks.some(t=>t.state==='running')){tasks=recover(tasks);persist();notice='Interrupted work blocked. The previous request may have consumed quota; retry explicitly.';}
});
render();

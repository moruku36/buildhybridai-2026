import {createExecutionReceipt,executionReceiptLines,actualInferenceLabel} from './execution-receipt.js';
import {inspectDraft,assertDraftCurrent} from './draft-preflight.js';
import {criteriaControls} from './criteria-review.js';
import {handoffPacket} from './handoff-packet.js';
import {canEditResult,reviewedText,saveHumanEdit,handoffText} from './review-edit.js';
import {reviewFixtureEnabled,isReviewFixture} from './review-fixture-mode.js';
import {makeReviewFixture} from './review-fixture.js';
import {showIssueIntake} from './issue-intake.js';
import {buildJsonReport} from './json-check.js';
import {buildChecklist,approvedMarkdown,LOCAL_SOURCE} from './local-artifact.js';
import {archiveRejectedDraft} from './draft-history.js';
import {queueActionLabel} from './queue-action-label.js';
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
try {
 storageSnapshot=localStorage.getItem(key);
 tasks=validateTasks(JSON.parse(storageSnapshot||'null')??[]);
} catch {
 tasks=[];
 storageError='Saved board was invalid. Original storage is not overwritten until your next change.';
}
let active=false,stop=false,calls=0,notice=storageError,api=null;
const $=s=>document.querySelector(s);
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const STALE_BOARD_NOTICE="Board changed in another tab. Refreshed without saving; inspect it and retry explicitly.";
function checkSnapshot(){
 const current=localStorage.getItem(key);
 if(current!==storageSnapshot){
  if(inlineDraft)closeInlineDraft();
  tasks=validateTasks(JSON.parse(current||'null')??[]);storageSnapshot=current;
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
let currentTaskId=null,showComposer=false,savingTask=false,focusWorkspaceHeading=false,focusRunAction=false,lastAction='',dialogFocusBound=false;
const EXAMPLE={
 title:'Write an empty-state message for a library catalog',
 brief:'Draft a short message for a search with no matching books. Suggest how readers can revise their search without losing keyboard focus. Include one keyboard check and say what still needs human verification. Use plain English, at most 120 words; propose text only.'
};
const taskDefaults={title:'',brief:'',priority:'2',kind:'ai',mode:'local',consent:false};
const taskForm={...taskDefaults,open:false},disclosures={queue:false,tools:false,advanced:false};
let inlineDraft=null,inlineResultId=null,inlineReview=null,focusAction=null;
const liveStatus=node('div',undefined,'sr-only');
liveStatus.setAttribute('role','status');
$('#app').before(liveStatus);
const connectionStatus=node('div',undefined,'sr-only');
connectionStatus.setAttribute('role','status');
connectionStatus.setAttribute('aria-live','polite');
connectionStatus.setAttribute('aria-atomic','true');
$('#app').before(connectionStatus);
let connectionNotice='';
function announceConnection(message){connectionNotice=message||'';connectionStatus.textContent=connectionNotice;}
const routeLabel=t=>isReviewFixture(t)?'TEST_FIXTURE · not AI':t.kind==='json-check'?'▦ Local JSON check · no AI':t.kind==='checklist'?'▦ Local checklist · no AI':t.mode==='local'?'◉ On device':t.mode==='hybrid'?'◈ Hybrid':'☁ Cloud';
const compareTaskRank=(a,b)=>core.rank(a.priority,a.sequence)-core.rank(b.priority,b.sequence);
const taskStateLabels={queued:'Ready',running:'Running',review:'Needs your review',done:'Approved',blocked:'Needs attention'};
const currentTask=()=>{if(showComposer)return null;const focused=tasks.find(t=>t.id===currentTaskId);if(focused)return focused;for(const state of ['review','running','blocked','done']){const candidates=tasks.filter(t=>t.state===state);const task=candidates.sort(state==='done'?(a,b)=>b.sequence-a.sequence:compareTaskRank)[0];if(task)return task;}return null;};
const actionButton=(text,act,fn,cls,off)=>{const b=node('button',text,cls);b.type='button';b.dataset.act=act;b.disabled=Boolean(off);b.onclick=()=>{lastAction=act;return fn(b);};return b;};
const reportActionFailure=fn=>async()=>{try{await fn();}catch(e){log(String(e.message||e));}};
const findFocusTarget=k=>!k?null:k[0]==='n'?document.querySelector('#app [name='+k.slice(2)+']'):[...document.querySelectorAll('#app [data-act]')].find(b=>b.dataset.act===k.slice(2));
const optionSelect=(name,opts,val)=>{const s=node('select');s.name=name;for(const [v,t] of opts){const o=node('option',t);o.value=v;s.append(o);}s.value=val;return s;};
function labelControl(text,control){
 const label=node('label');
 if(control.id)label.htmlFor=control.id;
 label.append(text,control);
 return label;
}
function saveNewTask(t){
 if(tasks.length>=100)throw Error('This MVP is limited to 100 tasks.');
 t.sequence=Math.max(-1,...tasks.map(x=>x.sequence))+1;
 tasks.push(t);
 try{persist();}catch(e){tasks=tasks.filter(x=>x!==t);throw e;}
 Object.assign(taskForm,taskDefaults);
 currentTaskId=t.id;showComposer=false;focusWorkspaceHeading=true;
}

async function submitTask(form,action){
 if(savingTask)return;
 savingTask=true;
 try{
  const f=new FormData(form);
  const kind=String(f.get('kind')||'ai'),local=isLocalTask({kind});
  const cloudOnce=action==='cloud'&&kind==='ai'&&f.get('mode')==='local';
  if(action==='cloud'&&!cloudOnce)return;
  const mode=cloudOnce?'cloud':local?'local':String(f.get('mode')||'local');
  const cloudAllowed=!cloudOnce&&mode!=='local'&&f.has('consent');
  const raw=String(f.get('brief')||''),brief=kind==='json-check'?raw:raw.trim();
  const enteredTitle=String(f.get('title')||'').trim();
  const title=enteredTitle||Array.from(raw.trim().split(/\r?\n/,1)[0].trim()).slice(0,80).join('');
  if(!title||!raw.trim())return log('Describe the task before reviewing the prompt.');
  if(title.length>160||raw.length>4000)return log('Title is limited to 160 characters and brief to 4,000.');
  if(!cloudOnce&&mode!=='local'&&!cloudAllowed){taskForm.open=true;return log('Select the cloud permission checkbox or use on-device only.');}
  const t={id:crypto.randomUUID(),title,brief,priority:Number(f.get('priority')),state:'queued',kind,mode,cloudAllowed};
  if(cloudOnce){
   if(active||!rust||!locksAvailable)return;
   openInlineDraft(t,true);
   return;
  }
  const queueOnly=action!=='generate'||active;
  const saved=await withBoardWrite(()=>{
   saveNewTask(t);
   notice=queueOnly?'Task added to the queue. Nothing has run.':local?'Task saved. Running this local task only; no AI or network is used.':'Task saved locally. Nothing has been sent.';
   if(!queueOnly&&!local)openInlineDraft(t);
   else render();
   return t;
  });
  if(saved&&!queueOnly&&local)await run(saved.id);
 }finally{savingTask=false;}
}

function renderExample(){
 const section=node('section',undefined,'example');
 section.setAttribute('aria-labelledby','example-heading');
 const h=node('h3','Example task · fictional');h.id='example-heading';
 section.append(h,node('strong',EXAMPLE.title),node('p',EXAMPLE.brief));
 section.append(actionButton('Use example','use-example',()=>{
  const replace=taskForm.title||taskForm.brief||taskForm.kind!=='ai'||taskForm.mode!=='local'||taskForm.consent;
  if(replace&&!globalThis.confirm('Replace your draft with the example and reset execution to on-device only? Nothing will be saved or sent.'))return;
  Object.assign(taskForm,taskDefaults,EXAMPLE,{open:true});
  notice='Example loaded into the editable form. Nothing queued or sent.';
  focusAction='#app [name=title]';
  render();
 }));
 return section;
}
function renderComposer(hidden){
 const sec=node('section',undefined,'composer');sec.hidden=hidden;
 const h=node('h2','New task');h.id='ws-h';h.tabIndex=-1;
 if(hidden)h.removeAttribute('id');else h.dataset.act='workspace-heading';
 const form=node('form');form.setAttribute('aria-label','Add a task');
 const title=node('input');Object.assign(title,{name:'title',maxLength:160,placeholder:'Optional · derived from your brief if blank',value:taskForm.title});
 const brief=node('textarea');Object.assign(brief,{name:'brief',required:true,maxLength:4000,placeholder:'Public or non-sensitive details. No passwords or personal data.'});brief.value=taskForm.brief;
 const kind=optionSelect('kind',[['ai','AI draft'],['checklist','Local checklist · no AI or network'],['json-check','Local backlog JSON check · no AI or network']],taskForm.kind);
 const prio=optionSelect('priority',[['1','P1 · Next up'],['2','P2 · Important'],['3','P3 · Later']],taskForm.priority);
 const mode=optionSelect('mode',[['local','On-device only · no cloud fallback'],['hybrid','Prefer device · cloud fallback'],['cloud','Cloud only']],taskForm.mode);
 kind.id='task-kind';prio.id='task-priority';mode.id='task-mode';
 const consent=node('input');consent.type='checkbox';consent.name='consent';consent.checked=taskForm.consent;
 const cl=node('label',undefined,'check');cl.append(consent,'Allow this task’s title, brief and revision feedback to be sent to Google through Firebase AI Logic, including cloud fallback. Requests may consume project quota.');
 const hint=node('p',undefined,'hint');
 const canRun=rust&&locksAvailable&&!active;
 const gen=node('button',undefined,'primary'),cloud=node('button','Review Google prompt'),que=node('button','Add to queue');
 gen.type=cloud.type=que.type='submit';gen.dataset.action=gen.dataset.act='generate';cloud.dataset.action=cloud.dataset.act='cloud';que.dataset.action=que.dataset.act='queue';
 gen.disabled=!canRun;que.disabled=!locksAvailable;
 for(const b of [gen,cloud,que])b.addEventListener('click',()=>{lastAction=b.dataset.act;});
 const opts=node('details',undefined,'options');opts.open=taskForm.open;
 que.hidden=!(taskForm.open||!canRun);
 const optionsSummary=node('summary','Task options');
 optionsSummary.dataset.act='options';
 opts.ontoggle=()=>{if(!opts.isConnected)return;taskForm.open=opts.open;que.hidden=!(opts.open||!canRun);};
 const row=node('div',undefined,'form-row');row.append(labelControl('Priority',prio),labelControl('Inference route',mode));
 opts.append(optionsSummary,labelControl('Task title',title),labelControl('Task type',kind),row,cl,hint);
 const sync=()=>Object.assign(taskForm,{title:title.value,brief:brief.value,kind:kind.value,priority:prio.value,mode:mode.value,consent:consent.checked,open:opts.open});
 const route=node('p',undefined,'hint');
 const apply=()=>{
  const local=isLocalTask({kind:kind.value});
  mode.disabled=local;
  if(local)mode.value='local';
  consent.disabled=local||mode.value==='local';
  if(consent.disabled)consent.checked=false;
  cloud.hidden=local||mode.value!=='local'||!canRun;
  gen.textContent=local?'Run local task':'Review prompt';
  route.textContent=local?'Local task · no AI or network.':mode.value==='local'?'On-device by default. Review prompt saves locally; the Google option previews only. Neither sends anything.':
   'Google via Firebase AI Logic · permission '+(consent.checked?'on':'off')+'. Requests may use project quota.';
  hint.textContent=kind.value==='json-check'?'Brief must be a JSON array of objects with a unique id (string, max 80), title (string, max 160) and priority (1–3). Max 4,000 characters, 50 records. Fixed checks only; to correct input, add a new task.':kind.value==='checklist'?'One item per brief line. Items are organized, never executed. No AI or network.':'AI drafts always come back for your review.';
 };
 kind.onchange=()=>{apply();sync();};
 mode.onchange=()=>{consent.checked=false;apply();sync();};
 consent.onchange=()=>{apply();sync();};
 form.oninput=sync;
 const acts=node('div',undefined,'actions');
 if(canRun||!locksAvailable)acts.append(gen);
 acts.append(cloud,que);
 const info=!locksAvailable?'This browser lacks Web Locks, so tasks cannot be saved safely. You can still read the board and export it.':!rust?'Preview mode: the Rust core is missing, so drafts cannot start. Build it with npm run build:core.':active?'Work is running. New tasks are queued only.':'';
 form.append(labelControl('What should the draft do?',brief),opts,route,acts);
 if(info)form.append(node('p',info,'hint'));
 form.onsubmit=e=>{
  e.preventDefault();
  const action=e.submitter?.dataset?.action;
  if(action)return submitTask(e.currentTarget||form,action);
 };
 apply();
 sec.append(h,node('p','Describe a task, inspect the prompt, and review the draft before approving it.','purpose'),renderExample(),form);
 return sec;
}
function openTask(t){
 inlineDraft=null;
 currentTaskId=t.id;showComposer=false;focusWorkspaceHeading=true;
 disclosures.queue=false;
 render();
}
function renderOverview(){
 const aside=node('aside',undefined,'overview');
 aside.setAttribute('aria-labelledby','tasks-heading');
 const h=node('h2','Tasks');h.id='tasks-heading';
 aside.append(h);
 if(!tasks.length)aside.append(node('p','No tasks yet.','overview-empty'));
 else{
  const states=['review','blocked','running','queued','done'];
  const labels={review:'To review',blocked:'Needs attention',running:'Running',queued:'Ready',done:'Approved'};
  const counts=node('ul',undefined,'overview-counts');
  const groups=states.map(state=>tasks.filter(t=>t.state===state).sort(state==='done'?(a,b)=>b.sequence-a.sequence:compareTaskRank));
  states.forEach((state,i)=>counts.append(node('li',labels[state]+': '+groups[i].length)));
  aside.append(counts);
  const rows=node('ul',undefined,'overview-rows');
  const preview=groups.flat().slice(0,5);
  const running=groups[2][0];
  if(running&&!preview.includes(running))preview[4]=running;
  for(const t of preview){
   const item=node('li');
   const b=actionButton(t.title,'overview-'+t.id,()=>openTask(t),'overview-row');
   b.append(node('small',taskStateLabels[t.state]));
   if(currentTask()?.id===t.id)b.setAttribute('aria-current','true');
   item.append(b);rows.append(item);
  }
  aside.append(rows);
  if(preview.length<tasks.length)aside.append(node('p','Showing '+preview.length+' of '+tasks.length+' tasks.','overview-empty'));
 }
 aside.append(actionButton('View all tasks','view-all',()=>{
  disclosures.advanced=true;disclosures.queue=true;
  focusAction='[data-act=task-queue]';render();
 }));
 return aside;
}

function renderCurrentTask(t){
 const s=node('section',undefined,'focus');s.setAttribute('aria-labelledby','ws-h');
 const meta=node('div',undefined,'card-meta');meta.append(node('span',`P${t.priority}`,`priority p${t.priority}`),node('span',routeLabel(t),'route'),node('span',taskStateLabels[t.state]||t.state,'state'));
 const h=node('h2',t.title);h.id='ws-h';h.tabIndex=-1;h.dataset.act='workspace-heading';
 s.append(meta,h,node('p',t.brief.length>600?t.brief.slice(0,600)+'…':t.brief,'brief'));
 if(t.feedback)s.append(node('p','Revision feedback: '+t.feedback.slice(0,300),'card-feedback'));
 if(t.error){
  s.append(node('p',t.error,'error'));
  if(!isLocalTask(t)&&t.mode!=='cloud')s.append(node('p','Check device availability under Advanced → Connections and tools, or use Edit execution to choose a different route.','hint'));
 }
 if(!isLocalTask(t)&&t.mode!=='local')s.append(node('p','Google via Firebase AI Logic · permission '+(t.cloudAllowed?'on':'off')+'. Requests may use project quota.','hint'));
 if(t.result)s.append(node('span',t.result.source,'source'));
 const local=isLocalTask(t),a=node('div',undefined,'actions'),off=active||!rust||!locksAvailable;
 const edit=()=>actionButton('Edit execution','edit',()=>{if(!active)showExecutionSettings(t,'workspace');},undefined,active||local);
 let next='';
 if(t.state==='queued'){next=local?'Next: run this local task. No AI or network is used.':'Next: review the exact prompt. Nothing is sent until you confirm.';a.append(local?actionButton('Run local task','run',reportActionFailure(()=>run(t.id)),'primary',off):actionButton('Review prompt','run',()=>openInlineDraft(t),'primary',off));if(!local)a.append(edit());}
 else if(t.state==='running'){next='Working. No new request is sent from here.';s.setAttribute('aria-busy','true');}
 else if(t.state==='review'){next='Review the result before approving it.';if(t.result)a.append(actionButton('Read result','read',()=>t.id===inlineResultId?$('#inline-result-heading')?.focus():showResult(t),'primary'));}
 else if(t.state==='done'){
  const canSavePacket=canEditResult(t);
  const canSaveChecklist=t.kind==='checklist'&&t.result?.source===LOCAL_SOURCE;
  next=canSavePacket?'Approved. Inspect the packet before downloading it.':canSaveChecklist?'Approved. Open the result to save the checklist.':'Approved and saved locally.';
  if(canSavePacket)a.append(actionButton('Inspect approved packet','packet',()=>showHandoff(t,true),'primary'));
  if(t.result)a.append(actionButton('Read result','read',()=>showResult(t),canSavePacket?undefined:'primary'));
 }
 else{next=!local&&t.mode==='cloud'&&!t.cloudAllowed
  ?'To try Google again, return to queue and review a fresh one-request prompt. Edit execution to change routes.'
  :'Needs attention. Return it to the queue, or edit its execution first.';a.append(actionButton('Return to queue','return',()=>withBoardWrite(()=>{move(core,t,'retry');delete t.error;persist();focusWorkspaceHeading=true;render();}),'primary',active||!locksAvailable));if(!local)a.append(edit());}
 a.append(actionButton('New task','new',()=>{inlineDraft=null;showComposer=true;currentTaskId=null;notice='';focusWorkspaceHeading=true;render();}));
 s.append(node('p',next,'next'),a);return s;
}
function renderQueueCard(t,state){
 const c=node('article',undefined,'card'),a=node('div',undefined,'card-actions'),meta=node('div',undefined,'card-meta');
 meta.append(node('span',`P${t.priority}`,`priority p${t.priority}`),node('span',routeLabel(t),'route'));
 c.append(meta,node('h4',t.title),node('p',t.brief.slice(0,130)));
 if(t.history?.length)a.append(actionButton(`Previous drafts (${t.history.length})`,'h-'+t.id,()=>showHistory(t)));
 if(t.historyPruned)c.append(node('small','Older saved drafts were trimmed to limit local storage.','card-note'));
 if(t.feedback)c.append(node('p','Revision feedback: '+t.feedback.slice(0,130),'card-feedback'));
 if(t.error)c.append(node('p',t.error,'error'));
 if(t.result){c.append(node('span',t.result.source,'source'));a.append(actionButton('Read result','r-'+t.id,()=>{if(t.id===inlineResultId){openTask(t);$('#inline-result-heading')?.focus();}else showResult(t);},state==='review'?'primary':undefined));}
 if(state==='queued'||state==='blocked')a.append(actionButton('Edit execution','e-'+t.id,()=>{if(!active)showExecutionSettings(t,'queue');},undefined,active||isLocalTask(t)));
 if(state==='queued'){
  const one=actionButton('Run this task only','o-'+t.id,()=>isLocalTask(t)?run(t.id):showDraftInspection(t),undefined,active||!rust||!locksAvailable);one.title=isLocalTask(t)?'Run only this local task, then pause.':'Inspect this task’s exact AI prompt before running it alone.';a.append(one);
  a.append(actionButton('Change priority','p-'+t.id,()=>withBoardWrite(()=>{t.priority=t.priority%3+1;persist();render();}),undefined,active));
 }
 if(state==='blocked'){
  const task=t;
  const retry=retryButton => withBoardWrite(() => {
    move(core, task, 'retry');
    delete task.error;
    persist();
    notice = 'Task returned to the queue. Nothing has run.';
    const hadFocus = document.activeElement === retryButton;
    render();
    if (hadFocus && document.activeElement === document.body) findFocusTarget('a:f-' + task.id)?.focus();
  });
  a.append(actionButton('Return to queue','b-'+t.id,retry,undefined,active));
 }
 a.append(actionButton('Open task','f-'+t.id,()=>openTask(t)));
 for(const button of a.querySelectorAll('button'))button.setAttribute('aria-label',queueActionLabel(button.textContent,t.title));
 c.append(a);return c;
}
function render(){
 const ae=document.activeElement,inApp=ae&&ae.closest&&ae.closest('#app');
 const fk=inApp?(ae.name?'n:'+ae.name:ae.dataset&&ae.dataset.act?'a:'+ae.dataset.act:''):'';
 let range=null;try{if(fk[0]==='n'&&ae.selectionStart!=null)range=[ae.selectionStart,ae.selectionEnd];}catch{}
 if(inlineDraft&&!inlineDraftIsCurrent(inlineDraft))closeInlineDraft();
 $('#app').replaceChildren();
 const cur=currentTask(),count=s=>tasks.filter(t=>t.state===s).length;
 const shell=node('div',undefined,'shell'),main=node('main');main.id='main-content';main.tabIndex=-1;
 const top=node('header',undefined,'top'),st=node('div',undefined,'status');
 st.classList.toggle('is-active',active);st.append(node('strong',active?'Queue is working':'Agent is paused'),node('small',runtimeStatus(Boolean(api?.configured),observed)));
 top.append(node('h1','Relay','brand'));
 if(active)top.append(st);
 const nt=node('div',notice||(!rust?'Preview mode: build or rebuild the Rust core (npm run build:core) to enable task execution. Preview results are clearly labeled and never count as inference.':''),'notice');
 if(liveStatus.textContent!==notice)liveStatus.textContent=notice;
 nt.classList.toggle('is-idle',!notice);
 const group=(parent,label)=>{const g=node('div',undefined,'control-group');g.setAttribute('role','group');g.setAttribute('aria-label',label);g.append(node('span',label,'control-label'));parent.append(g);return g;};
 const qd=node('details',undefined,'more');qd.open=disclosures.queue;qd.ontoggle=()=>{if(qd.isConnected)disclosures.queue=qd.open;};
 const queueSummary=node('summary',`Task queue (${tasks.length}) · ${count('queued')} queued`+(count('review')?` · ${count('review')} to review`:''));
 queueSummary.dataset.act='task-queue';qd.append(queueSummary);
 const qc=node('div',undefined,'controls');qd.append(qc);const qG=group(qc,'Queue');
 const start=actionButton(active?'Pause after current':'Start queue','start',()=>active?(stop=true,log('Pausing after the current request. It may still consume quota.')):run(),'primary',!locksAvailable||!rust||(!active&&!tasks.some(t=>t.state==='queued')));
 (active?top:qG).append(start);
 qG.append(actionButton('Prepare public issue','intake',()=>{if(active)return;const id=crypto.randomUUID();showIssueIntake({document,onCommit:d=>withBoardWrite(()=>{if(active)throw Error('Pause the queue before adding an issue.');if(tasks.some(t=>t.id===id))throw Error('This issue was already added.');if(tasks.length>=100)throw Error('This MVP is limited to 100 tasks.');const task={...d,id,sequence:Math.max(-1,...tasks.map(t=>t.sequence))+1,state:'queued',kind:'ai',mode:'local',cloudAllowed:false};validateTasks([...tasks,task]);tasks.push(task);try{persist();}catch(e){tasks=tasks.filter(t=>t!==task);throw e;}currentTaskId=id;showComposer=false;notice='Issue added, not executed. The device model may be unavailable in Brave. For cloud use, review and allow the content in Edit execution, then choose Review prompt to inspect the exact prompt.';render();return true;})});},undefined,active||!locksAvailable));
 if(import.meta.env?.DEV&&reviewFixtureEnabled)qG.append(actionButton('Add synthetic review example (no AI)','fixture',()=>withBoardWrite(()=>{if(active)throw Error('Pause first.');if(tasks.some(t=>t.id==='relay-review-fixture-v2'))return log('Synthetic review example already exists; no duplicate added.');if(tasks.length>=100)throw Error('Board limit reached.');const t=makeReviewFixture(Math.max(-1,...tasks.map(x=>x.sequence))+1);validateTasks([...tasks,t]);tasks.push(t);try{persist();}catch(e){tasks=tasks.filter(x=>x!==t);throw e;}notice='TEST_FIXTURE added locally. Synthetic data, no inference, no Firebase initialization.';currentTaskId=t.id;showComposer=false;focusWorkspaceHeading=true;disclosures.queue=false;render();}),undefined,active||!locksAvailable));
 qG.append(actionButton('Preview workflow','demo',()=>withBoardWrite(()=>{const t=nextTask(core,tasks);if(!t)return log('Add a task to preview.');move(core,t,'start');move(core,t,'result');t.result={text:'PREVIEW FIXTURE — not AI-generated.\n\nThis is where your completed draft will appear. Review it, then approve it or send it back to the queue. No inference request was made.',source:'PREVIEW',createdAt:new Date().toISOString()};persist();currentTaskId=t.id;showComposer=false;focusWorkspaceHeading=true;disclosures.queue=false;render();}),undefined,active||!locksAvailable));
 const board=node('section',undefined,'board');
 for(const [state,label] of [['queued','Ready'],['running','Running'],['review','Needs your review'],['done','Approved'],['blocked','Needs attention']]){
  const col=node('div',undefined,'column');col.dataset.state=state;
  const items=tasks.filter(t=>t.state===state).sort(compareTaskRank),h=node('h3',label);h.append(node('span',items.length));col.append(h);
  if(!items.length)continue;
  for(const t of items)col.append(renderQueueCard(t,state));
  board.append(col);
 }
 qd.append(board);
 const td=node('details',undefined,'more');td.open=disclosures.tools;td.ontoggle=()=>{if(td.isConnected)disclosures.tools=td.open;};
 const toolsSummary=node('summary','Connections and tools');toolsSummary.dataset.act='tools';td.append(toolsSummary);
 if(!active)td.append(st);
 const tc=node('div',undefined,'controls');td.append(tc);const dG=group(tc,'Board data'),sG=group(tc,'Connection setup');
 sG.append(actionButton(checkingDevice?'Checking device…':'Check device availability','diag',async()=>{if(checkingDevice||active)return;checkingDevice=true;announceConnection('Checking browser availability only. No model creation, download, inference or Firebase initialization.');render();try{const result=await checkDeviceAvailability(globalThis.LanguageModel);announceConnection(describeDeviceAvailability(result)+' Checked Relay text-only options: English text input and output.');}catch{announceConnection('Device availability is unknown. No inference was run.');}finally{checkingDevice=false;render();}},undefined,active||checkingDevice));
 sG.append(actionButton('Initialize connection','connect',async b=>{b.disabled=true;try{api=await import('./ai.js');if(api.debugRequested&&!globalThis.confirm('Initialize local App Check debugging? Firebase may generate and store a private debug credential in this browser and show it in the developer console. Keep it private. No model inference will run.'))return;const result=api.initializeConnection();const message=result.debug?'Local debug initialized. Keep the browser console private; token registration is a separate authorized setup step. No inference sent.':'Firebase SDK initialized. Attestation and inference are not verified. No inference sent.';announceConnection(message);}catch(e){const message=String(e.message||e);announceConnection(message);}finally{render();}},undefined,active));
 sG.append(actionButton('Verify App Check','verify',async b=>{b.disabled=true;try{if(!globalThis.confirm('Have you completed App Check registration? Verify once with Firebase now. This sends app attestation to Firebase, but runs no model inference.'))return;api=await import('./ai.js');await api.verifyAppCheck();const message='App Check verified once. No model inference sent; inference remains unverified.';announceConnection(message);}catch{const message='App Check verification failed. Check registration and configuration. No automatic retry or model inference.';announceConnection(message);}finally{render();}},undefined,active));
 if(connectionNotice){const connectionHint=node('p',connectionNotice,'hint');connectionHint.style.flexBasis='100%';sG.append(connectionHint);}
 dG.append(actionButton('Export','export',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,tasks},null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download='relay-board.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
 td.append(node('p',rust?'◉ Rust / WASM core':'○ Preview core · Rust missing or outdated','engine'));
 const stats=node('section',undefined,'stats');
 for(const [l,v] of [['Queued',count('queued')],['Awaiting review',count('review')],['Completed',count('done')],['Session attempts',`${calls} / 6`]]){const b=node('div',undefined,'stat');b.append(node('strong',v),node('span',l));stats.append(b);}
 td.append(stats);
 const guide=node('details',undefined,'usage-guide');
 guide.innerHTML='<summary>How to move one public issue through Relay</summary><p>Draft instructions, not autonomous execution. Keep secrets and personal data out.</p><ol><li><strong>Prepare public issue</strong> → paste text or JSON → <strong>Propose editable task</strong> → review → <strong>Add reviewed issue to queue</strong>. Nothing runs; the task is on-device only.</li><li><strong>Edit execution</strong> only to change the route. Hybrid/cloud needs explicit permission for the displayed title, brief and feedback. <strong>Save execution settings</strong> sends nothing.</li><li><strong>Run this task only</strong> → inspect the exact prompt and UTF-8 bytes → <strong>Run inspected task only</strong>. <strong>Start queue</strong> is broader and can run multiple tasks.</li><li><strong>Read result</strong> → optionally <strong>Edit result locally</strong> → assess each criterion → <strong>Approve result</strong>, or <strong>Send back</strong> with feedback.</li><li>Reopen <strong>Read result</strong> → <strong>Show approved handoff packet</strong> → <strong>Download inspected packet</strong>. Manual file save only; nothing is sent to another agent.</li></ol><p><strong>Offline rehearsal:</strong> <strong>Preview workflow</strong> creates PREVIEW text, never an AI result. Local checklist/JSON tasks use no AI. Requested route is not proof of actual source; read the execution receipt. Device/hybrid acceptance remains unverified.</p>';
 td.append(guide);
 const advanced=node('details',undefined,'advanced');
 advanced.open=disclosures.advanced;
 advanced.ontoggle=()=>{if(advanced.isConnected)disclosures.advanced=advanced.open;};
 const as=node('summary','Advanced');as.dataset.act='advanced';
 advanced.append(as,qd,td);
 const layout=node('div',undefined,'dashboard');
 const workspace=node('div',undefined,'workspace');
 if(cur)workspace.append(renderCurrentTask(cur));
 workspace.append(renderComposer(Boolean(cur)||Boolean(inlineDraft?.saveOnSend)));
 if(inlineDraft)workspace.append(renderInlineDraft(inlineDraft));
 if(cur?.id===inlineResultId&&cur.state==='review'&&cur.result){
  if(inlineReview?.task!==cur){
   const section=node('section',undefined,'focus inline-result');
   renderResult(cur,section,true);
   inlineReview={task:cur,section};
  }
  workspace.append(inlineReview.section);
 }
 layout.append(workspace,renderOverview());
 main.append(top,nt,layout,advanced,node('footer','Runs only while this tab stays open; closing it stops local work. No shell execution or automatic publishing. Local storage is not encrypted. Keep sensitive data out.'));
 shell.append(main);$('#app').append(shell);
 if(!dialogFocusBound){dialogFocusBound=true;document.addEventListener('close',e=>{if(e.target?.tagName==='DIALOG')setTimeout(()=>{const a=document.activeElement;if((!a||a===document.body)&&!document.querySelector('dialog[open]'))(findFocusTarget('a:'+lastAction)||$('#ws-h'))?.focus();},0);},true);}
 if(!document.querySelector('dialog[open]')){
  if(focusAction){
   const target=$(focusAction);focusAction=null;focusWorkspaceHeading=false;
   target?.focus();
   if(document.activeElement!==target)$('#ws-h')?.focus();
  }
  else if(focusRunAction){focusRunAction=false;focusWorkspaceHeading=false;const runButton=document.querySelector('#app [data-act=run]');if(runButton&&!runButton.disabled)runButton.focus();else $('#ws-h')?.focus();}
  else if(focusWorkspaceHeading){$('#ws-h')?.focus();focusWorkspaceHeading=false;}
  else{const r=findFocusTarget(fk);if(r){r.focus();if(range)try{r.setSelectionRange(range[0],range[1]);}catch{}}}
 }
}

function showExecutionSettings(t,source){
 if(active||isLocalTask(t)||!['queued','blocked'].includes(t.state))return;
 const setup=node('p','For Firebase or App Check setup and diagnosis, see Connections and tools.','hint');setup.hidden=t.mode==='local';
 const action=source==='queue'?'Run this task only':'Review prompt';
 const next=(t.state==='blocked'?'Use Return to queue, then ':'Use ')+action+' to inspect the exact prompt.';
 const d=node('dialog');d.setAttribute('aria-label','Edit execution');d.append(node('h2','Edit execution'),node('p',t.title));
 const label=node('label','Inference route');label.htmlFor='execution-mode';
 const select=node('select');select.id='execution-mode';select.name='executionMode';
 for(const [value,text] of [['local','On-device only · no cloud fallback'],['hybrid','Prefer device · cloud fallback'],['cloud','Cloud only']]){const option=node('option',text);option.value=value;select.append(option);}
 select.value=t.mode;label.append(select);d.append(label);
 const consentLabel=node('label',undefined,'check'),consent=node('input');consent.type='checkbox';consent.name='executionConsent';
 consent.checked=t.mode!=='local'&&t.cloudAllowed;consent.disabled=t.mode==='local';
 consentLabel.append(consent,document.createTextNode(' Allow this task’s title, brief and revision feedback to be sent to Google through Firebase AI Logic, including cloud fallback. Requests may consume project quota.'));
 d.append(node('h3','Content covered by cloud permission'),node('pre',JSON.stringify({title:t.title,brief:t.brief,revisionFeedback:t.feedback||''},null,2)),consentLabel,node('p','Saving changes sends no request. '+next),setup);
 select.onchange=()=>{consent.disabled=select.value==='local';consent.checked=false;setup.hidden=select.value==='local';};
 const save=node('button','Save execution settings','primary');save.onclick=()=>withBoardWrite(()=>{
  if(active||isLocalTask(t)||!['queued','blocked'].includes(t.state))return;
  t.mode=select.value;t.cloudAllowed=t.mode!=='local'&&consent.checked;
  notice='Execution settings saved. No request sent. '+next;
  persist();d.close();render();
 });
 const cancel=node('button','Cancel');cancel.onclick=()=>d.close();
 d.append(save,cancel);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();
}


function promptContents(container,inspection,permission,once=false){
 const route={local:'On-device only · no cloud fallback',hybrid:'Prefer device · cloud fallback',cloud:'Cloud only'}[inspection.mode];
 container.append(node('p','Requested route: '+route+'.'));
 if(inspection.mode!=='local')container.append(node('p','Google via Firebase AI Logic · '+(once?'one request only; choosing Send grants permission for this exact prompt.':'cloud permission '+(permission?'on.':'off.'))+' Requests may use project quota.'));
 container.append(node('p','Exact prompt · '+inspection.bytes+' UTF-8 bytes. The SDK envelope and provider instructions are not included.'),
  Object.assign(node('pre',inspection.prompt),{tabIndex:0}),
  node('p','Nothing goes out during review. Running may '+(inspection.mode==='cloud'?'initialize Firebase and App Check':inspection.mode==='hybrid'?'prepare a device model or use Firebase and App Check':'prepare or download a device model')+'. No automatic retry.'));
}
function openInlineDraft(task,saveOnSend=false){
 if(active||!rust||!locksAvailable)return;
 const {cloudAllowed}=task;
 const original=inspectDraft(task);
 const once=original.mode==='cloud'&&!cloudAllowed;
 const inspection=once?inspectDraft({...task,cloudAllowed:true}):original;
 inlineDraft={task,inspection,revision:original.revision,cloudAllowed,once,saveOnSend};
 focusAction='#inline-prompt-heading';
 render();
}
function inlineDraftIsCurrent({task,revision,saveOnSend}){
 return (saveOnSend||tasks.includes(task))&&task.state==='queued'&&inspectDraft(task).revision===revision;
}
function closeInlineDraft(restoreFocus=document.activeElement?.closest('.inline-prompt')){
 if(restoreFocus)focusAction=inlineDraft.saveOnSend?'[data-act=cloud]':'.workspace [data-act=run]';
 inlineDraft=null;
}
function renderInlineDraft(draft){
 const {inspection,cloudAllowed,once}=draft;
 const {mode}=inspection;
 const section=node('section',undefined,'focus inline-prompt');
 const heading=node('h2','Review exact AI prompt');
 heading.id='inline-prompt-heading';heading.tabIndex=-1;
 section.setAttribute('aria-labelledby',heading.id);
 section.append(heading);
 promptContents(section,inspection,cloudAllowed,once);
 const needsPermission=mode!=='local'&&!once&&!cloudAllowed;
 if(needsPermission)section.append(node('p','Use Edit execution to allow hybrid cloud fallback, or choose On-device only or Cloud only and review the new prompt.','hint'));
 const buttons=node('div',undefined,'actions');
 buttons.append(actionButton(mode==='cloud'?'Send to Google for a draft':'Run inspected task only','inline-send',()=>confirmInlineDraft(draft),'primary',active||needsPermission));
 buttons.append(actionButton('Cancel','inline-cancel',()=>{closeInlineDraft(true);render();}));
 section.append(buttons);
 return section;
}
async function confirmInlineDraft(draft){
 if(active||inlineDraft!==draft)return;
 const {task,inspection,once,saveOnSend}=draft;
 closeInlineDraft(true);
 await withBoardWrite(async()=>{
  if(active||!rust)throw Error('Execution is unavailable. Nothing sent.');
  if(!inlineDraftIsCurrent(draft))throw Error('This task changed. Inspect it again before running.');
  assertDraftCurrent(once?{...task,cloudAllowed:true}:task,inspection);
  if(saveOnSend)saveNewTask(task);
  focusAction='#ws-h';
  inlineResultId=task.id;
  await runLocked(task.id,inspection,once?task:null);
 });
}
function showDraftInspection(t){
 return withBoardWrite(()=>{
  if(active||!rust||!tasks.includes(t))throw Error('Task changed or execution is unavailable. Reopen the current task.');
  const inspection=inspectDraft(t),d=node('dialog');
  const heading=node('h2','Inspect exact AI prompt');heading.tabIndex=-1;
  d.setAttribute('aria-label','Inspect exact AI prompt');
  d.append(heading);
  promptContents(d,inspection,t.cloudAllowed);
  let used=false;
  const execute=node('button','Run inspected task only','primary');
  execute.disabled=inspection.mode!=='local'&&!t.cloudAllowed;
  execute.onclick=()=>{
   if(used||!d.isConnected)return;
   used=true;execute.disabled=true;d.close();
   return run(t.id,inspection);
  };
  const cancel=node('button','Cancel');cancel.onclick=()=>d.close();
  d.append(execute,cancel);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();heading.focus();
 });
}

function sendBackNotice(t){
 const local=isLocalTask(t),action=local?'Run local task':'Review prompt',cloud=!local&&t.mode!=='local';
 let text='Sent back to queue. '+(active?'Pausing after the current request. ':'');
 if(cloud&&!t.cloudAllowed&&t.mode==='hybrid')text+='Use Edit execution to allow hybrid fallback or choose a different route. ';
 if(active)text+='When the queue has paused, use '+action+' on this task. ';
 else if(!locksAvailable)text+='This browser lacks Web Locks, so '+action+' is unavailable. You can still read and export the board. ';
 else if(!rust)text+='The Rust core is missing, so '+action+' is unavailable. Build it with npm run build:core. ';
 else text+='Next: use '+action+(local?' to rebuild it. ':' to inspect the exact prompt. ')+'Nothing runs or is sent until you choose.';
 return text.trim();
}

function showHistory(t){
 const d=node('dialog');d.setAttribute('aria-label','Previous drafts: '+t.title);d.append(node('h2','Previous drafts: '+t.title),node('p','Local, read-only history. These drafts are never added to model prompts. Only bounded excerpts may be retained.'));
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
 d.setAttribute('aria-label','Edit result locally');
 d.dataset.preserveEdit='true';
 text.id='human-result-text';text.maxLength=20000;text.value=reviewedText(t);label.htmlFor=text.id;label.append(text);
 const version=JSON.stringify(t.result),state=t.state;
 const original=node('details');original.append(node('summary','Original generated text (unchanged)'),node('pre',t.result.text));
 d.append(node('h2','Edit result locally'),node('p','Original text, source and generation time remain unchanged. Saving changed text removes approval and returns the task to review. No AI request or cloud transmission. Only the latest local edit is kept.'),original,label);
 const error=node('p',undefined,'error');error.setAttribute('role','alert');
 const save=node('button','Save local edit');save.dataset.saveEdit='true';save.onclick=()=>withBoardWrite(()=>{
  if(d.dataset.stale||!tasks.includes(t)||JSON.stringify(t.result)!==version||t.state!==state)throw Error('Result changed. Copy unsaved text and reopen it before editing.');
  let changed=false;reviewWrite(()=>{changed=saveHumanEdit(t,text.value);if(changed)move(core,t,'edit');});
  notice=changed?'Human edit saved locally. Review and approve this version again.':'Text unchanged; existing review state retained.';
  d.close();render();
 },message=>{if(d.isConnected&&!d.dataset.stale)error.textContent='Edit not saved. '+message+' Your text is still in the editor.';});
 const cancel=node('button','Cancel');cancel.onclick=()=>d.close();d.append(error,save,cancel);
 d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();
}
function showHandoff(t,packet=false){
 return withBoardWrite(()=>{
  const text=packet?handoffPacket(t):handoffText(t),version=JSON.stringify(t),d=node('dialog'),area=node('textarea'),label=node('label',packet?'Approved handoff packet':'Approved handoff text');
  d.setAttribute('aria-label',packet?'Approved context and result packet':'Approved text for manual handoff');
  area.id=packet?'approved-handoff-packet':'approved-handoff-text';area.readOnly=true;area.value=text;label.htmlFor=area.id;label.append(area);
  d.append(node('h2',packet?'Approved context and result packet':'Approved text for manual handoff'),node('p','Original source: '+t.result.source+'. '+(t.result.humanEdit?'Human-edited locally and reapproved.':'Original draft approved.')+' Select and copy manually. Opening this view sends, downloads and executes nothing. This is a snapshot; edits later require approval again.'),label);
  if(packet){
   const error=node('p',undefined,'error');error.setAttribute('role','alert');
   const status=node('p');status.setAttribute('role','status');
   const download=node('button','Download inspected packet');
   download.onclick=()=>{
    error.textContent='';status.textContent='';
    return withBoardWrite(()=>{
     if(!d.isConnected||!tasks.includes(t)||t.state!=='done'||JSON.stringify(t)!==version)throw Error('Approved content changed. Reopen the current approved packet before downloading.');
     // Revalidate approval; save exactly the inspected snapshot, including its assembly time.
     handoffText(t);
     let url;
     try{
      url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
      const a=node('a');a.href=url;a.download='relay-approved-handoff.json';a.click();
     }catch{
      throw Error('Could not request the browser download. You can copy the inspected JSON above instead.');
     }finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),1000);}
     status.textContent='Download requested. Check your browser downloads to confirm the file was saved.';
    },message=>{if(d.isConnected)error.textContent=message;});
   };
   d.append(node('p','Inspect the whole packet before copying or downloading it. Download inspected packet asks your browser to save this JSON snapshot; it does not contact an agent, upload data or execute instructions. Later edits cannot revoke saved files. Keep secrets and personal information out. Approval is content review, not permission for downstream execution.'),download,status,error);
  }
  const close=node('button','Close');close.onclick=()=>d.close();d.append(close);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();area.focus();area.select();
 });
}

function showResult(t){
 const d=node('dialog');
 renderResult(t,d);
 document.body.append(d);d.showModal();
}
function renderResult(t,d,inline=false){
 const head=node('h2',inline?'Review draft':t.title);
 const dismiss=()=>{
  if(!inline){d.close();return;}
  inlineResultId=null;
  inlineReview=null;
  d.remove();
 };
 if(inline){
  head.id='inline-result-heading';head.dataset.act='inline-result-heading';head.tabIndex=-1;
  d.setAttribute('aria-labelledby',head.id);
 }else d.setAttribute('aria-label',t.title);
 const original=t.result;
 d.append(head,node('p',`${original.humanEdit?'Human-edited version; original source: ':''}${original.source} · Original created: ${original.createdAt}`),
  node('h3','Original draft execution'));
 for(const line of executionReceiptLines(original))d.append(node('p',line));
 d.append(node('pre',reviewedText(t)));
 if(original.humanEdit){
  const edit=original.humanEdit;
  d.append(node('p','Human-edited locally · '+edit.editedAt+(edit.approvedAt?' · Reapproved '+edit.approvedAt:' · Approval required')));
  const originalText=node('details');
  originalText.append(node('summary','Original generated text (unchanged)'),node('pre',original.text));
  d.append(originalText);
 }
 const reviewError=node('p',undefined,'error');
 reviewError.setAttribute('role','alert');d.append(reviewError);
 const saveCriteria=criteriaControls(document,t,d);
 if(canEditResult(t)){
  const edit=node('button','Edit result locally');
  edit.onclick=()=>{dismiss();if(inline)lastAction='read';showHumanEditor(t);};
  d.append(edit);
  if(t.state==='done'){
   const handoff=node('button','Show approved handoff text');
   handoff.onclick=()=>{dismiss();return showHandoff(t);};
   const packet=node('button','Show approved handoff packet');
   packet.onclick=()=>{dismiss();return showHandoff(t,true);};
   d.append(handoff,packet);
  }
 }
 if(isReviewFixture(t))d.append(node('p','TEST_FIXTURE: synthetic QA data, never an inference result. Outside explicitly enabled loopback development this is read-only.'));
 if(t.state==='review'&&(!isReviewFixture(t)||reviewFixtureEnabled)){
  const feedback=node('textarea');
  Object.assign(feedback,{id:'revision-feedback',name:'revisionFeedback',maxLength:2000,value:t.feedback||'',placeholder:'Give self-contained changes for the next draft. Previous output is not resent. No sensitive data.'});
  if(!isReviewFixture(t))d.append(labelControl('Next-draft instructions (optional)',feedback),node('p',t.kind==='json-check'
   ?'Fixed JSON checks do not use these instructions. To correct input, add a new task; Send back returns it to the queue and focuses Run local task; running it again only checks the same input. Approval acknowledges the report, including FAIL or LIMITED, not input validity.'
   :t.kind==='checklist'
    ?'Local checklist: notes are copied into the next document, not interpreted or used to execute work. Send back saves locally; use Run local task to rebuild.'
    :'These instructions guide a new draft; the previous text is not sent. Send back saves them locally. Changing them clears saved cloud permission. Review prompt offers one-request confirmation for Cloud only; hybrid fallback requires permission in Edit execution.'));
  const review=event=>withBoardWrite(()=>{
   if(!tasks.includes(t)||t.state!=='review')throw Error('Result changed. Open the current result before reviewing it.');
   const feedbackText=feedback.value.trim();
   if(event==='reject'&&feedbackText.length>2000){feedback.setCustomValidity('Use at most 2000 characters.');feedback.reportValidity();return;}
   reviewWrite(()=>{
    if(event==='approve'){
     saveCriteria();
     move(core,t,event);
     const now=new Date().toISOString();
     t.result.reviewApprovedAt=now;
     if(t.result.humanEdit)t.result.humanEdit.approvedAt=now;
    }else{
     if(feedbackText!==(t.feedback||''))t.cloudAllowed=false;
     if(feedbackText)t.feedback=feedbackText;else delete t.feedback;
     move(core,t,event);
     archiveRejectedDraft(tasks,t);delete t.result;
    }
   });
   if(event==='approve'){
    notice='Result approved and saved locally. Content review only; no work executed.';
    if(inline)focusWorkspaceHeading=true;
   }else{
    stop=true;
    notice=sendBackNotice(t);
    currentTaskId=t.id;showComposer=false;disclosures.queue=false;focusRunAction=true;
   }
   dismiss();render();
  },message=>{if(d.isConnected)reviewError.textContent=message;});
  const actions=node('div',undefined,'actions');
  actions.append(actionButton(inline?'Approve and save locally':'Approve result','approve-result',()=>review('approve'),'primary'));
  if(!isReviewFixture(t))actions.append(actionButton('Send back','send-back',()=>review('reject')));
  d.append(actions);
 }
 if(t.kind==='checklist'&&t.state==='done'&&t.result.source===LOCAL_SOURCE){
  const download=node('button','Download approved Markdown');
  download.onclick=()=>withBoardWrite(()=>{
   const text=approvedMarkdown(t),url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));
   const a=node('a');a.href=url;a.download='relay-checklist.md';a.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  d.append(node('p','Download is manual and uses your browser save settings. Approval means you reviewed this document, not that its checklist work is done.'),download);
 }
 const close=node('button',inline?'Close inline review':'Close');
 close.onclick=()=>{dismiss();if(inline)$('#app [data-act=read]')?.focus();};
 d.append(close);
 if(!inline)d.addEventListener('close',()=>d.remove());
}
async function run(taskId,inspection){if(active||!rust)return;return withBoardWrite(()=>runLocked(taskId,inspection));}
async function runLocked(taskId,inspected,oneTimeCloudTask=null){
 if(active||!rust)return;active=true;stop=false;
 try{
 while(!stop){const task=taskId===undefined?nextTask(core,tasks):tasks.find(t=>t.id===taskId&&t.state==='queued');if(!task){if(taskId!==undefined)notice='Task is no longer queued. Nothing was executed.';break;}const local=isLocalTask(task);
 if(inspected&&local)throw Error('Task type changed. Reopen the current task before execution.');
 // Only the explicitly inspected cloud-only task has one-time permission.
 // The real board task and all persisted copies always retain permission off.
 const executionTask=()=>task===oneTimeCloudTask?{...task,cloudAllowed:true}:task;
 let inspection;
 if(!local){
  // Start queue freezes each current task too, but does not claim user inspection.
  // The one-task path MUST use the exact snapshot shown by its dialog.
  if(taskId!==undefined&&!inspected)throw Error('Inspect the exact prompt before running this AI task.');
  inspection=inspected||inspectDraft(task);assertDraftCurrent(executionTask(),inspection);
  if(!core.may_run(Number(executionTask().cloudAllowed),Number(task.mode==='local'),0,calls)){notice='Stopped: cloud permission or session request limit prevents execution.';break;}
  api=await import('./ai.js');if(!api.configured)throw Error('Set Firebase app configuration and App Check first. No inference sent.');
  checkSnapshot();
  if(!lockHeld||!tasks.includes(task))throw Error('Current board lock required. No inference sent.');
  assertDraftCurrent(executionTask(),inspection);
 }
 move(core,task,'start');delete task.error;persist();notice='Working on '+task.title+'.';render();
 try{
  if(local){task.result=task.kind==='json-check'?buildJsonReport(task):buildChecklist(task);}
  else{const requestedMode=inspection.mode,startedAt=performance.now();const prepared=api.prepareModel(requestedMode,p=>log(`Preparing device model: ${Math.round(p*100)}%. You can pause the queue.`));calls++;task.result=await api.generateDraft(executionTask(),prepared,inspection,()=>{
   checkSnapshot();
   if(!lockHeld||!active||!tasks.includes(task)||task.state!=='running'||tasks.some(t=>t!==task&&t.state==='running')||calls>6)throw Error('Execution is stale, interrupted or over the session limit. No inference sent.');
   assertDraftCurrent(executionTask(),inspection,'running');
  });task.result.executionReceipt=createExecutionReceipt(requestedMode,task.result.source,performance.now()-startedAt);task.result.source=task.result.executionReceipt.actualSource;recordInference(observed,task.result.source);}
  move(core,task,'result');notice=local?'Local result ready for review. No AI or external work executed.':`Draft ready for review. Actual inference: ${actualInferenceLabel(task.result)}.`;
  if(stop)notice+=' Queue paused.';
 }catch(e){if(!tasks.includes(task))throw e;move(core,task,'fail');task.error=String(e.message||e);notice=local?'Local formatting failed. No automatic retry.':'Request failed or dispatch stopped. No automatic retry; inspect the error and quota before retrying.';stop=true;}
 if(taskId!==undefined){stop=true;notice+=' Other queued tasks were not started.';}
 if(task.state==='review'&&currentTaskId===inlineResultId&&inlineResultId===task.id)focusAction='#inline-result-heading';
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
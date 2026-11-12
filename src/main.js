import './style.css';
import {loadCore,move,nextTask,recover,validateTasks} from './policy.js';
import {recordInference,runtimeStatus} from './runtime-status.js';
import {checkDeviceAvailability,describeDeviceAvailability} from './device-diagnostics.js';
let checkingDevice=false;
const observed={cloud:false,device:false,last:null};
const {core,rust}=await loadCore();
import {withExclusiveBoardLock} from './board-lock.js';
const key='relay-board-v1';
let storageSnapshot=null,lockHeld=false;
const boardLocks=globalThis.navigator?.locks;
const locksAvailable=typeof boardLocks?.request==='function';
let tasks,storageError='';
const seed=[{id:'welcome',title:'Shape the launch story',brief:'Draft a concise launch narrative for Relay, a hybrid AI workboard that turns a prioritized backlog into reviewable work. Include the privacy benefit and a practical example.',priority:1,sequence:0,state:'queued',mode:'local',cloudAllowed:false},{id:'review-plan',title:'Plan a three-minute demo',brief:'Create a demo storyboard showing a local-only draft, an explicitly cloud-enabled draft, and a human review gate.',priority:2,sequence:1,state:'queued',mode:'hybrid',cloudAllowed:false}];
try{storageSnapshot=localStorage.getItem(key);tasks=validateTasks(JSON.parse(storageSnapshot||'null')||seed);}catch{tasks=structuredClone(seed);storageError='Saved board was invalid; showing sample tasks. Original storage is not overwritten until your next change.';}
let active=false,stop=false,calls=0,selected=null,notice=storageError,api=null;
const $=s=>document.querySelector(s);
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function checkSnapshot(){
 const current=localStorage.getItem(key);
 if(current!==storageSnapshot){
  tasks=validateTasks(JSON.parse(current||'null')||structuredClone(seed));storageSnapshot=current;
  for(const dialog of document.querySelectorAll('dialog'))dialog.remove();
  throw Error('Board changed in another tab. Refreshed without saving; inspect it and retry explicitly.');
 }
}
function persist(){
 if(!lockHeld)throw Error('Board lock required. No changes saved.');
 checkSnapshot();
 try{const value=JSON.stringify(tasks);localStorage.setItem(key,value);storageSnapshot=value;}
 catch{throw Error('Storage is unavailable or full. No further execution; export your board before closing.');}
}
async function withBoardWrite(action){
 try{
  if(lockHeld&&active){checkSnapshot();return await action();}
  return await withExclusiveBoardLock(boardLocks,async()=>{
   lockHeld=true;
   try{checkSnapshot();if(tasks.some(t=>t.state==='running')){tasks=recover(tasks);persist();throw Error('Interrupted work blocked. A previous request may have consumed quota; inspect and retry explicitly.');}return await action();}finally{lockHeld=false;}
  });
 }catch(e){notice=String(e.message||e);render();}
}
function log(text){notice=text;render();}
function render(){
 $('#app').replaceChildren();
 const shell=node('div',undefined,'shell');shell.innerHTML='<aside><a class="brand" href="#">◈ <b>Relay</b></a><div class="workspace">PERSONAL WORKSPACE</div><div class="nav active">▦ &nbsp; Workboard</div><div class="aside-note">Small tasks.<br>Real progress.<br><strong>You stay in control.</strong></div><div class="engine"></div></aside><main><header><div><span class="eyebrow">BUILD SOMETHING THAT MATTERS</span><h1>Your next move,<br>already in motion.</h1><p>A priority queue for AI work. Every result comes back to you.</p></div><span class="tag">LOCAL-FIRST · WEB MVP</span></header><section class="toolbar"><div class="status"></div><div class="controls"></div></section><div class="notice" role="status" aria-live="polite"></div><section class="stats"></section><div class="section-title"><h2>Workboard</h2><span>Prioritize → draft → review → done</span></div><section class="board"></section><section class="composer"><h2>Add a task</h2><form><label>Task title<input name="title" required maxlength="160" placeholder="What would you like to move forward?"></label><label>Brief<textarea name="brief" required maxlength="4000" placeholder="Provide public or non-sensitive task details. No passwords or personal data."></textarea></label><div class="form-row"><label for="task-priority">Priority<select id="task-priority" name="priority"><option value="1">P1 · Next up</option><option value="2" selected>P2 · Important</option><option value="3">P3 · Later</option></select></label><label for="task-mode">Inference route<select id="task-mode" name="mode"><option value="local">On-device only · no cloud fallback</option><option value="hybrid">Prefer device · cloud fallback</option><option value="cloud">Cloud only</option></select></label></div><label class="check"><input type="checkbox" name="consent"> Allow this task’s title, brief and revision feedback to be sent to Google through Firebase AI Logic, including cloud fallback. Requests may consume project quota.</label><button class="primary" type="submit">＋ Add to queue</button></form></section><footer>No shell execution. No automatic publishing. Local storage is not encrypted. Keep sensitive data out.</footer></main>';
 $('#app').append(shell);
 $('.engine').textContent=rust?'◉ Rust / WASM core':'○ Preview core · Rust not built';
 $('.status').append(node('strong',active?'Agent is drafting': 'Agent is paused'),node('small',runtimeStatus(Boolean(api?.configured),observed)));
 const controls=$('.controls');const start=node('button',active?'Pause after current':'Start queue','primary');start.disabled=!locksAvailable||!rust||(!active&&!tasks.some(t=>t.state==='queued'));start.onclick=()=>active?(stop=true,log('Pausing after the current request. It may still consume quota.')):run();controls.append(start);
 const demo=node('button','Preview workflow');demo.disabled=active||!locksAvailable;demo.onclick=()=>withBoardWrite(()=>{const t=nextTask(core,tasks);if(!t)return log('Add a task to preview.');move(core,t,'start');move(core,t,'result');t.result={text:'PREVIEW FIXTURE — not AI-generated.\n\nThis is where your completed draft will appear. Review it, then approve it or send it back to the queue. No inference request was made.',source:'PREVIEW',createdAt:new Date().toISOString()};persist();render();});controls.append(demo);
 const diagnose=node('button',checkingDevice?'Checking device…':'Check device availability');diagnose.disabled=active||checkingDevice;diagnose.onclick=async()=>{if(checkingDevice||active)return;checkingDevice=true;log('Checking browser availability only. No model creation, download, inference or Firebase initialization.');try{const result=await checkDeviceAvailability(globalThis.LanguageModel);notice=describeDeviceAvailability(result)+' Checked Relay text-only options: English text input and output.';}catch{notice='Device availability is unknown. No inference was run.';}finally{checkingDevice=false;render();}};controls.append(diagnose);
 const connect=node('button','Initialize connection');connect.disabled=active;connect.onclick=async()=>{connect.disabled=true;try{api=await import('./ai.js');if(api.debugRequested&&!globalThis.confirm('Initialize local App Check debugging? Firebase may generate and store a private debug credential in this browser and show it in the developer console. Keep it private. No model inference will run.'))return;const result=api.initializeConnection();log(result.debug?'Local debug initialized. Keep the browser console private; token registration is a separate authorized setup step. No inference sent.':'Firebase SDK initialized. Attestation and inference are not verified. No inference sent.');}catch(e){log(String(e.message||e));}finally{render();}};controls.append(connect);
 const verify=node('button','Verify App Check');verify.disabled=active;verify.onclick=async()=>{verify.disabled=true;try{api=await import('./ai.js');if(!globalThis.confirm('Have you completed App Check registration? Verify once with Firebase now. This sends app attestation to Firebase, but runs no model inference.'))return;await api.verifyAppCheck();log('App Check verified once. No model inference sent; inference remains unverified.');}catch{log('App Check verification failed. Check registration and configuration. No automatic retry or model inference.');}finally{render();}};controls.append(verify);
 const exp=node('button','Export');exp.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,tasks},null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download='relay-board.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};controls.append(exp);
 $('.notice').textContent=notice||(!rust?'Preview mode: build the Rust core to enable live AI. Preview results are clearly labeled and never count as inference.':'Ready for configuration. Live requests only start after you press Start queue.');
 for(const [label,value] of [['Queued',tasks.filter(t=>t.state==='queued').length],['Awaiting review',tasks.filter(t=>t.state==='review').length],['Completed',tasks.filter(t=>t.state==='done').length],['Session attempts',`${calls} / 6`]]){const box=node('div',undefined,'stat');box.append(node('strong',value),node('span',label));$('.stats').append(box);}
 for(const [state,label] of [['queued','Up next'],['running','In motion'],['review','Your review'],['done','Done'],['blocked','Needs attention']]){const col=node('div',undefined,'column');const items=tasks.filter(t=>t.state===state).sort((a,b)=>core.rank(a.priority,a.sequence)-core.rank(b.priority,b.sequence));const heading=node('h3',label);heading.append(node('span',items.length));col.append(heading);if(!items.length)col.append(node('div',state==='review'?'Good work deserves a second look.':'Clear space for what’s next.','empty'));for(const t of items){const card=node('article',undefined,'card');const meta=node('div',undefined,'card-meta');meta.append(node('span',`P${t.priority}`,`priority p${t.priority}`),node('span',t.mode==='local'?'◉ On device':t.mode==='hybrid'?'◈ Hybrid':'☁ Cloud'));card.append(meta,node('h4',t.title),node('p',t.brief.slice(0,130)));if(t.feedback)card.append(node('p','Revision feedback: '+t.feedback.slice(0,130)));if(t.error)card.append(node('p',t.error,'error'));if(t.result){card.append(node('span',t.result.source,'source'));const open=node('button','Read result');open.onclick=()=>showResult(t);card.append(open);}if(state==='queued'||state==='blocked'){const edit=node('button','Edit execution');edit.disabled=active;edit.onclick=()=>{if(!active)showExecutionSettings(t);};card.append(edit);}if(state==='queued'){const p=node('button','Change priority');p.disabled=active;p.onclick=()=>withBoardWrite(()=>{t.priority=t.priority%3+1;persist();render();});card.append(p);}if(state==='blocked'){const retry=node('button','Return to queue');retry.disabled=active;retry.onclick=()=>withBoardWrite(()=>{move(core,t,'retry');delete t.error;persist();render();});card.append(retry);}col.append(card);}$('.board').append(col);}
 $('form').onsubmit=e=>{e.preventDefault();return withBoardWrite(()=>{if(tasks.length>=100)return log('This MVP is limited to 100 tasks.');const f=new FormData(e.currentTarget);if(!f.get('title').trim()||!f.get('brief').trim())return log('Add a title and a brief, not only spaces.');const mode=f.get('mode'),cloudAllowed=f.has('consent');if(mode!=='local'&&!cloudAllowed)return log('Select the cloud permission checkbox or use on-device only.');tasks.push({id:crypto.randomUUID(),title:f.get('title').trim(),brief:f.get('brief').trim(),priority:Number(f.get('priority')),sequence:Math.max(-1,...tasks.map(t=>t.sequence))+1,state:'queued',mode,cloudAllowed});persist();render();});};
}

function showExecutionSettings(t){
 if(active||!['queued','blocked'].includes(t.state))return;
 const d=node('dialog');d.append(node('h2','Edit execution'),node('p',t.title));
 const label=node('label','Inference route');label.htmlFor='execution-mode';
 const select=node('select');select.id='execution-mode';select.name='executionMode';
 for(const [value,text] of [['local','On-device only · no cloud fallback'],['hybrid','Prefer device · cloud fallback'],['cloud','Cloud only']]){const option=node('option',text);option.value=value;select.append(option);}
 select.value=t.mode;label.append(select);d.append(label);
 const consentLabel=node('label',undefined,'check'),consent=node('input');consent.type='checkbox';consent.name='executionConsent';
 consent.checked=t.mode!=='local'&&t.cloudAllowed;consent.disabled=t.mode==='local';
 consentLabel.append(consent,document.createTextNode(' Allow this task’s title, brief and revision feedback to be sent to Google through Firebase AI Logic, including cloud fallback. Requests may consume project quota.'));
 d.append(consentLabel,node('p','Saving changes sends no request. Blocked tasks still require Return to queue; execution requires Start queue.'));
 select.onchange=()=>{consent.disabled=select.value==='local';if(consent.disabled)consent.checked=false;};
 const save=node('button','Save execution settings','primary');save.onclick=()=>withBoardWrite(()=>{
  if(active||!['queued','blocked'].includes(t.state))return;
  t.mode=select.value;t.cloudAllowed=t.mode!=='local'&&consent.checked;
  notice='Execution settings saved. No request sent. '+(t.state==='blocked'?'Use Return to queue, then Start queue when ready.':'Press Start queue when ready.');
  persist();d.close();render();
 });
 const cancel=node('button','Cancel');cancel.onclick=()=>d.close();
 d.append(save,cancel);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();
}

function showResult(t){const d=node('dialog');const head=node('h2',t.title);const output=node('pre',t.result.text);d.append(head,node('p',`${t.result.source} · ${t.result.createdAt}`),output);if(t.state==='review'){const feedbackLabel=node('label','Next-draft instructions (optional)');feedbackLabel.htmlFor='revision-feedback';const feedback=node('textarea');feedback.id='revision-feedback';feedback.name='revisionFeedback';feedback.maxLength=2000;feedback.value=t.feedback||'';feedback.placeholder='Give self-contained changes for the next draft. Previous output is not resent. No sensitive data.';feedbackLabel.append(feedback);d.append(feedbackLabel,node('p','These instructions guide a new draft; the previous text is not sent. Send back saves them locally. Changing it clears cloud permission; re-enable it in Edit execution before Start queue.'));for(const [event,label] of [['approve','Approve result'],['reject','Send back']]){const b=node('button',label,event==='approve'?'primary':'');b.onclick=()=>withBoardWrite(()=>{if(event==='reject'){const value=feedback.value.trim();if(value.length>2000){feedback.setCustomValidity('Use at most 2000 characters.');feedback.reportValidity();return;}if(value!==(t.feedback||''))t.cloudAllowed=false;if(value)t.feedback=value;else delete t.feedback;}move(core,t,event);if(event==='reject'){delete t.result;stop=true;notice=(active?'Sent back to queue. Pausing after the current request. ':'Sent back to queue. ')+(t.mode!=='local'&&!t.cloudAllowed?'Review cloud permission in Edit execution, then press Start queue.':'Press Start queue to draft again.');}persist();d.close();render();});d.append(b);}}const close=node('button','Close');close.onclick=()=>d.close();d.append(close);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();}
async function run(){if(active||!rust)return;return withBoardWrite(runLocked);}
async function runLocked(){
 if(active||!rust)return;active=true;stop=false;
 try{api=await import('./ai.js');if(!api.configured)throw Error('Set Firebase app configuration and App Check first. No inference sent.');
 while(!stop){const task=nextTask(core,tasks);if(!task)break;if(!core.may_run(Number(task.cloudAllowed),Number(task.mode==='local'),0,calls)){notice='Stopped: cloud permission or session request limit prevents execution.';break;}
 move(core,task,'start');delete task.error;persist();render();
 try{const prepared=api.prepareModel(task.mode,p=>log(`Preparing device model: ${Math.round(p*100)}%. You can pause the queue.`));calls++;task.result=await api.generateDraft(task,prepared);recordInference(observed,task.result.source);move(core,task,'result');notice=`Draft ready for review. Actual inference: ${task.result.source}.`+(stop?' Queue paused; press Start queue to continue.':'');}
 catch(e){move(core,task,'fail');task.error=String(e.message||e);notice='Request failed. No automatic retry; check quota before retrying.';stop=true;}persist();render();
 }
 }catch(e){notice=String(e.message||e);}finally{active=false;render();}
}
// Recovery must own the same lock as live execution, never run from a stale tab.
await withBoardWrite(()=>{
 if(tasks.some(t=>t.state==='running')){tasks=recover(tasks);persist();notice='Interrupted work blocked. The previous request may have consumed quota; retry explicitly.';}
});
render();

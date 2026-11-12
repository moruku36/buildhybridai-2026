import {validateExecutionReceipt} from './execution-receipt.js';
export const HISTORY_PER_TASK=3,HISTORY_TEXT_LIMIT=8000,HISTORY_BOARD_BUDGET=80000;
const sources=['PREVIEW','LOCAL_DETERMINISTIC','in_cloud','on_device','UNKNOWN'];
const cost=h=>h.text.length+h.feedback.length+(h.humanEdit?.text.length||0);
const validDate=v=>typeof v==='string'&&v.length<=64&&Number.isFinite(Date.parse(v));
export function validateHistory(tasks){
 let total=0;
 for(const task of tasks){
  if(task.historyPruned!==undefined&&(!Number.isInteger(task.historyPruned)||task.historyPruned<0||task.historyPruned>1000000))throw Error('Invalid history count');
  if(task.history===undefined)continue;
  if(!Array.isArray(task.history)||task.history.length>HISTORY_PER_TASK)throw Error('Invalid draft history');
  for(const h of task.history){
   if(!h||typeof h.text!=='string'||h.text.length>HISTORY_TEXT_LIMIT||typeof h.feedback!=='string'||h.feedback.length>2000||!sources.includes(h.source)||h.reviewState!=='sent_back'||typeof h.shortened!=='boolean'||(h.createdAt!==null&&!validDate(h.createdAt))||!validDate(h.archivedAt))throw Error('Invalid draft history');
   if(h.humanEdit!==undefined&&(!h.humanEdit||typeof h.humanEdit.text!=='string'||h.humanEdit.text.length>HISTORY_TEXT_LIMIT||!validDate(h.humanEdit.editedAt)||typeof h.humanEdit.shortened!=='boolean'))throw Error('Invalid edited history');
   validateExecutionReceipt(h.executionReceipt,h.source);
   total+=cost(h);
  }
 }
 if(total>HISTORY_BOARD_BUDGET)throw Error('Draft history exceeds board budget');
}
export function archiveRejectedDraft(tasks,task,now=new Date().toISOString()){
 if(!task.result)return;
 const text=String(task.result.text||''),feedback=String(task.feedback||'');
 task.history??=[];
 task.history.push({text:text.slice(0,HISTORY_TEXT_LIMIT),feedback:feedback.slice(0,2000),
  source:sources.includes(task.result.source)?task.result.source:'UNKNOWN',
  createdAt:validDate(task.result.createdAt)?task.result.createdAt:null,archivedAt:now,
  reviewState:'sent_back',shortened:text.length>HISTORY_TEXT_LIMIT});
 if(task.result.executionReceipt){validateExecutionReceipt(task.result.executionReceipt,task.result.source);task.history.at(-1).executionReceipt={...task.result.executionReceipt};}
 if(task.result.humanEdit){const h=task.result.humanEdit;task.history.at(-1).humanEdit={text:h.text.slice(0,HISTORY_TEXT_LIMIT),editedAt:h.editedAt,shortened:h.text.length>HISTORY_TEXT_LIMIT};}
 const removeOldest=t=>{t.history.shift();t.historyPruned=Math.min(1000000,(t.historyPruned||0)+1)};
 while(task.history.length>HISTORY_PER_TASK)removeOldest(task);
 let total=tasks.reduce((sum,t)=>sum+(t.history||[]).reduce((n,h)=>n+cost(h),0),0);
 while(total>HISTORY_BOARD_BUDGET){
  const oldest=tasks.filter(t=>t.history?.length).sort((a,b)=>Date.parse(a.history[0].archivedAt)-Date.parse(b.history[0].archivedAt))[0];
  total-=cost(oldest.history[0]);removeOldest(oldest);
 }
}

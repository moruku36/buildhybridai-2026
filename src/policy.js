export const states=['queued','running','review','done','blocked'];
export const events=['start','result','approve','reject','fail','retry'];
const table={'0:0':1,'1:1':2,'2:2':3,'2:3':0,'1:4':4,'4:5':0};
// Explicit preview implementation only. Live inference requires the Rust WASM core.
export const previewCore={transition:(s,e)=>table[`${s}:${e}`]??-1,rank:(p,s)=>Math.max(1,Math.min(3,p))*1000000+Math.min(999999,s),may_run:(c,l,r,n)=>Number((c===1||l===1)&&r===0&&n<6)};
export function move(core,task,event){const state=core.transition(states.indexOf(task.state),events.indexOf(event));if(state<0)throw Error(`Invalid transition: ${task.state} → ${event}`);task.state=states[state];}
export function nextTask(core,tasks){return tasks.filter(t=>t.state==='queued').sort((a,b)=>core.rank(a.priority,a.sequence)-core.rank(b.priority,b.sequence))[0];}
export function recover(tasks){return tasks.map(t=>t.state==='running'?{...t,state:'blocked',error:'Interrupted. Retry explicitly; the previous request may have consumed quota.'}:t);}
export function validateTasks(tasks){if(!Array.isArray(tasks)||tasks.length>100)throw Error('Invalid board');for(const t of tasks){if(!t||typeof t.id!=='string'||typeof t.title!=='string'||t.title.length>160||typeof t.brief!=='string'||t.brief.length>4000||!states.includes(t.state)||![1,2,3].includes(t.priority)||!Number.isInteger(t.sequence)||t.sequence<0||t.sequence>999999||!['local','hybrid','cloud'].includes(t.mode)||typeof t.cloudAllowed!=='boolean')throw Error('Invalid task');}if(new Set(tasks.map(t=>t.id)).size!==tasks.length)throw Error('Duplicate task');return tasks;}
export async function loadCore(){try {const r=await fetch('/relay_core.wasm');if(!r.ok)throw Error('missing');const {instance}=await WebAssembly.instantiate(await r.arrayBuffer());return {core:instance.exports,rust:true};}catch{return {core:previewCore,rust:false};}}

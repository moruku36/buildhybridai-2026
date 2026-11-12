import {LOCAL_SOURCE} from './local-artifact.js';
export const JSON_LIMITS={characters:4000,depth:8,nodes:500,records:50,issues:20};
// Fixed task-list checks, not JSON Schema or executable user-defined rules.
export function inspectTaskJson(input){
 const report={format:'relay-task-json-check-v1',status:'pass',valid:true,inputCharacters:typeof input==='string'?input.length:0,records:null,nodesVisited:0,issueCount:0,issues:[],
  scope:'Array of objects: id is a unique nonblank string <=80 characters; title is a nonblank string <=160 characters; priority is an integer 1..3.',
  limits:{...JSON_LIMITS},notChecked:['Duplicate JSON keys','Meaning of extra keys','Business correctness','External resources or production compatibility']};
 const issue=(path,reason)=>{report.issueCount++;if(report.issues.length<JSON_LIMITS.issues)report.issues.push({path,reason});};
 const stop=(status,path,reason)=>{report.status=status;report.valid=status==='limited'?null:false;issue(path,reason);return report;};
 if(typeof input!=='string')return stop('fail','$','Input must be JSON text.');
 if(input.length>JSON_LIMITS.characters)return stop('limited','$','Character limit exceeded; no parsing performed.');
 // Bound nesting before JSON.parse, respecting quoted strings and escapes.
 let depth=0,quoted=false,escaped=false;
 for(const c of input){
  if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"')quoted=true;
  else if(c==='['||c==='{'){if(++depth>JSON_LIMITS.depth)return stop('limited','$','Nesting limit exceeded; no parsing performed.');}
  else if(c===']'||c==='}')depth--;
 }
 let data;
 try{data=JSON.parse(input);}catch(e){
  const match=/position (\d+)/i.exec(String(e.message));
  if(match){const offset=Number(match[1]);if(offset<=input.length){const before=input.slice(0,offset);report.syntaxLocation={offset,line:before.split('\n').length,column:offset-before.lastIndexOf('\n')};}}
  return stop('fail','$','Invalid JSON syntax. Location is included only when the browser reports a reliable offset.');
 }
 const pending=[data];
 while(pending.length){
  const value=pending.pop();report.nodesVisited++;
  if(report.nodesVisited>JSON_LIMITS.nodes)return stop('limited','$','Node limit exceeded; record checks not performed.');
  if(value!==null&&typeof value==='object')pending.push(...Object.values(value));
 }
 if(!Array.isArray(data))return stop('fail','$','Top level must be an array.');
 report.records=data.length;
 if(data.length>JSON_LIMITS.records)return stop('limited','$','Record limit exceeded; record checks not performed.');
 const ids=new Set();
 data.forEach((record,i)=>{
  const path='$['+i+']';
  if(record===null||typeof record!=='object'||Array.isArray(record)){issue(path,'Record must be an object.');return;}
  if(typeof record.id!=='string'||!record.id.trim()||record.id.length>80)issue(path+'.id','Required nonblank string, maximum 80 characters.');
  else if(ids.has(record.id))issue(path+'.id','Duplicate id (exact string match).');else ids.add(record.id);
  if(typeof record.title!=='string'||!record.title.trim()||record.title.length>160)issue(path+'.title','Required nonblank string, maximum 160 characters.');
  if(!Number.isInteger(record.priority)||record.priority<1||record.priority>3)issue(path+'.priority','Required integer from 1 to 3.');
 });
 if(report.issueCount){report.status='fail';report.valid=false;}
 return report;
}
export function buildJsonReport(task,now=new Date().toISOString()){
 if(task.kind!=='json-check')throw Error('Explicit JSON check task required');
 const data=inspectTaskJson(task.brief);
 return {source:LOCAL_SOURCE,createdAt:now,data,
  text:'LOCAL_DETERMINISTIC · fixed local JSON check (not AI).\nResult: '+data.status.toUpperCase()+
  '\nApproval acknowledges this report, not that the input passed or is production-ready.\nReviewer instructions do not change these fixed checks. Correct input in a new task; the original input is preserved.\n\n'+JSON.stringify(data,null,2)};
}

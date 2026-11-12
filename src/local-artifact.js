// Deterministic formatting only: no model, network, shell or external action.
export const LOCAL_SOURCE='LOCAL_DETERMINISTIC';
const escapeMarkdown=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/([\\`*_{}\[\]()#+.!|~-])/g,'\\$1');
export function buildChecklist(task,now=new Date().toISOString()){
 if(task.kind!=='checklist')throw Error('Explicit checklist task required');
 const lines=task.brief.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(lines.length>100)throw Error('Use at most 100 checklist items per task.');
 if(!lines.length)throw Error('Add at least one checklist item, one per line.');
 const text=['# '+escapeMarkdown(task.title),'','Source: LOCAL_DETERMINISTIC (not AI-generated).',
 'This document organizes supplied items. No listed work has been performed.','',
 '## Checklist',...lines.map(line=>'- [ ] '+escapeMarkdown(line))];
 if(task.feedback)text.push('','## Reviewer notes for this version','Copied verbatim as notes, not interpreted or applied:',escapeMarkdown(task.feedback));
 return {text:text.join('\n')+'\n',source:LOCAL_SOURCE,createdAt:now};
}
export function approvedMarkdown(task){
 if(task.state!=='done'||task.result?.source!==LOCAL_SOURCE||typeof task.result.text!=='string')throw Error('Approve a local checklist before downloading.');
 return task.result.text;
}

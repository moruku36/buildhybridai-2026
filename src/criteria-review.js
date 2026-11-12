import {ISSUE_BRIEF_PREFIX} from './issue-intake.js';
export function completionCriteria(task){
 if(!task.brief?.startsWith(ISSUE_BRIEF_PREFIX))return [];
 try{const s=JSON.parse(task.brief.slice(ISSUE_BRIEF_PREFIX.length)).acceptanceCriteria;
 return typeof s==='string'&&s.length<=800?s.split(/\r?\n/).map(x=>x.trim()).filter(Boolean):[];
 }catch{return [];}
}
export function criteriaSummary(task){
 const criteria=completionCriteria(task),r=task.result?.criteriaReview;
 const current=r&&r.criteria.length===criteria.length&&r.criteria.every((x,i)=>x===criteria[i]);
 return {scope:'Human assessment of draft content only; no tests or implementation executed.',items:criteria.map((text,i)=>({text,status:current?r.statuses[i]:'unverified'})),overrideReason:current?r.overrideReason:null,reviewedAt:current?r.reviewedAt:null};
}
export function recordCriteriaReview(task,statuses,override,reason,now=new Date().toISOString()){
 const criteria=completionCriteria(task);if(!criteria.length)return;
 if(statuses.length!==criteria.length||statuses.some(x=>!['addressed','missing','unverified'].includes(x)))throw Error('Review every completion criterion.');
 const incomplete=statuses.some(x=>x!=='addressed');
 if(incomplete&&(!override||typeof reason!=='string'||!reason.trim()||reason.length>500))throw Error('Unmet or unverified criteria require explicit acknowledgment and a reason (1–500 characters).');
 task.result.criteriaReview={criteria,statuses:[...statuses],overrideReason:incomplete?reason.trim():null,reviewedAt:now};
}
export function validateCriteriaReviews(tasks){
 for(const t of tasks){const r=t.result?.criteriaReview;if(r===undefined)continue;
 if(!r||t.state!=='done'||!Array.isArray(r.criteria)||!r.criteria.length||r.criteria.length>800||r.criteria.some(x=>typeof x!=='string')||r.criteria.join('\n').length>800||!Array.isArray(r.statuses)||r.statuses.length!==r.criteria.length||r.statuses.some(x=>!['addressed','missing','unverified'].includes(x))||typeof r.reviewedAt!=='string'||r.reviewedAt.length>64||!Number.isFinite(Date.parse(r.reviewedAt))||(r.overrideReason!==null&&(typeof r.overrideReason!=='string'||!r.overrideReason.trim()||r.overrideReason.length>500))||(r.statuses.some(x=>x!=='addressed')&&!r.overrideReason))throw Error('Invalid completion criteria review');
 }
}
export function criteriaControls(document,task,container){
 const criteria=completionCriteria(task);if(!criteria.length)return ()=>{};
 const n=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 container.append(n('h3','Completion criteria: human content review'),n('p','Assess whether this draft addresses each condition. This does not certify implementation, run tests or authorize execution.'));
 const summary=criteriaSummary(task),selects=[];
 for(const [i,text] of criteria.entries()){
 const label=n('label',text),select=n('select');select.id='criterion-'+i;label.htmlFor=select.id;
 for(const [value,name] of [['unverified','Unverified'],['addressed','Addressed in draft'],['missing','Not addressed']]){const option=n('option',name);option.value=value;select.append(option);}
 select.value=summary.items[i].status;select.disabled=task.state!=='review';label.append(select);container.append(label);selects.push(select);
 }
 if(task.state!=='review'){container.append(n('p',summary.overrideReason?'Approved with unresolved criteria: '+summary.overrideReason:'Assessment time: '+(summary.reviewedAt||'not recorded')));return ()=>{};}
 const check=n('input');check.type='checkbox';check.id='criteria-override';
 const label=n('label','Approve the draft despite unmet or unverified conditions (not completion of the work).');label.htmlFor=check.id;label.prepend(check);
 const reason=n('textarea');reason.id='criteria-override-reason';reason.maxLength=500;const rl=n('label','Reason for unresolved criteria');rl.htmlFor=reason.id;rl.append(reason);
 container.append(label,rl);
 return ()=>recordCriteriaReview(task,selects.map(s=>s.value),check.checked,reason.value);
}

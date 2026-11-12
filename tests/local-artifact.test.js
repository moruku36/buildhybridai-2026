import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildChecklist,approvedMarkdown,LOCAL_SOURCE} from '../src/local-artifact.js';
import {validateTasks} from '../src/policy.js';
import {archiveRejectedDraft} from '../src/draft-history.js';
const task=()=>({id:'local',title:'Workshop',brief:'Fold paper\nTest flight',kind:'checklist',mode:'local',cloudAllowed:false,priority:1,sequence:0,state:'queued'});
test('deterministic checklist copies items and reviewer notes, never claims work executed',()=>{
 const t=task();t.feedback='Make it shorter';const a=buildChecklist(t,'2026-11-12T00:00:00Z');
 assert.deepEqual(a,buildChecklist(t,'2026-11-12T00:00:00Z'));
 assert.match(a.text,/- \[ \] Fold paper\n- \[ \] Test flight/);
 assert.match(a.text,/No listed work has been performed/);assert.match(a.text,/not interpreted or applied/);
 assert.equal(a.source,LOCAL_SOURCE);assert.throws(()=>approvedMarkdown({...t,result:a,state:'review'}));
 assert.equal(approvedMarkdown({...t,result:a,state:'done'}),a.text);
});
test('local task validation, size limits and safe Markdown preserve literal input',()=>{
 const t=task();t.brief='<script>alert(1)</script>\n![image](https://example.com/x)';
 const text=buildChecklist(t).text;assert.ok(!text.includes('<script>'));assert.ok(!text.includes('![image]('));
 assert.throws(()=>buildChecklist({...t,kind:'ai'}));assert.throws(()=>buildChecklist({...t,brief:'x\n'.repeat(101)}));
 for(const bad of [{...t,kind:'shell'},{...t,mode:'cloud'},{...t,cloudAllowed:true}])assert.throws(()=>validateTasks([bad]));
 t.result=buildChecklist(t);archiveRejectedDraft([t],t);validateTasks([t]);assert.equal(t.history[0].source,LOCAL_SOURCE);
});

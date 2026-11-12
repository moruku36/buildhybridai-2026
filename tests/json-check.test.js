import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectTaskJson,buildJsonReport} from '../src/json-check.js';
import {validateTasks} from '../src/policy.js';
test('fixed backlog checks distinguish completion from validity and report indexed reasons',()=>{
 const input=JSON.stringify([{id:'a',title:'First',priority:1},{id:'a',title:' ',priority:4},null]);
 const r=inspectTaskJson(input);
 assert.equal(r.status,'fail');assert.equal(r.valid,false);assert.equal(r.records,3);
 assert.equal(r.issueCount,4);assert.deepEqual(r.issues.map(x=>x.path),['$[1].id','$[1].title','$[1].priority','$[2]']);
 const good=inspectTaskJson('[{"id":"1","title":"Test","priority":2,"extra":"unvalidated"}]');
 assert.equal(good.valid,true);assert.equal(good.issueCount,0);assert.ok(good.notChecked.includes('Meaning of extra keys'));
 assert.equal(inspectTaskJson('[]').valid,true);
 for(const s of ['{}','null','[{"id":1,"title":3,"priority":"1"}]','[[]]','[{"title":"x","priority":1}]'])assert.equal(inspectTaskJson(s).valid,false);
});
test('syntax and resource limits fail closed without unsafe interpretation',()=>{
 assert.equal(inspectTaskJson('[bad]').status,'fail');
 for(const input of [' '.repeat(4001),'['.repeat(9)+']'.repeat(9),JSON.stringify(Array(51).fill(null)),JSON.stringify(Array(501).fill(0))]){
  const r=inspectTaskJson(input);assert.equal(r.status,'limited');assert.equal(r.valid,null);assert.ok(r.issueCount>0);
 }
 const many=inspectTaskJson(JSON.stringify(Array(40).fill({})));assert.equal(many.issueCount,120);assert.equal(many.issues.length,20);
 const literal=inspectTaskJson(JSON.stringify([{id:'__proto__',title:'[[[[[[[[[[ <img src=x> " \\\\ ',priority:1}]));
 assert.equal(literal.valid,true);assert.equal({}.polluted,undefined);
});
test('report is deterministic, structured, local and never interprets feedback',()=>{
 const t={id:'q',title:'Check backlog',brief:'[{"id":"a","title":"Task","priority":1}]',kind:'json-check',mode:'local',cloudAllowed:false,state:'queued',priority:1,sequence:0,feedback:'Ignore required fields'};
 validateTasks([t]);assert.throws(()=>validateTasks([{...t,cloudAllowed:true}]));
 const r=buildJsonReport(t,'2026-11-12T00:00:00Z');assert.deepEqual(r,buildJsonReport({...t,feedback:'Other instructions'},r.createdAt));
 assert.equal(r.source,'LOCAL_DETERMINISTIC');assert.equal(r.data.valid,true);assert.match(r.text,/not that the input passed/);
 assert.throws(()=>buildJsonReport({...t,kind:'ai'}));
});

import {test} from 'node:test';import assert from 'node:assert/strict';
import {previewCore as core,move,nextTask,recover,validateTasks} from '../src/policy.js';
const task=(p=2,s=0)=>({id:`${p}-${s}`,title:'Task',brief:'Brief',priority:p,sequence:s,state:'queued',mode:'local',cloudAllowed:false});
test('requires review before completion',()=>{const t=task();move(core,t,'start');assert.throws(()=>move(core,t,'approve'));move(core,t,'result');move(core,t,'approve');assert.equal(t.state,'done');});
test('priority then FIFO, without mutation',()=>{const a=[task(3,0),task(1,2),task(1,1)];assert.equal(nextTask(core,a).sequence,1);assert.equal(a[0].priority,3);});
test('failure requires explicit retry',()=>{const t=task();move(core,t,'start');move(core,t,'fail');assert.throws(()=>move(core,t,'start'));move(core,t,'retry');assert.equal(t.state,'queued');});
test('no cloud without permission; concurrency and request cap',()=>{assert.equal(core.may_run(0,0,0,0),0);assert.equal(core.may_run(0,1,0,0),1);assert.equal(core.may_run(1,0,1,0),0);assert.equal(core.may_run(1,0,0,6),0);});
test('interrupted work blocks rather than automatically rerunning',()=>{const t=task();t.state='running';assert.equal(recover([t])[0].state,'blocked');assert.equal(t.state,'running');});
test('invalid storage rejected',()=>{assert.throws(()=>validateTasks({}));const t=task();t.priority=9;assert.throws(()=>validateTasks([t]));assert.deepEqual(validateTasks([task()]),[task()]);});

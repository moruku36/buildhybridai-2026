import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withExclusiveBoardLock,BOARD_LOCK} from '../src/board-lock.js';
function manager(){let held=false;return {request:async(name,options,action)=>{
 assert.equal(name,BOARD_LOCK);assert.deepEqual(options,{mode:'exclusive',ifAvailable:true});
 if(held)return action(null);held=true;try{return await action({name})}finally{held=false}
}};}
test('concurrent start is rejected while held and normal completion releases the lock',async()=>{
 const locks=manager();let finish,calls=0;
 const first=withExclusiveBoardLock(locks,()=>{calls++;return new Promise(resolve=>{finish=resolve})});
 await assert.rejects(()=>withExclusiveBoardLock(locks,()=>{calls++}),/Another tab owns/);
 assert.equal(calls,1);finish('done');assert.equal(await first,'done');
 assert.equal(await withExclusiveBoardLock(locks,()=>++calls),2);
});
test('work exceptions release the lock; unsupported and API errors never execute work',async()=>{
 const locks=manager();await assert.rejects(()=>withExclusiveBoardLock(locks,()=>{throw Error('Synthetic failure')}),/Synthetic/);
 assert.equal(await withExclusiveBoardLock(locks,()=>true),true);
 let calls=0;
 for(const api of [undefined,{}, {request(){throw Error('Denied')}}])await assert.rejects(()=>withExclusiveBoardLock(api,()=>calls++));
 assert.equal(calls,0);
});

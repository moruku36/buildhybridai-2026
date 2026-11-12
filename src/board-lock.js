export const BOARD_LOCK='relay-board-v1-exclusive';
export async function withExclusiveBoardLock(locks,action){
 if(!locks||typeof locks.request!=='function')return Promise.reject(Error('Web Locks unavailable. Board is read-only; execution is disabled.'));
 return locks.request(BOARD_LOCK,{mode:'exclusive',ifAvailable:true},lock=>{
  if(!lock)throw Error('Another tab owns this board. No changes or execution started.');
  return action();
 });
}

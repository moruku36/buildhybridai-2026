// Local observations only. Never infer route or timing from old results or settings.
const modes=['local','hybrid','cloud'];
const sources=['on_device','in_cloud','UNKNOWN'];
const sourceOrUnknown=source=>sources.includes(source)?source:'UNKNOWN';
export function createExecutionReceipt(requestedMode,source,elapsedMs){
 if(!modes.includes(requestedMode))throw Error('Invalid requested inference route');
 return {version:1,requestedMode,actualSource:sourceOrUnknown(source),
  elapsedMs:Number.isFinite(elapsedMs)&&elapsedMs>=0&&elapsedMs<=Number.MAX_SAFE_INTEGER?Math.round(elapsedMs):null};
}
export function validateExecutionReceipt(receipt,source){
 if(receipt===undefined)return; // Legacy results have no invented receipt.
 if(!receipt||Object.keys(receipt).length!==4||receipt.version!==1||!modes.includes(receipt.requestedMode)||!sources.includes(receipt.actualSource)||receipt.actualSource!==sourceOrUnknown(source)||!sources.includes(source)||(receipt.elapsedMs!==null&&(!Number.isSafeInteger(receipt.elapsedMs)||receipt.elapsedMs<0)))throw Error('Invalid execution receipt');
}
export function validateExecutionReceipts(tasks){
 for(const task of tasks){
  if(task.result?.executionReceipt!==undefined&&task.kind!==undefined&&task.kind!=='ai')throw Error('Only AI drafts can have execution receipts');
  validateExecutionReceipt(task.result?.executionReceipt,task.result?.source);
 }
}
export function executionReceiptLines(result){
 const receipt=result.executionReceipt;
 if(!receipt)return [['PREVIEW','TEST_FIXTURE','LOCAL_DETERMINISTIC'].includes(result.source)?'No AI execution receipt: this is a preview, fixture or local result.':'No execution receipt recorded. Requested route and elapsed time are unknown.'];
 validateExecutionReceipt(receipt,result.source);
 const route={local:'On-device only',hybrid:'Prefer device',cloud:'Cloud only'}[receipt.requestedMode];
 const actual={on_device:'On device (SDK-reported)',in_cloud:'Cloud (SDK-reported)',UNKNOWN:'Unknown (missing or unrecognized)'}[receipt.actualSource];
 const duration=receipt.elapsedMs===null?'Unknown':`${receipt.elapsedMs.toLocaleString('en-US')} ms`;
 const lines=[`Requested route: ${route}. Actual source: ${actual}.`,`End-to-end elapsed: ${duration}. Includes device preparation and response; not a model benchmark or cost estimate.`];
 if(receipt.requestedMode==='hybrid'&&receipt.actualSource==='in_cloud')lines.push('Cloud served a device-preferred request. The fallback reason was not recorded.');
 if((receipt.requestedMode==='local'&&receipt.actualSource==='in_cloud')||(receipt.requestedMode==='cloud'&&receipt.actualSource==='on_device'))lines.push('Warning: the reported source differs from the requested exclusive route. Inspect this before further use.');
 lines.push('Local receipt for the original draft only. Human edits do not create new inference. Stored receipts are not signed proof or verification in this page session.');
 return lines;
}

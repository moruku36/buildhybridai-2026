// Match Firebase AI 13.0.0 ChromeAdapter defaults used by Relay.
// Do not import Firebase: initialization can generate credentials or cause requests.
export const deviceCheckOptions=()=>({
 expectedInputs:[{type:'text',languages:['en']},{type:'image'}],
 expectedOutputs:[{type:'text',languages:['en']}],
});
export async function checkDeviceAvailability(provider){
 if(!provider||typeof provider.availability!=='function')return {apiPresent:false,status:'unknown'};
 let timer;
 try{
  const status=await Promise.race([
   provider.availability(deviceCheckOptions()),
   new Promise(resolve=>{timer=setTimeout(()=>resolve('unknown'),5000)}),
  ]);
  return {apiPresent:true,status:['available','downloadable','downloading','unavailable'].includes(status)?status:'unknown'};
 }catch{return {apiPresent:true,status:'unknown'}}
 finally{clearTimeout(timer)}
}
export function describeDeviceAvailability({apiPresent,status}){
 if(!apiPresent)return 'LanguageModel availability API is not exposed in this browser. Model readiness is unknown.';
 const messages={
  available:'Model available for the checked options. No inference was run; device inference remains unverified.',
  downloadable:'Model is downloadable, but not ready. This check did not start a download.',
  downloading:'Model download is already in progress. This check did not start or wait for it.',
  unavailable:'Model unavailable for the checked options in this environment.',
  unknown:'Model availability is unknown (unexpected response, error or timeout). Not verified.',
 };
 return messages[status]||messages.unknown;
}

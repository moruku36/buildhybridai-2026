import {generateInspectedDraft} from './draft-preflight.js';
import {deviceModelOptions} from './device-options.js';
import {initializeApp} from 'firebase/app';
import {initializeAppCheck,ReCaptchaV3Provider,CustomProvider,getToken} from 'firebase/app-check';
import {getAI,getGenerativeModel,GoogleAIBackend,InferenceMode} from 'firebase/ai';
import {enableLocalAppCheckDebug,isLocalDebugRequested} from './app-check-debug.js';
const env=import.meta.env;
export const debugRequested=import.meta.env.DEV ? isLocalDebugRequested({dev:import.meta.env.DEV,optIn:import.meta.env.VITE_APPCHECK_DEBUG,hostname:globalThis.location?.hostname}) : false;
export const configured=Boolean(env.VITE_FIREBASE_API_KEY&&env.VITE_FIREBASE_PROJECT_ID&&env.VITE_FIREBASE_APP_ID&&(env.VITE_APPCHECK_SITE_KEY||debugRequested));
let ai,app,appCheck;
export function initializeConnection(){
 if(!configured)throw Error('Firebase and App Check are not configured. No AI request was sent.');
 if(!appCheck){
 if(import.meta.env.DEV) enableLocalAppCheckDebug({dev:import.meta.env.DEV,optIn:import.meta.env.VITE_APPCHECK_DEBUG,hostname:globalThis.location?.hostname,target:globalThis});
 app=initializeApp({apiKey:env.VITE_FIREBASE_API_KEY,projectId:env.VITE_FIREBASE_PROJECT_ID,appId:env.VITE_FIREBASE_APP_ID});
 let provider;
 if(import.meta.env.DEV && debugRequested){
  provider=new CustomProvider({getToken:async()=>{throw Error('Relay debug-only provider cannot issue production attestation');}});
 }else{provider=new ReCaptchaV3Provider(env.VITE_APPCHECK_SITE_KEY);}
 appCheck=initializeAppCheck(app,{provider,isTokenAutoRefreshEnabled:false});
 }
 return {debug:debugRequested};
}
// Explicit, single attestation check. Never expose the returned credential.
export async function verifyAppCheck(){
 initializeConnection();
 await getToken(appCheck,true);
 return {verified:true};
}
export function prepareModel(mode,onProgress){
 initializeConnection();
 if(!ai)ai=getAI(app,{backend:new GoogleAIBackend()});
 const modes={local:InferenceMode.ONLY_ON_DEVICE,hybrid:InferenceMode.PREFER_ON_DEVICE,cloud:InferenceMode.ONLY_IN_CLOUD};
 const model=getGenerativeModel(ai,{mode:modes[mode],onDeviceParams:{createOptions:deviceModelOptions()},inCloudParams:{model:env.VITE_CLOUD_MODEL||'gemini-3.5-flash-lite',generationConfig:{maxOutputTokens:1200}}});
 // This function is invoked directly from the user's Start interaction.
 let ready=mode==='cloud'?Promise.resolve():model.initializeDeviceModel(onProgress);
 // Explicitly approved hybrid tasks may use Firebase's cloud fallback if device setup fails.
 if(mode==='hybrid')ready=ready.catch(()=>undefined);
 return {model,ready};
}
export function generateDraft(task,prepared,inspection,assertCurrent){
 return generateInspectedDraft(task,prepared,inspection,assertCurrent);
}

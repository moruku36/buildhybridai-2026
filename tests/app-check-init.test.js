import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
async function boot({dev=false,host='localhost',siteKey='',optIn='true'}={}) {
 const result=await build({entryPoints:['src/ai.js'],bundle:true,write:false,format:'cjs',define:{
  'import.meta.env':JSON.stringify({DEV:dev,VITE_APPCHECK_DEBUG:optIn,VITE_FIREBASE_API_KEY:'public-test-config',VITE_FIREBASE_PROJECT_ID:'synthetic-test-project',VITE_FIREBASE_APP_ID:'synthetic-app',VITE_APPCHECK_SITE_KEY:siteKey}),
 },plugins:[{name:'offline-firebase-stubs',setup(b){
  b.onResolve({filter:/^firebase\//},args=>({path:args.path,namespace:'stub'}));
  b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`
  export function initializeApp(){return {}}
  export class ReCaptchaV3Provider{constructor(key){this.key=key}}
  export class CustomProvider{constructor(options){this.options=options}}
  export async function getToken(){globalThis.trace.push({event:'exchange'});return {token:'synthetic-never-exposed-response'}}
  export function initializeAppCheck(app,options){globalThis.trace.push({event:'appcheck',debug:globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN,key:options.provider.key,provider:options.provider,refresh:options.isTokenAutoRefreshEnabled});return {}}
  export function getAI(){return {}}
  export class GoogleAIBackend{}
  export const InferenceMode={ONLY_ON_DEVICE:'only_on_device',PREFER_ON_DEVICE:'prefer_on_device',ONLY_IN_CLOUD:'only_in_cloud'};
  export function getGenerativeModel(ai,options){globalThis.trace.push({event:'model',options});return {initializeDeviceModel:async()=>{},generateContent:()=>{throw Error('No real inference allowed in test')}}}
  `,loader:'js'}));
 }}]});
 const context={module:{exports:{}},location:{hostname:host},trace:[]};vm.runInNewContext(result.outputFiles[0].text,context);
 return {api:context.module.exports,context};
}
test('offline debug initialization needs no site key and calls no model',async()=>{
 const {api,context}=await boot({dev:true});
 assert.equal(api.configured,true);assert.equal(api.initializeConnection().debug,true);
 assert.equal(context.trace.length,1);assert.equal(context.trace[0].event,'appcheck');assert.equal(context.trace[0].debug,true);
 assert.equal(context.trace[0].key,undefined);assert.equal(context.trace[0].refresh,false);
 await assert.rejects(()=>context.trace[0].provider.options.getToken(),/cannot issue production attestation/);
 api.initializeConnection();assert.equal(context.trace.length,1);
});
test('production without a real site key and remote debug cannot initialize',async()=>{
 for(const options of [{dev:false},{dev:true,host:'example.com'},{dev:true,optIn:'false'}]){
  const {api,context}=await boot(options);assert.equal(api.configured,false);
  assert.throws(()=>api.initializeConnection(),/not configured/);assert.equal(context.trace.length,0);
 }
});
test('production uses the supplied public site key without enabling debug',async()=>{
 const {api,context}=await boot({siteKey:'synthetic-public-site-key'});
 assert.equal(api.initializeConnection().debug,false);assert.equal(context.trace[0].key,'synthetic-public-site-key');
 assert.equal(context.FIREBASE_APPCHECK_DEBUG_TOKEN,undefined);
});

test('verification makes one explicit exchange and never returns its credential',async()=>{
 const {api,context}=await boot({dev:true});const result=await api.verifyAppCheck();
 assert.equal(result.verified,true);assert.equal(result.token,undefined);
 assert.equal(context.trace.filter(x=>x.event==='exchange').length,1);
 assert.equal(context.trace.filter(x=>x.event==='model').length,0);
});

test('all Firebase routes receive exactly the same text-only options as diagnostics',async()=>{
 const {deviceCheckOptions}=await import('../src/device-diagnostics.js');
 for(const mode of ['local','hybrid','cloud']){
  const {api,context}=await boot({dev:true});await api.prepareModel(mode).ready;
  const call=context.trace.find(x=>x.event==='model');
  assert.deepEqual(JSON.parse(JSON.stringify(call.options.onDeviceParams.createOptions)),deviceCheckOptions());
  assert.deepEqual(deviceCheckOptions(),{expectedInputs:[{type:'text',languages:['en']}],expectedOutputs:[{type:'text',languages:['en']}]});
 }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkDeviceAvailability,deviceCheckOptions,describeDeviceAvailability} from '../src/device-diagnostics.js';
test('availability diagnostics preserve all four states and only call availability with shared text-only options',async()=>{
 for(const status of ['available','downloadable','downloading','unavailable']){
  let calls=0;
  const provider={availability(options){calls++;assert.deepEqual(options,{expectedInputs:[{type:'text',languages:['en']}],expectedOutputs:[{type:'text',languages:['en']}]});return Promise.resolve(status)},
   get create(){throw Error('create must never be accessed')},get prompt(){throw Error('prompt must never be accessed')}};
  assert.deepEqual(await checkDeviceAvailability(provider),{apiPresent:true,status});assert.equal(calls,1);
  assert.equal(typeof describeDeviceAvailability({apiPresent:true,status}),'string');
 }
 assert.match(describeDeviceAvailability({apiPresent:true,status:'available'}),/inference remains unverified/);
 assert.match(describeDeviceAvailability({apiPresent:true,status:'downloadable'}),/not ready/);
 assert.match(describeDeviceAvailability({apiPresent:true,status:'downloading'}),/already in progress/);
});
test('missing API, errors and unknown results never imply readiness',async()=>{
 assert.deepEqual(await checkDeviceAvailability(undefined),{apiPresent:false,status:'unknown'});
 assert.deepEqual(await checkDeviceAvailability({}),{apiPresent:false,status:'unknown'});
 for(const value of ['ready',null,undefined,true])assert.equal((await checkDeviceAvailability({availability:async()=>value})).status,'unknown');
 assert.equal((await checkDeviceAvailability({availability:async()=>{throw Error('Synthetic failure')}})).status,'unknown');
 const options=deviceCheckOptions();options.expectedInputs[0].languages.push('xx');
 assert.deepEqual(deviceCheckOptions().expectedInputs[0].languages,['en']);
});

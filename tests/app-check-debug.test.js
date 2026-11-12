import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enableLocalAppCheckDebug as enable} from '../src/app-check-debug.js';
test('debug defaults off and never enables for production', () => {
  for (const dev of [false, undefined, true]) {
    for (const optIn of [undefined, '', 'false', 'TRUE', true, 'not-a-token']) {
      const target={}; assert.equal(enable({dev,optIn,hostname:'localhost',target}),false);
      assert.deepEqual(target,{});
    }
  }
  const target={}; assert.equal(enable({dev:false,optIn:'true',hostname:'localhost',target}),false);
  assert.deepEqual(target,{});
});
test('only explicit development opt-in on loopback sets a boolean', () => {
  for(const hostname of ['localhost','127.0.0.1','[::1]','::1']) {
    const target={}; assert.equal(enable({dev:true,optIn:'true',hostname,target}),true);
    assert.equal(target.FIREBASE_APPCHECK_DEBUG_TOKEN,true);
  }
});
test('remote origins and token strings fail closed without mutation', () => {
  for(const hostname of ['example.com','localhost.example.com','192.168.1.2','']) {
    const target={};assert.throws(()=>enable({dev:true,optIn:'true',hostname,target}),/loopback/);
    assert.deepEqual(target,{});
  }
  const target={FIREBASE_APPCHECK_DEBUG_TOKEN:'synthetic-rejected-value'};
  assert.throws(()=>enable({dev:true,optIn:'true',hostname:'localhost',target}),/token strings/);
  assert.equal(target.FIREBASE_APPCHECK_DEBUG_TOKEN,'synthetic-rejected-value');
});

test('only local explicit debug mode permits omitting the production site key', async()=>{
 const {isLocalDebugRequested}=await import('../src/app-check-debug.js');
 assert.equal(isLocalDebugRequested({dev:true,optIn:'true',hostname:'localhost'}),true);
 for(const options of [{dev:false,optIn:'true',hostname:'localhost'},{dev:true,optIn:'false',hostname:'localhost'},{dev:true,optIn:'true',hostname:'example.com'}]) assert.equal(isLocalDebugRequested(options),false);
});

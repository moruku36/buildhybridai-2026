import {reviewFixtureEnabled} from './review-fixture-mode.js';
export function makeReviewFixture(sequence){
 if(!reviewFixtureEnabled)throw Error('Review fixture is disabled.');
 return {id:'relay-review-fixture-v1',title:'Synthetic review example (not AI)',brief:'Fictional QA text only. Never sent to a model.',kind:'review-fixture',priority:3,sequence,state:'review',mode:'local',cloudAllowed:false,
  result:{source:'TEST_FIXTURE',createdAt:new Date().toISOString(),text:'TEST_FIXTURE — synthetic review text, NOT an AI response.\n\nFictional paper-plane plan: fold a sample, record a flight distance, and review the notes. No work or inference was performed.'}};
}

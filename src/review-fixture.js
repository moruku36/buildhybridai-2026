import {ISSUE_BRIEF_PREFIX} from './issue-intake.js';
import {reviewFixtureEnabled} from './review-fixture-mode.js';
export function makeReviewFixture(sequence){
 if(!reviewFixtureEnabled)throw Error('Review fixture is disabled.');
 return {id:'relay-review-fixture-v2',title:'Synthetic review example (not AI)',brief:ISSUE_BRIEF_PREFIX+JSON.stringify({goal:'Synthetic QA: review a fictional paper-plane plan. No AI or implementation.',constraints:'No execution or external send.',acceptanceCriteria:'Describe distance units in metres.\nDescribe a manual input check.'}),kind:'review-fixture',priority:3,sequence,state:'review',mode:'local',cloudAllowed:false,
  result:{source:'TEST_FIXTURE',createdAt:new Date().toISOString(),text:'TEST_FIXTURE — synthetic review text, NOT an AI response.\n\nFictional paper-plane plan: fold a sample, record a flight distance, and review the notes. No work or inference was performed.'}};
}

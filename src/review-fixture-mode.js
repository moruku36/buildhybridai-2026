export function isReviewFixtureEnabled({dev,optIn,hostname}){
 return dev===true&&optIn==='true'&&['localhost','127.0.0.1','[::1]','::1'].includes(hostname);
}
export const reviewFixtureEnabled=isReviewFixtureEnabled({dev:import.meta.env?.DEV,optIn:import.meta.env?.VITE_REVIEW_FIXTURE,hostname:globalThis.location?.hostname});
export const isReviewFixture=t=>t.kind==='review-fixture'&&t.result?.source==='TEST_FIXTURE';

//! Deterministic orchestration policy. No network, model inference, or shell execution.
//! State: queued=0, running=1, review=2, done=3, blocked=4.
//! Events: start=0, result=1, approve=2, reject=3, fail=4, retry=5.
#[no_mangle]
pub extern "C" fn transition(state: u32, event: u32) -> i32 {
    match (state, event) {
        (0, 0) => 1, (1, 1) => 2, (2, 2) => 3,
        (2, 3) => 0, (1, 4) => 4, (4, 5) => 0,
        _ => -1,
    }
}
/// Lower rank wins. Priorities P1-P3; FIFO within priority.
#[no_mangle]
pub extern "C" fn rank(priority: u32, sequence: u32) -> u32 {
    let p = priority.clamp(1, 3);
    p * 1_000_000 + sequence.min(999_999)
}
/// Explicit consent gates every potential off-device execution.
#[no_mangle]
pub extern "C" fn may_run(cloud_allowed: u32, local_only: u32, running: u32, calls: u32) -> u32 {
    ((cloud_allowed == 1 || local_only == 1) && running == 0 && calls < 6) as u32
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn review_is_required() { assert_eq!(transition(1,2),-1); assert_eq!(transition(1,1),2); assert_eq!(transition(2,2),3); }
    #[test] fn retries_are_explicit() { assert_eq!(transition(4,0),-1); assert_eq!(transition(4,5),0); }
    #[test] fn priority_precedes_age() { assert!(rank(1,999999)<rank(2,0)); }
    #[test] fn bounded_and_consent_gated() { assert_eq!(may_run(0,0,0,0),0); assert_eq!(may_run(0,1,0,0),1); assert_eq!(may_run(1,0,1,0),0); assert_eq!(may_run(1,0,0,6),0); }
}

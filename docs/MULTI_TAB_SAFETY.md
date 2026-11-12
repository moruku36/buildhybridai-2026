# Multi-tab board safety

Relay uses navigator.locks.request with the exclusive name relay-board-v1-exclusive and ifAvailable=true. The complete queue run holds the lock until it finishes or stops. Every board-writing action uses that same lock: task creation, preview, priority, retry, execution settings, review approval and rejection. Actions in the owning tab can safely update its board while its own queue is running; other cooperating tabs are refused rather than queued for surprise later execution.

## State and failure handling

- The stored board is compared with the tab's last-read snapshot under the lock, before an action and before saving. A stale tab refreshes and rejects the pending action without overwriting the newer board.
- A running task is converted to blocked only after acquiring the lock. Opening a second tab during a live run cannot mistake that run for a crashed one.
- After orphaned-running recovery, the operation stops and asks for inspection/explicit retry. It does not start another model request automatically.
- If Web Locks is missing or acquisition throws, execution and board changes fail closed. Start and preview are disabled when support is absent.
- If saving the running state fails, the model call is not started.
- No timeout lease or forced lock stealing is used.

Browser-managed locks are released when the owning context terminates. A cloud request already sent can still continue on the server after a tab closes or crashes. A blocked interrupted task therefore requires deliberate retry, and may already have consumed quota. This is not an exactly-once guarantee, cancellation guarantee or refund guarantee.

## Scope

Coordination covers cooperating copies of this app in the same origin and browser storage scope. It does not coordinate different origins/ports, browser profiles, browsers or devices. Older app tabs or unrelated scripts that ignore the lock are outside the guarantee; reload older versions before live use. The snapshot check is defense in depth, not an atomic compare-and-swap against noncooperating writers. Browser storage remains unencrypted, and the six-attempt limit remains per page session rather than a global billing cap.

The app still runs only while its page context is alive; this is not a background worker or durable agent service.

## Verification

The full offline suite passed 31 tests after integration; a final additional fail-closed regression and the affected lock/DOM suite then passed all 10 tests (32 tests total now present). Production build passed. Shared-lock/shared-storage mock windows cover simultaneous start, second-tab rejection, no recovery of another tab's running task, stale write rejection, normal release, exception release, orphaned-running recovery, missing APIs and failed persistence. No real browser crash or live AI call was performed.

## Optional UI check without AI

Preview is immediate and has no deliberate holding delay, so two UI clicks cannot reliably demonstrate lock contention. Use the shared-lock automated test for that case; there is no published test backdoor.

For a manual stale-tab check, use two tabs on the same separate test origin with a disposable sample board, not the user's existing board. Do not initialize Firebase, verify App Check or start the queue. Change a sample task's priority in tab A, then attempt a priority change in tab B: B must refresh and reject the stale operation. A deliberate second operation in B should succeed. This validates stale-write UX, not a live in-flight lock or crash guarantee.

## Real Brave stale-write check

A later manual check used two Brave tabs on an isolated test-board origin, without initializing AI or making an inference request. Tab A changed a sample priority P1 to P2. Tab B's stale P1 action was refused and refreshed to P2 without overwriting it. An explicit retry in B saved P3, and reloading A showed P3.

That check exposed a stale conflict notice remaining after the successful retry. Successful persistence now replaces only that exact stale-board notice with "Board changes saved." Other warnings and inference-result notices are preserved. The affected lock/DOM regressions and production build passed after this minimal fix.

Real held-lock contention and browser-crash behavior were not exercised in this UI check; those remain mock/spec-based coverage as described above.

# Run one task without draining the queue

Queued cards offer **Run this task only**. For AI tasks this opens exact prompt
inspection, then **Run inspected task only** runs the selected card once and
pauses, even when other cards have higher priority. Opening inspection runs no AI. It does not edit
priority, reorder stored tasks, or grant cloud permission. **Start queue**
continues to use the existing priority/FIFO ordering.

This is useful for checking a non-sensitive on-device, cloud, or hybrid task
one at a time before starting a wider queue. It is not a separate test model,
automatic fallback experiment, or proof that a browser supports on-device AI.

## Use

1. Build the matching Rust/WASM core and configure Firebase/App Check as
   described in [setup](IMPLEMENTATION.md).
2. Prepare a public or synthetic task. Inspect its inference route and content
   in **Edit execution**. Cloud and hybrid still require that task's cloud
   permission.
3. Optionally use **Check device availability**. This is a separate read-only
   check; availability alone never verifies inference.
4. Click **Run this task only** on the intended queued card. Local tasks produce
   only their deterministic local output. For AI tasks, inspect the full prompt,
   UTF-8 bytes and requested route, then **Run inspected task only**. The same
   frozen prompt is used at dispatch after fresh content, route, permission,
   lifecycle, session-cap and storage checks. AI uses the same Firebase path as
   **Start queue**, which does not show per-task inspection dialogs.
5. Review the result and its original execution receipt. A hybrid request with
   an SDK-reported cloud response records the route and actual source; it does
   not establish why the SDK chose cloud.
6. Other queued tasks stay queued. Run another task or explicitly start the
   queue when ready. To retry a blocked task, use **Return to queue** first.

## Existing boundaries are unchanged

- Start is disabled without a matching Rust/WASM core or Web Locks support.
- The same board-wide lock and stale-storage checks guard both start actions.
- AI starts share the existing maximum of six attempts per page session.
  Starting single tasks separately does not reset that counter. It is not a
  billing limit, a global quota, or a limit across page reloads.
- Permission/configuration failures do not run another task instead.
- An execution failure blocks the selected task and never retries or advances
  to the remaining queue. Reload/interruption recovery remains unchanged.
- AI responses longer than 20,000 JavaScript string units (UTF-16 code units,
  not bytes or tokens) fail visibly rather than silently keeping only a prefix.
  No partial result enters review or approved handoff. Inference has already
  happened and may have consumed quota; this does not refund an attempt.
  Narrow the brief before explicitly returning the task to the queue. Responses
  at or below the limit retain their exact text; blank responses still fail.
  Three isolated synthetic cases in `tests/draft-output-limit-selected.test.js`
  passed once on November 14, 2026: oversized output rejection, exact 20,000
  UTF-16-unit Unicode retention with SDK source, and blank-output rejection.
  This is mocked unit evidence, not browser, device, Firebase or live-inference
  acceptance. The separate 3-case/1-invocation allowance is exhausted; these
  results are not part of the historical pass receipts below.
- Pause only requests a stop after the current request; it does not cancel a
  model download or in-flight inference. Closing the tab is not a cancellation
  or billing guarantee.
- Approval, local editing, history and manual handoff use the existing flows.
  There is no automatic sending, code execution or downstream agent dispatch.

## Verification scope

**November 14 source change:** prompt inspection and dispatch-time rechecks are
implemented. The parent reviewed the diff and ran
`node --test tests/draft-preflight-selected.test.js` **exactly once: 5/5 PASS**,
duration **315.364542 ms**. Firebase and WASM boundaries are synthetic; this is
not real attestation, device/hybrid inference or WASM execution evidence.
`npm run build` separately ran **exactly once: SUCCESS**, Vite **7.3.8**,
**36 modules**, **153 ms**. Read-only hashing confirmed that both
`public/relay_core.wasm` and `dist/relay_core.wasm` equal the expected SHA-256
`4e498b782bd71b3962f7c9fd748534e84df8b94ae0c65399627e5e498e78fe8e`;
packaging is not proof of browser execution.

The historical **10 cases / 3 invocations** remain separate. This patch's
additional **5 cases / 1 invocation** are **exhausted**; no rerun, full suite or
CI allowance remains. This documentation reconciliation executed no tests or
builds. The six-case legacy UI harness below predates the new two-click
interaction and must not be rerun unchanged or counted as verification of this
patch. Its nine-case subtotal below is historical, not a new count.

Eligible browser/model readiness, successful device/hybrid inference, actual
file-save, keyboard/layout and usable-app acceptance remain unverified. The
earlier environment-file filename scan found only `.env.example`; that was a
historical observation before subsequent owner-authorized setup placed the
existing public Firebase Web configuration in ignored `.env.local`. App Check
v3 registration remains blocked, and local-browser setup and acceptance are
owner-paused while using Windows. No ignored configuration values were read
for this reconciliation; configuration presence is not connection or inference
proof. See the [exact verification and remaining
setup](IMPLEMENTATION.md#patch-verification-and-remaining-setup--november-14-2026)
and the [English storyboard](DEMO_WALKTHROUGH.md); neither establishes a working
hybrid app or a completed submission.

### Historical checks before prompt inspection

The six focused offline cases exercise the real UI, queue, storage, lock and
receipt code with synthetic SDK and WASM boundaries: selection over priority,
cloud permission rejection, failed-run/no-retry behavior, lock contention,
stale storage and the shared six-attempt limit. These tests are not live
Firebase, hardware, model download, or actual WASM execution evidence.

Historical development verification: the six focused cases passed in one invocation,
and three existing UI cases passed in one additional invocation (nine case
executions total; no full-suite or CI run). The Vite 7.3.8 web build passed.
Real-browser interaction QA was not completed because the local QA server could
not be started through the configured execution controls. No model download,
inference, Firebase configuration, or App Check change was performed.

The web bundle can build without the ignored WASM binary. Such a bundle remains
a preview and is **not a complete live-inference release**. Actual on-device
inference and hybrid fallback still require separate hardware validation.

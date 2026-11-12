# Run one task without draining the queue

Queued cards offer **Run this task only**. It runs the selected card once and
then pauses, even when other cards have higher priority. It does not edit
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
   only their deterministic local output. AI tasks use the same Firebase path
   as **Start queue**.
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
- Pause only requests a stop after the current request; it does not cancel a
  model download or in-flight inference. Closing the tab is not a cancellation
  or billing guarantee.
- Approval, local editing, history and manual handoff use the existing flows.
  There is no automatic sending, code execution or downstream agent dispatch.

## Verification scope

The six focused offline cases exercise the real UI, queue, storage, lock and
receipt code with synthetic SDK and WASM boundaries: selection over priority,
cloud permission rejection, failed-run/no-retry behavior, lock contention,
stale storage and the shared six-attempt limit. These tests are not live
Firebase, hardware, model download, or actual WASM execution evidence.

Current development verification: the six focused cases passed in one invocation,
and three existing UI cases passed in one additional invocation (nine case
executions total; no full-suite or CI run). The Vite 7.3.8 web build passed.
Real-browser interaction QA was not completed because the local QA server could
not be started through the configured execution controls. No model download,
inference, Firebase configuration, or App Check change was performed.

The web bundle can build without the ignored WASM binary. Such a bundle remains
a preview and is **not a complete live-inference release**. Actual on-device
inference and hybrid fallback still require separate hardware validation.

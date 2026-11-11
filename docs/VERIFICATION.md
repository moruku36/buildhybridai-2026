# Verification evidence

Initial development validation report, recorded November 12, 2026. This is historical evidence from the original environment. Rust compilation and follow-up checks are documented in [MAC_VALIDATION.md](MAC_VALIDATION.md); the limitations below describe the initial run. Node v24.22.1, Firebase 13.0.0, Vite 7.2.2.

## Passed

`npm test`: 8/8 tests, 0 failures (final run: 897 ms total).

- Review is mandatory before completion.
- Priority then FIFO without mutating original array order.
- Explicit retry after failure.
- Consent, concurrency and six-request session gate.
- Interrupted run recovery.
- Persisted board validation.
- DOM flow: preview, read, close/reopen, reject/requeue, approve, cloud permission, safe text rendering, reload persistence.
- Corrupt storage disclosure without overwriting original data; interrupted task disclosure.

`npm run build`: success, 19 modules transformed, final build 359 ms.

| Asset | Uncompressed | gzip |
| --- | ---: | ---: |
| Initial JavaScript | 11.48 KB | 5.26 KB |
| Initial CSS | 5.21 KB | 1.76 KB |
| Deferred Firebase AI chunk | 73.37 KB | 22.77 KB |
| HTML | 0.41 KB | 0.29 KB |

The DOM harness took 47.3 ms to initialize. This is a single jsdom observation, **not** a browser paint measurement, device benchmark, Rust/WASM comparison, or proof Rust is faster. Rust WASM is not included in these size totals because it was not compiled.

## Blocked / not run

- Rust compiler and cargo are absent. Rust unit tests and WASM build were not run. Live mode remains disabled without WASM. No Rust performance claim is made.
- Chromium failed to start because its process singleton socket was denied (`Operation not permitted`). A permitted escalated local-only retry reached the same error. No screenshot, visual QA, mobile rendering measurement, or actual-browser interaction pass is claimed.
- Firebase configuration, App Check, model download, device compatibility, cloud quota and actual inference have not been configured or exercised. No inference or billing request was sent.
- No repository push, deployment, publication, registration or contest submission.

## Remaining release gates

Rust compilation and tests were subsequently completed (see the follow-up report). Remaining gates: perform real Chrome visual/interaction QA; establish App Check and quotas under explicit owner approval; verify both device and cloud calls and actual source labels; test cross-tab coordination; choose a license; record an English demo. Current work is an implementation slice/preview, not a contest-ready app.

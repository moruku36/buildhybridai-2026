# Rust/WASM follow-up validation

This report supersedes the initial report's Rust-not-built status for the validation copy. It records development checks, not production readiness.

## Passed in the Mac validation run

- Native Rust tests: 4 passed, 0 failed (Rust/Cargo 1.99.1, aarch64-apple-darwin).
- Release build for wasm32-unknown-unknown: successful; module size 557 bytes.
- Node policy tests: 6 passed, 0 failed.
- Real WASM module loaded in Node: 94 transition/rank/run-gate cases matched the JavaScript preview implementation.
- Local HTTP served the compiled core with status 200, application/wasm, Content-Length 557.

Before publication, the six policy tests and 94 WASM parity cases were repeated successfully on Node 26.13.0. Source code is published; build outputs and local machine configuration are excluded. Run npm run build:core to recreate the module.

## Initial validation, not repeated on this machine

The initial environment reported eight total Node/DOM tests passing and a successful Vite production build; see [VERIFICATION.md](VERIFICATION.md). The publication check attempted the full Node suite on the Mac, but the UI harness could not load esbuild because npm dependencies were not installed there. This is an environment blocker, not a passing UI test. Run npm ci before npm test and npm run build.

## Not verified

- Real Chrome visual/interaction QA, screenshots and browser first-paint measurements remain incomplete. DOM tests and HTTP checks do not replace these.
- Firebase project configuration, App Check registration, model download, on-device inference, cloud inference and cloud quotas are unverified.
- No live inference request, billing setup, deployment or contest submission was performed as part of these checks.
- Multi-tab coordination is not implemented. Use one tab only for live work.
- License selection remains pending the owner's decision.

The repository publication does not change these validation limits.

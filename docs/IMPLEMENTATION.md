# Relay: a workboard that moves work forward

## Current truth

Published implementation slice, not a submitted entry or deployed application. The board, persistence, priority changes, explicit preview fixtures, review/approve/requeue, interrupted-run recovery, and export are implemented. Rust tests and a WASM build passed on a Mac validation machine; see [validation](MAC_VALIDATION.md). Build the WASM core locally using the steps below; compiled binaries are not committed. Without it, the browser labels its JavaScript preview core and disables live inference. One live cloud response and review flow were verified on Windows/Brave; see [live validation and limits](LIVE_VALIDATION.md). On-device inference failed on that environment, while hybrid fallback and wider browser QA remain **unverified**. Firebase project configuration and App Check registration are not included.

## One-week scope

A personal drafting agent, not an autonomous coding agent. A user provides bounded tasks, sets priority and a device/cloud policy, starts a bounded queue, and reviews the resulting text artifacts. The model cannot run shell commands, browse, publish, send messages, or commit code. It only produces text. This is deliberately smaller than Symphony's coding-agent orchestration.

1. Day 1: build the board and Rust policy core; verify device eligibility and compile WASM.
2. Day 2: configure Firebase AI Logic and App Check with owner approval; verify ONLY_ON_DEVICE and ONLY_IN_CLOUD on actual hardware.
3. Day 3: run queue-to-review end to end; record actual inferenceSource and error behavior.
4. Day 4: add image artifact generation via Firebase AI Logic only, if approved project quota and supported model allow it; otherwise omit and describe the limitation. Image generation is optional, not a contest prerequisite established here.
5. Day 5: harden persistence, tab concurrency, accessibility, and input/output limits. Add deliberate import/archive flows and multi-tab coordination before daily use.
6. Day 6: validate on a second supported machine; prepare English demo and install guide; select open-source license with the owner.
7. Day 7: record a <=3 minute demo, review source/privacy/eligibility, and submit only after explicit owner approval.

## Why Rust, and what is shared

Rust is intended for responsive UI state, priority ordering, and orchestration invariants, not to speed up model inference. `core/src/lib.rs` has dependency-free state transitions, ranking and run gates, exported as WASM. JavaScript owns DOM rendering and the official Firebase Web SDK boundary. The Firebase chunk is dynamically imported only at queue start, avoiding SDK weight at first paint. There is no direct Gemini HTTP client or Chrome model inference outside Firebase AI Logic.

This first slice is **not a Rust-rendered UI**: DOM rendering remains JavaScript. Leptos/Yew/Dioxus are alternatives to benchmark after the working vertical slice, not automatic performance wins. The UI currently rerenders the board on state changes, bounded to 100 tasks. Measure before choosing a framework. Pure Rust logic can be reused on mobile; Web DOM rendering, App Check, model initialization and Firebase integration need platform-specific work. WASM does not itself produce iOS/Android apps.

## Safety and failure design

- Default task route is device-only, with no cloud fallback.
- Each hybrid/cloud task requires explicit permission to transmit its title, brief and revision feedback to Google via Firebase AI Logic. Never paste sensitive information.
- One in-flight queue across cooperating tabs of the same origin/browser storage scope (Web Locks required); maximum six calls per page session, <=1200 output tokens requested per cloud call (on-device output has no equivalent configured cap; displayed output is truncated to 20,000 characters). This is **not a monetary budget** or a cross-tab/global quota. Configure Firebase quotas before live use.
- Pause stops after the current call. It does not cancel or refund an in-flight request. No automatic retry after failures.
- Reloaded running tasks become blocked. No blind duplicate call.
- Every successful result needs human approval. Model output is plain text via textContent, never executed or rendered as HTML.
- localStorage is unencrypted. Web Locks serialize queue execution and board writes across cooperating tabs of the same origin; unsupported browsers fail closed. Reload older app versions before use. Locks do not coordinate other browsers/devices or cancel already-sent requests. See [multi-tab safety](MULTI_TAB_SAFETY.md).
- Initial development used no live calls. A later authorized synthetic cloud task succeeded; the separate device attempt failed. See the live validation report.

## Local setup

Node 22.12+ (Node 24 used here), npm, Rust stable and the wasm32-unknown-unknown target are needed for the full build.

```
npm ci
cargo test --manifest-path core/Cargo.toml
rustup target add wasm32-unknown-unknown
npm run build:core
cp .env.example .env.local
# Fill public Firebase app configuration and registered App Check site key.
npm run dev
npm test
npm run build
```

A Rust-less preview runs with `npm run dev`; Start queue stays disabled. Preview workflow creates a clearly labeled static fixture, never fake AI telemetry. Production builds must include the compiled `public/relay_core.wasm`; verify its presence in dist before release.

Firebase setup: follow the official guide to enable Firebase AI Logic, register the web app and App Check attestation, and verify authorized domains. Do not embed service-account keys, Gemini secrets, or debug tokens. This code initializes ReCaptchaV3Provider using a public site key. Optional development-only debugging is available; credential generation and registration require separate authorization. See [local App Check and current P4SA authorization](LOCAL_APP_CHECK.md). No supplied token string is accepted or included in source. Explicit loopback debug mode may omit the reCAPTCHA site key; production cannot. Initialize connection provides an inference-free bootstrap step. Chrome and on-device model preparation must meet the official current requirements. The model download can be large and lengthy.

## Sources and decisions checked November 12, 2026 UTC

- Rules: https://firebasehybridaihackathon.devpost.com/rules
- Firebase Web hybrid setup: https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
- Routing and actual source: https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options
- Symphony license: https://github.com/openai/symphony/blob/main/LICENSE (Apache-2.0). No Symphony implementation was copied. This app is independently written and only conceptually inspired by its issue-to-work workflow. No affiliation is implied.

The contest needs real Firebase AI Logic inference, supported on-device integration, App Check, an English UI, reviewable code and an open-source license. This preview does not yet satisfy those requirements. The repository's competition overview is retained, with its implementation-status paragraph updated to link here. License selection is pending; do not describe the new app as open source until licensed.

For a manual, read-only model-readiness check that does not initialize Firebase or start a download, see [device availability diagnostics](DEVICE_DIAGNOSTICS.md).


## Bounded single-task execution

Queued cards expose **Run this task only** for an explicit one-card run followed by a pause. Other queued tasks do not start, regardless of priority. It shares the normal queue's permission, Web Locks, stale-storage, session attempt limits and receipt path; it is not a separate inference route or proof of hybrid readiness. **Start queue** retains priority/FIFO behavior. See [one-task workflow and verification limits](SINGLE_TASK_EXECUTION.md).

## Original-draft execution receipts

New successful AI drafts record their requested route, SDK-reported actual source and whole-operation elapsed time. Review, sent-back history and approved handoff preserve this original-run evidence separately from human edits. Legacy results, fixtures and local checks do not acquire invented evidence. These local, unsigned observations do not prove runtime availability after reload or estimate charges. See [execution receipt behavior and validation](EXECUTION_RECEIPTS.md).

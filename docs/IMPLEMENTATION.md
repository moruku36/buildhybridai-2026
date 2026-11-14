# Relay: a workboard that moves work forward

## Architecture navigation and design status — November 13, 2026

[Canonical overall architecture](ARCHITECTURE.md) records the November 13 design baseline, including consent/content-review/manual-export boundaries, storage/failures and then-unimplemented request-plan/payload/preflight proposals. DLite was reviewed as HTML text, not independently checked PDF figures; the far-edge paper review is **abstract-only and incomplete**. That design document delivers no runtime evidence or performance claim. Implementation resumed November 14: the narrow exact-prompt slice below does not implement the broader versioned plan/context-selection design. The live records below remain historical; device/hybrid remain unvalidated. Follow **app usage guide → device/hybrid validation → submission preparation last**. See the [English demo walkthrough](DEMO_WALKTHROUGH.md) and collapsed in-app guide; neither is a completed live demo.

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

Queued cards expose **Run this task only**. For AI tasks it opens prompt inspection, then **Run inspected task only** starts one card followed by a pause. Local checklist/JSON tasks skip AI prompt inspection. Other queued tasks do not start, regardless of priority. It shares the normal queue's permission, Web Locks, stale-storage, session attempt limits and receipt path; it is not a separate inference route or proof of hybrid readiness. **Start queue** retains priority/FIFO behavior. See [one-task workflow and verification limits](SINGLE_TASK_EXECUTION.md).

## Exact prompt inspection — November 14, 2026

The one-task AI dialog shows the entire `buildDraftPrompt` string and `TextEncoder` UTF-8 byte length. This includes the existing drafting instruction and JSON-escaped current title, brief and optional revision feedback; no content is summarized or dropped and no history, route, approval or inspection metadata is inserted. This is **prompt-string bytes**, not tokens, SDK/HTTP envelope size or billed cost. Display uses plain text.

Opening inspection acquires the normal board lock for a fresh snapshot but imports no Firebase SDK and starts no model/download. The final **Run inspected task only** action reacquires the lock, checks current content, route, cloud permission, queued lifecycle and storage, then freezes the same string through device preparation. Immediately before the sole `generateContent` call, it rechecks lock/membership, running lifecycle, storage freshness, session cap, content, route and permission. A changed board stops without dispatch or overwriting that new board. A consumed dialog cannot dispatch twice. Failed/aborted attempts are not retried; preparation-started attempts conservatively consume the existing session counter.

**Start queue** still intentionally runs priority/FIFO tasks without per-task inspection dialogs, freezing each current prompt and applying the same dispatch-time gates. Local stays `ONLY_ON_DEVICE`; hybrid remains `PREFER_ON_DEVICE` with SDK fallback, not an app retry; cloud stays `ONLY_IN_CLOUD`. Existing task-scoped permission remains necessary for hybrid/cloud. This patch does **not** turn that stored permission into versioned one-attempt consent, a persistent revision/request-plan schema or an SDK cancellation guarantee. Editing revision feedback already clears cloud permission.

Inspection is ephemeral, never added to localStorage, execution receipt v1 or handoff v1. Legacy boards/results remain readable without invented inspection/receipt evidence. The DEV+loopback+explicit fixture gate, manual review/criteria/approval and six-attempt limit are unchanged.

## Patch verification and remaining setup — November 14, 2026

The parent reviewed the source diff and ran `node --test tests/draft-preflight-selected.test.js` **exactly once: 5/5 PASS**, duration **315.364542 ms**. These five selected offline cases use synthetic Firebase and WASM boundaries, not real attestation, model inference or WASM execution. Separately, `npm run build` ran **exactly once: SUCCESS**, Vite **7.3.8**, **36 modules**, **153 ms**. This documentation reconciliation did not rerun either command.

The historical Relay allowance remains **10 cases / 3 invocations**, recorded separately. The additional **5 cases / 1 invocation** are now **exhausted** across local/CI verification; this is not a reset, a full-suite pass or an allowance for reruns. The generic setup recipe above is not permission to execute its test steps for this patch.

A read-only SHA-256 check found both `public/relay_core.wasm` and `dist/relay_core.wasm` present and equal to the expected **`4e498b782bd71b3962f7c9fd748534e84df8b94ae0c65399627e5e498e78fe8e`**. This confirms the expected binary is packaged, not that a browser loaded or executed it.

Remaining acceptance dependencies:

- **Firebase configuration:** subsequent owner-authorized setup placed the existing public Web app configuration in ignored `.env.local`; it is not included in tracked source. The earlier absence observation predates that setup. Configuration presence is not connection or inference proof. The source requires public `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` and, in production, a registered `VITE_APPCHECK_SITE_KEY`. Do not overwrite existing local configuration with the generic setup recipe. No ignored configuration values were read for this static reconciliation.
- **App Check and current pause:** the existing Web app remains unregistered: its Console reCAPTCHA v3 registration controls were disabled. No provider substitution was made; Firebase AI Logic enforcement remains enabled. Local debug credential generation/registration, Initialize connection and Verify App Check remain unexecuted. The owner paused local-browser setup and acceptance while using Windows; this static patch does not resume those steps, downloads or inference. Historical Windows/Brave debug success does not establish this checkout's attestation. Production needs a supported registered provider compatible with the source, not the DEV+loopback debug path; see [local App Check](LOCAL_APP_CHECK.md).
- **Eligible browser/device:** model availability, readiness and any required preparation/download remain unverified here. The [historical live record](LIVE_VALIDATION.md) includes a Brave API-unavailable device failure, incomplete Windows Chrome availability checking and unresolved GPU-workload coordination; these are not new Chrome/device results. A working browser must load the WASM core and support Web Locks on a secure/loopback origin. [Availability inspection](DEVICE_DIAGNOSTICS.md) is not an inference pass and does not authorize a download.
- **Actual acceptance:** successful Firebase `ONLY_ON_DEVICE` inference, separately consented `PREFER_ON_DEVICE` behavior with honest SDK-reported source, the new two-click one-task flow, review/edit/criteria/approval, actual browser file-save, keyboard and narrow-screen behavior still need bounded validation. No browser/server, download, live inference, configuration/account change, deployment, publication or submission was performed in this reconciliation.

The patch is offline-verified and production-built, **not accepted as a usable device/hybrid app**. Keep the [demo storyboard](DEMO_WALKTHROUGH.md) labeled as a plan; submission preparation remains last.

## Approved handoff file

After approving the current AI draft, inspect **Show approved handoff packet** and optionally use **Download inspected packet** to request a local JSON snapshot. It preserves the displayed request, approved text and original-run evidence without a new inference or external send. Approval and board freshness are rechecked on the download click. Actual browser saving is not confirmed; already-saved files cannot be revoked. See [workflow and verification limits](HANDOFF_DOWNLOAD.md).

## Keyboard and screen-reader navigation

A first-focus **Skip to main content** link, named review/settings/intake dialogs, explicit input/control focus outlines and public-issue status announcements improve keyboard and assistive-technology navigation. These are source-level UI improvements, not a verified accessibility pass. Native dialog interaction, focus restoration after rerender and screen-reader behavior still need real-browser acceptance. See [changes and verification limits](KEYBOARD_ACCESSIBILITY.md).

## Narrow-screen review layout

Toolbar controls can wrap at every width, long task/status/review text can break within its container, and mobile dialogs use less padding. Local editing and approved handoff text areas start taller for inspection and manual copying. The five-state board retains its own horizontal scroll; no workflow state or action is hidden. These CSS-only changes do not alter execution, consent, approval or downloads. Real-browser layout and zoom acceptance remain unverified. See [responsive changes and verification limits](RESPONSIVE_REVIEW.md).

## Original-draft execution receipts

New successful AI drafts record their requested route, SDK-reported actual source and whole-operation elapsed time. Review, sent-back history and approved handoff preserve this original-run evidence separately from human edits. Legacy results, fixtures and local checks do not acquire invented evidence. These local, unsigned observations do not prove runtime availability after reload or estimate charges. See [execution receipt behavior and validation](EXECUTION_RECEIPTS.md).

# Relay — judge setup draft

**November 14, 2026 · Owner-review instructions, not an available judging deployment.** Source: https://github.com/moruku36/buildhybridai-2026 . A public repository is not proof of a working build, an open-source license or remote access. Local acceptance is currently paused; do not treat this guide as a request to resume it.

## Choose the access path

| Path | What the owner must provide before sending judges here |
| --- | --- |
| Hosted HTTPS app (simplest for judges) | [VERIFIED URL], reviewed release revision, production WASM, working authorized origin and enforced production App Check, free access through judging. No hosted URL is available from this task. |
| Downloadable test build / current source checkout | [VERSIONED ARTIFACT OR EXACT PUBLIC COMMIT], reproducible build, supported browser/hardware instructions and a working App Check/Firebase access arrangement. A private development credential is not distributable judge access. |

Neither the owner's 127.0.0.1 server nor their private debug registration is reachable/usable judge access. Do not send judges a loopback URL as a hosted demo. Current working-tree features, including exact-prompt inspection, must be included in the reviewed public release before instructions promise them in a downloaded checkout.

## Prerequisites for a source build

- Node.js 22.12+ (Node 24 was used in documented development), npm, Rust stable, and the wasm32-unknown-unknown target for the full app. A fresh build downloads dependencies/toolchain components; these are setup steps for the eventual evaluator, not operations performed here.
- A current supported desktop Chrome/device/model combination for Firebase AI Logic on-device inference. The official guide reviewed November 14 lists Chrome 139+ and Firebase SDK 12.5.0+ as minima; they do **not** guarantee this device has the required Gemini Nano model, capacity, language/API availability or readiness. This app pins Firebase 13.0.0. Brave historical device failure is not Chrome acceptance.
- Secure HTTPS or a supported loopback origin, Web Locks, browser storage and permission to prepare/download the on-device model if needed. Judge hardware availability is not guaranteed. No cross-device/browser lock exists.
- A reviewed Firebase Web app with Firebase AI Logic enabled, an available cloud model, and enforced App Check. The owner must arrange access without requiring judges to enable billing, accept new cloud terms, create project credentials or disable attestation. If a test-build path requires evaluator-owned Firebase setup, state that burden explicitly and resolve whether it constitutes practical free/unrestricted judging access before choosing that path.

## Minimal source-build recipe — for an approved evaluation environment only

Clone/download the reviewed public release, then from its repository root:

```sh
npm ci
rustup target add wasm32-unknown-unknown
npm run build:core
cp .env.example .env.local
```

If the target is already installed, omit the rustup step. Fill the public fields described below in the ignored local file, using only the approved evaluation project's configuration. Do not overwrite an existing local configuration blindly. Then choose one:

```sh
# Private local test-build evaluation; Vite binds loopback by default.
npm run dev
```

```sh
# Reviewed static artifact for separately arranged HTTPS hosting.
npm run build
```

The production output is dist/. The build:core script compiles the Rust core and copies its binary into public/relay_core.wasm; the production artifact must include relay_core.wasm. No committed WASM binary is promised by a fresh checkout. Without a valid core the app labels its JavaScript preview core and disables actual task execution. Deployment/hosting is a separate owner action; npm run build does not host the app. The package defines no preview script. No full test suite is needed in these judge instructions, and none is requested here.

## Public configuration — names from .env.example only

| Name | Purpose / handling |
| --- | --- |
| VITE_FIREBASE_API_KEY | Public Firebase Web app API key, not a secret Gemini API key. Use only the approved Web app configuration. |
| VITE_FIREBASE_PROJECT_ID | Public project identifier. |
| VITE_FIREBASE_APP_ID | Public Web app identifier. |
| VITE_APPCHECK_SITE_KEY | Public registered reCAPTCHA v3 site key; required for production with the correct authorized origin. |
| VITE_CLOUD_MODEL | An available cloud model confirmed in the evaluation project's Firebase AI Logic console; the template value is not proof of availability. |
| VITE_APPCHECK_DEBUG | Development-only boolean; keep false for the intended production judge path. Never put a debug credential in it. |

This guide contains no actual config/key/debug values and was prepared without reading .env.local. Vite public variables are bundled into browser assets: never insert a service-account private key, Gemini secret, debug token or unrelated credential. There is no need to invent additional environment variables for normal judging.

## App Check and device limitations

Keep AI Logic enforcement enabled. Production uses real reCAPTCHA attestation; its origin and registration must be valid. Initialize connection is separate from Verify App Check, which explicitly requests an attestation exchange; neither is a model-inference pass. Do not infer connectivity from a successful bundle.

The optional debug path is DEV + loopback + explicit boolean only. It may generate a persistent private debug credential and requires separately authorized registration. Production builds do not support it, and it must not be copied into judge instructions, screenshots or public assets. Rules may accept debug-based submissions, but that does not make the owner's private debug credential shareable or make current access work. No debug setup or exchange is requested now. See [local App Check](LOCAL_APP_CHECK.md).

Device/model preparation can be large and slow. Model availability checks, compiled WASM and graphics capability alone are not proof of on-device inference. Cloud fallback is allowed only for explicitly consented cloud-eligible tasks; do not silently switch a device-only task to cloud when setup fails. Local acceptance, downloads, attestation and inference remain unperformed in this documentation task.

## Short evaluator journey — after access is actually ready

1. Use only the fictional library input in [DEMO_SCRIPT.md](DEMO_SCRIPT.md). Prepare public issue → inspect editable goal/constraints/criteria → confirm exact queued content. Nothing executes at intake.
2. Leave the first task device-only. Run this task only → inspect the exact prompt → Run inspected task only. Read requested mode and actual SDK source. A failure or unknown stays visible; do not repeatedly requeue an uncertain result.
3. For cloud/hybrid evaluation, first review the exact covered public content and explicitly permit sending it to Google. Only then select and run the separately prepared task. Requested hybrid does not by itself prove fallback or on-device success.
4. Read result → optional local edit → assess criteria against the displayed version → Approve result. Reopen the result, inspect the approved packet, and request Download inspected packet. Browser save completion must be observed separately.

Relay produces text, not autonomous external execution: no shell, GitHub operation, agent contact, upload or publication follows approval. Local checklist/JSON tasks and PREVIEW are useful rehearsal paths but not model inference. PREVIEW cannot substitute for the full editable AI packet journey. localStorage is unencrypted; keep secrets/personal data out. Pause does not cancel an active request, and the six-attempt page-session gate is not a billing cap.

## Exact unresolved release/access items

- [OWNER: chosen open-source license file, repository license metadata, dependency/asset permissions]. No license is selected by this draft.
- [OWNER: public release revision including reviewed working-tree changes and compiled/packaged artifact instructions]. Local HEAD at preparation was 4d9d477; later working-tree changes were not committed here.
- [OWNER: verified hosted URL OR functioning downloadable test-build access, with enforced App Check and no private debug-token distribution].
- [OWNER: actual supported device result, observed hybrid/cloud source and end-to-end browser edit/criteria/approval/save acceptance]. Historical cloud observations and synthetic offline passes are not replacements.
- [OWNER: free/unrestricted judge access duration and support contact]. Today's rules/dates review has a judging-date discrepancy; conservatively preserve access at least through December 17, 2026, 07:00 JST and resolve organizer changes.
- [OWNER: public English YouTube demo, completed existing-work/IP disclosures, eligible team and final legal/submission review]. Nothing was deployed, recorded, registered or submitted by this guide.

See [submission draft](SUBMISSION_DRAFT.md) for paste-ready project text and unresolved owner fields. Final contest submission remains conditional on an actually working qualifying app.

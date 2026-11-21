# Release readiness — November 16, 2026

This records the source, test, license and hosting changes made on November 16, 2026, and what still depends on the owner. It is not a contest submission, a deployment record or evidence of device/hybrid inference.

## What changed

- **Open-source license:** the owner selected Apache-2.0. [`LICENSE`](../LICENSE) holds the unmodified license text and `package.json` declares `Apache-2.0`. Third-party dependencies keep their own licenses.
- **Continuous integration:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on pull requests and on pushes to `main`. It runs the Rust core unit tests, builds the Rust/WASM core, prints its SHA-256, runs the offline JavaScript suite, runs the production build and uploads `relay_core.wasm` as a workflow artifact.
- **Offline suite repaired:** 14 tests had been failing on `main`, in CI as well as locally, independent of the WASM core:
  - the jsdom harnesses did not provide `TextEncoder`, which exact-prompt inspection uses (browsers provide it);
  - `tests/single-task-execution.test.js` still clicked **Run this task only** once, although AI tasks now need the second **Run inspected task only** click.

  Only test code changed for these. The suite now has 89 tests and all pass. They use synthetic Firebase and WASM boundaries; they are not live inference.
- **Empty model responses:** when a request succeeds but returns no text, the error now includes the SDK's finish or block reason when one is reported (for example `MAX_TOKENS` or `SAFETY`). Only short enum-like values are shown; free-form text is never echoed. There is still no automatic retry.
- **Hosting configuration:** [`firebase.json`](../firebase.json) serves `dist/` through Firebase Hosting. No project identifier is committed.
- **Readability pass:** see [responsive review](RESPONSIVE_REVIEW.md#readability-pass--november-16-2026).

## Verification on November 16, 2026

- CI on the pull request: 5 Rust unit tests, the WASM build, 89 offline JavaScript tests and the production build passed. The CI-built core's SHA-256 was `4e498b782bd71b3962f7c9fd748534e84df8b94ae0c65399627e5e498e78fe8e`, equal to the value recorded on November 14.
- That CI artifact was placed in `public/` on a Windows machine and the development server was opened in a desktop browser at 1360 CSS pixels. The sidebar showed **Rust / WASM core**. A local checklist was added, run with **Run this task only**, read and approved; it moved to Done with source `LOCAL_DETERMINISTIC` and zero session attempts. For a hybrid task without cloud permission, **Run this task only** showed the exact prompt and byte count, and **Run inspected task only** stopped with "Current cloud permission is required"; no request to Google was recorded and the task stayed queued.
- No Firebase configuration was present. No App Check exchange, model preparation or inference was run, and no file download was attempted.

## Building the core without a local Rust toolchain

Some Windows machines block unsigned toolchain binaries through application-control policy. In that case, download the `relay-core-wasm` artifact from a CI run of the exact commit you are building, place it at `public/relay_core.wasm`, and compare its SHA-256 with the value printed by that run's "Record the core checksum" step. The file is ignored by git and must exist before `npm run build`; otherwise the app labels its preview core and disables task execution.

## Deploying to Firebase Hosting

These are owner actions. They need a Firebase login and change a public site.

1. Put the public Web app configuration in ignored `.env.local` (names in `.env.example`). A production build needs a registered public site key: a score-based reCAPTCHA Enterprise Web key in `VITE_APPCHECK_ENTERPRISE_SITE_KEY` (preferred when set), or an existing registered reCAPTCHA v3 key in `VITE_APPCHECK_SITE_KEY`. The development debug path is removed from builds.
2. For a new setup, create or select a score-based reCAPTCHA Enterprise Web key in the same Google Cloud/Firebase project, restricted to the production hostname(s) (for example `<project>.web.app`); do not add `localhost`. Register the Web app with that key in Firebase App Check. If using an existing v3 registration, keep the matching key and confirm its domain allowlist covers the intended host. Keep AI Logic enforcement on in either case.
3. Make sure `public/relay_core.wasm` exists (`npm run build:core`, or the CI artifact above).
4. Build the current app (or use verified current release bytes for a cache-only change), then create a fresh Hosting stage. For a transition, supply the verified archive for the live release and every earlier version whose HTML may still be in use. For a first deployment with no prior artifacts, omit the archive arguments.

   Before staging, obtain an independently approved full-bundle SHA-256 inventory for this release direction, based on the verified current output, the complete retention set and the expected stage metadata. It must cover every file under the stage root, including `firebase.json`, `current-assets.sha256`, and all of `dist/` (current HTML, WASM, current and retained assets). Use one lowercase SHA-256, two spaces and a stage-relative file path per line. Keep this inventory outside the stage; do not generate it from the stage being checked or substitute its asset-only manifest.

   ```sh
   npm ci && npm run build &&
     npm run stage:hosting -- ../hosting-stage /path/to/prior/dist /path/to/prior/current-assets.sha256 &&
     npm run verify:hosting -- ../hosting-stage /path/to/approved-forward.bundle.sha256
   ```

   Each archive argument pair points to an archived `dist/` and its trusted, previously saved `current-assets.sha256`. Repeat the pair for multiple releases. The manifest uses lowercase SHA-256, two spaces, and a path such as `assets/index-AbCd1234.js` per line. For releases predating this command, derive the asset-only list from verified release receipts, not unverified local files. The staging command rejects digest mismatches and different bytes for any shared hashed URL. It only copies prior hashed assets, not prior HTML or WASM. Check that the current stable WASM URL remains compatible with retained JavaScript, or version the WASM URL before making an incompatible change.

   Use the generated stage, not the source checkout, as the release artifact. Verify `/` and `/index.html` both return the same current HTML with `Cache-Control: no-cache`; confirm current and retained module URLs return JavaScript and the expected bytes, `/relay_core.wasm` still revalidates, and a nonexistent asset returns a non-immutable 404. There are no HTML rewrites; if adding any, match cache headers on each incoming route, not only on the rewrite destination, and keep missing assets out of HTML fallback routes.

   Archive the verified stage and its current-only manifest. Do not prune assets needed by legacy cached HTML until the old freshness window (observed as one hour before this change) has elapsed from cutover. Keep assets longer if there are still open pages that can lazy-load them.

   **Rollback:** Stage the verified rollback target as current, passing the running release **and every other still-needed historical release** as archive pairs. The running release's current-only manifest does not list its retained historical assets. For example, a rollback targeting #23 after a cache-only #23 cutover must still include #22 as a prior while #22 clients may need its assets. Use a separately approved complete rollback inventory and the same verification and deploy sequence below, substituting the rollback stage and inventory paths. Do not directly re-activate an old version that restores the broken cache rules.

5. Staging success is not release readiness. After the local wire checks above, log in if needed, then run this from the source checkout. The deploy command runs from the exact stage and only if the inventory and byte verification succeeds:

   ```sh
   npm run verify:hosting -- ../hosting-stage /path/to/approved-forward.bundle.sha256 &&
     (cd ../hosting-stage && npx firebase-tools deploy --only hosting --project YOUR_PROJECT_ID)
   ```

6. Open the hosted URL in a supported desktop Chrome, confirm the sidebar shows **Rust / WASM core**, then run **Initialize connection** and **Verify App Check** before any inference.

## Still open

- App Check production registration. An earlier note recorded the console's classic reCAPTCHA v3 registration controls as disabled, while Enterprise registration was available; the Web app is not yet registered. Without a registered provider the hosted app cannot pass enforced App Check.
- ~~A successful live draft on the current revision.~~ Done later on November 16 with a development debug credential: one cloud draft was generated, reviewed and approved ([record](LIVE_VALIDATION.md#current-revision-cloud-draft--review--approval-brave-november-16-2026)). The earlier empty response was not reproduced and its cause is still unknown.
- ~~On-device and hybrid inference on a supported Chrome/device.~~ Done on November 16: `on_device` responses for a device-only and a hybrid task in Chrome 157 ([record](LIVE_VALIDATION.md#on-device-and-device-preferred-hybrid-inference-chrome-november-16-2026)), and cloud fallback plus device-only fail-closed behaviour in Brave ([record](LIVE_VALIDATION.md#device-unavailable-behaviour-and-hybrid-cloud-fallback-brave-november-16-2026)). One machine, development App Check only.
- A hosted judge URL, the public demo video, existing-work and eligibility disclosures, and the submission itself.

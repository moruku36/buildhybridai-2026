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

## Building the core without a local Rust toolchain

Some Windows machines block unsigned toolchain binaries through application-control policy. In that case, download the `relay-core-wasm` artifact from a CI run of the exact commit you are building, place it at `public/relay_core.wasm`, and compare its SHA-256 with the value printed by that run's "Record the core checksum" step. The file is ignored by git and must exist before `npm run build`; otherwise the app labels its preview core and disables task execution.

## Deploying to Firebase Hosting

These are owner actions. They need a Firebase login and change a public site.

1. Put the public Web app configuration in ignored `.env.local` (names in `.env.example`). A production build needs a registered reCAPTCHA v3 site key in `VITE_APPCHECK_SITE_KEY`; the development debug path is removed from builds.
2. In the Firebase console, register the Web app with App Check (reCAPTCHA v3) and add the Hosting domain (`<project>.web.app`) to the reCAPTCHA key's allowed domains. Keep AI Logic enforcement on.
3. Make sure `public/relay_core.wasm` exists (`npm run build:core`, or the CI artifact above).
4. Build and deploy:

   ```sh
   npm ci
   npm run build
   npx firebase-tools login
   npx firebase-tools deploy --only hosting --project <project-id>
   ```

5. Open the hosted URL in a supported desktop Chrome, confirm the sidebar shows **Rust / WASM core**, then run **Initialize connection** and **Verify App Check** before any inference.

## Still open

- App Check production registration. An earlier note recorded the console's reCAPTCHA v3 controls as disabled; without a registered provider the hosted app cannot pass enforced App Check.
- A successful live draft on the current revision. The last recorded cloud attempt returned no text; the reported reason is now surfaced so the cause can be identified on the next attempt.
- On-device and hybrid inference on a supported Chrome/device.
- A hosted judge URL, the public demo video, existing-work and eligibility disclosures, and the submission itself.

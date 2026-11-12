# Original-draft execution receipts

Each new successful AI draft records four local fields: receipt version, requested inference route, actual source reported by the Firebase SDK, and whole-operation elapsed milliseconds. Timing starts immediately before model preparation and ends after the response is returned. It includes preparation, download/wait time if any, generation and client overhead; it is not a model-only benchmark, token count, billing receipt or cost estimate. Non-finite/invalid durations are unknown rather than zero.

## Read the evidence accurately

- Requested route is captured when the run starts. It is not reconstructed from a later setting.
- Actual source recognizes only `on_device` and `in_cloud`. Missing or unrecognized SDK labels remain `UNKNOWN`, do not verify either runtime, and are normalized before storage.
- A device-preferred request returning `in_cloud` is labeled as cloud-served. No fallback cause is invented; the receipt does not record one.
- A source that contradicts an exclusive requested route produces a visible warning. The receipt does not change Firebase routing or permit another call.
- Failed/interrupted calls do not acquire successful receipts. Existing attempt accounting and explicit retry rules remain unchanged.
- Preview fixtures, synthetic review examples and deterministic local checks have no AI receipt. Old results retain unknown route/timing; no values are backfilled.

The review dialog shows the receipt for the **original generated text**. Human editing and reapproval preserve it without pretending another inference occurred. Sent-back history retains a bounded copy alongside the original excerpt. Approved handoff JSON includes `provenance.executionReceipt` (null for older results). Receipts are never appended to model prompts.

Receipts remain in unencrypted local board storage, existing exports and manually displayed handoff packets. They are user-editable local observations, not cryptographic proof or independently verified attestations. Loading a stored receipt does not mark cloud/device inference verified for the current page session. No new endpoint, telemetry service, automatic transfer, credential, dependency or permission is added.

## Validation, November 12, 2026

Developed against main `348171344087214b120ca82d691d08beca7d1271`.

- Full offline suite: **71/71 passed**, zero failures. The new unit and DOM tests use synthetic providers and cover route/source distinctions, precise elapsed storage, missing/unrecognized source, malformed receipts, legacy results, preview/failure exclusion, human edits, approval, handoff, history and reload without fresh verification.
- Final affected tests after copy clarification: **25/25 passed**, zero failures.
- Vite 7.3.8 production bundle: passed. No new package installation; existing dependencies matched the checked-in lockfile.
- No live Firebase request, GPU/model work, device download, browser interaction QA, Rust change/build, configuration or production deployment was performed for this change. The isolated checkout does not contain the ignored WASM binary, so this bundle is not a complete live-inference release.

The previous single cloud-response observation remains the only documented successful live inference. On-device inference and hybrid fallback remain unverified. These receipts make future authorized validation easier to inspect; they do not complete that validation or the competition submission requirements.

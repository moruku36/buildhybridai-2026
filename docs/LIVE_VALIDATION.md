# First live validation: Windows / Brave

Run reported November 12, 2026. Successful response timestamp: 2026-11-12T00:27:42.647Z. Model: gemini-3.5-flash-lite.

## Observed

- App Check initialization, private debug-credential registration and a successful explicit Verify App Check step.
- One ONLY_ON_DEVICE attempt failed with AI/api-not-enabled: Local LanguageModel API not available in this environment. No cloud fallback occurred.
- One explicitly consented cloud task using fictional paper-plane workshop content produced a real three-step response labeled in_cloud. The result was reviewed and approved; Done count became 1.
- The remaining hybrid task had no cloud consent, so the queue stopped rather than calling it.
- At approximately 840 px viewport width, horizontal board scrolling, the form and review dialog were usable in Brave.
- The UI showed two session attempts: the failed device attempt and successful cloud attempt. This is not a billing/request-receipt count.

No credential, API key, project identifier or private task content is included in this report.

## Follow-up fix

The top banner still said runtime unverified after the successful response. It now records observed in_cloud/on_device sources independently for the current page session. Configuration, App Check success, preview output and persisted results cannot establish live runtime verification. Successful cloud inference leaves device inference unverified. Reload intentionally resets the session evidence; historical results remain on task cards.

Session requests was renamed Session attempts. Explicit label/control associations were added for Priority and Inference route.

Offline regression suite: 18 tests passed, zero failures; Vite 7.3.8 production build passed. The regressions simulate failure, cloud success, consent stop, approval and reload without real Firebase calls. No additional live inference was used to test this patch.

## Limits

This is one cloud-response verification, not a device-inference, hybrid-fallback, Chrome compatibility, production-attestation or full-browser-matrix pass. The observed browser run preceded the banner/label fix; the fix has automated DOM coverage, not another live inference run. App Check used development-only debug registration. License selection, production deployment and contest submission remain pending.

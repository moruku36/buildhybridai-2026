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

## Chrome follow-up status

A separately installed official Windows Chrome 157.0.8103.39 binary was reported with a valid publisher signature, and was subsequently launched successfully. Browser interaction tooling could not complete the availability check, so on-device inference remains unverified and deferred. The inspected Windows 11 machine has about 32 GiB RAM, an RTX 3070 with 8 GiB VRAM and about 791 GiB free disk space. These static checks meet the published OS/GPU/storage thresholds in the [current Chrome Prompt API guide](https://developer.chrome.com/docs/ai/prompt-api), which lists web availability from Chrome 148. Launch and static checks do not establish model readiness, network eligibility or successful Firebase on-device inference.

Model download and execution are deferred while possible contention with another scheduled GPU workload is unresolved. No Chrome flags or browser settings were changed. The recorded on-device failure above occurred in Brave; it is not a Chrome failure result.

After the banner/label fix, the existing Windows board was reloaded without another inference call: the approved in_cloud result and blocked device task remained, the session-attempt counter reset to zero, and both select controls were found by their accessible combobox role and exact name.

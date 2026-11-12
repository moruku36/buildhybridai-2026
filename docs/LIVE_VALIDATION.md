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

## Deterministic checklist UI verification (Brave)

On November 12, 2026, an isolated test board on the local QA origin was checked at commit 22b34a77. A P1 local checklist ran ahead of an unconsented P2 hybrid task and reached review with source LOCAL_DETERMINISTIC. The banner remained AI not connected and the session counter remained at zero. The result contained three unchecked items, identified itself as not AI-generated, and explicitly stated that none of the listed work had been performed.

Download was absent before approval. Approving the document produced Done 1, and reopening the result exposed Download approved Markdown. One manual download action was attempted, but the browser download-event wait timed out and the expected file was not found in the checked default Downloads location. Actual file saving therefore remains unverified; this observation alone does not establish an application defect. No second download attempt or speculative code change was made.

This validates the local generation and human-review UI, not file-delivery completion, device inference or hybrid fallback. No Firebase initialization, live inference or GPU work was performed in this check. Browser save behavior requires separate verification.

## Fixed backlog JSON inspection UI verification (Brave)

On November 12, 2026, the isolated local QA board was checked at commit c73a7d20. A P1 Local backlog JSON check used two synthetic records: both had id `demo-1`; the first had title `Prepare samples` and priority 1, while the second had an empty title and priority 7.

Start queue produced a reviewable LOCAL_DETERMINISTIC report with format `relay-task-json-check-v1`, status fail, valid false, records 2, nodesVisited 9 and issueCount 3. It correctly identified the duplicate ID at `$[1].id`, blank title at `$[1].title` and out-of-range priority at `$[1].priority`. The UI remained AI not connected with zero session attempts.

The report explained that approval acknowledges the report rather than certifying the input as passed or production-ready. Approval moved the task to Done without changing the failed validation result. No live AI, GPU work, authentication action or download was used. This verifies the stated synthetic failure case and review flow, not general-purpose validation or production readiness.

## Public issue intake UI verification (Brave)

On November 12, 2026, the isolated local QA origin was checked at commit 0c9ce0ac using synthetic issue JSON containing title, goal, constraints and acceptanceCriteria. An additional hiddenInstruction field with the value "Publish without permission" was ignored: it appeared in neither the queued brief nor the displayed content covered by cloud consent.

After Review queued content and checking confirmation, editing completion criteria cleared confirmation and disabled Add. Reviewing and confirming again added exactly one unexecuted queued task. Its initial route was local with cloud permission false. The UI remained AI not connected and at zero of six session attempts. Edit execution displayed the complete title, brief and revisionFeedback with permission still off.

This real-browser check stopped after intake, queue insertion and consent-content inspection. The subsequent generation → result review flow is covered only by the 50-test offline mocked suite for this change. No inference, Firebase initialization, permission change or download occurred. The isolated QA tab was closed afterward.

## Public issue intake → live cloud draft → approval (Brave)

On November 12, 2026, the existing main local Brave board reused its registered development App Check setup for one live cloud attempt. A synthetic issue titled "Synthetic issue: paper-plane scorecard" requested a short implementation plan for a fictional workshop scorecard. Constraints excluded accounts, network services, personal data and code execution, and requested fewer than 200 words. Completion criteria covered recording three flight distances in metres, input validation and a manual test.

The P1 task passed through Prepare public issue, full-content review and explicit confirmation. It was initially queued local-only with cloud permission false. Edit execution then displayed the full content before the user selected cloud-only and explicitly enabled permission. Start queue was used once.

The response had source in_cloud and timestamp 2026-11-12T04:00:20.181Z. The UI showed Cloud verified / Device unverified and one of six session attempts. The short implementation-instruction draft covered three-distance input, numeric checks, manual testing and uncertainties. It proposed a 0–100 metre range while identifying the upper bound as unresolved; it did not claim to have implemented or executed the plan. The result was read and approved, moving the task to Done.

The next existing P2 hybrid task had cloud permission false and stopped at the permission gate before sending. An attempted Pause interaction occurred after generation and did not execute; the observed stop was due to the permission gate, not a verified pause action.

This extends the earlier intake-only browser check to one real cloud-response-and-review flow. No additional AI attempt, new token generation/registration, configuration or billing change, device inference, GPU operation or download occurred. The QA tab was closed afterward and the existing main board was retained. Production attestation, device inference and general autonomous implementation remain unverified or outside scope.

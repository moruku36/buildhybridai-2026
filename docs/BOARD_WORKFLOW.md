# Repairing a paused queue

Queued and blocked task cards now have **Edit execution**, available only while the agent is paused. This dialog lets the user change the inference route and explicitly grant or revoke permission to send that task's title, brief and revision feedback to Google through Firebase AI Logic. Selecting on-device-only clears cloud permission.

Saving settings makes no request, does not automatically start the queue, and leaves the task's content, priority and state intact. Cancel discards edits. A blocked task still needs **Return to queue**, followed by **Start queue**. A cloud/hybrid task without consent remains stopped until corrected; permissions are never assumed.

**Send back** returns a reviewed draft to the queue and removes that rejected result. If another request is already running, it finishes normally, but the queue pauses before another task starts. The returned task is not regenerated until the user explicitly presses Start queue. Pausing does not cancel or refund an in-flight request.

## Verification

24 offline tests passed, zero failures; Vite 7.3.8 production build passed. New DOM regressions cover canceled edits, route/permission changes, blocked-state preservation, consent revocation, no request on save/requeue, and review rejection during an in-flight synthetic request followed by explicit restart.

No real browser operation, model download, live AI request, credential action, GPU use or other running-process change was performed for this patch. Visual browser QA remains separate.

## Instructions for the next draft

The review dialog now accepts optional **Next-draft instructions**, up to 2,000 characters. Send back saves them locally for the next explicit run. Closing the dialog discards unsaved changes. Only the latest instructions are retained.

These instructions guide a fresh draft from the task's title and brief. The previous result is not resent or preserved as a revision history, so references such as "fix paragraph two" are insufficient unless the required content is restated. This is not a precise edit-in-place or version-history feature.

Adding, changing or removing the instructions clears cloud permission. For cloud/hybrid execution, use Edit execution to explicitly authorize sending the title, brief and instructions, then press Start queue. Local-only execution still has no cloud fallback. The instructions are serialized as untrusted JSON task data, not system instructions. Review approval remains required for the resulting draft.

Validation: 27 offline tests passed and production build passed. New regressions cover persistence, cancellation, consent reset, explicit restart, bounded feedback validation and omission of prior output from prompts. No live inference was used.

## Multiple tabs

All board writes and the complete queue run now require the same Web Lock. A busy or unsupported lock blocks changes/execution; stale tabs refresh without overwriting newer data and require explicit retry. Interrupted-running recovery only occurs while holding the lock. See [scope and limitations](MULTI_TAB_SAFETY.md).

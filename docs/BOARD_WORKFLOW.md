# Repairing a paused queue

Queued and blocked task cards now have **Edit execution**, available only while the agent is paused. This dialog lets the user change the inference route and explicitly grant or revoke permission to send that task's title and brief to Google through Firebase AI Logic. Selecting on-device-only clears cloud permission.

Saving settings makes no request, does not automatically start the queue, and leaves the task's content, priority and state intact. Cancel discards edits. A blocked task still needs **Return to queue**, followed by **Start queue**. A cloud/hybrid task without consent remains stopped until corrected; permissions are never assumed.

**Send back** returns a reviewed draft to the queue and removes that rejected result. If another request is already running, it finishes normally, but the queue pauses before another task starts. The returned task is not regenerated until the user explicitly presses Start queue. Pausing does not cancel or refund an in-flight request.

## Verification

24 offline tests passed, zero failures; Vite 7.3.8 production build passed. New DOM regressions cover canceled edits, route/permission changes, blocked-state preservation, consent revocation, no request on save/requeue, and review rejection during an in-flight synthetic request followed by explicit restart.

No real browser operation, model download, live AI request, credential action, GPU use or other running-process change was performed for this patch. Visual browser QA remains separate.

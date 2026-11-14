# Relay: one issue, one inspected draft, one human-approved handoff

English storyboard, **2:50 maximum**, prepared November 14, 2026. This is a recording plan, not a runtime result or a submitted demo. Open the collapsed **How to move one public issue through Relay** guide between the stats and Workboard for the same controls.

## Fictional public sample

Paste this object into **Prepare public issue**. It is invented, contains no credentials or personal data, fetches no URL and grants no execution authority.

```json
{
  "title": "Explain the library demo's empty state",
  "goal": "Draft implementation instructions for a fictional public library catalog when no books match a search.",
  "constraints": ["Plain English", "Text-only proposal; do not change code"],
  "acceptanceCriteria": [
    "Suggest a clear empty-state message",
    "Include one keyboard-accessibility check",
    "State what still needs human verification"
  ]
}
```

## Choose the recording lane before starting

**Offline PREVIEW rehearsal — no inference proof:** use **Prepare public issue** → **Propose editable task**, edit the fields, then **Review queued content**, check **I reviewed this exact title, priority and brief; add one unexecuted task.**, and **Add reviewed issue to queue**. With this task next in priority/FIFO order, **Preview workflow** creates explicitly labeled PREVIEW text for it. Preview chooses the next queued task, not an arbitrary selected card. Use **Read result**, assess the criteria and **Approve result** to rehearse review on that labeled result. PREVIEW does **not** offer local human editing or approved handoff; do not promise the full handoff lane in a PREVIEW recording. A synthetic handoff rehearsal instead needs the existing separately enabled DEV+loopback+explicit-opt-in TEST_FIXTURE; that is still not inference proof. Do not initialize Firebase, verify App Check, run an AI task, or portray PREVIEW as device/cloud/hybrid evidence. Missing/outdated WASM disables actual task execution.

**Actual device/hybrid recording — not yet validated:** first complete the [normal setup](IMPLEMENTATION.md#local-setup), compiled WASM, eligible browser/device/model preparation and authorized Firebase/App Check configuration. Model preparation/download and live calls need their own approved bounded allowance. Use only this fictional/public content. Prewarm only within that approved setup; a large model download is not hidden inside the three-minute demo. Record actual source and failures honestly; do not replay an unknown request to get a nicer recording.

**Setup checkpoint (November 14):** ignored local public Firebase configuration now exists, but App Check v3 registration is blocked by disabled Console controls. No debug credential was generated/registered and neither Initialize connection nor Verify App Check was performed. AI Logic enforcement is preserved. Local-browser setup and acceptance are owner-paused while using Windows; this storyboard does not authorize resuming setup, downloads or inference.

## Actual-run storyboard (2:50)

| Time | Controls / narration |
| --- | --- |
| 0:00–0:15 | “Relay turns a public issue into instructions I review, not autonomous code execution.” Open the collapsed guide; show the paused board. |
| 0:15–0:45 | **Prepare public issue** → paste sample → **Propose editable task**. Inspect/edit goal, constraints, completion criteria. **Review queued content** → exact-content checkbox → **Add reviewed issue to queue**. Explain: local proposal, no AI request; new task is on-device only with cloud permission off. |
| 0:45–1:15 | On the new card, **Run this task only**. Read requested route, exact prompt and UTF-8 byte count. “Bytes are not tokens or a cost estimate; all title, brief and feedback remain.” **Run inspected task only** sends this one frozen prompt after fresh permission/storage checks; other queued cards stay paused. For a successful device run, the receipt must actually say **On device (SDK-reported)**. |
| 1:15–1:45 | Separately prepared second copy of the same fictional task: **Edit execution** → **Prefer device · cloud fallback** → inspect covered content → explicitly check cloud permission → **Save execution settings**. **Run this task only** → inspect → **Run inspected task only**. Requested hybrid is not proof of fallback. Show its actual SDK source; if cloud served it, the fallback reason is unknown. No app retry. |
| 1:45–2:20 | **Read result**. Show requested route, actual source and elapsed time (not billing). Optionally **Edit result locally** → **Save local edit**. Assess each displayed completion criterion; **Approve result**. Approval means content reviewed, not code executed or criteria automatically verified. **Send back** instead queues a fresh draft; changed feedback clears cloud permission and requires reinspection. |
| 2:20–2:50 | Reopen **Read result** → **Show approved handoff packet** → inspect full snapshot → **Download inspected packet**. “Manual local JSON save, no agent contact, upload or code execution.” Show the actual saved file only if browser saving succeeded. End with the limitations below. |

If inference takes too long, shorten narration or transparently label a previously recorded real run and its original timestamp/receipt; never relabel PREVIEW or TEST_FIXTURE as a live result. Do not claim the planned timing has been achieved.

## Before claiming a working hybrid app or publishing the demo

- Capture a real successful **ONLY_ON_DEVICE** run through Firebase AI Logic on eligible hardware.
- Capture separately consented **PREFER_ON_DEVICE** behavior, requested vs SDK-reported actual source, and any failure/unknown. The app delegates fallback to the SDK; it does not retry.
- Complete the actual one-task → review/edit/criteria → approval → inspected handoff flow, including browser file-save, keyboard and narrow-screen checks.
- Verify production WASM packaging and production App Check; do not ship dev attestation.
- Keep original receipt-v1 / handoff-v1 evidence separate from human edits. Old results may have no receipt; do not manufacture one.
- Choose a visible OSS license, finish the English description and public <=3-minute YouTube video, then review submission requirements. This file is neither submission nor acceptance.

**Current evidence:** historical cloud success exists, device/hybrid acceptance and browser save remain unverified. PREVIEW rehearsal, the DEV+loopback+explicit-opt-in TEST_FIXTURE and offline synthetic tests are not replacements. **Start queue** is intentionally broader than the inspected one-task path: it can run multiple priority/FIFO tasks and does not show a per-task inspection dialog.

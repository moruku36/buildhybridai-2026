# Repairing a paused queue

Queued and blocked task cards now have **Edit execution**, available only while the agent is paused. This dialog lets the user change the inference route and explicitly grant or revoke permission to send that task's title, brief and revision feedback to Google through Firebase AI Logic. Selecting on-device-only clears cloud permission.

Saving settings makes no request, does not automatically start the queue, and leaves the task's content, priority and state intact. Cancel discards edits. A blocked task still needs **Return to queue**, followed by **Start queue**. A cloud/hybrid task without consent remains stopped until corrected; permissions are never assumed.

**Send back** returns a reviewed draft to the queue, saves a bounded local copy in Previous drafts, and removes it from the active result. If another request is already running, it finishes normally, but the queue pauses before another task starts. The returned task is not regenerated until the user explicitly presses Start queue. Pausing does not cancel or refund an in-flight request.

## Verification

24 offline tests passed, zero failures; Vite 7.3.8 production build passed. New DOM regressions cover canceled edits, route/permission changes, blocked-state preservation, consent revocation, no request on save/requeue, and review rejection during an in-flight synthetic request followed by explicit restart.

No real browser operation, model download, live AI request, credential action, GPU use or other running-process change was performed for this patch. Visual browser QA remains separate.

## Instructions for the next draft

The review dialog now accepts optional **Next-draft instructions**, up to 2,000 characters. Send back saves them locally for the next explicit run. Closing the dialog discards unsaved changes. Only the latest instructions are retained.

These instructions guide a fresh draft from the task's title and brief. The previous result is not resent; bounded sent-back copies can now be viewed in local Previous drafts, so references such as "fix paragraph two" are insufficient unless the required content is restated. This is not precise editing of the old text or a complete version-history system.

Adding, changing or removing the instructions clears cloud permission. For cloud/hybrid execution, use Edit execution to explicitly authorize sending the title, brief and instructions, then press Start queue. Local-only execution still has no cloud fallback. The instructions are serialized as untrusted JSON task data, not system instructions. Review approval remains required for the resulting draft.

Validation: 27 offline tests passed and production build passed. New regressions cover persistence, cancellation, consent reset, explicit restart, bounded feedback validation and omission of prior output from prompts. No live inference was used.

## Multiple tabs

All board writes and the complete queue run now require the same Web Lock. A busy or unsupported lock blocks changes/execution; stale tabs refresh without overwriting newer data and require explicit retry. Interrupted-running recovery only occurs while holding the lock. See [scope and limitations](MULTI_TAB_SAFETY.md).

## Previous drafts: bounded local history

Sending a result back now preserves a read-only local copy with its source (PREVIEW, LOCAL_DETERMINISTIC, in_cloud, on_device or UNKNOWN), generated/saved timestamps, sent-back review state and the next-draft instructions recorded at that moment. Use Previous drafts on the task card. The current result still follows its normal review/done state; archived results cannot be approved or executed.

History never enters model prompts and is never uploaded by this feature. It remains part of local board storage and the existing explicit Export. It is unencrypted like the rest of the board.

Retention is bounded: at most three archived drafts per task, 8,000 characters of output per archive, and 80,000 output-plus-feedback characters across the board's history. The oldest archives are removed when limits are exceeded. Shortened output and removed older drafts are disclosed in the UI. These are character limits, not a guarantee that the browser's total storage quota cannot fill; live task content and other origin data also use storage. Existing save-error warnings still apply. Export important drafts before they exceed retention.

Validation: 36 offline tests passed and production build passed. New regressions cover retention/pruning, source/time/review metadata, malformed history rejection, reload, safe text rendering, read-only controls and exclusion from model prompts. No live AI, browser setting, GPU, license or sharing-permission changes were made.

## Local checklist artifact (no AI)

Choose **Task type → Local checklist** when adding a new task. The brief supplies one checklist item per non-empty line (maximum 100 items). Route and cloud permission controls are disabled for this type. Existing AI tasks keep their prior behavior; task type conversion is not supported.

Start queue processes it in the same priority/FIFO order through running → review. The formatter deterministically produces Markdown with all items unchecked, explicitly labeled **LOCAL_DETERMINISTIC**. It organizes supplied text; it does not perform the listed work, interpret arbitrary commands, call a model, initialize Firebase, or send data. Reviewer notes are copied into the next document as notes, not interpreted or applied as edits.

Approve result marks the document reviewed, not the underlying checklist work completed. Only then does Read result offer **Download approved Markdown**. Download requires a separate click, uses the fixed safe filename `relay-checklist.md`, and follows the browser's save settings (a save dialog is not guaranteed). No file is automatically written on queue completion or approval. User text is escaped for Markdown/HTML and displayed as plain text in the review UI. The existing Export continues to export the whole local board.

Local formatting does not consume the AI session-attempt counter or require cloud consent, and can run after the six-attempt AI limit. It does not bypass a higher-priority AI task blocked by consent/configuration, or falsely establish device/cloud inference verification. The existing Rust/WASM core remains required for Start queue; no ABI or toolchain change was made.

The queue runs only while this tab is open. Between tasks it yields so Pause can stop later items. Web Locks, stale-board protection, interrupted-work blocking, human review and bounded sent-back history also apply to local results. Closing the tab does not create a background worker. This is a deterministic document builder alongside an AI draft queue, not a coding agent or external task executor.

Validation: the 40-test offline suite and production build passed, followed by one additional targeted regression proving local execution after six mocked AI attempts. Tests cover deterministic output, literal escaped input, unchecked items, local source/history, no Firebase module load for local-only execution, zero AI attempts, approval-gated manual download and its fixed filename. No live AI, model download, GPU work, browser configuration, authentication, permission, dependency or license changes were made. Actual browser download behavior remains to be checked separately.

## Fixed local backlog JSON checks

Select **Local backlog JSON check** and paste JSON into Brief. Start queue actually parses and scans that text locally. The small fixed specification is an array of at most 50 objects, each with a nonblank string `id` (up to 80 characters), a nonblank string `title` (up to 160 characters), and integer `priority` from 1 through 3. Duplicate IDs are detected by exact string equality. Empty arrays are allowed. There is no board import, automatic repair, task overwrite or repository action.

Resource limits: 4,000 UTF-16 code units of input, nesting depth 8 checked before parsing, 500 visited JSON values, and at most 20 displayed issues. The total issue count is retained even when display is capped. A resource cutoff returns `status: limited, valid: null`, never pass. Syntax or fixed-rule failures return `status: fail, valid: false`; successful checks return `status: pass, valid: true` only for this stated scope.

Issues identify JSON positions such as `$[1].priority` (zero-based array index). Syntax errors additionally include line/column/offset only when the runtime exposes a reliable parse offset. Semantic source-line numbers are not guessed. The report contains the format version, input size, record/node counts, scope, limits, issue count and bounded reasons. It is retained as `result.data` and displayed as plain text along with its LOCAL_DETERMINISTIC source and timestamp. Existing explicit board Export includes it. Sent-back history retains the bounded textual report, not a second structured snapshot.

Finding errors still completes the inspection and produces a report for review. Approval acknowledges reading that report; it does not certify the input as valid or production-ready. The original pasted input is preserved. To correct it, add a new task: next-draft instructions do not alter these fixed checks, and requeueing unchanged input repeats the same inspection. No download button was added for JSON reports; physical download behavior remains unverified.

This is not a general JSON Schema engine. Duplicate JSON keys (native JSON.parse keeps the last), extra-key meaning, business correctness, external resources and production compatibility are not checked. No eval, user code/schema execution, URL fetch, arbitrary filesystem access, Firebase initialization, AI call, model download or GPU work occurs. The existing queue, tab-lifetime limitation, Web Locks, consent isolation and bounded history remain in force.

Validation: 45 offline tests passed and production build passed. Coverage includes required fields/types/ranges, duplicate IDs, array records, syntax/resource limits, capped issue display, string escaping, literal HTML, review of failed reports, structured persistence/reload, zero AI attempts and no Firebase module load for the JSON task. No physical download was retried, and no dependency, permission, authentication or license was changed.

## Public issue → reviewed implementation-instruction task

**Prepare public issue** connects intake to the existing queue rather than creating another inference endpoint:

1. Paste public, non-sensitive issue text or JSON (maximum 4,000 UTF-16 code units). No URL is fetched.
2. **Propose editable task** performs only a deterministic field mapping. For text, the first line is title and remaining lines are goal. JSON must be one object: title/body/goal are strings; constraints/acceptanceCriteria are strings or arrays of up to 20 strings of at most 400 characters each. Only these named fields are read; others are ignored. JSON nesting is capped at 8. This is not AI understanding, intent extraction or automatic authorization.
3. Edit title, goal, constraints and completion criteria. Missing details are not invented. Title, goal and completion criteria must be nonblank. Limits are 160/1,600/800/800 characters respectively, plus the existing 4,000-character limit for the serialized queued brief.
4. **Review queued content** shows the exact title, priority and brief. Tick the explicit confirmation, then **Add reviewed issue to queue**. Source edits require a new proposal; edited fields invalidate review/confirmation. The added task is unexecuted, on-device-only, cloud permission off.
5. If cloud drafting is needed, use the existing **Edit execution**. That dialog now displays the exact title, brief and revision feedback covered by its explicit cloud permission. Saving permission does not send anything. Press **Start queue** separately. Brave's device model may be unavailable; intake does not establish device success or enable silent fallback.
6. Review the resulting implementation-instruction draft with the existing review/done/history flow. No code, shell command, repository mutation or external issue action is performed by the app.

The queued brief requests proposed implementation steps, checks and uncertainties. Issue fields remain untrusted task data, not system instructions or authority to act; the existing prompt boundary still applies. Raw pasted source and ignored JSON fields are not copied into the queued task. Only the reviewed title/brief, and later explicitly consented revision feedback, can enter the existing model prompt.

Queue insertion is under the same Web Lock and stale-snapshot check as all other mutations. Double-click/reusing the same completed dialog does not add another task. Failed persistence rolls back that dialog's in-memory addition so a deliberate retry does not duplicate it. A stale tab cannot overwrite a newer board. Closing/reloading discards unsaved intake; successfully saved tasks remain in this origin's unencrypted localStorage. Reopening a new intake and intentionally pasting the same issue again is not globally deduplicated. There is no remote synchronization, background worker or exactly-once cloud guarantee.

The Rust scheduling gate and session attempt counter are application controls, not a security isolation boundary or billing cap. This remains an instruction-drafting workflow, not an autonomous implementation agent.

Validation: 50 offline tests and the production build passed. New tests cover accepted/invalid JSON shapes and bounds, ignored fields, required human completion, prompt data boundaries, edit-invalidated approval, single insertion, save-failure rollback/retry, stale tabs, and the complete intake → explicit cloud consent → mocked draft → human approval flow. No real AI, GPU, download retry, new dependency, authentication, permission, production deployment or license change was made.

## Local human edits and approved handoff text

AI draft results in review or done now offer **Edit result locally**. This applies to AI drafts only, not preview fixtures, local checklists or machine-generated JSON validation reports. The original generated text, inference source and generation timestamp remain unchanged and viewable. A separate latest human-edited text (maximum 20,000 characters) and edit timestamp are stored locally. The UI labels the human version separately from its original inference source; editing never establishes new inference evidence.

Saving changed text uses the explicit edit event in both Rust and JavaScript, returning review or done to review. Prior approval is removed; a separate Approve result is required again. Saving identical text leaves the prior state unchanged. Cancel discards unsaved changes. Only the latest local edit is retained, not a full edit-version history.

After approval, **Show approved handoff text** exposes a read-only, selectable snapshot for manual copying. It does not invoke the clipboard API, transmit text, download a file or execute the instructions. A later edit requires approval again but cannot revoke a snapshot already copied elsewhere. Human edits do not enter the AI prompt automatically. Sending back preserves separate bounded original and edited excerpts in local history before clearing the current result; each excerpt is capped at 8,000 characters, and both count against the existing shared 80,000-character budget.

Edit saves and approval use the existing Web Lock and stale-snapshot check. Failed persistence rolls back in-memory changes, including approval. A conflicting tab refresh disables the editor's save action while retaining the user's unsaved text for manual copying; cancel and reopen the current result before applying it again. Unsaved edits are still lost if the page closes or reloads. Storage is this origin's unencrypted localStorage, not remote durable storage.

**WASM compatibility:** this change adds edit event 6, with review → review and done → review. Existing exports are unchanged. The loader checks both transitions and rejects an old core, falling back to preview and disabling Start queue. Run `npm run build:core` to rebuild before using the new version; an existing Windows WASM binary must also be updated through the normal development workflow. The scheduling core is not a security isolation or billing boundary.

Validation: 56 JavaScript tests, 5 Rust tests, 35/35 actual WASM-versus-JavaScript transition comparisons, WASM rebuild and production UI build passed. Coverage includes cancellation, unchanged original/source, reapproval, bounded history, prompt exclusion, unsupported report types, save/approval rollback, stale-editor text rescue and outdated-core rejection. No live AI, GPU, browser configuration, clipboard permission, download retry, new dependency or license change occurred. Actual browser UI QA remains separate. This change is proposed on a work branch/draft PR; merging requires owner approval.

### Optional isolated development review fixture

For browser QA without AI or copying a real board, run the development server on a separate loopback origin with `VITE_REVIEW_FIXTURE=true`. No Firebase environment values are needed. **Add synthetic review example (no AI)** is shown only with all three conditions: development mode, the exact opt-in value true, and a loopback hostname. Clicking it adds one fixed, visibly synthetic TEST_FIXTURE directly to review under the existing Web Lock. Repeated clicks do not duplicate it. It is never labeled in_cloud/on_device and does not affect inference evidence or attempt counters.

The fixture supports local editing, approval and manual handoff only in that enabled development session. It cannot be sent back to the queue or run through an inference route. Its task type is validated as review/done, local-only, cloud permission false, source TEST_FIXTURE. If saved data is later opened with the opt-in disabled or in production, the fixture and any edits remain visibly labeled, retained and read-only; no model run or approval/edit controls are exposed.

Production builds remove the add button, fixture factory and synthetic example text even if the opt-in environment variable is present. Minimal marker/validation handling remains so persisted test data is not misrepresented or discarded. Do not use the main board's origin for QA. Start/initialize/verify controls are not needed for this fixture.

Validation: 58 offline tests passed and a production build with VITE_REVIEW_FIXTURE=true passed. Bundle inspection confirmed absence of the fixture button, factory identifier and example text. DOM coverage includes explicit add, deduplication, local edit/reapproval, zero inference evidence/attempts, non-loopback denial and read-only production restoration. No real AI or browser download was used.

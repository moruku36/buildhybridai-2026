# Relay — hackathon entry draft

**Owner-review draft · November 14, 2026 · NOT SUBMITTED.** The copy below describes the reviewed source slice; public review delivery is not a deployed release. It is not a claim of deployment or contest qualification. Resolve the final-form fields and verification gates before publication.

## Project name and tagline

**Relay**

**Turn a small task into an inspected draft—and a handoff you approve.**

Platform: Web / Chrome (intended supported platform; actual device qualification pending).

Source: https://github.com/moruku36/buildhybridai-2026

## Inspiration / problem

Getting an AI answer is easy; knowing what was sent, what produced the answer, and what you actually approved is harder. Small public issues can become oversized conversations, and a polished draft can be mistaken for completed work. Relay makes the handoff explicit: one bounded task, an inspectable request, a draft returned for human review, and a manually exported approved result.

## What it does

Relay is a browser workboard for small drafting tasks. Paste a fictional or public issue, review an editable proposal with its goal, constraints and completion criteria, then add it to the queue without starting a request. Choose a route per task and run just that task while the rest of the board stays paused.

The current one-task AI flow displays the exact prompt and its UTF-8 byte count before execution. Results return to review, where the person can inspect the original run evidence, edit the text locally, assess each criterion, and approve or send it back. An approved AI result can be inspected as a context-and-result packet and manually downloaded. Editing removes the previous approval. Approval means the text was reviewed—not that code was implemented, checks passed automatically, or another agent received it.

Deterministic local checklist and JSON-check tasks provide useful non-AI work alongside drafts. Clearly labeled PREVIEW and development-only TEST_FIXTURE paths are rehearsal aids, not model results.

## How we built it / Firebase AI Logic

The app uses vanilla JavaScript and Vite for its English interface, browser localStorage for the board, and a small Rust/WASM core for deterministic state transitions, ordering and run gates. JavaScript connects to the official Firebase Web SDK (pinned Firebase 13.0.0). Firebase AI Logic uses GoogleAIBackend and getGenerativeModel; App Check is integrated separately. Production attestation uses ReCaptchaV3Provider. There is no direct Gemini HTTP client and no model inference implemented in Rust/WASM.

Tasks select ONLY_ON_DEVICE, PREFER_ON_DEVICE, or ONLY_IN_CLOUD through Firebase AI Logic. Device-only does not gain a cloud retry. Hybrid delegates device preference and cloud fallback to the SDK rather than making a second application-managed generation call. Cloud-eligible tasks require explicit permission for the covered title, brief and revision feedback. The requested mode and SDK-reported actual inference source are different facts: a hybrid request alone does not prove device execution or fallback. An unavailable actual source stays unknown; a cloud-served hybrid result does not disclose why fallback occurred.

The one-task inspection slice freezes the inspected prompt through model preparation and rechecks current content, route, permission and storage before dispatch. Its byte count describes the prompt string, not tokens, wire traffic, energy or cost. This is not the broader proposed versioned, single-attempt consent architecture.

## Challenges and lessons

- **Keeping inspection meaningful:** asynchronous device preparation can outlive the board state the user inspected. The November 14 slice reuses the frozen string and fails closed on changed state instead of rebuilding an approximation after preparation.
- **Keeping provenance honest:** original receipt-v1 evidence survives local edits and handoff; older results and fixtures do not acquire invented inference receipts. Requested routing must not be relabeled as observed execution.
- **Keeping review separate from action:** criteria are human assessments of draft content. Manual packet export is not external delivery, shell execution, GitHub operation or proof that the described work happened.
- **Respecting browser boundaries:** cooperating same-origin tabs use Web Locks and freshness checks. Interrupted or failed work blocks rather than automatically replaying. These are bounded client safeguards, not cross-device coordination, cancellation or a monetary quota.

## Current state — retain until new evidence replaces it

The board and the above flows are present in source. Historical documentation records Windows/Brave cloud use and a failed device attempt; that is not fresh acceptance of this checkout. Parent review on November 14 recorded five selected synthetic offline cases passing in one invocation and one successful production build. Neither establishes real App Check, device inference, hybrid behavior or a browser file-save pass. Current local acceptance is paused. Real supported device/hybrid operation, end-to-end browser acceptance, judge access, licensing and the public video remain open. Relay is not yet claimed as a usable contest-qualified hybrid app or a submitted entry.

## Existing work and submission-period disclosure

The contest opening is November 11, 2026 at 13:30 Pacific / November 12 at 06:30 JST. Calendar date alone does not establish that work was done after opening.

Read-only local Git history supports these later changes: human criteria assessment (f83e8ab, November 12 17:10 JST), original inference receipts (2224134, 18:30), one-task execution (8a54395, 19:53), inspected handoff download (33f079f, 20:03), keyboard navigation (0b3caef, 20:22), narrow-screen layout (6d0a78e, 20:33), and architecture documentation (c4e2f91, November 13 08:51). The November 14 exact-prompt/usage-guide slice was uncommitted when this draft was prepared; its eventual review PR is not a merged or deployed release. Commit metadata supports this summary, not independent proof of authorship or eligibility.

**Final disclosure text to complete:** “Pre-existing material: [OWNER: identify all code, design, assets and external components created before the opening, with provenance]. During the submission period we added [OWNER: confirm the supported changes above and their significance]. Third-party components and permissions: [OWNER: dependency/asset/license notices and any incorporated work].” No exact project inception date, absence of pre-existing work, or copied-code status is inferred here.

## Verification-dependent final claims — NOT approved copy yet

Replace these only with actual receipts; otherwise retain the limitations above.

| Candidate final sentence | Required evidence |
| --- | --- |
| “Relay generated this draft on device through Firebase AI Logic.” | Successful supported device run, original timestamp and SDK-reported on_device source. |
| “Relay demonstrates hybrid routing with explicit cloud permission.” | Actual PREFER_ON_DEVICE run and observed source; separately authorized cloud evidence. Do not claim a fallback reason the SDK did not report. |
| “Judges can use Relay at [URL/build].” | Working free judge access, supported device/setup and enforced App Check arrangement through judging. |
| “The approved packet was saved locally.” | Actual inspected current-version download and observed browser save. |
| “Relay is open source under [license].” | Owner-selected license file and visible repository license metadata, plus dependency/asset review. |

## Final-form fields — owner completion required

- Entrant / authorized representative: [OWNER NAME AND AUTHORITY]
- Team name and all eligible members / Devpost profiles: [TEAM; DO NOT ASSUME SOLO]
- Eligibility confirmation: [AGE, RESIDENCE, EMPLOYMENT/AFFILIATIONS, CONFLICTS AND EMPLOYER CONSENT IF APPLICABLE]
- IP ownership / permissions and existing-work disclosure: [CONFIRMED DETAILS]
- Open-source license: [OWNER CHOICE; NOT SELECTED HERE]
- Public YouTube video, English or English-subtitled, at most three minutes: [PUBLIC URL; NOT RECORDED HERE]
- Working judge website or test-build access: [URL/ARTIFACT + VALIDATED SETUP; NOT OWNER LOOPBACK]
- Judging access contact and availability: [OWNER CONTACT / ACCESS PLAN]
- Rules/legal acceptance and final contest submission: [OWNER REVIEW + ACTUAL CONFIRMATION; NONE HERE]

Submission deadline from today's rules review: December 1, 2026, 07:00 JST (November 30, 14:00 PST). November 15 is the owner's delivery target, not the organizer deadline. See [judge setup](JUDGE_SETUP.md) and [recording script](DEMO_SCRIPT.md).

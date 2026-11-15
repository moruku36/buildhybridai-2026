# Relay — submission copy draft

**Updated November 15, 2026 · Not a final contest submission.**

## Project name and tagline

**Relay**

**Turn a small task into an inspected draft—and a handoff you approve.**

Platform: Web / Chrome; supported-device qualification remains pending.

Source: https://github.com/moruku36/buildhybridai-2026

## Inspiration

Getting an AI answer is easy; understanding what was sent and what you actually approved is harder. Relay makes the handoff explicit: one bounded task, an inspectable request, a draft returned for human review, and a manually exported approved result.

## What it does

Relay is a browser workboard for small drafting tasks. Review a public or fictional issue's goal, constraints and completion criteria before adding it to the queue. Queueing prepares work; it does not send an AI request.

For one-task AI execution, Relay displays the exact prompt and its UTF-8 byte count before a separate run action. It preserves that inspected string through asynchronous model preparation and checks that the task and its execution permission are still current before dispatch. Prompt bytes are not tokens, cost or a performance measurement.

A successfully generated draft returns for human review. The person can edit it, assess completion criteria and approve the current version. Editing clears previous approval and criterion review. The approved context-and-result packet can then be inspected and manually downloaded. Approval does not mean the suggested work was implemented or tested; downloading is not delivery to another agent or permission to execute instructions. Actual browser file saving requires separate observation.

Deterministic local tasks and clearly labeled preview or development-fixture paths support rehearsal. They are not AI results and must not be presented as successful device, cloud or hybrid inference.

## How we built it

Relay uses vanilla JavaScript, Vite, a Rust/WASM state core, browser localStorage, and Firebase AI Logic with App Check integration.

Tasks request device-only, device-preferred with permitted cloud fallback, or cloud-only execution. The SDK manages hybrid routing; a requested route is not proof of the actual inference source. Device-only does not silently become a cloud retry. Real supported on-device and hybrid behavior remain unverified.

The design separates task preparation, request inspection, result review and manual handoff. Cloud permission means covered task content can leave the device. Local-first design is not a guarantee that all processing stays local, and browser storage is not encrypted by Relay. We have not established measured productivity, privacy, latency, cost or energy improvements.

## Current state and limitations

The described flows are present in the reviewed source, not proof of a deployed or contest-qualified hybrid application.

A November 14, 2026 local development trial completed an explicit App Check verification. A subsequent cloud generation request returned HTTP 200 but no readable text. Relay stopped with **“The model returned no text.”** This was a failed generation, not a successful draft, and no automatic retry occurred. The underlying cause, returned model version, finish reason, usage and cost are unknown.

That historical trial ran a different checkout from the current reviewed source. It does not establish current-revision acceptance or production attestation. Genuine device/hybrid evidence, end-to-end browser review and file-save acceptance, free working judge access, a public demonstration video, license selection and final eligibility/IP disclosures remain incomplete.

If a recording shows an empty generation, keep the failure explicit. Any subsequent illustrative review sequence must be labeled **STORYBOARD — NOT A MODEL RESULT**, never spliced in as the failed task's successful output. A storyboard is not a functioning-app demonstration.

## Existing documentation

- [One-task prompt inspection](SINGLE_TASK_EXECUTION.md)
- [Review and manual packet download](HANDOFF_DOWNLOAD.md)
- [Recording plan and fictional example](DEMO_SCRIPT.md)
- [Judge setup and unresolved access requirements](JUDGE_SETUP.md)
- [Implemented and proposed architecture](ARCHITECTURE.md)

The recording and setup guides are plans with dated limitations, not evidence of completed recording, deployment or judge access.

## Fields to complete before final submission

- Entrant, authorized representative, team members and eligibility confirmation.
- Pre-existing code, design and assets; submission-period changes and their significance; IP permissions and third-party notices. Commit dates alone do not prove eligibility or authorship.
- Owner-selected license and visible license file. Public source visibility alone is not an open-source license.
- Reviewed release revision and functioning free judge website or test-build access, including supported-device and App Check arrangements.
- Public English or English-subtitled demonstration video, with duration checked against the final rules.
- Final organizer rules, legal and existing-work disclosures, access availability and actual submission confirmation.

No final contest submission, qualification, working judge deployment or public video is established by this document.

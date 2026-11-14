# #BuildHybridAI 2026

**English** | [日本語](README.ja.md)

An independent, source-linked overview of the **#BuildHybridAI 2026** hackathon and a starting workspace for a future project. This repository is not an official Google or Devpost publication, a completed application, or a contest submission.

Last reviewed: **November 11, 2026**. Official rules take precedence over this summary and its Japanese translation.

## What is this competition?

#BuildHybridAI 2026 is an online hackathon sponsored by **Google** and administered by **Devpost**. Participants build applications that combine on-device and cloud AI through **Firebase AI Logic**, demonstrating why hybrid inference is useful in a real product. [1][2]

The challenge is to create a working application, explain its design and impact, and submit source code and a short demonstration. It is not simply a model benchmark or an idea-only contest.

## Important dates

| Milestone | Official time | Japan time |
| --- | --- | --- |
| Submission deadline | November 30, 2026, 2:00 p.m. PST (UTC−8) | **December 1, 2026, 7:00 a.m. JST (UTC+9)** |

The deadline agrees across the official rules and dates page. **Other judging and announcement timings differ between those pages**; confirm the latest organizer guidance rather than treating one conflicting date as settled. [2][3]

## Required technical approach

- Route **all AI inference through Firebase AI Logic**. Use real runtime model calls, not mocked responses.
- Integrate at least one supported on-device platform: **Web/Chrome or Android with Gemini Nano 4**, or **iOS with Apple Foundation Models**.
- Show the application's hybrid on-device/cloud behavior and explain the architectural choices.
- Integrate **Firebase App Check**. The rules allow a debug token for this requirement.
- Provide an **English-language UI** and enough setup/run instructions for evaluation.
- Do not put secrets, credentials, or personally identifiable information in public source code or the demonstration. [2]

Specific supported devices, browser/OS versions, SDK availability, and model access should be checked in the current official technical resources before choosing a platform. [4]

## Submission checklist

The official rules require, among other things: [2]

- [ ] A functioning application meeting the technical requirements.
- [ ] A **public GitHub or GitLab repository**, with a visible open-source license. Apache is recommended; other open-source licenses are permitted.
- [ ] Source code with actual runtime AI calls and clear setup/run instructions.
- [ ] An **English project description** explaining the solution, technology, and hybrid AI design.
- [ ] A **public YouTube demonstration of no more than three minutes**.
- [ ] An English UI and reviewable application/demo access as required by the rules.
- [ ] For an existing project: substantial updates made during the contest period, disclosure of prior work, and a summary of what changed.
- [ ] If entering as a team: all members registered on Devpost and a designated representative.
- [ ] A final review of eligibility, intellectual-property rights, third-party permissions, and the official submission requirements.

**Current repository status:** the Relay workboard implementation is now included. See [setup and architecture](docs/IMPLEMENTATION.md), [initial validation](docs/VERIFICATION.md), and [Rust/WASM follow-up validation](docs/MAC_VALIDATION.md). A first Windows/Brave cloud inference and review flow passed; [live validation and limits](docs/LIVE_VALIDATION.md) records the failed on-device attempt. Device inference, hybrid fallback and broader browser QA remain unverified. No demo, contest submission, or open-source license has been added. License selection requires the owner's decision; public visibility alone does not make a project open source.

**Relay architecture (November 13, 2026):** [Canonical overall design](docs/ARCHITECTURE.md) records the design baseline and separates implemented behavior from paper-inspired proposals as of that date. DLite was reviewed as HTML text; the far-edge paper review is **abstract-only, not full text**. No paper-derived performance gains are established.

**Source update (November 14, 2026):** implementation has resumed. The collapsed in-app guide and [English <=3-minute demo storyboard](docs/DEMO_WALKTHROUGH.md) cover public issue → one inspected draft → review → manual handoff. AI **Run this task only** now opens the exact prompt and UTF-8 byte count before **Run inspected task only**; the frozen string is reused at dispatch with current content/route/permission/freshness checks. No summarization, extra prompt metadata, persistent request-plan or new consent schema is added. [Implementation and limits](docs/IMPLEMENTATION.md#exact-prompt-inspection--november-14-2026) distinguish this narrow source patch from the broader design proposals. Bounded offline verification passed **5/5 selected cases in exactly one invocation**, and one production build succeeded (Vite 7.3.8, 36 modules, 153 ms). The public and built WASM files match the expected SHA-256; see the [exact verification record and remaining setup](docs/IMPLEMENTATION.md#patch-verification-and-remaining-setup--november-14-2026). These are offline/build results, not device/hybrid success, browser file-save or usable-app acceptance, which remain unverified; no submission has been made. Delivery order remains **guide → device/hybrid validation → submission preparation last**.

**Local setup checkpoint (November 14, 2026):** ignored public Firebase configuration now exists. App Check v3 registration is blocked by disabled Console controls; no local debug credential, connection initialization or attestation exchange was completed. AI Logic enforcement remains enabled. Local-browser setup and acceptance are owner-paused while using Windows; configuration presence does not establish device/hybrid success. See [remaining setup](docs/IMPLEMENTATION.md#patch-verification-and-remaining-setup--november-14-2026).

## Judging

Projects are assessed with equal weight across four criteria: [1][2]

1. **Implementation**: technical execution and use of the required technologies.
2. **Design**: user experience and usability.
3. **Impact**: usefulness and potential real-world value.
4. **Originality**: creativity and novelty.

These descriptions are a brief paraphrase; consult the official criteria for their full wording.

## Prizes

The advertised cash prize pool is **USD 30,000**: [1][2]

| Award | Amount |
| --- | ---: |
| First place | USD 10,000 |
| Second place | USD 7,000 |
| Third place | USD 4,000 |
| Best iOS application | USD 3,000 |
| Best Android application | USD 3,000 |
| Best Web application | USD 3,000 |

Prize conditions, taxes, eligibility, and any limits on award combinations are governed by the official rules.

## Eligibility and terms to review

Participation is subject to the official age-of-majority requirements, excluded jurisdictions, employment/affiliation restrictions, and other eligibility conditions. This overview does **not** establish anyone's eligibility. [2]

The rules also contain consequential legal terms. In particular:

- Entrants retain ownership, while granting specified organizers/related parties a perpetual, irrevocable, worldwide, royalty-free, non-exclusive license for judging and promotional purposes (§12).
- Publicity provisions address the use of names and likenesses (§14).
- California law and binding arbitration provisions apply as described in §§20–21.

Read the complete rules before entering. Creating this repository does not submit an entry or accept contest terms.

## Suggested next steps

1. Choose a useful problem where on-device inference and cloud inference each have a clear role.
2. Verify device/SDK support and choose the initial platform.
3. Build a small end-to-end prototype using Firebase AI Logic and App Check.
4. Document the architecture, runtime behavior, setup, and limitations.
5. Add a suitable open-source license, record the English demo, and review the official submission checklist.

These are planning suggestions, not additional official contest requirements.

## Official sources

1. [Official hackathon overview](https://firebasehybridaihackathon.devpost.com/)
2. [Official rules](https://firebasehybridaihackathon.devpost.com/rules)
3. [Official dates](https://firebasehybridaihackathon.devpost.com/details/dates)
4. [Firebase AI Logic documentation](https://firebase.google.com/docs/ai-logic)

Only public competition information is summarized here. Registration emails, personal registration details, and private information are not included.

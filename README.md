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

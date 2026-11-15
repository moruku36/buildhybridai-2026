# Narrow-screen workboard and review layout

## Source changes

- Toolbar controls wrap at all viewport widths instead of remaining on one long flex row. Status text and controls can share space or occupy separate rows; the existing mobile stacked toolbar remains.
- Long unbroken task titles, source labels, metadata, status messages and dialog text can wrap. Form labels and route/priority grid columns can shrink within the available width. Buttons are bounded by their container and consent checkboxes retain their width.
- At mobile widths (650 CSS pixels and below), dialogs use smaller internal padding. Dialog actions have vertical spacing when they wrap.
- Local result editing and approved handoff text/packet areas start taller than the generic brief/feedback fields, remain selectable and can still be resized vertically. Dialog content remains vertically scrollable.

The five-column workboard deliberately retains its own horizontal scroll on narrow screens; this change does not stack or hide workflow states. Native select menus and dialogs remain browser-controlled. There are no new controls, shortcuts, settings, storage fields or dependencies. Queue order/execution, consent, review/approval gates, prompt contents, local persistence and manual downloads are unchanged.

## Verification scope

This is a source-reviewed CSS-only behavior change. Build and whitespace results are recorded in the PR. No new automated or manual test cases were executed. The same development trial remains at 10 case executions across 3 invocations; it has not been reset. Earlier tests are historical, not verification of this layout.

Actual mobile rendering, browser zoom, native select sizing, touch interaction and screen-reader behavior remain unverified. A successful preview build is not a browser layout check, an accessibility-conformance result or a release build with the Rust/WASM core. On-device inference and hybrid fallback remain separately unverified.

## Suggested future browser acceptance (not executed)

1. At narrow phone, tablet and desktop widths, inspect every toolbar action and a long unbroken synthetic task title. Confirm page content stays within the viewport while the board alone can scroll horizontally to all five states.
2. Open public-issue intake, execution settings and result review. Inspect long synthetic text, route/priority controls, consent checkboxes and wrapped action buttons, including at 200% browser zoom. Check that focused controls remain visible while scrolling.
3. Inspect local result editing and approved handoff text/packet views. Check readable/selectable textarea sizing, vertical resizing and access to all actions in a short viewport. Do not invoke inference or download merely to inspect layout.

These are proposed acceptance steps, not executed checks or permission to exceed the trial limit. See also [keyboard-navigation changes and limits](KEYBOARD_ACCESSIBILITY.md).

## Readability pass — November 16, 2026

`src/style.css` was rewritten in readable (non-minified) form and `src/main.js` gained small markup hooks. Labels, behaviour, storage and prompts are unchanged, and the DOM order of interactive elements is preserved.

- Body text is 14px with a 12px minimum (previously 9–11px in places); muted text colours were darkened.
- Toolbar actions are grouped as Queue, Board data and Connection setup. A coloured dot shows paused versus working.
- The notice is a bordered callout: blue for the idle hint, amber for attention messages.
- Stats are tiles. Board columns carry a state colour on the top edge, and card actions sit in one wrapping row.
- At 650 CSS pixels and below, the sidebar collapses to a top bar, toolbar buttons fill the width, and the board scrolls one column at a time. The five workflow states are still all present.

Unlike the earlier CSS-only change above, this pass was viewed in a browser: at 1360 and 375 CSS pixels, covering the board, **Preview workflow** and the result-review dialog, with no page-level horizontal overflow and no console errors. That check used the JavaScript preview core. Screens during live execution, browser zoom, real mobile devices, touch and screen readers remain unverified.

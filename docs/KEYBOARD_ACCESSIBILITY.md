# Keyboard and screen-reader navigation

## Implemented changes

- **Skip to main content** is the first link in the document. It becomes visible when focused and targets the main landmark, which can receive focus without joining the normal Tab order. It sits outside the rerendered board so updates do not remove the link itself.
- Execution settings, previous drafts, the local result editor, approved text/packet views, result review and public-issue intake have accessible dialog names matching their visible headings. Task-specific titles are assigned through DOM attributes, never interpreted as HTML.
- Inputs, textareas, selects and expandable summaries share explicit keyboard focus outlines with buttons and links. Sidebar links retain a light outline on the dark background.
- Public-issue proposal and review messages use a polite status region. This does not move focus or authorize any action.

These changes add semantics and styling only. Queue execution, cloud permission, approval, persistence and packet-download behavior are unchanged. Dialogs continue to use the browser's native modal behavior; there is no custom focus trap or new shortcut.

## Verification scope

This low-impact change is source-reviewed. Build and whitespace results are recorded in the PR. No new automated or manual test cases were executed: the current development trial has already consumed 10 case executions across 3 invocations. Earlier test results are historical, not verification of this change.

Real keyboard navigation, focus restoration after board rerenders, screen-reader announcements, focus visibility at browser zoom and the complete modal interaction flow remain unverified. This is not an accessibility-conformance claim. Native dialog support is required; browser-specific behavior still needs checking. Device inference and hybrid fallback remain unverified and are unrelated to these changes.

## Suggested future browser acceptance (not executed)

1. On load, press Tab to reveal the skip link, then Enter to reach the main landmark. Continue with Tab and Shift+Tab through the toolbar, board and form; check focused controls and summaries at 200% zoom.
2. Open execution settings, history, result editing/review, approved text/packet and issue intake with a screen reader. Check each dialog's announced name, native modal keyboard behavior and focus destination after closing. Task-card rerenders can replace the original opener, so restoration must not be assumed.
3. In issue intake, propose and review public synthetic content. Check that status changes are announced without moving focus or executing/adding a task before explicit approval.

These are proposed acceptance checks only, not a test execution or an authorization to exceed the current trial limit. No inference, model download, Firebase setup or real credentials are needed for the relevant preview/review UI; any browser launch must use an available authorized environment.

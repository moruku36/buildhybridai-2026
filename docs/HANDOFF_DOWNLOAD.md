# Download an inspected approved handoff packet

Use the existing review flow to approve an AI draft (and reapprove any local edit), then:

1. Open **Read result** → **Show approved handoff packet**.
2. Inspect the full JSON. It includes the stored request, original draft, current approved text, content assessment and original execution receipt when one exists.
3. Click **Download inspected packet** to request a local browser download named `relay-approved-handoff.json`. Opening the view alone does not download anything. Manual copying and the body-only handoff remain available.

The downloaded bytes are the same JSON snapshot shown in the read-only field, including its assembly timestamp. The filename is fixed, not derived from task text. The app uses a temporary Blob URL and schedules its revocation after the click, including if triggering the download throws. Actual saving depends on browser settings; Relay cannot confirm that a file reached disk.

The click rechecks the board under its existing Web Lock and stale-storage guard, verifies that the original task and approval have not changed, and revalidates the approved version. A changed board requires reopening the latest packet; a closed or outdated view cannot initiate a fresh download. This does not revoke a file already saved.

Downloading does not modify the board, consume a session attempt, run a model, initialize Firebase/App Check, request clipboard permissions, upload data, contact another agent or execute instructions. Transferring the file elsewhere is a separate manual action. Inspect all included content before transferring it. Local files, like the existing board, are not encrypted by Relay.

The existing `relay-approved-handoff-v1` schema is unchanged. Approval is content review only, not authority for downstream execution. The file is an unsigned, unsynchronized local snapshot, not independent proof of inference or acceptance. Preview results and deterministic local reports do not gain AI handoff controls. Development-only synthetic fixtures keep their existing restrictions and labels.

## Verification scope

The focused offline DOM test passed once (one case / one invocation). It follows one edited-draft lifecycle: reapproval, inspection, byte-identical JSON download, no board write or model call, Blob URL cleanup, then refusal after another tab invalidates approval. The Vite production build also passed. SDK calls and actual browser saving are not exercised, and this checkout has no compiled WASM core, so the build is preview-only. Real-browser QA and device/hybrid inference acceptance remain separate, unverified steps.

No WASM interface, dependency, credential, host policy, deployment or license changes are required.

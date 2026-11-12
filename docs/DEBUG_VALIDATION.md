# Local App Check development-support checks

Verified on November 12, 2026 with Node 26.13.0 and Vite 7.3.8.

- npm test: 16 passed, zero failures. Includes existing policy/DOM tests plus debug gates and offline Firebase initialization stubs.
- Bootstrap stubs verify no model call or token exchange during initialization, no production initialization without a real site key, idempotent initialization, a fail-closed development provider and one explicit attestation exchange returning only a boolean.
- VITE_APPCHECK_DEBUG=true NODE_ENV=development npm run build -- --mode development: passed. Build forces DEV=false even under these overrides.
- Inspected generated JavaScript: Relay's debug-enabling helper, development provider callback, flag name and former placeholder site key are absent. Upstream SDK debug-support code may remain.
- No real debug credential was generated, read or registered in these tests. No Firebase request, model inference, browser QA or production deployment is claimed.

## Dependency audit

The existing Vite 7.2.2 dependency had security advisories; it was updated to 7.3.8 and tests/build were repeated. npm audit still reports four high-severity affected packages through Firebase 13.0.0's Firestore dependency on @grpc/grpc-js 1.9.16 (~1.9.0). Relay does not import Firestore or run a gRPC server, but installed dependency exposure is not declared resolved. Do not blindly apply npm audit fix --force: the suggested Firebase downgrade would remove the required current AI API. Review an upstream-compatible fix separately.

Live Firebase/App Check connectivity and real browser interaction remain unverified by this report. The development bootstrap path is not production attestation.

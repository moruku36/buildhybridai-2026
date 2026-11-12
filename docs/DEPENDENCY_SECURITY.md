# Dependency security follow-up

Checked November 12, 2026 with Node 26.13.0 / npm 11.

## Findings and actual exposure

The previous four high-severity npm audit entries were one dependency chain: firebase -> @firebase/firestore -> @grpc/grpc-js, also propagated through Firestore compat. The installed gRPC version was 1.9.16. The [upstream certificate-authentication advisory](https://github.com/advisories/GHSA-m9gg-hp2v-232j) concerns gRPC servers that accept optional client certificates and rely on getAuthContext for authorization. A related [error-detail disclosure advisory](https://github.com/advisories/GHSA-f596-whhp-79r4) also affects older versions.

Relay is a browser app and does not use Firestore or run a gRPC server. A Vite generateBundle/module-graph check found no Firestore or gRPC modules in the browser build. This reduces direct runtime exposure in the current application; it does not justify leaving vulnerable installed dependencies unaddressed.

## Minimal fix

A scoped npm override pins only @firebase/firestore's @grpc/grpc-js to **1.13.6**. This is an upstream patched 1.x release, retains the proto-loader 0.7 dependency family, and avoids changing Relay's verified Firebase AI SDK 13.0.0. No Firebase 9 downgrade or force-fix was used.

Registry metadata for the then-current Firebase 13.3.0 / Firestore 4.20.0 still specified grpc ~1.9.0, so merely upgrading Firebase would not remove this finding. The override intentionally exceeds Firestore's narrower declared minor range. It is a project compatibility choice, not an assertion that Firebase officially supports that combination. Remove it when an upstream Firestore release resolves a patched gRPC naturally, after rechecking tests and audit.

## Verification

- npm audit --json: **0 vulnerabilities** across all severities at this check.
- npm test: **18 passed**, zero failures.
- Vite 7.3.8 production build: passed; generated asset filenames/sizes unchanged from the prior app build.
- Browser build module graph: no Firestore/gRPC modules.
- Firebase Firestore Node import smoke: passed without initializing a client or making a network request.
- npm ci --ignore-scripts: clean lockfile install passed, still resolving grpc 1.13.6 under the scoped override, audit zero.

No live AI calls, Firebase credential actions, gRPC server requests, broad Firestore integration test, or other running-process changes were performed. Audit zero is a point-in-time advisory result, not a guarantee that the dependency tree has no vulnerabilities.

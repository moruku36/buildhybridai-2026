# Optional local App Check debugging

This is development support, not proof of live Firebase connectivity. This code change did not configure a project, generate or register credentials, or run inference.

## Defaults and production

Debug mode is off. It requires a Vite development server, VITE_APPCHECK_DEBUG=true, and a loopback hostname (localhost, 127.0.0.1 or IPv6 loopback). Other hosts fail closed. Builds force the development branch off, including custom modes or NODE_ENV overrides. The application-specific debug helper is removed; the Firebase SDK may retain its own debug-support code.

## Local setup, only after authorization

1. Obtain authorization before generating a debug credential or registering persistent backend access.
2. Complete normal Firebase setup first. Public Firebase app configuration is required. Explicit loopback debug mode can omit the reCAPTCHA site key; that mode uses a CustomProvider whose token callback always throws, with the SDK's debug path handling attestation instead. Production requires a registered real site key.
3. Put only the boolean flag VITE_APPCHECK_DEBUG=true in ignored .env.local and run npm run dev on loopback. Never put a token string in environment variables, source, screenshots, chat or builds.
4. Click Initialize connection and accept its debug credential notice. This initializes App Check with automatic refresh disabled, without requesting an attestation exchange or starting a model. The SDK can then generate and persist a debug credential in the browser and print it in the developer console. Keep that console private. Relay does not collect, copy or register the credential. After authorized registration, click Verify App Check and confirm to request one attestation exchange. Only success/failure is shown; the response credential is not exposed. Then use Start queue only when ready for actual inference.
5. Firebase Console registration is a separate security-sensitive action. Keep debug builds private. Turn the flag off and restart the server when finished. Revoke compromised or no-longer-needed registered credentials in Firebase Console.

Do not add localhost to production reCAPTCHA allowed domains as a workaround. A registered debug credential bypasses device attestation and must stay private. Relay accepts boolean opt-in only, never a supplied token string.

## Firebase AI Logic authorization

The [current Firebase AI Logic FAQ](https://firebase.google.com/docs/ai-logic/faq-and-troubleshooting) documents the mid-2026 move to an automatically provisioned Google-managed service account (P4SA) for Gemini authorization. The public Firebase web app API key is still required; it is not a secret Gemini API key. Do not create or embed a Gemini API key or service-account private key for Relay. API provisioning, App Check registration and enforcement remain separate authorized setup steps.

Source: [official App Check web debug-provider guide](https://firebase.google.com/docs/app-check/web/debug-provider).

The development-only CustomProvider composition follows the public APIs and Firebase SDK 13.0.0 implementation; it is not claimed as an official Firebase tutorial recipe. The callback deliberately cannot issue attestation. Production builds omit this provider path and require reCAPTCHA. Relevant SDK sources: [providers](https://github.com/firebase/firebase-js-sdk/blob/firebase%4013.0.0/packages/app-check/src/providers.ts), [initialization](https://github.com/firebase/firebase-js-sdk/blob/firebase%4013.0.0/packages/app-check/src/api.ts).

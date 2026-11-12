# Read-only device availability diagnostic

Use **Check device availability** for a lightweight browser check before arranging a separate on-device validation run. It checks the existence of LanguageModel.availability and calls only availability. No check runs automatically at startup.

Relay explicitly requests English text input and output through the public Firebase onDeviceParams.createOptions API. Both Firebase inference setup and availability diagnostics use the same deviceModelOptions function. This replaces the SDK's broader default text-plus-image input requirement because this MVP only sends text. Image generation remains a separate optional future feature. No SDK-internal field or inference bypass is used.

- available: the model reports readiness for those options, not proof of successful inference.
- downloadable: a model download would be needed; this button does not start it.
- downloading: Chrome reports an existing download; this button did not start it and does not wait for completion.
- unavailable: the model cannot currently serve those options.
- Missing API, exceptions, unexpected results or a five-second timeout: unknown, never success.

The diagnostic does not call create, prompt, initializeDeviceModel, Firebase initialization, App Check, cloud inference or permission APIs. It does not create or read credentials, modify flags, claim GPU ownership or change the queue's inference-verification banner. It cannot prevent a browser-initiated download or another tab's existing work.

Any actual model download or device inference remains a separate coordinated action. All inference still goes through Firebase AI Logic. Direct LanguageModel access here is availability inspection only.

References: [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api), [Firebase SDK Chrome adapter](https://github.com/firebase/firebase-js-sdk/blob/firebase%4013.0.0/packages/ai/src/methods/chrome-adapter.ts).

Offline tests use synthetic providers; no device API was called during development of this feature.

Validation for this change: 22 offline tests passed, zero failures; Vite 7.3.8 production build passed. No live browser availability, model creation, download, inference or Firebase request was executed by these checks.

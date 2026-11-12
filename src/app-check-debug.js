export function isLocalDebugRequested({dev, optIn, hostname}) {
  return dev === true && optIn === 'true' &&
    ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
}
// Development-only opt-in. Never accepts a token string.
export function enableLocalAppCheckDebug({dev, optIn, hostname, target}) {
  if (dev !== true || optIn !== 'true') return false;
  if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname)) {
    throw Error('Relay App Check debug is restricted to loopback development.');
  }
  if (target.FIREBASE_APPCHECK_DEBUG_TOKEN !== undefined &&
      target.FIREBASE_APPCHECK_DEBUG_TOKEN !== true &&
      target.FIREBASE_APPCHECK_DEBUG_TOKEN !== false) {
    throw Error('Relay does not accept injected App Check debug token strings.');
  }
  target.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  return true;
}

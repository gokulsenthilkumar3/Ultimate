/** Explicit browser location only. Never substitutes an IP address for a device fix. */
export function locationErrorMessage(error) {
  if (error?.name === 'AbortError') return 'Location request cancelled.';
  if (error?.code === 'INSECURE_CONTEXT') return 'Open GrowthTrack over HTTPS or localhost to use device location.';
  if (error?.code === 'POLICY_BLOCKED') return 'Location is blocked by this page’s permission policy. Open GrowthTrack directly in your browser.';
  if (error?.code === 'UNSUPPORTED') return 'This browser does not support device location. Try a supported browser.';
  if (error?.code === 1) return 'Location permission is blocked. Allow Location in this site’s browser permissions and your device settings, then retry.';
  if (error?.code === 3) return 'Your device did not provide a location in time. Check device Location Services, then retry near a window or outdoors.';
  return 'Your device could not determine its location. Enable device Location Services and check your network, then retry.';
}

export function requestBrowserLocation({ signal, browser = globalThis } = {}) {
  return new Promise((resolve, reject) => {
    const fail = code => Object.assign(new Error(locationErrorMessage({ code })), { code });
    if (signal?.aborted) { reject(new DOMException('Location request cancelled.', 'AbortError')); return; }
    if (browser.isSecureContext === false) { reject(fail('INSECURE_CONTEXT')); return; }
    const policy = browser.document?.permissionsPolicy || browser.document?.featurePolicy;
    if (policy?.allowsFeature && !policy.allowsFeature('geolocation')) { reject(fail('POLICY_BLOCKED')); return; }
    const geo = browser.navigator?.geolocation;
    if (!geo?.getCurrentPosition) { reject(fail('UNSUPPORTED')); return; }
    let settled = false;
    const finish = (callback, result) => {
      if (settled) return;
      settled = true; signal?.removeEventListener('abort', abort); callback(result);
    };
    const abort = () => finish(reject, new DOMException('Location request cancelled.', 'AbortError'));
    signal?.addEventListener('abort', abort, { once: true });
    const receive = position => {
      const { latitude, longitude } = position?.coords || {};
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        finish(reject, fail(2)); return;
      }
      finish(resolve, position);
    };
    const attempt = highAccuracy => {
      try {
        geo.getCurrentPosition(receive, error => {
          if (settled) return;
          // A coarse fix often works indoors; only retry actual acquisition failures.
          if (!highAccuracy && [2, 3].includes(error?.code)) attempt(true);
          else finish(reject, fail(error?.code));
        }, { enableHighAccuracy: highAccuracy, maximumAge: highAccuracy ? 0 : 60000, timeout: highAccuracy ? 18000 : 12000 });
      } catch (error) { finish(reject, fail(error?.name === 'SecurityError' ? 1 : 2)); }
    };
    attempt(false);
  });
}

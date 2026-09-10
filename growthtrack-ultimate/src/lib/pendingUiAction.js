const STORAGE_KEY = 'growthtrack-pending-ui-action';

export function queuePendingUiAction(destination) {
  if (typeof window === 'undefined' || !destination) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, destination);
  } catch {
    // Navigation still succeeds when storage is unavailable; only the
    // follow-up form request is skipped.
  }
}

export function consumePendingUiAction(destination) {
  if (typeof window === 'undefined' || !destination) return false;
  try {
    if (window.sessionStorage.getItem(STORAGE_KEY) !== destination) return false;
    window.sessionStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

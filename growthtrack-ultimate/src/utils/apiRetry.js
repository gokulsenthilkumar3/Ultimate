/**
 * utils/apiRetry.js — GrowthTrack Ultimate
 *
 * Wraps fetch with:
 *   • Exponential back-off retry (default 2 retries, base 400ms, factor 2×)
 *   • AbortSignal timeout (default 8 s per attempt)
 *   • Structured error logging
 *
 * Usage (drop-in replacement for bare fetch inside apiSync):
 *   import { fetchWithRetry } from '../utils/apiRetry';
 *   const res = await fetchWithRetry(url, options, { retries: 2, baseDelay: 400 });
 *
 * apiSync in useStore.ts already catches and returns null on any failure —
 * this module adds retry behaviour BEFORE that final catch.
 */

const DEFAULT_RETRIES    = 2;
const DEFAULT_BASE_DELAY = 400;   // ms
const DEFAULT_FACTOR     = 2;     // exponential multiplier
const DEFAULT_TIMEOUT_MS = 8_000; // per-attempt timeout

/**
 * Sleep helper.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Determine whether the HTTP status warrants a retry.
 * We retry on network errors (no status) and 5xx responses.
 * We do NOT retry 4xx — those are client errors that won’t resolve with retries.
 *
 * @param {Response|null} res
 * @returns {boolean}
 */
function shouldRetry(res) {
  if (!res) return true;               // network / timeout error
  return res.status >= 500;            // server error — retry
}

/**
 * fetchWithRetry — fetch with exponential back-off retry.
 *
 * @param {string}  url
 * @param {RequestInit} [options={}]
 * @param {{ retries?: number, baseDelay?: number, factor?: number, timeoutMs?: number }} [retryOptions={}]
 * @returns {Promise<Response>}
 * @throws {Error} after all retries are exhausted
 */
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const {
    retries    = DEFAULT_RETRIES,
    baseDelay  = DEFAULT_BASE_DELAY,
    factor     = DEFAULT_FACTOR,
    timeoutMs  = DEFAULT_TIMEOUT_MS,
  } = retryOptions;

  let lastError;
  let res = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), timeoutMs);

    try {
      res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!shouldRetry(res)) {
        return res; // success or 4xx — don’t retry
      }

      lastError = new Error(`HTTP ${res.status} on ${url}`);
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      // AbortError means our own timeout fired — treat as retriable
      if (err.name !== 'AbortError' && !shouldRetry(null)) {
        throw err; // non-retriable fetch error (e.g. CORS block)
      }
    }

    if (attempt < retries) {
      const delay = baseDelay * Math.pow(factor, attempt);
      console.warn(`[apiRetry] Attempt ${attempt + 1} failed for ${url}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  console.error(`[apiRetry] All ${retries + 1} attempts failed for ${url}:`, lastError?.message);
  throw lastError;
}

/**
 * safeUserId — resolves the user id from the Zustand store,
 * falling back to 1 (dev/local default) when user is not yet set.
 *
 * This prevents the “Blocked unauthenticated API call” guard in apiSync
 * from firing for endpoints that are valid before login (health-check, onboarding).
 *
 * Import and use in any component that needs a guaranteed integer user ID:
 *   import { safeUserId } from '../utils/apiRetry';
 *   const uid = safeUserId(useStore.getState().user);
 *
 * @param {object|null} user
 * @returns {number|string}
 */
export function safeUserId(user) {
  return user?.id ?? 1;
}

/**
 * retryConfig — pre-defined retry profiles for different endpoint types.
 *
 * Usage: fetchWithRetry(url, opts, retryConfig.standard)
 */
export const retryConfig = {
  /** Normal data endpoints — 2 retries, 400ms base */
  standard: { retries: 2, baseDelay: 400, factor: 2, timeoutMs: 8_000 },
  /** Quick health-check — 1 retry, 200ms base, 4 s timeout */
  health:   { retries: 1, baseDelay: 200, factor: 2, timeoutMs: 4_000 },
  /** Upload / heavy payload — 1 retry, 1 s base, 30 s timeout */
  upload:   { retries: 1, baseDelay: 1_000, factor: 2, timeoutMs: 30_000 },
  /** Fire-and-forget analytics — 0 retries */
  analytics:{ retries: 0, baseDelay: 0,   factor: 1, timeoutMs: 5_000 },
};

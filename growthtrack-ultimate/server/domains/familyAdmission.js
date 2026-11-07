/**
 * Process-local admission for the Ultimate -> Family bridge.
 *
 * Keys are authenticated Ultimate account IDs only. Paths, bodies, IPs, names and
 * credentials are never stored. It supplements, and does not replace, the IP request
 * budget, the circuit breaker and Family's own per-identity limiter. It never retries.
 * A multi-replica deployment needs a shared admission store before these numbers can
 * be treated as deployment-wide limits.
 */
export const FAMILY_REQUEST_KINDS = Object.freeze(['read', 'write', 'transfer', 'ai']);

// Conservative starting points, not measured capacity. `perWindow` bounds an account's
// admissions per window, `active` its concurrent requests, `global` this process's.
const DEFAULTS = Object.freeze({
  windowMs: 60_000,
  owners: 1000,
  read: Object.freeze({ perWindow: 120, active: 8, global: 64 }),
  write: Object.freeze({ perWindow: 30, active: 2, global: 16 }),
  transfer: Object.freeze({ perWindow: 10, active: 2, global: 8 }),
  ai: Object.freeze({ perWindow: 6, active: 1, global: 4 }),
});

export class FamilyAdmissionError extends Error {
  constructor(code, message, status, retryAfter = 1) {
    super(message);
    this.name = 'FamilyAdmissionError';
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const positive = value => Number.isSafeInteger(value) && value >= 1;

function resolvePolicy(limits) {
  const policy = { windowMs: limits.windowMs ?? DEFAULTS.windowMs, owners: limits.owners ?? DEFAULTS.owners };
  if (!positive(policy.windowMs) || !positive(policy.owners)) throw new Error('Invalid Family admission limit.');
  for (const kind of FAMILY_REQUEST_KINDS) {
    policy[kind] = { ...DEFAULTS[kind], ...limits[kind] };
    for (const value of Object.values(policy[kind])) if (!positive(value)) throw new Error('Invalid Family admission limit.');
  }
  return policy;
}

/** Cost class for a Family bridge path (already validated against the route allowlist). */
export function classifyFamilyRequest(method, pathname) {
  if (/^\/ai(?:\/|$)/.test(pathname)) return 'ai';
  const safe = method === 'GET' || method === 'HEAD';
  if (/^\/trees\/[A-Za-z0-9_-]+\/(?:export|import)(?:\/|$)/.test(pathname)) return 'transfer'; // whole-tree GEDCOM files
  // Uploads and file downloads stream bytes and hold sockets longest; deleting metadata is an ordinary write.
  if (/^\/documents(?:\/|$)/.test(pathname) && (safe ? /^\/documents\/(?:file|upload)(?:\/|$)/.test(pathname) : method !== 'DELETE')) return 'transfer';
  return safe ? 'read' : 'write';
}

export function createFamilyAdmission({ limits = {}, now = Date.now } = {}) {
  const policy = resolvePolicy(limits);
  const owners = new Map();
  const active = Object.fromEntries(FAMILY_REQUEST_KINDS.map(kind => [kind, 0]));
  let nextSweep = 0;

  function sweep(time) {
    for (const [key, bucket] of owners) {
      if (bucket.resetAt <= time && FAMILY_REQUEST_KINDS.every(kind => bucket.active[kind] === 0)) owners.delete(key);
    }
    nextSweep = time + policy.windowMs;
  }

  return {
    /** Returns an idempotent release function, or throws FamilyAdmissionError before upstream contact. */
    acquire(ownerId, kind) {
      const limit = policy[kind];
      if (!limit) throw new Error('Unknown Family request kind.');
      const time = now();
      if (time >= nextSweep) sweep(time);
      let bucket = owners.get(ownerId);
      if (!bucket) {
        if (owners.size >= policy.owners) sweep(time);
        if (owners.size >= policy.owners) throw new FamilyAdmissionError('FAMILY_BUSY', 'Family is busy. Try again shortly.', 503);
        bucket = {
          resetAt: time + policy.windowMs,
          count: Object.fromEntries(FAMILY_REQUEST_KINDS.map(name => [name, 0])),
          active: Object.fromEntries(FAMILY_REQUEST_KINDS.map(name => [name, 0])),
        };
        owners.set(ownerId, bucket);
      }
      if (bucket.resetAt <= time) {
        bucket.resetAt = time + policy.windowMs;
        for (const name of FAMILY_REQUEST_KINDS) bucket.count[name] = 0;
      }
      if (bucket.active[kind] >= limit.active) throw new FamilyAdmissionError('FAMILY_REQUEST_ACTIVE', 'Too many Family requests are already running for your account. Wait for them to finish.', 429);
      if (active[kind] >= limit.global) throw new FamilyAdmissionError('FAMILY_BUSY', 'Family is busy. Try again shortly.', 503);
      if (bucket.count[kind] >= limit.perWindow) {
        const wait = Math.max(1, Math.ceil((bucket.resetAt - time) / 1000));
        throw new FamilyAdmissionError('FAMILY_RATE_LIMITED', `Family request limit reached. Wait ${wait} second${wait === 1 ? '' : 's'} before trying again.`, 429, wait);
      }
      bucket.count[kind] += 1; bucket.active[kind] += 1; active[kind] += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true; bucket.active[kind] -= 1; active[kind] -= 1;
      };
    },
    /** Counts only; no account identifiers. */
    snapshot() { return { owners: owners.size, active: { ...active } }; },
  };
}

import { failure } from './transport.js';

// Process-local admission; no prompts, responses, IPs, or credentials are stored.
const DEFAULTS = Object.freeze({ windowMs: 60_000, generationsPerWindow: 12, discoveriesPerWindow: 60, activeGenerations: 4, activeDiscoveries: 4, owners: 1000 });

export function createAgentAdmission({ limits = {}, now = Date.now } = {}) {
  const policy = { ...DEFAULTS, ...limits };
  for (const value of Object.values(policy)) if (!Number.isSafeInteger(value) || value < 1) throw new Error('Invalid agent admission limit.');
  const owners = new Map();
  const active = { generation: 0, discovery: 0 };
  function limited(message, retryAfter = 1) {
    return Object.assign(failure('rate_limited', message, 429), { retryAfter });
  }
  return {
    acquire(ownerId, kind) {
      const time = now();
      for (const [key, bucket] of owners) {
        if (bucket.resetAt <= time && !bucket.generation.active && !bucket.discovery.active) owners.delete(key);
      }
      let bucket = owners.get(ownerId);
      if (!bucket) {
        if (owners.size >= policy.owners) throw limited('Agents is busy. Try again shortly.');
        bucket = { resetAt: time + policy.windowMs, generation: { count: 0, active: false }, discovery: { count: 0, active: false } };
        owners.set(ownerId, bucket);
      }
      if (bucket.resetAt <= time) {
        bucket.resetAt = time + policy.windowMs;
        bucket.generation.count = bucket.discovery.count = 0;
      }
      const slot = bucket[kind];
      const capacity = kind === 'generation' ? policy.activeGenerations : policy.activeDiscoveries;
      const budget = kind === 'generation' ? policy.generationsPerWindow : policy.discoveriesPerWindow;
      if (slot.active) throw limited('An agent request is already running for your account. Stop it or wait for it to finish.');
      if (active[kind] >= capacity) throw limited('Agents is busy. Try again shortly.');
      if (slot.count >= budget) throw limited('Agent request limit reached. Wait before trying again.', Math.max(1, Math.ceil((bucket.resetAt - time) / 1000)));
      slot.count += 1; slot.active = true; active[kind] += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true; slot.active = false; active[kind] -= 1;
      };
    },
  };
}

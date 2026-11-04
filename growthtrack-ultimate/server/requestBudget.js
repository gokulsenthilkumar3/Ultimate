/** Bounded, process-local admission control; upstream volumetric protection is separate. */
export function createRequestBudget({ limit = 600, maxClients = 10_000, windowMs = 60_000, now = Date.now } = {}) {
  const clients = new Map();
  let nextSweep = 0;
  return (req, res, next) => {
    const time = now();
    if (time >= nextSweep) {
      for (const [key, value] of clients) if (value.resetAt <= time) clients.delete(key);
      nextSweep = time + windowMs;
    }
    const key = req.ip || 'unknown';
    let bucket = clients.get(key);
    if (bucket && bucket.resetAt <= time) { clients.delete(key); bucket = null; }
    if (!bucket) {
      if (clients.size >= maxClients) {
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil((nextSweep - time) / 1000))));
        return res.status(503).json({ code: 'REQUEST_CAPACITY', error: 'Server busy. Try again shortly.' });
      }
      bucket = { count: 0, resetAt: time + windowMs };
      clients.set(key, bucket);
    }
    if (bucket.count >= limit) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - time) / 1000))));
      return res.status(429).json({ code: 'REQUEST_RATE_LIMIT', error: 'Too many requests. Try again shortly.' });
    }
    bucket.count++;
    return next();
  };
}

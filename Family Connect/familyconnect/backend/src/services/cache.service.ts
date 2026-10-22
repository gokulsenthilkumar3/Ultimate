import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;
const client = createClient({ url: redisUrl || 'redis://localhost:6379' });
let redisAvailable = false;
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

if (redisUrl && process.env.REDIS_DISABLED !== '1') {
  client.on('error', () => { redisAvailable = false; });
  client.on('connect', () => { redisAvailable = true; });
  client.connect().catch(() => { redisAvailable = false; });
}

export const CACHE_TTL = { TREE: 300, MEMBERS: 180, EVENTS: 120, STATS: 600 } as const;

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = redisAvailable ? await client.get(key) : memoryCache.get(key)?.value;
    const entry = memoryCache.get(key);
    if (!redisAvailable && entry && entry.expiresAt <= Date.now()) { memoryCache.delete(key); return null; }
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (redisAvailable) await client.setEx(key, ttl, raw);
    else memoryCache.set(key, { value: raw, expiresAt: Date.now() + ttl * 1000 });
  } catch { /* degrade */ }
}

export async function cacheInvalidate(...keys: string[]): Promise<void> {
  if (!keys.length) return;
  try {
    if (redisAvailable) await client.del(keys);
    else keys.forEach(key => memoryCache.delete(key));
  } catch { /* degrade */ }
}

export default client;

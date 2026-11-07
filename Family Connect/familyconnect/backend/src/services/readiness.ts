import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export function createReadinessProbe(database = prisma, timeoutMs = 2000) {
  let pending: Promise<boolean> | undefined;
  return async () => {
    // A timed-out query remains in flight: subsequent probes must not multiply it.
    if (!pending) pending = database.$queryRaw`SELECT 1`.then(() => true).catch(() => false).finally(() => { pending = undefined; });
    let timer: ReturnType<typeof setTimeout>;
    try { return await Promise.race([pending, new Promise<false>(resolve => { timer = setTimeout(() => resolve(false), timeoutMs); })]); }
    finally { clearTimeout(timer!); }
  };
}

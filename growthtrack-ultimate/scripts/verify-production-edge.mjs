import { Resolver } from 'node:dns/promises';
import tls from 'node:tls';

const host = process.argv[2];
if (!host || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host)) {
  console.error('Usage: node scripts/verify-production-edge.mjs <public-production-hostname>');
  process.exit(2);
}
const resolver = new Resolver({ timeout: 3000, tries: 1 });
const results = { host, checkedAt: new Date().toISOString(), checks: {}, productionReady: false };
const record = async (name, work) => {
  try { results.checks[name] = { ok: true, ...await work() }; }
  catch (error) { results.checks[name] = { ok: false, code: error.code || 'CHECK_FAILED' }; }
};
await Promise.all([
  record('dns', async () => {
    const records = await Promise.allSettled([resolver.resolve4(host), resolver.resolve6(host)]);
    const addressCount = records.reduce((total, item) => total + (item.status === 'fulfilled' ? item.value.length : 0), 0);
    if (!addressCount) throw Object.assign(new Error('No addresses'), { code: 'NO_DNS_ADDRESSES' });
    return { addressCount };
  }),
  record('tls', () => new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: 443, servername: host, minVersion: 'TLSv1.2', rejectUnauthorized: true });
    socket.setTimeout(8000, () => socket.destroy(Object.assign(new Error('Timeout'), { code: 'TLS_TIMEOUT' })));
    socket.once('error', reject);
    socket.once('secureConnect', () => {
      const certificate = socket.getPeerCertificate();
      const expires = Date.parse(certificate.valid_to);
      const daysRemaining = Math.floor((expires - Date.now()) / 86_400_000);
      socket.end();
      if (!Number.isFinite(daysRemaining) || daysRemaining < 14) return reject(Object.assign(new Error('Expiry'), { code: 'CERTIFICATE_EXPIRING' }));
      resolve({ protocol: socket.getProtocol(), daysRemaining });
    });
  })),
  record('https', async () => {
    const response = await fetch(`https://${host}/Ultimate/`, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    await response.body?.cancel();
    const headers = response.headers;
    return {
      ok: response.status === 200 && Boolean(headers.get('strict-transport-security')) && Boolean(headers.get('content-security-policy')),
      status: response.status,
      hsts: Boolean(headers.get('strict-transport-security')),
      csp: Boolean(headers.get('content-security-policy')),
      cloudflareHeaderObserved: Boolean(headers.get('cf-ray')),
    };
  }),
  record('httpRedirect', async () => {
    const response = await fetch(`http://${host}/Ultimate/`, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    await response.body?.cancel();
    const destination = new URL(response.headers.get('location') || '/', `http://${host}`);
    return { ok: [301, 302, 307, 308].includes(response.status) && destination.protocol === 'https:' && destination.hostname === host, status: response.status };
  }),
]);
results.externalVerificationRequired = [
  'Authoritative DNS, registrar DS/DNSSEC chain and CAA policy',
  'CDN proxy enabled, private cache bypass, WAF/DDoS rules and alerts',
  'Origin bypass firewall/tunnel, trusted client-IP handling and certificate renewal',
  'MFA, encrypted recovery set, customer-data blockers and deployment-specific security review',
];
console.log(JSON.stringify(results, null, 2));
// This is a public probe, not proof of provider controls or production readiness.
if (Object.values(results.checks).some(check => !check.ok)) process.exitCode = 1;

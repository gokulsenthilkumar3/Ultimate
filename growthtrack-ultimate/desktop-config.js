import net from 'node:net';

export async function privateDesktopPort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

export function sharedServerUrl(value, { allowLoopback = false } = {}) {
  if (!value) return null;
  const url = new URL(value);
  const local = allowLoopback && url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if ((!local && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash) throw new Error('GROWTHTRACK_SERVER_URL must be HTTPS, or explicitly allowed loopback HTTP, without credentials, queries or fragments.');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

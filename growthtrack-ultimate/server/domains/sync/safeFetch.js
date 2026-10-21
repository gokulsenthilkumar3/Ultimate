import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import { domainError } from '../errors.js';

// Connectors fetch owner-supplied URLs from the server, so every hop must reach
// a public HTTPS host. Validation happens in the socket lookup itself; a DNS
// answer that changes between a check and the connection cannot slip through.
const blocked = new net.BlockList();
for (const [address, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 3]]) blocked.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['2001:db8::', 32], ['64:ff9b::', 96]]) blocked.addSubnet(address, prefix, 'ipv6');

export function isPublicAddress(address) {
  const family = net.isIP(address);
  if (!family) return false;
  const mapped = family === 6 && address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicAddress(mapped[1]);
  return !blocked.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

export function normalizeFeedUrl(value) {
  const text = String(value ?? '').trim().replace(/^webcals?:\/\//i, 'https://');
  let url;
  try { url = new URL(text); } catch { throw domainError(400, 'INVALID_URL', 'Enter a complete https:// address.'); }
  if (url.protocol !== 'https:') throw domainError(400, 'INVALID_URL', 'Only https:// (or webcal://) addresses are supported.');
  if (url.username || url.password) throw domainError(400, 'INVALID_URL', 'Addresses with embedded credentials are not supported.');
  if (url.port && url.port !== '443') throw domainError(400, 'INVALID_URL', 'Use the standard HTTPS port.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) ? !isPublicAddress(host) : !/\./.test(host) || /\.(?:local|localhost|internal|lan|home|test)$/i.test(host)) {
    throw domainError(400, 'PRIVATE_ADDRESS', 'Private, local and internal network addresses cannot be fetched.');
  }
  if (url.href.length > 2048) throw domainError(400, 'INVALID_URL', 'The address is too long.');
  return url;
}

function guardedLookup(lookup) {
  return (hostname, options, callback) => {
    lookup(hostname, { ...options, all: true }, (error, addresses) => {
      if (error) return callback(error);
      const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: net.isIP(addresses) }];
      if (!list.length || list.some(entry => !isPublicAddress(entry.address))) {
        return callback(domainError(400, 'PRIVATE_ADDRESS', 'The address resolves to a private network and was not fetched.'));
      }
      return options?.all ? callback(null, list) : callback(null, list[0].address, list[0].family);
    });
  };
}

function requestOnce(url, { headers, maxBytes, timeoutMs, lookup }) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: { 'User-Agent': 'GrowthTrack-Sync/1.0', Accept: '*/*', ...headers },
      lookup: guardedLookup(lookup), timeout: timeoutMs,
    }, response => {
      const status = response.statusCode || 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        return resolve({ redirect: new URL(response.headers.location, url).href, status });
      }
      if (status < 200 || status >= 300) {
        response.resume();
        return reject(domainError(502, status === 429 ? 'PROVIDER_RATE_LIMITED' : 'PROVIDER_HTTP', status === 429
          ? 'The provider is rate limiting requests. Sync will retry later.' : `The provider responded with HTTP ${status}.`));
      }
      const declared = Number(response.headers['content-length']);
      if (Number.isFinite(declared) && declared > maxBytes) { response.destroy(); return reject(domainError(413, 'PROVIDER_TOO_LARGE', 'The provider response is too large.')); }
      const chunks = []; let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > maxBytes) { response.destroy(); reject(domainError(413, 'PROVIDER_TOO_LARGE', 'The provider response is too large.')); }
        else chunks.push(chunk);
      });
      response.on('end', () => resolve({ status, text: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(domainError(504, 'PROVIDER_TIMEOUT', 'The provider did not respond in time.')));
    request.on('error', error => reject(error?.status ? error : domainError(502, 'PROVIDER_UNREACHABLE', 'The provider could not be reached.')));
  });
}

/** Fetch text from a public HTTPS endpoint. `allowHosts` pins fixed-provider
    connectors to their documented API hosts. */
export async function safeFetchText(input, { allowHosts = null, headers = {}, maxBytes = 1024 * 1024, timeoutMs = 10_000, redirects = 3, lookup = dns.lookup } = {}) {
  let url = normalizeFeedUrl(input);
  for (let hop = 0; hop <= redirects; hop += 1) {
    if (allowHosts && !allowHosts.includes(url.hostname)) throw domainError(400, 'HOST_NOT_ALLOWED', `${url.hostname} is not an approved host for this connector.`);
    const result = await requestOnce(url, { headers, maxBytes, timeoutMs, lookup });
    if (!result.redirect) return result.text;
    url = normalizeFeedUrl(result.redirect);
  }
  throw domainError(502, 'PROVIDER_REDIRECTS', 'The provider redirected too many times.');
}

export async function safeFetchJson(input, options) {
  const text = await safeFetchText(input, options);
  try { return JSON.parse(text); } catch { throw domainError(502, 'PROVIDER_INVALID', 'The provider returned an unreadable response.'); }
}

import { createHash } from 'node:crypto';

// Hash only scripts supplied by the application, never request or stored user HTML.
export function contentSecurityPolicy(config, html = '') {
  // HTML parsing normalizes CRLF before CSP hashes the script text.
  const hashes = [...html.replace(/\r\n?/g, '\n').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/i.test(attributes))
    .map(([, , script]) => `'sha256-${createHash('sha256').update(script).digest('base64')}'`);
  const connections = new Set(["'self'", ...config.security.connectOrigins]);
  if (!config.production) {
    for (const origin of config.security.origins) {
      connections.add(origin);
      connections.add(origin.replace(/^http/, 'ws'));
    }
  }
  return [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'",
    `frame-ancestors ${config.security.frameAncestors}`, "form-action 'self'",
    // Three's optional WASM decoders do not require JavaScript eval.
    `script-src 'self' https://js.stripe.com 'wasm-unsafe-eval' ${[...new Set(hashes)].join(' ')}`.trim(),
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:", "img-src 'self' data: blob: https:",
    "worker-src 'self' blob:", "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    `connect-src ${[...connections].join(' ')}`,
  ].join('; ');
}

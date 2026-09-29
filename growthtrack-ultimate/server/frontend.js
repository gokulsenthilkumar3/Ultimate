import express from 'express';
import path from 'node:path';

export function frontendBasePath({ frontendBasePath: configured, appUrl } = {}) {
  const input = configured ?? (appUrl ? new URL(appUrl).pathname : '/Ultimate/');
  const base = `/${String(input).replace(/^\/+|\/+$/g, '')}`;
  if (!/^\/(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]*$/.test(base)
    || base.split('/').some(segment => segment === '.' || segment === '..')
    || /^\/(api|auth)(\/|$)/i.test(base)) throw new Error('Frontend base path must be a safe path outside API and auth routes.');
  return base === '/' ? '/' : `${base}/`;
}

export function registerFrontend(app, { distDirectory, frontendBasePath: configured, appUrl }) {
  const basePath = frontendBasePath({ frontendBasePath: configured, appUrl });
  const mountPath = basePath === '/' ? '/' : basePath.slice(0, -1);
  app.use((req, res, next) => {
    if (/^\/(api|auth)(\/|$)/.test(req.path)) return res.status(404).json({ error: 'Endpoint not found.' });
    if (basePath !== '/' && (req.method === 'GET' || req.method === 'HEAD') && (req.path === '/' || req.path === mountPath)) return res.redirect(302, basePath);
    next();
  });
  app.use(mountPath, express.static(distDirectory, { index: 'index.html', dotfiles: 'deny' }));
  app.use((req, res, next) => {
    const withinBase = basePath === '/' || req.path.startsWith(basePath);
    const relative = basePath === '/' ? req.path.slice(1) : req.path.slice(basePath.length);
    // Missing assets must never receive HTML with a successful HTTP status.
    if (withinBase && ['GET', 'HEAD'].includes(req.method) && !relative.startsWith('assets/') && !path.posix.extname(req.path) && req.accepts('html')) {
      return res.sendFile(path.join(distDirectory, 'index.html'));
    }
    if (req.method === 'GET' || req.method === 'HEAD') return res.status(404).json({ error: 'Endpoint not found.' });
    next();
  });
  return basePath;
}

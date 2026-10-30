import { nativeEntryDestination } from '../src/config/nativeEntries.js';

// Installed before Vite's legacy companion proxies in development and preview.

export default function nativeEntriesPlugin() {
  const install = server => { server.middlewares.use((req, res, next) => {
    const destination = req.method === 'GET' ? nativeEntryDestination(new URL(req.url, 'http://localhost').pathname) : null;
    if (!destination) return next();
    res.writeHead(302, { Location: destination, 'Cache-Control': 'no-store' }); res.end();
  }); };
  return { name: 'ultimate-native-entries', configureServer: install, configurePreviewServer: install };
}

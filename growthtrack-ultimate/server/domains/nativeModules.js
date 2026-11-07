import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createMarketFeed, MarketFeedError } from './equity/marketFeed.js';

export function registerNativeModuleRoutes(app, authMiddleware, options = {}) {
  const envFile = path.resolve(import.meta.dirname, '../../../Equity/NiftyLens/.env.local');
  const local = fs.existsSync(envFile) ? dotenv.parse(fs.readFileSync(envFile)) : {};
  const prices = options.prices || createMarketFeed({ environment: { ...local, ...process.env } });
  app.get('/api/native/equity/prices', authMiddleware, async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try { res.json(await prices()); }
    catch (error) { res.status(error instanceof MarketFeedError ? error.status : 503).json({ code: error.code || 'MARKET_FEED_UNAVAILABLE', error: error instanceof MarketFeedError ? error.message : 'Market quotes are unavailable.' }); }
  });
  const fetchImpl = options.fetchImpl || fetch;
  const base = options.forexUrl || 'http://127.0.0.1:8000';
  for (const endpoint of ['metadata', 'history']) app.get(`/api/native/forex/${endpoint}`, authMiddleware, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const url = new URL(`/workspace/${endpoint}`, base);
    for (const key of ['model', 'currencies', 'window', 'period']) if (typeof req.query[key] === 'string') url.searchParams.set(key, req.query[key].slice(0, 160));
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 45_000);
    const abort = () => controller.abort(); req.on('aborted', abort);
    res.on('close', abort);
    try {
      const response = await fetchImpl(url, { signal: controller.signal });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) return res.json(payload);
      const detail = typeof payload?.detail === 'string' ? payload.detail : '';
      const status = [400, 404, 422, 503].includes(response.status) ? response.status : 503;
      const error = response.status === 422 ? 'Choose valid currencies, model and history window.' : detail || 'The Forex dataset or saved model is unavailable. Review the Forex service configuration.';
      return res.status(status).json({ code: 'FOREX_UNAVAILABLE', error });
    } catch (error) { if (!res.destroyed) res.status(503).json({ code: 'FOREX_UNAVAILABLE', error: error?.name === 'AbortError' ? 'The Forex service timed out. Start the workspace services and retry.' : 'The Forex service did not respond. Start the workspace services and retry.' }); }
    finally { clearTimeout(timer); req.off('aborted', abort); res.off('close', abort); }
  });
}

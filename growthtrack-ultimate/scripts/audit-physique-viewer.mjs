#!/usr/bin/env node
// Drives the real Physique 3D viewer in headless Chromium and measures what it does, against what the plan in
// docs/real-human-3d promises. Each claim prints "pass" or "FAIL" with the measured value; on a viewer that has not
// been fixed yet, several FAIL on purpose. Re-run after each step of docs/real-human-3d/08-roadmap.md.
//
//   npm run dev                                   (another terminal; the dev server must be up)
//   node scripts/audit-physique-viewer.mjs [--url http://127.0.0.1:5173/Ultimate/wellness/physique?view=3d]
//        [--out docs/real-human-3d/data/viewer-audit.json] [--shots docs/real-human-3d/evidence] [--gpu] [--strict]
//        [--chromium /path/to/chrome]   (or set PLAYWRIGHT_CHROMIUM_EXECUTABLE) and PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs
//        when the browser installed on the machine differs from the Playwright version pinned in package.json
//
// By default the browser uses software GL (SwiftShader) so results do not depend on the machine; pass --gpu to use the
// real GPU. --strict exits with status 1 if any claim fails.
import fs from 'node:fs';
import path from 'node:path';

// Playwright is loaded here so a different installation can be named (PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs) when the
// browser build installed on the machine does not match the version pinned in package.json.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');

const args = process.argv.slice(2);
const flag = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const url = flag('--url', 'http://127.0.0.1:5173/Ultimate/wellness/physique?view=3d');
const outFile = flag('--out', null);
const shotsDir = flag('--shots', null);
const useGpu = args.includes('--gpu');
const executablePath = flag('--chromium', process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined);
const strict = args.includes('--strict');

const OWNER = { id: 'audit-owner', name: 'Audit owner', email: 'owner@example.test', tasks: { pending: [], completed: [] }, timezone: 'UTC', calendar_events: [], projects: [], skills: [], portfolio: [], dob: '1990-01-01' };
const BODY = { heightCm: 175, weightKg: 74, bodyFatPct: 19, waistCm: 82, chestCm: 99, hipsCm: 96, glutesCm: 96, shouldersCm: 112, armsCm: 33, neckCm: 37, modelPreset: 'male', biologicalSex: 'male' };
const EMPTY_STATE = { user: OWNER, preference: { theme: 'system', palette: 'gold', density: 'comfortable', onboardingComplete: true }, tasks: [], finance: [], budgets: [], shopping: [], entertainment: [], timesheet: [], sleep_logs: [], nutrition_logs: [], notes: [], goals: [], documents: [], habits: [], subscriptions: [], metric_logs: [], moodLogs: [], vitalsLogs: [], medications: [], workout_sessions: [], socialProfiles: [], config: {}, databases: [] };

// Texel density of the shipped head skin (docs/real-human-3d/data/glb-audit.humanoid-base.json), used for claim 8.
const HEAD_TEXELS_PER_CM = 23;
const FOV_DEG = 30;

const results = [];
const claim = (id, title, pass, measured) => { results.push({ id, title, pass, measured }); console.log(`${pass ? 'pass' : 'FAIL'}  ${id}  ${title}  (${measured})`); };

const launchArgs = useGpu ? [] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ args: launchArgs, executablePath });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(120000);
await page.addInitScript(() => {
  localStorage.setItem('growthtrack-analytics-consent', 'denied');
  // Stand-ins so the share path can be observed: record what would be shared.
  window.__shared = null;
  navigator.canShare = () => true;
  navigator.share = async (data) => { window.__shared = { keys: Object.keys(data), files: (data.files || []).length }; };
});
await page.route((u) => u.pathname.startsWith('/api/'), async (route) => {
  const p = new URL(route.request().url()).pathname; let data;
  if (p === '/api/auth/me') data = { user: OWNER, expiresAt: '2099-01-01T00:00:00.000Z' };
  else if (/csrf/.test(p)) data = { csrfToken: 'x' };
  else if (p === '/api/state') data = { ...EMPTY_STATE, bodyProfile: BODY };
  else if (p === '/api/body-profile') data = { ...BODY, ...(route.request().postDataJSON() || {}) };
  else if (p === '/api/physique_targets') data = route.request().postDataJSON() || {};
  else if (p === '/api/preferences') data = { id: 'p', userId: OWNER.id, ...EMPTY_STATE.preference };
  else if (p === '/api/health') data = { status: 'ok' };
  else if (p === '/api/capabilities') data = { version: 'audit', billing: { checkoutAvailable: false, tier: null }, connections: [] };
  else if (p === '/api/agents/readiness') data = { ready: false, code: 'setup_required', models: [] };
  else if (route.request().method() === 'GET') data = [];
  else data = { success: true };
  await route.fulfill({ json: data });
});

await page.goto(url);
await page.waitForSelector('.chamber-viewport canvas', { timeout: 120000 });
await page.locator('.chamber-viewport').scrollIntoViewIfNeeded();
await page.waitForTimeout(9000);

const canvas = page.locator('.chamber-viewport canvas');
const box = await canvas.boundingBox();
const cx = box.x + box.width / 2; const cy = box.y + box.height / 2;
const camera = () => page.evaluate(() => {
  const c = document.querySelector('.chamber-viewport canvas');
  const p = c.dataset.cameraPosition.split(',').map(Number); const t = c.dataset.cameraTarget.split(',').map(Number);
  const d = [p[0] - t[0], p[1] - t[1], p[2] - t[2]]; const r = Math.hypot(...d);
  return { distance: r, azimuthDeg: (Math.atan2(d[0], d[2]) * 180) / Math.PI, polarDeg: (Math.acos(d[1] / r) * 180) / Math.PI, height: p[1] };
});
const drag = async (dx, dy, steps = 30) => { await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + dx, cy + dy, { steps }); await page.mouse.up(); await page.waitForTimeout(900); };
const shot = async (name) => { if (shotsDir) { fs.mkdirSync(shotsDir, { recursive: true }); await canvas.screenshot({ path: path.join(shotsDir, `${name}.png`) }); } };

// 1. The floor is a hard limit.
await drag(0, -900);
const low = await camera(); await shot('audit-below-floor');
claim('G1-floor', 'camera stays above the floor after dragging up', low.height >= 0, `camera height ${low.height.toFixed(2)} m`);

// 2. Zoom limit versus texture density: how stretched is the head skin at the closest zoom?
await page.getByRole('button', { name: 'Face', exact: true }).first().click({ force: true }).catch(() => {});
await page.waitForTimeout(2500);
for (let i = 0; i < 8; i += 1) { await page.getByRole('button', { name: 'Zoom in', exact: true }).first().click({ force: true }).catch(() => {}); await page.waitForTimeout(250); }
await page.waitForTimeout(2000);
const near = await camera(); await shot('audit-face-closest');
const canvasH = await canvas.evaluate((c) => c.height);
const visibleCm = 2 * near.distance * Math.tan((FOV_DEG * Math.PI) / 360) * 100;
const magnification = canvasH / visibleCm / HEAD_TEXELS_PER_CM;
claim('G3-pixels', 'head texture is stretched no more than 1.25 px per texel at the closest zoom', magnification <= 1.25, `${magnification.toFixed(2)} px per texel at ${near.distance.toFixed(2)} m`);

// 3. Auto-rotate rotates.
await page.getByRole('tab', { name: 'View', exact: true }).click(); await page.waitForTimeout(800);
const autoRotate = page.locator('label.workspace-switch', { hasText: 'Auto rotate' }).locator('input');
await autoRotate.check();
await canvas.scrollIntoViewIfNeeded();
const samples = []; for (let i = 0; i < 10; i += 1) { samples.push((await camera()).azimuthDeg); await page.waitForTimeout(800); }
await autoRotate.uncheck();
const unwrapped = samples.reduce((acc, a, i) => { if (i === 0) return [a]; let d = a - samples[i - 1]; d = ((d + 540) % 360) - 180; return [...acc, acc[i - 1] + d]; }, []);
const travelled = Math.max(...unwrapped) - Math.min(...unwrapped);
claim('G2-autorotate', 'auto-rotate turns the view at least 20 degrees in 8 seconds', travelled >= 20, `${travelled.toFixed(1)} degrees`);

// 4. Presentation mode is a real mode.
await page.getByRole('button',{name:'Enter presentation',exact:true}).click(); await page.waitForTimeout(2500);
const presented = await page.evaluate(() => ({ fullscreen: Boolean(document.fullscreenElement), editorVisible: Boolean(document.querySelector('.chamber-editor')) }));
claim('G6-presentation', 'presentation mode enters fullscreen and hides the editor', presented.fullscreen && !presented.editorVisible, `fullscreen ${presented.fullscreen}, editor visible ${presented.editorVisible}`);
await page.getByRole('button',{name:/Exit presentation/}).click(); await page.waitForTimeout(800);

// 5. Quality tiers change real settings.
const quality = page.locator('label.workspace-field', { hasText: 'Quality' }).locator('select');
const context3d = () => page.evaluate(() => {
  const c = document.querySelector('.chamber-viewport canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl'); const a = gl.getContextAttributes();
  return { width: c.width, height: c.height, antialias: a.antialias,composerSamples:Number(c.dataset.qualityMsaa),composerAA:c.dataset.qualityAntialias,shadowMap:Number(c.dataset.qualityShadowMap) };
});
const tiers = {};
for (const tier of ['performance', 'balanced', 'high']) { await quality.selectOption(tier); await page.waitForTimeout(3500); tiers[tier] = await context3d(); }
const distinct = new Set(Object.values(tiers).map(t=>JSON.stringify(t))).size;
claim('G2-quality', 'Performance, Balanced and High differ in render resolution, composer AA or shadows', distinct > 1, `${distinct} distinct setting(s): ${JSON.stringify(tiers)}`);

// 6. Screenshot resolution.
const [download] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }).catch(() => null), page.getByRole('button', { name: 'Export', exact: true }).click()]);
if (download) {
  const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
  const buf=Buffer.concat(chunks);
  const width = buf.readUInt32BE(16); const cssWidth = await canvas.evaluate((c) => c.clientWidth);
  claim('G5-export', 'the exported picture is at least twice the on-screen width', width >= 2 * cssWidth, `${width} px for a ${cssWidth} px canvas, ${buf.length} bytes`);
} else claim('G5-export', 'the exported picture is at least twice the on-screen width', false, 'no download happened');

// 7. Sharing attaches the picture.
await page.locator('summary[aria-label="More avatar actions"]').click(); await page.waitForTimeout(600);
const shareButton = page.getByRole('button', { name: /Share protected view/i });
if (await shareButton.count()) {
  await shareButton.first().click(); await page.waitForTimeout(2500);
  const modalShare = page.getByRole('button', { name: 'Share image',exact:true });
  if (await modalShare.count()) await modalShare.first().click(); await page.waitForTimeout(800);
  const shared = await page.evaluate(() => window.__shared);
  claim('G5-share', 'sharing passes the picture as a file to the browser share sheet', Boolean(shared && shared.files > 0), shared ? `shared ${JSON.stringify(shared)}` : 'navigator.share was not called');
} else claim('G5-share', 'sharing passes the picture as a file to the browser share sheet', false, 'no share button found');

await browser.close();

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed} of ${results.length} claims pass.`);
if (outFile) { fs.mkdirSync(path.dirname(outFile), { recursive: true }); fs.writeFileSync(outFile, JSON.stringify({ url, date: new Date().toISOString().slice(0, 10), software: !useGpu, results }, null, 2)); console.log(`wrote ${outFile}`); }
process.exit(strict && failed ? 1 : 0);

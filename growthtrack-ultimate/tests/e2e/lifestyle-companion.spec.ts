import { test, expect, emptyState } from './foundation-fixture';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('growthtrack.presentation.v5', JSON.stringify({ style: 'kinetic', lite: false, companion: true })));
  await page.route(url => !['127.0.0.1', 'localhost'].includes(url.hostname), route => route.abort());
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`streaming import preview and webhook setup remain honest at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    let committed = false; const enabled = new Set<string>();
    const providers = () => ['netflix', 'prime-video', 'crunchyroll'].map(id => ({ id, name: { netflix: 'Netflix', 'prime-video': 'Prime Video', crunchyroll: 'Crunchyroll' }[id], method: 'CSV import + custom webhook', endpoint: `/api/integrations/streaming/${id}/webhook/test-owner`, webhookEnabled: enabled.has(id), nativeSync: false }));
    await page.route('**/api/integrations/streaming**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (path.endsWith('/streaming')) return route.fulfill({ json: { providers: providers(), encryptionReady: true } });
      if (path.endsWith('/history')) { const hasEvents = committed && path.includes('/netflix/'); return route.fulfill({ json: { count: hasEvents ? 1 : 0, events: hasEvents ? [{ id: 'synthetic-event', title: 'A synthetic history title', watchedAt: '2026-11-06' }] : [], truncated: false } }); }
      if (path.endsWith('/import')) {
        const body = request.postDataJSON();
        expect(body.csv).toContain('A synthetic history title');
        if (!body.commit) return route.fulfill({ json: { count: 1, preview: [{ id: 'fixture', title: 'A synthetic history title', watchedAt: '2026-11-06' }], warning: 'Missing type, status and duration stay unknown.' } });
        committed = true; return route.fulfill({ json: { imported: 1, duplicates: 0 } });
      }
      if (path.endsWith('/connection')) { enabled.add(path.split('/').at(-2)!); return route.fulfill({ json: { secret: 'synthetic-secret-for-ui-testing-only', endpoint: path, webhookEnabled: true } }); }
      return route.fulfill({ status: 404, json: {} });
    });
    await page.goto('/life/entertainment');
    await page.getByRole('tab', { name: 'Sync', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Streaming connections', exact: true })).toBeVisible();
    await page.getByLabel('History CSV', { exact: true }).setInputFiles({ name: 'history.csv', mimeType: 'text/csv', buffer: Buffer.from('Title,Date\nA synthetic history title,2026-11-06') });
    await page.getByRole('button', { name: 'Preview import', exact: true }).click();
    await expect(page.getByText(/1 events ready/)).toBeVisible(); expect(committed).toBe(false);
    await page.getByRole('button', { name: 'Import 1 events', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: '1 events imported' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Imported history · 1 events' })).toBeVisible();
    await page.getByRole('button', { name: 'Enable custom webhook', exact: true }).click();
    await expect(page.getByLabel('Webhook signing secret')).toHaveValue('synthetic-secret-for-ui-testing-only');
    await expect(page.getByText(/Direct account sync unavailable/)).toBeVisible();
    await page.getByRole('button', { name: 'Hide secret', exact: true }).click();
    await expect(page.getByLabel('Webhook signing secret')).toHaveCount(0);
    await page.getByLabel('Streaming service', { exact: true }).selectOption('crunchyroll');
    await expect(page.getByText(/Enabling this endpoint does not make Crunchyroll send events/)).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `../.code-index/brand/streaming-${viewport.width}.png`, fullPage: true });
  });
}

test('device location is explicit, recovers in Current and saves only after the separate Places action', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 11.1, longitude: 77.2, accuracy: 30 });
  await page.route('**/api/state', route => route.fulfill({ json: { ...emptyState(), config: { weatherUrl: '' } } }));
  const points: unknown[] = [];
  await page.route('**/api/locations', async route => {
    if (route.request().method() === 'POST') points.push({ id: 'synthetic-point', ...route.request().postDataJSON() });
    return route.fulfill({ json: route.request().method() === 'POST' ? points.at(-1) : points });
  });
  await page.goto('/insights/current');
  expect(points).toHaveLength(0);
  await page.getByRole('button', { name: 'Use my location' }).click();
  await expect(page.getByText(/Device location available/)).toBeVisible();
  expect(points).toHaveLength(0);
  await page.goto('/life/places');
  await page.getByRole('button', { name: 'Save current location', exact: true }).click();
  await expect(page.getByText('Location saved to your private server timeline.')).toBeVisible();
  expect(points).toHaveLength(1);
  expect(points[0]).toMatchObject({ latitude: 11.1, longitude: 77.2, source: 'browser', accuracyM: 30 });
});

test('companion timer survives closing its panel and quick notes wait for real API acknowledgement', async ({ page }) => {
  await page.goto('/workspace/tasks');
  await page.getByRole('button', { name: 'Open Sidekick companion' }).click();
  await page.getByRole('button', { name: 'Start focus', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.floating-companion__tag')).toHaveText(/^(25:00|24:5\d)$/);
  await page.getByRole('button', { name: 'Open Sidekick companion' }).click();
  await page.getByRole('tab', { name: 'Quick capture' }).click();
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  const notes: unknown[] = [];
  await page.route('**/api/v1/workspace/notes', async route => {
    const payload = route.request().postDataJSON(); notes.push(payload); await gate;
    await route.fulfill({ json: { ...payload, revision: 1, kind: 'workspace', updatedAt: new Date().toISOString(), deletedAt: null, pinned: false, starred: false } });
  });
  await page.getByLabel('Quick command or note').fill('A synthetic reminder of a useful idea');
  await page.getByRole('button', { name: 'Save as note', exact: true }).click();
  await expect.poll(() => notes.length).toBe(1);
  await expect(page.getByText('Note saved to your workspace.')).toHaveCount(0);
  release();
  await expect(page.getByText('Note saved to your workspace.')).toBeVisible();
  await page.getByRole('tab', { name: 'Charms' }).click();
  await expect(page.getByRole('button', { name: /Nudge companion charm/ })).toBeVisible();
  await page.getByLabel('Rope', { exact: true }).selectOption('chain');
  await page.getByLabel('Charm', { exact: true }).selectOption('cat');
  await expect(page.locator('.companion-play__charm svg')).toBeVisible();
});

test('standalone companion keeps private actions behind authentication and clears after cross-window sign-out', async ({ page }) => {
  const modelRequests: string[] = [];
  page.on('request', request => { if (/\.(glb|gltf)(?:\?|$)/.test(request.url())) modelRequests.push(request.url()); });
  await page.goto('/companion.html');
  await expect(page.getByRole('heading', { name: 'Kite, your little sidekick.' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Quick capture' })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'growthtrack-user', newValue: null })));
  await expect(page.getByText('Sign in through Ultimate before saving notes and reminders.')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Quick capture' })).toHaveCount(0);
  expect(modelRequests).toEqual([]);
});

test('login stays portrait-free and the original welcome world is distinct from the agent', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('.personal-companion')).toHaveCount(0);
  await page.goto('/welcome');
  for (const [label, pose] of [['Focus Studio', 'work'], ['Quiet Garden', 'wellbeing'], ['Life Observatory', 'life']]) {
    await page.getByRole('button', { name: new RegExp(label) }).click();
    await expect(page.locator('.welcome-companion')).toHaveAttribute('data-state', pose);
  }
  await expect(page.locator('.welcome-companion [data-scene="atlas"]')).toHaveCount(1);
  await expect(page.locator('.welcome-companion .agent-kite, .welcome-companion .personal-companion')).toHaveCount(0);
  await page.goto('/workspace/tasks');
  await expect(page.locator('.floating-companion [data-scene="kite"]')).toHaveCount(1);
  await expect(page.locator('.floating-companion [data-scene="atlas"], .floating-companion .personal-companion')).toHaveCount(0);
});

test('new 3D scenes render, pause, release context and preserve agent workflows', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/welcome');
  const atlas = page.locator('[data-scene="atlas"]');
  await expect(atlas).toHaveAttribute('data-renderer', 'ready', { timeout: 20000 });
  await expect(atlas).toHaveAttribute('data-running', 'true');
  await expect(atlas.locator('canvas')).toBeVisible();
  expect(Number(await atlas.getAttribute('data-triangles'))).toBeLessThan(30000);
  expect(Number(await atlas.getAttribute('data-draw-calls'))).toBeLessThan(90);
  await page.getByRole('button', { name: /Focus Studio/ }).click();
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await expect(atlas).toHaveAttribute('data-running', 'false');
  await page.locator('.welcome-companion').screenshot({ path: '../.code-index/brand/living-atlas-desktop.png' });
  await page.getByRole('button', { name: 'Play motion', exact: true }).click();
  await expect(atlas).toHaveAttribute('data-running', 'true');
  await atlas.locator('canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(atlas).toHaveAttribute('data-renderer', 'fallback');
  await expect(atlas.locator('svg')).toBeVisible();
  await expect(atlas.locator('canvas')).toHaveCount(0);
  await page.goto('/workspace/tasks');
  const kite = page.locator('.floating-companion__creature [data-scene="kite"]');
  await expect(kite).toHaveAttribute('data-renderer', 'poster');
  await page.getByRole('button', { name: 'Open Sidekick companion' }).hover();
  await expect(kite).toHaveAttribute('data-renderer', 'ready', { timeout: 20000 });
  await page.locator('.floating-companion__creature').screenshot({ path: '../.code-index/brand/kite-agent-desktop.png' });
  await page.getByRole('button', { name: 'Open Sidekick companion' }).click();
  await expect(page.getByRole('dialog', { name: 'Your companion' })).toBeVisible();
  await expect(kite).toHaveAttribute('data-running', 'false');
  await page.getByRole('button', { name: 'Cheer pose' }).click();
  await expect(page.locator('.companion-panel .agent-kite')).toHaveAttribute('data-pose', 'celebrate');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open Sidekick companion' })).toBeFocused();
  await expect(kite).toHaveAttribute('data-running', 'true');
  expect(errors).toEqual([]);
});

test('new scenes keep a readable mobile composition and static reduced-motion art', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/welcome');
  await expect(page.locator('[data-scene="atlas"]')).toHaveAttribute('data-renderer', 'poster');
  await page.getByRole('button', { name: /Quiet Garden/ }).click();
  await expect(page.locator('[data-scene="atlas"]')).toHaveAttribute('data-state', 'wellbeing');
  await expect(page.locator('[data-scene="atlas"] canvas')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.playful-hero').screenshot({ path: '../.code-index/brand/living-atlas-mobile-static.png' });
  await page.goto('/workspace/tasks');
  await expect(page.locator('.floating-companion [data-scene="kite"]')).toHaveAttribute('data-renderer', 'poster');
  await page.getByRole('button', { name: 'Open Sidekick companion' }).click();
  await expect(page.getByRole('dialog', { name: 'Your companion' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Quick capture' })).toBeVisible();
});

test('welcome rover drives, discovers places and releases keyboard input without touching app records', async ({ page }) => {
  await page.goto('/welcome');
  const world = page.locator('[data-scene="atlas"]');
  await expect(world).toHaveAttribute('data-renderer', 'ready', { timeout: 20000 });
  expect(await page.locator('.world-layout').evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(900);
  await page.getByRole('button', { name: /Pilot Pebble/ }).click();
  const surface = page.getByRole('group', { name: '3D island exploration area' });
  await expect(surface).toBeFocused();
  const before = Number(await world.getAttribute('data-rover-z'));
  await page.keyboard.down('w');
  await expect.poll(async () => Math.abs(Number(await world.getAttribute('data-rover-z')) - before)).toBeGreaterThan(.1);
  await page.keyboard.up('w'); await page.keyboard.press('Escape');
  await expect(surface).not.toBeFocused();
  await page.getByRole('button', { name: /Return Pebble home/ }).click();
  for (const [name, count] of [['Focus Studio', 1], ['Quiet Garden', 2], ['Life Observatory', 3]] as const) {
    await page.getByRole('button', { name: new RegExp(name) }).click();
    await expect(page.getByLabel(`${count} of 3 tour places discovered`)).toBeVisible({ timeout: 12000 });
  }
  await page.getByRole('button', { name: 'Switch to golden hour' }).click();
  await expect(page.locator('.world-layout')).toHaveAttribute('data-dusk', 'true');
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await page.locator('.playful-hero').screenshot({ path: '../.code-index/brand/explore-world-desktop.png' });
});

test('mobile welcome supports held touch steering and a visit from below the world', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await page.goto('/welcome');
  const world = page.locator('[data-scene="atlas"]');
  await expect(world).toHaveAttribute('data-renderer', 'poster');
  await page.getByRole('button', { name: 'Enter 3D world', exact: true }).click();
  await expect(world).toHaveAttribute('data-renderer', 'ready', { timeout: 20000 });
  const forward = page.getByRole('button', { name: 'Move forward', exact: true });
  await forward.scrollIntoViewIfNeeded();
  const box = await forward.boundingBox(); if (!box) throw Error('Touch controls are not visible.');
  const before = Number(await world.getAttribute('data-rover-z'));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 }] });
  await expect.poll(async () => Math.abs(Number(await world.getAttribute('data-rover-z')) - before)).toBeGreaterThan(.1);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.getByRole('button', { name: /Quiet Garden/ }).click();
  await expect(page.getByLabel('1 of 3 tour places discovered')).toBeVisible({ timeout: 12000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.welcome-companion').screenshot({ path: '../.code-index/brand/explore-world-mobile.png' });
  await cdp.detach();
});

test('Growth Isles guided journey lights real landmarks, supports replay and preserves static navigation', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', request => { if (/\/api\//.test(request.url()) && !['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
  await page.goto('/welcome');
  const world = page.locator('[data-scene="atlas"]');
  await expect(world).toHaveAttribute('data-renderer', 'ready', { timeout: 20000 });
  await page.getByRole('button', { name: 'Start guided journey', exact: true }).click();
  await expect(page.getByText('Your little world is awake.', { exact: true })).toBeVisible({ timeout: 25000 });
  await expect(world).toHaveAttribute('data-lanterns', '3');
  await expect(world).toHaveAttribute('data-transport', 'seed-glider');
  await expect(world).toHaveAttribute('data-growth-leaves', '3');
  await expect(page.getByLabel('3 of 3 tour places discovered')).toBeVisible();
  expect(Number(await world.getAttribute('data-triangles'))).toBeLessThan(30000);
  expect(Number(await world.getAttribute('data-draw-calls'))).toBeLessThan(90);
  await page.getByRole('button', { name: 'Follow Pebble', exact: true }).click();
  await expect(world).toHaveAttribute('data-camera-follow', 'false');
  await page.getByRole('button', { name: 'Start guided journey', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop guided journey', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Map destination Wellbeing', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start guided journey', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quiet Garden', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await page.locator('.playful-hero').screenshot({ path: '../.code-index/brand/growth-isles-desktop.png' });
  expect(writes).toEqual([]);
});

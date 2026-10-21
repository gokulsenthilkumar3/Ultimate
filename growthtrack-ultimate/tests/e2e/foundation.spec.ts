import { test, expect, emptyState } from './foundation-fixture';
import { AREA_ORDER, FEATURES } from '../../src/config/featureRegistry';

test('restores a legacy module and selected view through redirects', async ({ page }) => {
  await page.goto('/physique?unit=cm#history');
  await expect(page).toHaveURL(/\/wellness\/physique\?unit=cm&view=history$/);
  await expect(page.getByText('Your body over time')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Your body over time')).toBeVisible();
  await expect(page.locator('.app-shell')).toBeVisible();
});

test('shows initial-load failure instead of an empty workspace', async ({ page }) => {
  await page.route('**/api/state', route => route.fulfill({ status: 500, json: { error: 'Fixture failure' } }));
  await page.goto('/workspace/tasks');
  await expect(page.getByText('Your records could not be loaded')).toBeVisible();
  await page.unroute('**/api/state');
  await page.route('**/api/state', route => route.fulfill({ json: emptyState() }));
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Your records could not be loaded')).toBeHidden();
});

test('hydration does not show a false zero when history fails and recovers on retry', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/wellness/hydration');
  await expect(page.getByText('Hydration history is unavailable. No daily total can be shown until it loads.')).toBeVisible();
  await page.route('**/api/hydration/logs', route => route.fulfill({ json: [] }));
  await page.getByRole('button', { name: 'Retry hydration history' }).click();
  await expect(page.getByText('Rolling 24-hour history from the server. Use Refresh to check for new entries.')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('uses complete module links and always offers navigation reopening', async ({ page }) => {
  await page.goto('/finance/overview');
  const modules = page.getByRole('navigation', { name: 'Finance modules' });
  await expect(page.getByText('Net monthly balance')).toBeVisible();
  await expect(modules.getByRole('link', { name: /Transactions/ })).toHaveAttribute('href', '/finance/transactions');
  await page.getByRole('button', { name: 'Close module navigation', exact: true }).click();
  await page.getByRole('button', { name: 'Open module navigation', exact: true }).click();
  await modules.getByRole('link', { name: /Shopping/ }).click();
  await expect(page).toHaveURL(/\/finance\/shopping$/);
});

for (const width of [320, 390, 640, 768, 1024, 1440, 1920, 2560]) {
  test(`responsive navigation and bounded layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 640 ? 700 : 900 });
    await page.goto('/workspace/overview');
    await expect(page.getByRole('heading', { name: /Work, made clear|Your work today/ })).toBeVisible();
    if (width === 640) expect(await page.evaluate(() => window.innerWidth)).toBe(640);
    if (width < 640) {
      await page.getByRole('button', { name: /More/ }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('dialog').getByRole('link', { name: /Maps/ })).toBeVisible();
    } else if (width < 1024) {
      await page.getByRole('button', { name: 'Open module navigation' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    } else await expect(page.getByRole('navigation', { name: 'Workspace modules' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test('ordinary routes never request immersive model or vendor assets', async ({ page }) => {
  const resources: string[] = [];
  page.on('request', request => resources.push(request.url()));
  await page.goto('/workspace/overview');
  await expect(page.getByRole('heading', { name: /Work, made clear|Your work today/ })).toBeVisible();
  expect(resources.some(url => /\.glb(?:\?|$)|three-vendor|HumanoidViewer|ScrollShowcase/.test(url))).toBe(false);
});

test('location capture remains off and list is available without tiles', async ({ page }) => {
  const thirdPartyTiles: string[] = [];
  page.on('request', request => { if (request.url().includes('tile.openstreetmap.org')) thirdPartyTiles.push(request.url()); });
  await page.goto('/life/places?view=list');
  await expect(page.getByText('No location samples saved. Capture remains off until you choose it.')).toBeVisible();
  await expect(page.getByText('Location capture is off on this device.')).toBeVisible();
  expect(thirdPartyTiles).toEqual([]);
});

test('social profiles are manual and all six provider connections disclose setup requirements', async ({ page }) => {
  await page.goto('/life/social?view=connections');
  await expect(page.getByRole('heading', { name: 'Social profiles' })).toBeVisible();
  await expect(page.getByText(/No provider is connected by saving a profile link/)).toBeVisible();
  const connections = page.getByRole('region', { name: 'Social provider connections' });
  for (const provider of ['GitHub', 'YouTube', 'Instagram', 'Facebook', 'X', 'LinkedIn']) {
    await expect(connections.getByText(`${provider}: setup required`)).toBeVisible();
  }
});

test('unknown modules preserve navigation and offer recovery', async ({ page }) => {
  await page.goto('/finance/not-real');
  await expect(page.getByRole('heading', { name: "This route doesn't exist" })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Product areas' })).toBeVisible();
});

test('recovers a paused timer and never automatically submits its draft', async ({ page }) => {
  const submissions: string[] = [];
  page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/api/timesheet')) submissions.push(request.url()); });
  await page.goto('/workspace/timesheet');
  await expect(page.getByRole('heading', { name: 'Timesheet' })).toBeVisible();
  await page.evaluate(async () => {
    const modulePath = '/src/lib/drafts.ts';
    const { saveDraft } = await import(modulePath);
    await saveDraft('isolated-test-owner', 'timesheet-timer', { runningSince: null, accumulatedSeconds: 125, startTime: new Date(Date.now() - 150000).toISOString(), project: 'Research', task: 'Recover this task', billable: false, rate: 0, notes: 'Draft note' });
  });
  await page.reload();
  await expect(page.getByText('00:02:05', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Task / Description')).toHaveValue('Recover this task');
  await expect(page.getByRole('button', { name: 'RESUME', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'sessions', exact: true })).toBeVisible();
  expect(submissions).toEqual([]);
});

test('private draft operations isolate accounts and remove only the chosen owner', async ({ page }) => {
  await page.goto('/workspace/overview');
  await expect(page.getByRole('heading', { name: /Work, made clear|Your work today/ })).toBeVisible();
  const result = await page.evaluate(async () => {
    const modulePath = '/src/lib/drafts.ts';
    const { saveDraft, readDraft, listDrafts, removeOwnerDrafts } = await import(modulePath);
    await saveDraft('account-a', 'note', { text: 'Private A' });
    await saveDraft('account-b', 'note', { text: 'Private B' });
    await removeOwnerDrafts('account-a');
    return { a: await readDraft('account-a', 'note'), b: (await readDraft('account-b', 'note')).data.text, aList: (await listDrafts('account-a')).length, bList: (await listDrafts('account-b')).length };
  });
  expect(result).toEqual({ a: null, b: 'Private B', aList: 0, bList: 1 });
});

test('failed navigation preference save stays visible and retryable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/preferences', route => route.fulfill({ status: 503, json: { error: 'Fixture failure' } }));
  await page.goto('/finance/overview');
  await expect(page.getByText('Net monthly balance')).toBeVisible();
  await page.getByRole('button', { name: 'Close module navigation', exact: true }).click();
  await expect(page.getByText('Could not save navigation preference.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry navigation save' })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const area of AREA_ORDER) {
  test(`all ${area} module routes mount without a fatal page error`, async ({ page }) => {
    test.setTimeout(120_000);
    const pageErrors: string[] = [];
    const chartSizingWarnings: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => {
      if (message.text().includes('width(-1) and height(-1) of chart')) chartSizingWarnings.push(page.url());
    });
    for (const feature of FEATURES.filter(item => item.area === area)) {
      pageErrors.length = 0;
      chartSizingWarnings.length = 0;
      await page.goto(feature.canonicalPath);
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page.locator('#main-content h1, #main-content h2').first(), feature.canonicalPath).toBeVisible({ timeout: 10_000 });
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'This page could not load' }), feature.canonicalPath).toHaveCount(0);
      await expect(page.getByRole('heading', { name: "This route doesn't exist" }), feature.canonicalPath).toHaveCount(0);
      expect(pageErrors, feature.canonicalPath).toEqual([]);
      expect(chartSizingWarnings, feature.canonicalPath).toEqual([]);
    }
  });
}

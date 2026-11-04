import { test, expect, emptyState } from './foundation-fixture';

for (const route of ['/workspace/tasks', '/workspace/notes', '/workspace/goals', '/finance/shopping']) {
  for (const failure of ['timeout', 'server', 'offline']) {
    test(`${route} recovers from ${failure} without presenting false empty records`, async ({ page }) => {
      await page.route('**/api/state', request => failure === 'server'
        ? request.fulfill({ status: 503, json: { error: 'Synthetic unavailable service' } })
        : request.abort(failure === 'timeout' ? 'timedout' : 'internetdisconnected'));
      await page.goto(route);
      await expect(page.getByText('Your records could not be loaded')).toBeVisible();
      await expect(page.locator('#main-content')).toHaveAttribute('aria-busy', 'false');
      await page.unroute('**/api/state');
      await page.route('**/api/state', request => request.fulfill({ json: emptyState() }));
      await page.getByRole('button', { name: 'Try again' }).click();
      await expect(page.getByText('Your records could not be loaded')).toBeHidden();
      await expect(page.locator('#main-content h1').first()).toBeVisible();
      await expect(page.locator('#main-content')).toHaveAttribute('aria-busy', 'false');
    });
  }
}

test('keeps delayed workspace data busy until the response completes', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let requested!: () => void;
  const started = new Promise<void>(resolve => { requested = resolve; });
  await page.route('**/api/state', async route => {
    requested();
    await pending;
    await route.fulfill({ json: emptyState() });
  });
  try {
    await page.goto('/workspace/tasks');
    await started;
    await expect(page.locator('#main-content')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('status', { name: /Loading/ })).toBeVisible();
    await expect(page.getByText('Your records could not be loaded')).toBeHidden();
    release();
    await expect(page.locator('#main-content')).toHaveAttribute('aria-busy', 'false');
    await expect(page.getByRole('heading', { name: 'Tasks Command', exact: true })).toBeVisible();
    await expect(page.getByRole('status', { name: /Loading/ })).toBeHidden();
  } finally { release(); }
});

test('a disconnected initial request offers recovery without silently showing empty data', async ({ page }) => {
  await page.route('**/api/state', route => route.abort('failed'));
  await page.goto('/workspace/tasks');
  await expect(page.getByText('Your records could not be loaded')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tasks Command', exact: true })).toBeHidden();
  await page.unroute('**/api/state');
  await page.route('**/api/state', route => route.fulfill({ json: emptyState() }));
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Tasks Command', exact: true })).toBeVisible();
  await expect(page.locator('#main-content')).toHaveAttribute('aria-busy', 'false');
});


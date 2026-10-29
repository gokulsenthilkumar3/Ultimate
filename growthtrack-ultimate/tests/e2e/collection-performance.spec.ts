import { test, expect, emptyState, OWNER } from './foundation-fixture';
import type { Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
test.setTimeout(60_000);

async function collectionsFixture(page: Page, rejectEdits = false) {
  const goals = Array.from({ length: 120 }, (_, index) => ({
    id: `goal-${index}`, userId: OWNER.id, title: `Synthetic goal ${index}`,
    category: 'personal', priority: 'medium', status: 'active',
    current_value: 10, target_value: 100, deadline: '', subtasks: [],
  }));
  const shopping = Array.from({ length: 200 }, (_, index) => ({
    id: `item-${index}`, userId: OWNER.id, name: `Synthetic item ${index}`,
    category: 'Other', priority: 'medium', stage: 'future', quantity: 1, estimatedCost: 10,
  }));
  await page.route('**/api/state', route => route.fulfill({ json: { ...emptyState(), goals, shopping } }));
  await page.route('**/api/goal_progress_logs?*', route => route.fulfill({ json: [] }));
  await page.route(url => /^\/api\/(goals|shopping)(?:\/|$)/.test(url.pathname), async route => {
    const request = route.request();
    const rows = new URL(request.url()).pathname.includes('/goals') ? goals : shopping;
    if (request.method() === 'GET') { await route.fulfill({ json: rows }); return; }
    if (request.method() === 'PUT' && rejectEdits) {
      await route.fulfill({ status: 409, json: { code: 'VERSION_CONFLICT', error: 'Fixture save rejected.' } }); return;
    }
    const id = new URL(request.url()).pathname.split('/').at(-1);
    const record = rows.find(row => row.id === id);
    if (record && request.method() === 'PUT') {
      Object.assign(record, request.postDataJSON());
      await route.fulfill({ json: record }); return;
    }
    await route.fulfill({ status: 404, json: { error: 'Fixture record not found.' } });
  });
  return { goals, shopping };
}

test('Goals pages preserve expanded and editing drafts and search every loaded goal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await collectionsFixture(page, true);
  await page.goto('/workspace/goals');
  const results = page.getByRole('region', { name: 'Goal results' });
  const pages = page.getByRole('navigation', { name: 'Goal pages' });
  await expect(results.getByRole('progressbar')).toHaveCount(25);
  await expect(pages).toContainText('Showing 1–25 of 120');
  await pages.getByRole('button', { name: 'Next' }).focus();
  await page.keyboard.press('Enter');
  await expect(results).toBeFocused();
  await page.getByRole('button', { name: 'Expand Synthetic goal 25', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Value' }).fill('37');
  await page.getByRole('textbox', { name: 'Note', exact: true }).fill('Unsent progress draft');
  await page.getByRole('textbox', { name: 'Add a sub-task to Synthetic goal 25', exact: true }).fill('Unsent sub-task');
  await pages.getByRole('button', { name: 'Next' }).click();
  await pages.getByRole('button', { name: 'Previous' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Value' })).toHaveValue('37');
  await expect(page.getByRole('textbox', { name: 'Note', exact: true })).toHaveValue('Unsent progress draft');
  await expect(page.getByRole('textbox', { name: 'Add a sub-task to Synthetic goal 25', exact: true })).toHaveValue('Unsent sub-task');
  await page.getByRole('button', { name: 'Edit Synthetic goal 25', exact: true }).click();
  await page.getByRole('textbox', { name: 'Goal title' }).fill('Goal draft survives paging');
  await pages.getByRole('button', { name: 'Next' }).click();
  await pages.getByRole('button', { name: 'Previous' }).click();
  await expect(page.getByRole('textbox', { name: 'Goal title' })).toHaveValue('Goal draft survives paging');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Could not update the goal. Your changes are still here.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Goal title' })).toHaveValue('Goal draft survives paging');
  await page.getByRole('textbox', { name: 'Search goals' }).fill('Synthetic goal 119');
  await expect(results.getByRole('progressbar')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Edit Synthetic goal 119', exact: true })).toBeVisible();
  await expect(pages).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Shopping pages retain price and edit drafts and persist only the selected record', async ({ page }) => {
  const { shopping } = await collectionsFixture(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/finance/shopping');
  const results = page.getByRole('region', { name: 'Shopping results' });
  const pages = page.getByRole('navigation', { name: 'Shopping pages' });
  await expect(results.getByRole('button', { name: /^Edit Synthetic item/ })).toHaveCount(25);
  await expect(pages).toContainText('Showing 1–25 of 200');
  await pages.getByRole('button', { name: 'Next' }).focus();
  await page.keyboard.press('Enter');
  await expect(results).toBeFocused();
  await page.getByRole('spinbutton', { name: 'Log new unit price for Synthetic item 25', exact: true }).fill('8');
  await pages.getByRole('button', { name: 'Next' }).click();
  await pages.getByRole('button', { name: 'Previous' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Log new unit price for Synthetic item 25', exact: true })).toHaveValue('8');
  await page.getByRole('button', { name: 'Edit Synthetic item 25', exact: true }).click();
  await page.getByRole('textbox', { name: 'Item name' }).fill('Saved item from page two');
  await pages.getByRole('button', { name: 'Next' }).click();
  await pages.getByRole('button', { name: 'Previous' }).click();
  await expect(page.getByRole('textbox', { name: 'Item name' })).toHaveValue('Saved item from page two');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit Saved item from page two' })).toBeVisible();
  expect(shopping.find(item => item.id === 'item-25')?.name).toBe('Saved item from page two');
  expect(shopping.find(item => item.id === 'item-26')?.name).toBe('Synthetic item 26');
  await page.getByRole('textbox', { name: 'Search shopping' }).fill('Synthetic item 199');
  await expect(results.getByRole('button', { name: /^Edit Synthetic item/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Edit Synthetic item 199', exact: true })).toBeVisible();
  await expect(pages).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('companion hosts admit a frame only after confirmed readiness without loading another workspace', async ({ page }) => {
  let mode = 'pending';
  let release: (() => void) | undefined;
  const childDocuments: string[] = [];
  let childStateRequests = 0;
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/state' && request.frame().parentFrame()) childStateRequests++;
    if (request.isNavigationRequest() && request.frame().parentFrame()) childDocuments.push(request.url());
  });
  await page.route('**/api/gateway/health', async route => {
    if (mode === 'pending') await new Promise<void>(resolve => { release = resolve; });
    if (mode === 'failed') { await route.fulfill({ status: 503, json: { error: 'Fixture health unavailable.' } }); return; }
    await route.fulfill({ json: { services: [{ id: 'equity', online: true }] } });
  });
  await page.route('**/Ultimate/products/equity/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><h1>Synthetic companion</h1></body></html>' }));
  await page.goto('/finance/equity');
  await expect(page.getByRole('heading', { name: /^Checking Equity/ })).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect.poll(() => Boolean(release)).toBe(true);
  mode = 'failed'; release!();
  await expect(page.getByRole('link', { name: /^Open separate Equity/ })).toBeVisible();
  expect(childDocuments).toEqual([]);
  expect(childStateRequests).toBe(0);
  mode = 'online';
  await page.getByRole('button', { name: 'Refresh app', exact: true }).click();
  await expect(page.frameLocator('.unified-product-frame').getByRole('heading', { name: 'Synthetic companion' })).toBeVisible();
  expect(childDocuments).toHaveLength(1);
  expect(childStateRequests).toBe(0);
});

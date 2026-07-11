/**
 * overview.spec.js
 * E2E: Overview tab — KPI cards render, weather section present,
 * Strategic Priorities progress bars visible, live clock ticking.
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173/Ultimate/';

test.describe('Overview — render checks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    const skip = page.getByRole('button', { name: /skip|get started/i });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    // Ensure we are on Overview (Command group, first tab)
    const cmd = page.getByRole('tab', { name: /command/i });
    if (await cmd.isVisible().catch(() => false)) await cmd.click();
    await page.waitForTimeout(400);
  });

  test('renders greeting with user name or Operator fallback', async ({ page }) => {
    await expect(
      page.getByText(/good morning|good afternoon|good evening/i)
    ).toBeVisible();
  });

  test('renders Health Score KPI card', async ({ page }) => {
    await expect(page.getByText(/health score/i)).toBeVisible();
  });

  test('renders Environmental Sensors section', async ({ page }) => {
    await expect(page.getByText(/environmental sensors/i)).toBeVisible();
  });

  test('renders Strategic Priorities section with at least one progress bar', async ({ page }) => {
    await expect(page.getByText(/strategic priorities/i)).toBeVisible();
    // At least one progress label should be present
    await expect(
      page.getByText(/task execution|sleep recovery|daily hydration/i)
    ).toBeVisible();
  });

  test('live clock ticks (time changes within 2s)', async ({ page }) => {
    const t1 = await page.locator('.label-caps', { hasText: /systems check/i }).textContent();
    await page.waitForTimeout(1500);
    const t2 = await page.locator('.label-caps', { hasText: /systems check/i }).textContent();
    // Time string should have changed
    expect(t1).not.toEqual(t2);
  });
});

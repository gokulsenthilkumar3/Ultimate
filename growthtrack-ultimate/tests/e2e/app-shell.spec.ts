import { test, expect } from '@playwright/test';

/**
 * Spec 1 — App Shell
 * Verifies the application boots, the main shell is mounted,
 * and basic tab navigation works without crashing.
 */
test.describe('App Shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page title is defined and non-empty', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('app-shell root element is visible', async ({ page }) => {
    // The root div rendered by App.jsx carries .app-shell
    const shell = page.locator('.app-shell');
    await expect(shell).toBeVisible({ timeout: 10_000 });
  });

  test('content-area renders only once (no duplicate tab render)', async ({ page }) => {
    // Root fix: there must be exactly ONE .content-area in the DOM
    const contentAreas = page.locator('.content-area');
    await expect(contentAreas).toHaveCount(1);
  });

  test('header is visible', async ({ page }) => {
    const header = page.locator('header, [data-testid="app-header"], .app-header').first();
    await expect(header).toBeVisible();
  });

  test('navigating via FloatingNav does not crash', async ({ page }) => {
    // Click the first nav pill item and assert app-shell still visible
    const navItem = page.locator('.nav-container button, .floating-nav button').first();
    const hasNav = await navItem.count();
    if (hasNav > 0) {
      await navItem.click();
    }
    await expect(page.locator('.app-shell')).toBeVisible();
  });
});

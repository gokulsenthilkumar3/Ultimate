import { test, expect } from '@playwright/test';

test.describe('Overview tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app shell to settle
    await page.waitForSelector('.app-shell', { timeout: 10_000 });
  });

  test('renders greeting and clock', async ({ page }) => {
    await expect(page.locator('h2').first()).toBeVisible();
    // Clock should tick — contains colon separator
    await expect(page.locator('text=/\\d{1,2}:\\d{2}/')).toBeVisible();
  });

  test('Strategic Priorities section is visible', async ({ page }) => {
    await expect(page.getByText('Strategic Priorities')).toBeVisible();
    // At least one progress bar should exist
    await expect(page.locator('.module-page').first()).toBeVisible();
  });

  test('Environmental Sensors card is present', async ({ page }) => {
    await expect(page.getByText('Environmental Sensors')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

/**
 * Authenticated visual contract for the advanced digital-twin surface.
 * The test is intentionally skipped when local owner credentials are not
 * provided, so CI never requires secrets just to run the public suite.
 */
test.describe('Advanced physique visual contract', () => {
  test('3D mirror keeps its primary overlays and measurement ledger', async ({ page }) => {
    test.skip(!process.env.E2E_OWNER_EMAIL || !process.env.E2E_OWNER_PASSWORD, 'Set E2E_OWNER_EMAIL/E2E_OWNER_PASSWORD for authenticated visual coverage.');

    await page.goto('/Ultimate/login');
    await page.getByLabel('Email').fill(process.env.E2E_OWNER_EMAIL!);
    await page.getByLabel('Password').fill(process.env.E2E_OWNER_PASSWORD!);
    await page.getByRole('button', { name: 'Secure login' }).click();
    await expect(page.locator('.app-shell')).toBeVisible();

    await page.goto('/Ultimate/physique#3d');
    await expect(page.locator('.chamber-layout')).toBeVisible();
    await expect(page.locator('.chamber-intelligence-rail')).toBeVisible();
    await expect(page.getByText('ADVANCED MODE')).toBeVisible();
    await expect(page.locator('.physique-data')).toBeVisible();
    await expect(page).toHaveScreenshot('advanced-digital-twin.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.015,
    });
  });
});

import { test, expect } from '@playwright/test';

const hasOwnerCredentials = Boolean(process.env.E2E_OWNER_EMAIL && process.env.E2E_OWNER_PASSWORD);
const visualDescribe = hasOwnerCredentials ? test.describe : test.describe.skip;

/**
 * Authenticated visual contract for the advanced digital-twin surface.
 * The test is intentionally skipped when local owner credentials are not
 * provided, so CI never requires secrets just to run the public suite.
 */
visualDescribe('Advanced physique visual contract', () => {
  test('3D mirror keeps its primary overlays and measurement ledger', async ({ page }) => {
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

    // Cover every comparison mode with the same authenticated session. The
    // explicit keyboard route mirrors the product shortcut and avoids brittle
    // coupling to the visual placement of the mode controls.
    for (const key of ['1', '2', '3', '4', '5', '6']) {
      await page.keyboard.press(key);
      await expect(page).toHaveScreenshot(`advanced-digital-twin-mode-${key}.png`, {
        animations: 'disabled',
        caret: 'hide',
        scale: 'css',
        maxDiffPixelRatio: 0.02,
      });
    }

    // One non-default expression preset protects the authored expression
    // channels and the fallback renderer's equivalent feature path.
    await page.getByTitle('Open body editor').click();
    await page.getByRole('button', { name: 'Face' }).click();
    const faceSliders = page.locator('.chamber-editor input[type="range"]');
    await faceSliders.last().fill('0.78');
    await page.keyboard.press('1');
    await expect(page).toHaveScreenshot('advanced-digital-twin-expression-preset.png', {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.02,
    });
  });
});

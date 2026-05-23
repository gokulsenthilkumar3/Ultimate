import { test, expect, devices } from '@playwright/test';

/**
 * Spec 2 — BottomNavBar (mobile)
 * Verifies each nav group button is tappable on mobile viewports,
 * becomes active, and shows the active label beneath the icon.
 */
test.describe('BottomNavBar', () => {
  test.use({ ...devices['Pixel 5'] });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for shell to stabilize
    await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 10_000 });
  });

  test('BottomNavBar is visible on mobile', async ({ page }) => {
    const nav = page.locator('.mobile-bottom-nav, [data-testid="bottom-nav"]');
    await expect(nav).toBeVisible();
  });

  test('first nav group button is rendered', async ({ page }) => {
    const firstBtn = page
      .locator('.mobile-bottom-nav button, [data-testid="bottom-nav"] button')
      .first();
    await expect(firstBtn).toBeVisible();
  });

  test('tapping a nav group makes it active', async ({ page }) => {
    const buttons = page.locator(
      '.mobile-bottom-nav button, [data-testid="bottom-nav"] button'
    );
    const count = await buttons.count();
    if (count < 2) test.skip();

    // Click the second nav group
    await buttons.nth(1).click();
    const activeBtn = page.locator(
      '.mobile-bottom-nav button.active, [data-testid="bottom-nav"] button.active,' +
      '.mobile-bottom-nav button[aria-current="true"], [data-testid="bottom-nav"] .nav-item.active'
    );
    await expect(activeBtn).toBeVisible();
  });

  test('active nav item shows a visible label', async ({ page }) => {
    const buttons = page.locator(
      '.mobile-bottom-nav button, [data-testid="bottom-nav"] button'
    );
    await buttons.first().click();
    // The active label is rendered below the icon in BottomNavBar.jsx
    const label = page.locator(
      '.mobile-bottom-nav .nav-label, .mobile-bottom-nav .active-label, [data-testid="bottom-nav"] .nav-label'
    );
    await expect(label.first()).toBeVisible();
  });

  test('FloatingNav is hidden on mobile viewport', async ({ page }) => {
    const floatingNav = page.locator('.nav-container, [data-testid="floating-nav"]');
    if (await floatingNav.count() > 0) {
      await expect(floatingNav).toBeHidden();
    }
  });
});

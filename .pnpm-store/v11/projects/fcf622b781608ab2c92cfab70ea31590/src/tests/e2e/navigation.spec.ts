import { test, expect } from '@playwright/test';

test.describe('Navigation — BottomNavBar & FloatingNav', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-shell', { timeout: 10_000 });
  });

  test('BottomNavBar renders 5 group buttons', async ({ page }) => {
    const navItems = page.locator('.mobile-bottom-nav [role="tab"]');
    await expect(navItems).toHaveCount(5);
  });

  test('Active group button has aria-selected=true', async ({ page }) => {
    const activeBtn = page.locator('.mobile-bottom-nav [aria-selected="true"]');
    await expect(activeBtn).toHaveCount(1);
  });

  test('Active group shows label text below icon', async ({ page }) => {
    const activeLabel = page.locator('.mobile-bottom-nav .active .bottom-nav-label');
    await expect(activeLabel.first()).toBeVisible();
  });

  test('Clicking Physiology group navigates to humanoid tab', async ({ page }) => {
    await page.click('[aria-label="Physiology section"]');
    await page.waitForTimeout(400);
    // Humanoid viewer or physiology content should be present
    await expect(page.locator('.module-page')).toBeVisible();
  });
});

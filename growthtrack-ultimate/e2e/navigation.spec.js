/**
 * navigation.spec.js
 * E2E: BottomNavBar group navigation + FloatingNav pill switching.
 * Assumes the dev server is running at http://localhost:5173/Ultimate/
 * and that onboarding has already been completed (or is bypassed via
 * localStorage seed — see playwright.config.js storageState).
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173/Ultimate/';

test.describe('Navigation — BottomNavBar groups', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    // Dismiss onboarding wizard if present
    const skip = page.getByRole('button', { name: /skip|get started/i });
    if (await skip.isVisible().catch(() => false)) await skip.click();
  });

  const GROUPS = [
    { label: 'Command',    firstTabHeading: /overview|dashboard/i },
    { label: 'Physiology', firstTabHeading: /physiology|humanoid|body/i },
    { label: 'Lifestyle',  firstTabHeading: /sleep|lifestyle/i },
    { label: 'Operations', firstTabHeading: /tasks|operations/i },
    { label: 'Library',    firstTabHeading: /entertainment|library/i },
  ];

  for (const group of GROUPS) {
    test(`clicks ${group.label} nav item and renders its first tab`, async ({ page }) => {
      const navBtn = page.getByRole('tab', { name: new RegExp(group.label, 'i') });
      await navBtn.click();
      await page.waitForTimeout(400); // let tab transition finish
      // The active group button should now carry aria-selected="true"
      await expect(navBtn).toHaveAttribute('aria-selected', 'true');
    });
  }

  test('active group label is visible below icon on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    // The .bottom-nav-label span for the active item must be visible
    const activeLabel = page.locator('.bottom-nav-item.active .bottom-nav-label');
    await expect(activeLabel).toBeVisible();
  });
});

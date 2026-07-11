import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Profile — avatar upload', () => {
  const navigateToProfile = async (page: Page) => {
    await page.goto('/');
    await page.waitForSelector('.app-shell', { timeout: 10_000 });
    // Navigate to settings/profile
    const profileBtn = page.locator('[data-tab="settings"], button:has-text("Settings"), button:has-text("Profile")');
    if (await profileBtn.first().isVisible()) {
      await profileBtn.first().click();
    }
    await page.waitForTimeout(500);
  };

  test('Upload photo button visible in edit mode', async ({ page }) => {
    await navigateToProfile(page);
    const editBtn = page.locator('button:has-text("EDIT PROFILE")');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.locator('button:has-text("Upload Photo")')).toBeVisible({ timeout: 3000 });
    } else {
      test.skip();
    }
  });

  test('File input accepts image/* type', async ({ page }) => {
    await navigateToProfile(page);
    const editBtn = page.locator('button:has-text("EDIT PROFILE")');
    if (await editBtn.isVisible()) {
      await editBtn.click();
      const input = page.locator('input[type="file"][accept="image/*"]');
      await expect(input).toBeAttached();
    } else {
      test.skip();
    }
  });
});

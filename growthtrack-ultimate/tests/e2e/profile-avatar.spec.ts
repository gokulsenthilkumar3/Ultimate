import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Spec 6 — Profile Avatar: Upload preview + Remove fallback
 * Tests the file-input upload flow in ProfileEditor.jsx.
 */
test.describe('Profile Avatar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to Profile / Settings tab
    const profileBtn = page
      .locator('button, [role="tab"], a')
      .filter({ hasText: /profile|settings|account/i })
      .first();
    if (await profileBtn.count() > 0) await profileBtn.click();
    await page.locator('.app-shell').waitFor({ state: 'visible' });
  });

  test('profile editor section is visible', async ({ page }) => {
    const editor = page.locator(
      '[data-testid="profile-editor"], .profile-editor, text=/profile/i'
    ).first();
    await expect(editor).toBeVisible({ timeout: 8_000 });
  });

  test('avatar upload input exists (hidden file input)', async ({ page }) => {
    const fileInput = page.locator('input[type="file"][accept*="image"]');
    await expect(fileInput).toHaveCount(1);
  });

  test('uploading an image shows a preview', async ({ page }) => {
    // Create a 1x1 red PNG in a temp file
    const tmpFile = path.join(os.tmpdir(), 'test-avatar.png');
    // Minimal valid 1x1 red PNG bytes
    const pngBytes = Buffer.from(
      '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d76360f8cfc00000000200016b1fd340000000049454e44ae426082',
      'hex'
    );
    fs.writeFileSync(tmpFile, pngBytes);

    const fileInput = page.locator('input[type="file"][accept*="image"]');
    await fileInput.setInputFiles(tmpFile);

    // After upload, a preview image or avatar img should appear / update
    const preview = page.locator(
      '[data-testid="avatar-preview"], .avatar-preview, .profile-avatar img, img[alt*="avatar" i]'
    );
    await expect(preview.first()).toBeVisible({ timeout: 5_000 });

    fs.unlinkSync(tmpFile);
  });

  test('removing avatar resets to fallback/initials', async ({ page }) => {
    const removeBtn = page.locator(
      '[data-testid="remove-avatar"], button[aria-label*="remove" i], button').filter({ hasText: /remove|delete|reset/i }).first();
    if (await removeBtn.count() === 0) {
      test.skip(); // remove button not rendered if no avatar set
    }
    await removeBtn.click();
    // After removal, fallback initials or default icon should be visible
    const fallback = page.locator(
      '[data-testid="avatar-fallback"], .avatar-fallback, .avatar-initials'
    );
    await expect(fallback.first()).toBeVisible({ timeout: 5_000 });
  });
});

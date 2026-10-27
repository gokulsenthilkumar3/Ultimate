import { test, expect } from './foundation-fixture';
import { FEATURES } from '../../src/config/featureRegistry';
import { setupHumanViewer } from './helpers/human-viewer';

// Intercepted API fixtures keep this audit away from the owner's records.
for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
  test(`all registered pages fit ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const feature of FEATURES) {
      await page.goto(feature.canonicalPath);
      const main = page.locator('#main-content');
      await expect(main, feature.canonicalPath).toBeVisible();
      await expect(main.locator('h1, h2').first(), feature.canonicalPath).toBeVisible({ timeout: 15_000 });
      await expect.poll(() => main.evaluate(node => node.scrollWidth - node.clientWidth), {
        message: `${feature.canonicalPath} must not clip content horizontally`, timeout: 3000,
      }).toBeLessThanOrEqual(1);
      const bounds = await main.boundingBox();
      expect(bounds!.x + bounds!.width, feature.canonicalPath).toBeLessThanOrEqual(viewport.width + 1);
    }
    await page.screenshot({ path: test.info().outputPath(`desktop-${viewport.width}.png`) });
  });
}

test('navigation switches on resize and laptop drawer remains usable', async ({ page }) => {
  test.setTimeout(30000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/workspace/overview');
  await expect(page.locator('.gt-app-navigation')).toHaveAttribute('data-mode', 'compact');
  await page.getByRole('button', { name: 'Open module navigation', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close modules', exact: true }).click();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.locator('.gt-app-navigation')).toHaveAttribute('data-mode', 'desktop');
  await page.setViewportSize({ width: 1024, height: 640 });
  await expect(page.locator('.gt-app-navigation')).toHaveAttribute('data-mode', 'compact');
  await page.setViewportSize({ width: 390, height: 780 });
  await expect(page.locator('.gt-mobile-dock')).toBeVisible();
});

test('3D physique viewer and inspector fit a short laptop and scaled desktop', async ({ page }) => {
  await setupHumanViewer(page, 'reduce');
  const viewer = page.locator('.chamber-canvas-wrap');
  await expect(viewer).toBeVisible({ timeout: 45000 });
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 640 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await viewer.scrollIntoViewIfNeeded();
    const bounds = await viewer.boundingBox();
    expect(bounds!.width).toBeGreaterThan(280);
    expect(bounds!.height).toBeGreaterThanOrEqual(280);
    expect(bounds!.height).toBeLessThan(viewport.height);
    await expect.poll(() => page.locator('#main-content').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`physique-${viewport.width}.png`) });
  }
});

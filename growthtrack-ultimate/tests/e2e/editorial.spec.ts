import { test, expect } from './foundation-fixture';

for (const width of [320, 390, 640, 1024, 1440, 1920]) {
  test(`editorial shell stays navigable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 640 ? 780 : 900 });
    await page.goto('/insights/overview');
    await expect(page.locator('.app-shell[data-ui-system="editorial"]')).toBeVisible();
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('#main-content h1, #main-content h2').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search all modules and records' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    if (width < 640) {
      const dock = page.getByRole('navigation', { name: 'Quick navigation' });
      await expect(dock).toBeVisible();
      await expect(dock.getByRole('link', { name: 'Finance' })).toBeVisible();
      await expect(dock.getByRole('link').first()).toHaveAccessibleName('Finance');
      await expect(dock.getByRole('button', { name: 'More' })).toBeVisible();
      const reserve = await page.evaluate(() => {
        const content = document.querySelector('#main-content');
        const dock = document.querySelector('.gt-mobile-dock');
        return { padding: parseFloat(getComputedStyle(content!).paddingBottom), dockHeight: dock!.getBoundingClientRect().height };
      });
      expect(reserve.padding).toBeGreaterThanOrEqual(reserve.dockHeight);
    } else {
      await expect(page.getByRole('navigation', { name: 'Product areas' })).toBeVisible();
      if (width < 1024) await expect(page.getByRole('navigation', { name: 'Insights modules' })).toHaveCount(0);
      else await expect(page.getByRole('navigation', { name: 'Insights modules' })).toBeVisible();
    }
    await page.screenshot({ path: test.info().outputPath(`home-${width}.png`), fullPage: false });
  });
}

test('no global fixed prompt or footer obscures finance content on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/finance/overview');
  await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.getByText('Net monthly balance')).toBeVisible();
  await expect(page.locator('.navbar-checkin-alert, .v3-context-footer')).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('finance-mobile.png'), fullPage: false });
});

import { test, expect } from './foundation-fixture';

for (const width of [320, 390, 640, 1024, 1440, 1920]) {
  test(`editorial shell stays navigable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 640 ? 780 : 900 });
    await page.goto('/insights/overview');
    await expect(page.locator('.app-shell[data-ui-system="editorial"]')).toBeVisible();
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('#main-content h1, #main-content h2').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search GrowthTrack' })).toBeVisible();
    const headerTop = await page.locator('.app-header').evaluate(element => element.getBoundingClientRect().top);
    expect(headerTop).toBeGreaterThanOrEqual(0);
    expect(headerTop, await page.evaluate(() => JSON.stringify([...document.querySelectorAll('body, #root, .app-shell, .main-area, .app-header')].map(element => {
      const style = getComputedStyle(element);
      return { element: element.id || element.className || element.tagName, top: element.getBoundingClientRect().top, margin: style.margin, padding: style.padding, position: style.position };
    })))).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    if (width < 640) {
      const dock = page.getByRole('navigation', { name: 'Quick navigation' });
      await expect(dock).toBeVisible();
      await expect(dock.getByRole('link', { name: 'Finance' })).toBeVisible();
      await expect(dock.getByRole('link').first()).toHaveAccessibleName('Customers');
      await expect(dock.getByRole('button', { name: 'Hub' })).toBeVisible();
      const reserve = await page.evaluate(() => {
        const content = document.querySelector('#main-content');
        const dock = document.querySelector('.gt-mobile-dock');
        return { padding: parseFloat(getComputedStyle(content!).paddingBottom), dockHeight: dock!.getBoundingClientRect().height };
      });
      expect(reserve.padding).toBeGreaterThanOrEqual(reserve.dockHeight);
    } else {
      if (width < 960) await page.getByRole('button', { name: 'Open module navigation', exact: true }).click();
      await expect(page.getByRole('navigation', { name: 'Product areas' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Workspace overview', exact: true })).toHaveAttribute('aria-current', 'page');
    }
    await page.screenshot({ path: test.info().outputPath(`home-${width}.png`), fullPage: false });
  });
}

test('no global fixed prompt or footer obscures finance content on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/finance/overview');
  await expect(page.locator('#main-content')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your money, in focus' })).toBeVisible();
  await expect(page.getByText('Net monthly balance')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add a transaction' })).toBeVisible();
  await expect(page.locator('.navbar-checkin-alert, .v3-context-footer')).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('finance-mobile.png'), fullPage: false });
});

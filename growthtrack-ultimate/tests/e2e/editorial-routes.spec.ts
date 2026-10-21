import { test, expect } from './foundation-fixture';

const routes = [
  ['/finance/transactions', 'finance-transactions'],
  ['/finance/analytics', 'finance-analytics'],
  ['/wellness/sleep', 'wellness-sleep'],
  ['/wellness/mind', 'wellness-mind'],
  ['/workspace/tasks', 'workspace-tasks'],
  ['/workspace/notes', 'workspace-notes'],
  ['/life/social', 'life-social'],
  ['/life/entertainment', 'life-entertainment'],
  ['/hub/agents', 'hub-agents'],
  ['/hub/settings', 'hub-settings'],
] as const;

for (const [path, name] of routes) {
  test(`${name} has a usable narrow layout`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto(path);
    await expect(page.locator('.app-shell[data-ui-system="editorial"]')).toBeVisible();
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('#main-content h1').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: false });
  });
}

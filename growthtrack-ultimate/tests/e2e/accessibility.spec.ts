import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './foundation-fixture';

for (const route of ['/workspace/overview', '/workspace/tasks', '/workspace/notes', '/finance/shopping']) {
  test(`WCAG accessibility scan ${route}`, async ({ page }, testInfo) => {
    await page.goto(route);
    await expect(page.locator('#main-content')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('#main-content h1').first()).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    await testInfo.attach('accessibility-results', { body: JSON.stringify(result), contentType: 'application/json' });
    expect(result.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) }))).toEqual([]);
  });
}

test('keyboard search opens, closes and restores focus', async ({ page }) => {
  await page.goto('/workspace/overview');
  const search = page.getByRole('button', { name: 'Search GrowthTrack' });
  await expect(search).toBeVisible();
  await search.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(search).toBeFocused();
});

test('Jev is reachable from a feature page and keeps missing credentials explicit', async ({ page }) => {
  await page.route('**/api/agents/decision/readiness', route => route.fulfill({ json: { enabled: true, configured: false, features: [] } }));
  await page.goto('/workspace/tasks');
  await page.getByRole('button', { name: 'AI guide, decision feature assistant', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Decision feature assistant' });
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/Enabled · setup needed/)).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Ask for advice', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(page.getByRole('button', { name: 'AI guide, decision feature assistant', exact: true })).toBeFocused();
});

test('technology planning is visible without claiming to provision a stack', async ({ page }) => {
  await page.goto('/workspace/tasks');
  await page.getByRole('button', { name: 'Stack technology customization', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Technology customization', exact: true });
  await expect(panel.getByText(/do not change the running stack/)).toBeVisible();
  await panel.getByRole('combobox', { name: 'Category', exact: true }).selectOption('Databases');
  await panel.getByRole('checkbox', { name: 'MongoDB', exact: true }).check();
  await expect(panel.getByRole('status')).toContainText('No infrastructure or data changed');
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

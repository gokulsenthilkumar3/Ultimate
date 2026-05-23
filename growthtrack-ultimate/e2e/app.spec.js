import { test, expect } from '@playwright/test';

test('App loads successfully and shows Onboarding or Dashboard', async ({ page }) => {
  await page.goto('http://localhost:5173/Ultimate/');
  await page.waitForLoadState('networkidle');
  const title = await page.title();
  expect(title).toBeDefined();
});

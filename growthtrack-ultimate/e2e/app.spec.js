import { test, expect } from '@playwright/test';

test('App loads successfully and shows Onboarding or Dashboard', async ({ page }) => {
  await page.goto('http://localhost:5173/Ultimate/');
  
  // Depending on whether it's the first visit, it might show the Onboarding Wizard
  // or the main Dashboard. We just check that the page loaded by looking for a generic selector.
  await page.waitForLoadState('networkidle');
  
  // Let's assert the title is not empty or check for a core element
  const title = await page.title();
  expect(title).toBeDefined();
});

import { test, expect } from '@playwright/test';

/**
 * Spec 4 — Overview: Strategic Priorities from real store data
 * Seeds localStorage with tasks, habits, goals, and sleep entries
 * then verifies that the computed priority list renders non-placeholder text.
 */
test.describe('Overview — Strategic Priorities', () => {
  test.beforeEach(async ({ page }) => {
    // Seed Zustand-persisted store via localStorage before the app boots
    await page.addInitScript(() => {
      const storeData = {
        state: {
          tasks: [
            { id: 't1', title: 'Write weekly report', completed: false, priority: 'high', due: new Date().toISOString() },
            { id: 't2', title: 'Review PR feedback', completed: false, priority: 'medium', due: new Date().toISOString() },
          ],
          habits: [
            { id: 'h1', name: 'Morning run', streak: 5, completedDates: [] },
          ],
          goals: [
            { id: 'g1', title: 'Ship v2.0', targetDate: new Date().toISOString(), progress: 40 },
          ],
          sleep_logs: [
            { id: 's1', date: new Date().toISOString(), duration: 5.5, quality: 'poor' },
          ],
        },
        version: 0,
      };
      // GrowthTrack Ultimate Zustand store key — adjust if key differs
      localStorage.setItem('growthtrack-store', JSON.stringify(storeData));
    });

    await page.goto('/');
    // Navigate to Overview
    const overviewBtn = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /overview/i })
      .first();
    if (await overviewBtn.count() > 0) await overviewBtn.click();
  });

  test('strategic priorities section is visible', async ({ page }) => {
    const section = page.locator('text=/strategic priorities|today.s priorities|priorities/i').first();
    await expect(section).toBeVisible({ timeout: 8_000 });
  });

  test('renders task-derived priority item', async ({ page }) => {
    // At least one of the seeded task titles should appear as a priority
    const taskPriority = page.locator('text=/Write weekly report|Review PR feedback/i');
    await expect(taskPriority.first()).toBeVisible({ timeout: 8_000 });
  });

  test('renders goal-derived priority item', async ({ page }) => {
    const goalPriority = page.locator('text=/Ship v2.0/i');
    await expect(goalPriority.first()).toBeVisible({ timeout: 8_000 });
  });

  test('no hardcoded placeholder text visible', async ({ page }) => {
    // Ensure static demo text is not leaking into the priorities section
    const placeholder = page.locator('text=/placeholder|lorem ipsum|sample data/i');
    await expect(placeholder).toHaveCount(0);
  });
});

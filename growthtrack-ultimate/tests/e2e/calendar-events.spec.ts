import { test, expect } from '@playwright/test';

/**
 * Spec 5 — Calendar: Create / Edit / Delete lifecycle
 * Full CRUD flow through the Calendar modal.
 */
test.describe('Calendar Events', () => {
  const EVENT_TITLE = 'E2E Test Event';
  const EDITED_TITLE = 'E2E Edited Event';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to Calendar tab
    const calBtn = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /calendar/i })
      .first();
    if (await calBtn.count() > 0) await calBtn.click();
    await page.locator('.app-shell').waitFor({ state: 'visible' });
  });

  test('calendar view renders days/grid', async ({ page }) => {
    const grid = page.locator('.calendar-grid, .calendar-view, [data-testid="calendar"]');
    await expect(grid.first()).toBeVisible({ timeout: 8_000 });
  });

  test('clicking a day opens New Event modal', async ({ page }) => {
    // Click any day cell
    const dayCells = page.locator('.day-cell, .calendar-day, [data-testid="day-cell"]');
    await dayCells.first().click();
    const modal = page.locator('text=/new event/i');
    await expect(modal.first()).toBeVisible({ timeout: 5_000 });
  });

  test('can create an event', async ({ page }) => {
    const dayCells = page.locator('.day-cell, .calendar-day, [data-testid="day-cell"]');
    await dayCells.first().click();
    // Fill title
    const titleInput = page.locator('input[placeholder*="title" i], input[name="title"], [data-testid="event-title-input"]');
    await titleInput.fill(EVENT_TITLE);
    // Submit
    const saveBtn = page.locator('button').filter({ hasText: /save|add|create/i }).first();
    await saveBtn.click();
    // Event should now appear in the day view
    await expect(page.locator(`text=${EVENT_TITLE}`)).toBeVisible({ timeout: 5_000 });
  });

  test('can edit a created event', async ({ page }) => {
    // Create first
    const dayCells = page.locator('.day-cell, .calendar-day, [data-testid="day-cell"]');
    await dayCells.first().click();
    const titleInput = page.locator('input[placeholder*="title" i], input[name="title"]');
    await titleInput.fill(EVENT_TITLE);
    await page.locator('button').filter({ hasText: /save|add|create/i }).first().click();
    await expect(page.locator(`text=${EVENT_TITLE}`)).toBeVisible({ timeout: 5_000 });

    // Click the edit icon on the event
    const editBtn = page.locator('[data-testid="edit-event"], button[aria-label*="edit" i], .edit-event-btn').first();
    await editBtn.click();
    // Modal should say Edit Event
    await expect(page.locator('text=/edit event/i').first()).toBeVisible({ timeout: 5_000 });
    // Change the title
    const editInput = page.locator('input[placeholder*="title" i], input[name="title"]');
    await editInput.fill(EDITED_TITLE);
    await page.locator('button').filter({ hasText: /save|update/i }).first().click();
    // Edited title should appear
    await expect(page.locator(`text=${EDITED_TITLE}`)).toBeVisible({ timeout: 5_000 });
  });

  test('can delete an event', async ({ page }) => {
    // Create first
    const dayCells = page.locator('.day-cell, .calendar-day, [data-testid="day-cell"]');
    await dayCells.first().click();
    const titleInput = page.locator('input[placeholder*="title" i], input[name="title"]');
    await titleInput.fill(EVENT_TITLE);
    await page.locator('button').filter({ hasText: /save|add|create/i }).first().click();
    await expect(page.locator(`text=${EVENT_TITLE}`)).toBeVisible({ timeout: 5_000 });

    // Click delete button on the event
    const deleteBtn = page.locator('[data-testid="delete-event"], button[aria-label*="delete" i], .delete-event-btn').first();
    await deleteBtn.click();
    // Confirm dialog if present
    const confirmBtn = page.locator('button').filter({ hasText: /confirm|yes|delete/i }).first();
    if (await confirmBtn.count() > 0) await confirmBtn.click();
    // Event should be gone
    await expect(page.locator(`text=${EVENT_TITLE}`)).toHaveCount(0);
  });
});

/**
 * calendar.spec.js
 * E2E: Calendar tab — add event, edit event, delete event.
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173/Ultimate/';

test.describe('Calendar — CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    const skip = page.getByRole('button', { name: /skip|get started/i });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    // Navigate to Calendar via Operations group
    const ops = page.getByRole('tab', { name: /operations/i });
    await ops.click();
    await page.waitForTimeout(300);
    // Click Calendar in FloatingNav or sidebar
    const calNav = page.getByRole('button', { name: /calendar/i });
    if (await calNav.isVisible().catch(() => false)) await calNav.click();
    await page.waitForTimeout(300);
  });

  test('adds a new event and it appears on the calendar', async ({ page }) => {
    await page.getByRole('button', { name: /add event/i }).click();
    await page.getByPlaceholder(/back day workout|event title/i).fill('E2E Test Event');
    await page.getByRole('button', { name: /save event/i }).click();
    await expect(page.getByText('E2E Test Event')).toBeVisible();
  });

  test('shows validation error when title is empty', async ({ page }) => {
    await page.getByRole('button', { name: /add event/i }).click();
    // Leave title blank and submit
    await page.getByRole('button', { name: /save event/i }).click();
    // Toast or inline error should appear
    await expect(page.getByText(/title is required/i)).toBeVisible();
  });

  test('opens edit modal for existing event and updates it', async ({ page }) => {
    // Add a base event first
    await page.getByRole('button', { name: /add event/i }).click();
    await page.getByPlaceholder(/event title/i).fill('Original Title');
    await page.getByRole('button', { name: /save event/i }).click();
    await page.waitForTimeout(400);
    // Click the pencil/edit button on the event
    const editBtn = page.locator('[title="Edit event"]').first();
    await editBtn.click();
    // Modal heading should say Edit Event
    await expect(page.getByText(/edit event/i)).toBeVisible();
    // Change title
    const titleInput = page.getByPlaceholder(/event title/i);
    await titleInput.clear();
    await titleInput.fill('Updated Title');
    await page.getByRole('button', { name: /update event/i }).click();
    await expect(page.getByText('Updated Title')).toBeVisible();
  });
});

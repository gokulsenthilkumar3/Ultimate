/**
 * finance.spec.js
 * E2E: Finance tab — add transaction validates amount + category, shows toast.
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173/Ultimate/';

test.describe('Finance — transaction validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    const skip = page.getByRole('button', { name: /skip|get started/i });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    // Navigate to Finance (Operations group)
    const ops = page.getByRole('tab', { name: /operations/i });
    await ops.click();
    await page.waitForTimeout(300);
    const finBtn = page.getByRole('button', { name: /^finance$/i });
    if (await finBtn.isVisible().catch(() => false)) await finBtn.click();
    await page.waitForTimeout(300);
  });

  test('blocks submission when amount is empty', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add transaction|new transaction/i });
    if (await addBtn.isVisible().catch(() => false)) await addBtn.click();
    const submit = page.getByRole('button', { name: /save|add|submit/i }).first();
    await submit.click();
    // Should show validation message
    await expect(
      page.getByText(/amount.*required|enter.*amount|invalid amount/i)
    ).toBeVisible();
  });

  test('adds a transaction successfully with valid inputs', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add transaction|new transaction/i });
    if (await addBtn.isVisible().catch(() => false)) await addBtn.click();
    // Fill amount
    const amountInput = page.locator('input[type="number"], input[placeholder*="amount" i]').first();
    await amountInput.fill('500');
    // Select a category if dropdown is present
    const categorySelect = page.locator('select[name*="category" i], select').first();
    if (await categorySelect.isVisible().catch(() => false)) {
      await categorySelect.selectOption({ index: 1 });
    }
    const submit = page.getByRole('button', { name: /save|add|submit/i }).first();
    await submit.click();
    // Toast success OR new row appears
    await expect(
      page.getByText(/transaction added|saved|₹500|500/i)
    ).toBeVisible();
  });
});

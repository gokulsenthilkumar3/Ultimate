import { test, expect, OWNER, emptyState } from './foundation-fixture';
import { surfaces, paintedCanvas } from './helpers/human-viewer';

test('model fit measures neutral contours with separate Current/Goal targets and invalidates old results', async ({ page }) => {
  test.setTimeout(150000);
  let body: any = { heightCm: 175, weightKg: 74, chestCm: 98, waistCm: 82, hipCm: 98, modelPreset: 'male', biologicalSex: 'male' };
  let targets: any = { goalMetrics: { waist: 76 }, viewerPreferences: { showStage: false, backgroundMode: 'color', backgroundColor: '#20242b' } };
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(url => ['/api/state','/api/body-profile','/api/physique_targets'].includes(url.pathname), async route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== 'GET') {
      const payload = route.request().postDataJSON();
      if (path === '/api/body-profile') { body = { ...body, ...payload }; return route.fulfill({ json: body }); }
      targets = payload; return route.fulfill({ json: targets });
    }
    return route.fulfill({ json: path === '/api/body-profile' ? body : { ...emptyState(), user: { ...OWNER, dob: '1990-01-01', physiqueTargets: targets }, bodyProfile: body } });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/wellness/physique?view=3d');
  const canvas = page.locator('.chamber-canvas-wrap canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await surfaces(canvas, 45000)).length, { timeout: 45000 }).toBe(5);
  await page.getByRole('tab', { name: 'Measure', exact: true }).click();
  await page.getByText('Model fit', { exact: true }).click();
  const check = page.getByRole('button', { name: 'Check model measurements' });
  await expect(check).toBeEnabled(); await check.click();
  const report = page.getByRole('region', { name: 'Model measurement results' });
  await expect(report).toContainText('Entered: 82 cm');
  await expect(report).not.toContainText('Unavailable');
  const waist = report.locator('.model-measurement-check__row').filter({ hasText: 'Waist' });
  const modelBefore = await waist.locator('dd').nth(1).textContent();
  const waistInput = page.getByRole('textbox', { name: 'Current Waist (cm)', exact: true });
  await waistInput.fill('100'); await waistInput.press('Enter');
  await expect(report).toHaveCount(0);
  await expect.poll(() => body.waistCm).toBe(100);
  await check.click();
  await expect(waist).toContainText('Entered: 100 cm');
  await expect(waist.locator('dd').nth(1)).not.toHaveText(modelBefore!);
  await page.getByRole('button', { name: 'Goal measurements', exact: true }).click();
  await expect(report).toHaveCount(0); await check.click();
  await expect(report).toContainText('Entered: 76 cm');
  await expect(report.locator('.model-measurement-check__row').filter({ hasText: 'Chest' })).toContainText('Entered: Not recorded');
  await page.setViewportSize({ width: 390, height: 844 });
  await report.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await report.screenshot({ path: test.info().outputPath('model-measurements-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await paintedCanvas(canvas, test.info().outputPath('measured-model.png'));
  expect(errors).toEqual([]);
});

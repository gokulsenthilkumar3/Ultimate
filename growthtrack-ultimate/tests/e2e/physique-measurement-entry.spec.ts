import { test, expect, OWNER, emptyState } from './foundation-fixture';

test('typed 3D measurements validate, reshape the avatar, and persist canonical values', async ({ page }) => {
  let body: any = { heightCm: 175, weightKg: 74, bodyFatPct: 19, waistCm: 88, chestCm: 99, hipsCm: 96, shouldersCm: 112, armsCm: 33, neckCm: 37, targetWaistCm: 82, modelPreset: 'male', biologicalSex: 'male' };
  let targets: any = {};
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(url => ['/api/state', '/api/body-profile', '/api/physique_targets'].includes(url.pathname), route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') {
      const payload = request.postDataJSON();
      if (path === '/api/body-profile') body = { ...body, ...payload };
      if (path === '/api/physique_targets') targets = payload;
      return route.fulfill({ json: payload });
    }
    return route.fulfill({ json: { ...emptyState(), user: { ...OWNER, dob: '1990-01-01', physiqueTargets: targets }, bodyProfile: body, metric_logs: [{ id: 'baseline', date: '2026-09-01', metric: 'physique_snapshot', metrics: { height: 175, waist: 92 } }] } });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/wellness/physique?view=3d');
  const canvas = page.locator('.chamber-canvas-wrap canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-position', /.+/, { timeout: 45000 });
  await page.getByRole('tab', { name: 'Measure', exact: true }).click();
  const height = page.getByRole('textbox', { name: 'Current Height (cm)', exact: true });
  await height.fill('400 cm');
  await height.press('Enter');
  await expect(height).toHaveAttribute('aria-invalid', 'true');
  expect(body.heightCm).toBe(175);
  await height.fill('5 ft 10 in');
  await height.press('Enter');
  await expect.poll(() => body.heightCm).toBe(177.8);
  await expect(height).toHaveValue('177.8');
  const waist = page.getByRole('textbox', { name: 'Current Waist (cm)', exact: true });
  await waist.fill('98,5 cm');
  await waist.press('Enter');
  await expect.poll(() => body.waistCm).toBe(98.5);
  await waist.fill('88 cm');
  await waist.press('Enter');
  await expect.poll(() => body.waistCm).toBe(88);
  await expect(page.getByText('40% there · 6 cm to go', { exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Waist goal progress', exact: true })).toHaveAttribute('value', '40');
  await waist.press('Shift+ArrowDown');
  await expect(waist).toHaveValue('83');
  await waist.press('Escape');
  await expect(waist).toHaveValue('88');
  await page.screenshot({ path: test.info().outputPath('typed-measurements-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await waist.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('typed-measurements-mobile.png'), fullPage: true });
  expect(errors).toEqual([]);
});

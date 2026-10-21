import { test, expect, OWNER, emptyState } from './foundation-fixture';
import path from 'node:path';

test('adult pelvis model renders front, side, back and oblique studies', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto(`/scripts/review-pelvis.html${process.env.MODEL_REVIEW_ASSET ? `?asset=${encodeURIComponent(process.env.MODEL_REVIEW_ASSET)}` : ''}`);
  await page.waitForFunction(() => window['pelvisReview']?.ready);
  const stage = process.env.MODEL_REVIEW_STAGE || 'after';
  for (const view of ['front', 'side', 'back', 'oblique']) {
    await page.evaluate(view => window['pelvisReview'].setView(view), view);
    await page.locator('canvas').screenshot({ path: path.resolve('.tmp/anatomy-realism-review', `${stage}-${view}.png`) });
  }
  expect(await page.evaluate(() => window['pelvisReview'].inspect().anatomyVertices)).toBeGreaterThan(2000);
  expect(errors).toEqual([]);
});

test('live mirror renders the refined anatomy for an adult and retains the covered session default', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/Shader Error|VALIDATE_STATUS|gl.getProgramInfoLog/.test(message.text())) errors.push(message.text()); });
  const body = { heightCm: 175, weightKg: 74, bodyFatPct: 19, waistCm: 82, chestCm: 99, hipsCm: 96, glutesCm: 96, shouldersCm: 112, armsCm: 33, neckCm: 37, modelPreset: 'male', biologicalSex: 'male', anatomyLengthCm: 9.2, anatomyGirthCm: 9.3 };
  let targets = { privateMetrics: { anatomyLengthCm: 9.2, anatomyGirthCm: 9.3 } };
  await page.route(url => url.pathname === '/api/state', route => route.fulfill({ json: { ...emptyState(), user: { ...OWNER, dob: '1990-01-01', physiqueTargets: targets }, bodyProfile: body } }));
  await page.route(url => url.pathname === '/api/body-profile', route => route.fulfill({ json: { ...body, ...route.request().postDataJSON() } }));
  await page.route(url => url.pathname === '/api/physique_targets', route => { targets = route.request().postDataJSON(); return route.fulfill({ json: targets }); });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/wellness/physique?view=3d');
  await page.getByRole('tablist', { name: 'Avatar editor' }).getByRole('tab', { name: 'Anatomy', exact: true }).click();
  const reveal = page.getByRole('button', { name: 'Anatomical mode', exact: true });
  await expect(reveal).toBeEnabled({ timeout: 30000 });
  await reveal.click();
  await expect(page.getByRole('button', { name: 'Wear underwear', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Resting length current (cm)', { exact: true })).toHaveValue('9.2');
  await page.getByLabel('Resting length current (cm)', { exact: true }).fill('10');
  await page.getByLabel('Resting length current (cm)', { exact: true }).press('Tab');
  await expect.poll(() => targets.privateMetrics.anatomyLengthCm).toBe(10);
  await page.locator('.chamber-viewport').scrollIntoViewIfNeeded();
  await page.locator('.chamber-viewport').screenshot({ path: path.resolve('.tmp/anatomy-realism-review/live-mirror.png') });
  await page.getByRole('button', { name: 'Wear underwear', exact: true }).click();
  await expect(reveal).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await page.getByRole('tablist', { name: 'Avatar editor' }).getByRole('tab', { name: 'Anatomy', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Anatomical mode', exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

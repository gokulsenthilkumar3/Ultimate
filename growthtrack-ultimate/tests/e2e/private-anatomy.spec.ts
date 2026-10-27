import { test, expect, OWNER, emptyState } from './foundation-fixture';
import path from 'node:path';

test('adult anatomy renders front, side, back, oblique and underside studies', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto(`/scripts/review-private-anatomy.html${process.env.MODEL_REVIEW_ASSET ? `?asset=${encodeURIComponent(process.env.MODEL_REVIEW_ASSET)}` : ''}`);
  await page.waitForFunction(() => window['pelvisReview']?.ready);
  const stage = process.env.MODEL_REVIEW_STAGE || 'after';
  for (const view of ['front', 'side', 'back', 'oblique', 'opposite', 'underside']) {
    await page.evaluate(view => window['pelvisReview'].setView(view), view);
    await page.locator('canvas').screenshot({ path: path.resolve('.tmp/anatomy-realism-review', `${stage}-${view}.png`) });
    if (view !== 'back') {
      await page.evaluate(view => window['pelvisReview'].setView(view, true), view);
      await page.locator('canvas').screenshot({ path: path.resolve('.tmp/anatomy-realism-review', `${stage}-${view}-close.png`) });
    }
  }
  await page.evaluate(()=>window['pelvisReview'].setSurface('clay'));
  for(const view of ['front','oblique','side','underside']){
    await page.evaluate(view=>window['pelvisReview'].setView(view,true),view);
    await page.locator('canvas').screenshot({path:path.resolve('.tmp/anatomy-realism-review',`${stage}-clay-${view}.png`)});
  }
  await page.evaluate(()=>window['pelvisReview'].setLighting('grazing'));
  await page.locator('canvas').screenshot({path:path.resolve('.tmp/anatomy-realism-review',`${stage}-clay-grazing.png`)});
  expect(await page.evaluate(() => window['pelvisReview'].inspect().anatomyVertices)).toBeGreaterThan(2000);
  expect(errors).toEqual([]);
});

test('layered adult anatomy renders coverage and retraction without shader errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/Shader Error|VALIDATE_STATUS|gl.getProgramInfoLog/.test(message.text())) errors.push(message.text()); });
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/scripts/review-private-anatomy.html');
  await page.waitForFunction(() => window['pelvisReview']?.ready);
  for (const state of ['resting', 'erect']) for (const retraction of [0, 50, 100]) {
    const evidence = await page.evaluate(({ state, retraction }) => window['pelvisReview'].setAnatomy({
      penis: { [state]: { shape: { foreskinCoverage: 100, foreskinRetraction: retraction } } },
      scrotum:{fitMode:'guides',leftTestis:{lengthCm:4.5,widthCm:3,depthCm:2.5},rightTestis:{lengthCm:3.5,widthCm:2.5,depthCm:2}},
    }, { state }), { state, retraction });
    expect(evidence.tissues.pelvis).toBe('stitched-body-boundary');
    expect(evidence.scrotumFit).toMatchObject({mode:'guides',status:'contained-at-samples',sampleCount:52});
    for (const view of ['oblique', 'underside']) {
      await page.evaluate(view => window['pelvisReview'].setView(view, true), view);
      await page.locator('canvas').screenshot({ path: path.resolve('.tmp/anatomy-realism-review', `layers-${state}-${retraction}-${view}.png`) });
    }
  }
  await page.evaluate(() => window['pelvisReview'].setRenderMode('delta'));
  expect(await page.evaluate(() => window['pelvisReview'].inspect().pelvicMaterialShared)).toBe(true);
  await page.locator('canvas').screenshot({ path: path.resolve('.tmp/anatomy-realism-review', 'layers-delta.png') });
  await page.evaluate(() => window['pelvisReview'].setRenderMode('normal'));
  expect(errors).toEqual([]);
});

test('live mirror renders the refined anatomy for an adult and retains the covered session default', async ({ page }) => {
  // This flow now loads the model twice and reopens the adult editor to verify
  // guide-fit persistence. Individual readiness and save assertions stay bounded.
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/Shader Error|VALIDATE_STATUS|gl.getProgramInfoLog/.test(message.text())) errors.push(message.text()); });
  const body = { heightCm: 175, weightKg: 74, bodyFatPct: 19, waistCm: 82, chestCm: 99, hipsCm: 96, glutesCm: 96, shouldersCm: 112, armsCm: 33, neckCm: 37, modelPreset: 'male', biologicalSex: 'male', anatomyLengthCm: 9.2, anatomyGirthCm: 9.3 };
  let targets: Record<string, any> = { privateMetrics: { anatomyLengthCm: 9.2, anatomyGirthCm: 9.3 } };
  await page.route(url => url.pathname === '/api/state', route => route.fulfill({ json: { ...emptyState(), user: { ...OWNER, dob: '1990-01-01', physiqueTargets: targets }, bodyProfile: body } }));
  await page.route(url => url.pathname === '/api/body-profile', route => route.fulfill({ json: { ...body, ...route.request().postDataJSON() } }));
  await page.route(url => url.pathname === '/api/physique_targets', route => { targets = route.request().postDataJSON(); return route.fulfill({ json: targets }); });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/wellness/physique?view=3d');
  const canvas=page.locator('.chamber-canvas-wrap canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-position', /.+/, { timeout: 45000 });
  await page.getByRole('tablist', { name: 'Avatar editor' }).getByRole('tab', { name: 'Anatomy', exact: true }).click();
  const reveal = page.getByRole('button', { name: 'Anatomical mode', exact: true });
  await expect(reveal).toBeEnabled({ timeout: 30000 });
  await reveal.click();
  await expect(page.getByRole('button', { name: 'Wear underwear', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Resting length current (cm)', { exact: true })).toHaveValue('9.2');
  await page.getByLabel('Resting length current (cm)', { exact: true }).fill('10');
  await page.getByLabel('Resting length current (cm)', { exact: true }).press('Tab');
  await expect.poll(() => targets.privateMetrics.anatomyLengthCm).toBe(10);
  await page.getByRole('button',{name:'Scrotum',exact:true}).click();
  await page.getByRole('combobox',{name:'Scrotal envelope mode'}).selectOption('guides');
  await page.getByLabel('Left testicle length current (cm)',{exact:true}).fill('4.5');
  await page.getByLabel('Left testicle length current (cm)',{exact:true}).press('Tab');
  await page.getByText('Left guide placement',{exact:true}).click();
  await page.getByRole('slider',{name:'Left guide vertical offset',exact:true}).fill('0.3');
  await page.getByRole('checkbox',{name:'Mirror guide placement'}).check();
  await expect.poll(()=>targets.anatomyV2?.current?.scrotum).toMatchObject({fitMode:'guides',mirrorPlacement:true,leftTestis:{lengthCm:4.5,placement:{verticalCm:.3}}});
  await expect(page.getByLabel('Scrotal fit result')).toContainText('52 samples');
  await page.locator('.chamber-viewport').scrollIntoViewIfNeeded();
  await page.locator('.chamber-viewport').screenshot({ path: path.resolve('.tmp/anatomy-realism-review/live-mirror.png') });
  await page.getByRole('button', { name: 'Wear underwear', exact: true }).click();
  await expect(reveal).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await page.getByRole('tablist', { name: 'Avatar editor' }).getByRole('tab', { name: 'Anatomy', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-camera-position', /.+/, { timeout: 45000 });
  await expect(page.getByRole('button', { name: 'Anatomical mode', exact: true })).toHaveAttribute('aria-pressed', 'false', { timeout: 30000 });
  await page.getByRole('button', { name: 'Anatomical mode', exact: true }).click();
  await page.getByRole('button',{name:'Scrotum',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Scrotal envelope mode'})).toHaveValue('guides');
  await expect(page.getByLabel('Left testicle length current (cm)',{exact:true})).toHaveValue('4.5');
  await expect(page.getByRole('checkbox',{name:'Mirror guide placement'})).toBeChecked();
  expect(errors).toEqual([]);
});

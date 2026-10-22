import { test, expect } from './foundation-fixture';
import { setupHumanViewer, bodySurface, surfaces } from './helpers/human-viewer';
import { readFile } from 'node:fs/promises';

test('tan lines render independently of base colour and today’s clothing, persist and reset', async ({ page }) => {
  const { canvas, errors, targets, bodyWrites } = await setupHumanViewer(page, 'reduce', { skinTone: 'II', skinColor: '#d8ac91' });
  await page.getByRole('tab', { name: 'Skin', exact: true }).click();
  await page.getByRole('button', { name: 'Lock neutral inspection lighting', exact: true }).click();
  await page.getByRole('slider', { name: 'Tan amount', exact: true }).press('End');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await bodySurface(canvas)).skinLayers).toEqual([.5, 0, 0]);
  const initialMaps = (await surfaces(canvas)).map(item => ({ name: item.name, map: item.map, normalMap: item.normalMap }));
  // Saved render pairs also receive a pixel-region check below. Camera, pose,
  // lighting and base colour remain identical throughout the pair.
  await canvas.screenshot({ path: test.info().outputPath('tan-no-pattern.png') });
  const unmasked = (await canvas.screenshot()).toString('base64');
  await page.getByRole('combobox', { name: 'Tan-line pattern', exact: true }).selectOption('tank');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await bodySurface(canvas))?.tanPattern, { timeout: 30000 }).toBe('tank');
  await expect.poll(() => targets().appearanceMetrics?.skinTanPattern).toBe('tank');
  expect((await bodySurface(canvas)).baseColor).toBe('d8ac91');
  const protectedSkin = (await canvas.screenshot({ path: test.info().outputPath('tan-tank-pattern.png') })).toString('base64');
  const difference = await page.evaluate(async ({ first, second }) => {
    async function pixels(data: string) {
      const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
      const copy = document.createElement('canvas'); copy.width = image.width; copy.height = image.height;
      const ctx = copy.getContext('2d')!; ctx.drawImage(image, 0, 0);
      return { data: ctx.getImageData(0, 0, copy.width, copy.height).data, width: copy.width, height: copy.height };
    }
    const a = await pixels(first), b = await pixels(second);
    let lighter = 0, darker = 0, unchanged = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      const delta = b.data[i] + b.data[i+1] + b.data[i+2] - a.data[i] - a.data[i+1] - a.data[i+2];
      if (delta > 8) lighter++; else if (delta < -8) darker++; else unchanged++;
    }
    return { lighter, darker, unchanged, count: a.width * a.height };
  }, { first: unmasked, second: protectedSkin });
  expect(difference.lighter).toBeGreaterThan(300);
  expect(difference.darker).toBeLessThan(difference.lighter * .1);
  expect(difference.unchanged / difference.count).toBeGreaterThan(.7);

  await page.getByRole('tab', { name: 'Clothing', exact: true }).click();
  await page.getByRole('button', { name: 'Gym', exact: true }).click();
  await page.getByRole('tab', { name: 'Skin', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Tan-line pattern' })).toHaveValue('tank');
  await canvas.scrollIntoViewIfNeeded();
  expect((await bodySurface(canvas)).tanPattern).toBe('tank');
  await page.getByRole('tab', { name: 'Clothing', exact: true }).click();
  await page.getByRole('button', { name: 'Underwear', exact: true }).click();
  await page.getByRole('tab', { name: 'Skin', exact: true }).click();
  for (const id of ['swim', 'tee', 'long', 'tank']) {
    await page.getByRole('combobox', { name: 'Tan-line pattern' }).selectOption(id);
    await canvas.scrollIntoViewIfNeeded();
    await expect.poll(async () => (await bodySurface(canvas)).tanPattern).toBe(id);
  }
  await page.getByRole('button', { name: 'Chest', exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-focus', 'chest');
  await expect.poll(async () => canvas.getAttribute('data-camera-region-geometry')).toBe((await bodySurface(canvas)).geometry);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await canvas.screenshot({ path: test.info().outputPath('tan-tank-detail.png') });
  expect((await surfaces(canvas)).map(item => ({ name: item.name, map: item.map, normalMap: item.normalMap }))).toEqual(initialMaps);
  await expect.poll(() => targets().appearanceMetrics?.skinTanPattern).toBe('tank');
  await page.reload();
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-position', /.+/, { timeout: 45000 });
  await page.getByRole('tab', { name: 'Skin', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Tan-line pattern' })).toHaveValue('tank');
  await expect(page.getByRole('slider', { name: 'Tan amount' })).toHaveValue('1');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await bodySurface(canvas))?.tanPattern, { timeout: 30000 }).toBe('tank');
  const drawingWidth = await canvas.evaluate(element => (element as HTMLCanvasElement).width);
  const preview = (await canvas.screenshot()).toString('base64');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloading; expect(download.suggestedFilename()).toMatch(/\.png$/);
  await download.saveAs(test.info().outputPath('tan-protected-export.png'));
  const exported = (await readFile(test.info().outputPath('tan-protected-export.png'))).toString('base64');
  const capture = await page.evaluate(async ({ preview, exported }) => {
    const load = async (data: string) => { const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode(); return image; };
    const [a, b] = await Promise.all([load(preview), load(exported)]);
    const pixels = (image: HTMLImageElement) => {
      const copy = document.createElement('canvas'); copy.width = a.width; copy.height = a.height;
      const ctx = copy.getContext('2d')!; ctx.drawImage(image, 0, 0, a.width, a.height);
      return ctx.getImageData(0, 0, a.width, a.height).data;
    };
    const first = pixels(a), second = pixels(b);
    let error = 0, channels = 0;
    // The central torso includes the protected skin region in the full view.
    for (let y = Math.floor(a.height * .33); y < a.height * .45; y++) for (let x = Math.floor(a.width * .46); x < a.width * .54; x++) {
      const i = (y * a.width + x) * 4;
      for (let c = 0; c < 3; c++) { error += Math.abs(first[i+c] - second[i+c]); channels++; }
    }
    return { error: error / channels, previewWidth: a.width, exportWidth: b.width };
  }, { preview, exported });
  // Playwright rounds the CSS clipping rectangle; the actual render buffer
  // can be one pixel narrower. Export is scaled from that physical buffer.
  expect(capture.exportWidth).toBeGreaterThanOrEqual(drawingWidth * 2);
  expect(capture.error).toBeLessThan(8);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('combobox', { name: 'Tan-line pattern' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('tan-controls-mobile.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('combobox', { name: 'Skin undertone' }).selectOption('cool');
  await page.getByRole('slider', { name: 'Skin flush' }).press('End');
  await page.getByRole('button', { name: 'Reset tan, flush & undertone' }).click();
  await expect.poll(() => targets().appearanceMetrics).toMatchObject({ skinTan: 0, skinFlush: 0, skinUndertone: 'neutral', skinTanPattern: 'none', skinColor: '#d8ac91' });
  expect(bodyWrites.every(payload => !Object.keys(payload as object).some(key => ['skinTan', 'skinFlush', 'skinTanPattern'].includes(key)))).toBe(true);
  expect(errors).toEqual([]);
});

test('current and goal keep distinct skin layers through comparison and quality changes', async ({ page }) => {
  const { canvas, targets, errors, holdNextBodyWrite } = await setupHumanViewer(page, 'reduce', { skinTone: 'IV', skinColor: '#ac7d63', skinTan: .7, skinTanPattern: 'tank' });
  const modes = page.getByRole('group', { name: 'Comparison mode', exact: true });
  await modes.getByRole('button', { name: 'Goal', exact: true }).click();
  await page.getByRole('tab', { name: 'Skin', exact: true }).click();
  const saving = holdNextBodyWrite();
  await page.getByRole('combobox', { name: 'Tan-line pattern' }).selectOption('swim');
  await saving.entered;
  await page.getByRole('slider', { name: 'Tan amount' }).press('Home');
  await page.getByRole('slider', { name: 'Tan amount' }).press('ArrowRight');
  await page.getByRole('combobox', { name: 'Skin undertone' }).selectOption('warm');
  saving.release();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => targets().goalMetrics).toMatchObject({ skinTan: .01, skinTanPattern: 'swim', skinUndertone: 'warm' });
  await modes.getByRole('button', { name: 'Compare', exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await surfaces(canvas)).filter(item => item.eyelids).map(item => ({ tanPattern: item.tanPattern, skinLayers: item.skinLayers }))).toEqual([
    { tanPattern: 'tank', skinLayers: [.7, 0, 0] }, { tanPattern: 'swim', skinLayers: [.01, 1, 0] },
  ]);
  await canvas.screenshot({ path: test.info().outputPath('tan-current-goal.png') });
  await modes.getByRole('button', { name: 'Current', exact: true }).click();
  await page.getByRole('tab', { name: 'View', exact: true }).click();
  const before = (await bodySurface(canvas)).geometry;
  await page.getByLabel('Model quality', { exact: true }).selectOption('high');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => { const body = await bodySurface(canvas); return body?.geometry !== before && body?.tanPattern === 'tank'; }, { timeout: 30000 }).toBe(true);
  await page.getByLabel('Model quality', { exact: true }).selectOption('performance');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-quality-tier', 'LOW');
  await expect.poll(async () => (await bodySurface(canvas)).tanPattern).toBe('tank');
  await page.getByRole('tab', { name: 'Skin', exact: true }).click();
  await page.getByRole('button', { name: 'Reset tan, flush & undertone' }).click();
  await expect.poll(() => targets().appearanceMetrics?.skinTan).toBe(0);
  expect(targets().goalMetrics).toMatchObject({ skinTan: .01, skinTanPattern: 'swim', skinUndertone: 'warm' });
  expect(errors).toEqual([]);
});

test('failed physique saves preserve the draft and retry without losing background preferences', async ({ page }) => {
  const { canvas, targets, errors, failNextBodyWrite } = await setupHumanViewer(page, 'reduce', { skinTone: 'IV', skinColor: '#ac7d63', skinTan: .4, skinTanPattern: 'tank', skinUndertone: 'constructor' });
  await page.getByRole('tab', { name: 'Skin', exact: true }).click();
  failNextBodyWrite();
  await page.getByRole('combobox', { name: 'Tan-line pattern' }).selectOption('tee');
  await page.getByRole('slider', { name: 'Tan amount' }).press('End');
  const retry = page.getByRole('button', { name: 'Retry physique save', exact: true });
  await expect(retry).toBeVisible();
  await retry.scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('review-20-save-retry.png') });
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await bodySurface(canvas))?.skinLayers).toEqual([1, 0, 0]);
  expect((await bodySurface(canvas)).tanPattern).toBe('tee');
  expect(targets().appearanceMetrics).toMatchObject({ skinTan: .4, skinTanPattern: 'tank' });
  await page.getByRole('tab', { name: 'View', exact: true }).click();
  await page.getByLabel('Model background', { exact: true }).selectOption('space');
  await page.getByLabel('Space sky', { exact: true }).selectOption('nebula');
  await expect.poll(() => targets().viewerPreferences?.spaceSky).toBe('nebula');
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(retry).toHaveCount(0);
  await expect.poll(() => targets().appearanceMetrics).toMatchObject({ skinTan: 1, skinTanPattern: 'tee', skinColor: '#ac7d63' });
  expect(targets().viewerPreferences.spaceSky).toBe('nebula');
  await page.reload();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await bodySurface(canvas))?.tanPattern, { timeout: 45000 }).toBe('tee');
  await expect(canvas).toHaveAttribute('data-space-sky', 'nebula');
  expect((await bodySurface(canvas)).skinLayers).toEqual([1, 0, 0]);
  expect(errors).toEqual([]);
});

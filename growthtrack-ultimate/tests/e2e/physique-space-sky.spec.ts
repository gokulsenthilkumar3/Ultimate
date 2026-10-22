import { readFile } from 'node:fs/promises';
import { test, expect, OWNER, emptyState } from './foundation-fixture';

test('space skies render, persist, change quality and survive protected image capture', async ({ page }) => {
  let targets: any = { viewerPreferences: { showStage: false, qualityPreference: 'balanced' } };
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /THREE|shader|WebGL/i.test(message.text())) errors.push(message.text()); });
  await page.route(url => ['/api/state','/api/physique_targets'].includes(url.pathname), route => {
    if (route.request().method() !== 'GET') {
      targets = route.request().postDataJSON();
      return route.fulfill({ json: targets });
    }
    return route.fulfill({ json: { ...emptyState(), user: { ...OWNER, physiqueTargets: targets }, bodyProfile: { heightCm:175, weightKg:74, modelPreset:'male', biologicalSex:'male' } } });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width:1440, height:1050 });
  await page.goto('/wellness/physique?view=3d');
  const canvas = page.locator('.chamber-canvas-wrap canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-position', /.+/, { timeout:45000 });
  await page.getByRole('tab', { name:'View', exact:true }).click();
  await page.getByLabel('Model background', { exact:true }).selectOption('space');
  const images = new Set<string>();
  for (const id of ['orbit','nebula','deep-field','aurora','void-studio']) {
    await page.getByLabel('Space sky', { exact:true }).selectOption(id);
    await expect(canvas).toHaveAttribute('data-space-sky',id);
    await expect.poll(() => targets.viewerPreferences?.spaceSky).toBe(id);
    await canvas.scrollIntoViewIfNeeded();
    // Each preset must produce different actual pixels, even with reduced motion.
    images.add((await canvas.screenshot({ path:test.info().outputPath(`${id}.png`) })).toString('base64'));
  }
  expect(images.size).toBe(5);
  await page.getByLabel('Space sky', { exact:true }).selectOption('nebula');
  await expect.poll(() => targets.viewerPreferences?.spaceSky).toBe('nebula');
  await page.reload();
  await expect(canvas).toHaveAttribute('data-space-sky','nebula', { timeout:45000 });
  await page.getByRole('tab', { name:'View', exact:true }).click();
  await expect(page.getByLabel('Model background', { exact:true })).toHaveValue('space');
  await expect(page.getByLabel('Space sky', { exact:true })).toHaveValue('nebula');
  await expect(page.getByLabel('Stage floor and decorations', { exact:true })).not.toBeChecked();
  await page.getByLabel('Model quality', { exact:true }).selectOption('performance');
  await expect(canvas).toHaveAttribute('data-space-sky-resolution','128');
  await page.getByLabel('Model quality', { exact:true }).selectOption('balanced');
  await expect(canvas).toHaveAttribute('data-space-sky-resolution','256');
  await page.getByLabel('Capture resolution', { exact:true }).selectOption('1');
  await canvas.scrollIntoViewIfNeeded();
  const preview = (await canvas.screenshot()).toString('base64');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name:'Export', exact:true }).click();
  const download = await downloading;
  const path = await download.path();
  expect(path).toBeTruthy();
  const exported = (await readFile(path!)).toString('base64');
  await download.saveAs(test.info().outputPath('nebula-protected-export.png'));
  const pixels = await page.evaluate(async ({ preview, exported }) => {
    async function sample(base64: string) {
      const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
      const surface = document.createElement('canvas'); surface.width = image.width; surface.height = image.height;
      const context = surface.getContext('2d')!; context.drawImage(image,0,0);
      return { width:image.width, height:image.height, rgb:Array.from(context.getImageData(Math.floor(image.width*.08),Math.floor(image.height*.08),1,1).data).slice(0,3) };
    }
    return { preview:await sample(preview), exported:await sample(exported) };
  }, { preview, exported });
  expect(pixels.exported.width).toBeGreaterThan(0);
  expect(Math.max(...pixels.exported.rgb)-Math.min(...pixels.exported.rgb)).toBeGreaterThan(5);
  pixels.exported.rgb.forEach((channel, index) => expect(Math.abs(channel-pixels.preview.rgb[index])).toBeLessThan(15));
  await page.getByLabel('Model background', { exact:true }).selectOption('color');
  await expect(canvas).toHaveAttribute('data-space-sky','off');
  await expect(page.getByLabel('Background color', { exact:true })).toBeVisible();
  await page.setViewportSize({ width:390, height:844 });
  await page.getByLabel('Model background', { exact:true }).selectOption('space');
  await page.getByLabel('Space sky', { exact:true }).selectOption('aurora');
  await expect(canvas).toHaveAttribute('data-space-sky','aurora');
  await page.getByLabel('Space sky', { exact:true }).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path:test.info().outputPath('space-sky-mobile.png'), fullPage:true });
  expect(errors).toEqual([]);
});

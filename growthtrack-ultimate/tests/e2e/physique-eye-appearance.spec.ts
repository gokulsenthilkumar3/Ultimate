import { test, expect } from './foundation-fixture';
import { setupHumanViewer, surfaces, bodySurface } from './helpers/human-viewer';
import { readFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';

const eyes = async (canvas: Locator) => (await surfaces(canvas)).filter(item => item.irisColor);
async function focusFace(page: Page, canvas: Locator) {
  await page.getByRole('button', { name: 'Face', exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => {
    const body = await bodySurface(canvas);
    return Boolean(body?.geometry && await canvas.getAttribute('data-camera-region-geometry') === body.geometry);
  }, { timeout: 15000 }).toBe(true);
}
async function pixelDifference(page: Page, first: Buffer, second: Buffer) {
  return page.evaluate(async ({ first, second }) => {
    const pixels = async (base64: string) => {
      const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height).data;
    };
    const [a, b] = await Promise.all([pixels(first), pixels(second)]); let changed = 0;
    for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 15) changed++;
    return changed;
  }, { first: first.toString('base64'), second: second.toString('base64') });
}

test('iris and fixed pupils visibly change, save, and remain independent in Current and Goal', async ({ page }) => {
  const { canvas, targets, errors, bodyWrites } = await setupHumanViewer(page, 'reduce');
  await page.getByRole('tab', { name: 'Face', exact: true }).click();
  await focusFace(page, canvas);
  const originalMap = (await eyes(canvas))[0].map;
  for (const [label, color] of [['Dark brown', '39251c'], ['Brown', '6b3b20'], ['Hazel', '7c7444'], ['Amber', 'aa782f'], ['Green', '507453'], ['Grey', '7c858b'], ['Blue', '4e7897']]) {
    await page.getByRole('button', { name: `Iris shade: ${label}`, exact: true }).click();
    await canvas.scrollIntoViewIfNeeded();
    await expect.poll(async () => (await eyes(canvas))[0].irisColor).toBe(color);
  }
  await page.getByRole('slider', { name: 'Pupil diameter', exact: true }).press('Home');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await eyes(canvas))[0].pupilMm).toBe(2);
  const small = await canvas.screenshot({ path: test.info().outputPath('eye-blue-small-pupil.png') });
  await page.getByRole('slider', { name: 'Pupil diameter', exact: true }).press('End');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await eyes(canvas))[0].pupilMm).toBe(7);
  const large = await canvas.screenshot({ path: test.info().outputPath('eye-blue-large-pupil.png') });
  expect(await pixelDifference(page, small, large)).toBeGreaterThan(8);
  await page.getByRole('slider', { name: 'Iris detail', exact: true }).press('End');
  await page.getByRole('spinbutton', { name: 'Iris pattern seed' }).fill('321');
  await page.getByRole('checkbox', { name: 'Dark iris rim' }).uncheck();
  const current = { eyeColor: '#4e7897', eyePupilSizeMm: 7, eyeIrisDetail: 1, eyeSeed: 321, irisLimbalRing: false };
  await expect.poll(() => targets().appearanceMetrics).toMatchObject(current);
  expect((await eyes(canvas))[0].map).toBe(originalMap);
  await page.reload();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await eyes(canvas))[0]?.irisDetail, { timeout: 45000 }).toEqual([1, 0, 321]);
  expect((await eyes(canvas))[0].pupilMm).toBe(7);
  await page.getByRole('tab', { name: 'Face', exact: true }).click();
  const modes = page.getByRole('group', { name: 'Comparison mode', exact: true });
  await modes.getByRole('button', { name: 'Goal', exact: true }).click();
  await page.getByRole('button', { name: 'Iris shade: Green', exact: true }).click();
  await page.getByRole('slider', { name: 'Pupil diameter', exact: true }).press('Home');
  await page.getByRole('spinbutton', { name: 'Iris pattern seed' }).fill('987');
  await page.getByRole('checkbox', { name: 'Dark iris rim' }).check();
  await expect.poll(() => targets().goalMetrics).toMatchObject({ eyeColor: '#507453', eyePupilSizeMm: 2, eyeSeed: 987, irisLimbalRing: true });
  expect(targets().appearanceMetrics).toMatchObject(current);
  await modes.getByRole('button', { name: 'Compare', exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await eyes(canvas)).map(eye => [eye.irisColor, eye.pupilMm, ...eye.irisDetail])).toEqual([
    ['4e7897', 7, 1, 0, 321], ['507453', 2, 1, 1, 987],
  ]);
  await canvas.screenshot({ path: test.info().outputPath('eye-current-goal.png') });
  expect(bodyWrites.every(payload => !['eyePupilMode', 'eyePupilSizeMm', 'eyeIrisDetail', 'eyeSeed'].some(key => Object.hasOwn(payload as object, key)))).toBe(true);
  expect(errors).toEqual([]);
});

test('exposure pupils respond on the renderer, survive quality and export, and settle under reduced motion', async ({ page }) => {
  const { canvas, targets, errors } = await setupHumanViewer(page, 'no-preference', { eyeColor: '#4e7897', eyePupilSizeMm: 5.1 });
  await page.getByRole('tab', { name: 'Face', exact: true }).click();
  await page.getByRole('combobox', { name: 'Pupil behaviour' }).selectOption('exposure');
  await expect(page.getByRole('slider', { name: 'Pupil diameter' })).toBeDisabled();
  await expect.poll(() => targets().appearanceMetrics?.eyePupilMode).toBe('exposure');
  await page.getByRole('tab', { name: 'View', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Natural idle motion' }).uncheck();
  await page.getByRole('slider', { name: 'Scene exposure', exact: true }).press('Home');
  await focusFace(page, canvas);
  await expect.poll(async () => (await eyes(canvas))[0].pupilMm).toBeGreaterThan(6.99);
  await canvas.screenshot({ path: test.info().outputPath('eye-dim-exposure.png') });
  await page.getByRole('slider', { name: 'Scene exposure', exact: true }).press('End');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await eyes(canvas))[0].pupilTargetMm).toBe(2);
  await expect.poll(async () => (await eyes(canvas))[0].pupilMm).toBeLessThan(2.01);
  await canvas.screenshot({ path: test.info().outputPath('eye-bright-exposure.png') });
  for (const quality of ['high', 'performance']) {
    const before = (await bodySurface(canvas)).geometry;
    await page.getByLabel('Model quality', { exact: true }).selectOption(quality);
    await canvas.scrollIntoViewIfNeeded();
    await expect.poll(async () => (await bodySurface(canvas))?.geometry !== before, { timeout: 30000 }).toBe(true);
    await expect.poll(async () => (await eyes(canvas))[0]?.pupilTargetMm).toBe(2);
    expect((await eyes(canvas))[0].irisColor).toBe('4e7897');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('slider', { name: 'Scene exposure', exact: true }).press('Home');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await eyes(canvas))[0].pupilMm).toBe(7);
  const width = await canvas.evaluate(element => (element as HTMLCanvasElement).width);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const exported = test.info().outputPath('eye-protected-export.png');
  await (await downloading).saveAs(exported);
  const bytes = await readFile(exported);
  expect(bytes.readUInt32BE(16)).toBeGreaterThanOrEqual(width * 2);
  expect((await eyes(canvas))[0].pupilMm).toBe(7);
  await page.getByRole('tab', { name: 'Face', exact: true }).click();
  await page.getByRole('combobox', { name: 'Pupil behaviour' }).selectOption('fixed');
  await expect(page.getByRole('slider', { name: 'Pupil diameter' })).toHaveValue('5.1');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await eyes(canvas))[0].pupilMm).toBe(5.1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('combobox', { name: 'Pupil behaviour' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('eye-controls-mobile.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

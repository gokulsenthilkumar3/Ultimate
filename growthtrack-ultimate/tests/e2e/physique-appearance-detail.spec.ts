import { test, expect } from './foundation-fixture';
import { setupHumanViewer, bodySurface, surfaces } from './helpers/human-viewer';
import type { Locator, Page } from '@playwright/test';

async function focusFace(page: Page, canvas: Locator) {
  await page.getByRole('button', { name: 'Face', exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-focus', 'head');
  await expect.poll(async () => {
    const body = await bodySurface(canvas);
    return Boolean(body?.geometry && await canvas.getAttribute('data-camera-region-geometry') === body.geometry);
  }, { timeout: 15000 }).toBe(true);
}

async function changedPixels(page: Page, first: Buffer, second: Buffer) {
  return page.evaluate(async ({ first, second }) => {
    const pixels = async (data: string) => {
      const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
      const copy = document.createElement('canvas'); copy.width = image.width; copy.height = image.height;
      const context = copy.getContext('2d')!; context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, copy.width, copy.height).data;
    };
    const [a, b] = await Promise.all([pixels(first), pixels(second)]);
    let changed = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (Math.abs(a[i] - b[i]) + Math.abs(a[i+1] - b[i+1]) + Math.abs(a[i+2] - b[i+2]) > 20) changed++;
    }
    return changed;
  }, { first: first.toString('base64'), second: second.toString('base64') });
}

test('hair shades, seeded greying and thinning render, save and remain independent in Goal', async ({ page }) => {
  const { canvas, targets, errors } = await setupHumanViewer(page, 'reduce', { hairColor: '#62412b', hairStyle: 'short' });
  await page.getByRole('tab', { name: 'Hair', exact: true }).click();
  await focusFace(page, canvas);
  const dark = await canvas.screenshot({ path: test.info().outputPath('hair-brown.png') });
  await page.getByRole('slider', { name: 'Grey hair', exact: true }).press('End');
  await page.getByRole('spinbutton', { name: 'Hair pattern seed', exact: true }).fill('321');
  await canvas.scrollIntoViewIfNeeded();
  const hair = async () => (await surfaces(canvas)).find(item => item.hairDetail);
  await expect.poll(async () => (await hair()).hairDetail).toEqual([1, 1, 321]);
  expect((await hair()).hairShadowCutout).toBe(true);
  const grey = await canvas.screenshot({ path: test.info().outputPath('hair-grey.png') });
  expect(await changedPixels(page, dark, grey)).toBeGreaterThan(100);
  await page.getByRole('slider', { name: 'Hair density', exact: true }).press('Home');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await hair()).visible).toBe(false);
  const thinned = await canvas.screenshot({ path: test.info().outputPath('hair-zero-density.png') });
  expect(await changedPixels(page, grey, thinned)).toBeGreaterThan(100);
  await page.getByRole('slider', { name: 'Hair density', exact: true }).press('End');
  await expect.poll(() => targets().appearanceMetrics).toMatchObject({ hairDensity: 1, hairGrey: 1, hairSeed: 321 });
  await page.reload();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await hair())?.hairDetail, { timeout: 45000 }).toEqual([1, 1, 321]);
  await page.getByRole('tab', { name: 'Hair', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Hair pattern seed' })).toHaveValue('321');
  const modes = page.getByRole('group', { name: 'Comparison mode', exact: true });
  await modes.getByRole('button', { name: 'Goal', exact: true }).click();
  await page.getByRole('slider', { name: 'Grey hair', exact: true }).press('Home');
  await page.getByRole('slider', { name: 'Hair density', exact: true }).press('ArrowLeft');
  await page.getByRole('button', { name: 'Hair shade: Auburn', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Hair pattern seed' }).fill('789');
  await expect.poll(() => targets().goalMetrics).toMatchObject({ hairGrey: 0, hairDensity: .99, hairColor: '#87442a', hairSeed: 789 });
  expect(targets().appearanceMetrics).toMatchObject({ hairGrey: 1, hairDensity: 1, hairColor: '#62412b', hairSeed: 321 });
  await modes.getByRole('button', { name: 'Compare', exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await surfaces(canvas)).filter(item => item.hairDetail).map(item => item.hairDetail)).toEqual([[1, 1, 321], [.99, 0, 789]]);
  await canvas.screenshot({ path: test.info().outputPath('hair-current-goal.png') });
  expect(errors).toEqual([]);
});

test('freckles visibly layer onto skin, survive reload, quality, protected export and mobile editing', async ({ page }) => {
  const { canvas, targets, errors } = await setupHumanViewer(page, 'reduce', { skinColor: '#d8ac91', skinTone: 'II' });
  await page.getByRole('tab', { name: 'Skin', exact: true }).click();
  await page.getByRole('button', { name: 'Lock neutral inspection lighting', exact: true }).click();
  await focusFace(page, canvas);
  const clear = await canvas.screenshot({ path: test.info().outputPath('freckles-hidden.png') });
  await page.getByRole('slider', { name: 'Freckle density', exact: true }).press('End');
  await page.getByRole('slider', { name: 'Freckle radius', exact: true }).press('End');
  await page.getByRole('slider', { name: 'Freckle contrast', exact: true }).press('End');
  await page.getByRole('spinbutton', { name: 'Freckle pattern seed', exact: true }).fill('4321');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await bodySurface(canvas)).freckles).toEqual([1, 1.2, 1, 4321]);
  const marked = await canvas.screenshot({ path: test.info().outputPath('freckles-face.png') });
  expect(await changedPixels(page, clear, marked)).toBeGreaterThan(100);
  expect((await bodySurface(canvas)).baseColor).toBe('d8ac91');
  const saved = { skinFreckleDensity: 1, skinFreckleSizeMm: 1.2, skinFreckleContrast: 1, skinFreckleSeed: 4321 };
  await expect.poll(() => targets().appearanceMetrics).toMatchObject(saved);
  await page.reload();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await bodySurface(canvas))?.freckles, { timeout: 45000 }).toEqual([1, 1.2, 1, 4321]);
  await page.getByRole('tab', { name: 'View', exact: true }).click();
  for (const quality of ['high', 'performance']) {
    const before = (await bodySurface(canvas)).geometry;
    await page.getByLabel('Model quality', { exact: true }).selectOption(quality);
    await canvas.scrollIntoViewIfNeeded();
    await expect.poll(async () => (await bodySurface(canvas))?.geometry !== before, { timeout: 30000 }).toBe(true);
    expect((await bodySurface(canvas)).freckles).toEqual([1, 1.2, 1, 4321]);
  }
  await focusFace(page, canvas);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await (await downloading).saveAs(test.info().outputPath('freckles-protected-export.png'));
  const modes = page.getByRole('group', { name: 'Comparison mode', exact: true });
  await modes.getByRole('button', { name: 'Goal', exact: true }).click();
  await page.getByRole('tab', { name: 'Skin', exact: true }).click();
  await page.getByRole('slider', { name: 'Freckle density', exact: true }).press('Home');
  await page.getByRole('slider', { name: 'Freckle density', exact: true }).press('ArrowRight');
  await page.getByRole('spinbutton', { name: 'Freckle pattern seed' }).fill('567');
  await expect.poll(() => targets().goalMetrics).toMatchObject({ skinFreckleDensity: .01, skinFreckleSeed: 567 });
  await modes.getByRole('button', { name: 'Compare', exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await surfaces(canvas)).filter(item => item.eyelids).map(item => item.freckles)).toEqual([[1, 1.2, 1, 4321], [.01, 1.2, 1, 567]]);
  await modes.getByRole('button', { name: 'Current', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('slider', { name: 'Freckle contrast', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('appearance-controls-mobile.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Hide freckles', exact: true }).click();
  await expect.poll(() => targets().appearanceMetrics).toMatchObject({ ...saved, skinFreckleDensity: 0 });
  expect(targets().goalMetrics).toMatchObject({ skinFreckleDensity: .01, skinFreckleSeed: 567 });
  expect(errors).toEqual([]);
});

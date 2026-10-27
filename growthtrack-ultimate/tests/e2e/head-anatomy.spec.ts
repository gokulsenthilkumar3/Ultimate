import { mkdir, writeFile } from 'node:fs/promises';
import { test, expect } from './foundation-fixture';
import { bodySurface, paintedCanvas, setupHumanViewer } from './helpers/human-viewer';

for (const lod of ['core', 'hero']) {
  test(`R2 ${lod} head uses supported shape controls and a hinged dental assembly`, async ({ page }) => {
    test.setTimeout(120_000);
    const directory = 'artifacts/head-anatomy';
    await mkdir(directory, { recursive: true });
    const { canvas, errors, targets } = await setupHumanViewer(page, 'reduce', {}, {
      modelVersion: 'human-r2', avatarAsset: `humanoid-human-r2-${lod}.glb`,
    });
    await page.getByRole('button', { name: 'Face', exact: true }).click();
    await page.getByRole('tab', { name: 'Face', exact: true }).click();
    await expect.poll(async () => (await bodySurface(canvas))?.modelAsset).toMatch(new RegExp(`human-r2-${lod}\\.glb$`));
    await expect.poll(async () => (await bodySurface(canvas))?.headCapabilities?.shapeTargets.length).toBe(13);
    await expect.poll(async () => (await bodySurface(canvas))?.mouth?.method).toBe('skull-bound-hinged-jaw-fallback-v1');
    expect((await bodySurface(canvas))?.mouth).toMatchObject({
      toothCount: 28, crownTypes: ['incisor', 'canine', 'premolar', 'molar'],
      upperAttachment: 'skull', lowerAttachment: 'calibrated-jaw-hinge',
    });
    await page.getByRole('slider', { name: 'Jaw open', exact: true }).fill('0');
    await expect.poll(async () => (await bodySurface(canvas))?.mouth?.visible).toBe(false);
    for (let step = 0; step < 4; step++) await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await paintedCanvas(canvas, `${directory}/${lod}-face-neutral.png`);

    await page.getByRole('slider', { name: 'Jaw open', exact: true }).fill('0.65');
    await expect.poll(async () => (await bodySurface(canvas))?.mouth?.jawAngle).toBeCloseTo(.234, 3);
    await expect.poll(async () => (await bodySurface(canvas))?.mouth?.visible).toBe(true);
    await paintedCanvas(canvas, `${directory}/${lod}-face-open.png`);
    await expect.poll(() => targets().morphOverrides?.current?.jaw_open).toBe(.65);

    // Identity presets must leave the selected expression intact.
    await page.getByRole('button', { name: 'Broader features', exact: true }).click();
    await expect.poll(() => targets().morphOverrides?.current?.jaw_width).toBe(.65);
    expect(targets().morphOverrides.current.jaw_open).toBe(.65);
    await expect(page.getByRole('slider', { name: 'Jaw open', exact: true })).toHaveValue('0.65');
    await page.getByRole('searchbox', { name: 'Find a face feature', exact: true }).fill('nasal bridge');
    await expect(page.getByRole('slider', { name: 'Nose Bridge', exact: true })).toBeEnabled();
    await expect(page.getByRole('slider', { name: 'Jaw Width', exact: true })).toHaveCount(0);
    await page.getByRole('slider', { name: 'Nose Bridge', exact: true }).fill('0.7');
    await expect.poll(() => targets().morphOverrides?.current?.nose_bridge_width).toBe(.7);
    await page.getByRole('searchbox', { name: 'Find a face feature', exact: true }).fill('');
    await page.getByRole('button', { name: 'Use measurements: Nose', exact: true }).click();
    await expect.poll(() => targets().morphOverrides?.current?.nose_bridge_width).toBeUndefined();
    expect(targets().morphOverrides.current.jaw_width).toBe(.65);
    expect(targets().morphOverrides.current.jaw_open).toBe(.65);

    await page.reload();
    await canvas.scrollIntoViewIfNeeded();
    await expect.poll(async () => (await bodySurface(canvas))?.mouth?.method, { timeout: 45_000 }).toBe('skull-bound-hinged-jaw-fallback-v1');
    await page.getByRole('tab', { name: 'Face', exact: true }).click();
    await expect(page.getByRole('slider', { name: 'Jaw open', exact: true })).toHaveValue('0.65');
    await canvas.scrollIntoViewIfNeeded();
    await expect.poll(async () => (await bodySurface(canvas))?.mouth?.jawAngle, { timeout: 45_000 }).toBeCloseTo(.234, 3);
    if (lod === 'core') {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('searchbox', { name: 'Find a face feature', exact: true }).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `${directory}/face-editor-mobile.png` });
    }
    expect(errors).toEqual([]);
    await writeFile(`${directory}/${lod}-browser.json`, JSON.stringify({
      lod, passed: true, viewport: page.viewportSize(), errors,
      head: (await bodySurface(canvas))?.headCapabilities,
      mouth: (await bodySurface(canvas))?.mouth,
    }, null, 2) + '\n');
  });
}

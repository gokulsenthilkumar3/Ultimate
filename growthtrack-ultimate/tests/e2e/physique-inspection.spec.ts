import { test, expect, OWNER, emptyState } from './foundation-fixture';

async function seed(page) {
  const writes: string[] = [];
  let body = { heightCm: 175, weightKg: 74, bodyFatPct: 19, waistCm: 82, chestCm: 99, hipsCm: 96, glutesCm: 96, shouldersCm: 112, armsCm: 33, neckCm: 37, modelPreset: 'male', biologicalSex: 'male' };
  let targets = {};
  await page.route(url => ['/api/state', '/api/body-profile', '/api/physique_targets'].includes(url.pathname), route => {
    const request = route.request(), pathname = new URL(request.url()).pathname;
    if (request.method() !== 'GET') {
      writes.push(pathname);
      if (pathname === '/api/physique_targets') targets = request.postDataJSON();
      if (pathname === '/api/body-profile') body = { ...body, ...request.postDataJSON() };
      return route.fulfill({ json: request.postDataJSON() });
    }
    return route.fulfill({ json: { ...emptyState(), user: { ...OWNER, dob: '1990-01-01', physiqueTargets: targets }, bodyProfile: body } });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  return writes;
}

test('measurements explain tape paths and diagrams zoom, drag and reset without saving', async ({ page }) => {
  const writes = await seed(page);
  await page.goto('/wellness/physique?view=measurements');
  await page.getByRole('button', { name: 'How to measure Waist', exact: true }).click();
  const guide = page.getByRole('region', { name: 'How to measure Waist', exact: true });
  await expect(guide).toContainText('WHO uses the midpoint');
  await guide.getByRole('button', { name: 'Zoom in measurement diagram' }).click();
  await expect(guide).toContainText('125%');
  const svg = guide.locator('svg.measurement-help__diagram'), box = await svg.boundingBox();
  await page.mouse.move(box!.x + box!.width/2, box!.y + box!.height/2);
  await page.mouse.down(); await page.mouse.move(box!.x + box!.width/2 + 40, box!.y + box!.height/2 + 20, { steps: 6 }); await page.mouse.up();
  await expect(svg.locator('g').first()).not.toHaveAttribute('transform', /^translate\(0 0\)/);
  await guide.getByRole('button', { name: 'Reset measurement diagram' }).click();
  await expect(guide).toContainText('100%');
  await expect(page.getByLabel('Waist (cm)', { exact: true })).toHaveValue('82');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(writes).toEqual([]);
  await guide.screenshot({ path: test.info().outputPath('measurement-help-mobile.png') });
});

test('every public region zooms in and out, rotation and pan retain focus, and drop selects a part', async ({ page }) => {
  const writes = await seed(page), errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/wellness/physique?view=3d');
  const parts = page.getByRole('group', { name: 'Choose or drag a body part' });
  const canvas = page.locator('.chamber-canvas-wrap canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-distance', /\d/, { timeout: 30000 });
  const distance = async () => Number(await canvas.getAttribute('data-camera-distance'));
  for (const button of await parts.getByRole('button').all()) {
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas).toHaveAttribute('data-camera-region-source', 'evaluated-surface');
    await expect(canvas).toHaveAttribute('data-camera-focus', await button.getAttribute('data-part') || 'body');
    // Wait for a rendered frame after the camera command, even with reduced motion.
    await expect.poll(() => canvas.getAttribute('data-camera-target')).not.toBeNull();
    await expect.poll(() => distance()).toBeGreaterThan(.12);
    const before = await distance();
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect.poll(distance).toBeLessThan(before);
    const near = await distance();
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
    await expect.poll(distance).toBeGreaterThan(near);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
  const chest = parts.getByRole('button', { name: 'Chest', exact: true });
  await chest.click();
  await page.locator('.chamber-canvas-wrap').scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  const origin = { x: bounds!.x + bounds!.width * .52, y: bounds!.y + bounds!.height * .5 };
  const position = await canvas.getAttribute('data-camera-position');
  await page.mouse.move(origin.x, origin.y); await page.mouse.down();
  await page.mouse.move(origin.x + 75, origin.y + 15, { steps: 12 }); await page.mouse.up();
  await expect.poll(() => canvas.getAttribute('data-camera-position')).not.toBe(position);
  await expect(chest).toHaveAttribute('aria-pressed', 'true');
  const target = await canvas.getAttribute('data-camera-target');
  await page.mouse.move(origin.x, origin.y); await page.mouse.down({ button: 'right' });
  await page.mouse.move(origin.x + 45, origin.y + 25, { steps: 12 }); await page.mouse.up({ button: 'right' });
  await expect.poll(() => canvas.getAttribute('data-camera-target')).not.toBe(target);
  await expect(chest).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.chamber-overlay-top').getByRole('button', { name: 'Side', exact: true }).click();
  await expect(chest).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.chamber-overlay-top').getByRole('button', { name: 'Front', exact: true }).click();
  await expect(chest).toHaveAttribute('aria-pressed', 'true');
  await canvas.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const panned = await canvas.getAttribute('data-camera-target');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect.poll(() => canvas.getAttribute('data-camera-target')).toBe(panned);
  await parts.getByRole('button', { name: 'Left hand', exact: true }).dragTo(canvas);
  await expect(parts.getByRole('button', { name: 'Left hand', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(canvas).toHaveAttribute('data-camera-region-source', 'evaluated-surface');
  await page.screenshot({ path: test.info().outputPath('inspection-workspace-desktop.png'), fullPage: true });
  await expect(parts.getByRole('button', { name: 'Private anatomy', exact: true })).toHaveCount(0);
  await page.locator('.chamber-viewport').screenshot({ path: test.info().outputPath('part-close-up-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await parts.getByRole('button', { name: 'Head & Neck', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]); expect(writes).toEqual([]);
});

test('adult base circumference help describes section preview and supports close-up', async ({ page }) => {
  const writes = await seed(page); await page.goto('/wellness/physique?view=3d');
  await page.getByRole('tablist', { name: 'Avatar editor' }).getByRole('tab', { name: 'Anatomy', exact: true }).click();
  const reveal = page.getByRole('button', { name: 'Anatomical mode', exact: true });
  await expect(reveal).toBeEnabled({ timeout: 30000 }); await reveal.click();
  await page.getByRole('button', { name: 'How to measure Base circumference', exact: true }).click();
  const guide = page.getByRole('region', { name: 'How to measure Base circumference', exact: true });
  await expect(guide).toContainText('near the attachment end');
  await expect(guide).toContainText('Updates the selected shaft section in 3D');
  await guide.getByRole('button', { name: 'Inspect this part in 3D' }).click();
  await expect(page.getByRole('group', { name: 'Choose or drag a body part' }).getByRole('button', { name: 'Private anatomy', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await guide.getByRole('button', { name: 'Zoom in measurement diagram' }).click(); await expect(guide).toContainText('125%');
  expect(writes).toEqual([]);
  await page.getByRole('button', { name: 'Wear underwear', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Choose or drag a body part' }).getByRole('button', { name: 'Private anatomy', exact: true })).toHaveCount(0);
});

test('continuous base skin color is applied and restored, and an appearance preset replaces it', async ({ page }) => {
  const writes = await seed(page); await page.goto('/wellness/physique?view=3d');
  const skinTab = page.getByRole('tablist', { name: 'Avatar editor' }).getByRole('tab', { name: 'Skin', exact: true });
  await skinTab.click();
  await page.getByLabel('Base skin color', { exact: true }).evaluate((input: HTMLInputElement) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'#a97d67');
    input.dispatchEvent(new Event('input',{ bubbles:true }));
  });
  await expect.poll(() => writes.includes('/api/body-profile')).toBe(true);
  await page.reload(); await skinTab.click();
  await expect(page.getByLabel('Base skin color', { exact: true })).toHaveValue('#a97d67');
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(page.getByLabel('Base skin color', { exact: true })).toHaveValue('#f5d5b0');
});

test.describe('touch inspection', () => {
  test.use({ viewport: { width:390, height:844 }, hasTouch:true, isMobile:true });
  test('a touch drag drops a region onto the model and pinch zoom keeps its focus', async ({ page, context }) => {
    const writes = await seed(page); await page.goto('/wellness/physique?view=3d');
    const parts=page.getByRole('group',{ name:'Choose or drag a body part' });
    const chest=parts.getByRole('button',{ name:'Chest',exact:true });
    const canvas=page.locator('.chamber-canvas-wrap canvas');
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toHaveAttribute('data-camera-distance',/\d/,{timeout:30000});
    await chest.click(); await canvas.scrollIntoViewIfNeeded(); await expect(canvas).toHaveAttribute('data-camera-region-source','evaluated-surface');
    await parts.scrollIntoViewIfNeeded();
    await parts.getByRole('button',{name:'Left hand',exact:true}).scrollIntoViewIfNeeded();
    await page.locator('.body-part-navigator').evaluate(el => el.scrollIntoView({block:'start'}));
    const chip=await parts.getByRole('button',{name:'Left hand',exact:true}).boundingBox();
    const target=await canvas.boundingBox();
    // Keep both source and drop point on screen while dragging on mobile.
    const drop={ x:target!.x+target!.width*.5, y:target!.y+32 };
    expect(chip!.y).toBeGreaterThan(56);
    expect(drop.y).toBeLessThan(760);
    const client=await context.newCDPSession(page);
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:chip!.x+chip!.width/2,y:chip!.y+chip!.height/2}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[drop]});
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect(parts.getByRole('button',{name:'Left hand',exact:true})).toHaveAttribute('aria-pressed','true');
    await canvas.scrollIntoViewIfNeeded();
    const bounds=await canvas.boundingBox(), center={x:bounds!.x+bounds!.width*.5,y:bounds!.y+bounds!.height*.6};
    const before=Number(await canvas.getAttribute('data-camera-distance'));
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x-25,y:center.y},{x:center.x+25,y:center.y}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x-50,y:center.y},{x:center.x+50,y:center.y}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(async()=>Number(await canvas.getAttribute('data-camera-distance'))).toBeLessThan(before);
    await expect(parts.getByRole('button',{name:'Left hand',exact:true})).toHaveAttribute('aria-pressed','true');
    expect(writes).toEqual([]); await client.detach();
  });
});

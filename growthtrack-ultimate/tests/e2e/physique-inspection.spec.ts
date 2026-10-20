import { test, expect, OWNER, emptyState } from './foundation-fixture';

async function seed(page, initialTargets = {}) {
  const writes: string[] = [];
  let body = { heightCm: 175, weightKg: 74, bodyFatPct: 19, waistCm: 82, chestCm: 99, hipsCm: 96, glutesCm: 96, shouldersCm: 112, armsCm: 33, neckCm: 37, modelPreset: 'male', biologicalSex: 'male' };
  let targets = initialTargets;
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

async function touchDropPoints(page, source, canvas) {
  await source.evaluate(el => el.scrollIntoView({ block: 'center' }));
  // Account for wrapped controls and fixed mobile navigation. Both endpoints
  // must be visible: CDP touch input does not auto-scroll like locator actions.
  await canvas.evaluate(el => {
    const dropY = el.getBoundingClientRect().top + 32;
    const bottom = innerHeight - 120;
    if (dropY > bottom) window.scrollBy(0, dropY - bottom);
  });
  const chip = await source.boundingBox(), model = await canvas.boundingBox();
  const start = { x: chip!.x + chip!.width / 2, y: chip!.y + chip!.height / 2 };
  const drop = { x: model!.x + model!.width / 2, y: model!.y + 32 };
  expect(start.y).toBeGreaterThan(56);
  expect(drop.y).toBeLessThan((await page.viewportSize())!.height - 96);
  return { start, drop };
}

async function dragPartToModel(page, source, canvas) {
  await source.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await source.hover();
  const box = await source.boundingBox();
  await page.mouse.down();
  // Start the native drag before scrolling the destination into view. A single
  // large move after a page scroll can miss Chromium's drag-start threshold.
  await page.mouse.move(box!.x + box!.width / 2 + 12, box!.y + box!.height / 2 + 8, { steps: 4 });
  await canvas.hover({ position: { x: 80, y: 48 } });
  await canvas.hover({ position: { x: 82, y: 50 } });
  await page.mouse.up();
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
  const beforeWheel = await distance();
  await canvas.hover(); await page.mouse.wheel(0, -120);
  await expect.poll(distance).toBeLessThan(beforeWheel);
  const afterWheel = await distance();
  await page.mouse.wheel(0, 120);
  await expect.poll(distance).toBeGreaterThan(afterWheel);
  await expect(chest).toHaveAttribute('aria-pressed', 'true');
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
  const canvas = page.locator('.chamber-canvas-wrap canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-distance', /\d/, { timeout: 30000 });
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
  const parts = page.getByRole('group', { name: 'Choose or drag a body part' });
  for (const name of ['Chest', 'Private anatomy']) {
    const button = parts.getByRole('button', { name, exact: true });
    await dragPartToModel(page, button, canvas);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(canvas).toHaveAttribute('data-camera-focus', 'anatomy');
  const distance = async () => Number(await canvas.getAttribute('data-camera-distance'));
  const before = await distance();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect.poll(distance).toBeLessThan(before);
  const near = await distance();
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect.poll(distance).toBeGreaterThan(near);
  expect(writes).toEqual([]);
  await page.getByRole('button', { name: 'Wear underwear', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Choose or drag a body part' }).getByRole('button', { name: 'Private anatomy', exact: true })).toHaveCount(0);
});

test('desktop drops select every public region, reject invalid drops, and preserve goal context', async ({ page }) => {
  const writes = await seed(page, { goalMetrics: { weight: 80, waist: 78 } });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/wellness/physique?view=3d');
  const parts = page.getByRole('group', { name: 'Choose or drag a body part' });
  const canvas = page.locator('.chamber-canvas-wrap canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-distance', /\d/, { timeout: 30000 });
  const modes = page.getByRole('group', { name: 'Comparison mode' });
  await modes.getByRole('button', { name: 'Goal', exact: true }).click();
  for (const button of await parts.getByRole('button').all()) {
    await dragPartToModel(page, button, canvas);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas).toHaveAttribute('data-camera-focus', (await button.getAttribute('data-part'))!);
    await expect(modes.getByRole('button', { name: 'Goal', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.chamber-canvas-wrap')).not.toHaveClass(/is-part-drop-target/);
  }
  const selected = await canvas.getAttribute('data-camera-focus');
  for (const payload of ['unknown-part', '__proto__', 'anatomy']) {
    await canvas.evaluate((element, id) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-ultimate-body-part', id);
      element.dispatchEvent(new DragEvent('dragover', { dataTransfer, bubbles: true, cancelable: true }));
      element.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }));
    }, payload);
    await expect(canvas).toHaveAttribute('data-camera-focus', selected!);
    await expect(page.locator('.chamber-canvas-wrap')).not.toHaveClass(/is-part-drop-target/);
  }
  const head = parts.getByRole('button', { name: 'Head & Neck', exact: true });
  await head.focus(); await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-camera-focus', 'head');
  await page.getByRole('button', { name: 'Full body', exact: true }).click();
  await expect(page.getByRole('img', { name: /^Interactive three-dimensional physique model/ })).toHaveAttribute('data-rendering', 'active');
  await expect(canvas).toHaveAttribute('data-camera-focus', 'body');
  await expect(parts.getByRole('button', { pressed: true })).toHaveCount(0);
  expect(writes).toEqual([]);
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
  test('diagonal touch drops work after cancellation and outside drops leave selection unchanged', async ({ page, context }) => {
    const writes = await seed(page); await page.goto('/wellness/physique?view=3d');
    const parts = page.getByRole('group', { name: 'Choose or drag a body part' });
    const chest = parts.getByRole('button', { name: 'Chest', exact: true });
    const hand = parts.getByRole('button', { name: 'Left hand', exact: true });
    const canvas = page.locator('.chamber-canvas-wrap canvas');
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toHaveAttribute('data-camera-distance', /\d/, { timeout: 30000 });
    await chest.click();
    const client = await context.newCDPSession(page);
    const prepare = () => touchDropPoints(page, hand, canvas);
    let { start, drop } = await prepare();
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [drop] });
    await expect(page.locator('.body-part-drag-preview')).toBeVisible();
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(page.locator('.body-part-drag-preview')).toHaveCount(0);
    await expect(chest).toHaveAttribute('aria-pressed', 'true');

    ({ start, drop } = await prepare());
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x, y: start.y - 25 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(chest).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.body-part-drag-preview')).toHaveCount(0);

    ({ start, drop } = await prepare());
    // Begin horizontally, as a diagonal human gesture often does. Native
    // horizontal scrolling must not cancel an in-progress part drag.
    const bend = { x: start.x > 195 ? start.x - 60 : start.x + 60, y: start.y + 4 };
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [bend] });
    await expect(page.locator('.body-part-drag-preview')).toBeVisible();
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [drop] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(hand).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas).toHaveAttribute('data-camera-focus', 'leftHand');
    await expect(page.locator('.body-part-drag-preview')).toHaveCount(0);
    await chest.scrollIntoViewIfNeeded(); await chest.tap();
    await expect(chest).toHaveAttribute('aria-pressed', 'true');
    expect(writes).toEqual([]); await client.detach();
    await page.locator('.body-part-navigator').screenshot({ path: test.info().outputPath('touch-part-navigation.png') });
  });
  test('a touch drag drops a region onto the model and pinch zoom keeps its focus', async ({ page, context }) => {
    const writes = await seed(page); await page.goto('/wellness/physique?view=3d');
    const parts=page.getByRole('group',{ name:'Choose or drag a body part' });
    const chest=parts.getByRole('button',{ name:'Chest',exact:true });
    const canvas=page.locator('.chamber-canvas-wrap canvas');
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toHaveAttribute('data-camera-distance',/\d/,{timeout:30000});
    await chest.click(); await canvas.scrollIntoViewIfNeeded(); await expect(canvas).toHaveAttribute('data-camera-region-source','evaluated-surface',{timeout:30000});
    const { start, drop } = await touchDropPoints(page, parts.getByRole('button',{name:'Left hand',exact:true}), canvas);
    const client=await context.newCDPSession(page);
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
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
    const near = Number(await canvas.getAttribute('data-camera-distance'));
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x-50,y:center.y},{x:center.x+50,y:center.y}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x-25,y:center.y},{x:center.x+25,y:center.y}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(async()=>Number(await canvas.getAttribute('data-camera-distance'))).toBeGreaterThan(near);
    const panned = await canvas.getAttribute('data-camera-target');
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x-25,y:center.y},{x:center.x+25,y:center.y}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x-5,y:center.y+25},{x:center.x+45,y:center.y+25}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(()=>canvas.getAttribute('data-camera-target')).not.toBe(panned);
    const position = await canvas.getAttribute('data-camera-position');
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[center]});
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x+40,y:center.y+10}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(()=>canvas.getAttribute('data-camera-position')).not.toBe(position);
    await expect(parts.getByRole('button',{name:'Left hand',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.touchscreen.tap(center.x,center.y); await page.touchscreen.tap(center.x,center.y);
    await expect(canvas).toHaveAttribute('data-camera-focus','body');
    expect(writes).toEqual([]); await client.detach();
  });
});

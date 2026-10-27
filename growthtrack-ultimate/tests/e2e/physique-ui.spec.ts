import { test, expect, OWNER, emptyState } from './foundation-fixture';

const profile = { heightCm: 175, weightKg: 74, bodyFatPct: 19, waistCm: 82, chestCm: 99, shouldersCm: 112, armsCm: 33, neckCm: 37, hipsCm: 96, targetWeightKg: 76, targetWaistCm: 79 };
const goals = {
  goalMetrics: { weight: 76, waist: 79 },
  targets: [{ label: 'Chest', current: '99cm', target: '104cm', type: 'Growth', progress: 30 }],
  zones: [{ name: 'Upper body', icon: '💪', status: 'Hypertrophy' }, { name: 'Core', icon: '◎', status: 'Maintenance' }],
  milestones: [{ id: 'first-goal', label: 'Complete a month of check-ins', targetDate: '2026-11-01', achieved: false }],
};
async function seedPhysique(page, options: { empty?: boolean; imperial?: boolean; failSnapshot?: boolean; failProfile?: boolean } = {}) {
  let body = options.empty ? {} : { ...profile };
  let targets = options.empty ? {} : structuredClone(goals);
  const writes: { path: string; payload: any }[] = [];
  const metric_logs = options.empty ? [] : [
    { id: 'before', date: '2026-09-01', weight: 72, bodyFat: 21, waist: 85 },
    { id: 'middle', date: '2026-09-15', weight: 73, bodyFat: 20, waist: 84 },
    { id: 'latest', date: '2026-10-15', metric: 'physique_snapshot', metrics: { weight: 74, bodyFat: 19, waist: 82 } },
  ];
  await page.route(url => ['/api/state', '/api/body-profile', '/api/physique_targets', '/api/metric_logs'].includes(url.pathname), async route => {
    const path = new URL(route.request().url()).pathname;
    const payload = route.request().method() === 'GET' ? null : route.request().postDataJSON();
    if (payload) writes.push({ path, payload });
    if (path === '/api/body-profile') {
      if (options.failProfile) return route.fulfill({ status: 500, json: { error: 'Test save failed' } });
      body = { ...body, ...payload }; return route.fulfill({ json: body });
    }
    if (path === '/api/physique_targets') { targets = payload; return route.fulfill({ json: targets }); }
    if (path === '/api/metric_logs') {
      if (options.failSnapshot) return route.fulfill({ status: 500, json: { error: 'Test snapshot failed' } });
      return route.fulfill({ json: { ...payload, id: `new-${writes.length}` } });
    }
    return route.fulfill({ json: { ...emptyState(), user: { ...OWNER, physiqueTargets: targets, ...(options.imperial ? { measurementSystem: 'Imperial (in, lb)' } : {}) }, bodyProfile: body, physiqueTargets: targets, metric_logs } });
  });
  return writes;
}
const view = (page, name) => page.getByRole('tablist', { name: 'Physique views' }).getByRole('tab', { name });
async function noPageOverflow(page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true); }

test('views support keyboard navigation and mobile and dark layouts without writes', async ({ page }) => {
  const writes = await seedPhysique(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/wellness/physique');
  await expect(page.getByRole('heading', { name: 'Your body, in perspective.' })).toBeVisible();
  await expect(page.getByLabel('Upper body', { exact: true })).toHaveValue('Hypertrophy');
  await view(page, 'Blueprint').focus(); await page.keyboard.press('ArrowRight');
  await expect(view(page, 'Measurements')).toBeFocused(); await expect(page).toHaveURL(/view=measurements/);
  await page.keyboard.press('End'); await expect(view(page, 'History')).toBeFocused();
  await page.keyboard.press('Home');
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    for (const tab of ['Blueprint', 'Measurements', 'Targets', 'History']) {
      await view(page, tab).click(); await expect(view(page, tab)).toHaveAttribute('aria-selected', 'true'); await noPageOverflow(page);
      if (width !== 320) await page.screenshot({ path: test.info().outputPath(`physique-${tab.toLowerCase()}-${width}.png`), fullPage: true });
    }
  }
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 }); await view(page, 'Blueprint').click();
  await page.screenshot({ path: test.info().outputPath('physique-blueprint-dark.png'), fullPage: true });
  expect(writes).toHaveLength(0);
  await page.getByLabel('Upper body', { exact: true }).selectOption('Maintenance');
  await expect.poll(() => writes.length).toBe(1); expect(writes[0].payload.zones[0].status).toBe('Maintenance');
});

test('measurement drafts persist across tabs, validate, and save a public snapshot', async ({ page }) => {
  const writes = await seedPhysique(page); await page.goto('/wellness/physique?view=measurements');
  const weight = page.getByLabel('Weight (kg)', { exact: true }); await expect(weight).toHaveValue('74');
  await weight.fill('75.5'); await view(page, 'Targets').click(); await view(page, 'Measurements').click();
  await expect(weight).toHaveValue('75.5'); expect(writes).toHaveLength(0);
  await weight.fill('-1'); await page.getByRole('button', { name: 'Save check-in', exact: true }).click();
  await expect(weight).toHaveAttribute('aria-invalid', 'true'); expect(writes).toHaveLength(0);
  await weight.fill('75.5'); await page.getByRole('button', { name: 'Save check-in', exact: true }).click();
  await expect(page.getByText('Check-in saved. Your measurements and history are up to date.')).toBeVisible();
  expect(writes[0]).toEqual({ path: '/api/body-profile', payload: { weightKg: 75.5 } });
  expect(writes[1].payload).toMatchObject({ metric: 'physique_snapshot', source: 'physique', metrics: { weight: 75.5, waist: 82 } });
  expect(writes[1].payload.metrics).not.toHaveProperty('anatomyRevealConsent');
  await view(page, 'History').click(); await expect(page.getByRole('status').filter({ hasText: '4 recorded check-ins' })).toBeVisible();
});

test('targets save canonical values and history includes snapshots and CSV export', async ({ page }) => {
  const writes = await seedPhysique(page); await page.goto('/wellness/physique?view=targets');
  await page.getByRole('button', { name: 'Edit Waist target', exact: true }).click();
  await page.getByLabel('Waist goal (cm)', { exact: true }).fill('80'); await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await expect(page.getByText('Waist target saved.', { exact: true })).toBeVisible(); expect(writes[0].payload).toEqual({ targetWaistCm: 80 });
  await page.getByRole('button', { name: 'Complete Complete a month of check-ins', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reopen Complete a month of check-ins', exact: true })).toBeVisible();
  expect(writes[1].payload.milestones[0].achieved).toBe(true);
  await view(page, 'History').click(); await expect(page.getByRole('row')).toHaveCount(4);
  await expect(page.getByRole('cell', { name: '74 kg', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Measurement', exact: true }).selectOption('waist');
  await expect(page.getByRole('img', { name: /Waist across 3 check-ins/ })).toBeVisible();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toBe('physique-waist-history.csv');
  await page.getByRole('combobox', { name: 'Measurement', exact: true }).selectOption('calves');
  await expect(page.getByText('No entries for this selection')).toBeVisible(); await expect(page.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
});

test('empty states guide the next action without invented measurements', async ({ page }) => {
  await seedPhysique(page, { empty: true }); await page.goto('/wellness/physique?view=history');
  await expect(page.getByText('Your story starts with a check-in')).toBeVisible();
  await page.getByRole('tabpanel').getByRole('button', { name: 'Record a check-in', exact: true }).click();
  await expect(page.getByLabel('Weight (kg)', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Save check-in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Add at least one measurement to record a check-in.');
  await expect(page.getByRole('button', { name: 'Use this estimate' })).toBeDisabled();
  await view(page, 'Targets').click(); await page.getByRole('button', { name: 'Set your first target' }).click();
  await page.getByLabel('New goal (kg)', { exact: true }).fill('70'); await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await expect(page.getByText('Weight target saved.')).toBeVisible();
});

test('imperial inputs save metric values and snapshot errors explain partial saves', async ({ page }) => {
  const writes = await seedPhysique(page, { imperial: true, failSnapshot: true }); await page.goto('/wellness/physique?view=measurements');
  await page.getByLabel('Weight (lb)', { exact: true }).fill('165'); await page.getByRole('button', { name: 'Save check-in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Measurements saved, but the history snapshot failed.');
  expect(writes[0].payload.weightKg).toBeCloseTo(74.8427, 3); await expect(page.getByText('Unsaved changes', { exact: false })).toHaveCount(0);
});

test('failed profile saves preserve the draft and do not write history', async ({ page }) => {
  const writes = await seedPhysique(page, { failProfile: true }); await page.goto('/wellness/physique?view=measurements');
  const weight = page.getByLabel('Weight (kg)', { exact: true }); await weight.fill('75');
  await page.getByRole('button', { name: 'Save check-in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Your changes are still here'); await expect(weight).toHaveValue('75'); expect(writes).toHaveLength(1);
});

test('3D mirror detail tabs are accessible and responsive', async ({ page }) => {
  await seedPhysique(page); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/wellness/physique?view=3d'); await expect(page.getByRole('heading', { name: '3D Mirror', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Appearance studio', exact: true }).click();
  const editor = page.getByRole('tablist', { name: 'Avatar editor', exact: true });
  await expect(editor).toBeVisible({ timeout: 30000 });
  for (const name of ['Measure', 'Face', 'Hair', 'Skin', 'Anatomy', 'Clothing', 'View']) {
    await editor.getByRole('tab', { name, exact: true }).click();
    await expect(editor.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#avatar-editor-panel')).toBeVisible();
    await noPageOverflow(page);
  }
  await editor.getByRole('tab', { name: 'View', exact: true }).focus(); await page.keyboard.press('Home');
  await expect(editor.getByRole('tab', { name: 'Measure', exact: true })).toBeFocused();
  await page.getByText('History, snapshots and measurements', { exact: true }).click();
  const details = page.getByRole('tablist', { name: 'Physique details', exact: true }); await expect(details).toBeVisible({ timeout: 30000 });
  await details.getByRole('tab', { name: 'Summary', exact: true }).focus(); await page.keyboard.press('ArrowRight');
  await expect(details.getByRole('tab', { name: 'Measurements', exact: true })).toBeFocused();
  await page.getByRole('searchbox', { name: 'Search measurements', exact: true }).fill('no-matching-metric');
  await expect(page.getByText('No matching measurements', { exact: true })).toBeVisible();
  await details.getByRole('tab', { name: 'Journey', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Saved snapshots', exact: true })).toBeVisible();
  await details.getByRole('tab', { name: 'Model', exact: true }).click(); await expect(page.getByText('About your 3D preview', { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath('physique-mirror-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await noPageOverflow(page);
  expect(await page.locator('.chamber-editor').evaluate(element => getComputedStyle(element).position)).toBe('relative');
  expect(await page.locator('.chamber-editor').evaluate(element => element.getBoundingClientRect().top >= document.querySelector('.chamber-viewport').getBoundingClientRect().bottom - 1)).toBe(true);
  // The renderer pauses offscreen. Bring it into view after resizing so the
  // preserved frame in the full-page screenshot reflects the mobile canvas.
  const renderer = page.getByRole('img', { name: /^Interactive three-dimensional physique model/ });
  await renderer.scrollIntoViewIfNeeded();
  await expect(renderer).toHaveAttribute('data-rendering', 'active');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: test.info().outputPath('physique-mirror-mobile.png'), fullPage: true }); expect(errors).toEqual([]);
});

test('editing a live metric leaves the frozen timeline and shows the edited clone', async ({ page }) => {
  await seedPhysique(page);
  await page.goto('/wellness/physique?view=3d');
  await expect(page.getByRole('heading', { name: '3D Mirror', exact: true })).toBeVisible();
  await page.getByText('History, snapshots and measurements', { exact: true }).click();
  const timelineMode = page.getByRole('button', { name: 'Open timeline', exact: true });
  const currentMode = page.getByRole('group', { name: 'Comparison mode' }).getByRole('button', { name: 'Current', exact: true });
  await timelineMode.click();
  await expect(page.getByRole('slider', { name: 'Timeline position' })).toBeVisible();
  const currentWeight = page.getByRole('textbox', { name: 'Current Weight (kg)', exact: true });
  await currentWeight.fill('75');
  await currentWeight.press('Enter');
  await expect(currentWeight).toHaveValue('75');
  await expect(currentMode).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('slider', { name: 'Timeline position' })).toBeHidden();
});

import { test, expect, emptyState, OWNER } from './foundation-fixture';

test.use({ reducedMotion: 'reduce' });
const skill = { id: 'drawing', name: 'Drawing', category: 'creative', xp: 25, practiceCount: 1 };
const goal = { id: 'reading', userId: OWNER.id, title: 'Read ten books', category: 'personal', status: 'active', priority: 'medium', target_value: 10, current_value: 2, unit: 'books', subtasks: [] };

test.beforeEach(async ({ page }) => {
  const state = { ...emptyState(), user: { ...OWNER, skills: [skill] }, goals: [goal] };
  await page.route('**/api/state', route => route.fulfill({ json: { ...state, healthProfile: { recoveryMetrics: [{ id: 'recovery', name: 'Readiness', value: '5', status: 'Pending' }] } } }));
  await page.route('**/api/goal_progress_logs?*', route => route.fulfill({ json: [] }));
  await page.route(url => /^\/api\/(skills|goals|health-profile)(\/|$)/.test(url.pathname), async route => {
    if (route.request().method() === 'GET') { await route.fulfill({ json: urlRows(route.request().url()) }); return; }
    await route.fulfill({ status: 409, json: { code: 'VERSION_CONFLICT', error: 'Save rejected. Your draft is still available.' } });
  });
});
const urlRows = (url: string) => url.includes('/goals') ? [goal] : [];

test('Skills keeps a rejected creation draft and does not announce success', async ({ page }) => {
  await page.goto('/workspace/skills');
  await page.getByRole('button', { name: 'Add Skill', exact: true }).click();
  await page.getByRole('textbox', { name: 'Skill name', exact: true }).fill('Retain this skill draft');
  await page.getByRole('button', { name: 'Add skill', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('This item has changed');
  await expect(page.getByRole('textbox', { name: 'Skill name', exact: true })).toHaveValue('Retain this skill draft');
  await expect(page.getByText('Skill "Retain this skill draft" added!')).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('skills-save-result.png'), fullPage: true });
});

test('Goals retains a rejected subtask and offers an error instead of losing the draft', async ({ page }) => {
  await page.goto('/workspace/goals');
  await page.getByRole('button', { name: 'Expand Read ten books', exact: true }).click();
  await page.getByRole('textbox', { name: 'Add a sub-task to Read ten books', exact: true }).fill('Keep this step');
  await page.getByRole('button', { name: 'Add sub-task to Read ten books', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'This item has changed' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Add a sub-task to Read ten books', exact: true })).toHaveValue('Keep this step');
  await page.screenshot({ path: test.info().outputPath('goal-subtask-save-result.png'), fullPage: true });
});

test('Health recovery edits stay local until Save and survive a rejected save', async ({ page }) => {
  let writes = 0;
  page.on('request', request => { if (request.url().includes('/api/health-profile') && request.method() === 'PUT') writes++; });
  await page.goto('/wellness/health');
  await page.getByPlaceholder('Metric name').fill('Readiness draft');
  await page.screenshot({ path: test.info().outputPath('health-edit-result.png'), fullPage: true });
  expect(writes).toBe(0);
  await page.getByRole('button', { name: 'Save recovery metrics', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('This item has changed');
  await expect(page.getByPlaceholder('Metric name')).toHaveValue('Readiness draft');
  expect(writes).toBe(1);
  await page.screenshot({ path: test.info().outputPath('health-save-rejected.png'), fullPage: true });
});

test('Mind tabs support direct URLs, keyboard navigation and browser Back', async ({ page }) => {
  await page.goto('/wellness/mind?view=journal&keep=yes');
  await expect(page.getByPlaceholder('Start writing here...')).toBeVisible();
  await page.getByRole('tab', { name: 'Breathe', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/view=breathe/);
  await expect(page).toHaveURL(/keep=yes/);
  await page.goBack();
  await expect(page.getByPlaceholder('Start writing here...')).toBeVisible();
});

for (const viewport of [{ width: 390, height: 844 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`Skills form and practice controls fit ${viewport.width}px without clipped fields`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/api/state', route => route.fulfill({ json: { ...emptyState(), user: { ...OWNER, skills: [skill] }, preference: { ...emptyState().preference, theme: viewport.width === 390 ? 'dark' : 'light', density: viewport.width === 1024 ? 'compact' : 'comfortable' } } }));
    await page.goto('/workspace/skills');
    await page.getByRole('button', { name: 'Add Skill', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Skill description' })).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'XP for Drawing' })).toBeVisible();
    await expect.poll(() => page.locator('#main-content').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`skills-${viewport.width}.png`), fullPage: true });
  });
}

test('Health sensory detail supports Enter, trapped focus and Escape without missing-field errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/state', route => route.fulfill({ json: { ...emptyState(), healthProfile: { senses: { vision: { level: 50, currentPower: 'Recorded', targetPower: 'Target' } } } } }));
  await page.goto('/wellness/health');
  const trigger = page.getByRole('button', { name: 'Open vision details' });
  await trigger.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'vision details' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Acknowledge & Close' }).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close dialog' })).toBeFocused();
  await page.screenshot({ path: test.info().outputPath('health-sensory-dialog.png') });
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test('Goal progress makes one acknowledged operation and retries failed history explicitly', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  let writes = 0, goalWrites = 0, failHistory = true;
  page.on('request', request => { if (request.url().includes('/api/goals/') && request.method() === 'PUT') goalWrites++; });
  await page.route('**/api/goal_progress_logs?*', route => failHistory
    ? route.fulfill({ status: 409, json: { error: 'History unavailable' } })
    : route.fulfill({ json: [] }));
  await page.route('**/api/goal_progress_logs', async route => {
    writes++;
    const input = route.request().postDataJSON();
    await route.fulfill({ json: { ...input, userId: OWNER.id, goal: { ...goal, current_value: input.value, status: 'completed' } } });
  });
  await page.goto('/workspace/goals'); await page.getByRole('button', { name: 'Expand Read ten books', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry progress history' })).toBeVisible();
  failHistory = false; await page.getByRole('button', { name: 'Retry progress history' }).click();
  await expect(page.getByRole('button', { name: 'Retry progress history' })).toHaveCount(0);
  await page.getByRole('spinbutton', { name: 'Value (books)', exact: true }).fill('10');
  await page.getByRole('button', { name: 'Log', exact: true }).click();
  await expect(page.getByText('1 log entry — log more to see chart.')).toBeVisible();
  expect(writes).toBe(1); expect(goalWrites).toBe(0); expect(errors).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('goal-progress-saved.png'), fullPage: true });
});

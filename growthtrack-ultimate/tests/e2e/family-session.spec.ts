import { test, expect } from './foundation-fixture';

// These API fixtures never contact the owner's database or create real records.
for (const width of [1440, 390]) {
  test(`Me, Tamil relations and atomic person creation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const people: any[] = [{ id: 'person-a', name: 'Fictional You', gender: 'other' }, { id: 'person-b', name: 'Fictional Sibling' }];
    const relationships: any[] = [], writes: any[] = [];
    let meId: string | null = null;
    await page.route('**/api/native/family/**', async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
      expect(request.headers().authorization).toBeUndefined();
      if (method !== 'GET') expect(request.headers()['x-csrf-token']).toBe('isolated-test-csrf');
      if (path.endsWith('/session')) return route.fulfill({ json: { authMode: 'ultimate', user: { id: 'fixture-family', name: 'Test owner' } } });
      if (path.endsWith('/trees')) return route.fulfill({ json: [{ id: 'tree-a', name: 'Fictional family' }] });
      if (path.endsWith('/trees/tree-a/me')) {
        if (method === 'PUT') meId = request.postDataJSON().memberId;
        return route.fulfill({ json: { memberId: meId, member: people.find(person => person.id === meId) || null } });
      }
      if (path.endsWith('/trees/tree-a')) return route.fulfill({ json: { id: 'tree-a', name: 'Fictional family', currentUserRole: 'editor', members: people, relationships, _count: { members: people.length, relationships: relationships.length, documents: 0, events: 0 } } });
      if (path.endsWith('/members') && method === 'POST') {
        const body = request.postDataJSON(); writes.push(body);
        const person = { id: 'new-relative', name: body.name, gender: body.gender }; people.push(person);
        if (body.relative) relationships.push({ id: 'new-link', member1Id: person.id, member2Id: body.relative.memberId, ...body.relative });
        if (body.markAsMe) meId = person.id;
        return route.fulfill({ status: 201, json: person });
      }
      if (path.endsWith('/members')) return route.fulfill({ json: { rows: people, total: people.length } });
      if (/\/members\/[^/]+$/.test(path)) return route.fulfill({ json: people.find(person => person.id === path.split('/').at(-1)) });
      if (path.endsWith('/relationships') && method === 'POST') { writes.push(request.postDataJSON()); return route.fulfill({ status: 201, json: { id: 'fixture-link' } }); }
      return route.fulfill({ status: 404, json: { error: 'Unknown isolated fixture route' } });
    });
    await page.goto('/life/family');
    await page.getByRole('button', { name: 'Choose Me', exact: true }).click();
    await page.getByRole('combobox', { name: 'My person', exact: true }).fill('Fictional You');
    await page.getByRole('option', { name: 'Fictional You', exact: true }).click();
    await page.getByRole('button', { name: 'Mark as Me', exact: true }).click();
    await expect(page.getByText('Me: Fictional You', { exact: true })).toBeVisible();
    await expect(page.locator('[data-family-person][data-me=true]')).toHaveCount(1);

    await page.getByRole('button', { name: 'Add person', exact: true }).click();
    await page.getByLabel('Full name', { exact: true }).fill('Fictional Appa');
    await page.getByRole('combobox', { name: 'Relationship to this person', exact: true }).selectOption('appa');
    await expect(page.getByRole('status').filter({ hasText: 'Fictional Appa will be recorded as அப்பா' })).toContainText('of Fictional You');
    await page.screenshot({ path: `playwright-report/family-person-form-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Save to Family Connect', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Open Fictional Appa', exact: true })).toBeVisible();
    expect(writes[0]).toMatchObject({ name: 'Fictional Appa', markAsMe: false, relative: { memberId: 'person-a', presetId: 'appa', type: 'parent' } });
    await page.getByRole('button', { name: 'Open Fictional Appa', exact: true }).click();
    const profile = page.getByRole('dialog', { name: 'Fictional Appa', exact: true });
    await expect(profile.locator('.family-profile-relationships li').filter({ hasText: 'Fictional You' })).toContainText('Child');
    await page.getByRole('button', { name: 'This is me', exact: true }).click();
    await expect(page.getByText('Me: Fictional Appa', { exact: true })).toBeVisible();
    await expect(page.locator('[data-family-person][data-me=true]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Open Fictional Appa, Me', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open Fictional You', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Add relationship', exact: true }).click();
    await page.getByRole('combobox', { name: 'Their relative', exact: true }).fill('Fictional Sibling');
    await page.getByRole('option', { name: 'Fictional Sibling', exact: true }).click();
    await page.getByRole('combobox', { name: 'Relationship to this person', exact: true }).selectOption('mama');
    await expect(page.getByRole('status').filter({ hasText: 'Fictional Sibling will be recorded as மாமா' })).toContainText('of Fictional Appa');
    await page.getByRole('button', { name: 'Save to Family Connect', exact: true }).click();
    expect(writes[1]).toMatchObject({ member1Id: 'person-b', member2Id: 'new-relative', presetId: 'mama', type: 'aunt_uncle' });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('tab', { name: 'People', exact: true }).click();
    await page.getByRole('button').filter({ hasText: 'Fictional Sibling' }).click();
    await page.getByRole('button', { name: 'Show in tree', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Open Fictional Sibling', exact: true })).toBeVisible();
    await expect(page.getByText('Me: Fictional Appa', { exact: true })).toBeVisible();
    await expect(page.locator('[data-family-person][data-me=true]')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `playwright-report/family-kinship-${width}.png`, fullPage: true });
  });
  test(`Compact workspace, filters and viewer permissions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const queries: string[] = [], errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/native/family/**', async route => {
      const url = new URL(route.request().url()), path = url.pathname;
      queries.push(url.search);
      if (path.endsWith('/session')) return route.fulfill({ json: { user: { id: 'fixture-family', name: 'Test owner' }, authMode: 'ultimate' } });
      if (path.endsWith('/trees')) return route.fulfill({ json: [{ id: 'tree-a', name: 'Fictional family' }] });
      if (path.endsWith('/me')) return route.fulfill({ json: { memberId: null, member: null } });
      if (path.endsWith('/trees/tree-a')) return route.fulfill({ json: { id: 'tree-a', name: 'Fictional family', currentUserRole: 'viewer', members: [{ id: 'a', name: 'Fictional Person' }], relationships: [], _count: { members: 1, relationships: 0, documents: 0, events: 0 } } });
      if (path.includes('/access')) return route.fulfill({ json: [] });
      return route.fulfill({ json: { rows: [], total: 0 } });
    });
    await page.goto('/life/family');
    await expect(page.getByRole('button', { name: 'Open Fictional Person', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add person', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Fit to Screen', exact: true })).toBeVisible();
    for (const tab of ['People', 'Memories', 'Private vault', 'Timeline', 'Access']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await expect(page.getByLabel('Active tree', { exact: true })).toHaveCount(1);
      await expect(page.locator('.native-hero')).toHaveCount(0);
      if (width === 390) expect((await page.locator('.family-context').boundingBox())!.height).toBeLessThan(175);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (tab === 'People') {
        await page.getByLabel('Living status', { exact: true }).selectOption('deceased');
        await expect.poll(() => queries.some(query => query.includes('life=deceased'))).toBe(true);
        await page.getByRole('button', { name: 'List', exact: true }).click();
        await expect(page.getByRole('button', { name: 'List', exact: true })).toHaveAttribute('aria-pressed', 'true');
      }
      if (tab === 'Private vault') await expect(page.getByText('Tree-level sharing · per-document permissions and encryption are not configured.')).toBeVisible();
      if (tab === 'Timeline') {
        await page.getByLabel('Event type', { exact: true }).selectOption('birthday');
        await expect.poll(() => queries.some(query => query.includes('type=birthday'))).toBe(true);
      }
      await expect(page.getByRole('button', { name: 'Invite user', exact: true })).toHaveCount(0);
      await page.screenshot({ path: `playwright-report/family-${tab.replaceAll(' ', '-')}-${width}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });
  test(`Family opens in the Ultimate session and recovers without another login at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    let unavailable = true, opened = 0;
    await page.route('**/api/native/family/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      expect(request.headers().authorization).toBeUndefined();
      if (path.endsWith('/session')) {
        expect(request.method()).toBe('POST');
        expect(request.headers()['x-csrf-token']).toBe('isolated-test-csrf');
        opened++;
        return unavailable
          ? route.fulfill({ status: 503, json: { error: 'Family service is unavailable.' } })
          : route.fulfill({ json: { authMode: 'ultimate', user: { id: 'fixture-family', name: 'Test owner' } } });
      }
      if (path.endsWith('/trees')) return route.fulfill({ json: [] });
      return route.fulfill({ status: 404, json: { error: 'Unknown fixture route' } });
    });
    await page.goto('/life/family');
    await expect(page.getByRole('alert').filter({ hasText: 'Family service is unavailable.' })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
    unavailable = false;
    await page.getByRole('button', { name: 'Retry Family connection' }).click();
    await expect(page.getByText('Ultimate session · Test owner')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New tree', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Disconnect Family account' })).toHaveCount(0);
    expect(opened).toBeGreaterThanOrEqual(2);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `playwright-report/family-session-${width}.png`, fullPage: true });
  });
}

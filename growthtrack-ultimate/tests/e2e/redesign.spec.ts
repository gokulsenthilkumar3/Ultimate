import { test, expect, emptyState } from './foundation-fixture';
import { setupHumanViewer } from './helpers/human-viewer';
import { FEATURES } from '../../src/config/featureRegistry';

test('every approved host route renders one clear page heading without page errors', async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width:1366, height:768 });
  for (const feature of FEATURES) {
    await page.goto(feature.canonicalPath, { waitUntil:'domcontentloaded' });
    await expect(page.locator('#main-content h1'), feature.canonicalPath).toHaveCount(1);
    await expect(page.locator('#main-content h1'), feature.canonicalPath).toBeVisible();
    expect(errors, feature.canonicalPath).toEqual([]);
    expect(await page.locator('#main-content').evaluate(node => node.scrollWidth-node.clientWidth), feature.canonicalPath).toBeLessThanOrEqual(1);
  }
});

test('comparison workspace starts with the model on a laptop and keeps the studio secondary', async ({ page }) => {
  const fixture = await setupHumanViewer(page, 'reduce', {}, {}, { studio:false, tools:false });
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => scrollTo(0, 0));
    const canvas = page.locator('.chamber-canvas-wrap');
    const bounds = await canvas.boundingBox();
    expect(bounds!.y, `model starts in the first screen at ${viewport.width}`).toBeLessThanOrEqual(220);
    expect(bounds!.height).toBeGreaterThanOrEqual(360);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    await expect(page.getByRole('button', { name: 'Compare', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Appearance studio', exact: true })).toBeVisible();
    expect(await page.locator('#main-content').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`comparison-${viewport.width}.png`) });
  }
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Current and goal measurements' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Current and goal measurements' })).toContainText('74');
  await expect(page.getByRole('region', { name: 'Current and goal measurements' })).toContainText('70');
  await expect(page.getByRole('tablist', { name: 'Avatar editor' })).toBeHidden();
  await page.getByRole('button', { name: 'Appearance studio', exact: true }).click();
  await expect(page.getByRole('tablist', { name: 'Avatar editor' })).toBeVisible();
  for (const name of ['Face', 'Hair', 'Skin', 'Anatomy', 'Clothing', 'Pose', 'View']) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.locator('#avatar-editor-panel')).toBeVisible();
  }
  await page.getByRole('button', { name: 'Body comparison', exact: true }).click();
  await expect(page.getByRole('tablist', { name: 'Avatar editor' })).toBeHidden();
  await expect(page.getByRole('region', { name: 'Current and goal measurements' })).toBeVisible();
  expect(fixture.bodyWrites).toHaveLength(0);
  expect(fixture.errors).toEqual([]);
});

test('body comparison keeps narrow and dark layouts usable', async ({ page }) => {
  await setupHumanViewer(page, 'reduce', {}, {}, { studio:false, tools:false });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath('comparison-dark.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Appearance studio', exact: true })).toBeVisible();
  expect(await page.locator('#main-content').evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: test.info().outputPath('comparison-mobile.png') });
});

test('daily nutrition logging leads the page and the target calculator is optional', async ({ page }) => {
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/wellness/nutrition');
  const name=page.getByRole('textbox',{name:'Meal name'});
  await expect(name).toBeVisible();
  expect((await name.boundingBox())!.y).toBeLessThan(400);
  const calculator=page.locator('details.nutrition-calculator');
  await expect(calculator).not.toHaveAttribute('open');
  await calculator.locator('summary').click();
  await expect(calculator).toHaveAttribute('open','');
  await page.screenshot({path:test.info().outputPath('nutrition-calculator.png')});
});

test('transaction filters retain their URL and export only matching rows', async ({page})=>{
  const rows=[{id:'fixture-food',date:'2026-10-20',type:'Expense',category:'Food',amount:1200,note:'Fixture groceries',method:'Card'}, {id:'fixture-rent',date:'2026-10-10',type:'Expense',category:'Rent',amount:15000,note:'Fixture rent',method:'Bank'}];
  await page.route('**/api/state',route=>route.fulfill({json:{...emptyState(),finance:rows}}));
  await page.route('**/api/finance',route=>route.fulfill({json:rows}));
  await page.goto('/finance/transactions');
  const advanced=page.locator('details.finance-more-filters');
  await expect(advanced).not.toHaveAttribute('open');
  await advanced.locator('summary').click();
  await page.getByRole('combobox',{name:'Filter category',exact:true}).selectOption('Food');
  await expect(page).toHaveURL(/category=Food/);
  await expect(page.getByRole('table')).toContainText('Fixture groceries');
  await expect(page.getByRole('table')).not.toContainText('Fixture rent');
  await advanced.locator('summary').click();
  await expect(page.getByRole('button',{name:'Remove category filter: Food'})).toBeVisible();
  const pending=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export filtered CSV (1)'}).click();
  const download=await pending;
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
  const stream=await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks:Buffer[]=[];
  for await(const chunk of stream!)chunks.push(Buffer.from(chunk));
  const csv=Buffer.concat(chunks).toString('utf8');
  expect(csv).toContain('Fixture groceries');
  expect(csv).not.toContain('Fixture rent');
  await page.reload();
  await expect(advanced).toHaveAttribute('open','');
  await expect(page.getByRole('combobox',{name:'Filter category',exact:true})).toHaveValue('Food');
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();
  await expect(page.getByRole('table')).toContainText('Fixture rent');
});

test('failed 3D check-ins do not create a timeline snapshot and pending saves are guarded', async ({page})=>{
  await setupHumanViewer(page,'reduce',{}, {}, {studio:false,tools:false});
  let writes=0;let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/metric_logs',async route=>{writes++;await gate;return route.fulfill({status:503,json:{error:'Fixture save rejected'}});});
  const save=page.getByRole('button',{name:'Save check-in',exact:true});
  await save.click();
  await expect(page.getByRole('button',{name:'Saving check-in…',exact:true})).toBeDisabled();
  expect(writes).toBe(1);
  release();
  await expect(page.getByText('Could not save the snapshot.',{exact:true})).toBeVisible();
  await page.getByText('History, snapshots and measurements',{exact:true}).click();
  await expect(page.getByRole('button',{name:'Open timeline',exact:true})).toBeDisabled();
  await page.route('**/api/metric_logs',route=>route.fulfill({json:{...route.request().postDataJSON(),id:'acknowledged-fixture-snapshot'}}));
  await save.click();
  await expect(page.getByRole('button',{name:'Open timeline',exact:true})).toBeEnabled();
  await expect(page.getByText('1 saved snapshot',{exact:true})).toBeVisible();
});

test('public pages reflow and failed sign-in remains readable and retryable', async ({page})=>{
  await page.route('**/api/auth/me',route=>route.fulfill({status:401,json:{error:'No fixture session'}}));
  await page.route(url=>url.pathname.includes('/auth/')&&!url.pathname.endsWith('/me'),async route=>{
    if(route.request().method()==='POST')return route.fulfill({status:401,json:{error:'Fixture sign-in rejected'}});
    return route.fallback();
  });
  for(const width of [1280,768,390,320]){
    await page.setViewportSize({width,height:800});
    for(const url of ['/welcome','/login','/privacy','/terms']){
      await page.goto(url);
      await expect(page.getByRole('heading',{level:1})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),`${url} at ${width}`).toBeLessThanOrEqual(1);
    }
  }
  await page.goto('/login');
  await page.getByRole('textbox',{name:'Email address',exact:true}).fill('alex@example.test');
  await page.locator('input[name="password"]').fill('isolated-test-value');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeEnabled();
  await expect(page.getByRole('textbox',{name:'Email address',exact:true})).toHaveValue('alex@example.test');
});

test('record pages reflow at scaled widths and preserve focus in forced colors', async ({page})=>{
  test.setTimeout(180000);
  for(const viewport of [{width:1024,height:640},{width:768,height:1024},{width:390,height:844},{width:320,height:800}]){
    await page.setViewportSize(viewport);
    for(const url of ['/hub/apps','/wellness/nutrition','/finance/transactions','/hub/notifications','/workspace/notes','/workspace/tasks','/hub/settings']){
      await page.goto(url);
      await expect(page.locator('#main-content h1')).toBeVisible();
      expect(await page.locator('#main-content').evaluate(main=>main.scrollWidth-main.clientWidth),`${url} at ${viewport.width}`).toBeLessThanOrEqual(1);
    }
  }
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  await page.goto('/finance/transactions');
  const action=page.getByRole('button',{name:'New transaction',exact:true});
  await action.focus();await expect(action).toBeFocused();
  expect(await action.evaluate(button=>getComputedStyle(button).outlineStyle)).not.toBe('none');
  await page.screenshot({path:test.info().outputPath('forced-colors-320.png')});
});

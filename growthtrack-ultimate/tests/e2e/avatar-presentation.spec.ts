import { test, expect, OWNER, emptyState } from './foundation-fixture';

async function seed(page) {
  let targets:any = { retainedSetting:'keep-me' };
  const writes:{path:string,data:any}[] = [];
  const body = { heightCm:175,weightKg:74,bodyFatPct:19,waistCm:82,chestCm:99,hipsCm:96,shouldersCm:112,armsCm:33,neckCm:37,modelPreset:'male',biologicalSex:'male' };
  await page.route(url => ['/api/state','/api/body-profile','/api/physique_targets'].includes(url.pathname), route => {
    const request = route.request(),path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') {
      const data = request.postDataJSON(); writes.push({path,data});
      if (path === '/api/physique_targets') targets = data;
      return route.fulfill({ json:data });
    }
    return route.fulfill({ json:{ ...emptyState(),user:{ ...OWNER,dob:'1990-01-01',physiqueTargets:targets },bodyProfile:body } });
  });
  await page.emulateMedia({ reducedMotion:'reduce',colorScheme:'light' });
  return { writes,targets:() => targets };
}

test('live evidence, customization and renderer effects persist without changing body records', async ({ page }) => {
  page.setDefaultTimeout(15_000);
  const state = await seed(page),errors:string[] = [];
  page.on('pageerror',error => errors.push(error.message));
  await page.setViewportSize({width:1440,height:1050});
  await page.goto('/wellness/physique?view=3d');
  const chamber = page.locator('.chamber-fullscreen-wrap');
  const evidence = page.getByRole('region',{name:'Avatar evidence and readiness'});
  await page.getByText('Model information and readiness',{exact:true}).click();
  await expect(evidence).toContainText('Not assessed');
  await expect(evidence.getByRole('progressbar')).toHaveAttribute('value','7');
  await expect(evidence).toContainText('7 of 10 key measurements recorded');
  await expect(page.getByText('Restoration Plan',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Appearance studio',exact:true}).click();
  await page.getByRole('tab',{name:'View',exact:true}).click();
  await page.getByLabel('Avatar spacing',{exact:true}).selectOption('compact');
  await page.getByLabel('Measurement help detail',{exact:true}).selectOption('concise');
  const width = page.getByRole('slider',{name:'Inspector width',exact:true});
  await width.fill('480');
  await page.getByRole('checkbox',{name:'Interface effects',exact:true}).uncheck();
  await expect(chamber).toHaveAttribute('data-density','compact');
  await expect(chamber).toHaveAttribute('data-interface-effects','off');
  await expect.poll(() => state.targets().viewerPreferences).toMatchObject({density:'compact',guideDetail:'concise',interfaceEffects:false,inspectorWidth:480});
  await expect(page.getByText('Layout saved',{exact:true})).toBeVisible();

  const canvas = page.locator('.chamber-canvas-wrap canvas');
  await page.locator('.workspace-field').filter({hasText:'Quality'}).getByRole('combobox').selectOption('balanced');
  const shading = page.getByRole('checkbox',{name:'Edge shading',exact:true});
  await shading.check();
  await expect(canvas).toHaveAttribute('data-active-effects',/vignette/,{timeout:30000});
  await shading.uncheck();
  await expect(canvas).not.toHaveAttribute('data-active-effects',/vignette/);
  await expect.poll(() => state.targets().renderSettings?.vignette).toBe(false);
  expect(state.targets().retainedSetting).toBe('keep-me');
  expect(state.targets().viewerPreferences.inspectorWidth).toBe(480);
  expect(state.writes.every(write => write.path === '/api/physique_targets')).toBe(true);

  const lightColor = await evidence.locator('article').first().evaluate(el => getComputedStyle(el).backgroundColor);
  await page.locator('.chamber-viewport').scrollIntoViewIfNeeded();
  await chamber.screenshot({path:test.info().outputPath('avatar-light-desktop.png')});
  await page.emulateMedia({colorScheme:'dark'});
  await expect.poll(() => evidence.locator('article').first().evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(lightColor);
  await chamber.screenshot({path:test.info().outputPath('avatar-dark-desktop.png')});
  await page.reload();
  await expect(chamber).toHaveAttribute('data-density','compact');
  await expect(chamber).toHaveAttribute('data-interface-effects','off');
  await expect(chamber).toHaveCSS('--avatar-inspector-width','480px');
  const openStudio=page.getByRole('button',{name:'Appearance studio',exact:true});
  if(await openStudio.isVisible())await openStudio.click();
  await page.getByRole('tab',{name:'View',exact:true}).click();
  await expect(page.getByLabel('Measurement help detail',{exact:true})).toHaveValue('concise');
  await expect(shading).not.toBeChecked();
  await page.getByRole('tab',{name:'Measure',exact:true}).click();
  await expect(page.locator('.measurement-help__instructions[open]')).toHaveCount(0);
  await page.getByRole('tab',{name:'View',exact:true}).click();
  const accent = await chamber.evaluate(el => getComputedStyle(el).getPropertyValue('--gt-action'));
  await page.evaluate(() => {
    document.documentElement.dataset.palette = 'ocean';
    document.querySelector<HTMLElement>('.app-shell')!.dataset.palette = 'ocean';
  });
  await expect.poll(() => chamber.evaluate(el => getComputedStyle(el).getPropertyValue('--gt-action'))).not.toBe(accent);

  await page.setViewportSize({width:390,height:844});
  await page.getByRole('tab',{name:'View',exact:true}).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const model = await page.locator('.chamber-viewport').boundingBox(),inspector = await page.locator('.chamber-editor').boundingBox();
  expect(inspector!.y).toBeGreaterThanOrEqual(model!.y + model!.height);
  await chamber.screenshot({path:test.info().outputPath('avatar-mobile.png')});
  await page.goto('/wellness/physique?view=measurements');
  await page.getByRole('button',{name:'How to measure Waist',exact:true}).click();
  await expect(page.getByRole('region',{name:'How to measure Waist',exact:true}).locator('.measurement-help__instructions')).not.toHaveAttribute('open');
  expect(errors).toEqual([]);
});

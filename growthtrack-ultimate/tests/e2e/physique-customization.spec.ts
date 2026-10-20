import { test,expect,OWNER,emptyState } from './foundation-fixture';

async function seed(page) {
  let targets:any={keep:'preserve'};
  const body={heightCm:175,weightKg:74,bodyFatPct:19,waistCm:82,chestCm:99,hipsCm:96,shouldersCm:112,armsCm:33,neckCm:37,modelPreset:'male',biologicalSex:'male'};
  await page.route(url=>['/api/state','/api/body-profile','/api/physique_targets'].includes(url.pathname),route=> {
    const request=route.request(),path=new URL(request.url()).pathname;
    if(request.method()!=='GET') {
      const data=request.postDataJSON();
      if(path==='/api/physique_targets') targets=data;
      if(path==='/api/body-profile') Object.assign(body,data);
      return route.fulfill({json:data});
    }
    return route.fulfill({json:{...emptyState(),user:{...OWNER,dob:'1990-01-01',physiqueTargets:targets},bodyProfile:body}});
  });
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'light'});
  page.setDefaultTimeout(15000);
  return ()=>targets;
}
test('private dimensions, states, guides and local appearance reach the surface and round-trip',async({page})=> {
  const targets=await seed(page),errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1050});await page.goto('/wellness/physique?view=3d');
  const editor=page.getByRole('tablist',{name:'Avatar editor'});
  await editor.getByRole('tab',{name:'Anatomy',exact:true}).click();
  await expect(page.getByRole('button',{name:'Anatomical mode',exact:true})).toBeEnabled({timeout:30000});
  await page.getByRole('button',{name:'Anatomical mode',exact:true}).click();
  const panel=page.getByRole('region',{name:'Private anatomy customization'});
  const input=panel.getByLabel('Resting length current (cm)',{exact:true});
  await input.fill('22');await input.press('Tab');
  await expect(panel).toContainText('Outside suggested preview range 3–16');
  await expect.poll(()=>targets().anatomyV2?.current?.penis?.resting?.measurements?.lengthCm).toBe(22);
  await expect(panel.getByRole('definition').filter({hasText:'22.0 cm'})).toBeVisible();
  const base=panel.getByLabel('Base circumference current (cm)',{exact:true});await base.fill('18');await base.press('Tab');
  await panel.getByRole('button',{name:'Erect',exact:true}).click();
  const erect=panel.getByLabel('Erect length current (cm)',{exact:true});await erect.fill('19');await erect.press('Tab');
  await panel.getByRole('checkbox',{name:'3D anatomy guides'}).check();
  await panel.getByRole('button',{name:'Inspect edited region'}).click();
  const canvas=page.locator('.chamber-canvas-wrap canvas');await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-focus','anatomy');
  await expect(canvas).toHaveAttribute('data-camera-region-source','evaluated-surface');
  await page.locator('.chamber-viewport').screenshot({path:test.info().outputPath('private-guides.png')});
  await panel.getByRole('button',{name:'Scrotum',exact:true}).click();
  await panel.getByLabel('Sac width current (cm)',{exact:true}).fill('8');await panel.getByLabel('Sac width current (cm)',{exact:true}).press('Tab');
  await panel.getByRole('button',{name:'Skin regions',exact:true}).click();
  const shaft=panel.locator('.anatomy-customizer__skin-row').filter({has:page.getByText('Shaft',{exact:true})});
  await shaft.getByRole('checkbox').check();
  await expect.poll(()=>targets().anatomyV2?.current?.skinRegions?.shaft?.enabled).toBe(true);
  await panel.getByRole('combobox',{name:'Profile',exact:true}).selectOption('goal');
  await panel.getByRole('button',{name:'Penis',exact:true}).click();
  await panel.getByRole('button',{name:'Resting',exact:true}).click();
  const goal=panel.getByLabel('Resting length goal (cm)',{exact:true});await goal.fill('15');await goal.press('Tab');
  await expect.poll(()=>targets().anatomyV2?.goal?.penis?.resting?.measurements?.lengthCm).toBe(15);
  expect(targets().anatomyV2.current.penis.resting.measurements.lengthCm).toBe(22);
  await panel.getByRole('combobox',{name:'Profile',exact:true}).selectOption('current');
  await expect(input).toHaveValue('22');
  expect(targets().keep).toBe('preserve');
  await page.reload();await editor.getByRole('tab',{name:'Anatomy',exact:true}).click();
  // Reveal remains an explicit session action even after restoring records.
  await expect(page.getByRole('button',{name:'Anatomical mode',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Anatomical mode',exact:true})).toBeEnabled({timeout:30000});
  await page.getByRole('button',{name:'Anatomical mode',exact:true}).click();
  await expect(input).toHaveValue('22');
  expect(errors).toEqual([]);
});

test('underwear, gym and casual have visible variants, fit and saved colors',async({page})=> {
  const targets=await seed(page),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1050});await page.goto('/wellness/physique?view=3d');
  const editor=page.getByRole('tablist',{name:'Avatar editor'});
  await editor.getByRole('tab',{name:'Clothing',exact:true}).click();
  const panel=page.getByRole('tabpanel',{name:'Clothing',exact:true}),canvas=page.locator('.chamber-canvas-wrap canvas');
  const shots:Buffer[]=[];
  for(const [preset,variant] of [['Underwear','briefs'],['Gym','training'],['Casual','sweatshirt'],['Formal','shirt'],['Swimwear','board']]) {
    await panel.getByRole('button',{name:preset,exact:true}).click();
    await panel.getByRole('combobox',{name:'Garment style'}).selectOption(variant);
    const variants=preset==='Underwear'?['trunks','boxerBriefs','briefs']:preset==='Gym'?['tank','compression','training']:preset==='Casual'?['tee','sweatshirt']:[variant];
    for(const style of variants) await panel.getByRole('combobox',{name:'Garment style'}).selectOption(style);
    await panel.getByRole('combobox',{name:'Garment fit'}).selectOption('relaxed');
    await canvas.scrollIntoViewIfNeeded();await expect(canvas).toHaveAttribute('data-camera-distance',/\d/);
    // Give the shader a rendered frame after changing the real geometry shell.
    await canvas.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const shot=await canvas.screenshot({path:test.info().outputPath(`${preset.toLowerCase()}.png`)});shots.push(shot);
  }
  expect(shots[0].equals(shots[1])).toBe(false);expect(shots[1].equals(shots[2])).toBe(false);
  await panel.getByRole('button',{name:'Casual',exact:true}).click();
  await panel.getByLabel('Top color',{exact:true}).fill('#668899');
  await expect.poll(()=>targets().wardrobePreferences?.outfits?.CASUAL?.topColor).toBe('#668899');
  expect(targets().keep).toBe('preserve');
  await page.reload();await editor.getByRole('tab',{name:'Clothing',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Casual',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(panel.getByLabel('Top color',{exact:true})).toHaveValue('#668899');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(errors).toEqual([]);
});

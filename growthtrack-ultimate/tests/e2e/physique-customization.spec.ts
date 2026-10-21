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
  const modelRequests:string[]=[];page.on('request',request=>{if(/humanoid-adult-v2(?:-lite)?\.glb/.test(request.url()))modelRequests.push(request.url());});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=> {if(message.type()==='error' && /WebGLProgram|VALIDATE_STATUS|Shader Error/.test(message.text())) errors.push(message.text());});
  await page.setViewportSize({width:1440,height:1050});await page.goto('/wellness/physique?view=3d');
  const editor=page.getByRole('tablist',{name:'Avatar editor'});
  await editor.getByRole('tab',{name:'Anatomy',exact:true}).click();
  await expect(page.getByRole('button',{name:'Anatomical mode',exact:true})).toBeEnabled({timeout:30000});
  await page.getByRole('button',{name:'Anatomical mode',exact:true}).click();
  expect(modelRequests.length).toBeGreaterThan(0);
  const panel=page.getByRole('region',{name:'Private anatomy customization'});
  const input=panel.getByLabel('Resting length current (cm)',{exact:true});
  await input.fill('22');await input.press('Tab');
  await expect(panel).toContainText('Outside suggested preview range 3–16');
  await expect.poll(()=>targets().anatomyV2?.current?.penis?.resting?.measurements?.lengthCm).toBe(22);
  await expect(panel.getByRole('definition').filter({hasText:'22.0 cm'})).toBeVisible();
  const base=panel.getByLabel('Base circumference current (cm)',{exact:true});await base.fill('18');await base.press('Tab');
  await panel.getByRole('slider',{name:/^Foreskin coverage/}).focus();await panel.getByRole('slider',{name:/^Foreskin coverage/}).press('End');
  await panel.getByRole('slider',{name:/^Foreskin retraction/}).focus();await panel.getByRole('slider',{name:/^Foreskin retraction/}).press('End');
  await expect.poll(()=>targets().anatomyV2?.current?.penis?.resting?.shape?.foreskinRetraction).toBe(100);
  await panel.getByRole('button',{name:'Erect',exact:true}).click();
  const erect=panel.getByLabel('Erect length current (cm)',{exact:true});await erect.fill('19');await erect.press('Tab');
  await panel.getByRole('slider',{name:/^Elevation from horizontal/}).focus();await panel.getByRole('slider',{name:/^Elevation from horizontal/}).press('Home');
  await expect.poll(()=>targets().anatomyV2?.current?.penis?.erect?.shape?.elevationDeg).toBe(-85);
  expect(targets().anatomyV2.current.penis.resting.shape.foreskinRetraction).toBe(100);
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
  await expect(page.getByRole('button',{name:'Anatomical mode',exact:true})).toBeEnabled({timeout:30000});
  await page.getByRole('button',{name:'Anatomical mode',exact:true}).click();
  await expect(input).toHaveValue('22');
  expect(errors).toEqual([]);
});

test('custom backgrounds and neutral lighting render and persist independently of measurements',async({page})=> {
  const targets=await seed(page),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1050});await page.goto('/wellness/physique?view=3d');
  const editor=page.getByRole('tablist',{name:'Avatar editor'});
  await editor.getByRole('tab',{name:'View',exact:true}).click();
  const panel=page.getByRole('tabpanel',{name:'View',exact:true});
  await panel.getByRole('combobox',{name:'Model background',exact:true}).selectOption('color');
  await panel.getByLabel('Background color',{exact:true}).fill('#ccddee');
  await panel.getByRole('checkbox',{name:'Stage floor and decorations'}).uncheck();
  await panel.getByRole('combobox',{name:'Model lighting',exact:true}).selectOption('neutral');
  await expect.poll(()=>targets().viewerPreferences?.backgroundColor).toBe('#ccddee');
  const canvas=page.locator('.chamber-canvas-wrap canvas');await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-distance',/\d/);
  await canvas.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const solid=await canvas.screenshot({path:test.info().outputPath('custom-solid.png')});
  await panel.getByRole('combobox',{name:'Model background',exact:true}).selectOption('gradient');
  await panel.getByLabel('Background bottom color',{exact:true}).fill('#223344');
  await expect.poll(()=>targets().viewerPreferences?.backgroundBottomColor).toBe('#223344');
  await canvas.scrollIntoViewIfNeeded();await canvas.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const gradient=await canvas.screenshot({path:test.info().outputPath('custom-gradient.png')});
  expect(solid.equals(gradient)).toBe(false);
  await page.reload();await editor.getByRole('tab',{name:'View',exact:true}).click();
  await expect(panel.getByRole('combobox',{name:'Model background',exact:true})).toHaveValue('gradient');
  await expect(panel.getByLabel('Background color',{exact:true})).toHaveValue('#ccddee');
  await expect(panel.getByRole('checkbox',{name:'Stage floor and decorations'})).not.toBeChecked();
  expect(targets().keep).toBe('preserve');expect(targets().anatomyV2).toBeUndefined();expect(errors).toEqual([]);
});

test('inspect pelvic attachment in resting and erect states from the front and side',async({page})=> {
  await seed(page);const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error' && /WebGLProgram|VALIDATE_STATUS|Shader Error/.test(message.text()))errors.push(message.text());});
  await page.setViewportSize({width:1440,height:1050});await page.goto('/wellness/physique?view=3d');
  await page.getByRole('tablist',{name:'Avatar editor'}).getByRole('tab',{name:'Anatomy',exact:true}).click();
  const reveal=page.getByRole('button',{name:'Anatomical mode',exact:true});await expect(reveal).toBeEnabled({timeout:30000});await reveal.click();
  const panel=page.getByRole('region',{name:'Private anatomy customization'}),canvas=page.locator('.chamber-canvas-wrap canvas');
  for(const state of ['Resting','Erect']) {
    await panel.getByRole('button',{name:state,exact:true}).click();
    const length=panel.getByLabel(`${state} length current (cm)`,{exact:true});await length.fill(state==='Resting'?'10':'18');await length.press('Tab');
    const girth=panel.getByLabel('Base circumference current (cm)',{exact:true});await girth.fill('14');await girth.press('Tab');
    await panel.getByRole('button',{name:'Inspect edited region'}).click();await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toHaveAttribute('data-camera-focus','anatomy');
    for(const angle of ['Front','Side']) {
      await page.locator('.chamber-overlay-top').getByRole('button',{name:angle,exact:true}).click();
      await canvas.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      await canvas.screenshot({path:test.info().outputPath(`attachment-${state.toLowerCase()}-${angle.toLowerCase()}.png`)});
    }
  }
  expect(errors).toEqual([]);
});

test('underwear, gym and casual have visible variants, fit and saved colors',async({page})=> {
  test.setTimeout(180000);
  const targets=await seed(page),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error' && /WebGLProgram|VALIDATE_STATUS|Shader Error/.test(message.text()))errors.push(message.text());});
  page.setDefaultTimeout(30000);
  await page.setViewportSize({width:1440,height:1050});await page.goto('/wellness/physique?view=3d');
  const canvas=page.locator('.chamber-canvas-wrap canvas');await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-wardrobe-source','authored-garment',{timeout:30000});
  const wardrobeManifest=await (await page.request.get('/assets/wardrobe/manifest.json')).json();
  await expect(canvas).toHaveAttribute('data-wardrobe-vertices',String(wardrobeManifest.garments.tee.vertexCount));
  const editor=page.getByRole('tablist',{name:'Avatar editor'});
  await editor.getByRole('tab',{name:'Clothing',exact:true}).click();
  const panel=page.getByRole('tabpanel',{name:'Clothing',exact:true});
  const shots:Buffer[]=[];
  for(const [preset,variant] of [['Underwear','briefs'],['Gym','training'],['Casual','sweatshirt'],['Formal','shirt'],['Swimwear','board']]) {
    await panel.getByRole('button',{name:preset,exact:true}).click();
    await panel.getByRole('combobox',{name:'Garment style'}).selectOption(variant);
    const variants=preset==='Underwear'?['trunks','boxerBriefs','briefs']:preset==='Gym'?['tank','compression','training']:preset==='Casual'?['tee','sweatshirt']:preset==='Formal'?['suit','shirt']:['short','board'];
    for(const style of variants) {
      await panel.getByRole('combobox',{name:'Garment style'}).selectOption(style);
      await canvas.scrollIntoViewIfNeeded();
      await expect(canvas).toHaveAttribute('data-wardrobe-source','authored-garment',{timeout:30000});
      await expect(canvas).toHaveAttribute('data-wardrobe-style',style);
      await canvas.screenshot({path:test.info().outputPath(`${preset.toLowerCase()}-${style}.png`)});
    }
    await panel.getByRole('combobox',{name:'Garment fit'}).selectOption('relaxed');
    await canvas.scrollIntoViewIfNeeded();await expect(canvas).toHaveAttribute('data-camera-distance',/\d/);
    // Give the shader a rendered frame after changing the real geometry shell.
    await canvas.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const shot=await canvas.screenshot({path:test.info().outputPath(`${preset.toLowerCase()}.png`)});shots.push(shot);
  }
  expect(shots[0].equals(shots[1])).toBe(false);expect(shots[1].equals(shots[2])).toBe(false);
  await panel.getByRole('button',{name:'Casual',exact:true}).click();
  await panel.getByRole('combobox',{name:'Garment fabric'}).selectOption('linen');
  await panel.getByRole('combobox',{name:'Garment surface'}).selectOption('pinstripe');
  for(const name of ['Garment ease (cm)','Hem length (%)','Waist rise (cm)','Fabric detail (%)']) await panel.getByRole('slider',{name,exact:true}).press('End');
  await panel.getByLabel('Top color',{exact:true}).fill('#668899');
  await canvas.scrollIntoViewIfNeeded();await canvas.screenshot({path:test.info().outputPath('casual-maximum-adjustments.png')});
  for(const name of ['Garment ease (cm)','Hem length (%)','Waist rise (cm)','Fabric detail (%)']) await panel.getByRole('slider',{name,exact:true}).press('Home');
  await canvas.scrollIntoViewIfNeeded();await canvas.screenshot({path:test.info().outputPath('casual-minimum-adjustments.png')});
  for(const name of ['Garment ease (cm)','Hem length (%)','Waist rise (cm)','Fabric detail (%)']) await panel.getByRole('slider',{name,exact:true}).press('End');
  await expect.poll(()=>targets().wardrobePreferences?.outfits?.CASUAL?.topColor).toBe('#668899');
  expect(targets().keep).toBe('preserve');
  await page.reload();await editor.getByRole('tab',{name:'Clothing',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Casual',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(panel.getByLabel('Top color',{exact:true})).toHaveValue('#668899');
  await expect(panel.getByRole('combobox',{name:'Garment fabric'})).toHaveValue('linen');
  await expect(panel.getByRole('combobox',{name:'Garment surface'})).toHaveValue('pinstripe');
  await expect(panel.getByRole('slider',{name:'Garment ease (cm)',exact:true})).toHaveValue('6');
  await expect(panel.getByRole('slider',{name:'Hem length (%)',exact:true})).toHaveValue('120');
  await expect(panel.getByRole('slider',{name:'Waist rise (cm)',exact:true})).toHaveValue('3');
  await expect(panel.getByRole('slider',{name:'Fabric detail (%)',exact:true})).toHaveValue('100');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await panel.screenshot({path:test.info().outputPath('wardrobe-mobile-controls.png')});
  await panel.getByRole('button',{name:'Reset this outfit',exact:true}).click();
  await expect(panel.getByLabel('Top color',{exact:true})).toHaveValue('#82938c');
  await expect(panel.getByRole('slider',{name:'Garment ease (cm)',exact:true})).toHaveValue('1.2');
  await expect.poll(()=>targets().wardrobePreferences?.outfits?.CASUAL?.hemLength).toBe(100);
  expect(targets().wardrobePreferences.outfits.GYM.variant).toBe('training');
  expect(errors).toEqual([]);
});

test('wardrobe coverage, original textures and shadows render from front, side and back after body edits',async({page})=> {
  test.setTimeout(240000);
  await seed(page);page.setDefaultTimeout(30000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/WebGLProgram|VALIDATE_STATUS|Shader Error/.test(message.text()))errors.push(message.text());});
  await page.setViewportSize({width:1440,height:1050});await page.goto('/wellness/physique?view=3d');
  const canvas=page.locator('.chamber-canvas-wrap canvas'),editor=page.getByRole('tablist',{name:'Avatar editor'});
  await canvas.scrollIntoViewIfNeeded();await expect(canvas).toHaveAttribute('data-wardrobe-source','authored-garment',{timeout:30000});
  await editor.getByRole('tab',{name:'View',exact:true}).click();
  await page.locator('.workspace-field').filter({hasText:'Quality'}).getByRole('combobox').selectOption('balanced');
  await page.getByRole('combobox',{name:'Model background',exact:true}).selectOption('color');
  await page.getByLabel('Background color',{exact:true}).fill('#d8dde6');
  await editor.getByRole('tab',{name:'Measure',exact:true}).click();
  await page.getByRole('slider',{name:'Current Weight',exact:true}).press('ArrowRight');
  await expect(page.getByRole('slider',{name:'Current Weight',exact:true})).toHaveValue('75');
  await editor.getByRole('tab',{name:'Clothing',exact:true}).click();
  const panel=page.getByRole('tabpanel',{name:'Clothing',exact:true});
  for(const [preset,style] of [['Underwear','boxerBriefs'],['Gym','training'],['Casual','sweatshirt'],['Formal','suit'],['Swimwear','board']]) {
    await panel.getByRole('button',{name:preset,exact:true}).click();
    await panel.getByRole('combobox',{name:'Garment style'}).selectOption(style);
    if(preset==='Formal')await panel.getByRole('combobox',{name:'Garment surface'}).selectOption('source');
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toHaveAttribute('data-wardrobe-source','authored-garment',{timeout:30000});await expect(canvas).toHaveAttribute('data-wardrobe-style',style);
    for(const view of ['Front','Side','Back']) {
      await page.locator('.chamber-overlay-top').getByRole('button',{name:view,exact:true}).click();
      await canvas.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      await canvas.screenshot({path:test.info().outputPath(`wardrobe-${preset.toLowerCase()}-${view.toLowerCase()}.png`)});
    }
    if(preset==='Casual') {
      await editor.getByRole('tab',{name:'View',exact:true}).click();
      await page.locator('.workspace-field').filter({hasText:'Quality'}).getByRole('combobox').selectOption('performance');
      await canvas.scrollIntoViewIfNeeded();
      await canvas.screenshot({path:test.info().outputPath('wardrobe-casual-back-no-shadows.png')});
      await page.locator('.workspace-field').filter({hasText:'Quality'}).getByRole('combobox').selectOption('balanced');
      await editor.getByRole('tab',{name:'Clothing',exact:true}).click();
    }
    for(const [rise,key,value] of [['low','Home','-3'],['high','End','3']]) {
      await panel.getByRole('slider',{name:'Waist rise (cm)',exact:true}).press(key);
      await expect(panel.getByRole('slider',{name:'Waist rise (cm)',exact:true})).toHaveValue(value);
      await canvas.scrollIntoViewIfNeeded();
      for(const view of ['Front','Side','Back']) {
        await page.locator('.chamber-overlay-top').getByRole('button',{name:view,exact:true}).click();
        await canvas.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
        await canvas.screenshot({path:test.info().outputPath(`wardrobe-${preset.toLowerCase()}-rise-${rise}-${view.toLowerCase()}.png`)});
      }
    }
  }
  await editor.getByRole('tab',{name:'Measure',exact:true}).click();
  await expect(page.getByRole('slider',{name:'Current Weight',exact:true})).toHaveValue('75');
  expect(errors).toEqual([]);
});

test('anatomical wardrobe links to anatomy controls and returning to underwear stays covered on reload',async({page})=> {
  await seed(page);page.setDefaultTimeout(30000);
  await page.goto('/wellness/physique?view=3d');
  const canvas=page.locator('.chamber-canvas-wrap canvas'),editor=page.getByRole('tablist',{name:'Avatar editor'});
  await canvas.scrollIntoViewIfNeeded();await expect(canvas).toHaveAttribute('data-wardrobe-source','authored-garment',{timeout:30000});
  await editor.getByRole('tab',{name:'Clothing',exact:true}).click();
  const panel=page.getByRole('tabpanel',{name:'Clothing',exact:true});
  await expect(panel.getByRole('button',{name:'Anatomical',exact:true})).toBeEnabled();await panel.getByRole('button',{name:'Anatomical',exact:true}).click();
  await panel.getByRole('button',{name:'Customize anatomy',exact:true}).click();
  await expect(editor.getByRole('tab',{name:'Anatomy',exact:true})).toHaveAttribute('aria-selected','true');
  await editor.getByRole('tab',{name:'Clothing',exact:true}).click();
  await panel.getByRole('button',{name:'Wear underwear',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Underwear',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(panel.locator('.wardrobe-options__status')).toHaveText('Outfit saved');
  await page.reload();await editor.getByRole('tab',{name:'Clothing',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Underwear',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('group',{name:'Choose or drag a body part'}).getByRole('button',{name:'Private anatomy',exact:true})).toHaveCount(0);
});

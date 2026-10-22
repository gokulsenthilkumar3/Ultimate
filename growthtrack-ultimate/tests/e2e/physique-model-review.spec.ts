import {test,expect} from './foundation-fixture';
import {bodySurface,paintedCanvas,setupHumanViewer,surfaces} from './helpers/human-viewer';
import {readFileSync} from 'node:fs';
const cases=JSON.parse(readFileSync(new URL('../../docs/real-human-3d/data/review-75/cases.json',import.meta.url),'utf8')) as {
  assets:string[],fullBodyViews:string[],obliqueDrag:{start:number[],end:number[],steps:number},headTurnDegrees:number
};

test('model tools reopen the editor and expose the available preview controls',async({page})=>{
  const {canvas,errors}=await setupHumanViewer(page,'reduce');
  const tools=page.getByRole('region',{name:'Model tools'}),inspector=page.locator('#avatar-model-inspector');
  await expect(tools).toBeVisible();
  await page.getByRole('button',{name:'Close editor',exact:true}).click();await expect(inspector).not.toBeVisible();
  await tools.getByRole('button',{name:'Pose controls',exact:true}).click();await expect(inspector).toBeVisible();
  await expect(page.getByRole('checkbox',{name:'Use saved pose'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(inspector).not.toBeVisible();
  await page.getByRole('button',{name:'Edit avatar',exact:true}).click();await expect(inspector).toBeVisible();
  await tools.getByRole('button',{name:'Skin detail',exact:true}).click();await expect(page.getByRole('slider',{name:'Pore detail'})).toBeVisible();
  await tools.getByRole('button',{name:'Face controls',exact:true}).click();await expect(page.getByRole('slider',{name:'Blink',exact:true})).toBeVisible();
  await tools.getByRole('button',{name:'View model details',exact:true}).click();
  await paintedCanvas(canvas);await tools.scrollIntoViewIfNeeded();
  await page.screenshot({path:test.info().outputPath('model-tools-desktop.png'),animations:'disabled'});
  await page.setViewportSize({width:390,height:844});await tools.scrollIntoViewIfNeeded();
  await expect(tools.getByRole('button',{name:'Pose controls',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath('model-tools-mobile.png'),animations:'disabled'});
  expect(errors).toEqual([]);
});

test('model tools identify a saved legacy model without replacing the owner choice',async({page})=>{
  const {canvas,errors,bodyWrites}=await setupHumanViewer(page,'reduce',{}, {modelVersion:'legacy'});
  const tools=page.getByRole('region',{name:'Model tools'});
  await expect(tools).toContainText('Retained body preview');
  await expect(tools).toContainText('This model has no articulated hand and toe controls');
  expect((await bodySurface(canvas)).modelAsset).toMatch(/humanoid-base-lite\.glb$/);
  await tools.getByRole('button',{name:'Pose controls',exact:true}).click();
  await page.getByRole('checkbox',{name:'Use saved pose'}).check();
  await expect(page.getByRole('combobox',{name:'Left hand shape'})).toBeDisabled();
  expect(bodyWrites).toEqual([]);
  expect(errors).toEqual([]);
});

for(const asset of cases.assets)test(`all-angle model review ${asset}`,async({page})=>{
  const {canvas,errors}=await setupHumanViewer(page,'reduce',{}, {avatarAsset:asset});
  const shot=(name:string)=>paintedCanvas(canvas,test.info().outputPath(asset.replace('.glb','')+'-'+name+'.png'));
  const initial=await bodySurface(canvas);expect(initial.vertices).toBe(16001);
  expect(initial.modelAsset).toMatch(new RegExp('/'+asset.replaceAll('.','\\.')+'$'));
  for(const view of cases.fullBodyViews){await page.getByRole('button',{name:view,exact:true}).click();await shot(view.toLowerCase());}
  await page.getByRole('button',{name:'Front',exact:true}).click();await paintedCanvas(canvas);
  const orbit=async()=>{const box=(await canvas.boundingBox())!,drag=cases.obliqueDrag;
    await page.mouse.move(box.x+box.width*drag.start[0],box.y+box.height*drag.start[1]);await page.mouse.down();
    await page.mouse.move(box.x+box.width*drag.end[0],box.y+box.height*drag.end[1],{steps:drag.steps});await page.mouse.up();};
  await orbit();await shot('oblique');
  await page.getByRole('button',{name:'Face',exact:true}).click();await shot('face-front');
  await page.getByRole('tab',{name:'Pose',exact:true}).click();await page.getByRole('checkbox',{name:'Use saved pose'}).check();
  await page.getByRole('combobox',{name:'Pose joint'}).selectOption('head');
  await page.getByRole('slider',{name:'Joint turn',exact:true}).fill(String(cases.headTurnDegrees));
  await canvas.scrollIntoViewIfNeeded();await expect.poll(async()=>(await bodySurface(canvas))?.pose?.joints.head).toEqual([0,cases.headTurnDegrees,0]);
  await shot('head-turn');await orbit();await shot('face-oblique');
  await page.getByRole('tab',{name:'Face',exact:true}).click();await page.getByRole('slider',{name:'Blink',exact:true}).press('End');
  await canvas.scrollIntoViewIfNeeded();await expect.poll(async()=>(await bodySurface(canvas)).blink).toBeGreaterThan(.99);
  await expect.poll(async()=>(await surfaces(canvas)).find(item=>/Eyelashes/i.test(item.name))?.visible).toBe(false);await shot('blink-oblique');
  await page.getByRole('slider',{name:'Blink',exact:true}).press('Home');await expect.poll(async()=>(await surfaces(canvas)).find(item=>/Eyelashes/i.test(item.name))?.visible).toBe(true);
  await page.getByRole('slider',{name:'Blink',exact:true}).press('End');await expect.poll(async()=>(await bodySurface(canvas)).blink).toBeGreaterThan(.99);
  const final=await bodySurface(canvas);
  expect(final.eyelids).toBeTruthy();expect(final.headPoseBinding).toBeTruthy();expect(final.bodyPoseBinding).toBeTruthy();
  expect(final.skinBounds.method).toBe('joint-morph-envelope');
  expect((await surfaces(canvas)).filter(item=>/Eyes|Hair/.test(item.name)).every(item=>item.visible)).toBe(true);
  if(asset.includes('preview-75'))expect(final.surfaceParts.find((p:any)=>p.part==='cornea').visible).toBe(false);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export',exact:true}).click();
  await (await download).saveAs(test.info().outputPath(asset.replace('.glb','')+'-export.png'));
  expect(errors).toEqual([]);
});

import { test,expect } from './foundation-fixture';
import { setupHumanViewer,bodySurface,surfaces } from './helpers/human-viewer';
import type { Locator } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const pose=async(canvas:Locator)=>(await bodySurface(canvas))?.pose;
const modes=(page:any)=>page.getByRole('group',{name:'Comparison mode',exact:true});
const camera=async(canvas:Locator)=>canvas.evaluate(el=>({position:el.getAttribute('data-camera-position')!.split(',').map(Number),target:el.getAttribute('data-camera-target')!.split(',').map(Number)}));
async function paintedBody(canvas:Locator,path?:string) {
  // Scrolling from the long inspector resumes the paused R3F canvas. Applied
  // bone diagnostics alone can still describe its last frame; require painted
  // lower-body pixels before retaining visual evidence.
  let snapshot='';
  await expect.poll(async()=>{
    const painted=await canvas.evaluate(async element=>{
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    const source=element as HTMLCanvasElement;
    // Synchronize the test readback with GPU completion. Browser compositor
    // screenshots can otherwise retain a partial SwiftShader canvas frame.
    const gl=source.getContext('webgl2') || source.getContext('webgl');gl?.finish();
    const url=source.toDataURL(),image=new Image();image.src=url;await image.decode();
    const buffer=document.createElement('canvas');buffer.width=image.width;buffer.height=image.height;
    const context=buffer.getContext('2d')!;context.drawImage(image,0,0);
    const rgba=context.getImageData(0,0,buffer.width,buffer.height).data,bg=rgba.slice(0,3);let pixels=0;
    for(let y=Math.floor(buffer.height*.56);y<buffer.height*.84;y++)for(let x=Math.floor(buffer.width*.2);x<buffer.width*.8;x++){
      const i=(y*buffer.width+x)*4;if(Math.abs(rgba[i]-bg[0])+Math.abs(rgba[i+1]-bg[1])+Math.abs(rgba[i+2]-bg[2])>40)pixels++;
    }
    return {pixels,url};
  });snapshot=painted.url;return painted.pixels;
  },{timeout:15000}).toBeGreaterThan(500);
  if(path)await writeFile(path,Buffer.from(snapshot.split(',')[1],'base64'));
}

test('saved poses move authored joints, survive reload and stay neutral in measurement and compare',async({page})=>{
  const {canvas,targets,errors}=await setupHumanViewer(page,'reduce');
  await page.getByRole('tab',{name:'Pose',exact:true}).click();
  const neutral=(await pose(canvas)).rotations.head;
  await page.getByRole('checkbox',{name:'Use saved pose'}).check();
  await page.getByRole('slider',{name:'Joint turn',exact:true}).press('End');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>Math.abs((await pose(canvas)).rotations.head[1]-neutral[1])).toBeGreaterThan(.4);
  await expect.poll(()=>targets().viewerPreferences.poseStudio?.current.joints.head).toEqual([0,55,0]);
  await paintedBody(canvas,test.info().outputPath('pose-head-turn.png'));
  await modes(page).getByRole('button',{name:'Goal',exact:true}).click();
  await page.getByRole('checkbox',{name:'Use saved pose'}).check();
  await page.getByRole('slider',{name:'Joint turn',exact:true}).press('Home');
  await expect.poll(()=>targets().viewerPreferences.poseStudio?.goal.joints.head).toEqual([0,-55,0]);
  expect(targets().viewerPreferences.poseStudio.current.joints.head).toEqual([0,55,0]);
  await modes(page).getByRole('button',{name:'Compare',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>(await surfaces(canvas)).filter(item=>item.pose).map(item=>item.pose.active)).toEqual([false,false]);
  for(const body of (await surfaces(canvas)).filter(item=>item.pose))expect(body.pose.rotations.head).toEqual(neutral);
  await modes(page).getByRole('button',{name:'Current',exact:true}).click();
  await page.getByRole('tab',{name:'Measure',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>(await pose(canvas)).active).toBe(false);
  expect((await pose(canvas)).rotations.head).toEqual(neutral);
  await page.getByRole('tab',{name:'Pose',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>(await pose(canvas)).active).toBe(true);
  await page.reload();await page.getByRole('tab',{name:'Pose',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>(await pose(canvas))?.joints.head,{timeout:45000}).toEqual([0,55,0]);
  expect(errors).toEqual([]);
});

test('reach targets move actual endpoints, clamp extremes, save and support mobile and protected export',async({page})=>{
  const {canvas,targets,errors}=await setupHumanViewer(page,'reduce');
  await page.getByRole('tab',{name:'Pose',exact:true}).click();await page.getByRole('checkbox',{name:'Use saved pose'}).check();
  await page.getByRole('checkbox',{name:'Use reach target'}).check();
  for(const [axis,value] of [['side','0.2'],['up','-0.6'],['forward','0.3']]) {
    await page.getByRole('slider',{name:`Reach ${axis}`,exact:true}).fill(value);
  }
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>(await pose(canvas)).limbs.leftWrist.error).toBeLessThan(.001);
  await expect.poll(async()=>(await pose(canvas)).limbs.leftWrist.normalized.map((v:number)=>Number(v.toFixed(2)))).toEqual([.2,-.6,.3]);
  await expect.poll(()=>targets().viewerPreferences.poseStudio?.current.targets.leftWrist).toEqual([.2,-.6,.3]);
  await paintedBody(canvas,test.info().outputPath('pose-reach-wrist.png'));
  await page.getByRole('slider',{name:'Reach forward',exact:true}).press('End');await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>(await pose(canvas)).limbs.leftWrist.reached).toBe(false);
  await page.getByRole('button',{name:'Check reach',exact:true}).click();
  await expect(page.getByText(/Target limited by limb reach/)).toBeVisible();
  await page.getByRole('slider',{name:'Reach forward',exact:true}).fill('0.3');
  await page.getByRole('combobox',{name:'Reach endpoint'}).selectOption('rightAnkle');
  await page.getByRole('checkbox',{name:'Use reach target'}).check();
  for(const [axis,value] of [['side','-0.1'],['up','-0.84'],['forward','0.2']])await page.getByRole('slider',{name:`Reach ${axis}`,exact:true}).fill(value);
  await canvas.scrollIntoViewIfNeeded();await expect.poll(async()=>(await pose(canvas)).limbs.rightAnkle.error).toBeLessThan(.001);
  await expect.poll(async()=>(await pose(canvas)).limbs.rightAnkle.normalized.map((v:number)=>Number(v.toFixed(2)))).toEqual([-.1,-.84,.2]);
  await expect.poll(()=>targets().viewerPreferences.poseStudio?.current.targets.rightAnkle).toEqual([-.1,-.84,.2]);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export',exact:true}).click();
  const download=await downloadPromise;await download.saveAs(test.info().outputPath('pose-protected-export.png'));
  await expect.poll(async()=>(await pose(canvas)).limbs.leftWrist.error).toBeLessThan(.001);
  const originalGeometry=(await bodySurface(canvas)).geometry;
  await page.getByRole('tab',{name:'View',exact:true}).click();await page.getByRole('combobox',{name:'Model quality'}).selectOption('performance');await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>(await bodySurface(canvas))?.geometry,{timeout:20000}).not.toBe(originalGeometry);
  await expect.poll(async()=>(await pose(canvas))?.limbs.rightAnkle.error,{timeout:20000}).toBeLessThan(.001);
  await page.reload();await page.getByRole('tab',{name:'Pose',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>(await pose(canvas))?.limbs.rightAnkle.error,{timeout:45000}).toBeLessThan(.001);
  await page.setViewportSize({width:390,height:844});await page.getByRole('tab',{name:'Pose',exact:true}).click();
  await page.getByRole('combobox',{name:'Reach endpoint'}).selectOption('leftWrist');
  await expect(page.getByRole('slider',{name:'Reach forward',exact:true})).toBeVisible();
  await page.getByRole('slider',{name:'Reach forward',exact:true}).press('ArrowRight');
  await expect.poll(()=>targets().viewerPreferences.poseStudio.current.targets.leftWrist[2]).toBe(.32);
  await page.locator('.chamber-editor').screenshot({path:test.info().outputPath('pose-mobile-controls.png')});
  expect(errors).toEqual([]);
});

test('camera bookmarks recall the actual orbit and pan, persist and respect floor and mode limits',async({page})=>{
  const {canvas,targets,errors}=await setupHumanViewer(page,'reduce');
  await page.getByRole('tab',{name:'View',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  // Let the evaluated region sampler finish before gestures, so it cannot
  // accidentally consume a stale gesture flag and hide a recall race.
  await page.getByRole('button',{name:'Face',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>await canvas.getAttribute('data-camera-region-geometry'),{timeout:15000}).toBe((await bodySurface(canvas)).geometry);
  await page.getByRole('button',{name:'Full Body',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-focus','body');
  const box=(await canvas.boundingBox())!;
  await page.mouse.move(box.x+box.width*.45,box.y+box.height*.5);await page.mouse.down();
  await page.mouse.move(box.x+box.width*.62,box.y+box.height*.44,{steps:8});await page.mouse.up();
  const orbited=await camera(canvas);
  await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down({button:'right'});
  await page.mouse.move(box.x+box.width*.53,box.y+box.height*.48,{steps:5});await page.mouse.up({button:'right'});
  await expect.poll(async()=>Math.max(...(await camera(canvas)).target.map((v,i)=>Math.abs(v-orbited.target[i])))).toBeGreaterThan(.01);
  const saved=await camera(canvas);
  await page.getByRole('textbox',{name:'New view name'}).fill('Oblique');await page.getByRole('button',{name:'Save current view',exact:true}).click();
  await expect.poll(()=>targets().viewerPreferences.cameraBookmarks?.length).toBe(1);
  await page.getByRole('button',{name:'Front',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>Math.abs((await camera(canvas)).position[0]-saved.position[0])).toBeGreaterThan(.1);
  await page.getByRole('button',{name:'Open Oblique',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>Math.max(...(await camera(canvas)).position.map((v,i)=>Math.abs(v-saved.position[i])))).toBeLessThan(.01);
  await expect.poll(async()=>Math.max(...(await camera(canvas)).target.map((v,i)=>Math.abs(v-saved.target[i])))).toBeLessThan(.01);
  await paintedBody(canvas,test.info().outputPath('camera-bookmark-oblique.png'));
  await page.getByRole('textbox',{name:'Name for Oblique'}).fill('Portrait orbit');await page.getByRole('button',{name:'Rename Oblique',exact:true}).click();
  await expect.poll(()=>targets().viewerPreferences.cameraBookmarks?.[0].name).toBe('Portrait orbit');
  await page.reload();await page.getByRole('tab',{name:'View',exact:true}).click();
  await page.getByRole('button',{name:'Open Portrait orbit',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>Math.max(...(await camera(canvas)).position.map((v,i)=>Math.abs(v-saved.position[i]))),{timeout:45000}).toBeLessThan(.01);
  await page.getByRole('checkbox',{name:'Stage floor and decorations'}).check();
  await page.getByRole('combobox',{name:'Camera mode'}).selectOption('TOP');await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>Number(await canvas.getAttribute('data-camera-polar'))).toBeLessThan(.021);
  expect((await camera(canvas)).position[1]).toBeGreaterThanOrEqual(.06);
  await page.getByRole('button',{name:'Remove Portrait orbit',exact:true}).click();await expect.poll(()=>targets().viewerPreferences.cameraBookmarks).toEqual([]);
  expect(errors).toEqual([]);
});

test('posed skin keeps live bounds through camera angles, protected capture and quality replacement',async({page})=>{
  const {canvas,targets,errors}=await setupHumanViewer(page,'reduce');
  await page.getByRole('tab',{name:'Pose',exact:true}).click();
  await page.getByRole('checkbox',{name:'Use saved pose'}).check();
  await page.getByRole('combobox',{name:'Pose joint'}).selectOption('leftUpperArm');
  await page.getByRole('slider',{name:'Joint roll',exact:true}).press('End');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>(await bodySurface(canvas))?.skinBounds).toMatchObject({method:'joint-morph-envelope',morphs:58});
  expect((await bodySurface(canvas)).skinBounds.joints).toBeGreaterThan(20);
  expect((await bodySurface(canvas)).pose.rigJoints).toBe(79);
  expect((await bodySurface(canvas)).bodyPoseBinding).toMatchObject({method:'measured-bone-segments',corrected:expect.any(Number)});
  await expect.poll(async()=>(await pose(canvas)).joints.leftUpperArm).toEqual([0,0,100]);
  await expect.poll(()=>targets().viewerPreferences.poseStudio?.current.joints.leftUpperArm).toEqual([0,0,100]);
  const raised=(await pose(canvas)).rotations.leftUpperArm;
  for(const angle of ['Front','Back']) {
    await page.getByRole('button',{name:angle,exact:true}).click();await canvas.scrollIntoViewIfNeeded();
    await paintedBody(canvas,test.info().outputPath(`review-50-raised-arm-${angle.toLowerCase()}.png`));
    expect((await pose(canvas)).rotations.leftUpperArm).toEqual(raised);
  }
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Export',exact:true}).click();
  await (await downloading).saveAs(test.info().outputPath('review-50-raised-arm-export.png'));
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>(await pose(canvas)).rotations.leftUpperArm).toEqual(raised);
  const original=(await bodySurface(canvas)).geometry;
  await page.getByRole('tab',{name:'View',exact:true}).click();
  await page.getByRole('combobox',{name:'Model quality'}).selectOption('high');await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>(await bodySurface(canvas))?.geometry,{timeout:30000}).not.toBe(original);
  await expect.poll(async()=>(await bodySurface(canvas))?.skinBounds).toMatchObject({method:'joint-morph-envelope',morphs:58});
  expect((await bodySurface(canvas)).skinBounds.joints).toBeGreaterThan(20);
  expect((await bodySurface(canvas)).pose.rigJoints).toBe(79);
  await expect.poll(async()=>(await pose(canvas))?.joints.leftUpperArm).toEqual([0,0,100]);
  await page.getByRole('button',{name:'Face',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-focus','head');
  await canvas.screenshot({path:test.info().outputPath('review-50-face-high.png')});
  await page.getByRole('tab',{name:'Measure',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>(await pose(canvas)).active).toBe(false);
  expect((await bodySurface(canvas)).skinBounds.method).toBe('joint-morph-envelope');
  expect(errors).toEqual([]);
});

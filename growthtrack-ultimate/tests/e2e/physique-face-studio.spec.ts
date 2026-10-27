import {test,expect} from './foundation-fixture';
import {bodySurface,paintedCanvas,setupHumanViewer,surfaces} from './helpers/human-viewer';

test('face expressions move the mouth and speech restores saved expression without profile writes',async({page})=>{
  await page.addInitScript(()=>{
    class Utterance {text:string;constructor(text:string){this.text=text;}}
    let current:any;
    Object.defineProperty(window,'SpeechSynthesisUtterance',{value:Utterance,configurable:true});
    Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],addEventListener(){},removeEventListener(){},speak(u:any){current=u;u.onstart?.();},cancel(){current?.onend?.();current=null;}},configurable:true});
  });
  const {canvas,errors,targets}=await setupHumanViewer(page,'reduce');
  await page.getByRole('button',{name:'Face',exact:true}).click();
  await page.getByRole('tab',{name:'Face',exact:true}).click();
  await expect.poll(async()=>(await bodySurface(canvas)).faceCorrective?.method).toBe('calibrated-mouth-corrective');
  await paintedCanvas(canvas,test.info().outputPath('face-neutral.png'));
  await page.getByRole('slider',{name:'Jaw open',exact:true}).fill('0.65');
  await expect.poll(async()=>(await bodySurface(canvas)).mouth?.gap).toBeGreaterThan(.008);
  await paintedCanvas(canvas,test.info().outputPath('face-open-mouth.png'));
  await page.getByRole('slider',{name:'Jaw open',exact:true}).fill('0');
  await page.getByRole('slider',{name:'Smile',exact:true}).fill('0.75');
  await paintedCanvas(canvas,test.info().outputPath('face-smile.png'));
  await expect.poll(()=>targets().morphOverrides?.current?.smile).toBe(.75);
  const saved=JSON.stringify(targets().morphOverrides);
  await page.getByRole('textbox',{name:'Speech text'}).fill('Aaaaa aaaaa aaaaa aaaaa aaaaa aaaaa aaaaa aaaaa aaaaa aaaaa');
  await page.getByRole('button',{name:'Speak text',exact:true}).click();
  await expect.poll(async()=>(await bodySurface(canvas)).speech?.active).toBe(true);
  await expect.poll(async()=>(await bodySurface(canvas)).mouth?.visible).toBe(true);
  await page.getByRole('button',{name:'Stop speech',exact:true}).click();
  await expect.poll(async()=>(await bodySurface(canvas)).speech?.active).toBe(false);
  expect(JSON.stringify(targets().morphOverrides)).toBe(saved);
  await expect.poll(async()=>(await bodySurface(canvas)).mouth?.visible).toBe(false);
  await page.getByRole('group',{name:'Comparison mode',exact:true}).getByRole('button',{name:'Goal',exact:true}).click();
  await page.getByRole('slider',{name:'Smile',exact:true}).fill('0.2');
  await expect.poll(()=>targets().morphOverrides?.goal?.smile).toBe(.2);
  expect(targets().morphOverrides.current.smile).toBe(.75);
  await page.reload();await page.getByRole('tab',{name:'Face',exact:true}).click();
  await page.getByRole('group',{name:'Comparison mode',exact:true}).getByRole('button',{name:'Goal',exact:true}).click();
  await expect(page.getByRole('slider',{name:'Smile',exact:true})).toHaveValue('0.2');
  expect(errors).toEqual([]);
});

test('legacy model can be upgraded from the viewer and an action releases the saved pose',async({page})=>{
  const {canvas,errors,targets,bodyWrites}=await setupHumanViewer(page,'reduce',{}, {modelVersion:'legacy',avatarAsset:'humanoid-base-lite.glb'});
  await page.getByRole('button',{name:'Use articulated model',exact:true}).click();
  await expect.poll(async()=>(await bodySurface(canvas)).modelAsset,{timeout:45000}).toMatch(/humanoid-preview-75-lite.glb$/);
  await expect.poll(()=>bodyWrites.at(-1)).toMatchObject({avatarAsset:null,modelVersion:'v2'});
  await expect.poll(()=>targets().appearanceMetrics.avatarAsset).toBe(null);
  await page.getByRole('tab',{name:'Pose',exact:true}).click();
  await page.getByRole('checkbox',{name:'Use saved pose'}).check();
  await page.getByRole('combobox',{name:'Pose joint'}).selectOption('head');
  await page.getByRole('slider',{name:'Joint turn',exact:true}).fill('25');
  await expect.poll(()=>targets().viewerPreferences.poseStudio?.current.joints.head).toEqual([0,25,0]);
  await page.getByRole('button',{name:'Pose and motion controls',exact:true}).click();
  await page.getByRole('button',{name:'Wave',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:'Use saved pose'})).not.toBeChecked();
  await expect.poll(async()=>(await bodySurface(canvas)).pose?.active).toBe(false);
  expect(targets().viewerPreferences.poseStudio.current.joints.head).toEqual([0,25,0]);
  await page.reload();await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>(await bodySurface(canvas))?.modelAsset,{timeout:45000}).toMatch(/humanoid-preview-75-lite.glb$/);
  await page.getByRole('tab',{name:'Face',exact:true}).click();
  await page.getByRole('combobox',{name:'Face design mode'}).selectOption('personal');
  await page.getByLabel('Reference photo').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5xkAAAAASUVORK5CYII=','base64')});
  await expect(page.getByRole('img',{name:'Personal face reference'})).toBeVisible();
  expect(JSON.stringify(targets())).not.toContain('reference.png');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.avatar-likeness-controls').scrollIntoViewIfNeeded();
  await expect(page.getByLabel('Reference photo')).toBeVisible();
  await page.getByText('How to take reference photos',{exact:true}).click();
  await expect(page.getByText('A phone camera is enough to start.',{exact:false})).toBeVisible();
  await page.getByText('How to take reference photos',{exact:true}).click();
  await page.screenshot({path:test.info().outputPath('face-editor-mobile.png')});
  await page.getByRole('button',{name:'Remove reference'}).click();
  await expect(page.getByRole('img',{name:'Personal face reference'})).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('selected head and torso joints drag without orbiting and Escape restores the previous angles',async({page})=>{
  test.setTimeout(120000);
  const {canvas,targets,errors}=await setupHumanViewer(page,'reduce');
  await page.getByRole('tab',{name:'Pose',exact:true}).click();await page.getByRole('checkbox',{name:'Use saved pose'}).check();
  await page.getByRole('button',{name:'Front',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  const point=async()=>{const handle=(await bodySurface(canvas)).poseJointHandle,box=(await canvas.boundingBox())!;return {x:box.x+box.width*handle.x,y:box.y+box.height*handle.y};};
  await expect.poll(async()=>(await bodySurface(canvas)).poseJointHandle?.visible).toBe(true);
  await paintedCanvas(canvas);const camera=await canvas.getAttribute('data-camera-position');
  let start=await point();await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+72,start.y-24,{steps:8});await page.mouse.up();
  await expect.poll(()=>targets().viewerPreferences.poseStudio?.current.joints.head).toEqual([-6,18,0]);
  expect(await canvas.getAttribute('data-camera-position')).toBe(camera);
  start=await point();await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x-40,start.y+20,{steps:8});await page.keyboard.press('Escape');await page.mouse.up();
  await expect.poll(async()=>(await bodySurface(canvas)).pose?.joints.head).toEqual([-6,18,0]);
  await page.getByRole('combobox',{name:'Pose joint'}).selectOption('spine2');await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async()=>(await bodySurface(canvas)).poseJointHandle?.id).toBe('spine2');
  start=await point();await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+40,start.y+20,{steps:8});await page.mouse.up();
  await expect.poll(()=>targets().viewerPreferences.poseStudio?.current.joints.spine2).toEqual([5,10,0]);
  await paintedCanvas(canvas,test.info().outputPath('head-and-torso-drag.png'));
  await page.reload();await page.getByRole('tab',{name:'Pose',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
  // The camera mounts before the GLB finishes transferring. Wait for actual
  // model readiness separately from the saved-pose assertion.
  await expect.poll(async()=>(await surfaces(canvas,60000)).length,{timeout:60000}).toBe(5);
  await expect.poll(async()=>(await bodySurface(canvas))?.pose?.joints.spine2).toEqual([5,10,0]);
  expect(errors).toEqual([]);
});

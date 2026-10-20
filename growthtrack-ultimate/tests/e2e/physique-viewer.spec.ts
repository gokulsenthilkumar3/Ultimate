import {readFileSync} from 'node:fs';
import {test,expect,OWNER,emptyState} from './foundation-fixture';

async function loadViewer(page) {
  let targets:any={retained:'preserve'};
  const body={heightCm:175,weightKg:74,bodyFatPct:19,waistCm:82,chestCm:99,hipsCm:96,shouldersCm:112,armsCm:33,neckCm:37,modelPreset:'male',biologicalSex:'male'};
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error' && /Shader Error|WebGLProgram|VALIDATE_STATUS/.test(message.text()))errors.push(message.text());});
  await page.route(url=>['/api/state','/api/body-profile','/api/physique_targets'].includes(url.pathname),route=>{
    const request=route.request(),path=new URL(request.url()).pathname;
    if(request.method()!=='GET'){
      const data=request.postDataJSON();if(path==='/api/physique_targets')targets=data;
      if(path==='/api/body-profile')Object.assign(body,data);
      return route.fulfill({json:data});
    }
    return route.fulfill({json:{...emptyState(),user:{...OWNER,dob:'1990-01-01',physiqueTargets:targets},bodyProfile:body}});
  });
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1440,height:1050});
  await page.goto('/wellness/physique?view=3d');
  const canvas=page.locator('.chamber-canvas-wrap canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-position',/.+/, {timeout:45000});
  await page.getByRole('tab',{name:'View',exact:true}).click();
  return {canvas,errors,body,targets:()=>targets};
}

test('camera floor, full rotation, live quality and protected high-resolution sharing',async({page})=>{
  test.setTimeout(120000);
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
    Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{
      (window as any).__sharedFiles=(data.files || []).map(file=>({name:file.name,size:file.size,type:file.type}));
    }});
  });
  const {canvas,errors,targets}=await loadViewer(page);
  const quality=page.locator('.workspace-field').filter({hasText:'Quality'}).getByRole('combobox');
  await quality.selectOption('performance');
  await expect(canvas).toHaveAttribute('data-quality-tier','LOW');
  await expect(canvas).toHaveAttribute('data-quality-antialias','SMAA');
  const originalCanvas=await canvas.elementHandle();
  await quality.selectOption('balanced');
  await expect(canvas).toHaveAttribute('data-quality-tier','MED');
  await expect(canvas).toHaveAttribute('data-quality-msaa',/[1-9]/);
  expect(await originalCanvas!.evaluate(node=>node===document.querySelector('.chamber-canvas-wrap canvas'))).toBe(true);
  await expect.poll(()=>targets().viewerPreferences?.qualityPreference).toBe('balanced');
  await canvas.scrollIntoViewIfNeeded();
  const box=(await canvas.boundingBox())!;
  await page.mouse.move(box.x+box.width*.65,box.y+box.height*.6);
  await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y-1000,{steps:35});await page.mouse.up();
  await expect.poll(async()=>Number((await canvas.getAttribute('data-camera-position'))!.split(',')[1])).toBeGreaterThanOrEqual(.059);
  await page.getByLabel('Camera mode',{exact:true}).selectOption('TURNTABLE');
  await page.getByRole('checkbox',{name:'Auto rotate',exact:true}).check();
  await canvas.scrollIntoViewIfNeeded();
  const angle=Number(await canvas.getAttribute('data-camera-azimuth'));
  await expect.poll(async()=>{
    const delta=Number(await canvas.getAttribute('data-camera-azimuth'))-angle;
    return Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)));
  },{timeout:12000}).toBeGreaterThan(.4);
  await page.getByRole('checkbox',{name:'Auto rotate',exact:true}).uncheck();
  await page.getByLabel('Camera mode',{exact:true}).selectOption('ORBIT');
  await page.getByLabel('Capture resolution',{exact:true}).selectOption('2');

  // Start from the real, revealed adult surface; capture must cover it first.
  await page.getByRole('tab',{name:'Anatomy',exact:true}).click();
  await page.getByRole('button',{name:'Anatomical mode',exact:true}).click();
  await expect(page.getByRole('button',{name:'Wear underwear',exact:true})).toBeVisible();
  const dimensions=await canvas.evaluate(c=>({width:(c as HTMLCanvasElement).width,height:(c as HTMLCanvasElement).height}));
  const downloading=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export',exact:true}).click();
  const download=await downloading,bytes=readFileSync((await download.path())!);
  await download.saveAs(test.info().outputPath('protected-export.png'));
  expect(download.suggestedFilename()).toMatch(/^physique-\d{4}-\d{2}-\d{2}\.png$/);
  expect(bytes.readUInt32BE(16)).toBeGreaterThanOrEqual(dimensions.width*2-1);
  expect(bytes.readUInt32BE(20)).toBeGreaterThanOrEqual(dimensions.height*2-1);
  await expect.poll(()=>canvas.evaluate(c=>(c as HTMLCanvasElement).width)).toBe(dimensions.width);
  await page.getByLabel('More avatar actions',{exact:true}).click();
  await page.getByRole('button',{name:'Share protected view',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Share your avatar'});
  await expect(dialog.getByRole('img')).toBeVisible();
  await dialog.getByRole('button',{name:'Share image',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__sharedFiles)).toEqual([{name:expect.stringMatching(/^physique-/),type:'image/png',size:expect.any(Number)}]);
  await dialog.getByRole('button',{name:'Close sharing'}).click();
  expect(targets().retained).toBe('preserve');expect(errors).toEqual([]);
});

test('presentation enters full screen and restores camera and custom background',async({page})=>{
  const {canvas,errors,targets}=await loadViewer(page);
  await page.getByRole('button',{name:'Pose and motion controls'}).click();
  const motion=page.getByRole('region',{name:'Animation controls'});
  await motion.getByRole('button',{name:'Walking',exact:true}).click();
  await expect(motion.getByRole('button',{name:'Walking',exact:true})).toHaveAttribute('aria-pressed','true');
  await motion.getByRole('button',{name:'Pause animation'}).click();
  await expect(motion.getByRole('button',{name:'Play animation'})).toBeVisible();
  await motion.getByRole('button',{name:'Standing',exact:true}).click();
  await motion.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByLabel('Camera mode',{exact:true}).selectOption('ORBIT');
  await page.getByLabel('Model background',{exact:true}).selectOption('gradient');
  await page.getByLabel('Background color',{exact:true}).fill('#253549');
  await page.getByLabel('Background bottom color',{exact:true}).fill('#102030');
  await page.getByRole('checkbox',{name:'Auto rotate',exact:true}).uncheck();
  const chamber=page.locator('.chamber-fullscreen-wrap');
  await page.getByRole('button',{name:'Enter presentation'}).click();
  await expect(chamber).toHaveAttribute('data-presentation','on');
  await expect(page.locator('.chamber-overlay-top')).toBeHidden();
  await expect(canvas).toHaveAttribute('data-camera-mode','TURNTABLE');
  await expect(page.getByRole('button',{name:'Play presentation rotation'})).toBeVisible();
  const viewport=page.locator('.chamber-viewport');
  expect(await viewport.evaluate(el=>Boolean(document.fullscreenElement===el || getComputedStyle(el).position==='fixed'))).toBe(true);
  await viewport.screenshot({path:test.info().outputPath('presentation.png')});
  await page.getByRole('button',{name:/Exit presentation/}).click();
  await expect(chamber).toHaveAttribute('data-presentation','off');
  await expect(page.getByLabel('Camera mode',{exact:true})).toHaveValue('ORBIT');
  await expect(page.getByRole('checkbox',{name:'Auto rotate',exact:true})).not.toBeChecked();
  await expect(page.getByLabel('Background color',{exact:true})).toHaveValue('#253549');
  await expect.poll(()=>targets().viewerPreferences?.backgroundBottomColor).toBe('#102030');
  await page.keyboard.press('p');await expect(chamber).toHaveAttribute('data-presentation','on');
  await page.keyboard.press('Escape');await expect(chamber).toHaveAttribute('data-presentation','off');
  expect(errors).toEqual([]);
});

test('regional tan and undertone render independently and survive reload',async({page})=>{
  const {canvas,errors,body,targets}=await loadViewer(page);
  await page.getByLabel('Model background',{exact:true}).selectOption('color');
  await page.getByLabel('Background color',{exact:true}).fill('#ccddee');
  await page.getByRole('checkbox',{name:'Stage floor and decorations'}).uncheck();
  await page.getByRole('tab',{name:'Skin',exact:true}).click();
  await page.getByLabel('Base skin color',{exact:true}).fill('#bc8970');
  await expect(page.getByLabel('Base skin color',{exact:true})).toHaveValue('#bc8970');
  const color=await page.getByLabel('Base skin color',{exact:true}).inputValue();
  await canvas.scrollIntoViewIfNeeded();
  const skinBrightness=()=>canvas.evaluate(element=>{
    const source=element as HTMLCanvasElement,temp=document.createElement('canvas');temp.width=source.width;temp.height=source.height;
    const context=temp.getContext('2d')!;context.drawImage(source,0,0);
    const data=context.getImageData(0,0,temp.width,temp.height).data;let sum=0,count=0;
    for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],b=data[i+2];if(r>60 && b>25 && r>g*1.12 && g>b*1.08){sum+=.2126*r+.7152*g+.0722*b;count++;}}
    return count?sum/count:0;
  });
  await expect.poll(skinBrightness).toBeGreaterThan(0);
  const brightnessBefore=await skinBrightness();
  const before=await canvas.screenshot();
  await page.getByRole('slider',{name:'Tan amount',exact:true}).fill('1');
  await expect.poll(()=>targets().appearanceMetrics?.skinTan).toBe(1);
  await expect(page.getByLabel('Base skin color',{exact:true})).toHaveValue(color);
  const after=await canvas.screenshot();expect(after.equals(before)).toBe(false);
  expect(await skinBrightness()).toBeLessThan(brightnessBefore*.98);
  await page.getByLabel('Skin undertone',{exact:true}).selectOption('warm');
  await expect.poll(()=>targets().appearanceMetrics?.skinUndertone).toBe('warm');
  expect(body).toMatchObject({heightCm:175,weightKg:74,waistCm:82,chestCm:99});
  await page.locator('.chamber-viewport').screenshot({path:test.info().outputPath('regional-tan.png')});
  await page.reload();await page.getByRole('tab',{name:'Skin',exact:true}).click();
  await expect(page.getByRole('slider',{name:'Tan amount',exact:true})).toHaveValue('1');
  await expect(page.getByLabel('Skin undertone',{exact:true})).toHaveValue('warm');
  await expect(page.getByLabel('Base skin color',{exact:true})).toHaveValue(color);
  expect(errors).toEqual([]);
});

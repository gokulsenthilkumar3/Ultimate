import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

test('offline live adult model renders, moves and fits in the desktop engine',async({page},testInfo)=>{
  test.setTimeout(180000);const errors:string[]=[],network:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(/Shader Error|VALIDATE_STATUS|Computed radius is NaN|GL_INVALID/.test(message.text()))errors.push(message.text());});
  page.on('request',request=>{if(/^https?:/.test(request.url()))network.push(request.url());});
  await page.goto(pathToFileURL(path.resolve('artifacts/human-r2/live-human-3d.html')).href);
  expect(errors).toEqual([]);
  await page.waitForFunction(()=>window['liveHuman']?.ready,null,{timeout:90000});
  const initial=await page.evaluate(()=>window['liveHuman'].inspect());expect(initial.evidence.fit.status).toBe('within-tolerance');expect(initial.evidence.contact.unresolved).toBe(false);
  for(const region of ['body','face','anatomy']){
    await page.evaluate(region=>window['liveHuman'].focus(region),region);
    await page.locator('canvas').screenshot({path:path.resolve('.tmp/private-finish/live-'+testInfo.project.name+'-'+region+'.png')});
  }
  await page.getByLabel('Length (cm)',{exact:true}).fill('12');await page.getByLabel('Length (cm)',{exact:true}).press('Tab');
  await expect.poll(()=>page.evaluate(()=>window['liveHuman'].inspect().evidence.centrelineCm)).toBeGreaterThan(11.99);
  await page.getByLabel('Middle section',{exact:true}).selectOption('dimensions');
  await page.getByLabel('Width (cm)',{exact:true}).fill('3.5');await page.getByLabel('Width (cm)',{exact:true}).press('Tab');
  await page.getByLabel('Depth (cm)',{exact:true}).fill('2.8');await page.getByLabel('Depth (cm)',{exact:true}).press('Tab');
  const dimensions=await page.evaluate(()=>window['liveHuman'].inspect().evidence);expect(dimensions.midWidthCm).toBeCloseTo(3.5,1);expect(dimensions.midDepthCm).toBeCloseTo(2.8,1);
  await page.getByLabel('Middle section',{exact:true}).selectOption('circumference');
  for(const pose of ['seated','crouch','wide','stride','neutral']){
    await page.getByLabel('Pose',{exact:true}).selectOption(pose);
    const result=await page.evaluate(()=>window['liveHuman'].inspect());expect(result.evidence.fit.status).toBe('within-tolerance');expect(result.evidence.contact.unresolved).toBe(false);
  }
  await page.getByLabel('State',{exact:true}).selectOption('erect');
  for(const value of ['0','50','100']){
    await page.getByLabel('Retraction',{exact:true}).evaluate((input:HTMLInputElement,value)=>{input.value=value as string;input.dispatchEvent(new Event('change',{bubbles:true}));},value);
    expect((await page.evaluate(()=>window['liveHuman'].inspect())).evidence.fit.status).toBe('within-tolerance');
  }
  await page.getByLabel('Skin colour',{exact:true}).evaluate((input:HTMLInputElement)=>{input.value='#a66e54';input.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.getByLabel('Tanning',{exact:true}).evaluate((input:HTMLInputElement)=>{input.value='35';input.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.getByRole('button',{name:'Guides',exact:true}).click();await page.locator('canvas').screenshot({path:path.resolve('.tmp/private-finish/live-'+testInfo.project.name+'-guides-tan.png')});
  await page.getByRole('button',{name:'Guides',exact:true}).click();
  await page.getByRole('button',{name:'Anatomy visible',exact:true}).click();expect((await page.evaluate(()=>window['liveHuman'].inspect())).anatomy).toBe(false);
  await page.getByRole('button',{name:'Anatomy hidden',exact:true}).click();
  await page.getByLabel('Detail',{exact:true}).selectOption('hero');await page.waitForFunction(()=>window['liveHuman'].ready&&window['liveHuman'].inspect().lod==='hero',null,{timeout:90000});
  expect((await page.evaluate(()=>window['liveHuman'].inspect())).evidence.contact.unresolved).toBe(false);
  await page.getByRole('button',{name:'Full figure',exact:true}).click();await page.getByRole('button',{name:'Play motion',exact:true}).click();
  await page.evaluate(()=>window['liveHuman'].startTiming());const before=await page.evaluate(()=>window['liveHuman'].inspect());await page.waitForTimeout(1800);
  const motion=await page.evaluate(()=>window['liveHuman'].inspect());expect(motion.frames).toBeGreaterThan(before.frames+3);expect(motion.limb).not.toEqual(before.limb);expect(motion.evidence.contact.unresolved).toBe(false);
  await page.getByRole('button',{name:'Play motion',exact:true}).click();
  await page.locator('canvas').screenshot({path:path.resolve('.tmp/private-finish/live-'+testInfo.project.name+'-hero-motion.png')});
  expect(network).toEqual([]);expect(errors).toEqual([]);
  const sorted=motion.frameTimes.slice().sort((a,b)=>a-b),report={engine:testInfo.project.name,host:'Windows',macHardwareTested:false,offline:true,networkRequests:network.length,errors,frames:motion.frames-before.frames,frameP50Ms:sorted[Math.floor(sorted.length*.5)],frameP95Ms:sorted[Math.floor(sorted.length*.95)],renderer:motion.renderer,fit:motion.evidence.fit.status,contact:motion.evidence.contact.unresolved,native:motion.native,viewport:page.viewportSize()};
  const verified={...report,runAt:new Date().toISOString(),viewerSha256:createHash('sha256').update(fs.readFileSync('artifacts/human-r2/live-human-3d.html')).digest('hex')};
  fs.mkdirSync('docs/real-human-3d/data/private-finish',{recursive:true});fs.writeFileSync('docs/real-human-3d/data/private-finish/live-'+testInfo.project.name+'.json',JSON.stringify(verified,null,2)+'\n');
});

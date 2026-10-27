import {test,expect} from './foundation-fixture';
import path from 'node:path';
import fs from 'node:fs';
test('native adult surface baseline review',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(/Shader Error|VALIDATE_STATUS|Computed radius is NaN/.test(message.text()))errors.push(message.text());});
  await page.goto('/scripts/review-native-anatomy.html?lod=hero');
  await page.waitForFunction(()=>window['nativeReview']?.ready);
  for(const surface of ['skin','clay']){
    await page.evaluate(surface=>window['nativeReview'].setSurface(surface),surface);
    for(const view of ['front','side','opposite','back','oblique','under','above']){
      await page.evaluate(view=>window['nativeReview'].setView(view),view);
      await page.locator('canvas').screenshot({path:path.resolve('.tmp/private-finish/baseline-'+test.info().project.name+'-'+surface+'-'+view+'.png')});
    }
  }
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>window['nativeReview'].inspect().native.degenerateFrames)).toBe(0);
  fs.writeFileSync(path.resolve('.tmp/private-finish/baseline-'+test.info().project.name+'-surface.json'),JSON.stringify(await page.evaluate(()=>window['nativeReview'].inspect()),null,2));
});

test('native surface states, regional colour and movement remain usable',async({page},testInfo)=>{
  test.setTimeout(120000);
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(/Shader Error|VALIDATE_STATUS|Computed radius is NaN/.test(message.text()))errors.push(message.text());});
  for(const lod of ['core','hero']){
    await page.goto('/scripts/review-native-anatomy.html?lod='+lod);
    await page.waitForFunction(()=>window['nativeReview']?.ready);
    for(const state of ['resting','erect'])for(const retraction of [0,50,100]){
      const evidence=await page.evaluate(({state,retraction})=>window['nativeReview'].setAnatomy({penis:{[state]:{shape:{foreskinCoverage:100,foreskinRetraction:retraction}}}},{state}),{state,retraction});
      expect(evidence.fit.status).toBe('within-tolerance');expect(evidence.contact.unresolved).toBe(false);
      await page.evaluate(()=>window['nativeReview'].setView('oblique'));
      await page.locator('canvas').screenshot({path:path.resolve('.tmp/private-finish/'+testInfo.project.name+'-'+lod+'-'+state+'-'+retraction+'.png')});
    }
    await page.evaluate(()=>window['nativeReview'].setAnatomy({skinRegions:{shaft:{enabled:true,color:'#754a39',tanIntensity:60}}}));
    await page.locator('canvas').screenshot({path:path.resolve('.tmp/private-finish/'+testInfo.project.name+'-'+lod+'-regional-tan.png')});
    await page.evaluate(()=>window['nativeReview'].setAnatomy());
    const motion=await page.evaluate(()=>window['nativeReview'].motion(30));
    expect(motion.finite).toBe(true);expect(motion.failures).toEqual([]);expect(motion.allFramesPassed).toBe(true);expect(motion.evidence.fit.status).toBe('within-tolerance');expect(motion.evidence.contact.unresolved).toBe(false);
    fs.mkdirSync('docs/real-human-3d/data/private-finish',{recursive:true});
    fs.writeFileSync(path.resolve('docs/real-human-3d/data/private-finish/'+testInfo.project.name+'-'+lod+'-browser.json'),JSON.stringify({...motion,viewport:page.viewportSize(),deviceScope:'Browser host and viewport emulation; no physical phone'},null,2));
    await page.evaluate(()=>window['nativeReview'].setLighting('grazing'));
    await page.locator('canvas').screenshot({path:path.resolve('.tmp/private-finish/'+testInfo.project.name+'-'+lod+'-grazing.png')});
  }
  expect(errors).toEqual([]);
});

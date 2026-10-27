import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {chromium} from '@playwright/test';

const adb=path.resolve('.tmp/android-tools/platform-tools/adb.exe'),out='docs/real-human-3d/data/private-finish/android-physical.json';
const command=(...args)=>{
  const result=spawnSync(adb,args,{encoding:'utf8',windowsHide:true,timeout:20000});
  if(result.error || result.status!==0)throw new Error(result.error?.message || result.stderr || 'ADB command failed');return result.stdout.trim();
};
const devices=command('devices').split(/\r?\n/).slice(1).map(line=>line.trim().split(/\s+/)).filter(fields=>fields[0]);
const ready=devices.filter(([,state])=>state==='device');
fs.mkdirSync(path.dirname(out),{recursive:true});
if(ready.length!==1){
  const status=ready.length>1?'multiple-devices':devices.some(([,state])=>state==='unauthorized')?'authorization-required':'no-device';
  fs.writeFileSync(out,JSON.stringify({status,physicalDeviceTested:false,detail:'Exactly one USB-debugging-authorized Android phone is required. No unrelated browser tabs or owner records are inspected.'},null,2)+'\n');
  console.log(JSON.stringify({status,physicalDeviceTested:false}));process.exit(2);
}
const serial=ready[0][0],device=(...args)=>command('-s',serial,...args);
const report={status:'running',physicalDeviceTested:true,model:device('shell','getprop','ro.product.model'),android:device('shell','getprop','ro.build.version.release'),runs:[],errors:[]};
let page;
try{
  device('reverse','tcp:5176','tcp:5176');
  const url='http://127.0.0.1:5176/scripts/review-native-anatomy.html?lod=core&physical-review=1';
  device('shell','am','start','-a','android.intent.action.VIEW','-d',url,'--es','com.android.browser.application_id','growthtrack.native.review','-p','com.android.chrome');
  device('forward','tcp:9226','localabstract:chrome_devtools_remote');
  const browser=await chromium.connectOverCDP('http://127.0.0.1:9226');
  for(let attempt=0;attempt<30 && !page;attempt++){
    page=browser.contexts().flatMap(context=>context.pages()).find(tab=>tab.url().includes('/scripts/review-native-anatomy.html')&&tab.url().includes('physical-review=1'));
    if(!page)await new Promise(resolve=>setTimeout(resolve,500));
  }
  if(!page)throw new Error('Owned review tab did not open in Chrome');
  page.on('pageerror',error=>report.errors.push(error.message));
  report.userAgent=await page.evaluate(()=>navigator.userAgent);
  for(const lod of ['core','hero']){
    await page.goto(url.replace('lod=core','lod='+lod));await page.waitForFunction(()=>window.nativeReview?.ready,null,{timeout:60000});
    for(const view of ['front','side','opposite','back','oblique','under','above']){
      await page.evaluate(view=>window.nativeReview.setView(view),view);
      await page.screenshot({path:'.tmp/private-finish/phone-'+lod+'-'+view+'.png'});
    }
    for(const state of ['resting','erect'])for(const retraction of [0,50,100]){
      const evidence=await page.evaluate(({state,retraction})=>window.nativeReview.setAnatomy({penis:{[state]:{shape:{foreskinCoverage:100,foreskinRetraction:retraction}}}},{state}),{state,retraction});
      if(evidence.fit.status!=='within-tolerance'||evidence.contact.unresolved)throw new Error('Physical state fitting/contact failed: '+state+'/'+retraction);
      await page.screenshot({path:'.tmp/private-finish/phone-'+lod+'-'+state+'-'+retraction+'.png'});
    }
    await page.evaluate(()=>window.nativeReview.setAnatomy());
    const motion=await page.evaluate(()=>window.nativeReview.motion(60));
    report.runs.push({lod,...motion,targetP95FrameMs:33.333,frameBudgetPassed:motion.frameIntervalP95Ms<=33.333});
    if(!motion.allFramesPassed||motion.evidence.contact.unresolved)throw new Error('Physical movement check failed');
  }
  report.status=report.errors.length?'failed':report.runs.every(run=>run.frameBudgetPassed)?'passed':'rendering-passed-performance-limited';
}catch(error){report.status='failed';report.errors.push(error.message);}
finally{
  await page?.close().catch(()=>{});
  try{device('forward','--remove','tcp:9226');device('reverse','--remove','tcp:5176');}catch(error){report.cleanup=error.message;}
  fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,model:report.model,runs:report.runs.map(run=>({lod:run.lod,p95:run.frameIntervalP95Ms,frameBudgetPassed:run.frameBudgetPassed})),errors:report.errors}));
}
// Disconnect this CDP client without issuing Browser.close to the user's Chrome.
process.exit(report.status==='failed'?1:0);

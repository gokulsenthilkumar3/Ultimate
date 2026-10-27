import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const dir='docs/real-human-3d/data/private-finish/';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const manifest=read('src/config/humanAssetManifest.json');
const staticMatrix=read(dir+'surface-pose-matrix.json'),motionMatrix=read(dir+'motion-matrix.json');
for(const report of [staticMatrix,motionMatrix]){
  assert.deepEqual(report.assets,manifest.assets,'Geometry evidence must match the final asset hashes');
  assert.equal(report.failures.length,0,'Geometry verification failed');
}
const unit=read('.tmp/private-finish/finish-unit.json');assert.equal(unit.success,true);
const format=read('docs/real-human-3d/data/human-r2/validation.json');assert.equal(format.errors,0);
const browsers=[];
for(const project of ['desktop-chrome','android-viewport','tablet-viewport'])for(const lod of ['core','hero']){
  const report=read(dir+project+'-'+lod+'-browser.json'),asset=manifest.assets[lod];
  assert.deepEqual(report.assetHashes,{body:asset.sha256,private:asset.privateSha256},'Stale browser asset');
  assert.equal(report.allFramesPassed,true,'Intermediate browser motion failed');
  browsers.push({project,lod,frames:report.frames,passed:true,frameP95Ms:report.frameIntervalP95Ms,targetFrameMs:33.333,frameBudgetPassed:report.frameIntervalP95Ms<=33.333,renderer:report.renderer,viewport:report.viewport});
}
const viewerFile='artifacts/human-r2/live-human-3d.html',viewerSha256=createHash('sha256').update(fs.readFileSync(viewerFile)).digest('hex');
const offline=[];
for(const project of ['windows-chrome','windows-edge','webkit-compatibility']){
  const report=read(dir+'live-'+project+'.json');assert.equal(report.viewerSha256,viewerSha256,'Stale offline viewer review');
  assert.equal(report.errors.length,0);assert.equal(report.networkRequests,0);assert.equal(report.fit,'within-tolerance');assert.equal(report.contact,false);
  offline.push({project,passed:true,networkRequests:0,frameP95Ms:report.frameP95Ms,renderer:report.renderer});
}
for(const [file,expected] of [['final-native-browser.log',6],['final-live-browser.log',3],['final-app-browser.log',1]]){
  assert.match(fs.readFileSync('.tmp/private-finish/'+file,'utf8'),new RegExp('\\b'+expected+' passed\\b'),'Incomplete browser suite: '+file);
}
const review={
  version:1,reviewedAt:new Date().toISOString(),status:'engineering-verified-visual-finish-incomplete',
  deviceScope:'Browser-only per user instruction; Windows host, including phone/tablet viewport emulation. No physical phone, iPad or Mac acceptance claimed.',
  assets:manifest.assets,viewer:{file:viewerFile,sha256:viewerSha256},
  tests:{unit:unit.numPassedTests,browserFlows:10,staticCases:staticMatrix.cases.length,motionSamples:motionMatrix.sampleCount,assetErrors:format.errors,typecheck:'passed',productionBuild:'passed'},
  browsers,offline,
  visualReview:{status:'changes-required',materials:['skin','clay','grazing-light'],views:['front','side','opposite','back','oblique','under','above'],findings:[
    'The wider refined collar and matching atlas interpolation soften the attachment, but a visible join remains at the root.',
    'The crease beside the sac and the underside transition remain visibly modeled in close-up.',
    'The whole figure still has sparse ribbon hair and some coarse contours. Photorealism is not approved.',
  ]},
  limits:[
    'Finite pose samples and numerical fitting do not prove accuracy in every possible position or angle.',
    'Contact checks exclude the attachment collar. Collar self-intersection and continuous collision detection are not certified.',
    'Contact is quasistatic support; the rig does not implement validated soft-tissue dynamics.',
    'Entered external dimensions are fitted; internal guides and unspecified anatomy remain generic.',
    'Browser frame-time measurements are brief host samples, not a sustained device performance benchmark.',
  ],
};
fs.writeFileSync(dir+'finish-review.json',JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify({status:review.status,tests:review.tests,physicalDevicesTested:false}));

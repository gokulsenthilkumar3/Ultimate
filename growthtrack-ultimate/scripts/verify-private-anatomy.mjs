import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'vite';
import {nativeFixture} from './human-realism/native-fixture.mjs';
import {analyzeNativeContacts} from './human-realism/contact-analysis.mjs';

await build({configFile:false,logLevel:'warn',build:{outDir:'.tmp/private-finish/runtime',lib:{entry:'scripts/human-realism/runtime-entry.js',formats:['es'],fileName:()=> 'runtime.mjs'},rolldownOptions:{external:['three','react']},minify:false}});
const runtime=await import(pathToFileURL(path.resolve('.tmp/private-finish/runtime/runtime.mjs')));
const poses={
  neutral:{},
  seated:{leftThigh:[75,0,0],rightThigh:[75,0,0],leftShin:[-75,0,0],rightShin:[-75,0,0]},
  crouch:{leftThigh:[65,0,15],rightThigh:[65,0,-15],leftShin:[-95,0,0],rightShin:[-95,0,0]},
  wide:{leftThigh:[0,0,30],rightThigh:[0,0,-30]},
  leftStride:{leftThigh:[65,0,0],rightThigh:[-45,0,0]},
  rightStride:{leftThigh:[-45,0,0],rightThigh:[65,0,0]},
  twisted:{leftThigh:[30,30,15],rightThigh:[15,-30,-15],spine1:[15,20,0]},
};
const cases=[
  {id:'generic',profile:{}},
  {id:'short-wide',profile:{penis:{resting:{measurements:{lengthCm:6,midCircumferenceCm:12}}}}},
  {id:'long-narrow',profile:{penis:{erect:{measurements:{lengthCm:16,midCircumferenceCm:8},shape:{curvature:30,curvatureDirectionDeg:90}}}},state:'erect'},
  {id:'dimensions',profile:{penis:{resting:{inputMode:'dimensions',measurements:{lengthCm:11,widthCm:3.6,depthCm:2.8}}}}},
  {id:'taper',profile:{penis:{erect:{measurements:{lengthCm:13,baseCircumferenceCm:11,midCircumferenceCm:10,distalCircumferenceCm:9}}}},state:'erect'},
  {id:'covered',profile:{penis:{resting:{shape:{foreskinCoverage:100,foreskinRetraction:0}}}}},
  {id:'partial-curved',profile:{penis:{resting:{shape:{foreskinCoverage:100,foreskinRetraction:50,curvature:60,curvatureDirectionDeg:-90,elevationDeg:-60}}}}},
  {id:'retracted-high',profile:{penis:{erect:{measurements:{lengthCm:13,midCircumferenceCm:11},shape:{foreskinCoverage:100,foreskinRetraction:100,curvature:60,curvatureDirectionDeg:90,elevationDeg:85}}}},state:'erect'},
  {id:'short-stature',profile:{},heightScale:.85,weights:{leg_length:.25,pelvis_width:1},poses:['neutral','seated','wide']},
  {id:'tall-mass',profile:{},heightScale:1.15,weights:{overall_mass:1,gut_volume:1,hip_width:1,quad_sweep:1},poses:['neutral','seated','wide']},
  {id:'sac-dimensions',profile:{scrotum:{envelope:{widthCm:6.3,heightCm:7.1,depthCm:4.8,hangCm:9.2,asymmetry:10}}}},
  {id:'guide-contracted',profile:{scrotum:{presentation:'contracted',fitMode:'guides',paddingCm:.2,leftTestis:{lengthCm:4.5,widthCm:3,depthCm:2.5,placement:{tiltDeg:20}},rightTestis:{lengthCm:4,widthCm:2.5,depthCm:2.5}}},poses:['neutral','seated','wide']},
  {id:'side-bend',profile:{penis:{erect:{measurements:{lengthCm:14,midCircumferenceCm:10},shape:{curvature:-60,curvatureDirectionDeg:0,elevationDeg:-80}}}},state:'erect',poses:['neutral','seated','wide']},
];
const results=[],failures=[];
const quick=process.argv.includes('--quick');
for(const lod of quick?['core']:['core','hero']){
  const fixture=await nativeFixture(lod,runtime);
  for(const item of cases)for(const [pose,joints] of Object.entries(poses)){
    if(quick && (item.id!=='generic' || !['neutral','wide'].includes(pose)))continue;
    if(item.poses && !item.poses.includes(pose))continue;
    fixture.setMorphs(item.weights);fixture.setPose(joints,item.heightScale || 1);
    const original=JSON.stringify(item.profile);
    fixture.attachment.deformer.apply(item.profile,{state:item.state || 'resting',heightScale:item.heightScale || 1});
    fixture.setPose(joints,item.heightScale || 1);
    const evidence=fixture.attachment.deformer.getEvidence();
    const result={lod,case:item.id,pose,fit:evidence.fit,surface:structuredClone(evidence.rendered),contact:analyzeNativeContacts(fixture.body,fixture.attachment.mesh),contactSolve:evidence.contact,
      finite:fixture.attachment.mesh.geometry.attributes.position.array.every(Number.isFinite),
      degenerateFrames:fixture.attachment.mesh.userData.nativeRuntime.degenerateFrames,
      junction:fixture.attachment.mesh.getObjectByName('PrivateAnatomyPelvicTransition')?.userData.junctionEvidence,
      scrotumFit:evidence.scrotumFit,heightScale:item.heightScale || 1,sourceUnchanged:JSON.stringify(item.profile)===original};
    // Keep reports compact: geometry-derived station positions are available
    // to the viewer, while the matrix retains measured dimension summaries.
    if(result.surface)delete result.surface.stations;
    results.push(result);
    const layerFailure=result.contact.layers.some(layer=>!layer.finite || layer.bodyIntersections || (layer.maximumSurfaceDistanceMetres || 0)>.0025);
    const guideFailure=evidence.scrotumFit.mode==='guides' && evidence.scrotumFit.status!=='sampled-fit';
    if(evidence.fit.status!=='within-tolerance' || result.contact.bodyIntersections || result.contact.shaftSacIntersections || evidence.contact?.unresolved || layerFailure || guideFailure || !result.finite || result.degenerateFrames || !result.sourceUnchanged || (result.junction?.boundaryResidualMetres ?? 1)>.0001)failures.push({lod,case:item.id,pose,fit:evidence.fit.status,contact:result.contact,contactSolve:evidence.contact,guideFit:guideFailure?evidence.scrotumFit:null,dimensions:evidence.fit.dimensions.filter(d=>!d.passed)});
  }
  fixture.attachment.dispose();console.log(JSON.stringify({lod,completed:results.length,failures:failures.length}));
}
fs.mkdirSync('docs/real-human-3d/data/private-finish',{recursive:true});
fs.writeFileSync(quick?'.tmp/private-finish/quick-matrix.json':'docs/real-human-3d/data/private-finish/surface-pose-matrix.json',JSON.stringify({version:1,runAt:new Date().toISOString(),assets:JSON.parse(fs.readFileSync('src/config/humanAssetManifest.json')).assets,scope:'Named geometry/pose fixtures; not a universal biological accuracy claim',poses,cases:results,failures},null,2)+'\n');
console.log(JSON.stringify({cases:results.length,failures:failures.length,details:failures.slice(0,8)}));
process.exitCode=failures.length?1:0;

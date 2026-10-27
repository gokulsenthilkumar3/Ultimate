import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'vite';
import {nativeFixture} from './human-realism/native-fixture.mjs';
import {analyzeNativeContacts} from './human-realism/contact-analysis.mjs';

await build({configFile:false,logLevel:'warn',build:{outDir:'.tmp/private-motion/runtime',lib:{entry:'scripts/human-realism/runtime-entry.js',formats:['es'],fileName:()=> 'runtime.mjs'},rolldownOptions:{external:['three','react']},minify:false}});
const runtime=await import(pathToFileURL(path.resolve('.tmp/private-motion/runtime/runtime.mjs')));
// These are the actual configured joint limits, including crossed legs. They
// are fixture samples of the supported rig, not arbitrary human joint ranges.
const destinations={
  seated:{leftThigh:[75,0,0],rightThigh:[75,0,0],leftShin:[-100,0,0],rightShin:[-100,0,0]},
  spread:{leftThigh:[0,0,30],rightThigh:[0,0,-30]},
  crossed:{leftThigh:[35,30,-30],rightThigh:[0,-30,30]},
  stride:{leftThigh:[75,0,0],rightThigh:[-55,0,0]},
  twist:{leftThigh:[45,30,15],rightThigh:[15,-30,-15],spine1:[25,20,15]},
};
const profiles=[
  {id:'resting-fold',state:'resting',profile:{penis:{resting:{shape:{foreskinCoverage:100,foreskinRetraction:100}}}}},
  {id:'curved-covered',state:'erect',profile:{penis:{erect:{measurements:{lengthCm:14,midCircumferenceCm:10},shape:{foreskinCoverage:100,foreskinRetraction:50,curvature:60,curvatureDirectionDeg:90}}},scrotum:{presentation:'contracted'}}},
];
const runs=[],failures=[];
for(const lod of ['core','hero']){
  const fixture=await nativeFixture(lod,runtime);
  for(const item of profiles)for(const [name,destination] of Object.entries(destinations)){
    fixture.setPose({});fixture.attachment.deformer.apply(item.profile,{state:item.state});
    const samples=[];
    for(let frame=0;frame<=20;frame++){
      const phase=frame<=10?frame/10:(20-frame)/10;
      fixture.setPose(Object.fromEntries(Object.entries(destination).map(([joint,angles])=>[joint,angles.map(a=>a*phase)])));
      const evidence=fixture.attachment.deformer.getEvidence(),mesh=fixture.attachment.mesh;
      const contacts=analyzeNativeContacts(fixture.body,mesh);
      const junction=mesh.getObjectByName('PrivateAnatomyPelvicTransition').userData.junctionEvidence;
      const finite=[mesh,...mesh.children.filter(m=>m.isMesh&&m.visible&&!m.userData.controlCage)].every(m=>m.geometry.attributes.position.array.every(Number.isFinite));
      const passed=finite && evidence.fit.status==='within-tolerance' && !evidence.contact.unresolved && !contacts.bodyIntersections && !contacts.shaftSacIntersections && junction.boundaryResidualMetres<.0001 && contacts.layers.every(l=>l.finite&&!l.bodyIntersections&&(l.maximumSurfaceDistanceMetres||0)<=.0025);
      const sample={frame,phase,passed,fit:evidence.fit.status,finite,bodyIntersections:contacts.bodyIntersections,shaftSacIntersections:contacts.shaftSacIntersections,contactUnresolved:evidence.contact.unresolved,boundaryResidualMetres:junction.boundaryResidualMetres,layers:contacts.layers};
      samples.push(sample);if(!passed)failures.push({lod,profile:item.id,sequence:name,...sample});
    }
    runs.push({lod,profile:item.id,sequence:name,samples});
    console.log(JSON.stringify({lod,profile:item.id,sequence:name,failed:samples.filter(s=>!s.passed).length}));
  }
  fixture.attachment.dispose();
}
const sampleCount=runs.reduce((n,r)=>n+r.samples.length,0);
const report={version:1,runAt:new Date().toISOString(),assets:JSON.parse(fs.readFileSync('src/config/humanAssetManifest.json')).assets,sampleCount,scope:'Sampled intermediate poses including outward and return motion; attachment collar excluded from triangle collision checks as in the static matrix. Not continuous collision detection.',destinations,profiles,runs,failures};
fs.writeFileSync('docs/real-human-3d/data/private-finish/motion-matrix.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({samples:sampleCount,failures:failures.length}));process.exitCode=failures.length?1:0;

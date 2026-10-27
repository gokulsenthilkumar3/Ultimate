import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {build} from 'vite';
import {Box3,BufferAttribute,Color,Mesh} from 'three';
import {MeshoptSimplifier} from 'meshoptimizer';
import {readGlb,readAccessor} from './plan-preview/glb.mjs';
import {appender,sceneFromGlb} from './human75/glb-tools.mjs';
import {normalizeGlbFormat,glbFromBytes} from './gltf-format.mjs';
import {sculptBody,subdivide} from './human-realism/sculpt.mjs';
import {buildGroom} from './human-realism/groom.mjs';
import {bindNativeMeshes,transferNativeSkin} from './human-realism/native-binding.mjs';
import {embedPrivateTextures} from './human-realism/private-textures.mjs';
import {buildCombinedAsset} from './human-realism/combined-asset.mjs';
import {sha256,writeGeometry,retainMeshes,pruneMaterials,resizeImages,publicWriter,compressGlb,meshStatistics} from './human-realism/glb-family.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
const config=JSON.parse(fs.readFileSync('src/config/humanAssetFamily.json'));
const provenanceFile='public/assets/models/ASSET-PROVENANCE.json',provenance=JSON.parse(fs.readFileSync(provenanceFile));
const work=path.join(root,'.tmp/human-r2'),recordDir=path.join(root,'docs/real-human-3d/data/human-r2');
const blenderArg=process.argv.indexOf('--blender'),blender=blenderArg>=0?process.argv[blenderArg+1]:process.env.BLENDER_BIN || (process.platform==='win32'?'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe':'blender');
fs.mkdirSync(work,{recursive:true});fs.mkdirSync(recordDir,{recursive:true});
const retained=Object.fromEntries(provenance.assets.filter(a=>/humanoid-(base|adult-v2|preview-75)(-lite)?\.glb$/.test(a.path)).map(a=>[a.path,a.sha256]));
for(const [file,hash] of Object.entries(retained))if(sha256(fs.readFileSync(file))!==hash)throw new Error('Unreviewed retained source: '+file);
await build({configFile:false,logLevel:'warn',build:{outDir:'.tmp/human-r2/runtime',lib:{entry:'scripts/human-realism/runtime-entry.js',formats:['es'],fileName:()=> 'runtime.mjs'},rolldownOptions:{external:['three']},minify:false}});
const runtime=await import(pathToFileURL(path.join(work,'runtime/runtime.mjs')));
await MeshoptSimplifier.ready;
const reports=[],runtimeManifest={version:1,family:config.id,status:'candidate',assets:{}};

function addProvenance(relative,bytes,sourceEntry,note){
  const components=sourceEntry.components || provenance.assets.find(a=>a.path===sourceEntry.sameComponentsAs)?.components;
  const entry={path:relative,sha256:sha256(bytes),sourceAsset:sourceEntry.path,sourceSha256:sourceEntry.sha256,builtBy:'node scripts/build-human-realism.mjs',components:[...components.filter(c=>!c.name.startsWith('External anatomy') && !c.name.startsWith('Hair (')),
    {name:note,source:'scripts/human-realism/; src/config/humanAssetFamily.json',licence:'Project-authored derivative of the pinned CC0 foundation',status:'project',modified:true,note:'Candidate; independent visual and physical-device acceptance remain pending.'}]};
  const at=provenance.assets.findIndex(a=>a.path===relative);if(at<0)provenance.assets.push(entry);else provenance.assets[at]=entry;
}
function clonePart(mesh){
  const copy=new Mesh(mesh.geometry.clone(),mesh.material);copy.name=mesh.name;
  copy.userData=structuredClone(mesh.userData);return copy;
}
function reducePart(mesh,alternate,ratio) {
  if(mesh.userData.nativeJunction)return {alternate,error:0};
  const g=mesh.geometry,target=Math.max(24,Math.floor(g.index.count*ratio/3)*3);
  const reference=/Foreskin/.test(mesh.name) && alternate?alternate:g.attributes.position.array;
  const [ids,error]=MeshoptSimplifier.simplify(Uint32Array.from(g.index.array),reference,3,target,ratio<.5?.002:.001,['LockBorder']);
  const used=[...new Set(ids)],map=new Map(used.map((v,i)=>[v,i]));
  for(const [key,attribute] of Object.entries(g.attributes)){
    const data=new attribute.array.constructor(used.length*attribute.itemSize);
    used.forEach((id,i)=>{for(let k=0;k<attribute.itemSize;k++)data[i*attribute.itemSize+k]=attribute.getComponent(id,k);});
    g.setAttribute(key,new BufferAttribute(data,attribute.itemSize,attribute.normalized));
  }
  const next=alternate?Float32Array.from(used.flatMap(id=>Array.from(alternate.subarray(id*3,id*3+3)))):null;
  g.setIndex(Array.from(ids,id=>map.get(id)));g.computeVertexNormals();
  return {alternate:next,error};
}

for(const lod of ['core','hero']){
  const input='public/assets/models/'+(lod==='hero'?config.source:config.sourceLite);
  const sourceEntry=provenance.assets.find(a=>a.path===input),glb=readGlb(input),scene=sceneFromGlb(glb),body=scene.body;
  // Preserve custom region attributes omitted by the generic inspection helper.
  scene.meshes.forEach((mesh,i)=>{for(const [key,id] of Object.entries(glb.json.meshes[i].primitives[0].attributes))if(key.startsWith('_')){const a=readAccessor(glb,id);mesh.geometry.setAttribute(key.toLowerCase(),new BufferAttribute(a.data,a.width));}});
  runtime.scopeFacialMorphs(body);runtime.fitModelFeatures(body,scene.features);
  runtime.prepareFaceGeometry(body,scene.features);runtime.prepareEyelidCorrective(body,scene.features);
  const baseBounds=new Box3().setFromBufferAttribute(body.geometry.attributes.position),stature=baseBounds.max.y-baseBounds.min.y;
  // Resolve the attachment contour on a finer local surface in both LODs.
  // Midpoint transfer preserves the source landmarks and every shape/skin field.
  const pelvicRefinement=subdivide(body.geometry,{select:(tri,p)=>tri.some(id=>{
    const t=(p.getY(id)-baseBounds.min.y)/stature;
    return t>.48 && t<.59 && Math.abs(p.getX(id))<.065 && p.getZ(id)>.04;
  })});
  const refinement=lod==='hero'?subdivide(body.geometry,{select:(tri,p)=>tri.some(id=>{
    const t=(p.getY(id)-baseBounds.min.y)/stature;
    return t>.86 || t<.08 || Math.abs(p.getX(id))>stature*.27;
  })}):null;
  const sculpt=sculptBody(body.geometry,config);
  sculpt.pelvicRefinement=pelvicRefinement;
  const hair=scene.features.find(f=>f.feature==='hair').mesh,eyes=scene.features.find(f=>f.feature==='eyes').mesh;
  // Bake a generic iris/pupil into the GLB itself. The retained asset depended
  // on the live procedural eye shader to correct its atlas; DCC renders
  // otherwise showed largely white eyes. Runtime eye controls remain dynamic.
  const eyeFrames=runtime.deriveEyeFrames(eyes.geometry),eyePositions=eyes.geometry.attributes.position;
  const eyeColors=new Float32Array(eyePositions.count*3),sclera=new Color('#eee8e1'),iris=new Color('#62482d'),pupil=new Color('#06070a');
  for(let i=0;i<eyePositions.count;i++){
    const frame=eyeFrames.frames[eyePositions.getX(i)<eyeFrames.split?0:1].surface;
    const x=(eyePositions.getX(i)-frame.x)/frame.w,y=(eyePositions.getY(i)-frame.y)/frame.w,z=(eyePositions.getZ(i)-frame.z)/frame.w;
    const radius=Math.hypot(x,y)/.51,angle=Math.atan2(y,x),color=sclera.clone();
    if(z>.4 && radius<1){
      color.copy(iris).multiplyScalar(.85+.10*Math.sin(angle*53+radius*18));
      if(radius>.82)color.multiplyScalar(.55);
      if(radius<.29)color.copy(pupil);
    }
    color.toArray(eyeColors,i*3);
  }
  eyes.geometry.setAttribute('color',new BufferAttribute(eyeColors,3));
  eyes.userData.bakedIris={version:1,method:'front-surface-vertex-pigment',runtimeControls:'procedural-eye-material'};
  const groom=buildGroom(body,eyes,lod);hair.geometry=groom.geometry;hair.userData.authoredGroom=groom.report;
  body.userData.growthtrack={...body.userData.growthtrack,nativeFamily:config.id,lod,bindingPrepared:true,pelvicAttachmentRadiusCm:[4.2,4.4]};
  body.userData.humanLandmarks={version:1,method:'candidate-authored-vertex-planes',validated:false,sections:{}};
  const bp=body.geometry.attributes.position,box=new Box3().setFromBufferAttribute(bp);
  for(const [name,fraction] of [['chest',.72],['waist',.58],['hips',.50]]){
    const targetY=box.min.y+(box.max.y-box.min.y)*fraction;let best=Infinity,id=0;
    for(let i=0;i<bp.count;i++){
      const distance=Math.abs(bp.getY(i)-targetY)+Math.abs(bp.getX(i))*.3-Math.max(0,bp.getZ(i))*.01;
      if(distance<best){best=distance;id=i;}
    }
    body.userData.humanLandmarks.sections[name]={vertex:id,normal:[0,1,0],label:name,uncertainty:'Candidate plane; anatomical landmark review pending'};
  }
  // Offline tissue authoring starts from the documented v7 control scaffold.
  // The output stores native surfaces and bindings, never a runtime generator.
  const cage=scene.meshes.find(m=>/PrivateAnatomy/.test(m.name)),originalCage=cage.geometry.clone();
  // Pelvic soft tissue must not inherit thigh articulation. Leg contact is
  // resolved against the posed body, independently of the sac's attachment.
  const hips=runtime.resolveRigBones(body.skeleton).hips,pelvisIndex=body.skeleton.bones.indexOf(hips);
  if(pelvisIndex<0)throw new Error('Missing pelvic attachment bone');
  for(const geometry of [cage.geometry,originalCage])for(let i=0;i<geometry.attributes.position.count;i++)if(geometry.attributes.uv.getY(i)>=.5){
    geometry.attributes.skinIndex.setXYZW(i,pelvisIndex,0,0,0);geometry.attributes.skinWeight.setXYZW(i,1,0,0,0);
  }
  const fullBodyIndex=body.geometry.index.clone(),deformer=runtime.createPrivateAnatomyDeformer(cage,body);
  if(!deformer)throw new Error('Source cage could not be calibrated');
  const neutralPrivate={penis:{resting:{shape:{foreskinCoverage:100,foreskinRetraction:100}}}};
  cage.visible=true;deformer.apply(neutralPrivate);
  const parts=[clonePart(cage),...cage.children.filter(n=>n.isMesh).map(clonePart)];
  parts[0].geometry.setAttribute('_cagevertex',new BufferAttribute(Float32Array.from({length:parts[0].geometry.attributes.position.count},(_,i)=>i),1));
  const keptIndex=body.geometry.index.clone(),junction=deformer.junction;
  const covered=new Map();
  deformer.apply({penis:{resting:{shape:{foreskinCoverage:100}}}});
  for(const mesh of [cage,...cage.children.filter(n=>n.isMesh)])covered.set(mesh.name,mesh.geometry.attributes.position.array.slice());
  deformer.apply(neutralPrivate);
  const simplification=[];
  for(const part of parts){
    part.geometry.deleteAttribute('skinIndex');part.geometry.deleteAttribute('skinWeight');part.geometry.deleteAttribute('tangent');
    part.geometry.morphAttributes={};part.morphTargetInfluences=[];part.morphTargetDictionary={};
    const count=part.geometry.attributes.position.count;
    if(/Meatus|Foreskin/.test(part.name))part.geometry.setAttribute('_tissuevertex',new BufferAttribute(Float32Array.from({length:count},(_,i)=>i),1));
    part.geometry.setAttribute('_mucosa',new BufferAttribute(Float32Array.from({length:count},(_,i)=>/Meatus/.test(part.name)?1:/Foreskin/.test(part.name)&&Math.floor(i/64)>28?1:0),1));
    // Artist-editable detail is stored in the surface itself, in metres.
    // Boundary and aperture vertices are locked by the later triangle adapter.
    if(/Foreskin/.test(part.name)){
      const p=part.geometry.attributes.position,n=part.geometry.attributes.normal;
      if(n)for(let i=0;i<p.count;i++){
        const uv=part.geometry.attributes.uv,edge=Math.sin(Math.PI*(uv?.getY(i) || 0))**2;
        p.setXYZ(i,p.getX(i)+n.getX(i)*.00012*edge,p.getY(i)+n.getY(i)*.00012*edge,p.getZ(i)+n.getZ(i)*.00012*edge);
      }
    }
    const reduced=reducePart(part,covered.get(part.name),lod==='core'?.25:.8);
    if(reduced.alternate)covered.set(part.name,reduced.alternate);
    simplification.push({name:part.name,relativeError:reduced.error,triangles:part.geometry.index.count/3});
  }
  const binding=bindNativeMeshes(parts,body,cage,covered);
  for(const part of parts)transferNativeSkin(part,body,cage,parts[0]);
  const key=ids=>ids.join(','),kept=new Set();
  for(let i=0;i<keptIndex.count;i+=3)kept.add(key([0,1,2].map(k=>keptIndex.getX(i+k))));
  const removed=[];
  for(let i=0;i<fullBodyIndex.count;i+=3)if(!kept.has(key([0,1,2].map(k=>fullBodyIndex.getX(i+k)))))removed.push(i/3);
  if(!removed.length)throw new Error('No compatible pelvic opening was authored');
  const cageNeutral=cage.geometry.clone();
  deformer.dispose();body.geometry.setIndex(fullBodyIndex);
  const publicAsset=publicWriter(glb,scene);
  const hairPrimitive=publicAsset.json.meshes.find(m=>m.name==='GrowthTrackHair').primitives[0];
  publicAsset.json.materials[hairPrimitive.material]={name:'R2SweptHair',pbrMetallicRoughness:{baseColorFactor:[.035,.018,.009,1],roughnessFactor:.55,metallicFactor:0},doubleSided:true,extensions:{KHR_materials_specular:{specularFactor:.45}}};
  const corneaPrimitive=publicAsset.json.meshes.find(m=>m.name==='GrowthTrackCornea').primitives[0];
  publicAsset.json.materials[corneaPrimitive.material]={name:'R2CornealWetFilm',pbrMetallicRoughness:{baseColorFactor:[0,0,0,.04],roughnessFactor:.055,metallicFactor:0},alphaMode:'BLEND',doubleSided:true,extensions:{KHR_materials_ior:{ior:1.376},KHR_materials_specular:{specularFactor:.35}}};
  const eyePrimitive=publicAsset.json.meshes.find(m=>m.name==='GrowthTrackEyes').primitives[0];
  publicAsset.json.materials[eyePrimitive.material]={name:'R2IrisAndSclera',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],roughnessFactor:.32,metallicFactor:0},doubleSided:true,extensions:{KHR_materials_ior:{ior:1.38},KHR_materials_specular:{specularFactor:.3},KHR_materials_clearcoat:{clearcoatFactor:1,clearcoatRoughnessFactor:.08}}};
  publicAsset.json.extensionsUsed=[...new Set([...(publicAsset.json.extensionsUsed || []),'KHR_materials_specular'])];
  pruneMaterials(publicAsset.json);
  publicAsset.json.asset.generator='GrowthTrack generic adult R2 candidate';
  publicAsset.json.asset.extras={humanFamily:config.id,lod,status:'candidate',review:config.review,containsPrivateGeometry:false};
  resizeImages(publicAsset,glb,path.join(work,'textures-'+lod),lod==='core'?512:1024,blender);
  const publicRaw=normalizeGlbFormat(glbFromBytes(publicAsset.pack())).bytes,publicGlb=glbFromBytes(publicRaw);
  const compressed=await compressGlb(publicGlb),publicName=config.assets[lod],publicPath='public/assets/models/'+publicName;
  fs.writeFileSync(publicPath,compressed.bytes);fs.writeFileSync(path.join(work,lod+'-authoring.glb'),publicRaw);
  addProvenance(publicPath,compressed.bytes,sourceEntry,'R2 whole-body sculpt, transferred shape rig and separate public geometry');
  const publicHash=sha256(compressed.bytes);
  const privateWriter=appender(glb),json=privateWriter.json;
  retainMeshes(json,()=>false);json.meshes=[]; // Skeleton nodes remain; no body/image payload is retained.
  const material=json.materials.length;
  json.materials.push({name:'NativePrivateSkin',pbrMetallicRoughness:{baseColorFactor:[.55,.32,.22,1],metallicFactor:0,roughnessFactor:.58},doubleSided:true});
  const tissueMaps=embedPrivateTextures(privateWriter,lod==='core'?512:1024,runtime.anatomySurfaceHeight,json.materials[material]);
  const transparent=json.materials.length;
  json.materials.push({name:'HiddenControlScaffold',pbrMetallicRoughness:{baseColorFactor:[0,0,0,0],metallicFactor:0,roughnessFactor:1},alphaMode:'BLEND'});
  function append(mesh,mat,extras,skin=false){
    const id=json.meshes.length;
    const alternate=covered.get(mesh.name),names=alternate?['native_coverage']:skin?(mesh.userData.targetNames || []):[];
    if(alternate)mesh.geometry.morphAttributes.position=[new BufferAttribute(Float32Array.from(alternate,(v,i)=>v-mesh.geometry.attributes.position.array[i]),3)];
    const data=writeGeometry(privateWriter,mesh.geometry,mat,{extras,names});data.name=mesh.name;json.meshes.push(data);
    const node=json.nodes.length;json.nodes.push({name:mesh.name,mesh:id,...(skin?{skin:0}:{}),extras:{sensitive:true,...extras}});
    json.scenes[json.scene || 0].nodes.push(node);
  }
  const native={version:1,family:config.id,lod,bodySha256:publicHash,space:'post-skin-body-local',junction,removedBodyTriangles:removed,referenceHeightCm:config.referenceHeightCm};
  // Bake the same measured/contact-supported rest surface shipped by the live
  // adapter, so a plain GLB viewer and the editable source start consistently.
  const previousCageGeometry=cage.geometry;cage.geometry=originalCage.clone();
  const primary=parts[0];primary.userData.nativeBinding=native;primary.nativeGuideSource=cage;
  for(const child of parts.slice(1)){primary.add(child);if(/Pelvic/.test(child.name))child.userData.pelvicTransition=true;}
  const nativeRest=runtime.createNativeAnatomyDeformer(primary,body,cage);
  if(!nativeRest)throw new Error('Native rest surface could not be evaluated');
  nativeRest.apply({penis:{resting:{shape:{foreskinCoverage:100,foreskinRetraction:0}}}});
  for(const part of parts)covered.set(part.name,part.geometry.attributes.position.array.slice());
  const restEvidence=nativeRest.apply(neutralPrivate);
  if(parts.some(part=>!part.geometry.attributes.position.array.every(Number.isFinite)))throw new Error('Non-finite standalone surface');
  if(restEvidence.fit.status!=='within-tolerance'||restEvidence.contact.unresolved)throw new Error('Standalone neutral contact/fit failed');
  binding.standaloneRest={fit:restEvidence.fit,contact:restEvidence.contact};binding.tissueMaps=tissueMaps;
  nativeRest.dispose();cage.geometry.dispose();cage.geometry=previousCageGeometry;
  for(const part of parts)append(part,material,{sensitive:true,nativeBinding:native,...(/Pelvic/.test(part.name)?{pelvicTransition:true,nativeJunction:part.userData.nativeJunction}:{}),anatomySex:'male'},true);
  // Preserve the original neutral scaffold and shape channels for the existing
  // centimetre/state solver, independently of the native rendered topology.
  const driver=clonePart(cage);driver.geometry=originalCage;driver.name='GrowthTrackPrivateControlCage';
  covered.delete(driver.name);append(driver,transparent,{...cage.userData,sensitive:true,controlCage:true},true);
  pruneMaterials(json);json.asset.generator='GrowthTrack R2 native tissue candidate';
  json.asset.extras={humanFamily:config.id,lod,status:'candidate',bodySha256:publicHash,privatePackage:true};
  const privateNormalized=normalizeGlbFormat(glbFromBytes(privateWriter.pack()));
  const privateGlb=glbFromBytes(privateNormalized.bytes);
  if(!privateGlb.json.images.length)delete privateGlb.json.images;
  if(!privateGlb.json.textures.length)delete privateGlb.json.textures;
  if(!privateGlb.json.samplers?.length)delete privateGlb.json.samplers;
  const privateRaw=(await import('./human-realism/glb-family.mjs')).packGlb(privateGlb.json,privateGlb.bin);
  const compressedPrivate=await compressGlb(privateGlb),privateName=config.assets[lod==='core'?'privateCore':'privateHero'],privatePath='public/assets/models/'+privateName;
  fs.writeFileSync(privatePath,compressedPrivate.bytes);fs.writeFileSync(path.join(work,lod+'-private-authoring.glb'),privateRaw);
  // Blender 5.1's importer mixes scalar/vector custom attribute dimensions.
  // Preserve the complete binding GLB above and provide an exact-geometry DCC
  // copy without those custom streams. The build recipe rebinds edited meshes.
  const dcc=glbFromBytes(privateRaw);
  for(const m of dcc.json.meshes)for(const p of m.primitives)for(const key of Object.keys(p.attributes))if(key.startsWith('_'))delete p.attributes[key];
  fs.writeFileSync(path.join(work,lod+'-private-dcc.glb'),(await import('./human-realism/glb-family.mjs')).packGlb(dcc.json,dcc.bin));
  addProvenance(privatePath,compressedPrivate.bytes,sourceEntry,'R2 native tissue surfaces, state shapes and per-LOD triangle-frame bindings');
  runtimeManifest.assets[lod]={file:publicName,sha256:publicHash,bytes:compressed.bytes.length,privateFile:privateName,privateSha256:sha256(compressedPrivate.bytes),privateBytes:compressedPrivate.bytes.length,anatomySex:'male'};
  const report={lod,source:input,sourceSha256:sourceEntry.sha256,sculpt,refinement,public:{file:publicPath,sha256:publicHash,bytes:compressed.bytes.length,decodedBytes:compressed.decodedBytes,maximumCompressionErrorMetres:compressed.maximumPositionErrorMetres,meshes:meshStatistics(publicGlb)},private:{file:privatePath,sha256:sha256(compressedPrivate.bytes),bytes:compressedPrivate.bytes.length,maximumCompressionErrorMetres:compressedPrivate.maximumPositionErrorMetres,renderTriangles:parts.reduce((s,m)=>s+m.geometry.index.count/3,0),removedBodyTriangles:removed.length,binding,simplification},budgets:{publicBytes:compressed.bytes.length<=config.budgets[lod+'Bytes'],privateBytes:compressedPrivate.bytes.length<=config.budgets[lod==='core'?'privateCoreBytes':'privateHeroBytes'],privateTriangles:parts.reduce((s,m)=>s+m.geometry.index.count/3,0)<=(lod==='core'?8000:20000)},acceptance:config.acceptance};
  report.groom=groom.report;reports.push(report);console.log(JSON.stringify(report));
  cageNeutral.dispose();
}
for(const [file,hash] of Object.entries(retained))if(sha256(fs.readFileSync(file))!==hash)throw new Error('Retained asset changed: '+file);
provenance.updated='2026-10-23';fs.writeFileSync(provenanceFile,JSON.stringify(provenance,null,2)+'\n');
fs.writeFileSync('src/config/humanAssetManifest.json',JSON.stringify(runtimeManifest,null,2)+'\n');
fs.writeFileSync(path.join(recordDir,'asset-build.json'),JSON.stringify({family:config.id,retainedAssets:retained,assets:reports},null,2)+'\n');
console.log(JSON.stringify({combined:await buildCombinedAsset(work,path.join(root,'artifacts/human-r2'))}));
if(process.argv.includes('--source')){
  const result=spawnSync(blender,['--background','--factory-startup','--python-exit-code','1','--python','scripts/human-realism/blender-source.py','--',work,path.join(root,'artifacts/human-r2')],{stdio:'inherit',windowsHide:true});
  if(result.status!==0)throw new Error('Blender source/round-trip failed: '+result.status);
  const complete=spawnSync(blender,['--background','--factory-startup','--python-exit-code','1','--python','scripts/human-realism/complete-source.py','--',path.join(root,'artifacts/human-r2')],{stdio:'inherit',windowsHide:true});
  if(complete.status!==0)throw new Error('Complete editable source failed: '+complete.status);
}

// Additive preview asset build: keeps every existing GLB intact.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'vite';
import {Color} from 'three';
import {readGlb} from './plan-preview/glb.mjs';
import {appender,sceneFromGlb} from './human75/glb-tools.mjs';
import {sourceRig} from './human75/source-rig.mjs';
import {extendRig,morphRigMetadata} from './human75/rig.mjs';
import {surfaceAttributes} from './human75/attributes.mjs';
import {generateMicro} from './human75/micro.mjs';
import {eyeParts,nailPart} from './human75/parts.mjs';
import {glbFromBytes,normalizeGlbFormat} from './gltf-format.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),config=JSON.parse(fs.readFileSync(path.join(root,'src/config/humanSurface.json'))),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifestPath=path.join(root,'public/assets/models/ASSET-PROVENANCE.json'),manifest=JSON.parse(fs.readFileSync(manifestPath));
const source=sourceRig(root,config),micro=generateMicro(config.micro),reports=[];
await build({configFile:false,logLevel:'warn',build:{outDir:'.tmp/human75-tools',lib:{entry:'scripts/human75/runtime-entry.js',formats:['es'],fileName:()=> 'runtime.mjs'},rolldownOptions:{external:['three']},minify:false}});
const runtime=await import(pathToFileURL(path.join(root,'.tmp/human75-tools/runtime.mjs')));
for(const [kind,inputName] of [['production','humanoid-adult-v2.glb'],['lite','humanoid-adult-v2-lite.glb']]){
  const relative=`public/assets/models/${inputName}`,entry=manifest.assets.find(a=>a.path===relative),bytes=fs.readFileSync(path.join(root,relative));
  if(hash(bytes)!==entry.sha256)throw new Error(`Unreviewed source: ${relative}`);
  const glb=readGlb(path.join(root,relative)),scene=sceneFromGlb(glb),{body,skeleton,features}=scene;
  runtime.scopeFacialMorphs(body);runtime.fitModelFeatures(body,features);runtime.prepareBodyPoseBinding(body);runtime.prepareHeadPoseBinding(body);
  const extended=extendRig(scene,source.joints,config);if(extended.bound<500)throw new Error('Digit rig did not bind enough real skin vertices');
  const attributes=surfaceAttributes(body,config),metadata=morphRigMetadata(body,skeleton,config);
  const lids=runtime.prepareEyelidCorrective(body,features);if(!lids)throw new Error('Eye aperture landmarks were not found');
  const eyes=features.find(f=>f.feature==='eyes').mesh,parts=[nailPart(body,extended.groups,config.nails),...eyeParts(eyes,body,lids,config)];
  const writer=appender(glb),json=writer.json,bodyData=json.meshes.find(m=>m.name==='GrowthTrackBody'),primitive=bodyData.primitives[0];
  primitive.attributes.JOINTS_0=writer.accessor(body.geometry.attributes.skinIndex.array,4);
  primitive.attributes.WEIGHTS_0=writer.accessor(body.geometry.attributes.skinWeight.array,4);
  primitive.attributes.TANGENT=writer.accessor(attributes.tangent,4);
  primitive.attributes._REGION=writer.accessor(attributes.region,1);primitive.attributes._TILE=writer.accessor(attributes.tile,1);primitive.attributes._MICROSCALE=writer.accessor(attributes.scale,1);
  const nodeIds=new Map(scene.nodes.map((node,i)=>[node,i]));
  for(const bone of skeleton.bones)if(!nodeIds.has(bone)){nodeIds.set(bone,json.nodes.length);json.nodes.push({});}
  for(const bone of skeleton.bones){const node=json.nodes[nodeIds.get(bone)];Object.assign(node,{name:bone.name,translation:bone.position.toArray(),extras:{...(node.extras || {}),...bone.userData}});
    node.children=bone.children.map(child=>nodeIds.get(child)).filter(id=>id!=null);}
  const skin=json.skins[0];skin.joints=skeleton.bones.map(bone=>nodeIds.get(bone));
  skin.inverseBindMatrices=writer.accessor(Float32Array.from(skeleton.boneInverses.flatMap(matrix=>matrix.toArray())),16);
  const growthtrack={previewVersion:75,bindingPrepared:true,rig:{version:3,restPose:'A',units:'m',method:'CC0 helper joints; generated preview weights; artist calibration pending'},regions:attributes.names,...metadata,
    micro:{tileMetres:config.micro.tileMetres,heightMetres:config.micro.heightMetres,source:'seeded periodic pores',seed:config.micro.seed},
    articulation:{fingerJoints:30,toeJoints:12,nails:20,boundDigitVertices:extended.bound},
    source:{asset:relative,sha256:entry.sha256,landmarks:source.inputs}};
  bodyData.extras={...bodyData.extras,growthtrack,headPoseBinding:body.userData.headPoseBinding,bodyPoseBinding:body.userData.bodyPoseBinding};
  for(const [name,data] of [['MicroSkinHeight',micro.height],['MicroSkinNormal',micro.normal]])json.images.push({name,mimeType:'image/png',bufferView:writer.view(data)});
  for(const part of parts){
    const colors=part.name==='GrowthTrackNails'?config.nails:part.name==='GrowthTrackTearline'?config.tearline:config.cornea;
    const material=json.materials.length;
    // JSON swatches are sRGB; glTF baseColorFactor is linear, matching the
    // runtime material's Color conversion rather than brightening DCC imports.
    const rgb=new Color(colors.color || '#ffffff').toArray();
    json.materials.push({name:part.name+'Material',pbrMetallicRoughness:{baseColorFactor:[...rgb,part.name==='GrowthTrackCornea'?config.cornea.opacity:1],roughnessFactor:colors.roughness,metallicFactor:0},doubleSided:true,
      ...(part.name==='GrowthTrackCornea'?{alphaMode:'BLEND',extensions:{KHR_materials_ior:{ior:config.cornea.ior},KHR_materials_clearcoat:{clearcoatFactor:1,clearcoatRoughnessFactor:config.cornea.roughness}}}:{})});
    const g=part.geometry,p={attributes:{POSITION:writer.accessor(g.attributes.position.array,3),NORMAL:writer.accessor(g.attributes.normal.array,3)},indices:writer.accessor(Uint32Array.from(g.index.array),1),material};
    if(part.skinIds){p.attributes.JOINTS_0=writer.accessor(part.skinIds,4);p.attributes.WEIGHTS_0=writer.accessor(part.skinWeights,4);}
    const activeMorphs=part.morphs.flatMap((delta,i)=>delta.some(value=>value!==0)?[{name:bodyData.extras.targetNames[i],delta}]:[]);
    if(activeMorphs.length)p.targets=activeMorphs.map(({delta})=>({POSITION:writer.accessor(delta,3,{sparse:true})}));
    const mesh=json.meshes.length;json.meshes.push({name:part.name,primitives:[p],weights:activeMorphs.map(()=>0),extras:{targetNames:activeMorphs.map(m=>m.name),surfacePart:true,...(part.reports?{nails:part.reports}:{} )}});
    const node=json.nodes.length,parent=part.parent?scene.nodes.indexOf(part.parent.parent):scene.nodes.indexOf(extended.frame);
    const template=part.parent?json.nodes[scene.nodes.indexOf(part.parent)]:null;
    // The eyes use an inverse-head matrix to keep their source geometry in
    // model coordinates. Copy that complete transform for their cornea cap;
    // copying only TRS leaves it translated by the head pivot a second time.
    const transform=template?.matrix?{matrix:template.matrix}:{...(template?.translation?{translation:template.translation}:{}),...(template?.scale?{scale:template.scale}:{}),...(template?.rotation?{rotation:template.rotation}:{})};
    json.nodes.push({name:part.name,mesh,...(part.skinIds?{skin:0}:{}),...transform,extras:{surfacePart:true}});
    if(parent>=0){json.nodes[parent].children ||= [];json.nodes[parent].children.push(node);}else json.scenes[json.scene || 0].nodes.push(node);
  }
  json.extensionsUsed=[...new Set([...(json.extensionsUsed || []),'KHR_materials_ior','KHR_materials_clearcoat'])];
  json.asset.generator='GrowthTrack additive preview 75 builder';json.asset.extras={...json.asset.extras,preview75:{version:1,source:relative,sourceSha256:entry.sha256,generatedFrom:'src/config/humanSurface.json'}};
  const output=normalizeGlbFormat(glbFromBytes(writer.pack())).bytes,outputRelative=`public/assets/models/${config.assets[kind]}`;fs.writeFileSync(path.join(root,outputRelative),output);
  const sourceComponents=entry.components || manifest.assets.find(a=>a.path===entry.sameComponentsAs)?.components;
  const provenance={path:outputRelative,sha256:hash(output),sourceAsset:relative,sourceSha256:entry.sha256,builtBy:'node scripts/build-human-75.mjs',components:[...sourceComponents,
    {name:'Articulated preview rig, measured morph offsets, surface attributes, eye shells, tear lines, nails and micro tiles',source:'scripts/human75/ and src/config/humanSurface.json; pinned MakeHuman CC0 helper landmarks',licence:'Project-authored derived from the CC0 body and helper landmark data',modified:true,status:'project',note:'Preview weights and geometric estimates; not anatomical calibration or full v3 conformance.'}]};
  const at=manifest.assets.findIndex(a=>a.path===outputRelative);if(at<0)manifest.assets.push(provenance);else manifest.assets[at]=provenance;
  const report={asset:outputRelative,sha256:provenance.sha256,bytes:output.length,joints:skeleton.bones.length,addedJoints:extended.added,boundDigitVertices:extended.bound,nails:parts[0].reports,parts:parts.map(p=>({name:p.name,vertices:p.geometry.attributes.position.count,triangles:p.geometry.index.count/3})),jointOffsetMorphs:Object.values(metadata.jointOffsets).filter(v=>Object.keys(v).length).length};
  reports.push(report);console.log(JSON.stringify(report));
}
fs.writeFileSync(path.join(root,'public',config.micro.heightPath),micro.height);fs.writeFileSync(path.join(root,'public',config.micro.normalPath),micro.normal);
for(const [name,data] of [[config.micro.heightPath,micro.height],[config.micro.normalPath,micro.normal]]){
  const relative='public/'+name,entry={path:relative,sha256:hash(data),builtBy:'node scripts/build-human-75.mjs',components:[{name:'Seeded seamless skin pore tile',source:'scripts/human75/micro.mjs and src/config/humanSurface.json',licence:'Project-authored',status:'project'}]};
  const i=manifest.assets.findIndex(a=>a.path===relative);if(i<0)manifest.assets.push(entry);else manifest.assets[i]=entry;
}
manifest.updated='2026-10-22';fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
fs.mkdirSync(path.join(root,'docs/real-human-3d/data/milestone-75'),{recursive:true});fs.writeFileSync(path.join(root,'docs/real-human-3d/data/milestone-75/asset-build.json'),JSON.stringify({version:1,sourceInputs:source.inputs,assets:reports},null,2)+'\n');

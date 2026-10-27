import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {attachNativeAnatomy} from '../../src/components/morphEngine/useNativeAnatomy';
import {resolveRigBones} from '../../src/components/morphEngine/boneMap';
import {applyJointPose} from '../../src/components/morphEngine/poseRuntime';
import {createMorphRig} from '../../src/components/morphEngine/morphRig';
import {createPhysicalSkinMaterial,updatePhysicalSkinMaterial} from '../../src/components/body3d/physicalSkinMaterial';
import {prepareSkinRegions} from '../../src/components/body3d/skinAppearance';
import {applyAnatomySurface,updateAnatomySurface} from '../../src/components/morphEngine/anatomySurface';
import {createAnatomyGuides} from '../../src/components/morphEngine/anatomyGuides';

const $=id=>document.getElementById(id),data=JSON.parse($('embedded-models').textContent);
const bytes=text=>Uint8Array.from(atob(text),character=>character.charCodeAt(0)).buffer;
const renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
const scene=new THREE.Scene();scene.background=new THREE.Color('#e6e5e0');
scene.add(new THREE.HemisphereLight('#ffffff','#8b8379',1.1));
for(const [position,intensity] of [[[2,3,3],2.1],[[-2,1.5,1],1.2],[[0,2,-2],1]]){
  const light=new THREE.DirectionalLight('#fff8ef',intensity);light.position.fromArray(position);scene.add(light);
  if(scene.children.filter(n=>n.isDirectionalLight).length===1){light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-1.8,right:1.8,top:2.3,bottom:-1,near:.1,far:10});light.shadow.normalBias=.003;}
}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#d5d4cd',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.002;ground.receiveShadow=true;scene.add(ground);
const camera=new THREE.PerspectiveCamera(32,1,.005,100),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotateSpeed=.8;controls.minDistance=.12;controls.maxDistance=8;controls.listenToKeyEvents(renderer.domElement);
const resize=()=>{const rect=renderer.domElement.parentElement.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(renderer.domElement.parentElement);resize();
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),clock=new THREE.Clock(),breathTime={value:0};
let root,body,attachment,bones,morphRig,bodyMaterial,privateMaterial,publicMeshes=[],guides=null,rawBounds,normalScale=1,lod='core',ready=false,playing=false,anatomy=true,showGuides=false,pose='neutral',height=175,evidence,frames=0,frameTimes=[],previousFrame=0;
let currentState='resting';
const profile={penis:{resting:{measurements:{lengthCm:9.16,midCircumferenceCm:9.31},shape:{foreskinCoverage:100,foreskinRetraction:100}},erect:{measurements:{lengthCm:13.2,midCircumferenceCm:11.6},shape:{foreskinCoverage:100,foreskinRetraction:100}}},scrotum:{envelope:{},presentation:'relaxed'}};
$('length').step='.01';$('girth').step='.01';
const sectionLabel=document.createElement('label');sectionLabel.innerHTML='<span>Middle section</span><select id="section-mode"><option value="circumference">Perimeter</option><option value="dimensions">Width × depth</option></select>';
const dimensions=document.createElement('div');dimensions.className='pair';dimensions.innerHTML='<label>Width (cm)<input id="width" type="number" min=".5" max="8" step=".01" placeholder="Optional"></label><label>Depth (cm)<input id="depth" type="number" min=".5" max="8" step=".01" placeholder="Optional"></label>';
const middlePair=$('length').closest('.pair');middlePair.before(sectionLabel);middlePair.after(dimensions);
const orientation=document.createElement('div');orientation.innerHTML='<label>Bend direction<select id="bend-direction"><option value="0">Sideways</option><option value="90">Upward</option><option value="-90">Downward</option></select></label><label>Elevation (degrees)<input id="elevation" type="number" min="-85" max="85" step="1" placeholder="Generic"></label>';$('curvature').closest('label').after(orientation);
// Nested selects and live outputs otherwise become part of the label text.
// Keep the accessible name equal to the visible field heading as values change.
for(const control of document.querySelectorAll('aside input,aside select')){
  const label=control.labels?.[0],heading=label?.querySelector('span') || label;
  const name=heading?.firstChild?.textContent?.trim();if(name)control.setAttribute('aria-label',name);
}
function syncSection(){const dimensions=$('section-mode').value==='dimensions';$('girth').disabled=dimensions;$('width').disabled=!dimensions;$('depth').disabled=!dimensions;}
const poses={neutral:{},seated:{leftThigh:[75,0,0],rightThigh:[75,0,0],leftShin:[-75,0,0],rightShin:[-75,0,0]},crouch:{leftThigh:[65,0,15],rightThigh:[65,0,-15],leftShin:[-95,0,0],rightShin:[-95,0,0]},wide:{leftThigh:[0,0,30],rightThigh:[0,0,-30]},stride:{leftThigh:[65,0,0],rightThigh:[-45,0,0]}};
const skinColour=()=>new THREE.Color($('colour').value).multiplyScalar(1-Number($('tan').value)/100*.32).getHexString();
function updateWorld(){root.updateMatrixWorld(true);body.skeleton.update();}
function updateReadout(){
  evidence=attachment.deformer.getEvidence();const s=evidence.rendered;
  $('fit').textContent=s?.status==='measured'?`Surface length ${s.centrelineCm.toFixed(2)} cm\nMiddle ${s.midWidthCm.toFixed(2)} × ${s.midDepthCm.toFixed(2)} cm · perimeter ${s.midCircumferenceCm.toFixed(2)} cm\nSac ${s.scrotum.widthCm.toFixed(2)} × ${s.scrotum.heightCm.toFixed(2)} × ${s.scrotum.depthCm.toFixed(2)} cm\nFit: ${evidence.fit.status}\nContact adjustment: ${evidence.contact.shaftLiftDegrees.toFixed(1)}°`:'This configuration has an unmeasurable section.';
  $('fit').classList.toggle('warning',evidence.fit.status!=='within-tolerance'||evidence.contact.unresolved);
}
function resetGuides(){if(guides){guides.removeFromParent();guides.userData.dispose();guides=null;}if(showGuides&&anatomy){guides=createAnatomyGuides(attachment.mesh,evidence);body.parent.add(guides);}}
function apply(){
  if(!ready)return;
  root.scale.set(normalScale,normalScale*height/175,normalScale);root.position.y=-rawBounds.min.y*normalScale*height/175;updateWorld();
  const colour='#'+skinColour();for(const material of [bodyMaterial,privateMaterial])updatePhysicalSkinMaterial(material,{skinColorHex:colour});
  const amount=Number($('regional-tan').value);profile.skinRegions=Object.fromEntries(['groin','shaft','glans','scrotum'].map(name=>[name,{tanIntensity:amount}]));
  evidence=attachment.deformer.apply(profile,{state:currentState,heightScale:height/175,baseColor:privateMaterial.uniforms.uBaseColor.value});
  updateAnatomySurface(privateMaterial,evidence);attachment.mesh.visible=anatomy;updateReadout();resetGuides();renderer.shadowMap.needsUpdate=true;
}
function setPose(name){pose=name;applyJointPose(bones,{joints:poses[name]||{},targets:{},digits:{}});updateWorld();attachment.deformer.updateDetails();guides?.userData.update();updateReadout();renderer.shadowMap.needsUpdate=true;}
function focus(region){
  updateWorld();let target=new THREE.Vector3(0,height/200,0),distance=height/175*3.3;
  if(region==='anatomy'){const box=new THREE.Box3().setFromObject(attachment.mesh);target=box.getCenter(target);distance=Math.max(.28,box.getSize(new THREE.Vector3()).length()*2.4);}
  if(region==='face'){const head=bones.head?.bone;target=head?head.getWorldPosition(target):new THREE.Vector3(0,height/100*.9,0);distance=.55;}
  controls.target.copy(target);camera.position.copy(target).add(new THREE.Vector3(.5,.08,1).normalize().multiplyScalar(distance*Math.max(1,.85/camera.aspect)));controls.update();
}
function release(){
  if(!root)return;if(guides){guides.removeFromParent();guides.userData.dispose();guides=null;}attachment?.dispose();
  const materials=new Set(),textures=new Set();root.traverse(node=>{if(node.isMesh){node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);}});
  for(const material of materials){for(const value of Object.values(material))if(value?.isTexture)textures.add(value);material.dispose();}for(const texture of textures){texture.dispose();texture.source?.data?.close?.();}
  bodyMaterial?.dispose();privateMaterial?.dispose();root.removeFromParent();
}
async function load(next){
  ready=false;window.liveHuman.ready=false;$('loading').hidden=false;for(const control of document.querySelectorAll('aside button,aside input,aside select'))control.disabled=true;release();lod=next;
  const asset=data.assets[lod],publicGltf=await loader.parseAsync(bytes(asset.publicBytes),'');root=publicGltf.scene;scene.add(root);
  publicMeshes=[];root.traverse(node=>{if(node.isMesh){publicMeshes.push(node);node.castShadow=true;if(node.name==='Body'||node.name==='GrowthTrackBody')body=node;}});
  if(!body)throw new Error('The body mesh is missing');
  rawBounds=new THREE.Box3().setFromBufferAttribute(body.geometry.attributes.position);normalScale=1.75/(rawBounds.max.y-rawBounds.min.y);
  prepareSkinRegions(body);attachment=attachNativeAnatomy(await loader.parseAsync(bytes(asset.privateBytes),''),body,{...asset,lod});attachment.mesh.traverse(node=>{if(node.isMesh&&!node.userData.controlCage)node.castShadow=true;});
  bodyMaterial=createPhysicalSkinMaterial(2,body.material,{surfaceDetail:true});privateMaterial=applyAnatomySurface(createPhysicalSkinMaterial(2,attachment.mesh.nativeSourceMaterial,{surfaceDetail:true}));body.material=bodyMaterial;attachment.mesh.material=privateMaterial;
  const compile=bodyMaterial.onBeforeCompile,key=bodyMaterial.customProgramCacheKey();bodyMaterial.onBeforeCompile=shader=>{compile.call(bodyMaterial,shader);shader.uniforms.uLiveBreath=breathTime;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uLiveBreath;').replace('#include <begin_vertex>',`#include <begin_vertex>\nfloat chest=(position.y-(${rawBounds.min.y.toFixed(7)}))/${(rawBounds.max.y-rawBounds.min.y).toFixed(7)};transformed+=normal*.0008*sin(uLiveBreath*1.3)*smoothstep(.57,.68,chest)*(1.0-smoothstep(.80,.90,chest));`);};bodyMaterial.customProgramCacheKey=()=>key+'-live-breath-v1';
  bones=Object.fromEntries(Object.entries(resolveRigBones(body.skeleton)).filter(([,bone])=>bone).map(([name,bone])=>[name,{bone,rest:bone.quaternion.clone(),restScale:bone.scale.clone()}]));morphRig=createMorphRig(body);
  ready=true;window.liveHuman.ready=true;apply();setBuild(Number($('build').value)/100);setPose(pose);focus('body');$('loading').hidden=true;for(const control of document.querySelectorAll('aside button,aside input,aside select'))control.disabled=false;syncSection();$('status').textContent='Drag to orbit · scroll to zoom\nLive rig, blinking and subtle breathing. All model data is embedded.';
}
function setBuild(value){for(const mesh of [...publicMeshes,attachment.cage]){const id=mesh.morphTargetDictionary?.overall_mass;if(id!=null)mesh.morphTargetInfluences[id]=value;}morphRig();apply();}
function syncState(){const endpoint=profile.penis[currentState];$('length').value=endpoint.measurements.lengthCm;$('girth').value=endpoint.measurements.midCircumferenceCm;$('section-mode').value=endpoint.inputMode||'circumference';$('width').value=endpoint.measurements.widthCm??'';$('depth').value=endpoint.measurements.depthCm??'';$('elevation').value=endpoint.shape.elevationDeg??'';$('bend-direction').value=endpoint.shape.curvatureDirectionDeg||0;for(const [id,key] of [['coverage','foreskinCoverage'],['retraction','foreskinRetraction'],['curvature','curvature']])$(id).value=endpoint.shape[key]||0;syncSection();}
$('quality').onchange=()=>load($('quality').value).catch(fail);$('pose').onchange=()=>{playing=false;$('play').setAttribute('aria-pressed','false');setPose($('pose').value);};
for(const button of document.querySelectorAll('[data-focus]'))button.onclick=()=>focus(button.dataset.focus);
$('rotate').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('rotate').setAttribute('aria-pressed',String(controls.autoRotate));};$('play').onclick=()=>{playing=!playing;$('play').setAttribute('aria-pressed',String(playing));if(!playing)setPose(pose);};
$('height').onchange=()=>{height=Number($('height').value);$('height-value').value=height+' cm';apply();focus('body');};$('build').onchange=()=>setBuild(Number($('build').value)/100);
for(const id of ['colour','tan','regional-tan'])$(id).onchange=apply;
$('anatomy').onclick=()=>{anatomy=!anatomy;$('anatomy').setAttribute('aria-pressed',String(anatomy));$('anatomy').textContent=anatomy?'Anatomy visible':'Anatomy hidden';apply();};$('guides').onclick=()=>{showGuides=!showGuides;$('guides').setAttribute('aria-pressed',String(showGuides));resetGuides();};
$('state').onchange=()=>{currentState=$('state').value;syncState();apply();};
for(const [id,key] of [['length','lengthCm'],['girth','midCircumferenceCm']])$(id).onchange=()=>{const value=Number($(id).value);if(value>0){profile.penis[currentState].measurements[key]=value;apply();}};
for(const [id,key] of [['width','widthCm'],['depth','depthCm']])$(id).onchange=()=>{if($(id).value==='')delete profile.penis[currentState].measurements[key];else if(Number($(id).value)>0)profile.penis[currentState].measurements[key]=Number($(id).value);apply();};
$('section-mode').onchange=()=>{profile.penis[currentState].inputMode=$('section-mode').value;syncSection();apply();};
$('elevation').onchange=()=>{if($('elevation').value==='')delete profile.penis[currentState].shape.elevationDeg;else profile.penis[currentState].shape.elevationDeg=Number($('elevation').value);apply();};$('bend-direction').onchange=()=>{profile.penis[currentState].shape.curvatureDirectionDeg=Number($('bend-direction').value);apply();};
for(const [id,key] of [['coverage','foreskinCoverage'],['retraction','foreskinRetraction'],['curvature','curvature']])$(id).onchange=()=>{profile.penis[currentState].shape[key]=Number($(id).value);apply();};
$('presentation').onchange=()=>{profile.scrotum.presentation=$('presentation').value;apply();};
for(const [id,key] of [['sac-width','widthCm'],['sac-height','heightCm'],['sac-depth','depthCm'],['sac-hang','hangCm']])$(id).onchange=()=>{if($(id).value==='')delete profile.scrotum.envelope[key];else if(Number($(id).value)>0)profile.scrotum.envelope[key]=Number($(id).value);apply();};
function fail(error){$('loading').hidden=false;$('loading').textContent='The 3D viewer could not start: '+error.message;$('status').textContent=error.message;console.error(error);}
let lastPoseFrame=0,lastReadout=0;
function animate(now){
  requestAnimationFrame(animate);const delta=clock.getDelta(),time=clock.elapsedTime;breathTime.value=time;
  if(ready){
    const blinkPhase=time%5.3,blink=blinkPhase<.18?Math.sin(blinkPhase/.18*Math.PI):0;
    for(const mesh of publicMeshes){const id=mesh.morphTargetDictionary?.blink;if(id!=null)mesh.morphTargetInfluences[id]=blink;}
    if(playing && now-lastPoseFrame>33){const wave=Math.sin(time*2.4),hip=wave*28;applyJointPose(bones,{joints:{leftThigh:[hip,0,0],rightThigh:[-hip,0,0],leftShin:[-Math.max(0,wave)*40,0,0],rightShin:[-Math.max(0,-wave)*40,0,0],leftUpperArm:[-hip*.45,0,0],rightUpperArm:[hip*.45,0,0]},targets:{},digits:{}});updateWorld();attachment.deformer.updateDetails();guides?.userData.update();renderer.shadowMap.needsUpdate=true;lastPoseFrame=now;}
    if(now-lastReadout>350){updateReadout();lastReadout=now;}
    controls.update(delta);renderer.render(scene,camera);frames++;if(previousFrame){frameTimes.push(now-previousFrame);if(frameTimes.length>180)frameTimes.shift();}previousFrame=now;
  }
}
window.liveHuman={ready:false,load,setPose,focus,apply,startTiming(){frameTimes=[];previousFrame=0;},inspect(){return {lod,height,state:currentState,anatomy,playing,limb:bones?.leftThigh?.bone.quaternion.toArray(),evidence:attachment?.deformer.getEvidence(),frames,frameTimes:frameTimes.slice(),renderer:renderer.getContext().getParameter(renderer.getContext().getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL || renderer.getContext().RENDERER),memory:renderer.info.memory,native:attachment?.mesh.userData.nativeRuntime};}};
requestAnimationFrame(animate);load('core').catch(fail);

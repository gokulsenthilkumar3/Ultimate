import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useThree,useFrame} from '@react-three/fiber';
import {BufferGeometry,Float32BufferAttribute,Vector3,Triangle} from 'three';
import {MeshBVH} from 'three-mesh-bvh';
import ChamberCanvas from '../../src/components/ChamberCanvas';
import use3DStore from '../../src/store/use3DStore';
import useStore from '../../src/store/useStore';
import {CLOTHING_OPTIONS,wardrobeDefaults} from '../../src/lib/wardrobePreferences';
import {REVIEW_CASES as queues,REVIEW_REVISION,reviewFileId} from './caseCatalog.mjs';
import {wardrobePieces} from '../../src/lib/wardrobeInventory';
import {preloadWardrobeAsset} from '../../src/components/morphEngine/useWardrobeAsset';
import {inspectAvatarSurfaces} from '../../src/components/morphEngine/captureRuntime';

const reference={height:175,weight:74,bodyFat:19,waist:82,chest:99,hips:96,shoulders:112,arms:33,neck:37,thighs:56,calves:38,modelPreset:'male',biologicalSex:'male'};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function Probe({sceneRef}) {
  const state=useThree();
  useFrame(({gl})=>{gl.domElement.dataset.reviewFrames=String(Number(gl.domElement.dataset.reviewFrames || 0)+1);});
  useEffect(()=>{sceneRef.current=state;return()=>{sceneRef.current=null;};},[state,sceneRef]);
  return null;
}
function posedGeometry(mesh) {
  mesh.updateWorldMatrix(true,false);const values=new Float32Array(mesh.geometry.attributes.position.count*3),p=new Vector3();
  for(let i=0;i<values.length/3;i++)mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld).toArray(values,i*3);
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(values,3));geometry.setIndex(mesh.geometry.index.clone());return geometry;
}
function isVisible(garment,id) {
  const g=garment.geometry,u=garment.material.userData.uniforms,p=g.attributes.garmentCoordinates,c=g.attributes.garmentCoverage;
  if(!u || !p || !c)return true;
  const y=p.getY(id),x=Math.abs(p.getX(id)),lower=c.getX(id)>.2 && y>=u.uLowerBand.value.x && y<=u.uLowerBand.value.y && !(u.uBriefStyle.value>.5 && y<.90+x*.55);
  let top=y>=u.uTorsoBand.value.x && y<=u.uTorsoBand.value.y && c.getY(id)>.2 && c.getZ(id)<.2 && c.getW(id)<.2;
  if(u.uTankStyle.value>.5)top=y>=u.uTorsoBand.value.x && y<=u.uTorsoBand.value.y && c.getY(id)>.2 && c.getW(id)<.2 && (y<=1.43 && x<u.uTorsoWidth.value || y>1.43 && x>.155 && x<.230);
  else if(garment.userData.garmentShell?.authored && CLOTHING_OPTIONS[garment.material.userData.wardrobePreset]?.top)top=c.getY(id)>.2;
  return lower || top || (u.uSleeves.value>.5 && c.getZ(id)>.2) || (u.uSleeves.value>1.5 && c.getW(id)>.2);
}
function inspect(state,item) {
  let body,garment;state.scene.traverse(node=>{if(/^(Body|GrowthTrackBody)$/.test(node.name) && node.isSkinnedMesh)body=node;if(node.name==='GrowthTrackCloth_A')garment=node;});
  if(!body || !garment)throw new Error('Body or clothing is missing');
  const b=posedGeometry(body),g=posedGeometry(garment),bvh=new MeshBVH(b),v=new Vector3(),tri=new Triangle(),normal=new Vector3();
  let sampled=0,penetrationCandidates=0,worstDepth=0;
  const stride=Math.max(1,Math.floor(g.attributes.position.count/400));
  for(let id=0;id<g.attributes.position.count;id+=stride) {
    if(!isVisible(garment,id))continue;
    v.fromBufferAttribute(g.attributes.position,id);const hit=bvh.closestPointToPoint(v);
    if(!hit)continue;
    const ids=[0,1,2].map(k=>b.index.getX(hit.faceIndex*3+k));
    tri.set(...ids.map(i=>new Vector3().fromBufferAttribute(b.attributes.position,i)));tri.getNormal(normal);
    const signed=v.clone().sub(hit.point).dot(normal);sampled++;
    if(signed<-.003){penetrationCandidates++;worstDepth=Math.max(worstDepth,-signed);}
  }
  const pieces=wardrobePieces(item.preset,item.variant);
  const evidence={...item,reviewRevision:REVIEW_REVISION,capturedAt:new Date().toISOString(),expectedPieceCount:pieces.length,pieces,appliedOptions:{...garment.material.userData.options},sampled,penetrationCandidates,worstDepthMm:Math.round(worstDepth*10000)/10,fitStatus:penetrationCandidates?'needs-visual-review':'no-sampled-penetration',
    meshCount:1,regions:CLOTHING_OPTIONS[item.preset].top?['top','bottom']:['bottom'],vertexCount:garment.geometry.attributes.position.count,source:garment.userData.garmentShell?.authored?'authored':'fallback',
    appliedColors:{top:'#'+garment.material.userData.uniforms.uTopColor.value.getHexString(),bottom:'#'+garment.material.userData.uniforms.uLowerColor.value.getHexString(),trim:'#'+garment.material.userData.uniforms.uTrimColor.value.getHexString()},
    surfaces:inspectAvatarSurfaces(state.gl.domElement)?.surfaces.map(s=>({name:s.name,vertices:s.vertices,material:s.material,modelAsset:s.modelAsset}))};
  b.dispose();g.dispose();return evidence;
}
export function Review() {
  const runtime=useRef(null),stopped=useRef(false),[model,setModel]=useState('current'),[running,setRunning]=useState(false),[progress,setProgress]=useState('Ready'),[results,setResults]=useState([]),[error,setError]=useState(''),[startAt,setStartAt]=useState(0);
  useEffect(()=>{
    useStore.setState({user:{id:'local-render-review',dob:'1990-01-01'},reducedMotion:true});
    const s=use3DStore.getState();s.setCurrentMetrics(reference);s.setAvatarWorkspace({qualityPreference:'balanced',lightingMode:'neutral',showStage:false,naturalMotion:false,inspectorOpen:true,inspectorSection:'pose',cameraMode:'ORBIT',backgroundMode:'color',backgroundColor:'#e8e7e3'});s.setAnimation('standing',{playing:false});s.fitCameraToBody();
  },[]);
  const apply=async item=> {
    const s=use3DStore.getState();
    s.setCurrentMetrics({...reference,modelVersion:model==='current'?'v2':'human-r2',avatarAsset:model==='current'?'humanoid-preview-75-lite.glb':undefined});
    const options={...wardrobeDefaults(item.preset),variant:item.variant,fit:item.fit,...(item.color?{topColor:item.color,bottomColor:item.color}:{}),...(item.options || {})};
    const initialFrame=Number(runtime.current?.gl.domElement.dataset.reviewFrames || 0);
    s.setWardrobePreferences({preset:item.preset,outfits:{...s.wardrobePreferences.outfits,[item.preset]:options}});s.setWardrobe(item.preset);s.setAnimation(item.pose,{playing:false,sampleTime:item.sampleTime || 0});s.setFocusedBodyPart(null);s.setCameraPreset(item.view || 'FRONT');
    await preloadWardrobeAsset(item.preset,options);
    const start=performance.now();
    while(performance.now()-start<45000) {
      const canvas=runtime.current?.gl.domElement;
      const bodySurface=canvas?inspectAvatarSurfaces(canvas)?.surfaces.find(surface=>surface.pose):null;
      const bodyEvidence=bodySurface?.pose;
      const correctModel=model==='current'?!bodySurface?.modelAsset?.includes('human-r2'):bodySurface?.modelAsset?.includes('human-r2');
      if(correctModel && Number(canvas?.dataset.reviewFrames || 0)>=initialFrame+3 && bodyEvidence?.animationId===item.pose && Math.abs(bodyEvidence.sampleTime-(item.sampleTime || 0))<.0001 && canvas?.dataset.modelReady==='true' && canvas.dataset.wardrobePreset===item.preset && canvas.dataset.wardrobeStyle===item.variant && canvas.dataset.renderLoop==='idle')return options;
      await sleep(80);
    }
    const latest=inspectAvatarSurfaces(runtime.current.gl.domElement)?.surfaces.find(surface=>surface.pose); throw new Error('Model or garment did not settle: '+item.id+' · '+JSON.stringify({model:latest?.modelAsset,pose:latest?.pose?.animationId,time:latest?.pose?.sampleTime,requested:item.sampleTime || 0}));
  };
  const capture=async item=> {
    await apply(item);
    const evidence=inspect(runtime.current,item);
    evidence.model=model;
    evidence.appliedPose=inspectAvatarSurfaces(runtime.current.gl.domElement)?.surfaces.find(surface=>surface.pose)?.pose;
    const response=await fetch('/__realism-review/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({evidence,image:runtime.current.gl.domElement.toDataURL('image/png')})});
    if(!response.ok)throw new Error('Could not save evidence');
    return evidence;
  };
  const run=async()=>{
    setRunning(true);setError('');stopped.current=false;const completed=[];
    try {for(const [index,item] of queues.entries()) {if(index<Number(startAt))continue;if(stopped.current)break;setProgress(`${index+1} / ${queues.length} · ${item.id}`);setStartAt(index);const row=await capture(item);completed.push(row);setResults([...completed]);}setProgress(`Completed ${completed.length} rendered cases`);}
    catch(cause){setError(cause.message);}finally{setRunning(false);}
  };
  return <><header><h1>Clothing, pose and human-model review</h1><p>Local isolated renderer · reference adult measurements · no account writes. Intersection candidates require visual inspection.</p></header>
    <div className="controls"><label>Model <select aria-label="Review model" value={model} disabled={running} onChange={e=>setModel(e.target.value)}><option value="current">Current articulated body</option><option value="human-r2">Human realism candidate</option></select></label><label>Start at case <input aria-label="Start at case" type="number" min="0" max={queues.length-1} value={startAt} disabled={running} onChange={e=>setStartAt(Number(e.target.value))}/></label><button disabled={running} onClick={run}>Run clothing and pose review</button><button disabled={!running} onClick={()=>stopped.current=true}>Stop after this case</button>
    <button disabled={running} onClick={async()=>{try{setError('');const e=await capture({id:'portrait-'+model,preset:'UNDERWEAR',variant:'boxerBriefs',fit:'regular',pose:'standing',view:'FRONT'});setResults(rows=>[...rows,e]);use3DStore.getState().setFocusedBodyPart('head');}catch(e){setError(e.message);}}}>Inspect model</button></div>
    <p role="status" id="review-progress">{progress}</p>{error && <p role="alert">{error}</p>}
    <main><div className="stage"><ChamberCanvas><Probe sceneRef={runtime}/></ChamberCanvas></div><aside><h2>Executed cases: {results.length}</h2><p>Queue: {queues.length} cases covers 12 styles, all 10 poses, 3 fits and 3 color samples. Finite samples do not certify every possible color or body measurement.</p><ol>{results.slice(-12).map((row,i)=><li key={row.id+i}>{row.id}: {row.penetrationCandidates} / {row.sampled} penetration candidates; {row.source}; {row.worstDepthMm} mm</li>)}</ol></aside></main>
    <section className="gallery">{results.slice(-24).map((row,i)=><figure key={row.id+i}><img loading="lazy" decoding="async" src={'/__realism-review/image/'+reviewFileId(row.model,row.id)+'.png'}/><figcaption>{row.id} · {row.fitStatus}</figcaption></figure>)}</section></>;
}
createRoot(document.getElementById('root')).render(<Review/>);

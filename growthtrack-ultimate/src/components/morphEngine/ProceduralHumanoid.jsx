/**
 * ProceduralHumanoid.jsx -- Ultra-High-Fidelity Parametric 3D Body v2.0
 * Full anatomical humanoid: eyes, eyelids, brows, nose, lips, ears,
 * jaw, chin, hair cards, nipples, navel, genitalia, detailed hands/feet.
 * All detail driven by morph weights from use3DStore.
 */

import React, { useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import use3DStore from "../../store/use3DStore";

// == Constants =================================================================
// Segment counts per quality tier — passed as `quality` prop
const SEGS_BY_QUALITY = {
  LOW:  { lathe: 12, head: 18 },
  MED:  { lathe: 18, head: 24 },
  HIGH: { lathe: 24, head: 36 },
};
const DEFAULT_SEGS = SEGS_BY_QUALITY.HIGH;

// == Fitzpatrick table =========================================================
const FITZPATRICK = {
  I:"#FFF0E0",II:"#F5D5B0",III:"#E8B88A",IV:"#C68642",V:"#8D5524",VI:"#4A2912"
};

// == Hair color presets ========================================================
const HAIR_COLOR_PRESETS = {
  black:"#110a05",darkbrown:"#2c1a0a",brown:"#6b3a1a",
  auburn:"#8b3a2a",blonde:"#c8a04a",grey:"#888880",white:"#d8d8d4"
};

// == Hair style configs ========================================================
const HAIR_CFG = {
  bald:  {count:0,  cardH:0    },
  buzz:  {count:24, cardH:0.020},
  short: {count:36, cardH:0.058},
  medium:{count:52, cardH:0.105},
  long:  {count:66, cardH:0.190},
};

// == Material factories ========================================================
function makeMat(mode,opacity,tone) {
  const skin = new THREE.Color(FITZPATRICK[tone]||FITZPATRICK.IV);
  if (mode==="ghost") return new THREE.MeshStandardMaterial({color:"#22D3EE",emissive:"#22D3EE",emissiveIntensity:0.35,roughness:0.1,metalness:0.2,transparent:true,opacity:Math.min(opacity,0.32),depthWrite:false,side:THREE.DoubleSide});
  if (mode==="xray")  return new THREE.MeshStandardMaterial({color:"#818CF8",roughness:0.05,metalness:0.8,transparent:true,opacity:0.4,depthWrite:false});
  if (mode==="delta") return new THREE.MeshStandardMaterial({color:"#F59E0B",emissive:"#7A4800",emissiveIntensity:0.12,roughness:0.55,metalness:0.1});
  const m = new THREE.MeshStandardMaterial({color:skin,roughness:0.70,metalness:0.0,emissive:skin.clone().multiplyScalar(0.10),emissiveIntensity:1.0});
  if (opacity<1){m.transparent=true;m.opacity=opacity;m.depthWrite=false;}
  return m;
}
const makeScleraMat = () => new THREE.MeshStandardMaterial({color:"#f5f4ee",roughness:0.12});
const makeIrisMat   = (hex) => new THREE.MeshStandardMaterial({color:hex,roughness:0.18,metalness:0.05,emissive:new THREE.Color(hex).multiplyScalar(0.07),emissiveIntensity:1});
const makePupilMat  = () => new THREE.MeshStandardMaterial({color:"#070707",roughness:0.05,metalness:0.22});
const makeLipMat    = (tone) => { const t={I:"#e8a0a0",II:"#d48080",III:"#c06868",IV:"#a04050",V:"#803040",VI:"#602030"}; return new THREE.MeshStandardMaterial({color:t[tone]||t.IV,roughness:0.52}); };
const makeNailMat   = () => new THREE.MeshStandardMaterial({color:"#e8d8c8",roughness:0.10,metalness:0.05,transparent:true,opacity:0.88});
const makeHairMat   = (hex) => new THREE.MeshStandardMaterial({color:hex,roughness:0.88,metalness:0.02,side:THREE.DoubleSide,alphaTest:0.38,transparent:true});

// == Geometry builders =========================================================
function bldLathe(pts,segs){
  const v=pts.map(p=>new THREE.Vector2(Math.max(0.001,p[0]),p[1]));
  const g=new THREE.LatheGeometry(v,segs??DEFAULT_SEGS.lathe); g.computeVertexNormals(); return g;
}
function bldTorso({shoulderW,chestW,waistW,bellyW,hipW,h}){
  return bldLathe([[hipW*.80,0],[hipW,h*.06],[hipW*.95,h*.14],[bellyW,h*.26],[waistW,h*.40],[waistW*1.05,h*.50],[chestW*.88,h*.60],[chestW,h*.74],[chestW*.92,h*.84],[shoulderW,h*.93],[shoulderW*.88,h]]);
}
function bldLimb({topR,botR,h,bulge=1.05}){return bldLathe([[botR*.78,0],[botR,h*.12],[topR*bulge,h*.42],[topR*.98,h*.72],[topR*.90,h]],18);}
function bldHip({w,h}){return bldLathe([[w*.82,0],[w,h*.35],[w*.96,h*.70],[w*.88,h]],18);}
function bldPenis({shaftR:r,length:len}){return bldLathe([[r*.68,0],[r,len*.06],[r,len*.74],[r*1.18,len*.82],[r*1.08,len*.90],[r*.72,len*.97],[r*.32,len]],18);}
function bldScrotum({r}){return bldLathe([[r*.18,0],[r*.68,r*.28],[r,r*.62],[r*.96,r*.92],[r*.70,r*1.22],[r*.28,r*1.48]],14);}

// == computeDimensions =========================================================
// Based on 7.5-head artistic anatomy canon for adult male at 1.78m scale
function computeDimensions(w={}) {
  const mass=w.overall_mass??0.28,gut=w.gut_volume??0.18,fat=w.face_roundness??0.20,
    chD=w.chest_depth??0.40,delt=w.deltoid_width??0.40,wst=w.waist_narrow??0.70,
    hip=w.hip_width??0.40,glut=w.glute_volume??0.40,bic=w.bicep_peak??0.28,
    fore=w.forearm_girth??0.28,quad=w.quad_sweep??0.28,cal=w.calf_diamond??0.28,
    neck=w.neck_thickness??0.28,
    browD=w.brow_depth??0.35,noseBW=w.nose_bridge_width??0.30,noseTR=w.nose_tip_size??0.35,
    earP=w.ear_prominence??0.40,jawW=w.jaw_width??0.35,chinP=w.chin_projection??0.30,
    lipF=w.lip_fullness??0.42,eyeS=w.eye_size??0.40,
    dLen=w.d_length??0.30,dGirth=w.d_girth??0.30;

  // Anatomically correct segment lengths (1.78m total height in 3D units ≈ 1.78)
  // 7.5-head canon: foot=0.5h, calf=1.0h, thigh=1.25h, hip=0.65h, torso=1.5h, neck=0.4h, head=0.5h
  // where h = headR*2 (1 head unit)
  const headR=0.092+fat*0.022+mass*0.006;
  const oneHead = headR * 2; // ~0.184m per head unit

  const footH   = oneHead * 0.50;  // feet to ankle
  const calfH   = oneHead * 1.00;  // lower leg
  const thighH  = oneHead * 1.25;  // upper leg — slightly longer for realism
  const hipH    = oneHead * 0.65;  // pelvis/glutes
  const torsoH  = oneHead * 1.55;  // trunk (nipple line to shoulders)
  const neckH   = oneHead * 0.42;
  // Arms: upper arm ~1.0h, forearm ~0.88h
  const uArmH   = oneHead * 1.00;
  const fArmH   = oneHead * 0.88;

  const calfY  = footH + calfH/2;
  const thighY = footH + calfH + thighH/2;
  const hipY   = footH + calfH + thighH + hipH/2;
  const torsoY = footH + calfH + thighH + hipH;
  const neckY  = torsoY + torsoH + neckH/2;
  const headY  = torsoY + torsoH + neckH + headR;
  const crotchY= footH + calfH + thighH;

  // Shoulder width: anatomically ≈ 2× hip width for athletic male
  const shoulderW = 0.148 + delt*0.130 + mass*0.008;
  const chestW    = 0.118 + chD*0.088 + mass*0.014;
  const waistW    = 0.078 - wst*0.024 + gut*0.032 + mass*0.012; // narrower waist default
  const bellyW    = 0.082 + gut*0.042 + mass*0.016;
  const hipW      = 0.120 + hip*0.050 + glut*0.030 + mass*0.006;
  const neckR     = 0.030 + neck*0.016;

  // Limb radii — toned but not bulky by default
  const uArmR  = 0.032 + bic*0.030 + mass*0.004;
  const fArmR  = 0.023 + fore*0.018;
  const thighR = 0.048 + quad*0.030 + mass*0.003;
  const calfR  = 0.031 + cal*0.020;

  // Arm positioning: shoulder is at shoulderW + clearance
  const thighX    = hipW * 0.84;
  const shoulderX = shoulderW + 0.058; // arm hangs just outside shoulder
  const uArmY     = torsoY + torsoH * 0.93 - uArmH / 2;
  const fArmY     = uArmY - uArmH/2 - fArmH/2;
  const handY     = fArmY - fArmH/2 - 0.040;

  // Face
  const eyeR    = headR*(0.115+eyeS*0.048);
  const eyeX    = headR*(0.300+jawW*0.032);
  const eyeY    = headY - headR*(0.120+fat*0.034);
  const eyeZ    = headR*0.875;
  const irisR=eyeR*0.60, pupilR=irisR*0.48;
  const browX=eyeX*0.92, browY=eyeY+eyeR*1.00, browZ=eyeZ*0.86, browR=headR*(0.100+browD*0.052);
  const noseBW_r=headR*(0.062+noseBW*0.042), noseTipR_r=headR*(0.042+noseTR*0.030);
  const noseRootY=headY-headR*0.090, noseLen=headR*0.355, noseTipZ=eyeZ*1.018;
  const nostrilR=noseTipR_r*0.40, nostrilX=noseTipR_r*0.80, nostrilY=noseRootY-noseLen*0.82;
  const lipY=headY-headR*0.520, lipZ=eyeZ*0.964, lipW=headR*(0.162+jawW*0.054);
  const upperLipH=headR*(0.020+lipF*0.014), lowerLipH=headR*(0.025+lipF*0.016);
  const earX=headR*0.945, earY=headY-headR*0.105, earH=headR*(0.25+earP*0.10);
  const jawX=headR*(0.60+jawW*0.08), jawY=headY-headR*0.700;
  const chinY=headY-headR*0.870, chinZ=headR*(0.76+chinP*0.10), chinR=headR*(0.043+chinP*0.024);

  // Body detail
  const nippleY=torsoY+torsoH*0.710, nippleX=chestW*0.510, nippleZ=chestW*0.882;
  const nippleR=0.0060+mass*0.0022, areolaeR=nippleR*2.0;
  const navelY=torsoY+torsoH*0.265, navelZ=waistW*0.962, navelR=0.0090;

  // Genitalia
  const penisShaftR=0.0110+dGirth*0.0090, penisLen=0.058+dLen*0.058;
  const penisPivotY=crotchY+0.007, penisPivotZ=hipW*0.210;
  const testisR=0.0165+dGirth*0.0070, testisX=0.0210, scrotumR=testisR*1.28;

  // Hands/feet
  const palmW=fArmR*1.60, palmH=fArmR*2.05, palmD=fArmR*0.65;
  const fingerR=fArmR*0.225, fingerH=fArmR*1.02, thumbR=fArmR*0.278, thumbH=fArmR*0.82;
  const nailW=fingerR*1.52, nailH=fingerR*0.48, nailD=0.0026;
  const toeR=calfR*0.17;

  const bodyScale = 0.97 + mass*0.025 + (chD+delt+hip+glut)*0.007;
  return {
    headR,headY,neckH,neckY,neckR,shoulderW,chestW,waistW,bellyW,hipW,torsoH,torsoY,hipH,hipY,crotchY,
    shoulderX,uArmR,uArmH,uArmY,fArmR,fArmH,fArmY,handY,thighX,thighR,thighH,thighY,calfR,calfH,calfY,
    footH,footX:thighX*0.87,
    eyeR,eyeX,eyeY,eyeZ,irisR,pupilR,browX,browY,browZ,browR,
    noseBW_r,noseTipR_r,noseRootY,noseLen,noseTipZ,nostrilR,nostrilX,nostrilY,
    lipY,lipZ,lipW,upperLipH,lowerLipH,earX,earY,earH,jawX,jawY,chinY,chinZ,chinR,
    nippleY,nippleX,nippleZ,nippleR,areolaeR,navelY,navelZ,navelR,
    penisShaftR,penisLen,penisPivotY,penisPivotZ,testisR,testisX,scrotumR,
    palmW,palmH,palmD,fingerR,fingerH,thumbR,thumbH,nailW,nailH,nailD,toeR,
    bodyScale,
  };
}


// == Sub-components ============================================================

function AuraRing({radius,y}) {
  const ref=useRef(), t=useRef(0);
  const geo=useMemo(()=>new THREE.TorusGeometry(radius,0.004,8,64),[radius]);
  const mat=useMemo(()=>new THREE.MeshBasicMaterial({color:"#22D3EE",transparent:true,opacity:0.55,depthWrite:false}),[]);
  useFrame((_,dt)=>{t.current+=dt;if(ref.current){ref.current.material.opacity=0.35+Math.sin(t.current*2.4)*0.20;ref.current.rotation.y+=dt*0.3;}});
  return <mesh ref={ref} position={[0,y,0]} geometry={geo} material={mat}/>;
}

function EyeGroup({d,side,eyeColorHex,skinMat}) {
  const sx=side==="L"?-1:1, er=d.eyeR;
  const scl=useMemo(()=>makeScleraMat(),[]);
  const iris=useMemo(()=>makeIrisMat(eyeColorHex),[eyeColorHex]);
  const pupil=useMemo(()=>makePupilMat(),[]);
  return (
    <group position={[sx*d.eyeX,d.eyeY,d.eyeZ]}>
      <mesh material={scl}><sphereGeometry args={[er,22,16]}/></mesh>
      <mesh position={[0,0,er*0.62]} material={iris}><sphereGeometry args={[d.irisR,18,14]}/></mesh>
      <mesh position={[0,0,er*0.72]} material={pupil}><sphereGeometry args={[d.pupilR,14,10]}/></mesh>
      <mesh position={[0,er*0.56,er*0.18]} rotation={[-0.42,0,0]} material={skinMat}><sphereGeometry args={[er*1.06,18,8,0,Math.PI*2,0,Math.PI*0.44]}/></mesh>
      <mesh position={[0,-er*0.44,er*0.20]} rotation={[0.34,0,0]} material={skinMat}><sphereGeometry args={[er*1.03,18,8,0,Math.PI*2,Math.PI*0.56,Math.PI*0.34]}/></mesh>
    </group>
  );
}

function BrowMesh({d,side,mat}) {
  const sx=side==="L"?-1:1;
  return <mesh position={[sx*d.browX,d.browY,d.browZ]} rotation={[0.28,sx*0.18,0]} material={mat}><sphereGeometry args={[d.browR,14,8]}/></mesh>;
}

function NoseMesh({d,mat}) {
  const bw=d.noseBW_r,tr=d.noseTipR_r;
  return (
    <group>
      <mesh position={[0,d.noseRootY-d.noseLen*0.44,d.noseTipZ-bw*0.55]} material={mat}><boxGeometry args={[bw*2.1,d.noseLen*0.78,bw*1.15]}/></mesh>
      <mesh position={[0,d.noseRootY-d.noseLen,d.noseTipZ]} material={mat}><sphereGeometry args={[tr,14,10]}/></mesh>
      {[-1,1].map(s=><mesh key={s} position={[s*d.nostrilX,d.nostrilY,d.noseTipZ*0.93]} material={mat}><sphereGeometry args={[d.nostrilR*1.6,10,8]}/></mesh>)}
    </group>
  );
}

function LipsMesh({d,lipMat}) {
  return (
    <group position={[0,d.lipY,d.lipZ]}>
      <mesh position={[0,d.upperLipH*0.55,0]} rotation={[0.18,0,0]} material={lipMat}><sphereGeometry args={[d.lipW,18,8,0,Math.PI*2,0,Math.PI*0.43]}/></mesh>
      <mesh position={[0,-d.lowerLipH*0.5,0]} rotation={[-0.14,0,0]} material={lipMat}><sphereGeometry args={[d.lipW*1.06,18,8,0,Math.PI*2,Math.PI*0.57,Math.PI*0.40]}/></mesh>
      {[-1,1].map(s=><mesh key={s} position={[s*d.lipW*0.88,0,0]} material={lipMat}><sphereGeometry args={[d.noseTipR_r*0.52,8,6]}/></mesh>)}
    </group>
  );
}

function EarMesh({d,side,mat}) {
  const sx=side==="L"?-1:1;
  return (
    <group position={[sx*d.earX,d.earY,0]}>
      <mesh material={mat} scale={[1,1,0.26]}><sphereGeometry args={[d.earH*0.50,14,10]}/></mesh>
      <mesh material={mat} position={[sx*-0.004,0,0.004]} scale={[0.68,0.68,0.18]}><sphereGeometry args={[d.earH*0.34,12,8]}/></mesh>
      <mesh material={mat} position={[0,-d.earH*0.50,0.003]} scale={[0.88,0.58,0.24]}><sphereGeometry args={[d.earH*0.22,10,8]}/></mesh>
      <mesh material={mat} position={[sx*-d.earH*0.26,-d.earH*0.04,0.014]} scale={[0.5,0.5,0.35]}><sphereGeometry args={[d.earH*0.14,8,6]}/></mesh>
    </group>
  );
}

function NippleGroup({d,mat}) {
  return <>{[-1,1].map(s=>(
    <group key={s} position={[s*d.nippleX,d.nippleY,d.nippleZ]}>
      <mesh material={mat} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[d.areolaeR,d.areolaeR,0.0025,18]}/></mesh>
      <mesh material={mat}><sphereGeometry args={[d.nippleR,10,8]}/></mesh>
    </group>
  ))}</>;
}

function NavelMesh({d,mat}) {
  return <mesh position={[0,d.navelY,d.navelZ]} material={mat}><sphereGeometry args={[d.navelR,10,8]}/></mesh>;
}

function GenitaliaGroup({d,mat}) {
  const pGeo=useMemo(()=>bldPenis({shaftR:d.penisShaftR,length:d.penisLen}),[d.penisShaftR,d.penisLen]);
  const sGeo=useMemo(()=>bldScrotum({r:d.scrotumR}),[d.scrotumR]);
  return (
    <group position={[0,d.penisPivotY,d.penisPivotZ]}>
      <mesh geometry={pGeo} material={mat} rotation={[Math.PI*0.94,0,0]}/>
      {[-1,1].map(s=><mesh key={s} position={[s*d.testisX,-0.030,-d.penisShaftR*0.4]} material={mat}><sphereGeometry args={[d.testisR,14,10]}/></mesh>)}
      <mesh geometry={sGeo} material={mat} position={[0,-d.scrotumR*0.68,-d.penisShaftR*0.6]} rotation={[Math.PI*0.5,0,0]}/>
    </group>
  );
}

const FINGER_OX=[-.028,-.010,.010,.028], FINGER_LEN=[1.05,1.15,1.05,0.82];
function HandGroup({d,side,mat,nailMat}) {
  const sx=side==="L"?-1:1;
  return (
    <group position={[sx*d.shoulderX,d.handY,0]}>
      <mesh material={mat}><boxGeometry args={[d.palmW,d.palmH,d.palmD]}/></mesh>
      <group position={[sx*d.palmW*0.55,-d.palmH*0.18,0]} rotation={[0,0,sx*0.52]}>
        <mesh material={mat}><cylinderGeometry args={[d.thumbR,d.thumbR*0.82,d.thumbH,10]}/></mesh>
        <mesh position={[0,-d.thumbH*0.44,d.palmD*0.45]} material={nailMat}><boxGeometry args={[d.nailW*0.92,d.nailH,d.nailD]}/></mesh>
      </group>
      {FINGER_OX.map((ox,fi)=>{const len=d.fingerH*FINGER_LEN[fi];return(
        <group key={fi} position={[sx*ox,-d.palmH*0.53,0]}>
          <mesh material={mat}><cylinderGeometry args={[d.fingerR,d.fingerR*0.82,len,10]}/></mesh>
          <mesh position={[0,-len*0.43,d.palmD*0.44]} material={nailMat}><boxGeometry args={[d.nailW,d.nailH,d.nailD]}/></mesh>
        </group>
      );})}
    </group>
  );
}

const TOE_OX=[-.028,-.014,-.001,.011,.022], TOE_SC=[1.28,1.08,0.93,0.82,0.70];
function FootGroup({d,side,mat,nailMat}) {
  const sx=side==="L"?-1:1, fW=d.thighX*0.70;
  return (
    <group position={[sx*d.footX,d.footH/2,0.052]}>
      <mesh material={mat}><boxGeometry args={[fW,d.footH,0.188]}/></mesh>
      {TOE_OX.map((ox,ti)=>{const tr=d.toeR*TOE_SC[ti];return(
        <group key={ti} position={[sx*ox,d.footH*0.32,0.098+tr]}>
          <mesh material={mat}><sphereGeometry args={[tr,10,8]}/></mesh>
          <mesh position={[0,tr*0.56,tr*0.46]} rotation={[-0.40,0,0]} material={nailMat}><boxGeometry args={[d.nailW*0.85*TOE_SC[ti],d.nailH*0.65,d.nailD]}/></mesh>
        </group>
      );})}
    </group>
  );
}

const GOLDEN = Math.PI*(3-Math.sqrt(5));
function HairCards({d,hairStyle,hairColorHex}) {
  const cfg=HAIR_CFG[hairStyle]||HAIR_CFG.short;
  const mat=useMemo(()=>makeHairMat(hairColorHex),[hairColorHex]);
  const cards=useMemo(()=>{
    if(!cfg.count)return[];
    const cov=hairStyle==="long"?0.82:hairStyle==="medium"?0.72:0.62;
    return Array.from({length:cfg.count},(_,i)=>{
      const t=i/cfg.count,phi=Math.acos(Math.max(-1,Math.min(1,1-t*cov))),theta=GOLDEN*i;
      return{nx:Math.sin(phi)*Math.cos(theta),ny:Math.cos(phi),nz:Math.sin(phi)*Math.sin(theta),theta,phi};
    });
  },[cfg.count,hairStyle]);
  if(!cfg.count)return null;
  const r=d.headR*1.025, cW=d.headR*0.175;
  return(
    <group position={[0,d.headY,0]}>
      {cards.map((c,i)=>(
        <mesh key={i} position={[c.nx*r,c.ny*r,c.nz*r]} rotation={[-c.phi+Math.PI/2,c.theta,0]} material={mat}>
          <planeGeometry args={[cW,cfg.cardH,1,4]}/>
        </mesh>
      ))}
    </group>
  );
}

// == Main component ============================================================
export default function ProceduralHumanoid({
  cloneKey="A", position=[0,0,0], renderMode="normal", opacity=1,
  visible=true, showAura=false, skinTone="IV", eyeColor="#3b7bd4",
  hairStyle="short", hairColor="darkbrown", quality="HIGH",
}) {
  const segs = SEGS_BY_QUALITY[quality] || DEFAULT_SEGS;
  const weights=use3DStore(useShallow(s=>(cloneKey==="B"?s.cloneB:s.cloneA).weights));
  // Fixed: skinTone and opacity in deps so material recomputes when they change
  const mat    =useMemo(()=>makeMat(renderMode,opacity,skinTone),[renderMode,opacity,skinTone]);
  const lipMat =useMemo(()=>makeLipMat(skinTone),[skinTone]);
  const nailMat=useMemo(makeNailMat,[]);

  // Breathing animation state
  const breathT = useRef(cloneKey === "B" ? Math.PI : 0);
  const introT = useRef(0);
  const reduceMotion = useRef(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  const groupRef=useRef(), torsoRef=useRef(), hipRef=useRef(), headRef=useRef(), neckRef=useRef();
  const uArmRefs=[useRef(),useRef()], fArmRefs=[useRef(),useRef()];
  const thighRefs=[useRef(),useRef()], calfRefs=[useRef(),useRef()], shoulderRefs=[useRef(),useRef()];
  // Track previous geometries for proper disposal
  const prevGeoRefs = useRef({ uArm:[null,null], fArm:[null,null], thigh:[null,null], calf:[null,null] });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initD=useMemo(()=>computeDimensions(weights),[]);
  const d=initD;
  const prevW=useRef(weights);

  useEffect(() => () => {
    Object.values(prevGeoRefs.current).flat().forEach((geometry) => geometry?.dispose?.());
    [mat, lipMat, nailMat].forEach((material) => material?.dispose?.());
  }, [lipMat, mat, nailMat]);

  useFrame((_,dt)=>{
    if(!groupRef.current)return;

    // ── Breathing idle animation ────────────────────────────────────────────
    breathT.current += dt;
    introT.current = Math.min(1, introT.current + dt / 1.15);
    const intro = 1 - Math.pow(1 - introT.current, 3);
    const motion = reduceMotion.current ? 0 : 1;
    const breath = Math.sin(breathT.current * 0.78);
    const breathScale = 1 + breath * 0.008 * motion;
    const baseScale = initD.bodyScale * (0.965 + intro * 0.035);
    groupRef.current.scale.setScalar(baseScale);
    groupRef.current.position.y = position[1] - (1 - intro) * 0.045;
    groupRef.current.rotation.y = Math.sin(breathT.current * 0.22) * 0.018 * motion;
    groupRef.current.rotation.z = Math.sin(breathT.current * 0.31) * 0.006 * motion;
    if(torsoRef.current) {
      torsoRef.current.scale.y = breathScale;
      torsoRef.current.scale.x = 1 + breath * 0.0035 * motion;
      torsoRef.current.scale.z = 1 + breath * 0.006 * motion;
    }
    if(headRef.current) {
      headRef.current.rotation.y = Math.sin(breathT.current * 0.28) * 0.025 * motion;
      headRef.current.rotation.z = Math.sin(breathT.current * 0.19) * 0.008 * motion;
    }
    uArmRefs.forEach((arm, index) => {
      if (arm.current) arm.current.rotation.z = (index ? -1 : 1) * Math.sin(breathT.current * 0.52) * 0.012 * motion;
    });

    // ── Morph update ───────────────────────────────────────────────────────
    const st=use3DStore.getState(), curW=(cloneKey==="B"?st.cloneB:st.cloneA).weights;
    if(curW===prevW.current)return; prevW.current=curW;
    const d=computeDimensions(curW);

    if(torsoRef.current){
      torsoRef.current.geometry.dispose();
      torsoRef.current.geometry=bldTorso({shoulderW:d.shoulderW,chestW:d.chestW,waistW:d.waistW,bellyW:d.bellyW,hipW:d.hipW,h:d.torsoH});
      torsoRef.current.position.y=d.torsoY;
    }
    if(hipRef.current){
      hipRef.current.geometry.dispose();
      hipRef.current.geometry=bldHip({w:d.hipW,h:d.hipH});
      hipRef.current.position.y=d.hipY-d.hipH/2;
    }
    if(headRef.current){headRef.current.scale.setScalar(d.headR/initD.headR);headRef.current.position.y=d.headY;}
    if(neckRef.current){neckRef.current.scale.set(d.neckR/initD.neckR,1,d.neckR/initD.neckR);neckRef.current.position.y=d.neckY-d.neckH/2;}

    [-1,1].forEach((s,si)=>{
      if(shoulderRefs[si].current){shoulderRefs[si].current.position.set(s*(d.shoulderX-.01),d.torsoY+d.torsoH*.92,0);shoulderRefs[si].current.scale.setScalar(d.uArmR/initD.uArmR*1.1);}

      // Upper arms — dispose old geometry before replacing
      if(uArmRefs[si].current){
        const prev=prevGeoRefs.current.uArm[si];
        const newGeo=bldLimb({topR:d.uArmR,botR:d.uArmR*.78,h:d.uArmH,bulge:1.08});
        if(prev)prev.dispose();
        uArmRefs[si].current.geometry=newGeo;
        prevGeoRefs.current.uArm[si]=newGeo;
        uArmRefs[si].current.position.set(s*d.shoulderX,d.uArmY-d.uArmH/2,0);
      }
      // Forearms
      if(fArmRefs[si].current){
        const prev=prevGeoRefs.current.fArm[si];
        const newGeo=bldLimb({topR:d.fArmR,botR:d.fArmR*.72,h:d.fArmH,bulge:1.03});
        if(prev)prev.dispose();
        fArmRefs[si].current.geometry=newGeo;
        prevGeoRefs.current.fArm[si]=newGeo;
        fArmRefs[si].current.position.set(s*d.shoulderX,d.fArmY-d.fArmH/2,0);
      }
      // Thighs
      if(thighRefs[si].current){
        const prev=prevGeoRefs.current.thigh[si];
        const newGeo=bldLimb({topR:d.thighR,botR:d.thighR*.70,h:d.thighH,bulge:1.06});
        if(prev)prev.dispose();
        thighRefs[si].current.geometry=newGeo;
        prevGeoRefs.current.thigh[si]=newGeo;
        thighRefs[si].current.position.set(s*d.thighX,d.thighY-d.thighH/2,0);
      }
      // Calves
      if(calfRefs[si].current){
        const prev=prevGeoRefs.current.calf[si];
        const newGeo=bldLimb({topR:d.calfR,botR:d.calfR*.60,h:d.calfH,bulge:1.04});
        if(prev)prev.dispose();
        calfRefs[si].current.geometry=newGeo;
        prevGeoRefs.current.calf[si]=newGeo;
        calfRefs[si].current.position.set(s*d.thighX*.88,d.calfY-d.calfH/2,.01);
      }
    });
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const torsoGeo=useMemo(()=>bldTorso({shoulderW:d.shoulderW,chestW:d.chestW,waistW:d.waistW,bellyW:d.bellyW,hipW:d.hipW,h:d.torsoH}),[]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hipGeo  =useMemo(()=>bldHip({w:d.hipW,h:d.hipH}),[]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const uArmGeo =useMemo(()=>bldLimb({topR:d.uArmR,botR:d.uArmR*.78,h:d.uArmH,bulge:1.08}),[]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fArmGeo =useMemo(()=>bldLimb({topR:d.fArmR,botR:d.fArmR*.72,h:d.fArmH,bulge:1.03}),[]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const thighGeo=useMemo(()=>bldLimb({topR:d.thighR,botR:d.thighR*.70,h:d.thighH,bulge:1.06}),[]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calfGeo =useMemo(()=>bldLimb({topR:d.calfR,botR:d.calfR*.60,h:d.calfH,bulge:1.04}),[]);

  if(!visible)return null;
  const det=renderMode==="normal";
  const hHex=HAIR_COLOR_PRESETS[hairColor]||HAIR_COLOR_PRESETS.darkbrown;
  const hs = segs; // shorthand for segment counts

  return (
    <group ref={groupRef} position={position} scale={[d.bodyScale, d.bodyScale, d.bodyScale]} name={"procedural-"+cloneKey}>
      {/* HEAD */}
      <mesh ref={headRef} position={[0,d.headY,0]} material={mat}><sphereGeometry args={[d.headR,hs.head,Math.round(hs.head*.67)]}/></mesh>
      {/* FACIAL ANATOMY */}
      {det&&<>
        <EyeGroup d={d} side="L" eyeColorHex={eyeColor} skinMat={mat}/>
        <EyeGroup d={d} side="R" eyeColorHex={eyeColor} skinMat={mat}/>
        <BrowMesh d={d} side="L" mat={mat}/><BrowMesh d={d} side="R" mat={mat}/>
        <NoseMesh d={d} mat={mat}/>
        <LipsMesh d={d} lipMat={lipMat}/>
        <EarMesh d={d} side="L" mat={mat}/><EarMesh d={d} side="R" mat={mat}/>
        {[-1,1].map(s=><mesh key={s} position={[s*d.jawX,d.jawY,d.headR*.44]} material={mat}><sphereGeometry args={[d.headR*.104,10,8]}/></mesh>)}
        <mesh position={[0,d.chinY,d.chinZ]} material={mat}><sphereGeometry args={[d.chinR*0.92,10,8]}/></mesh>
      </>}
      {/* HAIR */}
      <HairCards d={d} hairStyle={hairStyle} hairColorHex={hHex}/>
      {/* NECK */}
      <mesh ref={neckRef} position={[0,d.neckY-d.neckH/2,0]} material={mat}><cylinderGeometry args={[d.neckR*.88,d.neckR,d.neckH,16,1]}/></mesh>
      {/* TORSO */}
      <mesh ref={torsoRef} position={[0,d.torsoY,0]} geometry={torsoGeo} material={mat}/>
      {/* NIPPLES */}
      {det&&<NippleGroup d={d} mat={mat}/>}
      {/* NAVEL */}
      {det&&<NavelMesh d={d} mat={mat}/>}
      {/* HIP BLOCK */}
      <mesh ref={hipRef} position={[0,d.hipY-d.hipH/2,0]} geometry={hipGeo} material={mat}/>
      {/* GENITALIA */}
      {det&&<GenitaliaGroup d={d} mat={mat}/>}
      {/* SHOULDER CAPS */}
      {[-1,1].map((s,si)=><mesh key={s} ref={shoulderRefs[si]} position={[s*(d.shoulderX-.01),d.torsoY+d.torsoH*.92,0]} material={mat}><sphereGeometry args={[d.uArmR*1.12,14,10]}/></mesh>)}
      {/* UPPER ARMS */}
      {[-1,1].map((s,si)=><mesh key={s} ref={uArmRefs[si]} position={[s*d.shoulderX,d.uArmY-d.uArmH/2,0]} geometry={uArmGeo} material={mat}/>)}
      {/* ELBOWS */}
      {[-1,1].map(s=><mesh key={s} position={[s*d.shoulderX,d.uArmY-d.uArmH/2-.013,0]} material={mat}><sphereGeometry args={[d.fArmR*.92,10,8]}/></mesh>)}
      {/* FOREARMS */}
      {[-1,1].map((s,si)=><mesh key={s} ref={fArmRefs[si]} position={[s*d.shoulderX,d.fArmY-d.fArmH/2,0]} geometry={fArmGeo} material={mat}/>)}
      {/* WRISTS */}
      {[-1,1].map(s=><mesh key={s} position={[s*d.shoulderX,d.handY+.018,0]} material={mat}><sphereGeometry args={[d.fArmR*.76,10,8]}/></mesh>)}
      {/* HANDS */}
      {[-1,1].map(s=><HandGroup key={s} d={d} side={s===-1?"L":"R"} mat={mat} nailMat={nailMat}/>)}
      {/* HIP JOINTS */}
      {[-1,1].map(s=><mesh key={s} position={[s*d.thighX,d.hipY+d.hipH*.08,0]} material={mat}><sphereGeometry args={[d.thighR*.82,12,9]}/></mesh>)}
      {/* THIGHS */}
      {[-1,1].map((s,si)=><mesh key={s} ref={thighRefs[si]} position={[s*d.thighX,d.thighY-d.thighH/2,0]} geometry={thighGeo} material={mat}/>)}
      {/* KNEES */}
      {[-1,1].map(s=><mesh key={s} position={[s*d.thighX*.92,d.calfY+d.calfH/2+.008,.032]} material={mat}><sphereGeometry args={[d.calfR*.70,10,8]}/></mesh>)}
      {/* CALVES */}
      {[-1,1].map((s,si)=><mesh key={s} ref={calfRefs[si]} position={[s*d.thighX*.88,d.calfY-d.calfH/2,.01]} geometry={calfGeo} material={mat}/>)}
      {/* ANKLES */}
      {[-1,1].map(s=><mesh key={s} position={[s*d.footX,d.footH,.008]} material={mat}><sphereGeometry args={[d.calfR*.62,9,7]}/></mesh>)}
      {/* FEET */}
      {[-1,1].map(s=><FootGroup key={s} d={d} side={s===-1?"L":"R"} mat={mat} nailMat={nailMat}/>)}
      {/* AURA */}
      {showAura&&<>
        <AuraRing radius={d.chestW*1.15} y={d.torsoY+d.torsoH*.72}/>
        <AuraRing radius={d.waistW*1.18} y={d.torsoY+d.torsoH*.40}/>
        <AuraRing radius={d.hipW*1.12}   y={d.hipY+d.hipH*.50}/>
        <AuraRing radius={d.headR*1.20}  y={d.headY}/>
      </>}
    </group>
  );
}

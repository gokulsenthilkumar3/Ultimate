/**
 * ProceduralHumanoid.jsx -- Production Parametric Digital Human v3.0
 * A continuous, adult-proportioned fallback human for measured morphing.
 * The procedural path deliberately favours silhouette, joint continuity and
 * believable material response over small decorative geometry.
 */

import React, { useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import use3DStore from "../../store/use3DStore";

// == Constants =================================================================
// Segment counts per quality tier — passed as `quality` prop
const SEGS_BY_QUALITY = {
  LOW:  { lathe: 18, head: 24, detail: 12 },
  MED:  { lathe: 28, head: 36, detail: 18 },
  HIGH: { lathe: 42, head: 52, detail: 28 },
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
function makeMat(mode,opacity,tone,quality="HIGH") {
  const skin = new THREE.Color(FITZPATRICK[tone]||FITZPATRICK.IV);
  if (mode==="ghost") return new THREE.MeshStandardMaterial({color:"#22D3EE",emissive:"#22D3EE",emissiveIntensity:0.35,roughness:0.1,metalness:0.2,transparent:true,opacity:Math.min(opacity,0.32),depthWrite:false,side:THREE.DoubleSide});
  if (mode==="xray")  return new THREE.MeshStandardMaterial({color:"#818CF8",roughness:0.05,metalness:0.8,transparent:true,opacity:0.4,depthWrite:false});
  if (mode==="delta") return new THREE.MeshStandardMaterial({color:"#F59E0B",emissive:"#7A4800",emissiveIntensity:0.12,roughness:0.55,metalness:0.1});
  const Material = quality === "HIGH" ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const m = new Material({
    color:skin,
    roughness:0.54,
    metalness:0.0,
    emissive:skin.clone().multiplyScalar(0.012),
    emissiveIntensity:0.35,
    ...(quality === "HIGH" ? {
      clearcoat:0.025,
      clearcoatRoughness:0.58,
      sheen:0.08,
      sheenRoughness:0.72,
      sheenColor:skin.clone().offsetHSL(0.01,0.04,0.08),
      iridescence:0,
    } : {}),
  });
  if (opacity<1){m.transparent=true;m.opacity=opacity;m.depthWrite=false;}
  return m;
}
function makeDetailMat(tone,quality="HIGH") {
  const skin = new THREE.Color(FITZPATRICK[tone]||FITZPATRICK.IV).offsetHSL(0.005,0,-0.022);
  const Material = quality === "HIGH" ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  return new Material({ color:skin, roughness:0.60, metalness:0, ...(quality === "HIGH" ? { sheen:0.05, sheenRoughness:0.76 } : {}) });
}
const makeScleraMat = () => new THREE.MeshPhysicalMaterial({color:"#eee9df",roughness:0.32,clearcoat:0.18,clearcoatRoughness:0.4});
const makeIrisMat   = (hex) => new THREE.MeshStandardMaterial({color:hex,roughness:0.18,metalness:0.05,emissive:new THREE.Color(hex).multiplyScalar(0.07),emissiveIntensity:1});
const makePupilMat  = () => new THREE.MeshStandardMaterial({color:"#070707",roughness:0.05,metalness:0.22});
const makeLipMat    = (tone) => { const t={I:"#d89494",II:"#c27d7b",III:"#ad6868",IV:"#8e4d55",V:"#713e48",VI:"#54303a"}; return new THREE.MeshPhysicalMaterial({color:t[tone]||t.IV,roughness:0.46,clearcoat:0.08,clearcoatRoughness:0.55}); };
const makeNailMat   = () => new THREE.MeshStandardMaterial({color:"#e8d8c8",roughness:0.10,metalness:0.05,transparent:true,opacity:0.88});
const makeHairMat   = (hex) => new THREE.MeshStandardMaterial({color:hex,roughness:0.88,metalness:0.02,side:THREE.DoubleSide,alphaTest:0.38,transparent:true});

// == Geometry builders =========================================================
function bldLathe(pts,segs){
  const v=pts.map(p=>new THREE.Vector2(Math.max(0.001,p[0]),p[1]));
  const g=new THREE.LatheGeometry(v,segs??DEFAULT_SEGS.lathe); g.computeVertexNormals(); return g;
}
function bldBodyCore({shoulderW,chestW,waistW,bellyW,hipW,neckR,hipH,torsoH,segs=DEFAULT_SEGS.lathe}){
  return bldLathe([
    [hipW*.14,0],[hipW*.58,hipH*.035],[hipW*.90,hipH*.10],
    [hipW,hipH*.28],[hipW*.99,hipH*.58],
    [hipW*.92,hipH*.82],[bellyW*1.04,hipH],[bellyW,hipH+torsoH*.14],
    [waistW*.96,hipH+torsoH*.28],[waistW,hipH+torsoH*.43],
    [waistW*1.04,hipH+torsoH*.52],[chestW*.86,hipH+torsoH*.62],
    [chestW*.98,hipH+torsoH*.72],[chestW,hipH+torsoH*.80],
    [chestW*.97,hipH+torsoH*.87],[shoulderW*.90,hipH+torsoH*.93],
    [shoulderW,hipH+torsoH*.955],[shoulderW*.70,hipH+torsoH*.975],
    [neckR*1.12,hipH+torsoH],
  ],segs);
}
function bldLimb({topR,botR,h,bulge=1.05,segs=DEFAULT_SEGS.lathe}){return bldLathe([[botR*.78,0],[botR,h*.08],[botR*1.08,h*.18],[topR*bulge,h*.40],[topR*1.04,h*.56],[topR*.98,h*.74],[topR*.90,h*.91],[topR*.82,h]],segs);}

// == computeDimensions =========================================================
// Based on 7.5-head artistic anatomy canon for adult male at 1.78m scale
function computeDimensions(w={}) {
  const mass=w.overall_mass??0.28,gut=w.gut_volume??0.18,fat=w.face_roundness??0.20,
    chD=w.chest_depth??0.40,delt=w.deltoid_width??0.40,wst=w.waist_narrow??0.70,
    hip=w.hip_width??0.40,glut=w.glute_volume??0.40,bic=w.bicep_peak??0.28,
    fore=w.forearm_girth??0.28,quad=w.quad_sweep??0.28,cal=w.calf_diamond??0.28,
    neck=w.neck_thickness??0.28,torsoLen=w.torso_length??0.50,shoulderSlope=w.shoulder_slope??0.30,
    clavicle=w.clavicle_width??0.42,ribDepth=w.ribcage_depth??0.40,pelvis=w.pelvis_width??0.40,
    neckLen=w.neck_length??0.42,upperArmLen=w.upper_arm_length??0.45,forearmLen=w.forearm_length??0.45,
    handLen=w.hand_length??0.45,legLen=w.leg_length??0.45,footLen=w.foot_length??0.45,
    browD=w.brow_depth??0.35,noseBW=w.nose_bridge_width??0.30,noseTR=w.nose_tip_size??0.35,noseLenMorph=w.nose_length??0.25,
    earP=w.ear_prominence??0.40,jawW=w.jaw_width??0.35,chinP=w.chin_projection??0.30,
    lipF=w.lip_fullness??0.42,eyeS=w.eye_size??0.40,cheekW=w.cheekbone_width??0.30,
    foreheadH=w.forehead_height??0.30,temple=w.temple_narrowing??0.45,jawAngle=w.jaw_angle??0.35,
    shoulderDrop=w.shoulder_drop??0.70,kneeSpacing=w.knee_spacing??0.20,ankleTaper=w.ankle_taper??0.72,
    handSplay=w.hand_splay??0.20,footArch=w.foot_arch??0.20;

  // Anatomically correct segment lengths (1.78m total height in 3D units ≈ 1.78)
  // 7.5-head canon: foot=0.5h, calf=1.0h, thigh=1.25h, hip=0.65h, torso=1.5h, neck=0.4h, head=0.5h
  // where h = headR*2 (1 head unit)
  const headR=0.101+fat*0.012+mass*0.003+foreheadH*0.003;
  const oneHead = headR * 2; // ~0.184m per head unit

  const footH   = oneHead * 0.25;
  const calfH   = oneHead * (1.58 + legLen * 0.16);
  const thighH  = oneHead * (1.62 + legLen * 0.18);
  const hipH    = oneHead * 0.65;  // pelvis/glutes
  const torsoH  = oneHead * (1.66 + torsoLen * 0.20);
  const neckH   = oneHead * (0.25 + neckLen * 0.10);
  const uArmH   = oneHead * (1.16 + upperArmLen * 0.18);
  const fArmH   = oneHead * (1.02 + forearmLen * 0.16);

  const calfY  = footH + calfH/2;
  const thighY = footH + calfH + thighH/2;
  const hipY   = footH + calfH + thighH + hipH/2;
  const torsoY = footH + calfH + thighH + hipH;
  const neckY  = torsoY + torsoH + neckH/2;
  const headY  = torsoY + torsoH + neckH + headR;
  const crotchY= footH + calfH + thighH;

  // Shoulder width: anatomically ≈ 2× hip width for athletic male
  const shoulderW = 0.176 + delt*0.082 + clavicle*0.020 + mass*0.010 - shoulderSlope*0.005;
  const chestW    = 0.145 + chD*0.052 + ribDepth*0.018 + mass*0.012;
  const waistW    = 0.104 - wst*0.014 + gut*0.030 + mass*0.012;
  const bellyW    = 0.108 + gut*0.032 + mass*0.014;
  const hipW      = 0.132 + hip*0.032 + pelvis*0.016 + glut*0.022 + mass*0.008;
  const neckR     = 0.034 + neck*0.014;
  const torsoDepthScale = 0.50 + chD*0.14 + gut*0.05 + mass*0.02;

  // Limb radii — toned but not bulky by default
  const uArmR  = 0.035 + bic*0.024 + mass*0.004;
  const fArmR  = 0.026 + fore*0.015;
  const thighR = 0.052 + quad*0.026 + mass*0.004;
  const calfR  = 0.034 + cal*0.017;

  // Arm positioning: shoulder is at shoulderW + clearance
  const thighX    = hipW * (0.56 + kneeSpacing * 0.10);
  const shoulderX = shoulderW + uArmR * 0.46 + shoulderSlope * 0.003;
  const shoulderY = torsoY + torsoH * (0.91 + shoulderSlope * 0.018) - shoulderDrop * 0.012;
  const uArmY     = shoulderY - uArmH / 2;
  const fArmY     = uArmY - uArmH/2 - fArmH/2;
  const handY     = fArmY - fArmH/2 - 0.040;

  // Face
  const eyeR    = headR*(0.078+eyeS*0.026);
  const eyeX    = headR*(0.285+jawW*0.026+cheekW*0.010);
  const eyeY    = headY - headR*(0.120+fat*0.034);
  const eyeZ    = headR*0.875;
  const irisR=eyeR*0.52, pupilR=irisR*0.42;
  const browX=eyeX*0.92, browY=eyeY+eyeR*1.00, browZ=eyeZ*0.86, browR=headR*(0.100+browD*0.052);
  const noseBW_r=headR*(0.062+noseBW*0.042), noseTipR_r=headR*(0.042+noseTR*0.030);
  const noseRootY=headY-headR*(0.090+foreheadH*0.018), noseLen=headR*(0.32+noseLenMorph*0.14), noseTipZ=eyeZ*1.018;
  const nostrilR=noseTipR_r*0.40, nostrilX=noseTipR_r*0.80, nostrilY=noseRootY-noseLen*0.82;
  const lipY=headY-headR*0.505, lipZ=eyeZ*0.978, lipW=headR*(0.145+jawW*0.038);
  const upperLipH=headR*(0.020+lipF*0.014), lowerLipH=headR*(0.025+lipF*0.016);
  const earX=headR*0.945, earY=headY-headR*0.105, earH=headR*(0.25+earP*0.10);
  const jawX=headR*(0.60+jawW*0.08-temple*0.018), jawY=headY-headR*(0.69+jawAngle*0.018);
  const chinY=headY-headR*(0.86+jawAngle*0.025), chinZ=headR*(0.76+chinP*0.10), chinR=headR*(0.043+chinP*0.024);

  // Body detail
  const nippleY=torsoY+torsoH*0.710, nippleX=chestW*0.510, nippleZ=chestW*0.882;
  const nippleR=0.0060+mass*0.0022, areolaeR=nippleR*2.0;
  const navelY=torsoY+torsoH*0.265, navelZ=waistW*0.962, navelR=0.0090;

  // Hands/feet
  const palmW=fArmR*(1.48+handSplay*0.10), palmH=fArmR*(1.92+handLen*0.46), palmD=fArmR*0.62;
  const fingerR=fArmR*0.225, fingerH=fArmR*1.02, thumbR=fArmR*0.278, thumbH=fArmR*0.82;
  const nailW=fingerR*1.52, nailH=fingerR*0.48, nailD=0.0026;
  const toeR=calfR*0.15, ankleR=calfR*(0.58+ankleTaper*0.14), footDepth=0.175+footLen*0.040+footArch*0.012, handSpread=1+handSplay*0.14;

  const bodyScale = 0.97 + mass*0.025 + (chD+delt+hip+glut)*0.007;
  return {
    headR,headY,neckH,neckY,neckR,torsoDepthScale,shoulderW,shoulderY,chestW,waistW,bellyW,hipW,torsoH,torsoY,hipH,hipY,crotchY,
    shoulderX,uArmR,uArmH,uArmY,fArmR,fArmH,fArmY,handY,thighX,thighR,thighH,thighY,calfR,calfH,calfY,
    footH,footX:thighX*0.87,
    eyeR,eyeX,eyeY,eyeZ,irisR,pupilR,browX,browY,browZ,browR,
    noseBW_r,noseTipR_r,noseRootY,noseLen,noseTipZ,nostrilR,nostrilX,nostrilY,
    lipY,lipZ,lipW,upperLipH,lowerLipH,earX,earY,earH,jawX,jawY,chinY,chinZ,chinR,
    nippleY,nippleX,nippleZ,nippleR,areolaeR,navelY,navelZ,navelR,
    palmW,palmH,palmD,handSpread,footDepth,ankleR,fingerR,fingerH,thumbR,thumbH,nailW,nailH,nailD,toeR,
    bodyScale,
  };
}


// == Sub-components ============================================================

function AuraRing({radius,y}) {
  const ref=useRef(), t=useRef(0);
  const geo=useMemo(()=>new THREE.TorusGeometry(radius,0.004,8,64),[radius]);
  const mat=useMemo(()=>new THREE.MeshBasicMaterial({color:"#22D3EE",transparent:true,opacity:0.55,depthWrite:false}),[]);
  useFrame((_,dt)=>{t.current+=dt;if(ref.current){ref.current.material.opacity=0.22+Math.sin(t.current*2.4)*0.10;}});
  return <mesh ref={ref} position={[0,y,0]} rotation={[Math.PI/2,0,0]} geometry={geo} material={mat}/>;
}

function EyeGroup({d,side,eyeColorHex,skinMat,blink=0}) {
  const sx=side==="L"?-1:1, er=d.eyeR;
  const scl=useMemo(()=>makeScleraMat(),[]);
  const iris=useMemo(()=>makeIrisMat(eyeColorHex),[eyeColorHex]);
  const pupil=useMemo(()=>makePupilMat(),[]);
  return (
    <group position={[sx*d.eyeX,d.eyeY-d.headY,d.eyeZ]} visible={blink < 0.78}>
      <mesh material={scl} scale={[1.18,0.66,0.72]}><sphereGeometry args={[er,22,16]}/></mesh>
      <mesh position={[0,0,er*0.56]} material={iris} scale={[1,0.88,0.38]}><sphereGeometry args={[d.irisR,18,14]}/></mesh>
      <mesh position={[0,0,er*0.62]} material={pupil} scale={[1,0.88,0.30]}><sphereGeometry args={[d.pupilR,14,10]}/></mesh>
      <mesh position={[0,er*0.36,er*0.12]} rotation={[-0.28,0,0]} material={skinMat} scale={[1.25,0.62,0.72]}><sphereGeometry args={[er*1.08,18,8,0,Math.PI*2,0,Math.PI*0.44]}/></mesh>
      <mesh position={[0,-er*0.34,er*0.12]} rotation={[0.26,0,0]} material={skinMat} scale={[1.22,0.58,0.70]}><sphereGeometry args={[er*1.05,18,8,0,Math.PI*2,Math.PI*0.56,Math.PI*0.34]}/></mesh>
    </group>
  );
}

function BrowMesh({d,side,mat}) {
  const sx=side==="L"?-1:1;
  return <mesh position={[sx*d.browX,d.browY-d.headY,d.browZ]} rotation={[0.28,sx*0.18,0]} scale={[1.35,0.34,0.30]} material={mat}><sphereGeometry args={[d.browR,14,8]}/></mesh>;
}

function NoseMesh({d,mat}) {
  const bw=d.noseBW_r,tr=d.noseTipR_r;
  return (
    <group>
      <mesh position={[0,d.noseRootY-d.headY-d.noseLen*0.48,d.noseTipZ-bw*0.48]} material={mat} scale={[0.82,1,0.72]}><capsuleGeometry args={[bw*0.72,d.noseLen*0.56,6,12]}/></mesh>
      <mesh position={[0,d.noseRootY-d.headY-d.noseLen,d.noseTipZ]} material={mat} scale={[1.12,0.82,1]}><sphereGeometry args={[tr,18,12]}/></mesh>
      {[-1,1].map(s=><mesh key={s} position={[s*d.nostrilX,d.nostrilY-d.headY,d.noseTipZ*0.95]} material={mat} scale={[1.15,0.65,0.72]}><sphereGeometry args={[d.nostrilR*1.35,12,8]}/></mesh>)}
    </group>
  );
}

function LipsMesh({d,lipMat}) {
  return (
    <group position={[0,d.lipY-d.headY,d.lipZ]}>
      <mesh position={[0,d.upperLipH*0.55,0]} rotation={[0.18,0,0]} material={lipMat}><sphereGeometry args={[d.lipW,18,8,0,Math.PI*2,0,Math.PI*0.43]}/></mesh>
      <mesh position={[0,-d.lowerLipH*0.5,0]} rotation={[-0.14,0,0]} material={lipMat}><sphereGeometry args={[d.lipW*1.06,18,8,0,Math.PI*2,Math.PI*0.57,Math.PI*0.40]}/></mesh>
      {[-1,1].map(s=><mesh key={s} position={[s*d.lipW*0.88,0,0]} material={lipMat}><sphereGeometry args={[d.noseTipR_r*0.52,8,6]}/></mesh>)}
    </group>
  );
}

function MouthDetails({ d, jawOpen = 0, smile = 0 }) {
  const interior = useMemo(() => new THREE.MeshStandardMaterial({ color: "#190b0d", roughness: 0.72 }), []);
  const teeth = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#fff8e8", roughness: 0.24, clearcoat: 0.32 }), []);
  const tongue = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#a34f5f", roughness: 0.42, clearcoat: 0.08 }), []);
  useEffect(() => () => [interior, teeth, tongue].forEach((material) => material.dispose()), [interior, teeth, tongue]);

  return (
    <group
      position={[0, d.lipY - d.headY, d.lipZ + 0.004]}
      visible={jawOpen > 0.035 || smile > 0.58}
      scale={[0.82 + smile * 0.30, 0.70 + jawOpen * 1.55, 0.82 + jawOpen * 0.20]}
    >
      <mesh material={interior} scale={[1.15, 0.68, 0.34]}>
        <sphereGeometry args={[d.lipW * 0.62, 18, 10]} />
      </mesh>
      <mesh position={[0, d.lowerLipH * 0.30, d.lipW * 0.20]} material={teeth} scale={[1.0, 0.50, 0.22]}>
        <boxGeometry args={[d.lipW * 0.82, d.lowerLipH * 0.72, 0.008]} />
      </mesh>
      <mesh position={[0, -d.lowerLipH * 0.48, d.lipW * 0.25]} material={tongue} scale={[1.0, 0.64, 0.30]}>
        <sphereGeometry args={[d.lipW * 0.28, 18, 10]} />
      </mesh>
    </group>
  );
}

function EarMesh({d,side,mat}) {
  const sx=side==="L"?-1:1;
  return (
    <group position={[sx*d.earX,d.earY-d.headY,0]}>
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

const FINGER_OX=[-.028,-.010,.010,.028], FINGER_LEN=[1.05,1.15,1.05,0.82];
function HandGroup({d,side,mat,nailMat}) {
  const sx=side==="L"?-1:1;
  return (
    <group position={[sx*d.shoulderX,d.handY,0]}>
      <mesh material={mat} scale={[0.82,1,0.52]}><capsuleGeometry args={[d.palmW*0.58,d.palmH*0.54,7,14]}/></mesh>
      <group position={[sx*d.palmW*0.55,-d.palmH*0.18,0]} rotation={[0,0,sx*0.52]}>
        <mesh material={mat}><cylinderGeometry args={[d.thumbR,d.thumbR*0.82,d.thumbH,10]}/></mesh>
        <mesh position={[0,-d.thumbH*0.44,d.palmD*0.45]} material={nailMat}><boxGeometry args={[d.nailW*0.92,d.nailH,d.nailD]}/></mesh>
      </group>
      {FINGER_OX.map((ox,fi)=>{const len=d.fingerH*FINGER_LEN[fi];return(
        <group key={fi} position={[sx*ox*d.handSpread,-d.palmH*0.53,0]}>
          <mesh material={mat}><cylinderGeometry args={[d.fingerR,d.fingerR*0.82,len,10]}/></mesh>
          <mesh position={[0,-len*0.43,d.palmD*0.44]} material={nailMat}><boxGeometry args={[d.nailW,d.nailH,d.nailD]}/></mesh>
        </group>
      );})}
    </group>
  );
}

const TOE_OX=[-.028,-.014,-.001,.011,.022], TOE_SC=[1.28,1.08,0.93,0.82,0.70];
function FootGroup({d,side,mat,nailMat}) {
  const sx=side==="L"?-1:1, fW=Math.max(0.062,d.thighR*0.95), fD=d.footDepth;
  return (
    <group position={[sx*d.footX,d.footH/2,0.052]}>
      <mesh material={mat} rotation={[Math.PI/2,0,0]} scale={[fW/(d.footH*0.9),1,0.72]}><capsuleGeometry args={[d.footH*0.46,Math.max(0.04,fD-d.footH),7,16]}/></mesh>
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
  if(!cfg.count || hairStyle === "buzz" || hairStyle === "short")return null;
  const r=d.headR*1.025, cW=d.headR*0.175;
  return(
    <group position={[0,0,0]}>
      {cards.map((c,i)=>(
        <mesh key={i} position={[c.nx*r,c.ny*r,c.nz*r]} rotation={[-c.phi+Math.PI/2,c.theta,0]} material={mat}>
          <planeGeometry args={[cW,cfg.cardH,1,4]}/>
        </mesh>
      ))}
    </group>
  );
}

function HairCap({ d, hairStyle, hairColorHex, segments }) {
  const mat = useMemo(() => makeHairMat(hairColorHex), [hairColorHex]);
  if (hairStyle === "bald") return null;
  return (
    <mesh position={[0, d.headR * 0.035, -d.headR * 0.025]} material={mat} scale={[0.85,1.08,0.92]} name="hair-cap">
      <sphereGeometry args={[d.headR * 1.016, segments, Math.max(12, Math.round(segments * 0.58)), 0, Math.PI * 2, 0, Math.PI * 0.60]} />
    </mesh>
  );
}

function SculptedSurface({ d, detailMat, segments }) {
  const half = Math.max(12, Math.round(segments * 0.55));
  return (
    <group name="anatomical-surface-definition">
      {/* Low-relief landmarks: enough form to read under rim light without a plated torso. */}
      {[-1, 1].map((side) => (
        <React.Fragment key={`chest-${side}`}>
          <mesh position={[side * d.chestW * 0.31, d.nippleY + d.torsoH * 0.025, d.chestW * 0.78]} scale={[1.08, 0.44, 0.055]} material={detailMat}>
            <sphereGeometry args={[d.chestW * 0.34, segments, half]} />
          </mesh>
          <mesh position={[side * d.chestW * 0.22, d.nippleY + d.torsoH * 0.145, d.chestW * 0.72]} rotation={[0, 0, side * -0.94]} material={detailMat}>
            <capsuleGeometry args={[0.0045, d.chestW * 0.25, 4, Math.max(8, Math.round(segments * 0.45))]} />
          </mesh>
        </React.Fragment>
      ))}
      {/* Deltoid, biceps, quadriceps and calf landmarks merge into the base volumes. */}
      {[-1, 1].map((side) => (
        <React.Fragment key={`limb-${side}`}>
          <mesh position={[side * d.shoulderX, d.uArmY - d.uArmH * 0.17, d.uArmR * 0.52]} scale={[0.96, 0.92, 0.20]} material={detailMat}>
            <sphereGeometry args={[d.uArmR * 0.82, segments, half]} />
          </mesh>
          <mesh position={[side * d.shoulderX, d.uArmY - d.uArmH * 0.61, d.uArmR * 0.52]} scale={[0.82, 1.02, 0.18]} material={detailMat}>
            <sphereGeometry args={[d.uArmR * 0.68, segments, half]} />
          </mesh>
          <mesh position={[side * d.thighX, d.thighY + d.thighH * 0.16, d.thighR * 0.62]} scale={[0.84, 1.18, 0.16]} material={detailMat}>
            <sphereGeometry args={[d.thighR * 0.80, segments, half]} />
          </mesh>
          <mesh position={[side * d.thighX * 0.94, d.calfY + d.calfH * 0.08, d.calfR * 0.54]} scale={[0.82, 1.10, 0.17]} material={detailMat}>
            <sphereGeometry args={[d.calfR * 0.68, segments, half]} />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
}

// == Main component ============================================================
export default function ProceduralHumanoid({
  cloneKey="A", position=[0,0,0], renderMode="normal", opacity=1,
  visible=true, showAura=false, skinTone="IV", eyeColor="#3b7bd4",
  hairStyle="short", hairColor="darkbrown", expressionWeights={}, quality="HIGH",
}) {
  const segs = SEGS_BY_QUALITY[quality] || DEFAULT_SEGS;
  const { weights, posture } = use3DStore(useShallow((s) => {
    const clone = cloneKey === "B" ? s.cloneB : s.cloneA;
    return { weights: clone.weights, posture: clone.posture };
  }));
  // Fixed: skinTone and opacity in deps so material recomputes when they change
  const mat    =useMemo(()=>makeMat(renderMode,opacity,skinTone,quality),[renderMode,opacity,skinTone,quality]);
  const lipMat =useMemo(()=>makeLipMat(skinTone),[skinTone]);
  const detailMat =useMemo(()=>makeDetailMat(skinTone,quality),[skinTone,quality]);
  const nailMat=useMemo(()=>makeNailMat(),[]);

  // Breathing animation state
  const breathT = useRef(cloneKey === "B" ? Math.PI : 0);
  const introT = useRef(0);
  const reduceMotion = useRef(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  const groupRef=useRef(), torsoRef=useRef(), headRef=useRef(), neckRef=useRef();
  const uArmRefs=[useRef(),useRef()], fArmRefs=[useRef(),useRef()];
  const thighRefs=[useRef(),useRef()], calfRefs=[useRef(),useRef()], shoulderRefs=[useRef(),useRef()];
  // Geometry is memoized from the live morph state so edits update once per
  // input change, never from inside the animation loop.
  const d=useMemo(()=>computeDimensions(weights),[weights]);

  useEffect(() => () => {
    [mat, detailMat, lipMat, nailMat].forEach((material) => material?.dispose?.());
  }, [detailMat, lipMat, mat, nailMat]);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = quality !== "LOW" && (node.material?.opacity ?? 1) > 0.72;
      node.receiveShadow = false;
    });
  }, [quality, renderMode, visible]);

  useFrame((_,dt)=>{
    if(!groupRef.current)return;

    // ── Breathing idle animation ────────────────────────────────────────────
    breathT.current += dt;
    introT.current = Math.min(1, introT.current + dt / 1.15);
    const intro = 1 - Math.pow(1 - introT.current, 3);
    const motion = reduceMotion.current ? 0 : 1;
    const breath = Math.sin(breathT.current * 0.78);
    const breathScale = 1 + breath * 0.008 * motion;
    const baseScale = d.bodyScale * (0.965 + intro * 0.035);
    groupRef.current.scale.setScalar(baseScale);
    groupRef.current.position.y = position[1] - (1 - intro) * 0.045;
    groupRef.current.rotation.y = Math.sin(breathT.current * 0.22) * 0.018 * motion;
    groupRef.current.rotation.x = THREE.MathUtils.degToRad((posture.pelvicTilt ?? 0) * -0.08);
    groupRef.current.rotation.z = THREE.MathUtils.degToRad((posture.shoulderRounding ?? 0) * 0.035) + Math.sin(breathT.current * 0.31) * 0.006 * motion;
    if(torsoRef.current) {
      torsoRef.current.scale.y = breathScale;
      torsoRef.current.scale.x = 1 + breath * 0.0035 * motion;
      torsoRef.current.scale.z = d.torsoDepthScale * (1 + breath * 0.006 * motion);
    }
    if(headRef.current) {
      headRef.current.rotation.x = THREE.MathUtils.degToRad((posture.headTiltAngle ?? 0) * 0.7) + Math.sin(breathT.current * 0.17) * 0.004 * motion;
      headRef.current.rotation.y = Math.sin(breathT.current * 0.28) * 0.025 * motion;
      headRef.current.rotation.z = Math.sin(breathT.current * 0.19) * 0.008 * motion;
    }
    uArmRefs.forEach((arm, index) => {
      if (arm.current) arm.current.rotation.z = (index ? -1 : 1) * Math.sin(breathT.current * 0.52) * 0.012 * motion;
    });

  });

  const torsoGeo=useMemo(()=>bldBodyCore({shoulderW:d.shoulderW,chestW:d.chestW,waistW:d.waistW,bellyW:d.bellyW,hipW:d.hipW,neckR:d.neckR,hipH:d.hipH,torsoH:d.torsoH,segs:segs.lathe}),[d.bellyW,d.chestW,d.hipH,d.hipW,d.neckR,d.shoulderW,d.torsoH,d.waistW,segs.lathe]);
  const uArmGeo =useMemo(()=>bldLimb({topR:d.uArmR,botR:d.uArmR*.78,h:d.uArmH,bulge:1.08,segs:segs.lathe}),[d.uArmH,d.uArmR,segs.lathe]);
  const fArmGeo =useMemo(()=>bldLimb({topR:d.fArmR,botR:d.fArmR*.72,h:d.fArmH,bulge:1.03,segs:segs.lathe}),[d.fArmH,d.fArmR,segs.lathe]);
  const thighGeo=useMemo(()=>bldLimb({topR:d.thighR,botR:d.thighR*.70,h:d.thighH,bulge:1.06,segs:segs.lathe}),[d.thighH,d.thighR,segs.lathe]);
  const calfGeo =useMemo(()=>bldLimb({topR:d.calfR,botR:d.ankleR,h:d.calfH,bulge:1.04,segs:segs.lathe}),[d.ankleR,d.calfH,d.calfR,segs.lathe]);

  if(!visible)return null;
  const det=renderMode==="normal";
  const hHex=HAIR_COLOR_PRESETS[hairColor]||HAIR_COLOR_PRESETS.darkbrown;
  const hs = segs; // shorthand for segment counts

  return (
    <group ref={groupRef} position={position} scale={[d.bodyScale, d.bodyScale, d.bodyScale]} name={"procedural-"+cloneKey}>
      {/* HEAD ASSEMBLY — all features share the same subtle head motion. */}
      <group ref={headRef} position={[0,d.headY,0]}>
        <mesh material={mat} scale={[0.84,1.04,0.91]}><sphereGeometry args={[d.headR,hs.head,Math.round(hs.head*.67)]}/></mesh>
        {det&&<>
          <EyeGroup d={d} side="L" eyeColorHex={eyeColor} skinMat={mat} blink={expressionWeights.blink ?? 0}/>
          <EyeGroup d={d} side="R" eyeColorHex={eyeColor} skinMat={mat} blink={expressionWeights.blink ?? 0}/>
          <BrowMesh d={d} side="L" mat={detailMat}/><BrowMesh d={d} side="R" mat={detailMat}/>
          <NoseMesh d={d} mat={mat}/>
          <LipsMesh d={d} lipMat={lipMat}/>
          <MouthDetails d={d} jawOpen={expressionWeights.jaw_open ?? 0} smile={expressionWeights.smile ?? 0}/>
          <EarMesh d={d} side="L" mat={mat}/><EarMesh d={d} side="R" mat={mat}/>
          {[-1,1].map(s=><mesh key={s} position={[s*d.jawX,d.jawY-d.headY,d.headR*.40]} scale={[1.15,1.4,0.72]} material={mat}><sphereGeometry args={[d.headR*.09,14,10]}/></mesh>)}
          <mesh position={[0,d.chinY-d.headY,d.chinZ]} scale={[1.4,0.8,0.82]} material={mat}><sphereGeometry args={[d.chinR*0.88,14,10]}/></mesh>
        </>}
        <HairCap d={d} hairStyle={hairStyle} hairColorHex={hHex} segments={hs.head} />
        <HairCards d={d} hairStyle={hairStyle} hairColorHex={hHex}/>
      </group>
      {/* NECK */}
      <mesh ref={neckRef} position={[0,d.neckY,0]} material={mat}><cylinderGeometry args={[d.neckR*.90,d.neckR,d.neckH*1.08,24,2]}/></mesh>
      {/* TORSO */}
      <mesh ref={torsoRef} position={[0,d.crotchY,0]} scale={[1,1,d.torsoDepthScale]} geometry={torsoGeo} material={mat}/>
      {/* SCULPTED LANDMARKS */}
      {det && <SculptedSurface d={d} detailMat={detailMat} segments={segs.detail} />}
      {/* NIPPLES */}
      {det&&<NippleGroup d={d} mat={mat}/>}
      {/* NAVEL */}
      {det&&<NavelMesh d={d} mat={mat}/>}
      {/* Pelvis and torso share one continuous surface; private anatomy is not exposed in comparison mode. */}
      {/* SHOULDER CAPS */}
      {[-1,1].map((s,si)=><mesh key={s} ref={shoulderRefs[si]} position={[s*(d.shoulderX-d.uArmR*.22),d.shoulderY-.008,0]} scale={[1.18,1.08,.98]} material={mat}><sphereGeometry args={[d.uArmR*1.18,hs.detail,Math.max(10,Math.round(hs.detail*.6))]}/></mesh>)}
      {/* UPPER ARMS */}
      {[-1,1].map((s,si)=><mesh key={s} ref={uArmRefs[si]} position={[s*d.shoulderX,d.uArmY-d.uArmH/2,0]} geometry={uArmGeo} material={mat}/>)}
      {/* ELBOWS */}
      {[-1,1].map(s=><mesh key={s} position={[s*d.shoulderX,d.uArmY-d.uArmH/2,0]} scale={[1.04,1.25,.96]} material={mat}><sphereGeometry args={[d.fArmR*1.06,hs.detail,Math.max(9,Math.round(hs.detail*.55))]}/></mesh>)}
      {/* FOREARMS */}
      {[-1,1].map((s,si)=><mesh key={s} ref={fArmRefs[si]} position={[s*d.shoulderX,d.fArmY-d.fArmH/2,0]} geometry={fArmGeo} material={mat}/>)}
      {/* WRISTS */}
      {[-1,1].map(s=><mesh key={s} position={[s*d.shoulderX,d.handY+.018,0]} material={mat}><sphereGeometry args={[d.fArmR*.76,10,8]}/></mesh>)}
      {/* HANDS */}
      {[-1,1].map(s=><HandGroup key={s} d={d} side={s===-1?"L":"R"} mat={mat} nailMat={nailMat}/>)}
      {/* HIP JOINTS */}
      {[-1,1].map(s=><mesh key={s} position={[s*d.thighX,d.crotchY+.006,0]} scale={[1.08,1.22,1]} material={mat}><sphereGeometry args={[d.thighR*1.03,hs.detail,Math.max(10,Math.round(hs.detail*.55))]}/></mesh>)}
      {/* THIGHS */}
      {[-1,1].map((s,si)=><mesh key={s} ref={thighRefs[si]} position={[s*d.thighX,d.thighY-d.thighH/2,0]} geometry={thighGeo} material={mat}/>)}
      {/* KNEES */}
      {[-1,1].map(s=><mesh key={s} position={[s*d.thighX*.92,d.calfY+d.calfH/2,.016]} scale={[1.08,1.18,.92]} material={mat}><sphereGeometry args={[d.calfR*.92,hs.detail,Math.max(9,Math.round(hs.detail*.55))]}/></mesh>)}
      {/* CALVES */}
      {[-1,1].map((s,si)=><mesh key={s} ref={calfRefs[si]} position={[s*d.thighX*.88,d.calfY-d.calfH/2,.01]} geometry={calfGeo} material={mat}/>)}
      {/* ANKLES */}
      {[-1,1].map(s=><mesh key={s} position={[s*d.footX,d.footH,.008]} material={mat}><sphereGeometry args={[d.calfR*.62,9,7]}/></mesh>)}
      {/* FEET */}
      {[-1,1].map(s=><FootGroup key={s} d={d} side={s===-1?"L":"R"} mat={mat} nailMat={nailMat}/>)}
      {/* AURA */}
      {showAura && <AuraRing radius={d.hipW*1.45} y={0.028}/>} 
    </group>
  );
}

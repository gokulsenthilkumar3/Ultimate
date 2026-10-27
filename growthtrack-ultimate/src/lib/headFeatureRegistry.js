/** Artistic adapters for the existing adult head. These values are morph
 * weights, never measurements or a percentage of anatomical accuracy.
 * Coupled legacy channels retain their own namespace rather than claiming
 * the independent fields specified by the specialist head matrices. */
export const HEAD_FEATURE_REGISTRY_VERSION = 1;

export const HEAD_FEATURE_GROUPS = Object.freeze([
  {id:'head',label:'Head and cheeks',help:'Check the forehead, temples and cheek outline from the front and both sides.'},
  {id:'eyes',label:'Eyes and brow ridge',help:'Eye size changes the existing eye region together. The brow ridge is separate from eyebrow hair.'},
  {id:'nose',label:'Nose',help:'Compare the bridge and tip from the front, then check the outline from both sides.'},
  {id:'lips',label:'Lips',help:'This model changes both lips together. Separate upper and lower lip shapes need additional assets.'},
  {id:'jaw',label:'Jaw and chin',help:'Check the jaw outline and chin in front and side views. Jaw opening stays in Expressions.'},
  {id:'ears',label:'Ears',help:'This model changes both ears together. Check from the front, side and back.'},
].map(Object.freeze));

/** @type {Array<[id:string,key:string,label:string,group:string,aliases:string[],help:string]>} */
const definitions = [
  ['legacy.eye_size','eye_size','Eye Size','eyes',['eye opening','eyelids'],'Adjust the existing combined eye-region shape; this is not an independent globe or eyelid measurement.'],
  ['forehead.brow_ridge','brow_depth','Brow Ridge','eyes',['ridge above eyes','supraorbital'],'Adjust the ridge above the eyes, separately from eyebrow hair.'],
  ['nose.bridge_width','nose_bridge_width','Nose Bridge','nose',['bridge width','nasal bridge'],'Adjust the width of the nose bridge.'],
  ['nose.tip_fullness','nose_tip_size','Nose Tip','nose',['tip fullness','nasal tip'],'Adjust the existing nose-tip shape.'],
  ['legacy.lip_fullness','lip_fullness','Lip Fullness','lips',['mouth','vermilion'],'Adjust the fullness of both lips together.'],
  ['legacy.ear_prominence','ear_prominence','Ear Prominence','ears',['ears stick out','auricle'],'Adjust the prominence of both ears together.'],
  ['jaw.width','jaw_width','Jaw Width','jaw',['mandible','jaw breadth'],'Adjust the width of the jaw outline.'],
  ['chin.projection','chin_projection','Chin Projection','jaw',['chin forward','profile'],'Adjust how far the chin projects.'],
  ['cheek.bone_width','cheekbone_width','Cheekbone Width','head',['cheeks','zygomatic'],'Adjust the width across the cheekbone region.'],
  ['legacy.forehead_height','forehead_height','Forehead Height','head',['forehead','upper face'],'Adjust the existing forehead shape; this does not measure hairline-to-brow height.'],
  ['legacy.temple_narrowing','temple_narrowing','Temple Narrowing','head',['temples','side of forehead'],'Adjust the narrowing at the temples.'],
  ['legacy.nose_length','nose_length','Nose Length Shape','nose',['nose length','profile'],'Adjust the existing nose-length shape; this is not a calibrated distance.'],
  ['legacy.jaw_angle','jaw_angle','Jaw Angle','jaw',['jaw corner','angular jaw'],'Adjust the existing jaw-corner shape; this is not an angle in degrees.'],
];

export const HEAD_FEATURES = Object.freeze(definitions.map(([id,key,label,group,aliases,help])=>Object.freeze({
  id,key,label,group,aliases:Object.freeze(aliases),help,
  definitionVersion:HEAD_FEATURE_REGISTRY_VERSION,
  valueType:'number',unit:'unitless',entryModes:Object.freeze(['visual']),
  sidePolicy:'combined',instancePolicy:'one-per-head',defaultPolicy:'existing-measurement-derived-shape',
  unknownAllowed:true,measurementProtocolId:null,diagramId:null,
  inputConstraints:Object.freeze({min:0,max:1,step:.01}),supportedDomain:'existing-artistic-morph-range',
  bindingId:`legacy-morph:${key}`,dependencies:Object.freeze([]),affectedRegions:Object.freeze([group]),
  previewViews:Object.freeze(['front','left-profile','right-profile','oblique']),
  validationFixtures:Object.freeze(['headFeatureRegistry.test.js','HeadFeatureControls.test.jsx']),
  evidenceRefs:Object.freeze(['docs/real-human-3d/19-face-hair-diversity/head-system-architecture.md']),
})));

/** The loader's exhaustive missing-target list supplies structural binding
 * evidence. A target name does not certify contact, calibration or realism. */
function headMorphCapability(key,targetKind,diagnostics,interactive){
  const base={physicalCalibration:false,motionContact:'not-assessed',exportParity:'not-assessed'};
  if(!interactive)return {...base,available:false,state:'unavailable',reason:'Interactive 3D is required.'};
  if(!diagnostics)return {...base,available:false,state:'checking',reason:'Checking model controls…'};
  if(diagnostics.health!=='healthy' || !diagnostics.hasBodyMesh || !diagnostics.hasScene)
    return {...base,available:false,state:'unavailable',reason:'A loaded, healthy model is required.'};
  const reportedTargets=diagnostics.capabilities?.head?.[targetKind];
  if(Array.isArray(reportedTargets)){
    return reportedTargets.includes(key)
      ? {...base,available:true,state:'visual-only',reason:'Visual adjustment only; not a physical measurement.'}
      : {...base,available:false,state:'unsupported',reason:'Saved values are retained, but this model cannot show this adjustment.'};
  }
  if(!Array.isArray(diagnostics.missingMorphTargets) || !(diagnostics.morphTargetCount>0))
    return {...base,available:false,state:'unknown',reason:'This model has no confirmed binding for this control.'};
  if(diagnostics.missingMorphTargets.includes(key))
    return {...base,available:false,state:'unsupported',reason:'Saved values are retained, but this model cannot show this adjustment.'};
  return {...base,available:true,state:'visual-only',reason:'Visual adjustment only; not a physical measurement.'};
}

export function headFeatureCapability(feature,diagnostics,interactive=true){
  return headMorphCapability(feature.key,'shapeTargets',diagnostics,interactive);
}

export function headExpressionCapability(key,diagnostics,interactive=true){
  if(!['blink','smile','jaw_open'].includes(key))return {available:false,state:'unsupported',reason:'Unknown expression.'};
  return headMorphCapability(key,'expressionTargets',diagnostics,interactive);
}

export function supportedHeadMorphKeys(diagnostics,interactive=true){
  return HEAD_FEATURES.filter(feature=>headFeatureCapability(feature,diagnostics,interactive).available).map(feature=>feature.key);
}

export function headFeatureValue(feature,overrides={},weights={}){
  const value=overrides[feature.key] ?? weights[feature.key] ?? .35;
  return typeof value==='number' && Number.isFinite(value)?Math.max(0,Math.min(1,value)):.35;
}

export function findHeadFeatures(query=''){
  const terms=String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return HEAD_FEATURES.filter(feature=>{
    const text=[feature.label,...feature.aliases,feature.help,feature.group].join(' ').toLocaleLowerCase();
    return terms.every(term=>text.includes(term));
  });
}

import {describe,expect,it} from 'vitest';
import {HEAD_FEATURES,HEAD_FEATURE_REGISTRY_VERSION,findHeadFeatures,headFeatureCapability,headExpressionCapability,headFeatureValue,supportedHeadMorphKeys} from './headFeatureRegistry';
import {MORPH_CHANNEL_GROUPS} from '../components/morphEngine/morphMath';
import {FACE_SHAPE_CONTROLS} from '../components/morphEngine/metricsToBlendshapes';

const healthy={health:'healthy',hasScene:true,hasBodyMesh:true,morphTargetCount:70,missingMorphTargets:[]};
const nose=HEAD_FEATURES.find(feature=>feature.key==='nose_bridge_width');

describe('the existing adult head adapters',()=>{
  it('shares all 13 identity channels without importing expression into identity',()=>{
    expect(HEAD_FEATURE_REGISTRY_VERSION).toBe(1);
    expect(new Set(HEAD_FEATURES.map(feature=>feature.id)).size).toBe(13);
    expect(HEAD_FEATURES.map(feature=>feature.key).sort()).toEqual([...MORPH_CHANNEL_GROUPS.face].sort());
    expect(FACE_SHAPE_CONTROLS.map(feature=>feature.key)).toEqual(HEAD_FEATURES.map(feature=>feature.key));
    expect(HEAD_FEATURES.every(feature=>feature.unit==='unitless' && feature.measurementProtocolId===null)).toBe(true);
  });
  it('finds familiar and anatomical descriptions without needing case-exact labels',()=>{
    expect(findHeadFeatures('NASAL bridge').map(feature=>feature.key)).toEqual(['nose_bridge_width']);
    expect(findHeadFeatures('eyelids').map(feature=>feature.key)).toEqual(['eye_size']);
    expect(findHeadFeatures('unknown part')).toEqual([]);
  });
  it('disables loading, missing and unconfirmed custom models while retaining input values',()=>{
    for(const diagnostics of [null,{health:'healthy'},{...healthy,morphTargetCount:0},{...healthy,missingMorphTargets:undefined},{...healthy,health:'needs-repair'}]){
      expect(headFeatureCapability(nose,diagnostics).available).toBe(false);
    }
    expect(headFeatureCapability(nose,{...healthy,missingMorphTargets:['nose_bridge_width']}).state).toBe('unsupported');
    expect(headFeatureValue(nose,{nose_bridge_width:.72},{})).toBe(.72);
    expect(supportedHeadMorphKeys(healthy,false)).toEqual([]);
  });
  it('uses explicit active-target evidence to reject a present but empty morph',()=>{
    const diagnostics={...healthy,capabilities:{head:{shapeTargets:['jaw_width']}}};
    expect(headFeatureCapability(nose,diagnostics).available).toBe(false);
    expect(supportedHeadMorphKeys(diagnostics)).toEqual(['jaw_width']);
  });
  it('reports structural binding without advertising physical or contact validation',()=>{
    expect(headFeatureCapability(nose,healthy)).toMatchObject({available:true,state:'visual-only',physicalCalibration:false,motionContact:'not-assessed',exportParity:'not-assessed'});
  });
  it('resolves expression support independently of identity targets',()=>{
    const diagnostics={...healthy,capabilities:{head:{shapeTargets:['jaw_width'],expressionTargets:['jaw_open']}}};
    expect(headExpressionCapability('smile',diagnostics).available).toBe(false);
    expect(headExpressionCapability('jaw_open',diagnostics).available).toBe(true);
    expect(headExpressionCapability('jaw_open',diagnostics,false).available).toBe(false);
    expect(headExpressionCapability('jaw_width',diagnostics).available).toBe(false);
    expect(headExpressionCapability('jaw_open',null).available).toBe(false);
  });
  it('never forwards invalid or out-of-range display values to a slider',()=>{
    expect(headFeatureValue(nose,{nose_bridge_width:NaN})).toBe(.35);
    expect(headFeatureValue(nose,{nose_bridge_width:Infinity})).toBe(.35);
    expect(headFeatureValue(nose,{nose_bridge_width:1.5})).toBe(1);
    expect(headFeatureValue(nose,{}, {nose_bridge_width:.24})).toBe(.24);
    expect(headFeatureValue(nose,{nose_bridge_width:0},{nose_bridge_width:.24})).toBe(0);
  });
});

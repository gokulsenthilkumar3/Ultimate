import {applyReachTargets} from './poseRuntime';

/** Retarget the shipped world-aligned MakeHuman rig with end-effector goals.
 * Imported rigs and saved artistic joint edits keep their existing semantics. */
export function presetReach(id,time=0,duration=1) {
  const phase=duration?time/duration:0,wave=Math.sin(phase*Math.PI*2),targets={},poles={};
  for(const [side,sign] of [['left',1],['right',-1]]) {
    let target=[sign*.18,-.94,.06],pole=[sign*.4,-.8,-.3];
    if(id==='tpose')target=[sign*.995,0,0];
    if(id==='flex'){target=[sign*.30,.30,.06];pole=[sign,0,.05];}
    if(id==='sitting')target=[sign*.18,-.63,.42];
    if(id==='squat')target=[sign*.12,-.12,.89];
    if(['walking','running'].includes(id))target=[sign*.22,-(id==='running'?.67:.88),wave*sign*(id==='running'?.58:.32)];
    if(id==='idle')target=[sign*.18,-.94,.06+wave*.012];
    if(id==='jumping'){const angle=-Math.PI/2+(1-Math.cos(phase*Math.PI*2))*.5*Math.PI;target=[sign*.98*Math.cos(angle),.98*Math.sin(angle),.02];pole=[sign,0,-.2];}
    if(id==='wave' && side==='right'){target=[-.24,.63,.13+wave*.10];pole=[-1,0,0];}
    targets[side+'Wrist']=target;poles[side+'Wrist']=pole;
  }
  return {targets,poles};
}
export function applyPresetReach(bones,preset,time) {
  if(!preset)return;
  const {targets,poles}=presetReach(preset.id,time,preset.duration);
  return applyReachTargets(bones,targets,poles);
}
export function retargetPresetAngles(key,angles,id) {
  const next=[...(angles || [0,0,0])];
  if(key==='leftShin' || key==='rightShin')next[0]=Math.abs(next[0]);
  if(id==='sitting' && key==='hips')next[0]=0;
  if(id==='sitting' && ['leftThigh','rightThigh'].includes(key))next[0]=-Math.abs(next[0]);
  if(id==='squat') {
    if(key==='hips')next[0]=15*Math.PI/180;
    if(key==='spine1')next[0]=12*Math.PI/180;
    if(key==='spine2')next[0]=-8*Math.PI/180;
    if(['leftThigh','rightThigh'].includes(key))next[0]=-Math.abs(next[0]);
  }
  return next;
}

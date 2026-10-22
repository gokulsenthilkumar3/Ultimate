import { useEffect,useState } from 'react';
import { POSE_STUDIO, emptyPose, sanitizePose } from '../../lib/poseStudio';
import DigitPoseControls from './DigitPoseControls';

export default function PoseStudioControls({value,onChange,readPose,saveStatus,available=true,onJointSelect}) {
  const pose=sanitizePose(value),[jointId,setJoint]=useState(POSE_STUDIO.joints[0].id);
  const [limbId,setLimb]=useState(POSE_STUDIO.limbs[0].id),[message,setMessage]=useState('');
  useEffect(()=>onJointSelect?.(jointId),[jointId,onJointSelect]);
  const joint=POSE_STUDIO.joints.find(item=>item.id===jointId),limb=POSE_STUDIO.limbs.find(item=>item.id===limbId);
  const angles=pose.joints[jointId] || [0,0,0],target=pose.targets[limbId];
  const patch=next=>onChange({...pose,...next});
  const updateAngle=(axis,value)=>{
    const next=[...angles];next[axis]=value;patch({joints:{...pose.joints,[jointId]:next}});
  };
  const toggleReach=enabled=>{
    setMessage('');const targets={...pose.targets};
    if(enabled) {
      const rendered=readPose()?.limbs?.[limbId];
      if(!rendered){setMessage('Wait for the interactive model to finish loading.');return;}
      // Native range inputs quantize their displayed value. Store that same
      // step-aligned target so a first keyboard edit cannot retain a hidden
      // off-step coordinate from the rest rig.
      targets[limbId]=rendered.normalized.map(v=>Math.max(-POSE_STUDIO.targetLimit,Math.min(POSE_STUDIO.targetLimit,
        Number((Math.round(v/POSE_STUDIO.targetStep)*POSE_STUDIO.targetStep).toFixed(8)))));
    } else delete targets[limbId];
    patch({targets});
  };
  return <section aria-label="Saved pose editor">
    <p className="chamber-note">Save a pose for this avatar. Measurements, anatomy, comparisons and timeline previews use neutral poses. Joint limits are artistic preview limits. Saved poses pause motion previews; turn off Use saved pose to resume them.</p>
    <p className="chamber-note">Drag a wrist or ankle sphere in the model to move it along the view plane. Orbit first to choose another plane, or use the reach sliders for depth and keyboard control. Escape cancels a drag.</p>
    <p className="chamber-note">The orange handle rotates the selected joint: drag sideways to turn and vertically to bend. The sliders also control tilt. Escape restores the previous pose.</p>
    {!available && <p role="status" className="chamber-note">Choose Current or Goal with interactive 3D to edit a pose.</p>}
    <fieldset disabled={!available} className="pose-studio-fields">
      <label className="workspace-switch"><span>Use saved pose</span><input type="checkbox" aria-label="Use saved pose" checked={pose.enabled} onChange={e=>patch({enabled:e.target.checked})}/></label>
      <fieldset disabled={!pose.enabled} className="pose-studio-fields">
        <label className="workspace-field"><span>Start from a pose</span><select aria-label="Pose starting point" value="" onChange={e=>{
          const preset=POSE_STUDIO.presets.find(item=>item.id===e.target.value);if(preset)patch({joints:preset.joints,targets:{}});
        }}><option value="" disabled>Choose a starting point</option>{POSE_STUDIO.presets.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="workspace-field"><span>Joint</span><select aria-label="Pose joint" value={jointId} onChange={e=>setJoint(e.target.value)}>{POSE_STUDIO.joints.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        {POSE_STUDIO.axes.map((axis,i)=><label className="avatar-range-field" key={axis.id}><span>{axis.label}<output>{angles[i]}°</output></span>
          <input type="range" aria-label={`Joint ${axis.label.toLowerCase()}`} min={joint.limits[i][0]} max={joint.limits[i][1]} step={POSE_STUDIO.angleStep} value={angles[i]} onChange={e=>updateAngle(i,Number(e.target.value))}/></label>)}
        <p className="chamber-note">Reach targets take priority over the upper and lower joint angles of that limb. Disable its target to use those angles again.</p>
        <h4>Wrist and ankle reach</h4>
        <label className="workspace-field"><span>Limb endpoint</span><select aria-label="Reach endpoint" value={limbId} onChange={e=>{setLimb(e.target.value);setMessage('');}}>{POSE_STUDIO.limbs.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="workspace-switch"><span>Position {limb.label.toLowerCase()}</span><input type="checkbox" aria-label="Use reach target" checked={Boolean(target)} onChange={e=>toggleReach(e.target.checked)}/></label>
        {target && <>{POSE_STUDIO.targetAxes.map((axis,i)=><label className="avatar-range-field" key={axis}><span>{axis}<output>{target[i].toFixed(2)} × limb length</output></span>
          <input type="range" aria-label={`Reach ${axis.toLowerCase()}`} min={-POSE_STUDIO.targetLimit} max={POSE_STUDIO.targetLimit} step={POSE_STUDIO.targetStep} value={target[i]} onChange={e=>{
            const next=[...target];next[i]=Number(e.target.value);patch({targets:{...pose.targets,[limbId]:next}});
          }}/></label>)}<button type="button" className="chamber-pill" onClick={()=>{
            const rendered=readPose(),result=rendered?.limbs?.[limbId],applied=rendered?.targets?.[limbId];
            if(!applied || applied.some((v,i)=>Math.abs(v-target[i])>1e-8)) {setMessage('Bring the model into view to update reach, then check again.');return;}
            setMessage(result?result.reached?'Target reached.':`Target limited by limb reach or bend limit (${Math.round(result.error/result.reach*100)}% of limb length away).`:'The model is still loading.');
          }}>Check reach</button></>}
        {message && <p role="status" className="chamber-note">{message}</p>}
        <DigitPoseControls digits={pose.digits} readPose={readPose} onChange={digits=>patch({digits})}/>
      </fieldset>
      <button type="button" className="chamber-pill" onClick={()=>onChange(emptyPose())}>Reset this pose</button>
    </fieldset>
    <p role="status" className="chamber-note">{saveStatus==='error'?'Pose save failed.':saveStatus==='saving'?'Saving pose…':'Pose choices saved with your viewer preferences.'}</p>
    {saveStatus==='error' && <button type="button" className="chamber-pill" onClick={()=>onChange(pose)}>Retry pose save</button>}
  </section>;
}

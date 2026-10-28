import { useEffect,useState,useRef } from 'react';
import { POSE_STUDIO, emptyPose, sanitizePose } from '../../lib/poseStudio';
import DigitPoseControls from './DigitPoseControls';

export default function PoseStudioControls({value,onChange,readPose,saveStatus,available=true,onJointSelect}) {
  const pose=sanitizePose(value),[jointId,setJoint]=useState(POSE_STUDIO.joints[0].id);
  const [limbId,setLimb]=useState(POSE_STUDIO.limbs[0].id),[message,setMessage]=useState('');
  useEffect(()=>onJointSelect?.(jointId),[jointId,onJointSelect]);
  const joint=POSE_STUDIO.joints.find(item=>item.id===jointId),limb=POSE_STUDIO.limbs.find(item=>item.id===limbId);
  const angles=pose.joints[jointId] || [0,0,0],target=pose.targets[limbId];
  const history=useRef([]);
  const [undoCount,setUndoCount]=useState(0);
  const commit=next=>{history.current=[...history.current.slice(-19),pose];setUndoCount(history.current.length);onChange(next);};
  const patch=next=>commit({...pose,...next});
  const controllingTarget=POSE_STUDIO.limbs.find(item=>pose.targets[item.id] && item.chain.slice(0,2).includes(jointId));
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
    <p className="chamber-note" role="status">{!available?'Neutral preview · custom poses are paused in this view.':pose.enabled?'Custom pose active · motion is paused.':'Choose a pose above, or enable a custom pose below.'}</p>
    <details className="avatar-secondary-tools"><summary>How pose editing works</summary>
      <p className="chamber-note">Measurements, anatomy, comparisons and timeline previews use neutral poses. These are artistic preview limits.</p>
      <p className="chamber-note">Drag wrist or ankle spheres to position them. Orbit to choose another plane. The orange joint handle bends and turns the selected joint. Escape cancels a drag; sliders provide keyboard control.</p>
    </details>
    {!available && <p role="status" className="chamber-note">Choose Current or Goal with interactive 3D to edit a pose.</p>}
    <fieldset disabled={!available} className="pose-studio-fields">
      <label className="workspace-switch"><span>Use saved pose</span><input type="checkbox" aria-label="Use saved pose" checked={pose.enabled} onChange={e=>patch({enabled:e.target.checked})}/></label>
      <fieldset disabled={!pose.enabled} className="pose-studio-fields">
        <label className="workspace-field"><span>Start from a pose</span><select aria-label="Pose starting point" value="" onChange={e=>{
          const preset=POSE_STUDIO.presets.find(item=>item.id===e.target.value);if(preset)commit(sanitizePose({enabled:true,joints:preset.joints,targets:{}}));
        }}><option value="" disabled>Choose a starting point</option>{POSE_STUDIO.presets.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <p className="chamber-note">Starting points reset body, reach targets, hands and toes. Undo restores your previous pose.</p>
        <details className="avatar-secondary-tools"><summary>Body joints</summary>
        <label className="workspace-field"><span>Joint</span><select aria-label="Pose joint" value={jointId} onChange={e=>setJoint(e.target.value)}>{[['Head and torso',POSE_STUDIO.joints.slice(0,4)],['Arms',POSE_STUDIO.joints.slice(4,8)],['Legs',POSE_STUDIO.joints.slice(8)]].map(([label,items])=><optgroup key={label} label={label}>{items.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>)}</select></label>
        {controllingTarget && <p role="status">{controllingTarget.label} reach controls this joint. Turn off its reach target to edit angles.</p>}
        <fieldset className="pose-studio-fields" disabled={Boolean(controllingTarget)}>
        {POSE_STUDIO.axes.map((axis,i)=><label className="avatar-range-field" key={axis.id}><span>{['Bend','Turn','Tilt'][i]}<output>{angles[i]}°</output></span>
          <input type="range" aria-label={`Joint ${axis.label.toLowerCase()}`} min={joint.limits[i][0]} max={joint.limits[i][1]} step={POSE_STUDIO.angleStep} value={angles[i]} onChange={e=>updateAngle(i,Number(e.target.value))}/></label>)}
        </fieldset>
        </details>
        <details className="avatar-secondary-tools"><summary>Position hands and feet</summary>
        <p className="chamber-note">Reach targets take priority over the upper and lower joint angles of that limb. Disable its target to use those angles again.</p>

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
        </details>
        <details className="avatar-secondary-tools"><summary>Hands and toes</summary>
        <DigitPoseControls digits={pose.digits} readPose={readPose} onChange={digits=>patch({digits})}/>
        </details>
      </fieldset>
      <button type="button" className="chamber-pill" onClick={()=>commit(emptyPose())}>Reset this pose</button>
      <button type="button" className="chamber-pill" disabled={!undoCount} onClick={()=>{const previous=history.current.pop();if(previous){onChange(previous);setUndoCount(history.current.length);}}}>Undo pose edit</button>
    </fieldset>
    <p role="status" className="chamber-note">{saveStatus==='error'?'Pose save failed.':saveStatus==='saving'?'Saving pose…':'Pose choices saved with your viewer preferences.'}</p>
    {saveStatus==='error' && <button type="button" className="chamber-pill" onClick={()=>onChange(pose)}>Retry pose save</button>}
  </section>;
}

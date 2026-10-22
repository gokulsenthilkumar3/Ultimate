import {HUMAN_SURFACE} from '../../lib/humanSurface';
export default function DigitPoseControls({digits={},onChange,readPose}){
  const groups=readPose?.()?.digitGroups || [],available=['leftHand','rightHand','leftFoot','rightFoot'].every(group=>groups.includes(group)),config=HUMAN_SURFACE.digits;
  const patch=(key,value)=>onChange({...digits,[key]:{...digits[key],...value}});
  return <fieldset className="pose-studio-fields" disabled={!available}><legend>Hands and toes</legend>
    <p className="chamber-note">Articulated preview controls use the new bundled rig. These are artistic poses; collision and joint calibration remain in development.</p>
    {!available && <p role="status">Load the articulated preview model to edit hands and toes.</p>}
    {['left','right'].map(side=>{
      const label=side==='left'?'Left':'Right',hand=digits[side+'Hand'] || {},foot=digits[side+'Foot'] || {};
      return <div key={side}>
        <label className="workspace-field"><span>{label} hand shape</span><select aria-label={`${label} hand shape`} value={hand.shape || 'open'} onChange={e=>patch(side+'Hand',{shape:e.target.value,strength:hand.strength ?? config.strength.default})}>{config.shapes.map(shape=><option key={shape.id} value={shape.id}>{shape.label}</option>)}</select></label>
        <label className="avatar-range-field"><span>{label} hand closure<output>{Math.round((hand.strength ?? config.strength.default)*100)}%</output></span><input type="range" aria-label={`${label} hand closure`} min={config.strength.min} max={config.strength.max} step={config.strength.step} value={hand.strength ?? config.strength.default} onChange={e=>patch(side+'Hand',{shape:hand.shape || 'open',strength:Number(e.target.value)})}/></label>
        <label className="avatar-range-field"><span>{label} toes curl<output>{Math.round((foot.curl || 0)*100)}%</output></span><input type="range" aria-label={`${label} toes curl`} min={config.toeCurl.min} max={config.toeCurl.max} step={config.toeCurl.step} value={foot.curl || 0} onChange={e=>patch(side+'Foot',{curl:Number(e.target.value)})}/></label>
      </div>;
    })}
    <button type="button" className="chamber-pill" onClick={()=>onChange({})}>Reset hands and toes</button>
  </fieldset>;
}

import React,{useState} from 'react';
import use3DStore from '../../store/use3DStore';
import {ANIMATION_PRESETS} from './animationPresets';
import './AnimationPanel.css';

const SPEED_STEPS=[0.25,0.5,0.75,1,1.25,1.5,2,3];
const nearestSpeedIndex=speed=>SPEED_STEPS.reduce((best,value,index)=>Math.abs(value-speed)<Math.abs(SPEED_STEPS[best]-speed)?index:best,0);
const descriptions={standing:'Neutral reference for inspecting your avatar.',sitting:'Seated presentation pose; no chair is supplied.',flex:'Show upper-body definition.',squat:'Bent-leg presentation and clothing inspection.',tpose:'Technical rig reference with arms extended.',idle:'Subtle standing movement.',walking:'Repeating walk preview.',running:'Repeating run preview.',jumping:'Repeating jumping-jack preview.',wave:'Repeating greeting gesture.'};
export default function AnimationPanel({inline=false,onSelect}) {
  const [open,setOpen]=useState(inline);
  const animation=use3DStore(s=>s.animationState);
  const workspace=use3DStore(s=>s.avatarWorkspace);
  const viewMode=use3DStore(s=>s.viewMode);
  const reducedMotion=use3DStore(s=>s.rendererQualityTelemetry.reducedMotion);
  const setAnimation=use3DStore(s=>s.setAnimation);
  const toggleAnimation=use3DStore(s=>s.toggleAnimation);
  const setAnimationSpeed=use3DStore(s=>s.setAnimationSpeed);
  const active=ANIMATION_PRESETS.find(p=>p.id===animation.animationId);
  const custom=workspace.poseStudio?.[workspace.avatarContext]?.enabled;
  const neutral=viewMode!=='SOLO' || (workspace.inspectorOpen && ['measurements','anatomy'].includes(workspace.inspectorSection));
  const select=id=>{onSelect?.(id);setAnimation(id,{playing:false,speed:animation.speed});};
  const speedIndex=nearestSpeedIndex(animation.speed);
  const cards=presets=><div className="anim-panel__grid">{presets.map(preset=><button type="button" key={preset.id} className={`anim-panel__card${active?.id===preset.id?' anim-panel__card--active':''}`}
    aria-label={preset.label} aria-pressed={active?.id===preset.id} title={descriptions[preset.id]} id={`anim-card-${preset.id}`} onClick={()=>select(preset.id)}>
    <span className="anim-panel__card-label">{preset.id==='standing'?'Neutral standing':preset.label}</span><small>{descriptions[preset.id]}</small>
  </button>)}</div>;
  return <section className={`anim-panel${open?' anim-panel--open':''}${inline?' anim-panel--inline':''}`}>
    <button type="button" className="anim-panel__trigger" aria-label="Pose and motion controls" aria-expanded={open} onClick={()=>setOpen(!open)}>{active?.id==='standing'?'Neutral standing':active?.label || 'Pose and motion'} <span aria-hidden="true">{open?'▴':'▾'}</span></button>
    {open && <div className="anim-panel__dropdown" role="region" aria-label="Animation controls">
      <p className="chamber-note" role="status">{neutral?'Neutral preview is used for measurements and comparisons.':custom?'Custom pose active · motion is paused.':active?.loop?(animation.playing?'Motion playing':'Motion paused'):'Static pose active'}</p>
      <h4>Pose presets</h4>{cards(ANIMATION_PRESETS.filter(p=>!p.loop && p.id!=='tpose'))}
      <details className="avatar-secondary-tools"><summary>Technical poses</summary>{cards(ANIMATION_PRESETS.filter(p=>p.id==='tpose'))}</details>
      <h4>Motion previews</h4><p className="chamber-note">Choose a motion, then press Play. Pause to inspect clothing.</p>{cards(ANIMATION_PRESETS.filter(p=>p.loop))}
      {active?.loop && <div className="anim-panel__controls">
        <button type="button" className="chamber-pill" id="anim-play-pause" disabled={Boolean(reducedMotion || neutral)} aria-label={animation.playing?'Pause animation':'Play animation'} onClick={()=>{if(!animation.playing)onSelect?.(active.id);toggleAnimation();}}>{animation.playing?'Pause':'Play'} {active.label.toLowerCase()}</button>
        {reducedMotion && <p className="chamber-note">Motion is paused by your reduced-motion preference.</p>}
        <label className="workspace-field"><span>Speed</span><select aria-label="Animation speed" value={String(SPEED_STEPS[speedIndex])} onChange={event=>setAnimationSpeed(Number(event.target.value))}><option value="0.5">Slow · 0.5×</option><option value="1">Normal · 1×</option><option value="1.5">Fast · 1.5×</option>{![0.5,1,1.5].includes(SPEED_STEPS[speedIndex]) && <option value={SPEED_STEPS[speedIndex]}>{animation.speed}×</option>}</select></label>
        <details className="avatar-secondary-tools"><summary>Advanced speed</summary><label className="avatar-range-field"><span>Playback speed <output>{animation.speed}×</output></span><input type="range" aria-label="Advanced animation speed" min={0} max={SPEED_STEPS.length-1} step={1} value={speedIndex} onChange={event=>setAnimationSpeed(SPEED_STEPS[Number(event.target.value)])}/></label></details>
      </div>}
    </div>}
  </section>;
}

import React from 'react';
import { SPACE_SKY_PRESETS } from '../../lib/spaceSky';
import { AVATAR_DENSITY_OPTIONS, AVATAR_GUIDE_OPTIONS, AVATAR_PANEL_WIDTH, AVATAR_EXPOSURE, AVATAR_EFFECT_OPTIONS, AVATAR_CAMERA_MODES, resolveAvatarEffects } from '../../lib/avatarPresentation';

export default function AvatarViewOptions({ preferences, onChange, cinematic, onEffectChange, gpuTier, reducedMotion, onReset, saveStatus }) {
  const active = resolveAvatarEffects({ cinematic, gpuTier, reducedMotion, mode:gpuTier === 'HIGH' ? 'FULL' : 'PARTIAL' });
  return <div className="avatar-view-options">
    <fieldset><legend>Camera and capture</legend>
      <label className="workspace-switch"><span>Natural idle motion<small>Subtle breathing, blinking and eye movement. Paused for measurements, comparisons, image capture and reduced motion.</small></span><input aria-label="Natural idle motion" type="checkbox" checked={preferences.naturalMotion} onChange={e=>onChange({naturalMotion:e.target.checked})}/></label>
      <label className="workspace-field"><span>Camera mode</span><select aria-label="Camera mode" value={preferences.cameraMode} onChange={e=>onChange({cameraMode:e.target.value,...(e.target.value==='HANGING'?{showStage:false}:{})})}>{AVATAR_CAMERA_MODES.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <p>Turntable circles at one angle. Free orbit tilts above the floor. Floating removes the floor and allows views from below.</p>
      <p>Closest zoom follows the available skin detail. Zooming beyond that point would enlarge pixels rather than reveal more anatomy.</p>
      <label className="avatar-range-field"><span>Rotation speed <output>{preferences.autoRotateSpeed} °/s</output></span><input type="range" aria-label="Auto rotation speed" min="4" max="30" step="1" value={preferences.autoRotateSpeed} onChange={e=>onChange({autoRotateSpeed:Number(e.target.value)})}/></label>
      <label className="workspace-field"><span>Image resolution</span><select aria-label="Capture resolution" value={preferences.captureScale} onChange={e=>onChange({captureScale:Number(e.target.value)})}><option value="1">Standard · 1×</option><option value="2">High · 2×</option><option value="4">Print · 4×</option></select></label>
      <small>Export and sharing always cover private anatomy. Large images are limited to the device’s supported size.</small>
    </fieldset>
    <fieldset><legend>Make this workspace yours</legend><p>Uses your app theme and palette. Layout choices are saved separately from body measurements.</p>
      <label className="workspace-field"><span>Spacing</span><select aria-label="Avatar spacing" value={preferences.density} onChange={e => onChange({ density:e.target.value })}>{AVATAR_DENSITY_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
      <label className="workspace-field"><span>Measurement help</span><select aria-label="Measurement help detail" value={preferences.guideDetail} onChange={e => onChange({ guideDetail:e.target.value })}>{AVATAR_GUIDE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
      <label className="avatar-range-field"><span>Inspector width <output>{preferences.inspectorWidth} px</output></span><input aria-label="Inspector width" type="range" min={AVATAR_PANEL_WIDTH.min} max={AVATAR_PANEL_WIDTH.max} step={AVATAR_PANEL_WIDTH.step} value={preferences.inspectorWidth} onChange={e => onChange({ inspectorWidth:Number(e.target.value) })}/><small>Applies when the model and inspector fit side by side.</small></label>
      <label className="workspace-switch"><span>Interface effects<small>Subtle selection feedback and panel transitions.</small></span><input aria-label="Interface effects" type="checkbox" checked={preferences.interfaceEffects} onChange={e => onChange({ interfaceEffects:e.target.checked })}/></label>
      <div className="avatar-options-footer"><button type="button" className="chamber-pill" onClick={onReset}>Reset workspace layout</button><span role="status">{saveStatus === 'saving' ? 'Saving layout…' : saveStatus === 'error' ? 'Layout save failed. Change an option to retry.' : saveStatus === 'saved' ? 'Layout saved' : 'Default layout'}</span></div>
    </fieldset>
    <fieldset><legend>Model background</legend><p>Background and lighting are independent. These choices are saved with your workspace.</p>
      <label className="workspace-field"><span>Background</span><select aria-label="Model background" value={preferences.backgroundMode} onChange={e=>onChange({backgroundMode:e.target.value})}><option value="scene">Scene preset</option><option value="space">Space sky</option><option value="color">Custom color</option><option value="gradient">Custom gradient</option></select></label>
      {preferences.backgroundMode === 'space' && <>
        <label className="workspace-field"><span>Space sky</span><select aria-label="Space sky" value={preferences.spaceSky} onChange={e=>onChange({spaceSky:e.target.value})}>{SPACE_SKY_PRESETS.map(preset=><option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>
        <p>{SPACE_SKY_PRESETS.find(preset=>preset.id===preferences.spaceSky)?.description} Skies stay still and appear in saved images. Hide the stage or choose Floating for an open view.</p>
      </>}
      {['color','gradient'].includes(preferences.backgroundMode) && <label className="workspace-field"><span>{preferences.backgroundMode === 'gradient' ? 'Top color' : 'Background color'}</span><input type="color" aria-label="Background color" value={preferences.backgroundColor} onChange={e=>onChange({backgroundColor:e.target.value})}/></label>}
      {preferences.backgroundMode === 'gradient' && <label className="workspace-field"><span>Bottom color</span><input type="color" aria-label="Background bottom color" value={preferences.backgroundBottomColor} onChange={e=>onChange({backgroundBottomColor:e.target.value})}/></label>}
      <label className="workspace-switch"><span>Stage floor and decorations<small>Hide the stage for a plain background.</small></span><input type="checkbox" aria-label="Stage floor and decorations" checked={preferences.showStage} onChange={e=>onChange({showStage:e.target.checked,...(e.target.checked && preferences.cameraMode==='HANGING'?{cameraMode:'ORBIT'}:{})})}/></label>
    </fieldset>
    <fieldset><legend>Light and finishing effects</legend><p>Effects keep your measurements unchanged. Availability follows the quality tier and reduced-motion preference.</p>
      <label className="workspace-field"><span>Lighting</span><select aria-label="Model lighting" value={preferences.lightingMode} onChange={e=>onChange({lightingMode:e.target.value})}><option value="neutral">Neutral inspection</option><option value="cinematic">Cinematic scene</option></select></label>
      <label className="avatar-range-field"><span>Exposure <output>{Number(cinematic.exposure).toFixed(2)}</output></span><input type="range" aria-label="Scene exposure" min={AVATAR_EXPOSURE.min} max={AVATAR_EXPOSURE.max} step={AVATAR_EXPOSURE.step} value={cinematic.exposure} onChange={e => onEffectChange('exposure',Number(e.target.value))}/></label>
      {AVATAR_EFFECT_OPTIONS.map(effect => {
        const limited = gpuTier === 'LOW' || effect.minimumTier === 'HIGH' && gpuTier !== 'HIGH' || effect.motionSensitive && reducedMotion;
        return <label className="workspace-switch" key={effect.key}><span>{effect.label}<small>{limited ? effect.motionSensitive && reducedMotion ? 'Paused by reduced-motion preference' : `Requires ${effect.minimumTier === 'HIGH' ? 'high' : 'balanced or high'} quality` : active[effect.key] ? 'Active in preview' : 'Off'}</small></span><input aria-label={effect.label} type="checkbox" checked={Boolean(cinematic[effect.key])} disabled={limited} onChange={e => onEffectChange(effect.key,e.target.checked)}/></label>;
      })}
    </fieldset>
  </div>;
}

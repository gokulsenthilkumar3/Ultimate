import {HUMAN_SURFACE,microStrength} from '../../lib/humanSurface';
export default function SurfaceDetailControls({metrics,onChange}){
  const value=microStrength(metrics.skinMicroDetail),range=HUMAN_SURFACE.micro.strength;
  return <fieldset><legend>Skin surface detail</legend><p className="chamber-note">A seamless pore tile adds fine relief and roughness. It follows the skin and fades below a pixel. Performance quality pauses this layer.</p>
    <label className="avatar-range-field"><span>Pore detail<output>{Math.round(value*100)}%</output></span><input type="range" aria-label="Pore detail" min={range.min} max={range.max} step={range.step} value={value} onChange={event=>onChange('skinMicroDetail',Number(event.target.value))}/></label>
    <button type="button" className="chamber-pill" onClick={()=>onChange('skinMicroDetail',range.default)}>Reset surface detail</button>
  </fieldset>;
}

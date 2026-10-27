import {HUMAN_SURFACE,microStrength} from '../../lib/humanSurface';
import {APPEARANCE_DETAIL,resolveHumanRealism} from '../../lib/appearanceDetail';
export default function SurfaceDetailControls({metrics,onChange}){
  const value=microStrength(metrics.skinMicroDetail),range=HUMAN_SURFACE.micro.strength;
  const realism=resolveHumanRealism(metrics),realismRange=APPEARANCE_DETAIL.humanRealism;
  return <fieldset><legend>Skin surface detail</legend>
    <label className="avatar-range-field"><span>Human appearance detail<output>{Math.round(realism)}%</output></span><input type="range" aria-label="Human appearance detail" min={realismRange.min} max={realismRange.max} step={realismRange.step} value={realism} onChange={event=>onChange(realismRange.key,Number(event.target.value))}/></label>
    <p className="chamber-note">Blend from smooth skin at 0% to full skin surface detail at 100%, using your chosen settings. This is a visual control, not a human likeness or medical accuracy score. Your measurements, anatomy, skin color and cosmetic settings stay the same.</p>
    <p className="chamber-note">A seamless pore tile adds fine relief and roughness. It follows the skin and fades below a pixel. Performance quality pauses this layer.</p>
    <label className="avatar-range-field"><span>Pore detail<output>{Math.round(value*100)}%</output></span><input type="range" aria-label="Pore detail" min={range.min} max={range.max} step={range.step} value={value} onChange={event=>onChange('skinMicroDetail',Number(event.target.value))}/></label>
    <button type="button" className="chamber-pill" onClick={()=>onChange('skinMicroDetail',range.default)}>Reset surface detail</button>
  </fieldset>;
}

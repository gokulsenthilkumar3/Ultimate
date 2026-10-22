import { EYE_APPEARANCE, resolveEyeAppearance } from '../../lib/eyeAppearance';
import { APPEARANCE_DETAIL, appearanceSeed } from '../../lib/appearanceDetail';

export default function EyeAppearanceControls({ metrics, onChange }) {
  const eye = resolveEyeAppearance(metrics);
  return <fieldset className="chamber-editor__section"><legend>Eye appearance</legend>
    <p className="chamber-note">Iris detail and pupil sizes are cosmetic preview settings. Exposure response follows the scene exposure control.</p>
    <div className="workspace-swatch-row">{EYE_APPEARANCE.shades.map(shade =>
      <button type="button" key={shade.id} title={shade.label} aria-label={`Iris shade: ${shade.label}`} aria-pressed={eye.color === shade.hex}
        style={{ background: shade.hex }} onClick={() => onChange('eyeColor', shade.hex)} />)}</div>
    <label className="workspace-field"><span>Custom iris color</span><input type="color" aria-label="Custom iris color" value={eye.color} onChange={event => onChange('eyeColor', event.target.value)} /></label>
    <label className="workspace-field"><span>Pupil behaviour</span><select aria-label="Pupil behaviour" value={eye.pupilMode} onChange={event => onChange('eyePupilMode', event.target.value)}>
      {EYE_APPEARANCE.pupilModes.map(mode => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
    </select></label>
    {EYE_APPEARANCE.controls.map(control => <label className="avatar-range-field" key={control.key}>
      <span>{control.label}<output>{control.unit === '%' ? Math.round(eye[control.property] * 100) : eye[control.property].toFixed(1)}{control.unit}</output></span>
      <input type="range" aria-label={control.label} min={control.min} max={control.max} step={control.step} value={eye[control.property]}
        disabled={control.property === 'pupilSizeMm' && eye.pupilMode !== 'fixed'}
        onChange={event => onChange(control.key, Number(event.target.value))} />
    </label>)}
    {eye.pupilMode === 'exposure' && <p className="chamber-note">Pupils contract at higher exposure and widen at lower exposure. Fixed size is retained for when you switch back. Reduced motion and still captures settle immediately.</p>}
    <label className="workspace-switch"><span>Dark iris rim</span><input type="checkbox" aria-label="Dark iris rim" checked={eye.limbalRing} onChange={event => onChange('irisLimbalRing', event.target.checked)} /></label>
    <label className="workspace-field"><span>Iris pattern seed</span><input type="number" aria-label="Iris pattern seed" {...APPEARANCE_DETAIL.seed} value={eye.seed}
      onChange={event => { if (event.target.value !== '') onChange('eyeSeed', appearanceSeed(event.target.value)); }} /></label>
  </fieldset>;
}

import { APPEARANCE_DETAIL, resolveHairDetail } from '../../lib/appearanceDetail';

export default function HairDetailControls({ metrics, onChange }) {
  const hair = resolveHairDetail(metrics);
  return <fieldset className="chamber-editor__section"><legend>Hair appearance</legend>
    <p className="chamber-note">Shades, coverage and silver strands apply to the existing hair asset. They do not change its length.</p>
    <div className="workspace-swatch-row">{APPEARANCE_DETAIL.hair.shades.map(shade =>
      <button type="button" key={shade.id} title={shade.label} aria-label={`Hair shade: ${shade.label}`} aria-pressed={metrics.hairColor?.toLowerCase() === shade.hex}
        style={{ background: shade.hex }} onClick={() => onChange('hairColor', shade.hex)} />)}</div>
    <label className="workspace-field"><span>Custom hair color</span><input aria-label="Custom hair color" type="color" value={/^#[\da-f]{6}$/i.test(metrics.hairColor || '') ? metrics.hairColor : APPEARANCE_DETAIL.hair.defaults.color} onChange={event => onChange('hairColor', event.target.value)} /></label>
    {APPEARANCE_DETAIL.hair.controls.map(({ property, key, label, min, max, step }) =>
      <label className="avatar-range-field" key={key}><span>{label}<output>{Math.round(hair[property] * 100)}%</output></span>
        <input aria-label={label} type="range" min={min} max={max} step={step} value={hair[property]} onChange={event => onChange(key, Number(event.target.value))} />
      </label>)}
    <label className="workspace-field"><span>Hair pattern seed</span><input type="number" aria-label="Hair pattern seed" {...APPEARANCE_DETAIL.seed} value={hair.seed} onChange={event => { if (event.target.value !== '') onChange('hairSeed', Number(event.target.value)); }} /></label>
    <small>Keep the seed to retain the same silver strands and thinning pattern.</small>
  </fieldset>;
}

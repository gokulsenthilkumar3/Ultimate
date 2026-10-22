import { APPEARANCE_DETAIL, resolveFreckles } from '../../lib/appearanceDetail';

export default function FreckleControls({ metrics, onChange }) {
  const freckles = resolveFreckles(metrics);
  return <fieldset className="chamber-editor__section"><legend>Freckles</legend>
    <p className="chamber-note">Seeded cosmetic pigment follows the skin through poses and body changes. Zoom to the face or shoulders to see the detail.</p>
    {APPEARANCE_DETAIL.freckles.controls.map(control => <label className="avatar-range-field" key={control.key}>
      <span>{control.label}<output>{control.unit === '%' ? Math.round(freckles[control.property] * 100) : freckles[control.property].toFixed(2)}{control.unit}</output></span>
      <input type="range" aria-label={control.label} min={control.min} max={control.max} step={control.step} value={freckles[control.property]} onChange={event => onChange(control.key, Number(event.target.value))} />
    </label>)}
    <label className="workspace-field"><span>Freckle pattern seed</span><input type="number" aria-label="Freckle pattern seed" {...APPEARANCE_DETAIL.seed} value={freckles.seed} onChange={event => { if (event.target.value !== '') onChange('skinFreckleSeed', Number(event.target.value)); }} /></label>
    <button type="button" className="chamber-pill" onClick={() => onChange('skinFreckleDensity', 0)}>Hide freckles</button>
  </fieldset>;
}

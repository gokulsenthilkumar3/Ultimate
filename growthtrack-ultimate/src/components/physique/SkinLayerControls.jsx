import { resolveSkinAppearance } from '../body3d/skinAppearance';
import { TAN_LINE_PATTERNS, resolveTanPattern } from '../body3d/skinTanLines';

export default function SkinLayerControls({ metrics, onChange, onReset }) {
  const appearance = resolveSkinAppearance(metrics);
  return <>
    <label className="workspace-field"><span>Undertone</span>
      <select aria-label="Skin undertone" value={appearance.undertone < -.33 ? 'cool' : appearance.undertone > .33 ? 'warm' : 'neutral'} onChange={event => onChange('skinUndertone', event.target.value)}>
        <option value="cool">Cool / pink</option><option value="neutral">Neutral</option><option value="warm">Warm / golden</option>
      </select>
    </label>
    {[{ key: 'skinTan', value: appearance.tan, label: 'Tan amount', help: 'Adds pigment to exposed skin. The selected tan-line pattern protects covered areas.' },
      { key: 'skinFlush', value: appearance.flush, label: 'Skin flush', help: 'Adds a subtle blood-color layer; it does not infer stress or health.' }].map(layer =>
      <label className="avatar-range-field" key={layer.key}><span>{layer.label}<output>{Math.round(layer.value * 100)}%</output></span>
        <input type="range" aria-label={layer.label} min="0" max="1" step=".01" value={layer.value} onChange={event => onChange(layer.key, Number(event.target.value))} />
        <small>{layer.help}</small>
      </label>)}
    <label className="workspace-field"><span>Tan lines</span>
      <select aria-label="Tan-line pattern" aria-describedby="skin-tan-pattern-help" value={resolveTanPattern(metrics.skinTanPattern).id} onChange={event => onChange('skinTanPattern', event.target.value)}>
        {TAN_LINE_PATTERNS.map(pattern => <option key={pattern.id} value={pattern.id}>{pattern.label}</option>)}
      </select>
    </label>
    <p className="chamber-note" id="skin-tan-pattern-help">Choose what covered the skin in the sun. This stays separate from today's outfit. Increase Tan amount to see the pattern. Edges approximate garment coverage.</p>
    <button className="chamber-pill" onClick={onReset}>Reset tan, flush & undertone</button>
  </>;
}

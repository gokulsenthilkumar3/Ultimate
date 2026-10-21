import React, { useId, useMemo, useRef, useState } from 'react';
import { ANATOMY_FIELDS, ANATOMY_REGIONS, anatomyPreviewWarning, createAnatomyCustomization, sanitizeAnatomyNumber, updateAnatomyPath } from '../../lib/anatomyCustomization';
import { getAnatomyMeasurementDefinition } from '../../lib/bodyMeasurementDefinitions';
import MeasurementHelp from './MeasurementHelp';

const SECTIONS = [
  ['penis', 'Penis'], ['scrotum', 'Scrotum'], ['buttocks', 'Buttocks'], ['skin', 'Skin regions'],
];

function NumberField({ label, unit, value, onChange, displayUnit = 'cm', step = '0.1', ariaLabel, onHelp, onFocusGuide, support, warning }) {
  const linear = unit === 'cm';
  const shown = value == null ? '' : linear && displayUnit === 'in' ? (Number(value) / 2.54).toFixed(2) : value;
  const [draft, setDraft] = useState(String(shown ?? ''));
  const [editing,setEditing]=useState(false);
  const inputRef=useRef(null);
  const discardOnBlur = useRef(false);
  const [error,setError]=useState(null);
  const messageId=useId();
  const commit = () => {
    if(inputRef.current?.validity.badInput) {setError('Enter a finite, non-negative number.');return;}
    if (draft === String(shown ?? '')) return; // Opening/closing help must not save an unchanged field.
    const parsed = sanitizeAnatomyNumber(draft.trim());
    if(draft.trim()!=='' && parsed==null) { setError('Enter a finite, non-negative number.'); return; }
    setError(null);
    onChange(parsed == null ? null : linear && displayUnit === 'in' ? parsed * 2.54 : parsed);
  };
  return <div className="anatomy-custom-field"><div className="anatomy-custom-field__label"><label><span>{label}<small>{linear ? displayUnit : unit}</small></span><input ref={inputRef} type="number" min="0" step={step} inputMode="decimal" value={editing || error ? draft : String(shown ?? '')} placeholder="Not recorded" onFocus={() => { setDraft(String(shown ?? ''));setEditing(true);onFocusGuide?.(); }} onChange={(event) => setDraft(event.target.value)} onBlur={() => { setEditing(false); if (discardOnBlur.current) discardOnBlur.current = false; else commit(); }} onKeyDown={(event) => {
    if (event.key === 'Enter') { event.currentTarget.blur(); }
    if (event.key === 'Escape') { discardOnBlur.current = true; setError(null);setDraft(String(shown ?? '')); event.currentTarget.blur(); }
  }} aria-invalid={Boolean(error)} aria-describedby={error || warning ? messageId : undefined} aria-label={ariaLabel || `${label} ${displayUnit === 'in' && linear ? '(in)' : `(${unit})`}`} /></label>{onHelp && <button type="button" aria-label={`How to measure ${label}`} onClick={onHelp}>Show me</button>}</div>{support && <p className="anatomy-custom-field__support">{support}</p>}{(error || warning) && <p id={messageId} className="anatomy-custom-field__warning" role="status">{error || warning}</p>}</div>;
}

function ShapeField({ label, value, onChange, min = 0, max = 100, unit = '%', defaultValue = 0 }) {
  const id=useId();
  const safe = value!=null && Number.isFinite(Number(value)) ? Number(value) : defaultValue;
  return <label className="anatomy-custom-shape" htmlFor={id}><span>{label}<output htmlFor={id}>{Number(safe.toFixed(1))}{unit}</output></span><input id={id} aria-label={label} aria-valuetext={`${Number(safe.toFixed(1))}${unit}`} type="range" min={min} max={max} step="1" value={safe} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

/** Private owner-authored adult body measurements and appearance preferences. */
export default function AnatomyCustomizationPanel({ value, onSave, onInspect, onPreviewChange, evidence, preview, targetContext, previewSupported = true }) {
  const [section, setSection] = useState('penis');
  const [localTarget, setTarget] = useState('current');
  const target=targetContext || localTarget;
  const [state, setState] = useState(preview?.state || 'resting');
  const [activeHelp, setActiveHelp] = useState(null);
  const guideRef = useRef(null);
  const anatomy = useMemo(() => createAnatomyCustomization(value), [value]);
  const selected = anatomy[target];
  const displayUnit = anatomy.preferences.displayUnit === 'in' ? 'in' : 'cm';
  const set = (path, next) => {
    let updated=updateAnatomyPath(anatomy,[target,...path],next);
    if(path[0]==='penis' && path[2]==='measurements' && ['widthCm','depthCm','midCircumferenceCm'].includes(path[3])) updated=updateAnatomyPath(updated,[target,'penis',path[1],'inputMode'],['widthCm','depthCm'].includes(path[3])?'dimensions':'circumference');
    if(path[0]==='scrotum' && ['leftTestis','rightTestis'].includes(path[1]) && ['lengthCm','widthCm','depthCm','volumeMl'].includes(path[2])) updated=updateAnatomyPath(updated,[target,'scrotum',path[1],'inputMode'],path[2]==='volumeMl'?'volume':'dimensions');
    if(path[0]==='buttocks' && path[1]==='measurements') updated=updateAnatomyPath(updated,[target,'buttocks','measurements','inputMode'],path[2]==='volumeMl'?'volume':'dimensions');
    onSave(updated);
  };
  const fields = (rows, basePath) => rows.map(([key, label, unit]) => {
    const help = getAnatomyMeasurementDefinition(key, basePath[0] === 'scrotum' && basePath[1] !== 'envelope' ? 'testis' : basePath[0], state);
    const showHelp = (scroll = false) => { setActiveHelp({ definition: help, label }); if (scroll) requestAnimationFrame(() => guideRef.current?.scrollIntoView({ block: 'nearest' })); };
    const profile = target === 'current' ? 'current' : 'goal';
    const fieldName = basePath[0] === 'penis' && key === 'lengthCm'
      ? `${state === 'resting' ? 'Resting' : 'Erect'} length ${profile}`
      : basePath[0] === 'penis' && key === 'midCircumferenceCm'
        ? `${state === 'resting' ? '' : 'Erect '}Mid-shaft circumference ${profile}`.trim()
        : `${label} ${profile}`;
    return (
    <NumberField key={`${basePath.join('.')}.${key}`} label={label} unit={unit} displayUnit={displayUnit}
      ariaLabel={`${fieldName} (${displayUnit === 'in' && unit === 'cm' ? 'in' : unit})`}
      value={basePath.reduce((node, part) => node?.[part], selected)?.[key]}
      onHelp={() => showHelp(true)} onFocusGuide={() => showHelp()} support={!previewSupported?'Saved record · loaded asset needs a section layout':basePath[0] === 'scrotum' && basePath[1] !== 'envelope' ? 'Optional schematic guide · enable 3D guides to see it' : basePath[0] === 'buttocks' ? 'Changes posterior envelope · approximate fit' : 'Updates the 3D surface'}
      warning={anatomyPreviewWarning(key,basePath.reduce((node,part)=>node?.[part],selected)?.[key],basePath[0])}
      onChange={(next) => set([...basePath, key], next)} />
    );
  });

  return (
    <section className="anatomy-customizer" aria-label="Private anatomy customization">
      <div className="anatomy-customizer__top">
        <div><strong>Body customization</strong><p>Values are private to your physique profile. Measurements are optional.</p></div>
        <label><span>Profile</span><select value={target} onChange={(event) => {setTarget(event.target.value);onPreviewChange?.({target:event.target.value});}}><option value="current">Current</option><option value="goal">Goal</option></select></label>
        <label><span>Units</span><select value={displayUnit} onChange={(event) => onSave(updateAnatomyPath(anatomy, ['preferences', 'displayUnit'], event.target.value))}><option value="cm">cm</option><option value="in">in</option></select></label>
      </div>

      <details className="workspace-anatomy-info" open>
        <summary><strong>Live 3D preview</strong></summary>
        <p>Dimensions and shape controls update a procedural surface. Suggested ranges are warnings; values outside them are kept. Unspecified dimensions use a generic preview. Body shape and pose can change achieved dimensions.</p>
        {!previewSupported && <p role="status" className="anatomy-custom-field__warning">This asset has no compatible section layout. Records remain editable; choose the bundled body asset to preview all fields.</p>}
        <label className="workspace-switch"><span>3D measurement guides<small>Section rings, centerline and optional internal ellipsoid guides. Internal guides are schematic.</small></span><input type="checkbox" aria-label="3D anatomy guides" checked={Boolean(preview?.guides)} onChange={event=>onPreviewChange?.({guides:event.target.checked})}/></label>
        <button type="button" className="chamber-pill" onClick={()=>onInspect?.(section==='buttocks'?'glutes':'anatomy')}>Inspect edited region</button>
        {evidence && <dl className="anatomy-calibration-readout" aria-label="Generated surface dimensions">
          <div><dt>Centerline before body pose</dt><dd>{evidence.centrelineCm.toFixed(1)} cm</dd></div>
          <div><dt>Middle section perimeter</dt><dd>{evidence.midCircumferenceCm.toFixed(1)} cm</dd></div>
          <div><dt>Middle width × depth</dt><dd>{evidence.midWidthCm.toFixed(1)} × {evidence.midDepthCm.toFixed(1)} cm</dd></div>
        </dl>}
      </details>

      <nav className="anatomy-customizer__tabs" aria-label="Body region">
        {SECTIONS.map(([id, label]) => <button key={id} type="button" className={section === id ? 'active' : ''} aria-pressed={section === id} onClick={() => { setSection(id); setActiveHelp(null);onPreviewChange?.({section:id}); }}>{label}</button>)}
      </nav>

      {section === 'penis' && <>
        <div className="anatomy-customizer__states" aria-label="Measurement state">
          {['resting', 'erect'].map((id) => <button type="button" key={id} className={state === id ? 'active' : ''} aria-pressed={state === id} onClick={() => { setState(id); setActiveHelp(null);onPreviewChange?.({state:id}); }}>{id === 'resting' ? 'Resting' : 'Erect'}</button>)}
        </div>
        <p className="anatomy-customizer__note">Record each state separately. The last edited cross-section input chooses the preview mode; other records are retained.</p>
        <label className="anatomy-customizer__select"><span>Middle section input</span><select aria-label="Middle section input" value={selected.penis[state].inputMode || 'circumference'} onChange={event=>set(['penis',state,'inputMode'],event.target.value)}><option value="circumference">Circumference + ovalness</option><option value="dimensions">Width + depth</option></select></label>
        <div className="anatomy-customizer__grid">{fields(ANATOMY_FIELDS[state], ['penis', state, 'measurements'])}</div>
        <div className="anatomy-customizer__group"><h5>Shape and presentation</h5>
          <ShapeField label="Base to tip taper" defaultValue={50} value={selected.penis[state].shape?.taper} onChange={(n) => set(['penis', state, 'shape', 'taper'], n)} />
          <ShapeField label="Cross-section ovalness" defaultValue={50} value={selected.penis[state].shape?.ovalness} onChange={(n) => set(['penis', state, 'shape', 'ovalness'], n)} />
          <ShapeField label="Glans flare" defaultValue={50} value={selected.penis[state].shape?.glansFlare} onChange={(n) => set(['penis', state, 'shape', 'glansFlare'], n)} />
          <ShapeField label="Curvature" value={selected.penis[state].shape?.curvature} min={-60} max={60} unit="°" onChange={(n) => set(['penis', state, 'shape', 'curvature'], n)} />
          <ShapeField label="Bend direction" value={selected.penis[state].shape?.curvatureDirectionDeg} min={-180} max={180} unit="°" onChange={(n)=>set(['penis',state,'shape','curvatureDirectionDeg'],n)} />
          <ShapeField label="Elevation from horizontal" value={selected.penis[state].shape?.elevationDeg} defaultValue={state==='erect' ? Math.atan2(.18,.984)*180/Math.PI : 0} min={-85} max={85} unit="°" onChange={(n)=>set(['penis',state,'shape','elevationDeg'],n)} />
          <ShapeField label="Foreskin coverage" value={selected.penis[state].shape?.foreskinCoverage} onChange={(n) => set(['penis', state, 'shape', 'foreskinCoverage'], n)} />
          <ShapeField label="Foreskin retraction" value={selected.penis[state].shape?.foreskinRetraction} onChange={(n)=>set(['penis',state,'shape','foreskinRetraction'],n)} />
          <p className="anatomy-customizer__note">Coverage describes skin forward; retraction draws it back independently in each state. Bend direction: 0° sideways, 90° upward, −90° downward. Unset orientation uses the generic asset. This is a closed surface envelope; inner foreskin and an opening need authored topology.</p>
        </div>
        <label className="anatomy-customizer__select"><span>Measurement method</span><select value={selected.penis[state].measurementMethod || ''} onChange={(event) => set(['penis', state, 'measurementMethod'], event.target.value || null)}><option value="">Not specified</option><option value="visible">Visible junction to tip</option><option value="bone-pressed">Bone pressed</option><option value="manual-estimate">Visual estimate</option></select></label>
      </>}

      {section === 'scrotum' && <>
        <p className="anatomy-customizer__note">The external sac and each testicle are recorded separately. Side differences are optional.</p>
        <div className="anatomy-customizer__group"><h5>External sac</h5><div className="anatomy-customizer__grid">{fields(ANATOMY_FIELDS.scrotum, ['scrotum', 'envelope'])}</div>
          <ShapeField label="Fold detail" value={selected.scrotum.envelope?.foldDetail} onChange={(n) => set(['scrotum', 'envelope', 'foldDetail'], n)} />
          <ShapeField label="Left-right asymmetry" value={selected.scrotum.envelope?.asymmetry} min={-50} max={50} onChange={(n) => set(['scrotum', 'envelope', 'asymmetry'], n)} />
          <label className="anatomy-customizer__select"><span>Presentation</span><select value={selected.scrotum.presentation || 'relaxed'} onChange={(event) => set(['scrotum', 'presentation'], event.target.value)}><option value="relaxed">Relaxed</option><option value="contracted">Contracted</option></select></label>
        </div>
        {['leftTestis', 'rightTestis'].map((side) => <div className="anatomy-customizer__group" key={side}><h5>{side === 'leftTestis' ? 'Left testicle (optional)' : 'Right testicle (optional)'}</h5><div className="anatomy-customizer__grid">{fields(ANATOMY_FIELDS.testis, ['scrotum', side])}</div><label className="anatomy-customizer__select"><span>Volume method</span><select value={selected.scrotum[side]?.volumeMethod || ''} onChange={(event) => set(['scrotum', side, 'volumeMethod'], event.target.value || null)}><option value="">Not specified</option><option value="ultrasound-lambert">Ultrasound (Lambert estimate)</option><option value="ellipsoid">Ellipsoid estimate</option><option value="manual-estimate">Visual estimate</option></select></label></div>)}
      </>}

      {section === 'buttocks' && <>
        <p className="anatomy-customizer__note">Circumference, pelvic breadth, and rear projection describe different dimensions.</p>
        <div className="anatomy-customizer__grid">{fields(ANATOMY_FIELDS.buttocks, ['buttocks', 'measurements'])}<NumberField label="Pelvic breadth" unit="cm" displayUnit={displayUnit} value={selected.buttocks.measurements?.pelvicBreadthCm} onChange={(n) => set(['buttocks', 'measurements', 'pelvicBreadthCm'], n)} /></div>
        <div className="anatomy-customizer__group"><h5>Contour</h5>
          <ShapeField label="Upper fullness" defaultValue={50} value={selected.buttocks.shape?.upperFullness} onChange={(n) => set(['buttocks', 'shape', 'upperFullness'], n)} />
          <ShapeField label="Lower fullness" defaultValue={50} value={selected.buttocks.shape?.lowerFullness} onChange={(n) => set(['buttocks', 'shape', 'lowerFullness'], n)} />
          <ShapeField label="Left-right difference" value={selected.buttocks.shape?.asymmetry} min={-50} max={50} onChange={(n) => set(['buttocks', 'shape', 'asymmetry'], n)} />
          <ShapeField label="Cleft definition" value={selected.buttocks.shape?.cleft} onChange={(n) => set(['buttocks', 'shape', 'cleft'], n)} />
          <ShapeField label="Hip dip" value={selected.buttocks.shape?.hipDip} onChange={(n) => set(['buttocks', 'shape', 'hipDip'], n)} />
          <ShapeField label="Thigh transition" value={selected.buttocks.shape?.thighTransition} onChange={(n) => set(['buttocks', 'shape', 'thighTransition'], n)} />
        </div>
      </>}

      {section === 'skin' && <>
        <p className="anatomy-customizer__note">Each region inherits your global skin tone until you choose an override.</p>
        {ANATOMY_REGIONS.map(([id, label]) => {
          const region = selected.skinRegions[id] || {};
          return <div className="anatomy-customizer__skin-row" key={id}>
            <strong>{label}</strong>
            <label><span>Override color</span><input type="color" value={region.color || '#b77861'} onChange={(event) => set(['skinRegions', id, 'color'], event.target.value)} /></label>
            <label><span>Use local color</span><input type="checkbox" checked={Boolean(region.enabled)} onChange={(event) => set(['skinRegions', id, 'enabled'], event.target.checked)} /></label>
            <ShapeField label="Tan intensity" value={region.tanIntensity} onChange={(n) => set(['skinRegions', id, 'tanIntensity'], n)} />
            <ShapeField label="Tan edge softness" value={region.tanEdge} onChange={(n) => set(['skinRegions', id, 'tanEdge'], n)} />
            <ShapeField label="Surface detail" value={region.surfaceDetail} onChange={(n) => set(['skinRegions', id, 'surfaceDetail'], n)} />
          </div>;
        })}
      </>}

      {activeHelp && <div ref={guideRef} className="anatomy-measurement-help"><MeasurementHelp key={activeHelp.definition.id} definition={activeHelp.definition} label={activeHelp.label} onInspect={onInspect} /><button type="button" className="chamber-pill" onClick={() => setActiveHelp(null)}>Close measurement guide</button></div>}
      <p className="anatomy-customizer__footnote">Saved privately. Surface dimensions, endpoint states, contour and regional appearance update the preview. Testicular records drive optional schematic guides. Volume edits adjust an envelope estimate; they do not establish clinical volume. A bone-pressed record is approximated at the visible junction.</p>
    </section>
  );
}

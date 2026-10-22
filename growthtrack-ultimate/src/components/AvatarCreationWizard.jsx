import React, { useState } from 'react';
import use3DStore from '../store/use3DStore';
import MeasurementInput from './ui/MeasurementInput';
import { FACE_SHAPE_CONTROLS } from './morphEngine/metricsToBlendshapes';
import { BODY_METRIC_MAP } from '../lib/physiqueProfile';
import { getBodyMeasurementDefinition } from '../lib/bodyMeasurementDefinitions';
import { validateBodyMetric } from '../lib/bodyMetricContract';
import useDialogFocus from '../hooks/useDialogFocus';
import { APPEARANCE_DETAIL } from '../lib/appearanceDetail';

const STEPS = ['Scale', 'Measurements', 'Face', 'Hair and skin', 'Proportions', 'Clothing'];

export default function AvatarCreationWizard({ onComplete, onMetric, onAppearance, onMorph, onWardrobe }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const dialogRef = useDialogFocus(true, onComplete);
  const metrics = use3DStore(state => state.cloneA.metrics);
  const weights = use3DStore(state => state.morphOverrides.current);
  const wardrobe = use3DStore(state => state.wardrobeState);
  const fields = step === 0 ? ['height', 'weight'] : step === 1 ? ['chest', 'waist', 'hips', 'shoulderBreadth', 'neck', 'arms', 'thighs', 'calves']
    : step === 4 ? ['torsoLength', 'upperArm', 'lowerArm', 'handLength', 'legLength', 'footLength', 'headCirc'] : [];
  function next() {
    if (!validateBodyMetric('height', metrics.height, { allowEmpty: false }).valid) { setError('Enter height to set the model scale.'); return; }
    setError('');
    if (step === STEPS.length - 1) onComplete(); else setStep(step + 1);
  }
  return <section ref={dialogRef} tabIndex={-1} className="avatar-wizard" role="dialog" aria-modal="true" aria-label="Guided avatar setup">
    <header><h3>{step + 1} of {STEPS.length} · {STEPS[step]}</h3><button type="button" className="chamber-pill" onClick={onComplete}>Close setup</button></header>
    <p>Your edits save to the selected person as you go. Unknown measurements can stay blank. Shape matching is approximate.</p>
    <div className="avatar-wizard__body">
      {fields.map(key => <label key={key} className="workspace-field"><span>{BODY_METRIC_MAP[key].label} ({BODY_METRIC_MAP[key].unit})</span>
        <MeasurementInput aria-label={`Setup ${BODY_METRIC_MAP[key].label}`} metricKey={key} value={metrics[key] ?? null} onCommit={value => onMetric(key, value)} />
        <small>{getBodyMeasurementDefinition(key).site}</small>
      </label>)}
      {step === 2 && <>{FACE_SHAPE_CONTROLS.map(({key, label, min, max, step: increment}) => <label key={key} className="workspace-field"><span>{label}</span>
        <input aria-label={`Setup ${label}`} type="range" min={min} max={max} step={increment} value={weights[key] ?? use3DStore.getState().cloneA.weights[key] ?? 0} onChange={event => onMorph(key, Number(event.target.value))}/>
      </label>)}<p>Open Face → Personal reference to compare with a local photo.</p></>}
      {step === 3 && <>
        <label className="workspace-field"><span>Hair style</span><select value={metrics.hairStyle || 'short'} onChange={event => onAppearance('hairStyle', event.target.value)}>{APPEARANCE_DETAIL.hair.styles.map(({id,available}) => <option key={id} value={id} disabled={!available}>{id}{available ? '' : ' · asset required'}</option>)}</select></label>
        {[['hairColor','Hair color','#2c1a0a'],['skinColor','Skin color','#bc8970'],['eyeColor','Eye color','#6b3b20']].map(([key,label,fallback]) => <label key={key} className="workspace-field"><span>{label}</span><input type="color" value={metrics[key] || fallback} onChange={event => onAppearance(key,event.target.value)}/></label>)}
      </>}
      {step === 5 && <label className="workspace-field"><span>Clothing</span><select value={wardrobe} onChange={event => onWardrobe({preset:event.target.value})}>{['GYM','CASUAL','UNDERWEAR','FORMAL','SWIMWEAR'].map(preset => <option key={preset}>{preset}</option>)}</select></label>}
    </div>
    {error && <p role="alert">{error}</p>}
    <footer><button type="button" className="chamber-pill" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button><button type="button" className="chamber-pill chamber-pill--primary" onClick={next}>{step === STEPS.length - 1 ? 'Finish setup' : 'Next step'}</button></footer>
  </section>;
}

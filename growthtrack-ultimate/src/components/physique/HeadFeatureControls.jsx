import {useId,useState} from 'react';
import {HEAD_FEATURE_GROUPS,findHeadFeatures,headFeatureCapability,headFeatureValue} from '../../lib/headFeatureRegistry';

export default function HeadFeatureControls({overrides={},weights={},diagnostics,interactive=true,onChange,onReset}){
  const [search,setSearch]=useState(''),id=useId();
  const visible=findHeadFeatures(search);
  return <section aria-label="Head shape controls">
    <label className="workspace-field"><span>Find a face feature</span><input type="search" value={search} onChange={event=>setSearch(event.target.value)} aria-label="Find a face feature" placeholder="Nose, eyelids, jaw…"/></label>
    <p className="chamber-note" id={`${id}-units`}>Shape strength uses a unitless 0–1 scale. These adjustments are not measurements or a likeness score. Expressions stay separate.</p>
    {HEAD_FEATURE_GROUPS.map(group=>{
      const features=visible.filter(feature=>feature.group===group.id);
      if(!features.length)return null;
      // A filtered search must not narrow the scope of a region reset.
      const groupFeatures=findHeadFeatures().filter(feature=>feature.group===group.id);
      const editable=groupFeatures.filter(feature=>headFeatureCapability(feature,diagnostics,interactive).available);
      const canReset=editable.some(feature=>overrides[feature.key]!=null);
      return <fieldset key={group.id} className="avatar-head-feature-group"><legend>{group.label}</legend>
        <p className="chamber-note">{group.help}</p>
        {features.map(feature=>{
          const capability=headFeatureCapability(feature,diagnostics,interactive);
          const value=headFeatureValue(feature,overrides,weights),helpId=`${id}-${feature.key}`;
          return <div key={feature.id} className="chamber-morph-row" data-head-feature={feature.id} data-support={capability.state}>
            <label className="chamber-morph-row__header" htmlFor={`${helpId}-input`}><span>{feature.label}</span><output className="chamber-morph-row__value" htmlFor={`${helpId}-input`}>{value.toFixed(2)}</output></label>
            <input id={`${helpId}-input`} type="range" aria-label={feature.label} aria-describedby={`${id}-units ${helpId}`} aria-valuetext={`${value.toFixed(2)} shape strength`} min={feature.inputConstraints.min} max={feature.inputConstraints.max} step={feature.inputConstraints.step} value={value} disabled={!capability.available} onChange={event=>onChange({[feature.key]:Number(event.target.value)})} className="chamber-slider"/>
            <small id={helpId}>{capability.available?feature.help:capability.reason}</small>
          </div>;
        })}
        <button type="button" className="chamber-pill" disabled={!onReset || !canReset} onClick={()=>onReset(editable.map(feature=>feature.key))}>Use measurements: {group.label}</button>
      </fieldset>;
    })}
    {!visible.length && <p role="status">No supported face control matches “{search}”. Try nose, eyes, lips, jaw or ears.</p>}
  </section>;
}

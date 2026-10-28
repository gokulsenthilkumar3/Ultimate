import React,{useId,useState} from 'react';
import {wardrobePieces} from '../../lib/wardrobeInventory';
import {useWardrobeLoadStatus,retryWardrobeAsset} from '../morphEngine/useWardrobeAsset';
import { CLOTHING_OPTIONS, CLOTHING_FITS,CLOTHING_FABRICS,CLOTHING_PATTERNS,CLOTHING_ADJUSTMENTS,wardrobeDefaults } from '../../lib/wardrobePreferences';

function Adjustment({name,value,onChange}) {
  const id=useId(),spec=CLOTHING_ADJUSTMENTS[name];
  return <div className="wardrobe-options__adjustment">
    <label htmlFor={id}><span>{spec.label}</span><output htmlFor={id}>{Number(value).toFixed(spec.step<1?1:0)} {spec.unit}</output></label>
    <input id={id} type="range" min={spec.min} max={spec.max} step={spec.step} value={value} aria-label={`${spec.label} (${spec.unit})`} aria-valuetext={`${value} ${spec.unit}`} aria-describedby={id+'-help'} onChange={event=>onChange({options:{[name]:Number(event.target.value)}})}/>
    <p id={id+'-help'}>{spec.description}</p>
  </div>;
}

export default function WardrobeOptions({preset,preferences,onChange,status,onOpenAnatomy}) {
  const options=preferences.outfits[preset];
  const loading=useWardrobeLoadStatus(preset,options);
  const [resetDraft,setResetDraft]=useState(null);
  if(preset==='ANATOMICAL') return <fieldset className="wardrobe-options"><legend>Anatomical view</legend>
    <p>No clothing is applied in this view. Body dimensions and private anatomy have their own measurement controls.</p>
    <div className="wardrobe-options__actions"><button type="button" className="chamber-pill" onClick={onOpenAnatomy}>Customize anatomy</button><button type="button" className="chamber-pill" onClick={()=>onChange({preset:'UNDERWEAR'})}>Wear underwear</button></div>
  </fieldset>;
  const config=CLOTHING_OPTIONS[preset];
  if(!config || !options) return null;
  return <fieldset className="wardrobe-options"><legend>Customize {config.label.toLowerCase()}</legend>
    <p>{config.description}</p>
    <div className="wardrobe-options__grid">
    <label className="workspace-field"><span>Style</span><select aria-label="Garment style" value={options.variant} onChange={e=>onChange({options:{variant:e.target.value}})}>{config.variants.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
    <label className="workspace-field"><span>Fit</span><select aria-label="Garment fit" value={options.fit} onChange={e=>onChange({options:{fit:e.target.value}})}>{CLOTHING_FITS.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
    </div>
    <p>{wardrobePieces(preset,options.variant).length} {wardrobePieces(preset,options.variant).length===1?'piece':'pieces'} · {wardrobePieces(preset,options.variant).join(' + ')}</p>
    <div className="wardrobe-options__colors" role="group" aria-label="Garment colors">
    {[...(config.top?[['topColor',preset==='FORMAL' && options.variant==='suit'?'Jacket and shirt color':'Top color']]:[]),['bottomColor',config.top?'Bottom color':'Fabric color']].map(([key,label])=><label className="workspace-field" key={key}><span>{label}</span><input type="color" aria-label={label} value={options[key]} onChange={e=>onChange({options:{[key]:e.target.value}})}/></label>)}
    </div>
    <p className="chamber-note" role="status">{loading.status==='loading'?'Preparing outfit geometry…':loading.status==='detailing'?'Outfit ready · adding fabric detail…':loading.status==='error'?'Detailed outfit unavailable. A covered fallback is shown.':loading.status==='detail-error'?'Outfit ready with basic fabric. Some texture detail could not load.':loading.status==='ready'?'Outfit ready.':'The outfit will load with the interactive model.'}</p>
    {['error','detail-error'].includes(loading.status) && <button type="button" className="chamber-pill" onClick={()=>retryWardrobeAsset(preset,options).catch(()=>{})}>Retry outfit loading</button>}
    <details className="wardrobe-options__details"><summary>Fit adjustments</summary>
      <p>Adjust the clothing without changing your body measurements.</p>
      {['easeCm','hemLength','waistRiseCm'].map(name=><Adjustment key={name} name={name} value={options[name]} onChange={onChange}/>)}
    </details>
    <details className="wardrobe-options__details"><summary>Fabric and detail</summary>
      <p>Fabric changes the surface appearance. Drape is not simulated.</p>
    <label className="workspace-field"><span>Fabric</span><select aria-label="Garment fabric" value={options.fabric} onChange={e=>onChange({options:{fabric:e.target.value}})}>{Object.entries(CLOTHING_FABRICS).map(([id,spec])=><option value={id} key={id}>{spec.label}</option>)}</select></label>
    <label className="workspace-field"><span>Surface</span><select aria-label="Garment surface" value={options.pattern} onChange={e=>onChange({options:{pattern:e.target.value}})}>{CLOTHING_PATTERNS.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>

      <label className="workspace-field"><span>Trim color</span><input type="color" aria-label="Trim color" disabled={options.pattern==='source'} value={options.trimColor} onChange={e=>onChange({options:{trimColor:e.target.value}})}/></label>
      <Adjustment name="textureStrength" value={options.textureStrength} onChange={onChange}/>
      <small>{options.pattern==='source'?'Original texture supplies its own trim; the selected fabric colors tint it.':'Trim color changes the visible bands and seams.'}</small>
    </details>
    <div className="wardrobe-options__actions"><button type="button" className="chamber-pill" onClick={()=>{setResetDraft({preset,options});onChange({options:wardrobeDefaults(preset)});}}>Reset this outfit</button>
      {resetDraft?.preset===preset && <button type="button" className="chamber-pill" onClick={()=>{onChange({options:resetDraft.options});setResetDraft(null);}}>Undo outfit reset</button>}
      {status==='error'&&<button type="button" className="chamber-pill" onClick={()=>onChange({})}>Retry outfit save</button>}</div>
    <p className="wardrobe-options__status" role="status">{status==='saving'?'Saving outfit…':status==='error'?'Outfit save failed. Change an option to retry.':status==='saved'?'Outfit saved':'Default outfit'}</p>
    <small>Fit changes the room around your body. It is a visual preview, not a retail clothing size.</small>
  </fieldset>;
}

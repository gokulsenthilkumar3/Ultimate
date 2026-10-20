import React,{useId} from 'react';
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
  if(preset==='ANATOMICAL') return <fieldset className="wardrobe-options"><legend>Anatomical view</legend>
    <p>No clothing is applied in this view. Body dimensions and private anatomy have their own measurement controls.</p>
    <div className="wardrobe-options__actions"><button type="button" className="chamber-pill" onClick={onOpenAnatomy}>Customize anatomy</button><button type="button" className="chamber-pill" onClick={()=>onChange({preset:'UNDERWEAR'})}>Wear underwear</button></div>
  </fieldset>;
  const config=CLOTHING_OPTIONS[preset],options=preferences.outfits[preset];
  if(!config || !options) return null;
  return <fieldset className="wardrobe-options"><legend>Customize {config.label.toLowerCase()}</legend>
    <p>{config.description}</p>
    <div className="wardrobe-options__grid">
    <label className="workspace-field"><span>Style</span><select aria-label="Garment style" value={options.variant} onChange={e=>onChange({options:{variant:e.target.value}})}>{config.variants.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
    <label className="workspace-field"><span>Fit</span><select aria-label="Garment fit" value={options.fit} onChange={e=>onChange({options:{fit:e.target.value}})}>{CLOTHING_FITS.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
    <label className="workspace-field"><span>Fabric</span><select aria-label="Garment fabric" value={options.fabric} onChange={e=>onChange({options:{fabric:e.target.value}})}>{Object.entries(CLOTHING_FABRICS).map(([id,spec])=><option value={id} key={id}>{spec.label}</option>)}</select></label>
    <label className="workspace-field"><span>Surface</span><select aria-label="Garment surface" value={options.pattern} onChange={e=>onChange({options:{pattern:e.target.value}})}>{CLOTHING_PATTERNS.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
    </div>
    <div className="wardrobe-options__colors" role="group" aria-label="Garment colors">
    {[...(config.top?[['topColor','Top color']]:[]),['bottomColor',config.top?'Bottom color':'Fabric color'],['trimColor','Trim color']].map(([key,label])=><label className="workspace-field" key={key}><span>{label}</span><input type="color" aria-label={label} value={options[key]} onChange={e=>onChange({options:{[key]:e.target.value}})}/></label>)}
    </div>
    <details className="wardrobe-options__details" open><summary>Fit and fabric details</summary>
      {Object.keys(CLOTHING_ADJUSTMENTS).map(name=><Adjustment key={name} name={name} value={options[name]} onChange={onChange}/>)}
    </details>
    <div className="wardrobe-options__actions"><button type="button" className="chamber-pill" onClick={()=>onChange({options:wardrobeDefaults(preset)})}>Reset this outfit</button>{status==='error'&&<button type="button" className="chamber-pill" onClick={()=>onChange({})}>Retry outfit save</button>}</div>
    <p className="wardrobe-options__status" role="status">{status==='saving'?'Saving outfit…':status==='error'?'Outfit save failed. Change an option to retry.':status==='saved'?'Outfit saved':'Default outfit'}</p>
    <small>Garments follow body measurements and pose. Fabric drape is not simulated. Original textures retain their own colors under the selected tint.</small>
  </fieldset>;
}

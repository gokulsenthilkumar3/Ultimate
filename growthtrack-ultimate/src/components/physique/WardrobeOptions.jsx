import React from 'react';
import { CLOTHING_OPTIONS, CLOTHING_FITS } from '../../lib/wardrobePreferences';

export default function WardrobeOptions({preset,preferences,onChange,status}) {
  const config=CLOTHING_OPTIONS[preset],options=preferences.outfits[preset];
  if(!config || !options) return null;
  return <fieldset className="wardrobe-options"><legend>Customize {config.label.toLowerCase()}</legend>
    <p>{config.description}</p>
    <label className="workspace-field"><span>Style</span><select aria-label="Garment style" value={options.variant} onChange={e=>onChange({options:{variant:e.target.value}})}>{config.variants.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
    <label className="workspace-field"><span>Fit</span><select aria-label="Garment fit" value={options.fit} onChange={e=>onChange({options:{fit:e.target.value}})}>{CLOTHING_FITS.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
    {[...(config.top?[['topColor','Top color']]:[]),['bottomColor',config.top?'Bottom color':'Fabric color'],['trimColor','Trim color']].map(([key,label])=><label className="workspace-field" key={key}><span>{label}</span><input type="color" aria-label={label} value={options[key]} onChange={e=>onChange({options:{[key]:e.target.value}})}/></label>)}
    <p className="wardrobe-options__status" role="status">{status==='saving'?'Saving outfit…':status==='error'?'Outfit save failed. Change an option to retry.':status==='saved'?'Outfit saved':'Default outfit'}</p>
    <small>Cloth follows the body and pose. Fit adjusts garment thickness and ease; this preview does not simulate fabric drape.</small>
  </fieldset>;
}

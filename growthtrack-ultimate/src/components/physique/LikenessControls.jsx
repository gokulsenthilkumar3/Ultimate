import React,{useEffect,useRef,useState} from 'react';

const PRESETS={
  neutral:{eye_size:.35,brow_depth:.35,nose_bridge_width:.35,nose_tip_size:.35,lip_fullness:.35,ear_prominence:.35,jaw_width:.35,chin_projection:.35,smile:0,jaw_open:0,blink:0},
  broad:{eye_size:.32,brow_depth:.5,nose_bridge_width:.45,nose_tip_size:.35,lip_fullness:.3,ear_prominence:.35,jaw_width:.65,chin_projection:.5,smile:0,jaw_open:0,blink:0},
  soft:{eye_size:.4,brow_depth:.2,nose_bridge_width:.3,nose_tip_size:.3,lip_fullness:.5,ear_prominence:.3,jaw_width:.2,chin_projection:.3,smile:0,jaw_open:0,blink:0},
};

export default function LikenessControls({onPreset,context}){
  const [mode,setMode]=useState('generic'),[reference,setReference]=useState(null),[error,setError]=useState('');
  const url=useRef(null);
  const clear=()=>{if(url.current)URL.revokeObjectURL(url.current);url.current=null;setReference(null);};
  useEffect(()=>()=>{if(url.current)URL.revokeObjectURL(url.current);},[]);
  function load(file){
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>10*1024*1024){setError('Choose a JPG, PNG or WebP image smaller than 10 MB.');return;}
    clear();url.current=URL.createObjectURL(file);setReference({url:url.current,name:file.name});setError('');setMode('personal');
  }
  return <fieldset className="avatar-likeness-controls"><legend>Face design · {context==='goal'?'Goal':'Current'}</legend>
    <label className="workspace-field"><span>Design from</span><select aria-label="Face design mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="generic">Generic adult</option><option value="personal">Personal reference</option></select></label>
    {mode==='generic'?<div className="avatar-model-tools__actions">
      <button className="chamber-pill" type="button" onClick={()=>onPreset(PRESETS.neutral)}>Neutral face</button>
      <button className="chamber-pill" type="button" onClick={()=>onPreset(PRESETS.broad)}>Broader features</button>
      <button className="chamber-pill" type="button" onClick={()=>onPreset(PRESETS.soft)}>Softer features</button>
    </div>:<div className="avatar-reference" onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';}} onDrop={e=>{e.preventDefault();load(e.dataTransfer.files[0]);}}>
      <label className="workspace-field"><span>Reference photo</span><input aria-label="Reference photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{load(e.target.files[0]);e.target.value='';}}/></label>
      <p>Choose or drop a front-facing photo, then match the facial controls below. This is manual matching; the photo does not generate a 3D scan.</p>
      <details className="avatar-reference-guide"><summary>How to take reference photos</summary>
        <p>A phone camera is enough to start. Take five views: front, left and right at 45°, then left and right profiles. Keep the camera at eye level, use even light and a plain background, and keep a neutral expression with lips gently closed.</p>
        <p>Keep your hair away from your face and use the original photos without beauty filters or portrait blur. Save as JPG, PNG or WebP, under 10 MB each; export HEIC photos as JPG first.</p>
        <p>Start with the front photo here. Replace it with a side view to check the nose, chin and jaw. A scan is optional; these photos support manual editing, while accurate 3D reconstruction requires a separate fitting step.</p>
      </details>
      {reference && <figure><img src={reference.url} alt="Personal face reference" onError={()=>{clear();setError('This image could not be read. Choose another photo.');}}/><figcaption>{reference.name}</figcaption><button type="button" className="chamber-pill" onClick={clear}>Remove reference</button></figure>}
      <small>The reference stays on this device for this editing session. It is excluded from saves and exports. Facial adjustments use your existing saved profile.</small>
    </div>}
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}

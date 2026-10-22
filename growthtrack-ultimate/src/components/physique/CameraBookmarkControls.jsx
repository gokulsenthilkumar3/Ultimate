import { useState } from 'react';
import { CAMERA_BOOKMARKS, sanitizeCameraBookmarks } from '../../lib/cameraBookmarks';

function BookmarkRow({item,onRename,onApply,onRemove,available}) {
  const [name,setName]=useState(item.name);
  return <li className="camera-bookmark-row"><label className="workspace-field"><span>View name</span><input aria-label={`Name for ${item.name}`} value={name} maxLength={CAMERA_BOOKMARKS.nameLength} onChange={e=>setName(e.target.value)}/></label>
    <div className="camera-bookmark-actions"><button type="button" className="chamber-pill" disabled={!name.trim()} onClick={()=>onRename(name.trim())}>Rename {item.name}</button>
      <button type="button" className="chamber-pill" disabled={!available} onClick={onApply}>Open {item.name}</button>
      <button type="button" className="chamber-pill" onClick={onRemove}>Remove {item.name}</button></div></li>;
}
export default function CameraBookmarkControls({value,onChange,readView,onApply,available=true,saveStatus}) {
  const bookmarks=sanitizeCameraBookmarks(value),[name,setName]=useState(''),[message,setMessage]=useState('');
  return <section aria-label="Saved camera views"><h4>Saved camera views</h4>
    <p className="chamber-note">Orbit, pan and zoom, then save the view. Views follow model height and respect the current camera and floor limits.</p>
    <label className="workspace-field"><span>New view name</span><input aria-label="New view name" value={name} maxLength={CAMERA_BOOKMARKS.nameLength} onChange={e=>setName(e.target.value)}/></label>
    <button type="button" className="chamber-pill" disabled={!available || !name.trim() || bookmarks.length>=CAMERA_BOOKMARKS.maximum} onClick={()=>{
      const view=readView();if(!view){setMessage('Wait for the interactive model to finish loading.');return;}
      onChange([...bookmarks,{id:crypto.randomUUID(),name:name.trim(),view}]);setName('');setMessage('View added.');
    }}>Save current view</button>
    {bookmarks.length>=CAMERA_BOOKMARKS.maximum && <p className="chamber-note">All {CAMERA_BOOKMARKS.maximum} view slots are in use.</p>}
    {!available && <p className="chamber-note">Choose Current or Goal with interactive 3D to use saved views.</p>}
    <ul className="camera-bookmark-list">{bookmarks.map(item=><BookmarkRow key={`${item.id}-${item.name}`} item={item} available={available}
      onRename={next=>onChange(bookmarks.map(entry=>entry.id===item.id?{...entry,name:next}:entry))}
      onApply={()=>{if(available){onApply(item.view);setMessage(`Opened ${item.name}.`);}}}
      onRemove={()=>onChange(bookmarks.filter(entry=>entry.id!==item.id))}/>)}</ul>
    <p role="status" className="chamber-note">{saveStatus==='error'?'View save failed.':saveStatus==='saving'?'Saving views…':message}</p>
    {saveStatus==='error' && <button type="button" className="chamber-pill" onClick={()=>onChange(bookmarks)}>Retry view save</button>}
  </section>;
}

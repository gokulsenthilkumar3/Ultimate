import React from 'react';
import { Maximize2, RotateCcw, ScanFace, ZoomIn, ZoomOut } from 'lucide-react';

export default function ViewportToolbar({ presets, preset, onPreset, onFit, onReset, onFace, onZoomIn, onZoomOut }) {
  return <div className="avatar-camera-toolbar" role="group" aria-label="Model camera controls">
    <label className="avatar-camera-toolbar__preset"><span>Camera</span><select aria-label="Camera angle" value={preset}
      onChange={event => onPreset(event.target.value)}>
      {!presets.some(item => item.id === preset) && <option value={preset}>Custom view</option>}
      {presets.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
    </select></label>
    <div className="avatar-camera-toolbar__actions">
      <button type="button" className="chamber-pill" onClick={onFit}><Maximize2 size={16} aria-hidden="true" />Fit model</button>
      <button type="button" className="chamber-pill chamber-icon-button" onClick={onFace} aria-label="Inspect face" title="Inspect face"><ScanFace size={17} /></button>
      <button type="button" className="chamber-pill chamber-icon-button" onClick={onReset} aria-label="Reset camera" title="Reset camera"><RotateCcw size={16} /></button>
      <button type="button" className="chamber-pill chamber-icon-button" onClick={onZoomIn} aria-label="Zoom in" title="Zoom in"><ZoomIn size={17} /></button>
      <button type="button" className="chamber-pill chamber-icon-button" onClick={onZoomOut} aria-label="Zoom out" title="Zoom out"><ZoomOut size={17} /></button>
    </div>
  </div>;
}

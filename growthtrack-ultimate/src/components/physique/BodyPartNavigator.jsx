import React, { useRef, useState } from 'react';
import { Move, RotateCcw } from 'lucide-react';
import use3DStore from '../../store/use3DStore';
import { BODY_PART_REGIONS, BODY_PART_MAP } from '../morphEngine/bodyRegions';
import './measurement-guides.css';
import { BODY_PART_DRAG_TYPE, focusInspectionPart } from './bodyPartDrag';

export default function BodyPartNavigator({ privateAllowed = false, dropTargetRef, disabled = false }) {
  const selected = use3DStore(s => s.focusedBodyPart);
  const fit = use3DStore(s => s.fitCameraToBody);
  const viewMode = use3DStore(s => s.viewMode);
  const zoom = use3DStore(s => s.cameraZoom);
  const pointer = useRef(null);
  const suppressClick = useRef(false);
  const [touchDrag, setTouchDrag] = useState(null);
  const showModel = () => dropTargetRef?.current?.scrollIntoView({ block:'nearest',behavior:'auto' });
  const choose = id => {
    if (disabled) return;
    focusInspectionPart(id);
    showModel();
  };
  const regions = BODY_PART_REGIONS.filter(r => !r.private || privateAllowed);
  return <section className="body-part-navigator" aria-label="Body part inspection">
    <div className="body-part-navigator__heading"><div><strong>Inspect a body part</strong><p id="part-navigation-help">Choose a part or drag it onto the model. Drag the model to rotate; right-drag or Shift-drag to pan. Pinch or use two fingers to zoom and pan.</p></div><button type="button" className="chamber-pill" disabled={disabled} onClick={() => { fit(); showModel(); }}><RotateCcw size={14} /> Full body</button></div>
    <div className="body-part-navigator__parts" role="group" aria-label="Choose or drag a body part">
      {regions.map(region => <button key={region.name} type="button" draggable={!disabled} disabled={disabled}
        data-part={region.name}
        aria-pressed={selected === region.name} aria-describedby="part-navigation-help"
        className={selected === region.name ? 'is-selected' : ''}
        onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } choose(region.name); }}
        onDragStart={event => { event.dataTransfer.setData(BODY_PART_DRAG_TYPE, region.name); event.dataTransfer.effectAllowed = 'move'; }}
        onPointerDown={event => {
          if (event.pointerType !== 'touch' || disabled) return;
          suppressClick.current = false;
          pointer.current = { id: event.pointerId, region: region.name, x: event.clientX, y: event.clientY, active: false };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const drag = pointer.current;
          if (!drag || drag.id !== event.pointerId) return;
          if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 10) drag.active = true;
          if (drag.active) setTouchDrag({ label: region.label, x: event.clientX, y: event.clientY });
        }}
        onPointerUp={event => {
          const drag = pointer.current;
          pointer.current = null; setTouchDrag(null);
          if (!drag?.active) return;
          suppressClick.current = true;
          const bounds = dropTargetRef?.current?.getBoundingClientRect();
          if (bounds && event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom) choose(drag.region);
        }}
        onPointerCancel={() => { pointer.current = null; setTouchDrag(null); }}>
        <Move size={12} aria-hidden="true" />{region.label}
      </button>)}
    </div>
    <p className="body-part-navigator__status" role="status">{disabled ? 'Part navigation needs the 3D renderer. Measurement diagrams remain available.' : selected && BODY_PART_MAP[selected] ? `${BODY_PART_MAP[selected].label} · ${Math.round(100 / zoom)}% zoom` : viewMode === 'SOLO' ? 'Full body · select a part for a close-up' : 'Selecting a part opens the current body in single-model view.'}</p>
    {touchDrag && <div className="body-part-drag-preview" aria-hidden="true" style={{ left: touchDrag.x + 12, top: touchDrag.y - 20 }}>{touchDrag.label}</div>}
  </section>;
}

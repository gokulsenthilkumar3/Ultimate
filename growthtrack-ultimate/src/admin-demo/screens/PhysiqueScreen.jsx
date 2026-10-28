import React, { useEffect, useId, useState } from 'react';
import { Badge, Button, Download, Metrics, Panel, RecordsTable } from '../components';
import { PHYSIQUE_FIELDS, createPhysiqueSession, physiqueIsDirty, physiqueMeasurements, physiqueSnapshot, updatePhysiqueField } from '../models/physiqueModel';
import '../styles/physique.css';

function Outline({ values, orientation, zoom }) {
  const labelId = useId();
  const chest = Math.round(values.chest / 100 * 37), waist = Math.round(values.waist / 82 * 27), hip = Math.round(values.hips / 98 * 35);
  const scaleX = orientation === 'side' ? .64 : 1;
  return <svg className="physique-outline" viewBox="0 0 300 420" role="img" aria-labelledby={labelId}>
    <title id={labelId}>{orientation} schematic outline. Layout illustration; this is not a 3D body or a measurement reconstruction.</title>
    <g transform={`translate(150 210) scale(${zoom / 100 * scaleX} ${zoom / 100 * values.height / 178}) translate(-150 -210)`} fill="var(--silhouette)" stroke="var(--accent)" strokeWidth="1.3">
      <ellipse cx="150" cy="47" rx="22" ry="29" />
      <path d={`M139 75 L139 84 L${150 - chest} 97 Q${140 - chest} 100 ${137 - chest} 121 L76 211 Q73 224 82 226 Q90 227 94 214 L${149 - chest} 140 L${150 - waist} 190 L${150 - hip} 235 L119 370 Q119 382 131 380 L143 252 L150 230 L157 252 L169 380 Q181 382 181 370 L${150 + hip} 235 L${150 + waist} 190 L${151 + chest} 140 L206 214 Q210 227 218 226 Q227 224 224 211 L${163 + chest} 121 Q${160 + chest} 100 ${150 + chest} 97 L161 84 L161 75`} />
      {orientation !== 'back' && <path d={`M${150 - chest + 6} 123 Q150 140 ${150 + chest - 6} 123 M${150 - waist} 186 Q150 198 ${150 + waist} 186 M150 133 L150 199`} fill="none" opacity=".45" />}
    </g>
    <path d="M48 396 H252" stroke="var(--border-strong)" strokeWidth="1" />
  </svg>;
}

function MeasurementControls({ session, context, onChange }) {
  return <div className="physique-sliders">{PHYSIQUE_FIELDS.map(field => <label key={field.key} className="physique-slider"><span>{field.label}<output>{session.contexts[context][field.key]} <small>{field.unit}</small></output></span><input type="range" aria-label={`${context === 'goal' ? 'Goal' : 'Current'} ${field.label.toLowerCase()} (${field.unit})`} min={field.min} max={field.max} step={field.step} value={session.contexts[context][field.key]} onChange={event => onChange(updatePhysiqueField(session, context, field.key, event.target.value))} /><span className="physique-range"><small>{field.min} {field.unit}</small><small>{field.max} {field.unit}</small></span></label>)}</div>;
}

export default function PhysiqueScreen({ view, physiqueSession, onPhysiqueChange, onPhysiqueSave, openRecord }) {
  const [local, setLocal] = useState(createPhysiqueSession);
  const session = physiqueSession || local, onChange = onPhysiqueChange || setLocal;
  const context = session.selected;
  const values = session.contexts[context];
  const [outline, setOutline] = useState(values), [orientation, setOrientation] = useState('front'), [zoom, setZoom] = useState(100), [message, setMessage] = useState('');
  const updating = outline !== values;
  useEffect(() => { const timer = setTimeout(() => setOutline(values), 150); return () => clearTimeout(timer); }, [values]);
  const dirty = physiqueIsDirty(session);
  const save = () => {
    if (!onPhysiqueSave) { setMessage('This isolated component has no local save adapter.'); return; }
    setMessage(onPhysiqueSave() ? 'Sample profile saved in this browser.' : 'Browser storage is unavailable. Your draft is still here; download it to keep a copy.');
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(physiqueSnapshot(session), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'sample-physique-profile.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Sample profile downloaded as JSON. This is not a GLB or production avatar package.');
  };
  const rows = physiqueMeasurements(session);
  return <div className="physique-workspace">
    <Metrics items={[{ label: 'Height', value: `${values.height} cm`, detail: `${context} sample profile` }, { label: 'Weight', value: `${values.weight} kg`, detail: `${context} sample profile` }, { label: 'Waist', value: `${values.waist} cm`, detail: `${context} sample profile` }, { label: 'Profile status', value: dirty ? 'Draft' : 'Saved locally', detail: 'fictional measurements only' }]} />
    <div className="physique-toolbar"><div className="physique-context" role="group" aria-label="Sample profile context">{['current', 'goal'].map(item => <button key={item} aria-pressed={context === item} onClick={() => onChange({ ...session, selected: item })}>{item === 'current' ? 'Current profile' : 'Goal profile'}</button>)}</div><div className="button-group"><Button icon={Download} onClick={download}>Download sample profile</Button><Button variant="primary" disabled={!dirty} onClick={save}>Save sample profile</Button></div></div>
    {message && <p className="physique-message" role="status">{message}</p>}
    {view === 'measurements' ? <Panel title="Current and Goal measurements" subtitle="Two independent fictional profiles. Changes are not health recommendations."><RecordsTable label="Physique measurements" rows={rows} columns={[{ key: 'label', label: 'Measurement' }, { key: 'current', label: 'Current', render: row => `${row.current} ${row.unit}` }, { key: 'goal', label: 'Goal', render: row => `${row.goal} ${row.unit}` }, { key: 'difference', label: 'Difference', render: row => `${row.difference > 0 ? '+' : ''}${row.difference} ${row.unit}` }]} onRow={row => openRecord({ title: row.label, current: `${row.current} ${row.unit}`, goal: `${row.goal} ${row.unit}`, type: 'Fictional measurement comparison' })} /></Panel>
      : view === 'history' ? <Panel title="Profile history" subtitle="The last explicit local save, separate from your current draft.">{session.savedContexts ? <RecordsTable label="Saved physique profile" rows={PHYSIQUE_FIELDS.map(field => ({ ...field, current: session.savedContexts.current[field.key], goal: session.savedContexts.goal[field.key] }))} columns={[{ key: 'label', label: 'Measurement' }, { key: 'current', label: 'Saved Current', render: row => `${row.current} ${row.unit}` }, { key: 'goal', label: 'Saved Goal', render: row => `${row.goal} ${row.unit}` }]} /> : <div className="support-body"><h3>No sample profile saved yet</h3><p className="muted">Save a sample profile to keep a local snapshot. Editing sliders does not overwrite it.</p><Button onClick={save}>Save sample profile locally</Button></div>}{session.savedAt && <p className="physique-save-time">Saved {new Date(session.savedAt).toLocaleString()} · This browser only</p>}</Panel>
      : view === 'targets' ? <div className="two-columns"><Panel title="Explore a Goal profile" subtitle="Goal edits stay separate from Current measurements."><MeasurementControls session={session} context="goal" onChange={onChange} /></Panel><Panel title="A comparison, at your pace" subtitle="No predicted outcome or automated body target"><div className="physique-comparison">{rows.map(row => <div key={row.key}><span>{row.label}</span><strong>{row.current} → {row.goal} <small>{row.unit}</small></strong></div>)}<p className="quiet-note">These are fictional values for reviewing the controls. A schematic cannot reconstruct an individual body or assess health.</p></div></Panel></div>
      : <div className="physique-editor"><Panel title={view === '3d' ? 'Your model workspace' : 'Your physique blueprint'} subtitle="Schematic preview · production 3D renderer is not connected" action={<Badge>{updating ? 'Updating outline' : 'Outline ready'}</Badge>}><div className="physique-stage-toolbar"><div role="group" aria-label="Outline orientation">{['front', 'side', 'back'].map(item => <button key={item} aria-pressed={orientation === item} onClick={() => setOrientation(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div><label>Zoom<select aria-label="Outline zoom" value={zoom} onChange={event => setZoom(Number(event.target.value))}>{[75, 100, 125].map(value => <option key={value} value={value}>{value}%</option>)}</select></label></div><div className="physique-stage" aria-busy={updating}><div className="stage-grid" /><Outline values={outline} orientation={orientation} zoom={zoom} /><span className="physique-stage-caption">{context === 'current' ? 'Current' : 'Goal'} · {orientation} · schematic</span></div><div className="physique-stage-readout"><span>Chest<strong>{outline.chest} cm</strong></span><span>Waist<strong>{outline.waist} cm</strong></span><span>Hips<strong>{outline.hips} cm</strong></span></div><div className="panel-bottom small muted">This outline reviews layout and controls. It is not a baked mesh, cloth fit, or textured body.</div></Panel>
        <Panel title={`${context === 'current' ? 'Current' : 'Goal'} measurements`} subtitle="Adjust the sample. Review the workspace."><MeasurementControls session={session} context={context} onChange={onChange} /><div className="physique-export"><Button disabled aria-describedby="physique-export-note">Export GLB package</Button><p id="physique-export-note" className="muted small">GLB export requires the connected renderer and a completed garment fit. Use the sample JSON download to retain this UI draft.</p></div></Panel></div>}
  </div>;
}

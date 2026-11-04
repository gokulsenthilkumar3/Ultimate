import React, { useState } from 'react';
import { TECHNOLOGY_CATALOG, technologyProfileKey, validateTechnologyProfile } from '../../lib/technologyProfile';

const labels = { present: 'Code present · runtime not verified', 'reference-only': 'Reference/configuration only', 'adapter-required': 'Adapter required' };
export default function TechnologyPanel({ ownerId }) {
  const [selected, setSelected] = useState(() => {
    try { return validateTechnologyProfile(JSON.parse(localStorage.getItem(technologyProfileKey(ownerId)))).selected; } catch { return []; }
  });
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('');
  const [importText, setImportText] = useState('');
  const categories = [...new Set(TECHNOLOGY_CATALOG.technologies.map(item => item.category))];
  function save(values) {
    const profile = validateTechnologyProfile({ version: 1, selected: values });
    localStorage.setItem(technologyProfileKey(ownerId), JSON.stringify(profile));
    setSelected(profile.selected);
  }
  function toggle(id) {
    try { save(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]); setStatus('Selection saved on this browser. No infrastructure or data changed.'); }
    catch { setStatus('Selection could not be saved. Browser storage may be unavailable.'); }
  }
  function importProfile() {
    try { if (importText.length > 16000) throw new Error(); const profile = validateTechnologyProfile(JSON.parse(importText)); save(profile.selected); setStatus('Validated profile imported locally. No services were installed.'); }
    catch { setStatus('Invalid profile or unavailable storage. Only catalog IDs are accepted.'); }
  }
  return <section aria-label="Technology planning profile">
    <p>Choose technologies to plan an integration. These selections do not change the running stack, install packages, provision services or migrate data.</p>
    <label>Category<select className="form-input" value={category} onChange={event => setCategory(event.target.value)}><option>All</option>{categories.map(name => <option key={name}>{name}</option>)}</select></label>
    <p>{selected.length} selected · saved separately for your account on this browser</p>
    <div style={{ maxHeight: '45vh', overflow: 'auto' }}>{TECHNOLOGY_CATALOG.technologies.filter(item => category === 'All' || item.category === category).map(item => <div key={item.id} style={{ borderBottom: '1px solid var(--border)', paddingBlock: 12 }}>
      <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />{item.label}</label>
      <p>{labels[item.status]} · {item.owner}</p><p>{item.note}</p>
    </div>)}</div>
    <label>Portable profile (JSON)<textarea className="form-input" readOnly rows={3} value={JSON.stringify({ version: 1, selected }, null, 2)} /></label>
    <label>Import a planning profile<textarea className="form-input" maxLength={16000} rows={3} value={importText} onChange={event => setImportText(event.target.value)} /></label>
    <button type="button" className="btn-secondary" onClick={importProfile}>Validate and import profile</button>
    <p role="status">{status}</p>
  </section>;
}

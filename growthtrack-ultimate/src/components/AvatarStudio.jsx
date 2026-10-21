import { useState } from 'react';
import { AVATAR_MEASUREMENTS, createAvatarSnapshot } from '../lib/avatarProfile';
import { BODY_METRIC_RANGES } from '../lib/bodyMetricContract';
import useStore from '../store/useStore';
import use3DStore from '../store/use3DStore';

export default function AvatarStudio({ current, onApply, onCustomize, onSnapshot }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => ({ ...current }));
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [guide, setGuide] = useState(AVATAR_MEASUREMENTS[0]);
  const edit = (key, value) => { setHistory((items) => [...items.slice(-29), draft]); setDraft({ ...draft, [key]: value }); };
  const run = async (action) => {
    setBusy(true); setMessage('');
    try { await action(); } catch (error) { setMessage(error.message || 'Could not save. Your draft remains open.'); }
    finally { setBusy(false); }
  };
  const start = () => {
    setDraft({ ...(useStore.getState().physiqueTargets?.avatarDraft?.metrics || current) });
    setHistory([]); setOpen(!open);
  };
  return <section className="avatar-studio" aria-label="Personal avatar studio">
    <button className="chamber-pill" onClick={start} aria-expanded={open}>Create / edit my avatar</button>
    {open && <div>
      <h2>Personal avatar studio</h2>
      <p>Enter measurements → customize appearance → inspect fit → save baseline → set a goal.</p>
      <div className="avatar-studio__grid">
        <div>
          {AVATAR_MEASUREMENTS.map(([key, label, hint]) => <label key={key} className="avatar-studio__field">
            <span>{label}{key === 'height' ? ' *' : ''} (cm)</span>
            <input type="number" step="0.1" min={BODY_METRIC_RANGES[key].min} max={BODY_METRIC_RANGES[key].max}
              required={key === 'height'} value={draft[key] ?? ''} onFocus={() => setGuide(AVATAR_MEASUREMENTS.find((m) => m[0] === key))}
              onChange={(event) => edit(key, event.target.value)} aria-label={`${label} in centimetres`} title={hint} />
          </label>)}
        </div>
        <div>
          <svg viewBox="0 0 120 220" width="120" height="220" role="img" aria-label={`${guide[1]} measurement location, schematic`}>
            <circle cx="60" cy="23" r="15" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M44 43 L76 43 L91 106 L82 110 L70 65 L74 121 L78 205 L66 205 L60 137 L54 205 L42 205 L46 121 L50 65 L38 110 L29 106 Z" fill="none" stroke="currentColor" strokeWidth="2" />
            {guide[0] === 'height' ? <path d="M105 8 V205 M100 8 H110 M100 205 H110" stroke="#54b7dd" strokeWidth="3" /> : <path d={`M27 ${205 - guide[3] * 197} H93`} stroke="#54b7dd" strokeWidth="3" />}
          </svg>
          <p>{guide[2]}</p>
          <p>Missing dimensions are estimated for display. Weight and body fat cannot determine an exact personal likeness.</p>
        </div>
      </div>
      <div className="avatar-studio__actions">
        <button disabled={busy || !history.length} onClick={() => { setDraft(history.at(-1)); setHistory(history.slice(0, -1)); }}>Undo</button>
        <button disabled={busy} onClick={() => { setHistory([...history, draft]); setDraft({ ...current }); }}>Reset draft</button>
        <button disabled={busy} onClick={() => run(async () => {
          const state = useStore.getState();
          await state.updatePhysiqueTargets({ ...state.physiqueTargets, avatarDraft: { schemaVersion: 1, metrics: draft, updatedAt: new Date().toISOString() } });
          setMessage('Draft saved. You can recover it after reopening the studio.');
        })}>Save draft</button>
        <button disabled={busy} onClick={() => run(async () => {
          const snapshot = createAvatarSnapshot({ metrics: draft });
          await onApply(snapshot.metrics); onCustomize();
          setMessage('Measurements applied. Customize your appearance in the body editor.');
        })}>Apply and customize</button>
        <button disabled={busy} onClick={() => run(async () => {
          const state = use3DStore.getState();
          const snapshot = createAvatarSnapshot({ metrics: current, weights: state.cloneA.weights, asset: state.modelDiagnostics?.modelAsset, kind: 'baseline' });
          await onSnapshot(snapshot); setMessage('A dated baseline was saved; later edits will not change it.');
        })}>Save displayed body as baseline</button>
      </div>
      {message && <p role="status">{message}</p>}
    </div>}
  </section>;
}

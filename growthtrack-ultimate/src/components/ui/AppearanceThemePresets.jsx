import React, { useRef, useState } from 'react';
import { COLOR_THEMES } from '../../design/appearancePresets';

export default function AppearanceThemePresets({ value, onChange }) {
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);
  const select = async key => {
    if (busy.current) return;
    busy.current = true; setPending(key); setError('');
    try { await onChange(key); }
    catch { setError('The theme could not be saved. Your previous appearance has been restored. Try again.'); }
    finally { busy.current = false; setPending(''); }
  };
  return <section className="appearance-color-themes" aria-label="Colour themes">
    <h4>Colour themes</h4><p>BCL uses dark mode. GBB uses light mode. Each combines workspace, sidebar and accent colours.</p>
    <div className="appearance-theme-presets">{Object.entries(COLOR_THEMES).map(([key, preset]) => <button key={key} type="button" aria-label={`Use ${preset.label} theme`} aria-pressed={value === key} aria-busy={pending === key || undefined} disabled={Boolean(pending)} onClick={() => void select(key)}>
      <span className="appearance-theme-swatches" aria-hidden="true">{preset.swatches.map(color => <span key={color} style={{ background: color }} />)}</span>
      <strong>{preset.label}{pending === key ? ' · Saving…' : ''}</strong><span>{preset.description}</span>
    </button>)}</div>
    {error && <p className="appearance-theme-error" role="alert">{error}</p>}
  </section>;
}

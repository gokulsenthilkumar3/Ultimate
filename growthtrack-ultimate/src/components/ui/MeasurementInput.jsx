import { useId, useState } from 'react';
import { validateBodyMetric } from '../../lib/bodyMetricContract';

export default function MeasurementInput({ metricKey, value, onCommit, ...props }) {
  const [draft, setDraft] = useState(String(value ?? ''));
  const [error, setError] = useState('');
  const errorId = useId();
  const commit = () => {
    if (draft === String(value ?? '')) return;
    const result = validateBodyMetric(metricKey, draft, { allowEmpty: false });
    if (!result.valid) { setError(result.reason || 'Enter a measurement before saving.'); return; }
    setError('');
    onCommit(draft);
  };
  return <>
    <input {...props} type="number" step="0.1" value={draft}
      aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}
      onChange={(event) => { setDraft(event.target.value); setError(''); }}
      onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
    {error && <small id={errorId} role="alert">{error}</small>}
  </>;
}

import { useId, useState } from 'react';
import { BODY_METRIC_RANGES } from '../../lib/bodyMetricContract';
import { displayMetricValue, parseMetricEntry, stepMetricEntry } from '../../lib/measurementEntry';

export default function MeasurementInput({ metricKey, value, onCommit, unit = BODY_METRIC_RANGES[metricKey]?.unit, ...props }) {
  const formatted = displayMetricValue(value, unit);
  const source = `${metricKey}:${unit}:${value}`;
  const [previousSource, setPreviousSource] = useState(source);
  const [draft, setDraft] = useState(formatted);
  const [error, setError] = useState('');
  const errorId = useId();
  if (source !== previousSource) {
    setPreviousSource(source);
    setDraft(formatted);
    setError('');
  }
  const commit = () => {
    if (draft === formatted) return;
    const result = parseMetricEntry(metricKey, draft, unit);
    if (!result.valid) { setError(result.reason || 'Enter a measurement before saving.'); return; }
    setError('');
    setDraft(displayMetricValue(result.value, unit));
    onCommit(String(result.value));
  };
  return <>
    <input {...props} type="text" inputMode="text" value={draft}
      aria-invalid={Boolean(error)} aria-describedby={[props['aria-describedby'], error && errorId].filter(Boolean).join(' ') || undefined}
      onChange={(event) => { setDraft(event.target.value); setError(''); }}
      onBlur={commit} onKeyDown={(event) => {
        if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
        else if (event.key === 'Escape') { event.preventDefault(); setDraft(formatted); setError(''); }
        else {
          const next = stepMetricEntry(metricKey, draft, unit, event);
          if (next !== null) { event.preventDefault(); setDraft(next); setError(''); }
        }
      }} />
    {error && <small id={errorId} role="alert">{error}</small>}
  </>;
}

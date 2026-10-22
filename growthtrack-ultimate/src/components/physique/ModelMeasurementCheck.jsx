import { useState, useSyncExternalStore } from 'react';
import { modelMeasurementSource, subscribeModelMeasurements } from '../morphEngine/modelMeasurementRuntime';
import { formatMeasurement } from '../../utils/userFormatters';

export default function ModelMeasurementCheck({ context, readCanvas, user }) {
  const source = useSyncExternalStore(subscribeModelMeasurements, () => modelMeasurementSource(readCanvas(), context), () => null);
  const [snapshot, setSnapshot] = useState(null);
  const report = snapshot?.source === source ? snapshot : null;
  const display = value => value === null ? 'Not recorded' : formatMeasurement(value, 'cm', user);
  return <details className="chamber-note model-measurement-check">
    <summary>Model fit</summary>
    <p>Check the {context === 'B' ? 'Goal' : 'Current'} model’s neutral shape against entered measurements. Chest, waist and hip sections use approximate height landmarks; these are preview estimates, not a calibrated body fit.</p>
    <button type="button" className="chamber-pill" disabled={!source} onClick={() => {
      try { setSnapshot({ source, rows: source.read() }); }
      catch { setSnapshot({ source, error: 'The model could not be measured. Try again after it finishes loading.' }); }
    }}>Check model measurements</button>
    {!source && <p>Open a supported interactive model to check its measurements.</p>}
    {report?.error && <p role="alert">{report.error}</p>}
    {report?.rows && <div role="region" aria-label="Model measurement results">
      <p>Neutral shape · {context === 'B' ? 'Goal' : 'Current'}. Positive differences mean the model is larger.</p>
      <dl>{report.rows.map(row => <div key={row.key} className="model-measurement-check__row">
        <dt>{row.label}</dt><dd>Entered: {display(row.entered)}</dd>
        <dd>Model: {row.measured === null ? 'Unavailable' : display(row.measured)}</dd>
        <dd>Difference: {row.error === null ? '—' : `${row.error > 0 ? '+' : row.error < 0 ? '−' : ''}${display(Math.abs(row.error))}`}</dd>
        {row.reason && <dd>{row.reason}</dd>}
      </div>)}</dl>
      <p>This check does not change your measurements or the model. Pose, clothing and camera zoom are excluded. Values without an entered target have no fit error.</p>
    </div>}
  </details>;
}

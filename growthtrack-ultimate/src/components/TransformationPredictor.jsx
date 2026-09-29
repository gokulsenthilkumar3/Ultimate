import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from 'recharts';
import useStore from '../store/useStore';
import { buildMetricForecasts } from '../utils/growthcast';
import { formatDate, formatMeasurement, formatNumber } from '../utils/userFormatters';
import { EMPTY_LIST } from '../lib/emptyValues';

const STATUS = {
  at_target: 'At the saved target',
  stalled: 'No observed change; no ETA',
  toward_target: 'Observed trend moves toward target',
  away_from_target: 'Observed trend moves away from target; no ETA',
  insufficient_data: 'Need at least 3 valid observations on distinct dates',
};

export default React.memo(function TransformationPredictor({ logs }) {
  const state = useStore();
  const sourceLogs = logs ?? state.metric_logs ?? EMPTY_LIST;
  const predictions = useMemo(() => buildMetricForecasts(sourceLogs, state), [sourceLogs, state]);
  const [view, setView] = useState('cards');
  const measure = (value, unit) => ['kg', 'cm'].includes(unit)
    ? formatMeasurement(value, unit, state.user)
    : formatNumber(value, state.user, { maximumFractionDigits: 2 }) + ' ' + unit;

  return (
    <section className="module-page" aria-label="Growth forecast">
      <div className="section-head">
        <div>
          <h2 className="text-display">Growth Forecast</h2>
          <p className="text-secondary">Linear estimates from your dated observations and saved targets.</p>
          <p className="text-secondary">Each metric needs at least 3 valid observations on distinct dates. Estimates start at the latest observed date and assume that the measured trend continues.</p>
        </div>
        <div role="group" aria-label="Forecast views">
          {['cards', 'timeline'].map(next => <button key={next} className="btn-secondary" aria-pressed={view === next} onClick={() => setView(next)}>{next === 'cards' ? 'Cards' : 'Timeline'}</button>)}
        </div>
      </div>
      <p className="text-secondary">
        <Link to="/wellness/physique?view=history">Open measurement history</Link>
        {' · '}<Link to="/wellness/physique">Manage your targets</Link>
      </p>
      {!predictions.length && <div className="glass-card">
        <h3>No forecast available</h3>
        <p>Save a user target and dated measurements to see a forecast.</p>
      </div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {predictions.map(prediction => (
          <article key={prediction.key} className="glass-card" aria-label={prediction.label + ' forecast'}>
            <h3>{prediction.label}</h3>
            <p>{prediction.observationCount} valid distinct-date observations</p>
            <p>Latest observation: {prediction.latestDate ? formatDate(prediction.latestDate, state.user) + ' · ' + measure(prediction.currentValue, prediction.unit) : 'Not recorded'}</p>
            <p>User target: {prediction.target === null ? 'Not set' : measure(prediction.target, prediction.unit)}</p>
            {prediction.target === null ? <p>Set a target to enable this forecast.</p> : <>
              <p>{STATUS[prediction.trend]}</p>
              {prediction.dailyRate !== null && <>
                <p>Observed weekly change: {measure(prediction.weeklyRate, prediction.unit)}/week</p>
                <p>30 days after {prediction.latestDate}: {prediction.projected30 === null ? 'Estimate outside the valid measurement range' : measure(prediction.projected30, prediction.unit)}</p>
                <p>Estimated target date: {prediction.projectedDate ? formatDate(prediction.projectedDate, state.user) : 'Unavailable'}</p>
                {view === 'timeline' && <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={prediction.chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} unit={' ' + prediction.unit} />
                    <Tooltip formatter={value => measure(value, prediction.unit)} />
                    <Legend />
                    <ReferenceLine y={prediction.target} stroke="var(--accent)" strokeDasharray="3 3" />
                    <Line type="linear" dataKey="actual" name="Observed" stroke="var(--accent)" connectNulls={false} />
                    <Line type="linear" dataKey="projected" name="Linear estimate" stroke="#a78bfa" strokeDasharray="4 3" connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>}
              </>}
            </>}
          </article>
        ))}
      </div>
    </section>
  );
});

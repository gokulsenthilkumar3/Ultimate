import React from 'react';
import { finiteMetric } from '../../lib/metricSeries';
import { formatBodyValue } from './physiqueWorkspace';

const METRICS = [
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'waist', label: 'Waist', unit: 'cm' },
  { key: 'bodyFat', label: 'Body fat', unit: '%' },
];

/** Recorded values only. Camera, pose and artistic edits are not measurements. */
export default function AvatarComparisonSummary({ current, goal, user }) {
  return <section className="avatar-comparison-summary" aria-label="Current and goal measurements">
    <h3>Current → Goal</h3>
    <dl>{METRICS.map(metric => {
      const from = finiteMetric(current[metric.key]);
      const to = finiteMetric(goal[metric.key]);
      return <div key={metric.key}><dt>{metric.label}</dt><dd>
        <span>{from === null ? 'Not recorded' : formatBodyValue(from, metric.unit, user)}</span>
        <span aria-hidden="true">→</span>
        <strong>{to === null ? 'Not set' : formatBodyValue(to, metric.unit, user)}</strong>
      </dd></div>;
    })}</dl>
    <p>Model previews illustrate these values. They do not measure your body.</p>
  </section>;
}

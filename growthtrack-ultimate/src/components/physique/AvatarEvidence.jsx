import React, { useMemo } from 'react';
import { BadgeCheck, Ruler, UserRound } from 'lucide-react';
import { buildAvatarEvidence } from '../../lib/avatarEvidence';
import { BODY_METRICS } from '../../lib/physiqueProfile';

export default function AvatarEvidence({ metrics, diagnostics, qualityGate }) {
  const evidence = useMemo(() => buildAvatarEvidence({ metrics, diagnostics, qualityGate }), [metrics,diagnostics,qualityGate]);
  return <section className="avatar-evidence" aria-label="Avatar evidence and readiness">
    <article className="avatar-evidence__likeness"><div className="avatar-evidence__label"><UserRound size={16}/><span>Human likeness</span></div><strong>{evidence.humanLikenessLabel}</strong><p>A likeness percentage needs a visual or reference evaluation. Measurements and renderer checks do not establish it.</p></article>
    <article><div className="avatar-evidence__label"><Ruler size={16}/><span>Measurement coverage</span></div><strong>{evidence.measurements.percent}<small>%</small></strong><progress aria-label="Recorded measurement coverage" value={evidence.measurements.supplied} max={evidence.measurements.total}/><p>{evidence.measurements.supplied} of {evidence.measurements.total} key measurements recorded. Estimates do not count.</p>
      {evidence.measurements.missing.length > 0 && <details><summary>Measurements to add</summary><ul>{evidence.measurements.missing.map(key => <li key={key}>{BODY_METRICS.find(m => m.key === key)?.label || key}</li>)}</ul></details>}
    </article>
    <article><div className="avatar-evidence__label"><BadgeCheck size={16}/><span>Live model checks</span></div><strong>{evidence.checks.total ? `${evidence.checks.passed} / ${evidence.checks.total}` : 'Checking'}</strong><p>{evidence.assetLabel}{evidence.checks.pending ? ` · ${evidence.checks.pending} checks pending` : ''}. Technical checks measure availability, not visual realism.</p><details><summary>See the evidence</summary><ul>{(qualityGate?.checks || []).map(check => <li key={check.id}><span>{check.label}</span><b data-status={check.status}>{check.status}</b><small>{check.detail}</small></li>)}</ul></details></article>
  </section>;
}

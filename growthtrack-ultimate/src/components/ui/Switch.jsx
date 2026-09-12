import React, { useId } from 'react';

export default function Switch({ label, description, checked, onChange, disabled = false }) {
  const id = useId();
  return <div className="gt-switch-row">
    <div><strong id={`${id}-label`}>{label}</strong>{description && <span id={`${id}-description`}>{description}</span>}</div>
    <button type="button" className="gt-switch" role="switch" aria-labelledby={`${id}-label`} aria-describedby={description ? `${id}-description` : undefined} aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}><span /></button>
  </div>;
}

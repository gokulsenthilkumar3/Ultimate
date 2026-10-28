import React from 'react';

/** Scope is supplied by the data owner; a mounted screen never implies LIVE. */
export default function ScopeBadge({ scope, children }) {
  const labels = { live: 'LIVE', setup: 'SETUP', preview: 'PREVIEW', readonly: 'READ-ONLY', unavailable: 'UNAVAILABLE' };
  if (!labels[scope]) return null;
  return <span className="gt-scope-badge" data-scope={scope}><strong>{labels[scope]}</strong>{children && <span>{children}</span>}</span>;
}

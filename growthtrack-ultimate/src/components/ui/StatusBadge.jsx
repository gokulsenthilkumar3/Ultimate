import React from 'react';

export default function StatusBadge({ tone = 'neutral', children, className = '' }) {
  return <span className={`gt-status-badge is-${tone} ${className}`.trim()}><i aria-hidden="true" />{children}</span>;
}

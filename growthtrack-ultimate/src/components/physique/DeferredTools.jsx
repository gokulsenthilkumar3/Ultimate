import React, { Suspense, useState } from 'react';

/** Fetch optional tools on first use and retain their drafts when collapsed. */
export default function DeferredTools({ summary, className = '', children }) {
  const [visited, setVisited] = useState(false);
  return <details className={`avatar-secondary-tools ${className}`} onToggle={event => {
    if (event.currentTarget.open) setVisited(true);
  }}>
    <summary>{summary}</summary>
    {visited && <Suspense fallback={<p role="status">Opening tools…</p>}>{children}</Suspense>}
  </details>;
}

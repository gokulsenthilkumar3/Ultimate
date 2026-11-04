import React, { lazy, Suspense, useState } from 'react';
import Modal from '../ui/Modal';
const Panel = lazy(() => import('./TechnologyPanel'));
export default function TechnologyCustomizer({ ownerId }) {
  const [open, setOpen] = useState(false);
  if (!ownerId) return null;
  return <><button type="button" className="header-control" aria-label="Stack technology customization" onClick={() => setOpen(true)}>Stack</button>
    <Modal open={open} title="Technology customization" onClose={() => setOpen(false)}>{open && <Suspense fallback={<p role="status">Loading technology catalog…</p>}><Panel key={ownerId} ownerId={ownerId} /></Suspense>}</Modal></>;
}

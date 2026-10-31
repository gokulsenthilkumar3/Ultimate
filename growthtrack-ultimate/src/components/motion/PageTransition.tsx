import { useRef, type ReactNode } from 'react';
import useSectionReveal from './useSectionReveal';

/** The next page is usable immediately. Its sections choreograph the entry; there is no outgoing-page wait. */
export default function PageTransition({ pageKey, children }: { pageKey: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useSectionReveal(ref, pageKey);
  // Keep this wrapper stable when the owner switches styles or motion preferences, preserving drafts and focus.
  return <div ref={ref} className="kinetic-page-transition" data-motion-page={pageKey}>{children}</div>;
}

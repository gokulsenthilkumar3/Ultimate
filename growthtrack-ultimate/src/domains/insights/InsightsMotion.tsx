import { useRef, type ReactNode } from 'react';
import useInsightsMotion from './useInsightsMotion';
import './insights.css';

/** Presentation boundary only. Each page keeps its own records, queries, forms and actions. */
export default function InsightsMotion({ page, view = '', children }: { page: string; view?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useInsightsMotion(ref, page, view);
  return <div ref={ref} className="insights-frame" data-insights-page={page} data-insight-route-view={view}>{children}</div>;
}

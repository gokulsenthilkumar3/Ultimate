import { useRef, type ReactNode } from 'react';
import { useKinetic } from './KineticContext';
import { PageArtworkContext } from './PageArtwork';
import WorkspaceArt, { type WorkspaceArtKind } from './WorkspaceArt';
import { usePageMotion, type PageMotionContract } from './pageMotion';
import './module-presentation.css';

type Area = 'finance' | 'wellness' | 'workspace';
const art: Record<Area, WorkspaceArtKind> = { finance: 'ledger', wellness: 'journal', workspace: 'board' };
const targets = '[data-area-motion], .glass-card, .gt-card, .native-card, .native-metric, .stat-card, .kinetic-hero-metric, .editorial-overview__section';
const contracts: Record<Area, PageMotionContract> = Object.fromEntries((['finance', 'wellness', 'workspace'] as Area[]).map(area => [area, {
  targets, avoidNested: true,
  roleOf: (target: Element) => {
    const explicit = target.getAttribute('data-area-motion');
    if (explicit && !['lead', 'surface', 'card', 'hero'].includes(explicit)) return explicit;
    if (target.matches('.native-metric, .stat-card, .kinetic-hero-metric')) return 'metric';
    return area === 'finance' ? 'ledger' : area === 'wellness' ? 'story' : 'queue';
  },
}])) as Record<Area, PageMotionContract>;

/** Pure presentation for every owner page in these areas; no data queries or local records. */
export default function ModulePresentation({ area, page, view = '', children }: { area: Area; page: string; view?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { enabled, canAnimate, tier, activeDialog } = useKinetic();
  usePageMotion(ref, page, view, contracts[area]);
  return <div ref={ref} className="module-frame" data-module-area={area} data-page-motion-owner={area} data-route-view={view} data-area-kinetic={enabled} data-area-animate={enabled && canAnimate && tier > 0 && !activeDialog}>
    <PageArtworkContext.Provider value={<WorkspaceArt kind={art[area]} />}>{children}</PageArtworkContext.Provider>
  </div>;
}

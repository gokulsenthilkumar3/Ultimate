import { useRef, type ReactNode } from 'react';
import { PageArtworkContext } from '../../components/motion/PageArtwork';
import WorkspaceArt, { type WorkspaceArtKind } from '../../components/motion/WorkspaceArt';
import { usePageMotion, type PageMotionContract } from '../../components/motion/pageMotion';
import { useKinetic } from '../../components/motion/KineticContext';
import './hub.css';

const artwork: Record<string, WorkspaceArtKind> = { hub: 'board', apps: 'launch', companion: 'launch', ai: 'thread', databases: 'data', profile: 'identity', notifications: 'inbox', help: 'book', logs: 'data', about: 'launch', pricing: 'board', customers: 'identity' };
export const hubMotionContract: PageMotionContract = {
  avoidNested: true,
  targets: '[data-area-motion], .gt-card, .glass-card, .native-card, .stat-card, .kinetic-hero-metric, .app-hub-panel, .app-hub-card, .gt-page-state, .gt-agents__connection, .gt-agents__settings-form, .gt-agents__message, .helpdesk-k-article, .helpdesk-k-diag, .about-card, .unified-matrix-card, .gt-editorial-settings__panel, .databases-system__table, .editorial-overview__lead, .editorial-overview__facts > div, .editorial-overview__section',
  roleOf: target => target.getAttribute('data-area-motion') || (target.matches('.stat-card, .kinetic-hero-metric, .editorial-overview__facts > div') ? 'metric' : target.matches('.app-hub-card, .app-hub-list-row, .app-hub-panel') ? 'launcher' : 'ledger'),
};

export default function HubPresentation({ page, view = '', children }: { page: string; view?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { enabled, canAnimate, tier, activeDialog } = useKinetic();
  usePageMotion(ref, page, view, hubMotionContract);
  return <div ref={ref} className="hub-frame" data-page-motion-owner="hub" data-hub-page={page} data-route-view={view} data-area-kinetic={enabled} data-area-animate={enabled && canAnimate && tier > 0 && !activeDialog}>
    <PageArtworkContext.Provider value={<WorkspaceArt kind={artwork[page] || 'board'} />}>{children}</PageArtworkContext.Provider>
  </div>;
}

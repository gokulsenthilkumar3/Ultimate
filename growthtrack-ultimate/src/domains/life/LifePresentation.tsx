import { useRef, type ReactNode } from 'react';
import { PageArtworkContext } from '../../components/motion/PageArtwork';
import WorkspaceArt, { type WorkspaceArtKind } from '../../components/motion/WorkspaceArt';
import { usePageMotion, type PageMotionContract } from '../../components/motion/pageMotion';
import { useKinetic } from '../../components/motion/KineticContext';
import './life.css';

const artwork: Record<string, WorkspaceArtKind> = { life: 'journal', social: 'thread', entertainment: 'reel', maps: 'places', family: 'family' };
export const lifeMotionContract: PageMotionContract = {
  avoidNested: true,
  targets: '[data-area-motion], .media-card, .native-person, .native-memory, .native-metric, .native-card, .glass-card, .gt-card, .stat-card, .kinetic-hero-metric, .editorial-overview__lead, .editorial-overview__facts > div, .editorial-overview__section',
  roleOf: target => target.getAttribute('data-area-motion') || (target.matches('.native-metric, .stat-card, .kinetic-hero-metric, .editorial-overview__facts > div') ? 'metric' : target.matches('.media-card') ? 'reel' : target.matches('.native-person') ? 'pin' : 'postcard'),
};

export default function LifePresentation({ page, view = '', children }: { page: string; view?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { enabled, canAnimate, tier, activeDialog } = useKinetic();
  usePageMotion(ref, page, view, lifeMotionContract);
  return <div ref={ref} className="life-frame" data-page-motion-owner="life" data-life-page={page} data-route-view={view} data-area-kinetic={enabled} data-area-animate={enabled && canAnimate && tier > 0 && !activeDialog}>
    <PageArtworkContext.Provider value={<WorkspaceArt kind={artwork[page] || 'journal'} />}>{children}</PageArtworkContext.Provider>
  </div>;
}

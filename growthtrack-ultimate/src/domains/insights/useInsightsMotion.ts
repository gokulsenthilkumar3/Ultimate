import type { RefObject } from 'react';
import { mountPageMotion, usePageMotion, type PageMotionContract, type PageMotionOptions } from '../../components/motion/pageMotion';

const contract: PageMotionContract = {
  targets: '[data-insight], .native-hero, .native-metric, .native-person, .native-chart',
  lines: '.recharts-line-curve, .recharts-area-curve, .native-chart path[stroke]',
  viewOrder: ['correlations', 'trends', 'habits', 'goals', 'cards', 'timeline', 'models', 'forecast', 'analytics', 'volatility'],
  viewAttribute: 'data-insight-view', routeViewAttribute: 'data-insight-route-view', keyAttribute: 'data-insight-key', stillAttribute: 'data-insight-still',
  stillEvent: 'insights:still', resumeEvent: 'insights:resume',
  roleOf: target => target.getAttribute('data-insight') || (target.matches('.native-person') ? 'model' : target.matches('.native-metric') ? 'metric' : target.matches('.native-chart') ? 'plot' : 'scene'),
};

export const mountInsightsMotion = (root: HTMLElement, options: Omit<PageMotionOptions, 'contract'>) => mountPageMotion(root, { ...options, contract });
export default function useInsightsMotion(ref: RefObject<HTMLElement | null>, page: string, view: string) {
  usePageMotion(ref, page, view, contract);
}

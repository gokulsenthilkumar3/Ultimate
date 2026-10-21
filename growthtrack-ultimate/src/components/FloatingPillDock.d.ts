import type { ReactElement } from 'react';
export interface FloatingPillDockProps {
  activeTab: string;
  /** @deprecated Router links own navigation. Accepted for source compatibility. */
  onTabChange?: (id: string) => void;
}
export default function FloatingPillDock(props: FloatingPillDockProps): ReactElement | null;

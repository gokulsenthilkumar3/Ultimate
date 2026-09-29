import type { ReactElement } from 'react';
export interface PremiumSidebarProps {
  activeTab: string; user?: { name?: string; fullName?: string };
  onOpenSettings?: () => void; onLogout?: () => void;
  /** @deprecated Router links own navigation. Accepted for source compatibility. */
  setActiveTab?: (id: string) => void;
}
export default function PremiumSidebar(props: PremiumSidebarProps): ReactElement | null;

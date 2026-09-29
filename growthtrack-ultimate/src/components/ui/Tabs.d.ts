import type { KeyboardEventHandler, ReactElement, ReactNode } from 'react';
export interface TabItem { value: string; label: ReactNode; description?: ReactNode; panelId?: string; disabled?: boolean; }
export interface TabsProps {
  label: string; tabs: readonly TabItem[]; value: string; onChange: (value: string) => void;
  className?: string; idPrefix?: string; onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  orientation?: 'horizontal' | 'vertical'; dir?: 'ltr' | 'rtl'; activation?: 'automatic' | 'manual';
}
export default function Tabs(props: TabsProps): ReactElement;

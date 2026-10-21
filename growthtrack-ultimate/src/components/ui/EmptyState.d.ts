import type { ComponentType } from 'react';

export type EmptyStateProps = {
  icon?: string | ComponentType<{ size?: number; strokeWidth?: number }>;
  title: string;
  description?: string;
  actionLabel?: string;
  ctaLabel?: string;
  onAction?: () => void;
  className?: string;
};

export default function EmptyState(props: EmptyStateProps): React.JSX.Element;

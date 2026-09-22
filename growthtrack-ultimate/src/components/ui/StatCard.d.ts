import type { ComponentType, CSSProperties } from 'react';

export type StatCardProps = {
  icon?: ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
  color?: string;
  style?: CSSProperties;
  trend?: React.ReactNode;
  hint?: React.ReactNode;
};

export default function StatCard(props: StatCardProps): React.JSX.Element;

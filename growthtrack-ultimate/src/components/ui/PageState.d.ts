import type { ReactElement } from 'react';
export type PageStateType = 'error' | 'offline' | 'empty' | 'loading' | 'unauthorized' | 'unavailable' | 'database-failure' | 'success';
export interface PageStateProps { state?: PageStateType; title?: string; description?: string; onRetry?: () => void; }
export default function PageState(props: PageStateProps): ReactElement;

import React, { useId, type ReactNode } from 'react';
import PageHeader from './PageHeader';

export type PageTemplateType = 'command' | 'record' | 'analytics' | 'detail' | 'settings' | 'immersive';
export interface PageTemplateProps {
  type: PageTemplateType;
  title: string;
  subtitle?: string;
  accent?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  status?: ReactNode;
  toolbar?: ReactNode;
  summary?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  headingLevel?: 1 | 2;
}

/** Layout slots, not a second main landmark. Modules own data, routing, and mutations. */
export default function PageTemplate({ type, title, subtitle, accent, icon, actions, status, toolbar, summary, aside, children, className = '', headingLevel = 1 }: PageTemplateProps) {
  const id = useId();
  return <section className={`gt-page-template gt-page-template--${type} ${className}`.trim()} data-responsive-foundation data-template={type} aria-label={title}>
    <PageHeader title={title} subtitle={subtitle} accent={accent} icon={icon} actions={actions} status={status} headingLevel={headingLevel} />
    {summary && <div className="gt-page-template__summary" aria-label={`${title} summary`}>{summary}</div>}
    {toolbar && <div className="gt-page-template__toolbar">{toolbar}</div>}
    <div className="gt-page-template__layout" data-has-aside={Boolean(aside)}>
      <div className="gt-page-template__content">{children}</div>
      {aside && <aside className="gt-page-template__aside" aria-labelledby={`${id}-related`}><h2 id={`${id}-related`} className="gt-foundation-sr-only">Related information</h2>{aside}</aside>}
    </div>
  </section>;
}

type PresetProps = Omit<PageTemplateProps, 'type'>;
export function CommandPage(props: PresetProps) { return <PageTemplate {...props} type="command" />; }
export function RecordPage(props: PresetProps) { return <PageTemplate {...props} type="record" />; }
export function AnalyticsPage(props: PresetProps) { return <PageTemplate {...props} type="analytics" />; }
export function DetailPage(props: PresetProps) { return <PageTemplate {...props} type="detail" />; }
export function SettingsPage(props: PresetProps) { return <PageTemplate {...props} type="settings" />; }
export function ImmersivePage(props: PresetProps) { return <PageTemplate {...props} type="immersive" />; }

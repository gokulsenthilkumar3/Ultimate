import React from 'react';

/**
 * PageHeader — consistent page-level header used across all dashboard modules.
 *
 * @param {{ title: string, accent?: string, icon?: React.ReactNode,
 * subtitle?: string, actions?: React.ReactNode, status?: React.ReactNode,
 * headingLevel?: 1 | 2 }} props
 */
export default function PageHeader({ accent, icon, title, subtitle, actions, status, headingLevel = 1 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h1';
  return (
    <div className="page-header-block gt-editorial-header" data-has-actions={Boolean(actions)} data-has-status={Boolean(status)}>
      <div className="gt-editorial-header__intro">
        {accent && <p className="gt-editorial-header__eyebrow">{accent}</p>}
        <Heading className="gt-editorial-header__title">
          {icon && <span className="gt-editorial-header__icon" aria-hidden="true">{icon}</span>}
          {title}
        </Heading>
        {subtitle && (
          <p className="gt-editorial-header__subtitle">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="page-header-block__actions">
          {actions}
        </div>
      )}
      {status && <div className="page-header-block__status">{status}</div>}
    </div>
  );
}

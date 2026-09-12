import React from 'react';

/** A quiet, semantic surface for every product module. */
export default function Card({ as: Tag = 'section', interactive = false, className = '', children, ...props }) {
  return <Tag className={`gt-card${interactive ? ' gt-card--interactive' : ''} ${className}`.trim()} {...props}>{children}</Tag>;
}

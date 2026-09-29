import React, { type ReactNode } from 'react';

export interface FormErrorProps { id?: string; children?: ReactNode; errors?: { fieldId: string; message: string }[]; title?: string; }
/** Field-level errors use id + aria-describedby; summaries link directly to invalid fields. */
export default function FormError({ id, children, errors = [], title = 'Check the following fields' }: FormErrorProps) {
  if (!children && !errors.length) return null;
  return <div id={id} className="gt-form-error" data-responsive-foundation role="alert" aria-atomic="true">
    {children}
    {errors.length > 0 && <><p>{title}</p><ul>{errors.map(error => <li key={error.fieldId}><a href={`#${error.fieldId}`} onClick={event => {
      const field = document.getElementById(error.fieldId);
      if (field) { event.preventDefault(); field.focus(); field.scrollIntoView?.({ block: 'nearest' }); }
    }}>{error.message}</a></li>)}</ul></>}
  </div>;
}

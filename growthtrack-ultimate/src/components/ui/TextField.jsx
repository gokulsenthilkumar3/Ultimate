import React, { forwardRef, useId } from 'react';

const TextField = forwardRef(function TextField({ label, hint, error, success, required = false, id: providedId, className = '', 'aria-describedby': externalDescription, ...props }, ref) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const successId = success && !error ? `${id}-success` : undefined;
  const describedBy = [externalDescription, hintId, errorId, successId].filter(Boolean).join(' ') || undefined;
  return <div className={`gt-field ${className}`.trim()}>
    <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    {hint && <p id={hintId} className="gt-field__hint">{hint}</p>}
    <input {...props} ref={ref} id={id} required={required} aria-required={required || undefined} aria-invalid={Boolean(error) || props['aria-invalid']} aria-describedby={describedBy} />
    {error && <p id={errorId} className="gt-field__error" role="alert">{error}</p>}
    {successId && <p id={successId} className="gt-field__success" role="status">{success}</p>}
  </div>;
});

export default TextField;

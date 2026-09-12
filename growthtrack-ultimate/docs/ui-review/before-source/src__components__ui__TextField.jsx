import React, { forwardRef, useId } from 'react';

const TextField = forwardRef(function TextField({ label, hint, error, required = false, id: providedId, className = '', ...props }, ref) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return <div className={`gt-field ${className}`.trim()}>
    <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
    {hint && <p id={hintId} className="gt-field__hint">{hint}</p>}
    <input ref={ref} id={id} required={required} aria-required={required || undefined} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...props} />
    {error && <p id={errorId} className="gt-field__error" role="alert">{error}</p>}
  </div>;
});

export default TextField;

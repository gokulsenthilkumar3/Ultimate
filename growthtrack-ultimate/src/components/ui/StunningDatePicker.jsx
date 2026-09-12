import React, { forwardRef } from 'react';
import TextField from './TextField';

/** Date-only ISO value; native picker handles locale, keyboard and mobile UI. */
const StunningDatePicker = forwardRef(function StunningDatePicker({ label, value = '', onChange, ...props }, ref) {
  return <TextField {...props} ref={ref} label={label} type="date" value={value}
    onChange={event => onChange(event.target.value)} />;
});
export default StunningDatePicker;

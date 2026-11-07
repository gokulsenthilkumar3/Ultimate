import React from 'react';
import { Field } from '../native/ModuleUI';

/** A date with how sure we are about it. Month and year dates are stored as the first day of the period. */
export default function DateCertaintyFields({ kind, label, member }) {
  const title = kind === 'birth' ? 'Birth' : 'Death';
  return <>
    <Field label={label}><input type="date" name={`${kind}Date`} defaultValue={member?.[`${kind}Date`]?.slice(0, 10) || ''} /></Field>
    <Field label={`${title} date certainty`} hint="For month or year only, any day in that period works.">
      <select name={`${kind}DatePrecision`} defaultValue={member?.[`${kind}DatePrecision`] || 'day'}><option value="day">Exact day</option><option value="month">Month only</option><option value="year">Year only</option></select>
    </Field>
    <label className="family-check"><input type="checkbox" name={`${kind}DateApproximate`} defaultChecked={member?.[`${kind}DateApproximate`] === true} /><span>About this date (approximate)</span></label>
    {kind === 'death' && <label className="family-check"><input type="checkbox" name="deathRecorded" defaultChecked={member?.deathRecorded === true} /><span>Passed away, date not known</span></label>}
  </>;
}

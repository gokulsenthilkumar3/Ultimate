import { describe, expect, it } from 'vitest';
import { dateBody, describeDate, isDeceased, yearLabel } from './familyDates';

describe('dates are shown at the certainty they were recorded', () => {
  const at = '1950-03-01T00:00:00.000Z';
  it('never invents precision', () => {
    expect(describeDate(at, 'day')).toMatch(/1950/); expect(describeDate(at, 'day')).toMatch(/\b1\b/);
    expect(describeDate(at, 'month')).toMatch(/1950/); expect(describeDate(at, 'month')).not.toMatch(/\b1\b.*\b1950\b.*\b1\b/);
    expect(describeDate(at, 'year')).toBe('1950');
    expect(describeDate(at, 'year', true)).toBe('c. 1950'); expect(describeDate(at, 'day', true)).toMatch(/^c\. /);
    expect(describeDate(null)).toBe('Unknown date'); expect(describeDate('nonsense', 'day', false, 'n/a')).toBe('n/a');
  });
  it('labels a year for compact views and defaults old rows to exact', () => {
    expect(yearLabel(at)).toBe('1950'); expect(yearLabel(at, true)).toBe('c. 1950'); expect(yearLabel(null)).toBe('');
    expect(describeDate(at)).toBe(describeDate(at, 'day', false));
  });
  it('counts a death recorded without a date as deceased', () => {
    expect(isDeceased({ deathDate: null })).toBe(false); expect(isDeceased(undefined)).toBe(false);
    expect(isDeceased({ deathDate: at })).toBe(true); expect(isDeceased({ deathDate: null, deathRecorded: true })).toBe(true);
  });
});

describe('form values become the profile payload', () => {
  it('sends certainty only for dates that are in the form, and turns checkboxes into booleans', () => {
    expect(dateBody({ name: 'A', birthDate: '1950-03-12' })).toEqual({ name: 'A', birthDate: '1950-03-12', birthDatePrecision: 'day', birthDateApproximate: false });
    expect(dateBody({ name: 'A' })).toEqual({ name: 'A' });
    expect(dateBody({ birthDate: '1950-01-01', birthDatePrecision: 'year', birthDateApproximate: 'on', deathDate: '', deathRecorded: 'on' })).toEqual({
      birthDate: '1950-01-01', birthDatePrecision: 'year', birthDateApproximate: true, deathDate: '', deathDatePrecision: 'day', deathDateApproximate: false, deathRecorded: true,
    });
  });
  it('treats an unchecked "date not known" box as living, matching clearing the date', () => {
    expect(dateBody({ deathDate: '' }).deathRecorded).toBe(false);
  });
});

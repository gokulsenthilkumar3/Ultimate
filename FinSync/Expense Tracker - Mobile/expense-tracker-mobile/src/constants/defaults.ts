export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_LOCALE = 'en-IN';

export const BUDGET_WARNING_PCT = 80; // alert at 80% of budget
export const BUDGET_EXCEEDED_PCT = 100;

export const REMINDER_LEAD_DAYS_OPTIONS = [1, 2, 3, 5, 7]; // days before due
export const DEFAULT_REMINDER_DAYS = 1;

export const REPORT_PRESETS = [
  { label: 'This Month',  value: 'this_month' },
  { label: 'Last Month',  value: 'last_month' },
  { label: 'Last 3 Months', value: 'last_3' },
  { label: 'Last 6 Months', value: 'last_6' },
  { label: 'This Year',   value: 'this_year' },
  { label: 'Custom',      value: 'custom' },
];

export const EXPORT_FORMATS = ['PDF', 'CSV', 'XLSX'] as const;
export type ExportFormat = typeof EXPORT_FORMATS[number];

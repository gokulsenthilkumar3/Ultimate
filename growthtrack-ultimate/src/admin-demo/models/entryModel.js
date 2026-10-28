import { SAMPLE_DATE } from './chartModel';

export const MONEY_TYPES = ['transaction', 'budget category', 'subscription', 'shopping item'];
export const DATED_TYPES = ['calendar event', 'family event', 'transaction', 'subscription'];
export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function validateEntry(type, values) {
  if (MONEY_TYPES.includes(type)) {
    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount < .01 || amount > 1000000000) return 'Enter an amount between ₹ 0.01 and ₹ 1,00,00,00,000.';
    if (Math.abs(amount * 100 - Math.round(amount * 100)) > .000001) return 'Use no more than two decimal places for an amount.';
  }
  if (DATED_TYPES.includes(type) && !validDate(values.date)) return 'Choose a valid date for this record.';
  if (type === 'transaction' && !['Income', 'Expense'].includes(values.direction)) return 'Choose income or expense.';
  if (type === 'shopping item' && !['Planned', 'Purchased'].includes(values.status)) return 'Choose planned or purchased.';
  return '';
}
export function normaliseEntry(type, values, origin, id) {
  return {
    id, title: values.title.trim(), type, origin, notes: String(values.notes || '').trim(),
    date: values.date || SAMPLE_DATE,
    ...(MONEY_TYPES.includes(type) ? { amount: Math.round(Number(values.amount) * 100) / 100 } : {}),
    ...(['transaction', 'shopping item'].includes(type) ? { category: String(values.category || '').trim() || (type === 'transaction' ? 'Other' : 'Personal') } : {}),
    ...(values.direction ? { direction: values.direction } : {}),
    status: values.status || (type === 'subscription' ? 'Active' : type === 'transaction' ? 'Recorded' : 'Created in demo'),
  };
}

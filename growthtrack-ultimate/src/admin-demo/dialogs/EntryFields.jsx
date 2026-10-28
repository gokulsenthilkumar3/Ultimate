import React from 'react';
import { DATED_TYPES, MONEY_TYPES } from '../models/entryModel';
import { SAMPLE_DATE } from '../models/chartModel';

export default function EntryFields({ type, date }) {
  return <>
    {MONEY_TYPES.includes(type) && <label>{type === 'budget category' ? 'Monthly limit (₹)' : type === 'subscription' ? 'Monthly cost (₹)' : 'Amount (₹)'}<input name="amount" type="number" inputMode="decimal" min="0.01" max="1000000000" step="0.01" required /></label>}
    {type === 'transaction' && <label>Direction<select name="direction" defaultValue="Expense"><option>Expense</option><option>Income</option></select></label>}
    {['transaction', 'shopping item'].includes(type) && <label>Category<input name="category" maxLength={60} defaultValue={type === 'transaction' ? 'Other' : 'Personal'} /></label>}
    {type === 'shopping item' && <label>Item status<select name="status" defaultValue="Planned"><option>Planned</option><option>Purchased</option></select></label>}
    {DATED_TYPES.includes(type) && <label>{type === 'subscription' ? 'Next renewal' : 'Record date'}<input name="date" type="date" required defaultValue={date || (type === 'subscription' ? '2026-11-01' : SAMPLE_DATE)} /></label>}
    <label>Notes<textarea name="notes" rows={3} maxLength={2000} placeholder="A little context…" /></label>
  </>;
}

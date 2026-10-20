import { describe, expect, it } from 'vitest';
import { extractAmount, extractDate, inferCategory, parseQuickCapture } from './quickCapture';

// Sunday 18 October 2026, 10:00 local time.
const now = new Date(2026, 9, 18, 10, 0, 0);
const parse = text => parseQuickCapture(text, { now });

describe('quick capture', () => {
  it('turns spending sentences into reviewed expense transactions', () => {
    expect(parse('spent 450 on lunch via upi')).toMatchObject({
      kind: 'expense', target: 'transaction',
      payload: { amount: 450, type: 'Expense', category: 'Food', method: 'UPI', date: '2026-10-18', note: 'Lunch' },
    });
    expect(parse('paid ₹1,250.50 for electricity bill yesterday').payload).toMatchObject({ amount: 1250.5, category: 'Utilities', date: '2026-10-17' });
    expect(parse('bought shoes 2.5k on card').payload).toMatchObject({ amount: 2500, category: 'Apparel', method: 'Card' });
    expect(parse('spent 300rs uber friday').payload).toMatchObject({ amount: 300, category: 'Transport', date: '2026-10-16' });
    expect(parse('spent 99 on something odd').payload.category).toBe('Other');
    expect(parse('spent nothing')).toBeNull();
  });

  it('recognises income and salary', () => {
    expect(parse('salary 85000').payload).toMatchObject({ amount: 85000, type: 'Income', category: 'Salary' });
    expect(parse('received 1200 from freelance gig').payload).toMatchObject({ amount: 1200, type: 'Income', note: 'Freelance gig' });
  });

  it('logs water with unit conversion and refuses ambiguous numbers', () => {
    expect(parse('drank 500ml')).toMatchObject({ target: 'hydration', payload: { amount: 500 } });
    expect(parse('drank 2 glasses of water').payload.amount).toBe(500);
    expect(parse('water 1.5 l').payload.amount).toBe(1500);
    expect(parse('had 500')).toBeNull();
    expect(parse('drank 9 l')).toBeNull();
  });

  it('logs sleep, weight and mood within safe ranges', () => {
    expect(parse('slept 7h 30m')).toMatchObject({ target: 'sleep', payload: { date: '2026-10-18', hours: 7.5, duration: 7.5 } });
    expect(parse('slept 6 hours yesterday').payload.date).toBe('2026-10-17');
    expect(parse('slept 30h')).toBeNull();
    expect(parse('weight 72.4')).toMatchObject({ target: 'metric', payload: { metric: 'weight', value: 72.4, unit: 'kg', source: 'quick-capture' } });
    expect(parse('weighed 160 lbs').payload.value).toBe(72.6);
    expect(parse('weight 5')).toBeNull();
    expect(parse('mood great')).toMatchObject({ target: 'mood', payload: { mood: 5, date: '2026-10-18' } });
    expect(parse('feeling pretty low')).toMatchObject({ payload: { mood: 2 } });
    expect(parse('feeling purple')).toBeNull();
  });

  it('creates tasks with forward-looking due dates and priority', () => {
    expect(parse('todo Call the Bank tomorrow')).toMatchObject({ target: 'task', payload: { title: 'Call the Bank', due_date: '2026-10-19', priority: 'medium', status: 'pending' } });
    expect(parse('remind me to renew passport friday').payload).toMatchObject({ title: 'Renew passport', due_date: '2026-10-23' });
    expect(parse('task submit report urgent').payload).toMatchObject({ title: 'Submit report', priority: 'high' });
    expect(parse('todo water plants').payload).not.toHaveProperty('due_date');
  });

  it('leaves ordinary searches alone', () => {
    for (const query of ['finance', 'notes', 'open calendar', 'spent', 'weight', 'tasks due today']) expect(parse(query)).toBeNull();
  });

  it('exposes reusable helpers', () => {
    expect(extractAmount('rent 1,00,000').amount).toBe(100000);
    expect(extractAmount('car 2 lakh').amount).toBe(200000);
    expect(extractAmount('v2.5 release')).toBeNull();
    expect(extractDate('lunch monday', now)).toMatchObject({ date: '2026-10-12', rest: 'lunch', explicit: true });
    expect(extractDate('review monday', now, 'future').date).toBe('2026-10-19');
    expect(inferCategory('protein from amazon')).toBe('Supplements');
  });
});

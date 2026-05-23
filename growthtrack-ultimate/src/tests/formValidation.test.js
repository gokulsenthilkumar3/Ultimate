/**
 * tests/formValidation.test.js — GrowthTrack Ultimate
 *
 * Unit tests for all 12 module validators in hooks/useFormValidation.js.
 * Run with: npx vitest run
 */

import { describe, it, expect } from 'vitest';
import { validators } from '../hooks/useFormValidation';

// ------------------------------------------------------------------ Finance
describe('validators.finance', () => {
  it('rejects zero amount', () => {
    expect(validators.finance.amount('0').valid).toBe(false);
  });
  it('rejects negative amount', () => {
    expect(validators.finance.amount('-5').valid).toBe(false);
  });
  it('accepts positive amount', () => {
    expect(validators.finance.amount('150.50').valid).toBe(true);
  });
  it('rejects missing category', () => {
    expect(validators.finance.category('').valid).toBe(false);
  });
  it('accepts valid category', () => {
    expect(validators.finance.category('Food').valid).toBe(true);
  });
  it('rejects invalid date', () => {
    expect(validators.finance.date('not-a-date').valid).toBe(false);
  });
  it('accepts valid date', () => {
    expect(validators.finance.date('2026-05-23').valid).toBe(true);
  });
  it('validateAll returns error on missing category', () => {
    const r = validators.finance.validateAll({ amount: '100', category: '', date: '2026-05-23' });
    expect(r).not.toBeNull();
    expect(r.valid).toBe(false);
  });
  it('validateAll returns null when all valid', () => {
    const r = validators.finance.validateAll({ amount: '100', category: 'Food', date: '2026-05-23' });
    expect(r).toBeNull();
  });
});

// ------------------------------------------------------------------ Tasks
describe('validators.tasks', () => {
  it('rejects title shorter than 2 chars', () => {
    expect(validators.tasks.title('A').valid).toBe(false);
  });
  it('accepts valid title', () => {
    expect(validators.tasks.title('Buy milk').valid).toBe(true);
  });
  it('accepts empty dueDate (optional)', () => {
    expect(validators.tasks.dueDate('').valid).toBe(true);
  });
  it('rejects invalid dueDate when provided', () => {
    expect(validators.tasks.dueDate('bad-date').valid).toBe(false);
  });
});

// ------------------------------------------------------------------ Habits
describe('validators.habits', () => {
  it('rejects empty name', () => {
    expect(validators.habits.name('').valid).toBe(false);
  });
  it('rejects single-char name', () => {
    expect(validators.habits.name('X').valid).toBe(false);
  });
  it('accepts valid name', () => {
    expect(validators.habits.name('Morning run').valid).toBe(true);
  });
});

// ------------------------------------------------------------------ Training
describe('validators.training', () => {
  it('rejects zero sets', () => {
    expect(validators.training.sets('0').valid).toBe(false);
  });
  it('rejects sets > 99', () => {
    expect(validators.training.sets('100').valid).toBe(false);
  });
  it('accepts valid sets', () => {
    expect(validators.training.sets('3').valid).toBe(true);
  });
  it('rejects zero reps', () => {
    expect(validators.training.reps('0').valid).toBe(false);
  });
  it('rejects reps > 999', () => {
    expect(validators.training.reps('1000').valid).toBe(false);
  });
  it('validateAll catches missing exercise name', () => {
    const r = validators.training.validateAll({ exerciseName: '', sets: '3', reps: '10' });
    expect(r?.valid).toBe(false);
  });
});

// ------------------------------------------------------------------ Nutrition
describe('validators.nutrition', () => {
  it('rejects empty food name', () => {
    expect(validators.nutrition.foodName('').valid).toBe(false);
  });
  it('rejects 0 calories', () => {
    expect(validators.nutrition.calories('0').valid).toBe(false);
  });
  it('rejects calories > 10000', () => {
    expect(validators.nutrition.calories('10001').valid).toBe(false);
  });
  it('accepts valid meal', () => {
    const r = validators.nutrition.validateAll({ foodName: 'Oats', calories: '350' });
    expect(r).toBeNull();
  });
});

// ------------------------------------------------------------------ Goals
describe('validators.goals', () => {
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const tomorrow  = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  it('rejects past target date', () => {
    expect(validators.goals.targetDate(yesterday).valid).toBe(false);
  });
  it('accepts future target date', () => {
    expect(validators.goals.targetDate(tomorrow).valid).toBe(true);
  });
  it('rejects short title', () => {
    expect(validators.goals.title('A').valid).toBe(false);
  });
});

// ------------------------------------------------------------------ Notes
describe('validators.notes', () => {
  it('rejects empty title', () => {
    expect(validators.notes.title('').valid).toBe(false);
  });
  it('rejects empty content', () => {
    expect(validators.notes.content('').valid).toBe(false);
  });
  it('accepts valid note', () => {
    const r = validators.notes.validateAll({ title: 'My note', content: 'Body text here' });
    expect(r).toBeNull();
  });
});

// ------------------------------------------------------------------ Sleep
describe('validators.sleep', () => {
  it('rejects 0 hours', () => {
    expect(validators.sleep.duration('0').valid).toBe(false);
  });
  it('rejects > 14 hours', () => {
    expect(validators.sleep.duration('15').valid).toBe(false);
  });
  it('accepts 7 hours', () => {
    expect(validators.sleep.duration('7').valid).toBe(true);
  });
  it('accepts 1 hour (min boundary)', () => {
    expect(validators.sleep.duration('1').valid).toBe(true);
  });
  it('accepts 14 hours (max boundary)', () => {
    expect(validators.sleep.duration('14').valid).toBe(true);
  });
});

// ------------------------------------------------------------------ HealthExtras
describe('validators.healthExtras', () => {
  it('rejects systolic below 60', () => {
    expect(validators.healthExtras.systolic('50').valid).toBe(false);
  });
  it('rejects systolic above 250', () => {
    expect(validators.healthExtras.systolic('260').valid).toBe(false);
  });
  it('accepts normal systolic 120', () => {
    expect(validators.healthExtras.systolic('120').valid).toBe(true);
  });
  it('rejects heart rate below 30', () => {
    expect(validators.healthExtras.heartRate('20').valid).toBe(false);
  });
  it('accepts heart rate 72', () => {
    expect(validators.healthExtras.heartRate('72').valid).toBe(true);
  });
});

// ------------------------------------------------------------------ Shopping
describe('validators.shopping', () => {
  it('rejects empty item name', () => {
    expect(validators.shopping.name('').valid).toBe(false);
  });
  it('accepts empty price (optional)', () => {
    expect(validators.shopping.price('').valid).toBe(true);
  });
  it('rejects negative price', () => {
    expect(validators.shopping.price('-1').valid).toBe(false);
  });
  it('accepts zero price (free item)', () => {
    expect(validators.shopping.price('0').valid).toBe(true);
  });
});

// ------------------------------------------------------------------ Timesheet
describe('validators.timesheet', () => {
  it('rejects empty project name', () => {
    expect(validators.timesheet.project('').valid).toBe(false);
  });
  it('accepts empty duration in timer mode', () => {
    const r = validators.timesheet.validateAll({ project: 'MyApp', durationHours: '', isTimerMode: true });
    expect(r).toBeNull();
  });
  it('rejects zero duration in manual mode', () => {
    const r = validators.timesheet.validateAll({ project: 'MyApp', durationHours: '0', isTimerMode: false });
    expect(r?.valid).toBe(false);
  });
});

// ------------------------------------------------------------------ Medical
describe('validators.medical', () => {
  it('rejects empty medication name', () => {
    expect(validators.medical.name('').valid).toBe(false);
  });
  it('rejects empty dosage', () => {
    expect(validators.medical.dosage('').valid).toBe(false);
  });
  it('accepts valid medication', () => {
    const r = validators.medical.validateAll({ name: 'Aspirin', dosage: '100mg' });
    expect(r).toBeNull();
  });
});

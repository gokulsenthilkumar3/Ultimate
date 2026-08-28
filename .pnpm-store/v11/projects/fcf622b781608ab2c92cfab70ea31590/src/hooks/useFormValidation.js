/**
 * hooks/useFormValidation.js — GrowthTrack Ultimate
 *
 * Centralised form-field validation rules for all 12 modules.
 * Each validator returns { valid: boolean, message: string }.
 *
 * Usage in a component:
 *   import { validators } from '../hooks/useFormValidation';
 *   const result = validators.finance.amount('0');
 *   // { valid: false, message: 'Amount must be greater than 0' }
 *
 * Each module also exports a validateAll(formData) helper that runs
 * all field validators and returns the first failure, or null if clean.
 */

// ───────────────────────────────────────────────────────────────────────
// Primitive helpers
// ───────────────────────────────────────────────────────────────────────
const ok  = ()      => ({ valid: true,  message: '' });
const err = (msg)   => ({ valid: false, message: msg });

const required  = (v, label) => (!v || String(v).trim() === '') ? err(`${label} is required`) : ok();
const minLen    = (v, n, label) => (String(v).trim().length < n) ? err(`${label} must be at least ${n} characters`) : ok();
const positiveN = (v, label) => (isNaN(Number(v)) || Number(v) <= 0) ? err(`${label} must be greater than 0`) : ok();
const rangeN    = (v, min, max, label) => {
  const n = Number(v);
  if (isNaN(n)) return err(`${label} must be a number`);
  if (n < min)  return err(`${label} must be at least ${min}`);
  if (n > max)  return err(`${label} must be at most ${max}`);
  return ok();
};
const nonNegN   = (v, label) => (isNaN(Number(v)) || Number(v) < 0) ? err(`${label} cannot be negative`) : ok();
const futureDate = (v, label) => {
  if (!v) return err(`${label} is required`);
  const today = new Date().toISOString().slice(0, 10);
  return v < today ? err(`${label} cannot be in the past`) : ok();
};
const validDate  = (v, label) => (!v || isNaN(Date.parse(v))) ? err(`${label} must be a valid date`) : ok();

// ───────────────────────────────────────────────────────────────────────
// Module validators
// ───────────────────────────────────────────────────────────────────────

export const validators = {

  // 1. Finance — add transaction
  finance: {
    amount:   (v) => positiveN(v, 'Amount'),
    category: (v) => required(v, 'Category'),
    date:     (v) => validDate(v, 'Date'),
    validateAll: ({ amount, category, date }) => {
      for (const fn of [
        () => positiveN(amount, 'Amount'),
        () => required(category, 'Category'),
        () => validDate(date, 'Date'),
      ]) {
        const r = fn();
        if (!r.valid) return r;
      }
      return null;
    },
  },

  // 2. Tasks — add / edit task
  tasks: {
    title:   (v) => minLen(v, 2, 'Task title'),
    dueDate: (v) => (!v ? ok() : validDate(v, 'Due date')),  // due date is optional but must be valid if provided
    validateAll: ({ title, dueDate }) => {
      const r1 = minLen(title, 2, 'Task title');
      if (!r1.valid) return r1;
      if (dueDate) {
        const r2 = validDate(dueDate, 'Due date');
        if (!r2.valid) return r2;
      }
      return null;
    },
  },

  // 3. Habits — add habit
  habits: {
    name: (v) => minLen(v, 2, 'Habit name'),
    validateAll: ({ name }) => {
      const r = minLen(name, 2, 'Habit name');
      return r.valid ? null : r;
    },
  },

  // 4. Training — add workout / exercise
  training: {
    exerciseName: (v) => minLen(v, 2, 'Exercise name'),
    sets:         (v) => rangeN(v, 1, 99, 'Sets'),
    reps:         (v) => rangeN(v, 1, 999, 'Reps'),
    validateAll: ({ exerciseName, sets, reps }) => {
      for (const fn of [
        () => minLen(exerciseName, 2, 'Exercise name'),
        () => rangeN(sets, 1, 99, 'Sets'),
        () => rangeN(reps, 1, 999, 'Reps'),
      ]) {
        const r = fn();
        if (!r.valid) return r;
      }
      return null;
    },
  },

  // 5. Nutrition — log meal
  nutrition: {
    foodName: (v) => minLen(v, 2, 'Food name'),
    calories: (v) => rangeN(v, 1, 10000, 'Calories'),
    validateAll: ({ foodName, calories }) => {
      for (const fn of [
        () => minLen(foodName, 2, 'Food name'),
        () => rangeN(calories, 1, 10000, 'Calories'),
      ]) {
        const r = fn();
        if (!r.valid) return r;
      }
      return null;
    },
  },

  // 6. Goals — create goal
  goals: {
    title:      (v) => minLen(v, 2, 'Goal title'),
    targetDate: (v) => futureDate(v, 'Target date'),
    validateAll: ({ title, targetDate }) => {
      for (const fn of [
        () => minLen(title, 2, 'Goal title'),
        () => futureDate(targetDate, 'Target date'),
      ]) {
        const r = fn();
        if (!r.valid) return r;
      }
      return null;
    },
  },

  // 7. Notes — save note
  notes: {
    title:   (v) => minLen(v, 1, 'Note title'),
    content: (v) => required(v, 'Content'),
    validateAll: ({ title, content }) => {
      for (const fn of [
        () => minLen(title, 1, 'Note title'),
        () => required(content, 'Content'),
      ]) {
        const r = fn();
        if (!r.valid) return r;
      }
      return null;
    },
  },

  // 8. Sleep — log sleep
  sleep: {
    duration: (v) => rangeN(v, 1, 14, 'Sleep duration (hours)'),
    date:     (v) => validDate(v, 'Sleep date'),
    validateAll: ({ duration, date }) => {
      for (const fn of [
        () => rangeN(duration, 1, 14, 'Sleep duration (hours)'),
        () => validDate(date, 'Sleep date'),
      ]) {
        const r = fn();
        if (!r.valid) return r;
      }
      return null;
    },
  },

  // 9. HealthExtras — log vitals
  healthExtras: {
    systolic:    (v) => rangeN(v, 60, 250, 'Systolic BP'),
    diastolic:   (v) => rangeN(v, 40, 150, 'Diastolic BP'),
    heartRate:   (v) => rangeN(v, 30, 250, 'Heart rate'),
    validateAll: ({ systolic, diastolic, heartRate }) => {
      const checks = [];
      if (systolic  !== undefined && systolic  !== '') checks.push(() => rangeN(systolic,  60,  250, 'Systolic BP'));
      if (diastolic !== undefined && diastolic !== '') checks.push(() => rangeN(diastolic, 40,  150, 'Diastolic BP'));
      if (heartRate !== undefined && heartRate !== '') checks.push(() => rangeN(heartRate,  30, 250, 'Heart rate'));
      for (const fn of checks) {
        const r = fn();
        if (!r.valid) return r;
      }
      return null;
    },
  },

  // 10. Shopping — add shopping item
  shopping: {
    name:  (v) => minLen(v, 2, 'Item name'),
    price: (v) => (!v || v === '' ? ok() : nonNegN(v, 'Price')),  // price is optional
    validateAll: ({ name, price }) => {
      const r1 = minLen(name, 2, 'Item name');
      if (!r1.valid) return r1;
      if (price !== undefined && price !== '') {
        const r2 = nonNegN(price, 'Price');
        if (!r2.valid) return r2;
      }
      return null;
    },
  },

  // 11. Timesheet — add session
  timesheet: {
    project:       (v) => minLen(v, 1, 'Project name'),
    durationHours: (v) => {
      if (!v || v === '') return ok(); // timer-mode doesn’t supply duration
      return rangeN(v, 0.05, 24, 'Duration');
    },
    validateAll: ({ project, durationHours, isTimerMode }) => {
      const r1 = minLen(project, 1, 'Project name');
      if (!r1.valid) return r1;
      if (!isTimerMode && durationHours !== undefined && durationHours !== '') {
        const r2 = rangeN(durationHours, 0.05, 24, 'Duration');
        if (!r2.valid) return r2;
      }
      return null;
    },
  },

  // 12. Medical — add medication
  medical: {
    name:   (v) => minLen(v, 2, 'Medication name'),
    dosage: (v) => minLen(v, 1, 'Dosage'),
    validateAll: ({ name, dosage }) => {
      for (const fn of [
        () => minLen(name, 2, 'Medication name'),
        () => minLen(dosage, 1, 'Dosage'),
      ]) {
        const r = fn();
        if (!r.valid) return r;
      }
      return null;
    },
  },
};

/**
 * Generic React hook wrapping a validator object.
 *
 * Usage:
 *   const { errors, validateField, validateAll, clearErrors } = useFormValidation('finance');
 *
 * validateField(fieldName, value) — validates one field, stores error in state.
 * validateAll(formData) — validates all fields, stores all errors, returns boolean.
 * clearErrors() — resets all field errors.
 */
import { useState, useCallback } from 'react';

export function useFormValidation(moduleName) {
  const moduleValidators = validators[moduleName];
  const [errors, setErrors] = useState({});

  const validateField = useCallback((field, value) => {
    const fn = moduleValidators?.[field];
    if (!fn) return true;
    const result = fn(value);
    setErrors(prev => ({
      ...prev,
      [field]: result.valid ? '' : result.message,
    }));
    return result.valid;
  }, [moduleValidators]);

  const runValidateAll = useCallback((formData) => {
    const fn = moduleValidators?.validateAll;
    if (!fn) return true;
    const result = fn(formData);
    if (result) {
      // result is the first failing { valid, message } — find the field key
      // Also set a generic '__form' error for non-field-specific messages
      setErrors(prev => ({ ...prev, __form: result.message }));
      return false;
    }
    setErrors({});
    return true;
  }, [moduleValidators]);

  const clearErrors = useCallback(() => setErrors({}), []);

  return { errors, validateField, validateAll: runValidateAll, clearErrors };
}

export default useFormValidation;

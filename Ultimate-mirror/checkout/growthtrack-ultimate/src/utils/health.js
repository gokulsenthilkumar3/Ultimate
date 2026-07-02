/**
 * utils/health.js — Pure utility functions for health & body metric calculations.
 * Kept separate so they can be unit-tested independently of React.
 */

/** Calculate BMI */
export const calcBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return 0;
  const h = heightCm / 100;
  return parseFloat((weightKg / (h * h)).toFixed(1));
};

/** Get BMI category string */
export const getBMICategory = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25)   return 'Normal';
  if (bmi < 30)   return 'Overweight';
  return 'Obese';
};

/** Calculate lean body mass */
export const calcLeanMass = (weightKg, bodyFatPct) =>
  parseFloat((weightKg * (1 - bodyFatPct / 100)).toFixed(1));

/** Calculate habit streak from sorted array of date strings (YYYY-MM-DD) */
export const calcStreak = (completedDates) => {
  if (!completedDates || completedDates.length === 0) return 0;
  const sorted = [...completedDates].sort();
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const expected = new Date();
    expected.setDate(expected.getDate() - (sorted.length - 1 - i));
    if (sorted[i] === expected.toISOString().slice(0, 10)) streak++;
    else break;
  }
  return streak;
};

/** Calculate calorie progress percentage (capped at 100) */
export const calcProgress = (consumed, target) => {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((consumed / target) * 100));
};

/** Sum nutrition values from a daily meal log for a given key */
export const sumMealLog = (log, key) =>
  log.reduce((s, entry) => s + Number(entry[key] || 0), 0);

/** Filter log entries to just today's entries */
export const getTodayLog = (log, today = new Date().toISOString().slice(0, 10)) =>
  log.filter((l) => l.date === today);

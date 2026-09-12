import { describe, expect, it, vi } from 'vitest';

vi.mock('../store/useStore', () => ({ default: { getState: () => ({ user: null }) } }));

import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatMeasurement,
  getTextDirection,
} from '../utils/userFormatters';

describe('profile formatting preferences', () => {
  it('uses the selected currency and number format', () => {
    const user = { baseCurrency: 'USD ($)', numberFormat: '1,234.56' };
    expect(formatCurrency(1234.5, user)).toContain('$1,234.50');
    expect(formatNumber(1234567.89, { ...user, numberFormat: '1.234,56' })).toBe('1.234.567,89');
  });

  it('applies the selected date order', () => {
    expect(formatDate('2026-09-12', { dateFormat: 'DD/MM/YYYY' })).toBe('12/09/2026');
    expect(formatDate('2026-09-12', { dateFormat: 'MM/DD/YYYY' })).toBe('09/12/2026');
    expect(formatDate('2026-09-12', { dateFormat: 'YYYY-MM-DD' })).toBe('2026-09-12');
  });

  it('converts measurements and direction from the profile', () => {
    const imperial = { measurementSystem: 'Imperial (inches, lbs)', textDirection: 'RTL (Right to Left)' };
    expect(formatMeasurement(70, 'kg', imperial)).toContain('lb');
    expect(getTextDirection(imperial)).toBe('rtl');
  });
});

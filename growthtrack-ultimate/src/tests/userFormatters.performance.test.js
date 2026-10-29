import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../store/useStore', () => ({ default: { getState: () => ({ user: {} }) } }));
afterEach(() => vi.restoreAllMocks());

describe('formatting work in populated pages', () => {
  it('reuses formatter configurations across a large ledger without retaining values', async () => {
    vi.resetModules();
    const Native = Intl.NumberFormat;
    const construction = vi.spyOn(Intl, 'NumberFormat');
    const { formatCurrency, formatNumber, formatMeasurement } = await import('../utils/userFormatters');
    const user = { baseCurrency: 'INR (₹)', numberFormat: 'Auto (from currency)' };
    for (let index = 0; index < 1000; index += 1) {
      expect(formatCurrency(index + 0.25, user)).toBe(new Native('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(index + 0.25));
      formatNumber(index, user);
      formatMeasurement(index, 'kg', user);
    }
    expect(construction).toHaveBeenCalledTimes(3);
  });

  it('respects configuration changes, option order, invalid values and invalid options', async () => {
    vi.resetModules();
    const Native = Intl.NumberFormat;
    const construction = vi.spyOn(Intl, 'NumberFormat');
    const { formatCurrency, formatNumber } = await import('../utils/userFormatters');
    expect(formatNumber(1234.5, { numberFormat: '1.234,56' }, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe('1.234,50');
    expect(formatNumber(1234.5, { numberFormat: '1.234,56' }, { maximumFractionDigits: 2, minimumFractionDigits: 2 })).toBe('1.234,50');
    expect(construction).toHaveBeenCalledTimes(1);
    expect(formatCurrency(12.5, { baseCurrency: 'USD' })).toBe(new Native('en-US', { style: 'currency', currency: 'USD', currencyDisplay: 'symbol', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(12.5));
    expect(formatCurrency(12.5, { baseCurrency: 'EUR' })).toBe(new Native('de-DE', { style: 'currency', currency: 'EUR', currencyDisplay: 'symbol', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(12.5));
    expect(formatNumber(NaN, {}, { invalid: 'Unavailable' })).toBe('Unavailable');
    expect(() => formatNumber(1, {}, { minimumFractionDigits: null })).not.toThrow();
    expect(() => formatNumber(1, {}, { minimumFractionDigits: NaN })).toThrow(RangeError);
    expect(() => formatNumber(1, {}, { minimumFractionDigits: 4, maximumFractionDigits: 2 })).toThrow(RangeError);
  });

  it('bounds cached configurations instead of retaining every formatting variant', async () => {
    vi.resetModules();
    const construction = vi.spyOn(Intl, 'NumberFormat');
    const { formatNumber } = await import('../utils/userFormatters');
    formatNumber(1, {}, { minimumIntegerDigits: 1, maximumFractionDigits: 0 });
    for (let width = 2; width <= 21; width += 1) for (let decimals = 0; decimals < 4; decimals += 1) formatNumber(1, {}, { minimumIntegerDigits: width, maximumFractionDigits: decimals });
    const count = construction.mock.calls.length;
    formatNumber(2, {}, { minimumIntegerDigits: 1, maximumFractionDigits: 0 });
    expect(construction).toHaveBeenCalledTimes(count + 1);
  });
});

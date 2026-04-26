import { describe, it, expect } from 'vitest';
import { fmtINR, sumByType, calcBalance, buildChartData } from '../utils/finance';

const SAMPLE_TRANSACTIONS = [
  { id: 1, type: 'Income',     amount: 85000 },
  { id: 2, type: 'Expense',    amount: 2500  },
  { id: 3, type: 'Expense',    amount: 4800  },
  { id: 4, type: 'Investment', amount: 15000 },
];

describe('fmtINR', () => {
  it('formats whole numbers with Indian locale', () => {
    expect(fmtINR(85000)).toBe('₹85,000');
    expect(fmtINR(1000000)).toBe('₹10,00,000');
  });
  it('handles zero', () => {
    expect(fmtINR(0)).toBe('₹0');
  });
});

describe('sumByType', () => {
  it('correctly sums Income transactions', () => {
    expect(sumByType(SAMPLE_TRANSACTIONS, 'Income')).toBe(85000);
  });
  it('correctly sums Expense transactions', () => {
    expect(sumByType(SAMPLE_TRANSACTIONS, 'Expense')).toBe(7300);
  });
  it('correctly sums Investment transactions', () => {
    expect(sumByType(SAMPLE_TRANSACTIONS, 'Investment')).toBe(15000);
  });
  it('returns 0 for type not present', () => {
    expect(sumByType(SAMPLE_TRANSACTIONS, 'Loan')).toBe(0);
  });
  it('handles empty array', () => {
    expect(sumByType([], 'Income')).toBe(0);
  });
});

describe('calcBalance', () => {
  it('calculates balance = income - expenses - investments', () => {
    expect(calcBalance(SAMPLE_TRANSACTIONS)).toBe(85000 - 7300 - 15000); // 62700
  });
  it('returns negative balance when expenses exceed income', () => {
    const txns = [
      { type: 'Income', amount: 1000 },
      { type: 'Expense', amount: 2000 },
    ];
    expect(calcBalance(txns)).toBe(-1000);
  });
  it('handles empty array returning 0', () => {
    expect(calcBalance([])).toBe(0);
  });
});

describe('buildChartData', () => {
  it('includes all three segments when all have values', () => {
    const data = buildChartData(SAMPLE_TRANSACTIONS);
    expect(data).toHaveLength(3);
    expect(data.find((d) => d.name === 'Income').value).toBe(85000);
  });
  it('excludes segments with zero value', () => {
    const txns = [{ type: 'Income', amount: 1000 }]; // no expenses/investments
    const data = buildChartData(txns);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Income');
  });
});

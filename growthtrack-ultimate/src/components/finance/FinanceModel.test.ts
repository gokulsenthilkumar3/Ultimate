import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../schemas';
import { calcBalance, sumByType } from '../../utils/finance';
import { filterLedger, financeAmount, financeBudget, financeMinor, financeModule, financeMonths, financeSummary, financeToday, financeTrends, ledgerCsv, readFinanceTransactions, sortLedger, validFinanceDate } from '../../utils/financeModel';
import { mappedFinanceCsv, readFinanceCsv, suggestFinanceMapping } from '../../utils/financeImport';

const tx = (id: string, overrides: Partial<Transaction> = {}): Transaction => ({ id, date: '2026-09-28', type: 'Expense', amount: 0.1, category: 'Food', method: 'Cash', note: 'Lunch', ...overrides });
describe('Finance money and calendar calculations', () => {
  it('adds decimals in minor units and rounds compatibility values predictably', () => {
    expect(sumByType([tx('a'), tx('b', { amount: 0.2 })], 'Expense')).toBe(0.3);
    expect(calcBalance([tx('i', { type: 'Income', amount: 0.3 }), tx('a'), tx('b', { amount: 0.2 })])).toBe(0);
    expect(financeMinor('1.005')).toBe(101);
    expect(financeSummary([tx('a'), tx('b', { amount: 0.2 })]).expenses).toBe(0.3);
  });
  it('rejects invalid, negative, too precise and unsafe form amounts', () => {
    for (const value of ['', '1abc', '-10', 'Infinity', '1.005', '900719925474100']) expect(() => financeAmount(value)).toThrow();
    expect(() => financeAmount('0')).toThrow();
    expect(financeAmount('0', true)).toBe(0);
    expect(financeAmount('20.25')).toBe(20.25);
  });
  it('handles zero limits without NaN or Infinity', () => {
    expect(financeBudget(0, 0)).toMatchObject({ pct: 0, bar: 0, over: false, near: false, remaining: 0 });
    expect(financeBudget(12.25, 0)).toMatchObject({ pct: 100, bar: 100, over: true, remaining: -12.25 });
    expect(financeBudget(80, 100)).toMatchObject({ near: true, remaining: 20 });
  });
  it('uses the configured user date across UTC midnight and month boundaries', () => {
    const instant = new Date('2026-09-30T20:00:00Z');
    expect(financeToday({ timezone: 'Asia/Kolkata' }, instant)).toBe('2026-10-01');
    expect(financeToday({ timezone: 'America/Los_Angeles' }, instant)).toBe('2026-09-30');
    expect(financeMonths(3, '2026-01-01')).toEqual(['2025-11', '2025-12', '2026-01']);
  });
  it('validates calendar days and distinguishes missing from partial periods', () => {
    expect(validFinanceDate('2026-02-29')).toBe(false);
    expect(validFinanceDate('2024-02-29')).toBe(true);
    expect(validFinanceDate('2026-13-01')).toBe(false);
    const data = financeTrends([tx('a'), tx('future', { date: '2026-09-30', amount: 10 })], ['2026-08', '2026-09'], '2026-09-29');
    expect(data[0]).toMatchObject({ count: 0, expenses: null, rate: null, partial: false });
    expect(data[1]).toMatchObject({ count: 1, expenses: 0.1, partial: true });
  });
  it('normalizes nullable imported descriptions and warns about invalid source records', () => {
    const parsed = readFinanceTransactions([{ ...tx('a'), category: null, method: null, note: null }, tx('bad', { date: '2026-02-31' }), tx('nan', { amount: NaN })]);
    expect(parsed.invalid).toBe(2);
    expect(parsed.rows[0]).toMatchObject({ category: 'Other', method: undefined, note: undefined });
  });
});

describe('Finance ledger and route model', () => {
  it('applies every filter and exports all matching rows in the displayed sort', () => {
    const rows = [tx('a', { amount: 10 }), tx('b', { amount: 20 }), tx('c', { category: 'Rent' }), tx('d', { method: 'Bank Transfer' }), tx('e', { type: 'Income' }), tx('f', { date: '2026-08-28' })];
    const matches = sortLedger(filterLedger(rows, { query: 'lunch', type: 'Expense', category: 'Food', method: 'Cash', from: '2026-09-01', to: '2026-09-30' }), 'amount-desc');
    expect(matches.map(row => row.id)).toEqual(['b', 'a']);
    const exported = readFinanceCsv(ledgerCsv(matches));
    expect(exported.rows.map(row => row[4])).toEqual(['20.00', '10.00']);
  });
  it('protects spreadsheet cells with hidden formula prefixes and quotes multiline notes', () => {
    for (const note of ['=SUM(1,2)', '+cmd', '-cmd', '@SUM(A1)', '  =hidden', '\tformula', '\rline']) {
      const parsed = readFinanceCsv(ledgerCsv([tx('a', { note })]));
      expect(parsed.rows[0][5]).toBe("'" + note);
    }
    const note = 'A "quoted"\nmultiline, description';
    expect(readFinanceCsv(ledgerCsv([tx('a', { note })])).rows[0][5]).toBe(note);
  });
  it('reads initialTab or pathname and preserves separate module destinations', () => {
    expect(financeModule('Transactions', '/finance/overview')).toBe('Transactions');
    expect(financeModule(undefined, '/finance/sync')).toBe('Sync');
    expect(financeModule('SIP Calculator')).toBe('SIP');
    expect(financeModule('unknown')).toBe('Overview');
  });
});

describe('Finance CSV column mapping', () => {
  it('maps reordered columns while retaining quoted newlines and escaped quotes', () => {
    const source = readFinanceCsv('\uFEFFDescription,Date,Transaction Amount,Type\r\n"A \"\"quote\"\"\nnew line",2026-09-28,12.50,Expense');
    const mapping = suggestFinanceMapping(source.headers);
    const mapped = readFinanceCsv(mappedFinanceCsv(source, mapping));
    expect(mapped.headers).toEqual(['amount', 'type', 'category', 'method', 'date', 'note']);
    expect(mapped.rows[0]).toEqual(['12.50', 'Expense', '', '', '2026-09-28', 'A "quote"\nnew line']);
  });
  it('rejects malformed quoting and mismatched row widths', () => {
    expect(() => readFinanceCsv('amount,type,date\n"12,Expense,2026-09-28')).toThrow('unclosed');
    const source = readFinanceCsv('amount,type,date\n12,Expense');
    expect(() => mappedFinanceCsv(source, suggestFinanceMapping(source.headers))).toThrow('Row 2');
  });
  it('requires required mappings and prevents using one column twice', () => {
    const source = readFinanceCsv('amount,type,date\n12,Expense,2026-09-28');
    const mapping = suggestFinanceMapping(source.headers);
    expect(() => mappedFinanceCsv(source, { ...mapping, date: '' })).toThrow('Map the amount');
    expect(() => mappedFinanceCsv(source, { ...mapping, note: mapping.amount })).toThrow('only one field');
  });
});

import { describe, expect, it } from 'vitest';
import { spreadsheetCell, spreadsheetCsv } from './csv';

describe('spreadsheet-safe exports', () => {
  it.each(['=SUM(A1)', '+cmd', '-cmd', '@call', '  =hidden', '\ttext', '\rtext'])('neutralizes %j', value => {
    expect(spreadsheetCell(value)).toBe(`"'${value}"`);
  });
  it('quotes comma, newline, and quote characters without corrupting them', () => {
    expect(spreadsheetCsv(['Note'], [['A,"B"\nC']])).toBe('"Note"\r\n"A,""B""\nC"');
  });
});

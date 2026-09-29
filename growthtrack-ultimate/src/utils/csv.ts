/** Quote every field, and neutralize formulas when opened by a spreadsheet. */
export function spreadsheetCell(value: unknown): string {
  const raw = String(value ?? '');
  const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(raw) || /^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function spreadsheetCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map(row => row.map(spreadsheetCell).join(',')).join('\r\n');
}

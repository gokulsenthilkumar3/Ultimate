/**
 * Excel (XLSX) export service
 * Uses SheetJS (xlsx) to generate an XLSX file on-device.
 */

import * as XLSX from 'xlsx';
import { ExportRow } from './csv';

export function generateXLSX(rows: ExportRow[], title: string): string {
  const headers = ['Date', 'Description', 'Category', 'Amount (INR)', 'Type', 'Payment Mode', 'Status', 'Note'];

  const data = [
    headers,
    ...rows.map(r => [
      r.date,
      r.name,
      r.category,
      r.amount,
      r.type,
      r.paymentMode,
      r.status,
      r.note ?? '',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 28 }, // Description
    { wch: 18 }, // Category
    { wch: 14 }, // Amount
    { wch: 14 }, // Type
    { wch: 16 }, // Payment Mode
    { wch: 10 }, // Status
    { wch: 30 }, // Note
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

  // Add summary sheet
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const summaryData = [
    ['Report Title', title],
    ['Generated', new Date().toLocaleString('en-IN')],
    ['Total Records', rows.length],
    ['Total Amount', total],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}

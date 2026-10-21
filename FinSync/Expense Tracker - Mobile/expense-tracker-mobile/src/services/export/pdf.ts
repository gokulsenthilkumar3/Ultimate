/**
 * PDF export service
 * Generates an HTML string for expo-print to render as PDF on-device.
 */

import { ExportRow } from './csv';

export function generatePDFHTML(rows: ExportRow[], title: string, dateRange: string): string {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const generated = new Date().toLocaleString('en-IN');

  const rowsHTML = rows
    .map(
      (r, i) => `
    <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
      <td>${r.date}</td>
      <td>${r.name}</td>
      <td>${r.category}</td>
      <td class="amount">₹${r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td><span class="badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
      <td>${r.type}</td>
      <td>${r.paymentMode}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Helvetica Neue', sans-serif; font-size: 12px; color: #1a1a1a; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #01696f; padding-bottom: 16px; }
    .title { font-size: 20px; font-weight: 700; color: #01696f; }
    .meta { font-size: 10px; color: #666; text-align: right; }
    .summary { display: flex; gap: 16px; margin-bottom: 20px; }
    .summary-card { background: #f0f7f7; border-radius: 8px; padding: 12px 16px; flex: 1; }
    .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-card .value { font-size: 18px; font-weight: 700; color: #01696f; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #01696f; color: white; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; }
    td { padding: 7px 10px; border-bottom: 1px solid #e8e8e8; }
    tr.odd td { background: #f9f9f9; }
    td.amount { font-weight: 600; text-align: right; }
    .badge { padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; }
    .badge-paid { background: #d4edd8; color: #256f2e; }
    .badge-pending { background: #fff3cd; color: #856404; }
    .badge-missed { background: #f8d7da; color: #842029; }
    .badge-skipped { background: #e2e3e5; color: #383d41; }
    .footer { margin-top: 24px; font-size: 10px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">📊 ${title}</div>
      <div style="margin-top:4px; color:#555;">Period: ${dateRange}</div>
    </div>
    <div class="meta">Generated: ${generated}</div>
  </div>

  <div class="summary">
    <div class="summary-card">
      <div class="label">Total Expenses</div>
      <div class="value">₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Records</div>
      <div class="value">${rows.length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Paid</div>
      <div class="value">${rows.filter(r => r.status === 'paid').length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Pending</div>
      <div class="value">${rows.filter(r => r.status === 'pending').length}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th><th>Description</th><th>Category</th>
        <th style="text-align:right">Amount</th><th>Status</th>
        <th>Type</th><th>Mode</th>
      </tr>
    </thead>
    <tbody>${rowsHTML}</tbody>
  </table>

  <div class="footer">Expense Tracker — Offline Report &bull; All data stored locally on device</div>
</body>
</html>`;
}

/**
 * CSV export service
 * Generates a CSV string from expense and recurring entry data.
 */

export interface ExportRow {
  date: string;
  name: string;
  category: string;
  amount: number;
  type: string;
  paymentMode: string;
  status: string;
  note?: string;
}

export function generateCSV(rows: ExportRow[], title: string): string {
  const headers = ['Date', 'Description', 'Category', 'Amount (INR)', 'Type', 'Payment Mode', 'Status', 'Note'];

  const escape = (val: string | number | undefined) =>
    `"${String(val ?? '').replace(/"/g, '""')}"`;

  const csvRows = [
    `# ${title}`,
    `# Generated: ${new Date().toLocaleString('en-IN')}`,
    '',
    headers.map(escape).join(','),
    ...rows.map(r =>
      [
        r.date,
        r.name,
        r.category,
        r.amount.toFixed(2),
        r.type,
        r.paymentMode,
        r.status,
        r.note ?? '',
      ]
        .map(escape)
        .join(',')
    ),
  ];

  return csvRows.join('\n');
}

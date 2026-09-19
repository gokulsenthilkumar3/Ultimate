import React from 'react';

export default function Pagination({ page, pageCount, pageSize, total, onPageChange, onPageSizeChange, pageSizes = [10, 25, 50, 100], label = 'Pagination' }) {
  const safeCount = Math.max(1, pageCount || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeCount);
  const start = total ? (safePage - 1) * pageSize + 1 : 0;
  const end = Math.min(safePage * pageSize, total || 0);
  return <nav className="gt-pagination" aria-label={label}>
    <span>Showing {start}–{end} of {total || 0}</span>
    <label>Rows <select aria-label="Rows per page" value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))}>{pageSizes.map(size => <option key={size} value={size}>{size}</option>)}</select></label>
    <button type="button" onClick={() => onPageChange(safePage - 1)} disabled={safePage === 1}>Previous</button>
    <span>Page {safePage} of {safeCount}</span>
    <button type="button" onClick={() => onPageChange(safePage + 1)} disabled={safePage === safeCount}>Next</button>
  </nav>;
}

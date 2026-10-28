/** Client-side preview pagination. Production adapters still need bounded API pages. */
export const TABLE_PAGE_SIZES = [25, 50, 100];
export function filterRecords(rows, query = '') {
  const term = query.trim().toLowerCase();
  return term ? rows.filter(row => Object.values(row).some(value => String(value).toLowerCase().includes(term))) : rows;
}
export function tablePage(rows, columns, { query = '', sort = null, ascending = true, page = 0, pageSize = 25 } = {}) {
  const size = TABLE_PAGE_SIZES.includes(pageSize) ? pageSize : 25;
  const filtered = filterRecords(rows, query);
  const column = columns.find(item => item.key === sort);
  const sorted = column ? [...filtered].sort((a, b) => {
    const left = column.sortValue ? column.sortValue(a) : a[sort];
    const right = column.sortValue ? column.sortValue(b) : b[sort];
    // Missing values stay last in either direction.
    if (left == null || right == null) return left == null ? right == null ? 0 : 1 : -1;
    const comparison = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true });
    return comparison * (ascending ? 1 : -1);
  }) : filtered;
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const current = Math.min(pages - 1, Math.max(0, Number.isInteger(page) ? page : 0));
  const start = current * size;
  return { rows: sorted.slice(start, start + size), matchingRows: sorted, total: sorted.length, page: current, pageSize: size, pages, start: sorted.length ? start + 1 : 0, end: Math.min(start + size, sorted.length) };
}

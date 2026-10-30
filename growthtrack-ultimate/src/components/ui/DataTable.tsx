import React, { startTransition, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import PageState from './PageState';
import useVirtualTableRows from '../../hooks/useVirtualTableRows';

export interface DataColumn<T> {
  id: string; header: ReactNode; accessor: (row: T) => string | number | null | undefined;
  sort?: React.AriaAttributes['aria-sort'];
  render?: (row: T) => ReactNode; sortable?: boolean; compare?: (a: T, b: T) => number;
  align?: 'start' | 'end';
}
export type TableSort = { column: string; direction: 'asc' | 'desc' } | null;
export interface DataTableProps<T> {
  caption: string; rows: readonly T[]; columns: readonly DataColumn<T>[]; rowKey: (row: T) => string;
  rowLabel?: (row: T) => string; sort?: TableSort; onSortChange?: (sort: TableSort) => void; manualSort?: boolean;
  selectedKeys?: readonly string[]; onSelectionChange?: (keys: string[]) => void;
  state?: 'ready' | 'loading' | 'error' | 'offline'; onRetry?: () => void; emptyMessage?: string;
}

/** Native table semantics; wide data scrolls inside a named, keyboard reachable region. */
export default function DataTable<T>({ caption, rows, columns, rowKey, rowLabel = rowKey, sort: controlledSort, onSortChange, manualSort = false, selectedKeys = [], onSelectionChange, state = 'ready', onRetry, emptyMessage = 'No records match your filters.' }: DataTableProps<T>) {
  const id = useId();
  const [localSort, setLocalSort] = useState<TableSort>(null);
  const sort = controlledSort === undefined ? localSort : controlledSort;
  const sortedRows = useMemo(() => {
    const column = columns.find(item => item.id === sort?.column);
    if (!column || !sort || manualSort) return rows;
    const compare = column.compare || ((a: T, b: T) => {
      const left = column.accessor(a), right = column.accessor(b);
      if (left == null) return right == null ? 0 : 1;
      if (right == null) return -1;
      return typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true });
    });
    return [...rows].sort((a, b) => {
      const left = column.accessor(a), right = column.accessor(b);
      if (left == null) return right == null ? 0 : 1;
      if (right == null) return -1;
      return compare(a, b) * (sort.direction === 'asc' ? 1 : -1);
    });
  }, [rows, columns, sort, manualSort]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtual = useVirtualTableRows(sortedRows, rowKey, scrollRef, state === 'ready');
  const select = (key: string, checked: boolean) => onSelectionChange?.(checked ? [...new Set([...selectedKeys, key])] : selectedKeys.filter(item => item !== key));
  const allSelected = rows.length > 0 && rows.every(row => selectedKeys.includes(rowKey(row)));
  const partlySelected = !allSelected && rows.some(row => selectedKeys.includes(rowKey(row)));
  return <section className="gt-data-table" data-responsive-foundation data-state={state}>
    {state !== 'ready' && <PageState state={state} onRetry={state === 'loading' ? undefined : onRetry} />}
    {state === 'ready' && !rows.length && <PageState state="empty" title="No records" description={emptyMessage} />}
    {state === 'ready' && rows.length > 0 && <div ref={scrollRef} className="gt-data-table__scroll" role="region" aria-labelledby={`${id}-caption`} tabIndex={0} style={virtual.active ? { maxHeight: 560, overflow: 'auto' } : undefined}>
      <table aria-rowcount={virtual.active ? rows.length + 1 : undefined}><caption id={`${id}-caption`}>{caption}</caption><thead><tr aria-rowindex={virtual.active ? 1 : undefined}>
        {onSelectionChange && <th scope="col"><input type="checkbox" aria-label="Select all visible rows" checked={allSelected} ref={node => { if (node) node.indeterminate = partlySelected; }} onChange={event => {
          const visible = rows.map(rowKey);
          onSelectionChange(event.target.checked ? [...new Set([...selectedKeys, ...visible])] : selectedKeys.filter(key => !visible.includes(key)));
        }} /></th>}
        {columns.map(column => <th key={column.id} scope="col" data-align={column.align} aria-sort={column.sort || (column.sortable ? sort?.column === column.id ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none' : undefined)}>
          {column.sortable ? <button type="button" onClick={() => {
            const next: TableSort = { column: column.id, direction: sort?.column === column.id && sort.direction === 'asc' ? 'desc' : 'asc' };
            if (controlledSort === undefined) startTransition(() => setLocalSort(next));
            onSortChange?.(next);
          }}>{column.header}<span aria-hidden="true"> {sort?.column === column.id ? sort.direction === 'asc' ? '↑' : '↓' : '↕'}</span></button> : column.header}
        </th>)}
      </tr></thead><tbody>{virtual.segments.map(segment => segment.kind === 'spacer' ? <tr key={segment.key} aria-hidden="true"><td colSpan={columns.length + (onSelectionChange ? 1 : 0)} style={{ height: segment.height, padding: 0, border: 0, lineHeight: 0 }} /></tr> : <tr key={`row-${segment.key}`} data-virtual-key={segment.key} aria-rowindex={virtual.active ? segment.index + 2 : undefined} data-selected={selectedKeys.includes(segment.key)}>
        {onSelectionChange && <td><input type="checkbox" checked={selectedKeys.includes(segment.key)} aria-label={`Select ${rowLabel(segment.row)}`} onChange={event => select(segment.key, event.target.checked)} /></td>}
        {columns.map(column => <td key={column.id} data-align={column.align}>{column.render ? column.render(segment.row) : column.accessor(segment.row) ?? '—'}</td>)}
      </tr>)}</tbody></table>
    </div>}
  </section>;
}

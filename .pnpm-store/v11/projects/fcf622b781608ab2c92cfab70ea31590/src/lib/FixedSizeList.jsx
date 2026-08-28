/**
 * FixedSizeList compatibility shim for react-window v2.
 *
 * react-window v1 API:
 *   <FixedSizeList height itemCount itemSize width itemData>
 *     {({ index, style, data }) => <Row />}
 *   </FixedSizeList>
 *
 * react-window v2 uses a different prop surface. This shim bridges v1 usage
 * so existing components (Timesheet, Logs, Notes) compile and work without
 * requiring a full refactor.
 */
import React, { useMemo, useState } from 'react';

/**
 * A small virtualized list that mimics the react-window v1 FixedSizeList API.
 * Only the visible window plus a small overscan buffer is mounted. This keeps
 * the compatibility surface lightweight while avoiding a full react-window
 * migration for callers that still use the v1 render-prop contract.
 */
export function FixedSizeList({
  children,
  height,
  itemCount,
  itemSize,
  width,
  itemData,
  style = {},
  className = '',
  overscanCount = 4,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const viewportHeight = Number(height) || 0;
  const safeItemSize = Math.max(1, Number(itemSize) || 1);
  const firstVisibleIndex = Math.max(0, Math.floor(scrollTop / safeItemSize) - overscanCount);
  const visibleRowCount = Math.ceil(viewportHeight / safeItemSize) + (overscanCount * 2);
  const lastVisibleIndex = Math.min(itemCount, firstVisibleIndex + visibleRowCount);
  const indexes = useMemo(
    () => Array.from({ length: Math.max(0, lastVisibleIndex - firstVisibleIndex) }, (_, offset) => firstVisibleIndex + offset),
    [firstVisibleIndex, lastVisibleIndex],
  );
  const rows = indexes.map((index) => {
    const rowStyle = {
      position: 'absolute',
      top: index * safeItemSize,
      height: safeItemSize,
      width: '100%',
      overflow: 'visible',
    };
    return children({ index, style: rowStyle, data: itemData });
  });

  return (
    <div
      className={className}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      style={{
        position: 'relative',
        height,
        width: width || '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        ...style,
      }}
    >
      <div style={{ position: 'relative', height: itemCount * safeItemSize }}>
        {rows}
      </div>
    </div>
  );
}

export default FixedSizeList;

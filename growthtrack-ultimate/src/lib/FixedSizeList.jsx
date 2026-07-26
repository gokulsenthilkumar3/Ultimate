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
import React from 'react';

/**
 * A simple virtualized list that mimics the react-window v1 FixedSizeList API.
 * Renders all rows (no virtual scrolling) for simplicity when v2 API is incompatible.
 * For lists under ~500 items this performs perfectly well.
 */
export function FixedSizeList({ children, height, itemCount, itemSize, width, itemData, style, className }) {
  const rows = [];
  for (let index = 0; index < itemCount; index++) {
    const rowStyle = {
      position: 'absolute',
      top: index * itemSize,
      height: itemSize,
      width: '100%',
      overflow: 'hidden',
    };
    rows.push(children({ index, style: rowStyle, data: itemData }));
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        height,
        width: width || '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        ...style,
      }}
    >
      <div style={{ position: 'relative', height: itemCount * itemSize }}>
        {rows}
      </div>
    </div>
  );
}

export default FixedSizeList;

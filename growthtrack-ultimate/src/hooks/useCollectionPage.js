import { useState } from 'react';

// Only the rendered slice is bounded. Callers filter/sort the full collection
// first, and change scope when filters change. Clamp immediately after removal
// so a later insert cannot unexpectedly restore an obsolete page.
export default function useCollectionPage(items, scope, pageSize = 25) {
  const [selection, setSelection] = useState({ scope, page: 1 });
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = selection.scope === scope ? Math.min(selection.page, pageCount) : 1;
  if (selection.scope !== scope || selection.page !== page) {
    setSelection({ scope, page });
  }
  return {
    page,
    pageCount,
    visibleItems: items.slice((page - 1) * pageSize, page * pageSize),
    setPage: (next, nextScope = scope) => setSelection({ scope: nextScope, page: Math.max(1, next) }),
  };
}

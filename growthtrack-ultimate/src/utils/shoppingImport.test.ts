import { describe, expect, it } from 'vitest';
import { previewShoppingCsv } from './shoppingImport';

describe('shopping CSV preview', () => {
  it('parses quoted newlines and preserves quantities and stable identities', () => {
    const csv = 'Item,Price,Quantity,Order Date\n"Book,\nVolume 2",₹1,2,2026-09-29\n';
    const preview = previewShoppingCsv(csv);
    expect(preview.items).toHaveLength(1);
    expect(preview.items[0]).toMatchObject({ name: 'Book,\nVolume 2', estimatedCost: 1, quantity: 2 });
    expect(previewShoppingCsv(csv, preview.items).duplicates).toBe(1);
  });

  it('reports invalid rows instead of creating misleading purchases', () => {
    const preview = previewShoppingCsv('Item,Price,Quantity,Order Date\nBad,-2,1,2026-09-29\nGood,10,0,2026-09-29\nWrong,12,1,2026-02-30');
    expect(preview.items).toHaveLength(0);
    expect(preview.errors).toHaveLength(3);
  });
});

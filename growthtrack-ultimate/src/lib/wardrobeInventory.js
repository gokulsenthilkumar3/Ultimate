/** User-facing outfit pieces; a merged draw mesh can contain several garments. */
export const WARDROBE_PIECES = Object.freeze({
  UNDERWEAR: { briefs: ['Briefs'], trunks: ['Trunks'], boxerBriefs: ['Boxer briefs'] },
  GYM: { tank: ['Tank', 'Running shorts'], training: ['Training tee', 'Shorts'], compression: ['Compression top', 'Compression shorts'] },
  CASUAL: { sweatshirt: ['Sweatshirt', 'Joggers'], tee: ['T-shirt', 'Joggers'] },
  FORMAL: { shirt: ['Shirt', 'Trousers'], suit: ['Jacket', 'Shirt', 'Trousers'] },
  SWIMWEAR: { board: ['Board shorts'], short: ['Swim shorts'] },
});
export function wardrobePieces(preset, variant) {
  return WARDROBE_PIECES[preset]?.[variant] || [];
}

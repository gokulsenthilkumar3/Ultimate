// Artistic starting swatches, not measured phototypes or a diagnostic scale.
// One display-space palette for the editor and renderer prevents the preview
// from silently using a different (formerly much yellower) default tone.
export const SKIN_APPEARANCE_PRESETS = Object.freeze([
  { id:'I', hex:'#e8c2ad', label:'Very Light' },
  { id:'II', hex:'#d8ac91', label:'Light' },
  { id:'III', hex:'#c69578', label:'Medium' },
  { id:'IV', hex:'#ac7d63', label:'Olive' },
  { id:'V', hex:'#825941', label:'Brown' },
  { id:'VI', hex:'#51382c', label:'Dark' },
]);

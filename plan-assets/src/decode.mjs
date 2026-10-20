// Unpacks window.PLAN_HUMAN_PREVIEW (see growthtrack-ultimate/scripts/plan-preview/build-model.mjs).
const VIEWS = { f32: Float32Array, u16: Uint16Array, i16: Int16Array, u8: Uint8Array, i8: Int8Array, u32: Uint32Array, bytes: Uint8Array };

export async function decodePreview(preview) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot unpack the 3D preview (DecompressionStream is missing).');
  const text = atob(preview.data);
  const gz = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) gz[i] = text.charCodeAt(i);
  const stream = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  const view = entry => {
    const Type = VIEWS[entry.t];
    return entry.t === 'bytes' ? new Uint8Array(buffer, entry.o, entry.n) : new Type(buffer, entry.o, entry.n / Type.BYTES_PER_ELEMENT);
  };
  const morphs = defs => Object.fromEntries(Object.entries(defs).map(([name, m]) => {
    const q = view(m.d); const delta = new Float32Array(q.length);
    for (let i = 0; i < q.length; i += 1) delta[i] = q[i] * m.scale;
    return [name, { index: view(m.idx), delta }];
  }));
  const uvs = entry => { const q = view(entry); const out = new Float32Array(q.length); for (let i = 0; i < q.length; i += 1) out[i] = q[i] / 65535; return out; };
  const body = { count: preview.body.count, pos: view(preview.body.pos).slice(), uv: uvs(preview.body.uv), idx: view(preview.body.idx), group: view(preview.body.group), morphs: morphs(preview.body.morphs) };
  const parts = {};
  for (const [key, p] of Object.entries(preview.parts)) {
    const nrm8 = view(p.nrm); const nrm = new Float32Array(nrm8.length);
    for (let i = 0; i < nrm8.length; i += 1) nrm[i] = nrm8[i] / 127;
    parts[key] = { ...p, pos: view(p.pos).slice(), nrm, uv: uvs(p.uv), idx: view(p.idx), morphs: morphs(p.morphs), ...(p.texture ? { textureBytes: view(p.texture), textureMime: p.texture.mime } : {}), ...(p.layer ? { layer: view(p.layer) } : {}) };
  }
  return { body, parts, joints: preview.joints, jointOrder: preview.jointOrder, floorY: preview.floorY, topY: preview.topY, height: preview.height, meanAlbedo: preview.meanAlbedo, skin: { bytes: view(preview.textures.skin), mime: preview.textures.skin.mime }, source: preview.source };
}

/* Face and hair studio for v4Plan_3DModel.html (3D Mirror tab). Plain browser JavaScript; no build step.
 *
 * Every control is generated from the tables the 3D stage exports (window.PlanStage.FACE_PARAMS, HAIR_STYLES, ...), so
 * there is one definition of each choice. Sizes are shown, and can be typed, in millimetres (inches when the page is in
 * imperial); typing a number asks the stage to make the drawn face measure that, and says plainly if it cannot. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const node = (tag, props = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v); } for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid); return n; };

  const GROUPS = [
    ['skin', 'Skin'], ['hair', 'Hair'], ['eyes', 'Eyes'], ['brows', 'Brows & lashes'], ['nose', 'Nose & mouth'], ['jaw', 'Jaw, cheeks & ears'], ['sun', 'Sun & light'],
  ];
  const MM_PER_IN = 25.4;

  /** Starting choices for the sample person, and a few quick looks. */
  const DEFAULTS = {
    skin: { tone: 5, hex: '#bc8970', under: 'Neutral', freckles: 0, blush: 0.7, shine: 0.5, pores: 1, lip: 'Natural', lipGloss: 0.6 },
    hair: { style: 'sidepart', texture: null, shade: 'Brown', color: null, grey: 0, length: 1, density: 1, thickness: 'medium', part: null, hairline: { height: 0, recession: 0 }, volume: null, shine: 0.6 },
    eyes: { iris: 'Brown', irisMm: 11.7, pupilMm: 3.8, sclera: 'Natural', redness: 0.18 },
    brows: { match: 'match', color: null, density: 1, thick: 0, length: 1, lift: 1.5, gap: 0, tail: 1 },
    lashes: { density: 1, length: 1, curl: 1 },
  };
  const LOOKS = [
    { name: 'Sample · Alex', skin: { tone: 5 }, hair: { style: 'sidepart', shade: 'Brown', grey: 0 }, eyes: { iris: 'Brown' } },
    { name: 'Fair and freckled', skin: { tone: 2, under: 'Cool', freckles: 0.7 }, hair: { style: 'medium', shade: 'Ginger', texture: 'wavy', grey: 0 }, eyes: { iris: 'Green' } },
    { name: 'Blond crop', skin: { tone: 3, under: 'Warm' }, hair: { style: 'crop', shade: 'Blonde', grey: 0 }, eyes: { iris: 'Blue' } },
    { name: 'Olive, silver hair', skin: { tone: 4, under: 'Olive' }, hair: { style: 'swept', shade: 'Brown', grey: 0.65 }, eyes: { iris: 'Grey', redness: 0.35 } },
    { name: 'Deep skin, natural coils', skin: { tone: 9, under: 'Neutral' }, hair: { style: 'afro', shade: 'Black', grey: 0 }, eyes: { iris: 'Dark brown' } },
    { name: 'Long dark hair', skin: { tone: 6, under: 'Warm' }, hair: { style: 'long', shade: 'Black', grey: 0 }, eyes: { iris: 'Hazel' } },
  ];

  const clone = o => JSON.parse(JSON.stringify(o));
  let ctx = null; let stage = null; let T = null;
  const S = clone(DEFAULTS);
  let group = 'skin';
  let faceRows = [];                 // [{ param, slider, input, note, out }] for the visible pane
  let hairTimer = 0; let browTimer = 0; let lashTimer = 0;

  // ---- small builders -------------------------------------------------------------------------------------
  let uid = 0; const nextId = p => `${p}-${(uid += 1)}`;
  function chips(label, items, value, onPick, { swatch = false } = {}) {
    const wrap = node('div', { class: 'chips', role: 'group', 'aria-label': label });
    const buttons = [];
    for (const item of items) {
      const b = node('button', { type: 'button', class: 'pick', 'aria-pressed': String(item.value === value), onclick: () => { buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b))); onPick(item.value); } },
        swatch && item.hex ? node('span', { class: 'dot', style: `background:${item.hex};width:14px;height:14px;border:1px solid var(--line)`, 'aria-hidden': 'true' }) : null, item.label);
      buttons.push(b); wrap.append(b);
    }
    wrap.set = v => buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(items[i].value === v)));
    return wrap;
  }
  function field(title, hint, ...body) { return node('div', { class: 'fs-field' }, node('h4', { text: title }), hint ? node('p', { class: 'tiny', text: hint }) : null, ...body); }
  /** A labelled slider with plain words at both ends and a live value. */
  function slider({ label, hint, min, max, step = 1, value, low, high, format, onInput }) {
    const id = nextId('fs-s'); const out = node('output', { for: id, text: format(value) });
    const input = node('input', { type: 'range', id, min, max, step, value, 'aria-valuetext': format(value) });
    input.addEventListener('input', () => { const v = Number(input.value); out.textContent = format(v); input.setAttribute('aria-valuetext', format(v)); onInput(v); });
    const row = node('div', { class: 'fs-row' }, node('label', { class: 'fld', for: id }, label, ' ', out), hint ? node('p', { class: 'tiny', text: hint }) : null, input,
      low || high ? node('div', { class: 'fs-ends tiny' }, node('span', { text: low || '' }), node('span', { text: high || '' })) : null);
    row.set = v => { input.value = v; out.textContent = format(v); input.setAttribute('aria-valuetext', format(v)); };
    return row;
  }
  function colourRow(label, value, onInput) {
    const id = nextId('fs-c');
    const input = node('input', { type: 'color', id, value, 'aria-label': label }); input.addEventListener('input', () => onInput(input.value));
    const row = node('div', { class: 'row tight' }, node('label', { class: 'fld', for: id, style: 'margin:0' }, label), input);
    row.set = v => { input.value = v; };
    return row;
  }

  const imperial = () => !!(ctx && ctx.imperial());
  const fmtMm = mm => (mm == null || !Number.isFinite(mm) ? '—' : imperial() ? `${(mm / MM_PER_IN).toFixed(2)} in` : `${mm.toFixed(1)} mm`);
  const fmtLen = cm => (imperial() ? `${(cm / 2.54).toFixed(1)} in` : `${cm.toFixed(1)} cm`);
  const sign = n => (n > 0 ? `+${n}` : String(n));

  // ---- applying choices to the stage ---------------------------------------------------------------------------
  function applySkin() {
    if (!stage) return;
    const k = S.skin; stage.setLook({ skin: k.hex, under: k.under, freckles: k.freckles, blush: k.blush, shine: k.shine, pores: k.pores, lip: T.LIP_COLORS[k.lip] || null, lipGloss: k.lipGloss });
  }
  function applyEyes() { if (stage) stage.setEyes(S.eyes); }
  function hairInput() {
    const h = clone(S.hair); h.hairline = { ...S.hair.hairline, height: S.hair.hairline.height };
    return h;
  }
  function applyHair({ geometry = true } = {}) {
    if (!stage) return;
    if (!geometry) { stage.setHair({ shade: S.hair.shade, color: S.hair.color, grey: S.hair.grey, thickness: S.hair.thickness, shine: S.hair.shine }); applyBrowColours(); return; }
    clearTimeout(hairTimer); hairTimer = setTimeout(() => { stage.setHair(hairInput()); applyBrowColours(); }, 90);
  }
  function browColour() {
    const b = S.brows; if (b.color) return b.color;
    const base = S.hair.color || T.HAIR_SHADES[S.hair.shade] || '#4f3523';
    if (b.match === 'match') return null;
    const c = parseInt(base.slice(1), 16); const f = b.match === 'lighter' ? 1.35 : 0.65;
    const ch = n => clamp(Math.round(n * f), 0, 255);
    return `#${[ch((c >> 16) & 255), ch((c >> 8) & 255), ch(c & 255)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  }
  function applyBrowColours() { if (stage) stage.setBrows({ shade: browColour() }); }
  function applyBrows() {
    if (!stage) return; const b = S.brows;
    clearTimeout(browTimer); browTimer = setTimeout(() => stage.setBrows({ density: b.density, thick: b.thick / 1000, length: b.length, lift: b.lift / 1000, gap: b.gap / 2000, tail: b.tail, shade: browColour() }), 60);
  }
  function applyLashes() { if (!stage) return; clearTimeout(lashTimer); lashTimer = setTimeout(() => stage.setLashes(S.lashes), 90); }
  function applyAll() { applySkin(); applyEyes(); if (stage) { stage.setHair(hairInput()); stage.setBrows({ density: S.brows.density, thick: S.brows.thick / 1000, length: S.brows.length, lift: S.brows.lift / 1000, gap: S.brows.gap / 2000, tail: S.brows.tail, shade: browColour() }); stage.setLashes(S.lashes); } }

  function focusFace() { if (stage && ctx.focusFace) ctx.focusFace(group); }

  // ---- panes -----------------------------------------------------------------------------------------------------
  function paneSkin() {
    const k = S.skin; const pane = node('div', { class: 'fs-pane-body' });
    const swatches = chips('Skin tone, ten steps', T.SKIN_TONES.map(t => ({ value: t.hex, label: `${t.id} · ${t.name}`, hex: t.hex })), k.hex, hex => { k.hex = hex; k.tone = T.SKIN_TONES.find(t => t.hex === hex)?.id ?? k.tone; colour.set(hex); ctx.setSkinHex(hex); applySkin(); }, { swatch: true });
    const colour = colourRow('Fine-tune any colour', k.hex, hex => { k.hex = hex; swatches.set(null); ctx.setSkinHex(hex); applySkin(); });
    pane.append(
      field('Skin tone', 'Ten steps from very fair to deepest, chosen as the colour of skin in light. They describe appearance; they are not medical types.', swatches, colour),
      field('Undertone', 'The cool, warm or olive cast under the main colour.', chips('Undertone', Object.keys(T.UNDERTONES).map(n => ({ value: n, label: n })), k.under, v => { k.under = v; applySkin(); })),
      field('Surface', null,
        slider({ label: 'Freckles', min: 0, max: 100, value: k.freckles * 100, low: 'none', high: 'many', format: v => `${Math.round(v)}%`, onInput: v => { k.freckles = v / 100; applySkin(); } }),
        slider({ label: 'Cheek flush', min: 0, max: 100, value: k.blush * 100, low: 'even', high: 'rosy', format: v => `${Math.round(v)}%`, onInput: v => { k.blush = v / 100; applySkin(); } }),
        slider({ label: 'Shine', min: 0, max: 100, value: k.shine * 100, low: 'matte', high: 'glossy', format: v => `${Math.round(v)}%`, onInput: v => { k.shine = v / 100; applySkin(); } }),
        slider({ label: 'Pores and texture', min: 0, max: 150, value: k.pores * 100, low: 'smooth', high: 'textured', format: v => `${Math.round(v)}%`, onInput: v => { k.pores = v / 100; applySkin(); } })));
    return pane;
  }

  function hairDefaultsFor(style) { return T.HAIR_STYLES[style]; }
  function paneHair() {
    const h = S.hair; const pane = node('div', { class: 'fs-pane-body' });
    const styleDef = () => hairDefaultsFor(h.style);
    const lengthText = v => { const top = styleDef().len.top * v; return top < 1 ? `${(top * 10).toFixed(0)} mm on top` : `${fmtLen(top)} on top`; };
    const volumeNow = () => (h.volume ?? styleDef().volume ?? 0.25);
    let lengthRow; let volumeRow;
    const styleChips = chips('Hair style', Object.entries(T.HAIR_STYLES).map(([value, def]) => ({ value, label: def.label })), h.style, v => { h.style = v; h.volume = null; volumeRow.set(volumeNow() * 100); lengthRow.set(h.length); partChips.set(h.part); textureChips.set(h.texture); applyHair(); });
    const textureChips = chips('Hair texture', [{ value: null, label: 'Style default' }, ...Object.entries(T.HAIR_TEXTURES).map(([value, def]) => ({ value, label: def.label }))], h.texture, v => { h.texture = v; applyHair(); });
    const shadeChips = chips('Hair shade', Object.entries(T.HAIR_SHADES).map(([value, hex]) => ({ value, label: value, hex })), h.color ? null : h.shade, v => { h.shade = v; h.color = null; custom.set(T.HAIR_SHADES[v]); applyHair({ geometry: false }); }, { swatch: true });
    const custom = colourRow('Any other colour', h.color || T.HAIR_SHADES[h.shade], hex => { h.color = hex; shadeChips.set(null); applyHair({ geometry: false }); });
    const partChips = chips('Parting', [{ value: null, label: 'Style default' }, { value: 'left', label: 'Left' }, { value: 'centre', label: 'Centre' }, { value: 'right', label: 'Right' }, { value: 'none', label: 'None' }], h.part, v => { h.part = v; applyHair(); });
    const thickChips = chips('Strand thickness', [{ value: 'fine', label: 'Fine' }, { value: 'medium', label: 'Medium' }, { value: 'coarse', label: 'Coarse' }], h.thickness, v => { h.thickness = v; applyHair({ geometry: false }); });
    lengthRow = slider({ label: 'Length', min: 40, max: 220, value: h.length * 100, low: 'shorter', high: 'longer', format: v => lengthText(v / 100), onInput: v => { h.length = v / 100; applyHair(); } });
    volumeRow = slider({ label: 'Volume', min: 0, max: 100, value: volumeNow() * 100, low: 'flat to the head', high: 'full', format: v => `${Math.round(v)}%`, onInput: v => { h.volume = v / 100; applyHair(); } });
    pane.append(
      field('Style', 'Each style is a map of lengths (top, front, sides, back) and how the hair is brushed. Change anything below to adjust it.', styleChips),
      field('Texture', 'How each strand curves.', textureChips),
      field('Colour', 'Natural shades from dark to red and blond, then greys. Colour changes are instant.', shadeChips, custom,
        slider({ label: 'Grey hair', min: 0, max: 100, value: h.grey * 100, low: 'none', high: 'mostly grey', format: v => `${Math.round(v)}% of strands`, onInput: v => { h.grey = v / 100; applyHair({ geometry: false }); } })),
      field('Size and amount', null, lengthRow,
        slider({ label: 'Density', min: 30, max: 160, value: h.density * 100, low: 'thin', high: 'thick', format: v => `${Math.round(v)}%`, onInput: v => { h.density = v / 100; applyHair(); } }), volumeRow,
        node('div', { class: 'fs-field' }, node('h4', { text: 'Strand thickness' }), thickChips)),
      field('Parting', null, partChips),
      field('Hairline', 'Where the hair starts on the forehead and temples.',
        slider({ label: 'Height', min: -10, max: 15, value: h.hairline.height, low: 'lower', high: 'higher', format: v => `${sign(Math.round(v))} mm`, onInput: v => { h.hairline.height = v; applyHair(); } }),
        slider({ label: 'Receding at the temples', min: 0, max: 100, value: h.hairline.recession * 100, low: 'straight across', high: 'deep corners', format: v => `${Math.round(v)}%`, onInput: v => { h.hairline.recession = v / 100; applyHair(); } })),
      slider({ label: 'Shine', min: 0, max: 100, value: h.shine * 100, low: 'matte', high: 'glossy', format: v => `${Math.round(v)}%`, onInput: v => { h.shine = v / 100; applyHair({ geometry: false }); } }));
    return pane;
  }

  function paneEyes() {
    const e = S.eyes; const pane = node('div', { class: 'fs-pane-body' });
    const irisChips = chips('Iris colour', Object.entries(T.IRIS_COLORS).map(([value, [hex]]) => ({ value, label: value, hex })), T.IRIS_COLORS[e.iris] ? e.iris : null, v => { e.iris = v; custom.set(T.IRIS_COLORS[v][0]); applyEyes(); }, { swatch: true });
    const custom = colourRow('Any other colour', T.IRIS_COLORS[e.iris] ? T.IRIS_COLORS[e.iris][0] : e.iris, hex => { e.iris = hex; irisChips.set(null); applyEyes(); });
    pane.append(
      field('Iris colour', 'Seven natural colours. The pattern (fibres, ring, limbal edge) stays; the colour changes.', irisChips, custom),
      field('Size', null,
        slider({ label: 'Iris diameter', min: 100, max: 130, value: e.irisMm * 10, low: 'smaller', high: 'larger', format: v => fmtMm(v / 10), onInput: v => { e.irisMm = v / 10; applyEyes(); } }),
        slider({ label: 'Pupil', min: 20, max: 70, value: e.pupilMm * 10, low: 'bright light', high: 'dim light', format: v => fmtMm(v / 10), onInput: v => { e.pupilMm = v / 10; applyEyes(); } })),
      field('The white of the eye', null, chips('White of the eye', Object.keys(T.SCLERA).map(n => ({ value: n, label: n })), e.sclera, v => { e.sclera = v; applyEyes(); }),
        slider({ label: 'Redness', min: 0, max: 100, value: e.redness * 100, low: 'clear', high: 'tired, red', format: v => `${Math.round(v)}%`, onInput: v => { e.redness = v / 100; applyEyes(); } })));
    pane.append(...faceParamFields('Eyes'));
    return pane;
  }

  function paneBrows() {
    const b = S.brows; const l = S.lashes; const pane = node('div', { class: 'fs-pane-body' });
    const colourChips = chips('Brow colour', [{ value: 'match', label: 'Match the hair' }, { value: 'lighter', label: 'Lighter' }, { value: 'darker', label: 'Darker' }], b.color ? null : b.match, v => { b.match = v; b.color = null; applyBrowColours(); });
    const custom = colourRow('Any other colour', b.color || '#4f3523', hex => { b.color = hex; colourChips.set(null); applyBrowColours(); });
    pane.append(
      field('Eyebrows', 'Drawn strand by strand along the brow, rooted in the skin.', colourChips, custom,
        slider({ label: 'Thickness', min: 40, max: 160, value: b.density * 100, low: 'sparse', high: 'full', format: v => `${Math.round(v)}%`, onInput: v => { b.density = v / 100; applyBrows(); } }),
        slider({ label: 'Band height', min: 0, max: 25, value: b.thick * 10, low: 'slim', high: 'bold', format: v => fmtMm(v / 10), onInput: v => { b.thick = v / 10; applyBrows(); } }),
        slider({ label: 'Hair length', min: 60, max: 150, value: b.length * 100, low: 'short', high: 'long', format: v => `${Math.round(v)}%`, onInput: v => { b.length = v / 100; applyBrows(); } }),
        slider({ label: 'Height above the eye', min: -20, max: 60, value: b.lift * 10, low: 'lower', high: 'higher', format: v => `${sign(Math.round(v) / 10)} mm`, onInput: v => { b.lift = v / 10; applyBrows(); } }),
        slider({ label: 'Space between the brows', min: -60, max: 100, value: b.gap * 10, low: 'closer', high: 'further apart', format: v => `${sign(Math.round(v) / 10)} mm`, onInput: v => { b.gap = v / 10; applyBrows(); } }),
        slider({ label: 'Tail', min: 0, max: 100, value: b.tail * 100, low: 'stops early', high: 'reaches out', format: v => `${Math.round(v)}%`, onInput: v => { b.tail = v / 100; applyBrows(); } })),
      field('Eyelashes', 'Upper and lower lashes grow from the lid edge, longest toward the outer corner.',
        slider({ label: 'Length', min: 40, max: 180, value: l.length * 100, low: 'short', high: 'long', format: v => `${Math.round(v)}%`, onInput: v => { l.length = v / 100; applyLashes(); } }),
        slider({ label: 'Fullness', min: 30, max: 160, value: l.density * 100, low: 'sparse', high: 'full', format: v => `${Math.round(v)}%`, onInput: v => { l.density = v / 100; applyLashes(); } }),
        slider({ label: 'Curl', min: 0, max: 150, value: l.curl * 100, low: 'straight', high: 'curled up', format: v => `${Math.round(v)}%`, onInput: v => { l.curl = v / 100; applyLashes(); } })));
    pane.append(...faceParamFields('Brows'));
    return pane;
  }

  function paneNose() {
    const k = S.skin; const pane = node('div', { class: 'fs-pane-body' });
    pane.append(...faceParamFields('Nose'), ...faceParamFields('Mouth'));
    pane.append(field('Lips', 'Natural follows the skin tone: redder and a little darker than the skin around it.',
      chips('Lip colour', Object.keys(T.LIP_COLORS).map(n => ({ value: n, label: n })), k.lip, v => { k.lip = v; applySkin(); }),
      slider({ label: 'Gloss', min: 0, max: 100, value: k.lipGloss * 100, low: 'matte', high: 'glossy', format: v => `${Math.round(v)}%`, onInput: v => { k.lipGloss = v / 100; applySkin(); } })));
    pane.append(...faceParamFields('Expression'));
    return pane;
  }
  function paneJaw() { const pane = node('div', { class: 'fs-pane-body' }); pane.append(...faceParamFields('Jaw and cheeks'), ...faceParamFields('Ears')); return pane; }

  // ---- millimetre rows -----------------------------------------------------------------------------------------
  function faceParamFields(groupName) {
    const params = T.FACE_PARAMS.filter(p => p.group === groupName);
    const rows = params.map(p => faceRow(p));
    return [field(groupName === 'Jaw and cheeks' ? 'Jaw and cheeks' : groupName, groupName === 'Eyes' ? 'Read off the drawn face. Type a size to make the face match it.' : null, ...rows.map(r => r.el))];
  }
  function faceRow(p) {
    const id = nextId('fs-p'); const mm = p.unit === 'mm' && p.measure;
    const pct = p.unit === '%' || p.unit === '°';
    const note = node('div', { class: 'tiny fs-note', role: 'status' });
    const out = node('output', { for: id, class: 'fs-val' });
    const slider = node('input', { type: 'range', id, min: p.range[0], max: p.range[1], step: p.step || 0.1, value: p.default });
    const input = node('input', { class: 'input fs-num', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': `${p.label} in ${mm ? (imperial() ? 'inches' : 'millimetres') : p.unit === '°' ? 'degrees' : 'percent'}` });
    const row = { param: p, slider, input, note, out, el: null };
    slider.addEventListener('input', () => { const state = stage.setFace({ [p.key]: Number(slider.value) }); note.textContent = ''; refreshRows(state); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
    input.addEventListener('change', () => {
      const text = input.value.trim().replace(',', '.'); const v = Number(text);
      if (text === '' || !Number.isFinite(v)) { note.textContent = `Type a number${mm ? ` in ${imperial() ? 'inches' : 'millimetres'}` : ''}.`; refreshRows(stage.faceState()); return; }
      if (mm) {
        const target = imperial() ? v * MM_PER_IN : v; const res = stage.solveFace(p.key, target);
        note.textContent = res.ok ? '' : `That is as far as this face can go: it measures ${fmtMm(res.reached)}.`; refreshRows(res.state);
      } else { const state = stage.setFace({ [p.key]: v }); note.textContent = ''; refreshRows(state); }
    });
    const unitLabel = pct ? p.unit : null;
    row.el = node('div', { class: 'fs-row fs-param' },
      node('div', { class: 'fs-head' }, node('label', { class: 'fld', for: id, style: 'margin:0' }, p.label), node('span', { class: 'fs-entry' }, input, node('span', { class: 'tiny fs-unit', 'data-unit': mm ? 'len' : 'fixed', text: unitLabel || '' }))),
      node('p', { class: 'tiny', text: p.hint }), slider, node('div', { class: 'fs-ends tiny' }, node('span', { text: p.low }), node('span', { text: p.high })), note,
      node('button', { type: 'button', class: 'btn small ghost fs-reset', onclick: () => { const state = stage.setFace({ [p.key]: p.default }); note.textContent = ''; refreshRows(state); } }, 'Back to start'));
    faceRows.push(row);
    return row;
  }
  function refreshRows(state) {
    const byKey = Object.fromEntries(state.map(s => [s.key, s]));
    for (const row of faceRows) {
      const s = byKey[row.param.key]; if (!s) continue;
      row.slider.value = s.value;
      const mm = row.param.unit === 'mm' && row.param.measure;
      row.input.value = mm ? (s.measured == null ? '' : imperial() ? (s.measured / MM_PER_IN).toFixed(2) : s.measured.toFixed(1)) : String(Math.round(s.value * 10) / 10);
      const unit = row.el.querySelector('.fs-unit'); if (mm) unit.textContent = imperial() ? 'in' : 'mm';
      const base = s.base != null && mm ? ` Starts at ${fmtMm(s.base)} on this model.` : '';
      row.slider.setAttribute('aria-valuetext', mm ? fmtMm(s.measured) : `${Math.round(s.value)}${row.param.unit}`);
      row.el.title = base.trim();
    }
  }

  // ---- shell ------------------------------------------------------------------------------------------------------
  const BUILDERS = { skin: paneSkin, hair: paneHair, eyes: paneEyes, brows: paneBrows, nose: paneNose, jaw: paneJaw };
  function renderPane() {
    const holder = $('#fs-body'); holder.innerHTML = ''; faceRows = [];
    const sun = $('#fs-sun');
    $$('#fs-nav .pick').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.group === group)));
    if (group === 'sun') { holder.hidden = true; sun.hidden = false; return; }
    sun.hidden = true; holder.hidden = false;
    holder.setAttribute('aria-labelledby', `fs-tab-${group}`);
    holder.append(BUILDERS[group]());
    if (stage && faceRows.length) refreshRows(stage.faceState());
  }
  function selectGroup(next, { focus = true } = {}) { group = next; renderPane(); if (focus) focusFace(); }

  function renderLooks() {
    const box = $('#fs-looks'); if (!box || box.childElementCount) return;
    for (const look of LOOKS) box.append(node('button', { type: 'button', class: 'pick', onclick: () => applyLook(look) }, look.name));
  }
  function applyLook(look) {
    const tone = look.skin.tone ? T.SKIN_TONES.find(t => t.id === look.skin.tone) : null;
    Object.assign(S.skin, DEFAULTS.skin, look.skin, tone ? { hex: tone.hex, tone: tone.id } : {});
    S.hair = { ...clone(DEFAULTS.hair), ...look.hair }; S.eyes = { ...clone(DEFAULTS.eyes), ...look.eyes };
    S.brows = clone(DEFAULTS.brows); S.lashes = clone(DEFAULTS.lashes);
    ctx.setSkinHex(S.skin.hex); applyAll(); renderPane(); focusFace();
  }
  function resetAll() {
    Object.assign(S, clone(DEFAULTS)); if (stage) { stage.resetFace(); } ctx.setSkinHex(S.skin.hex); applyAll(); renderPane();
  }

  function init(context) {
    ctx = context; T = window.PlanStage;
    if (!T) return;
    const nav = $('#fs-nav');
    for (const [key, name] of GROUPS) nav.append(node('button', { type: 'button', class: 'pick', id: `fs-tab-${key}`, 'data-group': key, 'aria-pressed': String(key === group), onclick: () => selectGroup(key) }, name));
    $('#fs-reset').addEventListener('click', resetAll);
    renderLooks(); renderPane();
  }
  function attach(s) { stage = s; applyAll(); if (faceRows.length) refreshRows(stage.faceState()); }
  /** Called when the page's unit switch changes. */
  function unitsChanged() { if (!ctx) return; const open = group; renderPane(); void open; }

  window.PlanFace = { init, attach, unitsChanged, select: g => selectGroup(g, { focus: false }), state: () => clone(S), looks: LOOKS.map(l => l.name) };
})();

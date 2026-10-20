/* Page logic for v4Plan_3DModel.html. Plain browser JavaScript; no build step.
 * Values are kept in canonical units (cm, kg, %) and only converted for display. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ units */
  const units = { imperial: false };
  const CM_PER_IN = 2.54; const KG_PER_LB = 0.45359237;
  const trim = (n, d = 1) => String(Number(n.toFixed(d)));
  const toDisplay = (type, v) => (units.imperial ? (type === 'mass' ? v / KG_PER_LB : type === 'percent' ? v : v / CM_PER_IN) : v);
  const fromDisplay = (type, v) => (units.imperial ? (type === 'mass' ? v * KG_PER_LB : type === 'percent' ? v : v * CM_PER_IN) : v);
  const unitName = type => (type === 'percent' ? '%' : type === 'mass' ? (units.imperial ? 'lb' : 'kg') : units.imperial ? 'in' : 'cm');
  function show(type, v, digits = 1) {
    if (v == null || !Number.isFinite(v)) return '—';
    if (type === 'percent') return `${trim(v, digits)}%`;
    if (type === 'height' && units.imperial) { const inches = v / CM_PER_IN; const ft = Math.floor(inches / 12); return `${ft} ft ${trim(inches - ft * 12, 1)} in`; }
    return `${trim(toDisplay(type, v), digits)} ${unitName(type)}`;
  }
  const typeOf = m => (m.type === 'height' ? 'length' : m.type);
  const parseNum = text => { const t = String(text).trim().replace(',', '.'); if (t === '') return null; const n = Number(t); return Number.isFinite(n) ? n : NaN; };

  /* ------------------------------------------------------ measurement guides */
  const TAPE = ['Soft tape', 'With a helper', 'From a scan', 'My estimate', 'Not sure'];
  const M = [
    { id: 'height', key: 'height', group: 'Start here', label: 'Height', type: 'height', kind: 'Length · standing', range: [140, 210], step: 0.5, status: 'fitted', site: null, overlay: { type: 'height' }, view: { name: 'front' }, zone: null,
      plain: 'How tall you are, from the floor to the top of your head.', where: 'Heels on the floor, back against a flat wall, head level and looking straight ahead.', how: 'Stand barefoot. A helper rests a flat book on your head against the wall and marks the spot; measure floor to mark.', watch: 'Shoes, a tilted head, or bent knees.', changes: 'Sets the size of the whole body. Arm, leg and torso proportions need their own entries.', tool: 'Wall and ruler, or a height rule', helper: 'Helpful', sources: ['Height rule', 'With a helper', 'My estimate', 'Not sure'] },
    { id: 'weight', key: 'weight', group: 'Start here', label: 'Weight', type: 'mass', kind: 'Whole body · not a tape measure', range: [40, 160], step: 0.5, status: 'approx', site: null, overlay: null, view: { name: 'front' }, zone: null,
      plain: 'How much you weigh.', where: 'No body spot — it is the weight of the whole body.', how: 'Use the same scale at the same time of day, lightly dressed. Morning, after the bathroom, is the most consistent.', watch: 'Mixing scales, or weighing after a meal or workout. Weight says nothing about where it sits.', changes: 'Gives a rough overall fullness. Your tape numbers take over wherever you add them.', tool: 'Bathroom scale', helper: 'Not needed', sources: ['Bathroom scale', 'Body-composition scale', 'My estimate', 'Not sure'] },
    { id: 'waist', key: 'waist', group: 'Start here', label: 'Waist', type: 'length', kind: 'Girth · all the way around', range: [55, 140], step: 0.5, status: 'fitted', site: 'waist', overlay: { type: 'loop', site: 'waist' }, view: { name: 'three', zone: ['core'] }, zone: 'core',
      plain: 'All the way around your waist.', where: 'Halfway between your lowest rib and the top of your hip bone. Feel for both with your fingers and mark the middle.', how: 'Soft tape, level all the way round, snug but not squeezing. Breathe out normally, then read.', watch: 'Using your belly button, trouser waistband or narrowest point instead — they are different places and give different numbers.', changes: 'Sets how wide the midsection is all the way round. Width and depth are separate.', tool: 'Soft tape', helper: 'Optional', method: true, sources: TAPE },
    { id: 'hips', key: 'hips', group: 'Start here', label: 'Hips', type: 'length', kind: 'Girth · fullest part', range: [70, 150], step: 0.5, status: 'fitted', site: 'hips', overlay: { type: 'loop', site: 'hips' }, view: { name: 'three', zone: ['hips'] }, zone: 'hips',
      plain: 'All the way around the fullest part of your hips and seat.', where: 'Feet together. The tape sits at the widest point at the back, level with the floor.', how: 'Use a mirror or helper so the back of the tape doesn’t ride up. Don’t squeeze.', watch: 'Measuring only across the front, or a tape that tilts at the back.', changes: 'Sets hip and seat fullness. It doesn’t set pelvis bone width or how far the seat sticks out.', tool: 'Soft tape', helper: 'Recommended', sources: TAPE },
    { id: 'chest', key: 'chest', group: 'Start here', label: 'Chest', type: 'length', kind: 'Girth · all the way around', range: [70, 150], step: 0.5, status: 'fitted', site: 'chest', overlay: { type: 'loop', site: 'chest' }, view: { name: 'three', zone: ['chest'] }, zone: 'chest',
      plain: 'All the way around your chest.', where: 'Across the nipple line, under the armpits and over the shoulder blades, tape level.', how: 'Arms relaxed at your sides. Breathe out normally, then read.', watch: 'Raised arms, a sagging tape at the back, or a flexed chest.', changes: 'Sets chest fullness. Chest depth and width are separate.', tool: 'Soft tape', helper: 'Recommended', sources: TAPE },
    { id: 'neck', key: 'neck', group: 'Start here', label: 'Neck', type: 'length', kind: 'Girth · all the way around', range: [28, 55], step: 0.5, status: 'fitted', site: 'neck', overlay: { type: 'loop', site: 'neck' }, view: { name: 'three', zone: ['neck'] }, zone: 'neck',
      plain: 'All the way around the middle of your neck.', where: 'Just below the Adam’s apple, with the tape sloping slightly down at the front.', how: 'Head level, looking forward, shoulders relaxed. Don’t flare the muscles.', watch: 'Tilting the head, or pulling the tape tight.', changes: 'Sets neck thickness. It is also needed by the body-fat estimate below.', tool: 'Soft tape', helper: 'Optional', sources: TAPE },
    { id: 'shoulders', key: 'shoulders', group: 'Arms & shoulders', label: 'Shoulders (around)', type: 'length', kind: 'Girth · around both shoulders', range: [90, 160], step: 0.5, status: 'fitted', site: 'shoulders', overlay: { type: 'loop', site: 'shoulders' }, view: { name: 'three', zone: ['upperBody'] }, zone: 'shoulders',
      plain: 'A loop around both shoulders and your upper chest.', where: 'Over the widest part of both shoulder muscles (the deltoids), with the tape level.', how: 'A helper makes this easy. Arms relaxed, tape level at the back.', watch: 'This is not shoulder width, which is a straight line across.', changes: 'Sets overall shoulder fullness.', tool: 'Soft tape', helper: 'Recommended', sources: TAPE },
    { id: 'arms', key: 'arms', group: 'Arms & shoulders', label: 'Upper arm', type: 'length', kind: 'Girth · all the way around', range: [20, 55], step: 0.5, status: 'fitted', site: 'arms', overlay: { type: 'loop', site: 'arms' }, view: { name: 'front', zone: ['leftArm'] }, zone: 'arms',
      plain: 'All the way around the middle of your upper arm.', where: 'Halfway between the bony tip of your shoulder and your elbow, arm relaxed.', how: 'Let the arm hang. Wrap the tape level with the arm’s own direction, snug, not squeezing.', watch: 'Mixing a relaxed arm with a flexed one. Record which you measured.', changes: 'Sets arm thickness. Arm length is separate.', tool: 'Soft tape', helper: 'Recommended', sources: TAPE },
    { id: 'shoulderBreadth', key: 'shoulderBreadth', group: 'Arms & shoulders', label: 'Shoulder width (bony points)', type: 'length', kind: 'Width · straight across', range: [33, 50], step: 0.5, status: 'saved', site: null, overlay: { type: 'span', id: 'bonyShoulder' }, view: { name: 'front', zone: ['upperBody'] }, zone: 'shoulders', landmark: 'bonyShoulder',
      plain: 'The straight distance between the two bony tips of your shoulders.', where: 'The hard bony points at the top, outside of each shoulder (the acromion). Feel along the top of the shoulder to the edge.', how: 'A helper measures straight across with a large caliper or a rigid ruler. A tape draped over your back measures a different path.', watch: 'Mixing this with shoulder girth, or with the widest point of the shoulder muscles.', changes: 'Saved for now. The preview can’t yet separate bone from muscle, so it doesn’t change the shape.', tool: 'Caliper or rigid ruler', helper: 'Needed', sources: ['With a helper', 'From a scan', 'My estimate', 'Not sure'] },
    { id: 'bideltoid', key: 'bideltoid', group: 'Arms & shoulders', label: 'Shoulder width (outer)', type: 'length', kind: 'Width · straight across', range: [40, 65], step: 0.5, status: 'saved', site: null, overlay: { type: 'span', id: 'outerShoulder' }, view: { name: 'front', zone: ['upperBody'] }, zone: 'shoulders', landmark: 'outerShoulder',
      plain: 'The straight distance across the widest outside edges of your shoulder muscles.', where: 'Outside of one shoulder muscle to the outside of the other, at the widest point.', how: 'A helper measures straight across in a relaxed pose, or a calibrated scan supplies it.', watch: 'Entering the bony-point width here, or following the curve of your back with a tape.', changes: 'Saved for now. A separate shoulder-width control is planned.', tool: 'Large caliper or rigid ruler', helper: 'Needed', sources: ['With a helper', 'From a scan', 'My estimate', 'Not sure'] },
    { id: 'thighs', key: 'thighs', group: 'Legs', label: 'Thigh', type: 'length', kind: 'Girth · all the way around', range: [40, 80], step: 0.5, status: 'fitted', site: 'thighs', overlay: { type: 'loop', site: 'thighs' }, view: { name: 'three', zone: ['leftThigh'] }, zone: 'thighs',
      plain: 'All the way around your upper leg.', where: 'Standing with your weight on both feet, about halfway between your hip crease and the top of your kneecap.', how: 'Keep the tape level and snug. Measure the same leg each time.', watch: 'Measuring while standing on one leg, or at a different height each time.', changes: 'Sets thigh thickness. Leg length is separate.', tool: 'Soft tape', helper: 'Optional', sources: TAPE },
    { id: 'calves', key: 'calves', group: 'Legs', label: 'Calf', type: 'length', kind: 'Girth · fullest part', range: [28, 50], step: 0.5, status: 'fitted', site: 'calves', overlay: { type: 'loop', site: 'calves' }, view: { name: 'three', zone: ['leftCalf'] }, zone: 'calves',
      plain: 'All the way around the widest part of your calf.', where: 'The fullest part of the back of your lower leg, usually a third of the way down from the knee.', how: 'Stand relaxed with weight on both feet. Slide the tape up and down to find the widest point, then read.', watch: 'Measuring while on tiptoe, or with the tape tilted.', changes: 'Sets calf fullness.', tool: 'Soft tape', helper: 'Optional', sources: TAPE },
    { id: 'lowerLeg', key: 'lowerLeg', group: 'Legs', label: 'Lower-leg length', type: 'length', kind: 'Length · knee to ankle', range: [30, 50], step: 0.5, status: 'saved', site: null, overlay: { type: 'span', id: 'lowerLeg' }, view: { name: 'front', zone: ['leftLower'] }, zone: 'calves', landmark: 'lowerLeg',
      plain: 'The distance from the centre of your knee joint to the centre of your ankle joint.', where: 'The two joints are inside the leg, so the markers are drawn through the body. They are model references, not easy to feel.', how: 'Best from a calibrated scan or a trained helper. If you can’t find the joints, leave it blank or adjust by eye.', watch: 'Trouser inseam and a tape along the skin are different things.', changes: 'Saved for now. Separate leg-segment lengths are planned.', tool: 'Scan or trained helper', helper: 'Needed', sources: ['From a scan', 'With a helper', 'My estimate', 'Not sure'] },
    { id: 'bodyFat', key: 'bodyFat', group: 'Body composition', label: 'Body fat', type: 'percent', kind: 'Share of weight · estimate', range: [4, 50], step: 0.5, status: 'approx', site: null, overlay: null, view: { name: 'front' }, zone: null,
      plain: 'The share of your weight that is fat.', where: 'No body spot. It comes from a device, a scan, or the estimate further down this tab.', how: 'Keep to one method. Devices often disagree by several points, so compare like with like.', watch: 'Comparing numbers from different devices, or reading a single result as exact.', changes: 'Slightly rounder face and softer midsection as a broad hint. It can’t show where fat sits.', tool: 'Device, scan or estimate', helper: 'Not needed', sources: ['Body-composition scale', 'Calculated estimate', 'My estimate', 'Not sure'] },
    { id: 'chestDepth', key: 'chestDepth', group: 'Side-view details', label: 'Chest depth', type: 'length', kind: 'Depth · front to back', range: [17, 35], step: 0.5, status: 'saved', site: null, overlay: { type: 'span', id: 'chestDepth' }, view: { name: 'side', zone: ['chest'] }, zone: 'chest', landmark: 'chestDepth',
      plain: 'How thick your chest is from front to back.', where: 'On the same level as your chest tape, from the front of the chest to the back, seen from the side.', how: 'A helper uses a depth caliper while you breathe out normally. Both ends must be on the same level.', watch: 'Entering your chest girth here, or measuring at two different levels.', changes: 'Saved for now. Width and depth will become separate controls.', tool: 'Depth caliper', helper: 'Needed', sources: ['With a helper', 'From a scan', 'My estimate', 'Not sure'] },
    { id: 'projection', key: 'projection', group: 'Side-view details', label: 'Seat projection', type: 'length', kind: 'Projection · side view', range: [4, 16], step: 0.5, status: 'saved', site: null, overlay: { type: 'span', id: 'projection' }, view: { name: 'side', zone: ['hips'] }, zone: 'hips', landmark: 'projection',
      plain: 'How far your seat sticks out behind a straight line dropped from your hip joint.', where: 'Seen from the side. The flat teal plane is the reference line; the arrow is the distance from it to the back of your seat.', how: 'Needs a calibrated side photo or scan and the same reference plane every time.', watch: 'Changing posture between measurements. This is not the same as seat volume.', changes: 'Saved for now. The shape controls for it are planned.', tool: 'Calibrated side view or scan', helper: 'Needed', sources: ['From a scan', 'My estimate', 'Not sure'] },
  ];
  const M_BY_ID = Object.fromEntries(M.map(m => [m.id, m]));
  const GROUPS = [...new Set(M.map(m => m.group))];
  const ESSENTIALS = ['height', 'weight', 'bodyFat', 'waist', 'neck', 'hips', 'chest', 'shoulders', 'arms', 'thighs', 'calves'];
  const FIT_KEYS = ['height', 'weight', 'bodyFat', 'waist', 'hips', 'chest', 'neck', 'shoulders', 'arms', 'thighs', 'calves'];
  const SAMPLE = { height: 178, weight: 78, bodyFat: 18, waist: 84, hips: 100, chest: 100, shoulders: 124, arms: 33, thighs: 56 };
  const TODAY = new Date().toISOString().slice(0, 10);
  const CHECKINS = [
    { date: '2026-03-02', m: { height: 178, weight: 84.2, bodyFat: 22.5, waist: 92, hips: 103, chest: 98, shoulders: 124, arms: 32, thighs: 58 } },
    { date: '2026-04-06', m: { height: 178, weight: 83.1, bodyFat: 22, waist: 90.5, hips: 102.5, chest: 98.5, shoulders: 124, arms: 32, thighs: 57.5 } },
    { date: '2026-05-11', m: { height: 178, weight: 81.8, bodyFat: 21, waist: 89, hips: 102, chest: 99, shoulders: 124, arms: 32.5, thighs: 57 } },
    { date: '2026-06-15', m: { height: 178, weight: 80.4, bodyFat: 20.2, waist: 87.5, hips: 101.5, chest: 99.5, shoulders: 124, arms: 32.5, thighs: 56.8 } },
    { date: '2026-07-20', m: { height: 178, weight: 79.6, bodyFat: 19.4, waist: 86, hips: 101, chest: 99.5, shoulders: 124, arms: 33, thighs: 56.5 } },
    { date: '2026-08-24', m: { height: 178, weight: 78.9, bodyFat: 18.8, waist: 85, hips: 100.5, chest: 100, shoulders: 124, arms: 33, thighs: 56.2 } },
    { date: '2026-10-12', m: { height: 178, weight: 78, bodyFat: 18, waist: 84, hips: 100, chest: 100, shoulders: 124, arms: 33, thighs: 56 } },
  ];
  const PARTS = [['head', 'Head & face'], ['neck', 'Neck'], ['shoulders', 'Shoulders'], ['chest', 'Chest'], ['core', 'Belly & waist'], ['arms', 'Arms'], ['hands', 'Hands'], ['hips', 'Hips & seat'], ['thighs', 'Thighs'], ['calves', 'Calves'], ['feet', 'Feet']];
  const PART_TO_MEASURE = { neck: 'neck', shoulders: 'shoulders', chest: 'chest', core: 'waist', arms: 'arms', hips: 'hips', thighs: 'thighs', calves: 'calves' };
  const PART_NAME = Object.fromEntries(PARTS);
  const ZONE_ROWS = [['Shoulders & chest', ['shoulders', 'chest']], ['Arms', ['arms']], ['Core', ['core']], ['Hips & glutes', ['hips']], ['Legs', ['thighs', 'calves', 'feet']]];
  const PHASES = ['Cutting', 'Maintenance', 'Hypertrophy', 'Power', 'Recomp'];
  const GOAL_KEYS = ['weight', 'bodyFat', 'waist', 'hips', 'chest', 'shoulders', 'arms', 'thighs', 'calves', 'neck'];
  const HISTORY_KEYS = ['weight', 'bodyFat', 'waist', 'chest', 'hips', 'arms', 'thighs'];

  /* ----------------------------------------------------------------- state */
  const state = {
    tab: 'blueprint', profile: 'sample', edited: false,
    now: { ...SAMPLE }, prov: {}, method: { waist: 'WHO midpoint' },
    selected: 'waist', route: 'number', undo: null,
    goals: { weight: 74, bodyFat: 14, waist: 78, chest: 104, arms: 35 },
    milestones: [{ t: 'Waist under 90 cm', d: 'Done in August', done: true }, { t: 'Waist under 82 cm', d: 'By December', done: false }, { t: 'Chest 102 cm', d: 'By February', done: false }, { t: 'Weight 74 kg', d: 'By April', done: false }],
    zonePhase: { 'Shoulders & chest': 'Hypertrophy', Arms: 'Hypertrophy', Core: 'Cutting', 'Hips & glutes': 'Maintenance', Legs: 'Maintenance' },
    part: null, tape: false, look: { skin: '#bc8970', pigOn: false, pig: '#996951', tan: 0, tanPat: 'tee', light: 'studio' },
    mode: 'ghost', split: 0.5, checkins: CHECKINS.map(c => ({ date: c.date, m: { ...c.m } })), checkIndex: CHECKINS.length - 1, ghost: true, chartKey: 'waist', bf: 'M',
    view: 'front', fit: null, read: null,
  };
  let stage = null;

  /* ------------------------------------------------------------ small helpers */
  const entriesNow = () => { const e = {}; for (const k of FIT_KEYS) if (Number(state.now[k]) > 0) e[k] = state.now[k]; return e; };
  const entriesGoal = () => ({ ...entriesNow(), ...Object.fromEntries(Object.entries(state.goals).filter(([, v]) => Number(v) > 0)) });
  const entriesCheckin = i => { const e = {}; for (const k of FIT_KEYS) if (Number(state.checkins[i].m[k]) > 0) e[k] = state.checkins[i].m[k]; return e; };
  const hasValue = key => Number(state.now[key]) > 0;
  const fmtDate = (iso, long) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, long ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });
  const node = (tag, props = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v); } for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid); return n; };
  const statusChip = (cls, text) => node('span', { class: `status ${cls}`, text });
  let toastTimer = 0;
  function toast(text) { const hint = $('#stage-hint'); hint.textContent = text; clearTimeout(toastTimer); toastTimer = setTimeout(() => { hint.textContent = HINTS[state.tab]; }, 4200); }
  const HINTS = { blueprint: 'Drag to turn · scroll to zoom', measurements: 'Solid = tape in front · dashed = behind', mirror: 'Drag to turn · tap a part · Face close-up', targets: 'Teal outline = your goal', history: 'Drag the slider to travel in time' };
  const CAPTIONS = {
    blueprint: 'Tape loops and the height line are cut from the model’s own surface, using your numbers.',
    measurements: 'The teal path is exactly where the tape goes. Landmarks are placed by proportion on this generic body — find yours by touch.',
    mirror: 'A generic adult from the app’s open (CC0) MakeHuman asset, fitted to your numbers, with eyes, brows, lashes and hair drawn on top. It is not a scan of anyone.',
    targets: 'Both bodies use the same measuring check. If a goal is beyond what the model can show, the Targets list says so.',
    history: 'Each check-in has its own fitted shape; the slider blends between them. Sample data only.',
  };

  /* --------------------------------------------------------------- the stage */
  function failStage(reason) {
    const msg = $('#stage-msg'); msg.hidden = false;
    msg.innerHTML = '';
    const box = node('div', {}, node('p', { text: `The 3D model can’t run here (${String(reason).replace(/\.$/, '')}).` }), node('p', { class: 'tiny', text: 'Every tab below still works with your numbers. Try a current Chrome, Edge, Firefox or Safari with hardware graphics turned on.' }));
    const img = node('img', { src: 'plan-assets/human-poster.webp', alt: 'Still picture of the 3D human model, standing, seen from the front', width: '220' }); img.addEventListener('error', () => img.remove());
    box.prepend(img); msg.append(box);
  }
  function bootStage() {
    if (!window.PlanStage || !window.PLAN_HUMAN_PREVIEW) { failStage('the 3D files did not load'); return; }
    window.PlanStage.createStage($('#stage')).then(s => {
      stage = s; $('#stage-msg').hidden = true;
      if (/[?&]debug\b/.test(location.search)) window.__planStage = s;
      stage.on('pick', onPick);
      stage.controls.addEventListener('start', () => $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', 'false')));
      applyLook(); if (window.PlanFace) window.PlanFace.attach(stage); enterTab(state.tab, { first: true });
      document.documentElement.dataset.stage = 'ready';
    }).catch(error => failStage(error && error.message ? error.message : 'unknown error'));
  }

  function applyLook() {
    if (!stage) return;
    const l = state.look;
    stage.setLook({ skin: l.skin, pigment: { on: l.pigOn, color: l.pig }, tan: { amount: l.tan / 100, pattern: l.tanPat } });
    stage.setLighting(l.light);
  }

  let refreshQueued = false;
  function refresh() { if (refreshQueued) return; refreshQueued = true; requestAnimationFrame(() => { refreshQueued = false; refreshNow(); }); }
  function refreshNow() {
    renderDerived();
    if (!stage) return;
    if (state.tab === 'history') { showCheckin(state.checkIndex, false); return; }
    state.fit = stage.fit(entriesNow()); stage.apply(state.fit, 'primary'); state.read = stage.measure(state.fit);
    if (state.tab === 'targets') stage.apply(stage.fit(entriesGoal()), 'secondary');
    stage.setOverlay(overlayItems());
    renderDerived();
  }

  function overlayItems() {
    const tab = state.tab;
    if (tab === 'blueprint') {
      const go = id => () => { state.selected = id; selectTab('measurements'); };
      const lab = (m, v) => (hasValue(m.key) ? `${m.label} ${show(typeOf(m) === 'length' && m.type !== 'height' ? 'length' : m.type, v)}` : `Add ${m.label.toLowerCase()}`);
      const items = [{ type: 'height', label: lab(M_BY_ID.height, state.now.height), onClick: go('height'), side: 'right' }];
      for (const id of ['chest', 'waist', 'hips']) items.push({ type: 'loop', site: id, style: 'quiet', label: lab(M_BY_ID[id], state.now[id]), onClick: go(id) });
      return items;
    }
    if (tab === 'measurements') {
      const m = M_BY_ID[state.selected]; if (!m.overlay) return [];
      const read = readingFor(m);
      const label = m.overlay.type === 'height' ? `Height ${show('height', state.now.height ?? stage.baseHeightCm)}` : `${m.label}${read != null ? ` · ${show('length', read)}` : ''}`;
      return [{ ...m.overlay, label }];
    }
    if (tab === 'mirror' && state.tape) return M.filter(m => m.site).map(m => ({ type: 'loop', site: m.site, style: 'quiet', label: m.label.replace(' (around)', '') }));
    return [];
  }
  /* What the preview body measures for this measurement (cm), whether or not it was entered. */
  function readingFor(m) {
    if (!stage || !state.read) return null;
    if (m.type === 'height') return state.fit.scale * stage.baseHeightCm;
    if (m.site) return state.read[m.site];
    if (m.landmark === 'projection') return stage.projectionCm();
    if (m.landmark) return stage.landmarkCm(m.landmark);
    return null;
  }

  function setView(name, zone) {
    state.view = name;
    $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
    if (stage) stage.setView(name, { zone: zone || null });
  }
  /** Frame the head for the face and hair studio (whole body for the sun and light controls). */
  function focusFace(group) {
    if (!stage) return;
    if (group === 'sun') { setView(state.view); return; }
    const hairy = group === 'hair';
    state.view = hairy ? 'three' : 'front';
    $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
    stage.setView(state.view, { zone: ['head'], margin: hairy ? 1.9 : 1.5, ms: 500 });
  }
  function onPick(zone) {
    const name = PART_NAME[zone] || zone;
    if (state.tab === 'mirror') { choosePart(zone); return; }
    if (state.tab === 'targets' || state.tab === 'history') { toast(`${name}`); return; }
    const id = PART_TO_MEASURE[zone];
    if (!id) { toast(`${name}: no essential measurement here yet — it is generic on this model`); return; }
    toast(`${name} → ${M_BY_ID[id].label}`);
    state.selected = id; state.route = 'number'; selectTab('measurements');
  }

  /* -------------------------------------------------------------------- tabs */
  const TABS = ['blueprint', 'measurements', 'mirror', 'targets', 'history', 'roadmap'];
  function selectTab(name, { focus = false } = {}) {
    state.tab = name;
    $$('#tabs [role=tab]').forEach(t => { const on = t.dataset.tab === name; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    TABS.forEach(id => { $(`#panel-${id}`).hidden = id !== name; });
    $('#workspace').dataset.tab = name;
    try { history.replaceState(null, '', `#${name}`); } catch { /* file:// in some browsers */ }
    enterTab(name);
  }
  function enterTab(name, { first = false } = {}) {
    $('#stage-hint').textContent = HINTS[name] || '';
    $('#stage-caption').textContent = CAPTIONS[name] || '';
    $('#split-handle').hidden = true; $('#split-tags').hidden = true;
    renderTab(name);
    if (!stage) return;
    stage.setHighlight(null);
    stage.setCompare({ mode: 'off' });
    if (name === 'blueprint') { setView('front'); }
    if (name === 'measurements') { const m = M_BY_ID[state.selected]; refreshNow(); setView(m.view.name, m.view.zone); return; }
    if (name === 'mirror') { if (state.part) { stage.setHighlight([state.part]); setView(state.view === 'front' ? 'front' : state.view, [state.part]); } else setView('front'); }
    if (name === 'targets') { setView('front'); applyCompare(); }
    if (name === 'history') { setView('front'); state.checkIndex = Math.min(state.checkIndex, state.checkins.length - 1); applyGhost(); }
    refreshNow();
    if (name === 'targets') applyCompare();
  }

  /* -------------------------------------------------------------- Blueprint */
  function renderBlueprint() {
    const stats = $('#bp-stats'); stats.innerHTML = '';
    const n = state.now; const last = state.checkins[state.checkins.length - 1];
    const tiles = [
      ['Weight', hasValue('weight') ? show('mass', n.weight) : '—', hasValue('weight') ? 'From your profile' : 'Add a measurement to get started'],
      ['Body fat', hasValue('bodyFat') ? show('percent', n.bodyFat) : '—', hasValue('bodyFat') ? 'From your profile — an estimate, not exact' : 'Add a measurement to get started'],
      ['Waist', hasValue('waist') ? show('length', n.waist) : '—', hasValue('waist') && hasValue('hips') ? `${trimDiff('length', n.hips - n.waist)} ${n.hips >= n.waist ? 'smaller' : 'larger'} than your hips` : hasValue('waist') ? 'From your profile' : 'Add a measurement to get started'],
      ['Latest check-in', state.profile === 'empty' ? 'Not logged' : fmtDate(last.date), state.profile === 'empty' ? 'Save a check-in to begin a timeline' : `${state.checkins.length} recorded check-ins`],
    ];
    for (const [label, value, note] of tiles) stats.append(node('article', { class: `stat${value === '—' || value === 'Not logged' ? ' empty' : ''}` }, node('span', { text: label }), node('strong', { text: value }), node('small', { text: note })));
    const got = ESSENTIALS.filter(hasValue).length;
    $('#bp-count').textContent = `${got} of ${ESSENTIALS.length}`; $('#bp-bar').style.width = `${(got / ESSENTIALS.length) * 100}%`;
    const list = $('#bp-essentials'); list.innerHTML = '';
    for (const id of ESSENTIALS) {
      const m = M_BY_ID[id]; const ok = hasValue(id);
      list.append(node('button', { type: 'button', class: ok ? '' : 'todo', onclick: () => { state.selected = id; state.route = 'number'; selectTab('measurements'); } }, node('span', {}, node('span', { class: 'tick', 'aria-hidden': 'true', text: ok ? '✓' : '·' }), m.label), node('span', { class: 'v', text: ok ? show(m.type, n[id]) : 'Add' })));
    }
    $('#bp-sentence').textContent = got === 0 ? 'Nothing is recorded yet — that is fine. Nothing is guessed for you. Pick a measurement to start; the model stays a generic body until you do.' : [hasValue('height') ? `You are ${show('height', n.height)} tall` : null, hasValue('weight') ? `and weigh ${show('mass', n.weight)}` : null].filter(Boolean).join(' ') + (hasValue('waist') && hasValue('hips') ? `. Your waist is ${trimDiff('length', Math.abs(n.hips - n.waist))} ${n.hips >= n.waist ? 'smaller' : 'larger'} than your hips (a ratio of ${(n.waist / n.hips).toFixed(2)}).` : '.');
    const zones = $('#bp-zones'); if (!zones.childElementCount) {
      for (const [name, keys] of ZONE_ROWS) {
        const select = node('select', { class: 'input', 'aria-label': `${name} training phase` }, PHASES.map(p => node('option', { value: p, text: p })));
        select.value = state.zonePhase[name]; const saved = node('span', { class: 'tiny', role: 'status' });
        select.addEventListener('change', () => { state.zonePhase[name] = select.value; saved.textContent = 'Saved'; setTimeout(() => { saved.textContent = ''; }, 1800); });
        const row = node('div', { class: 'zone' }, node('div', {}, node('strong', { text: name }), saved), select);
        const on = () => { if (stage && state.tab === 'blueprint') stage.setHighlight(keys); }; const off = () => { if (stage) stage.setHighlight(null); };
        row.addEventListener('mouseenter', on); row.addEventListener('focusin', on); row.addEventListener('mouseleave', off); row.addEventListener('focusout', off);
        zones.append(row);
      }
    }
  }
  const trimDiff = (type, d) => show(type, Math.abs(d));

  /* ----------------------------------------------------------- Measurements */
  function renderPicker() {
    const root = $('#ms-picker'); root.innerHTML = '';
    for (const g of GROUPS) {
      root.append(node('div', {}, node('h4', { text: g }), node('div', { class: 'chips' }, M.filter(m => m.group === g).map(m => node('button', { type: 'button', class: 'pick', 'aria-pressed': String(m.id === state.selected), 'data-id': m.id, onclick: () => selectMeasurement(m.id) }, node('span', { class: `dot${hasValue(m.key) ? ' on' : ''}`, 'aria-hidden': 'true' }), m.label, hasValue(m.key) ? node('span', { class: 'sr-only', text: ' (recorded)' }) : null)))));
    }
  }
  function selectMeasurement(id) {
    state.selected = id; state.route = 'number'; state.undo = null;
    const m = M_BY_ID[id]; renderMeasurements(); refreshNow();
    if (stage) setView(m.view.name, m.view.zone);
  }
  function renderGuide() {
    const m = M_BY_ID[state.selected];
    $('#ms-title').textContent = m.label; $('#ms-kind').textContent = m.kind;
    const facts = $('#ms-facts'); facts.innerHTML = '';
    const rows = [['In plain words', m.plain], ['Where', m.where], ['How', m.how], ['Watch out for', m.watch], ['What it changes on the model', m.changes]];
    for (const [h, t] of rows) facts.append(node('div', { class: 'fact' }, node('h5', { text: h }), node('p', { text: t })));
    facts.append(node('div', { class: 'row tight' }, node('span', { class: 'tag', text: `Tool: ${m.tool}` }), node('span', { class: 'tag', text: `Helper: ${m.helper}` })));
    $$('#ms-picker .pick').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.id === m.id)); b.querySelector('.dot').classList.toggle('on', hasValue(M_BY_ID[b.dataset.id].key)); });
    $$('#ms-route button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.route === state.route)));
  }
  const rangeText = m => { const [lo, hi] = m.range; const t = typeOf(m); return `Common range: ${trim(toDisplay(t, lo), 0)}–${show(m.type === 'height' ? 'length' : t, hi, 0)}. Values outside it are allowed.`; };

  function commit(m, value, source) {
    if (value == null) delete state.now[m.key]; else state.now[m.key] = value;
    if (source) state.prov[m.key] = source;
    state.edited = true; updateSubject(); renderBodyFat(); refresh();
  }
  function renderEntry() {
    const m = M_BY_ID[state.selected]; const box = $('#ms-entry'); box.innerHTML = '';
    const t = typeOf(m); const cur = state.now[m.key];
    if (state.route === 'skip') {
      box.append(node('p', { text: 'Skipped. Nothing is recorded, and the model keeps its generic default here.' }), node('div', { class: 'row', style: 'margin-top:8px' }, state.undo != null ? node('button', { type: 'button', class: 'btn', onclick: () => { commit(m, state.undo, 'Not sure'); state.undo = null; state.route = 'number'; renderMeasurements(); } }, 'Undo — bring back ' + show(m.type, state.undo)) : null, node('button', { type: 'button', class: 'btn', onclick: () => { state.route = 'number'; renderMeasurements(); } }, 'Enter a number instead')));
      return;
    }
    if (state.route === 'eye') {
      const base = cur ?? readingFor(m) ?? (m.range[0] + m.range[1]) / 2;
      const slider = node('input', { type: 'range', id: 'ms-eye', min: m.range[0], max: m.range[1], step: m.step, value: base, 'aria-describedby': 'ms-eye-out' });
      const out = node('strong', { id: 'ms-eye-out', text: show(m.type, base) });
      slider.addEventListener('input', () => { const v = Number(slider.value); out.textContent = show(m.type, v); commit(m, v, 'My estimate'); renderReadout(); });
      box.append(node('label', { class: 'fld', for: 'ms-eye' }, `Adjust ${m.label.toLowerCase()} until the model looks right: `, out), slider, node('div', { class: 'scrub-ticks' }, node('span', { text: `Smaller · ${show(m.type, m.range[0], 0)}` }), node('span', { text: `Larger · ${show(m.type, m.range[1], 0)}` })), node('p', { class: 'hint', text: 'Saved as “estimated by eye”. You can replace it with a measured number any time.' }));
      return;
    }
    const hint = node('p', { class: 'hint', id: 'ms-hint', text: rangeText(m) }); const warn = node('p', { class: 'hint warn', id: 'ms-warn', role: 'status' });
    const validate = value => { warn.textContent = ''; if (Number.isNaN(value)) { warn.textContent = 'Use numbers only, like 84 or 84.5.'; return false; } if (value != null && (value < m.range[0] * 0.85 || value > m.range[1] * 1.15)) warn.textContent = `That is outside the common range (${show(m.type, m.range[0], 0)}–${show(m.type, m.range[1], 0)}). Check the unit? It is still saved if it is right.`; return true; };
    const sourceSel = node('select', { id: 'ms-src', class: 'input' }, m.sources.map(s => node('option', { value: s, text: s })));
    sourceSel.value = state.prov[m.key] && m.sources.includes(state.prov[m.key]) ? state.prov[m.key] : m.sources[0]; sourceSel.addEventListener('change', () => { state.prov[m.key] = sourceSel.value; });
    let controls;
    if (m.type === 'height' && units.imperial) {
      const inches = cur ? cur / CM_PER_IN : null; const ft = node('input', { id: 'ms-ft', class: 'input', inputmode: 'numeric', autocomplete: 'off', placeholder: 'ft', value: inches != null ? Math.floor(inches / 12) : '' });
      const inn = node('input', { id: 'ms-in', class: 'input', inputmode: 'decimal', autocomplete: 'off', placeholder: 'in', value: inches != null ? trim(inches - Math.floor(inches / 12) * 12, 1) : '' });
      const read = () => { const f = parseNum(ft.value); const i = parseNum(inn.value); if (f == null && i == null) return null; if (Number.isNaN(f) || Number.isNaN(i)) return NaN; return ((f || 0) * 12 + (i || 0)) * CM_PER_IN; };
      const onInput = () => { const v = read(); if (validate(v)) { commit(m, v, sourceSel.value); renderReadout(); } };
      ft.addEventListener('input', onInput); inn.addEventListener('input', onInput);
      controls = node('div', {}, node('div', { class: 'feet' }, node('div', {}, node('label', { class: 'fld', for: 'ms-ft', text: 'Feet' }), ft), node('div', {}, node('label', { class: 'fld', for: 'ms-in', text: 'Inches' }), inn)));
    } else {
      const input = node('input', { id: 'ms-input', class: 'input', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Not recorded', value: cur != null ? trim(toDisplay(t, cur), 2) : '', 'aria-describedby': 'ms-hint ms-warn' });
      const apply = display => { const v = display == null ? null : fromDisplay(t, display); if (validate(display)) { commit(m, v, sourceSel.value); renderReadout(); } };
      input.addEventListener('input', () => apply(parseNum(input.value)));
      const nudge = dir => { const stepDisplay = units.imperial && t === 'length' ? 0.25 : units.imperial && t === 'mass' ? 1 : m.step; const start = parseNum(input.value); const base = Number.isFinite(start) ? start : toDisplay(t, cur ?? readingFor(m) ?? (m.range[0] + m.range[1]) / 2); const next = Math.max(0, Math.round((base + dir * stepDisplay) / stepDisplay) * stepDisplay); input.value = trim(next, 2); apply(next); };
      controls = node('div', {}, node('label', { class: 'fld', for: 'ms-input' }, `${m.label} (${unitName(t)})`), node('div', { class: 'stepper' }, node('button', { type: 'button', class: 'btn', 'aria-label': `Decrease ${m.label}`, onclick: () => nudge(-1) }, '−'), input, node('button', { type: 'button', class: 'btn', 'aria-label': `Increase ${m.label}`, onclick: () => nudge(1) }, '+')));
    }
    box.append(controls, hint, warn);
    const extra = node('div', { class: 'grid2', style: 'margin-top:10px' }, node('div', {}, node('label', { class: 'fld', for: 'ms-src', text: 'How did you get it?' }), sourceSel));
    if (m.method) {
      const sel = node('select', { id: 'ms-method', class: 'input' }, ['WHO midpoint', 'Top of the hip bone (NHANES)', 'Not sure'].map(s => node('option', { value: s, text: s === 'WHO midpoint' ? 'Midway: rib to hip bone (WHO)' : s })));
      sel.value = state.method.waist; sel.addEventListener('change', () => { state.method.waist = sel.value; });
      extra.append(node('div', {}, node('label', { class: 'fld', for: 'ms-method', text: 'Where you measured' }), sel));
    }
    box.append(extra);
  }
  function renderReadout() {
    const m = M_BY_ID[state.selected]; const root = $('#ms-readout'); root.innerHTML = ''; const status = $('#ms-status'); status.innerHTML = '';
    const rep = state.fit && state.fit.report[m.key]; const t = m.type; const reading = readingFor(m); const has = hasValue(m.key);
    let chip; let text;
    if (!stage) {
      chip = statusChip('off', '3D check unavailable');
      text = has ? `Saved: ${show(t, state.now[m.key])}. The 3D model can’t run in this browser, so there is no model reading to compare.` : 'Not recorded.';
    } else if (m.status === 'fitted') {
      if (!has) { chip = statusChip('off', 'Not recorded'); text = reading != null ? `Not recorded. The model uses its default here: ${show(t === 'height' ? 'height' : 'length', reading)}.` : 'Not recorded.'; }
      else if (m.type === 'height') { chip = statusChip('ok', 'Fitted'); text = `You entered ${show('height', state.now.height)}. The model stands ${show('height', reading)} tall.`; }
      else if (rep && rep.status === 'fitted') { chip = statusChip('ok', 'Fitted — matches within 0.5 cm'); text = `You entered ${show('length', state.now[m.key])}. The model’s ${m.label.toLowerCase().replace(' (around)', '')} loop measures ${show('length', rep.achieved)}.`; }
      else if (rep) { chip = statusChip('warn', 'Model limit reached'); text = `You entered ${show('length', state.now[m.key])}. This body can only reach ${show('length', rep.achieved)} here, so it shows the closest it can. Your number is still saved exactly as typed.`; }
      else { chip = statusChip('off', 'Working…'); text = ''; }
    } else if (m.status === 'approx') {
      chip = has ? statusChip('warn', 'Roughly shown') : statusChip('off', 'Not recorded');
      text = has ? `${m.label} ${show(t, state.now[m.key])} is a broad hint to the model — it nudges overall fullness. Tape measurements override it wherever you add them.` : 'Not recorded. The model keeps its default fullness.';
    } else {
      chip = statusChip('off', 'Saved only — not used by the preview yet');
      text = `${has ? `Saved: ${show('length', state.now[m.key])}. ` : ''}For reference, the preview body measures ${reading != null ? show('length', reading) : '—'} here. The number is kept exactly as you typed it.`;
    }
    status.append(chip); root.append(node('p', { text }));
    if (m.id === 'waist' && hasValue('hips') && hasValue('waist')) root.append(node('p', { class: 'hint', text: `Your waist is ${trimDiff('length', state.now.hips - state.now.waist)} ${state.now.hips >= state.now.waist ? 'smaller' : 'larger'} than your hips (ratio ${(state.now.waist / state.now.hips).toFixed(2)}). A ratio is a description, not a verdict.` }));
    if (m.id === 'hips' && hasValue('hips') && hasValue('waist')) root.append(node('p', { class: 'hint', text: `Waist-to-hip ratio: ${(state.now.waist / state.now.hips).toFixed(2)}.` }));
    if (state.prov[m.key] && has) root.append(node('p', { class: 'hint', text: `Source: ${state.prov[m.key]}${m.method ? ` · Where: ${state.method.waist === 'WHO midpoint' ? 'WHO midpoint' : state.method.waist}` : ''}` }));
  }
  /* Navy tape-method body-fat estimate (same formula as the app's estimator). */
  function navy({ sex, height, neck, waist, hips }) {
    if (![height, neck, waist].every(v => Number(v) > 0)) return null;
    if (sex === 'F' && !(Number(hips) > 0)) return null;
    const c = sex === 'F' ? Number(waist) + Number(hips) - Number(neck) : Number(waist) - Number(neck); if (c <= 0) return null;
    const density = sex === 'F' ? 1.29579 - 0.35004 * Math.log10(c) + 0.221 * Math.log10(height) : 1.0324 - 0.19077 * Math.log10(c) + 0.15456 * Math.log10(height);
    const r = 495 / density - 450; return Number.isFinite(r) && r > 0 && r < 70 ? r : null;
  }
  function renderBodyFat() {
    const need = state.bf === 'F' ? ['height', 'neck', 'waist', 'hips'] : ['height', 'neck', 'waist'];
    const list = $('#bf-list'); list.innerHTML = '';
    for (const k of need) list.append(node('div', { class: hasValue(k) ? '' : 'todo', style: 'display:flex;justify-content:space-between;padding:6px 10px;border:1px solid var(--line);border-radius:10px;font-size:13.5px' }, node('span', {}, node('span', { class: 'tick', 'aria-hidden': 'true', text: hasValue(k) ? '✓' : '·' }), M_BY_ID[k].label), node('span', { class: 'muted', text: hasValue(k) ? show(M_BY_ID[k].type, state.now[k]) : 'Needed' })));
    const r = navy({ sex: state.bf, ...state.now });
    $('#bf-value').textContent = r == null ? '—' : `${r.toFixed(1)}%`;
    $('#bf-note').textContent = r == null ? `Add ${need.filter(k => !hasValue(k)).map(k => M_BY_ID[k].label.toLowerCase()).join(', ')} first` : 'Calculated estimate · the Navy method measures the waist at the navel, so it can differ from your waist above';
    $('#bf-use').disabled = r == null; $('#bf-use').dataset.v = r == null ? '' : r.toFixed(1);
    $('#bf-m').setAttribute('aria-pressed', String(state.bf === 'M')); $('#bf-f').setAttribute('aria-pressed', String(state.bf === 'F'));
  }
  /* Top-down slice of the model at the selected tape site. */
  function renderSlice() {
    const m = M_BY_ID[state.selected]; const host = $('#slice'); const facts = $('#slice-facts'); host.innerHTML = ''; facts.innerHTML = '';
    const s = stage && m.site ? stage.sliceOutline(m.site) : null;
    if (!s) { host.append(node('p', { class: 'small muted', text: stage ? 'Pick a tape measurement (waist, hips, chest, neck, shoulders, arm, thigh or calf) to see its slice.' : 'The slice needs the 3D model.' })); return; }
    const W = 360; const H = 280; const scale = 200 / Math.max(s.width, s.depth); const cx = W / 2; const cy = H / 2 + 6;
    const pts = s.points.map(([u, v]) => `${(cx + u * scale).toFixed(1)},${(cy + v * scale).toFixed(1)}`).join(' ');
    const rx = (s.width / 2) * scale; const ry = (s.depth / 2) * scale;
    const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Top-down slice of the model at the ${m.label.toLowerCase()}, ${s.width.toFixed(1)} cm wide and ${s.depth.toFixed(1)} cm deep"><polygon points="${pts}" fill="var(--soft)" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="${cx}" cy="${cy}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="var(--muted)" stroke-dasharray="5 4"/><line x1="${(cx - rx).toFixed(1)}" y1="${cy}" x2="${(cx + rx).toFixed(1)}" y2="${cy}" stroke="var(--accent)" stroke-width="1.5"/><line x1="${cx}" y1="${(cy - ry).toFixed(1)}" x2="${cx}" y2="${(cy + ry).toFixed(1)}" stroke="var(--accent)" stroke-width="1.5"/><text x="${cx}" y="16" text-anchor="middle">Front</text><text x="${cx}" y="${H - 6}" text-anchor="middle">Back</text><text x="${(cx + rx * 0.55).toFixed(1)}" y="${cy - 5}">width</text><text x="${cx + 5}" y="${(cy - ry * 0.55).toFixed(1)}">depth</text></svg>`;
    host.innerHTML = svg;
    const b = s.depth / 2; const a = s.width / 2; const perim = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    facts.append(node('div', { class: 'stat' }, node('span', { text: 'All the way round (girth)' }), node('strong', { text: show('length', s.girth) })), node('div', { class: 'grid2', style: 'margin-top:8px' }, node('div', { class: 'stat' }, node('span', { text: 'Width' }), node('strong', { text: show('length', s.width) })), node('div', { class: 'stat' }, node('span', { text: 'Depth' }), node('strong', { text: show('length', s.depth) }))), node('p', { class: 'hint', text: `The dashed oval has the same width and depth. A perfect oval would measure ${show('length', perim)} round; this real slice measures ${show('length', s.girth)}. Real bodies aren’t ovals.` }));
  }
  function renderOval() {
    const ratio = Number($('#ov-ratio').value); const unit = Math.PI * (3 * (ratio + 1) - Math.sqrt((3 * ratio + 1) * (ratio + 3)));
    const b = 80 / unit; const a = ratio * b; const scale = Math.min(9, 66 / b, 120 / a);
    $('#ov-shape').setAttribute('rx', a * scale); $('#ov-shape').setAttribute('ry', b * scale);
    $('#ov-w').setAttribute('x1', 150 - a * scale); $('#ov-w').setAttribute('x2', 150 + a * scale); $('#ov-d').setAttribute('y1', 100 - b * scale); $('#ov-d').setAttribute('y2', 100 + b * scale);
    $('#ov-wv').textContent = show('length', 2 * a); $('#ov-dv').textContent = show('length', 2 * b);
    $('#ov-word').textContent = ratio > 1.7 ? 'Wide and shallow' : ratio > 1.25 ? 'A little wider than deep' : ratio > 0.9 ? 'Nearly round' : 'Deeper than wide';
  }
  function renderMeasurements() { renderPicker(); renderGuide(); renderEntry(); renderReadout(); renderBodyFat(); renderSlice(); }

  /* -------------------------------------------------------------- 3D Mirror */
  function choosePart(key) {
    state.part = key; const name = PART_NAME[key];
    $$('#mr-parts .pick').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.part === key)));
    const id = PART_TO_MEASURE[key]; const out = $('#mr-picked'); out.innerHTML = '';
    out.append(`${name}. `);
    out.append(id ? node('button', { type: 'button', class: 'btn small', onclick: () => { state.selected = id; state.route = 'number'; selectTab('measurements'); } }, `Measure ${M_BY_ID[id].label.toLowerCase()} →`) : `No essential measurement for this part yet — it is generic on this model.`);
    if (stage) { stage.setHighlight([key]); setView(state.view, [key]); }
  }
  function renderMirror() {
    const parts = $('#mr-parts'); if (!parts.childElementCount) for (const [key, name] of PARTS) parts.append(node('button', { type: 'button', class: 'pick', 'data-part': key, 'aria-pressed': 'false', onclick: () => choosePart(key) }, name));
    const rows = [
      ['Overall height and proportions', 'Scales the whole body to your height entry.', ['ok', 'Fitted']],
      ['Eight tape measurements (neck, shoulders, chest, waist, hips, upper arm, thigh, calf)', 'The model is adjusted until each loop measures what you typed — within 0.5 cm, inside its shape range.', ['ok', 'Fitted']],
      ['Weight and body fat', 'A broad hint to overall fullness and face roundness. Your tape numbers override it.', ['warn', 'Roughly shown']],
      ['Width, depth and bone landmarks', 'Shoulder width, chest depth, seat projection and lower-leg length are measured on the model for reference. Your entries are saved but don’t change the shape yet.', ['off', 'Saved only']],
      ['Skin: tone, undertone, freckles, shine, pigment and tan', 'A photo-based colour map under the tone you choose, with pores, flush and light that wraps past the shadow edge. Pigment and tan are separate layers.', ['warn', 'Roughly shown']],
      ['Face sizes: eyes, nose, mouth, jaw, cheeks, ears', 'Fourteen sizes (millimetres, plus eye tilt in degrees) are read off the drawn face. Type one and the face is adjusted to it, within the range this model can show.', ['ok', 'Fitted']],
      ['Eyes, brows, lashes and hair', 'Iris, pupil, eyebrows, lashes and scalp hair are drawn from your choices (style, colour, length, density). They are a look, not a likeness of anyone.', ['warn', 'Roughly shown']],
      ['Hands and feet', 'One generic design for everyone.', ['off', 'Generic']],
      ['Pose', 'A fixed A-pose, on purpose, so measurements stay comparable.', ['off', 'Fixed']],
      ['Adult private anatomy', 'Not shown on this page. It lives behind the app’s own adult and privacy controls.', ['off', 'Not shown here']],
    ];
    const body = $('#mr-table'); body.innerHTML = ''; for (const [a, b, [cls, text]] of rows) body.append(node('tr', {}, node('td', {}, node('strong', { text: a })), node('td', { text: b }), node('td', {}, statusChip(cls, text))));
    $('#mr-tape').setAttribute('aria-pressed', String(state.tape));
  }

  /* ---------------------------------------------------------------- Targets */
  const GOAL_PHRASE = {
    weight: d => `${show('mass', Math.abs(d))} ${d < 0 ? 'lighter' : 'heavier'}`, bodyFat: d => `${trim(Math.abs(d), 1)} points ${d < 0 ? 'less' : 'more'} body fat`,
    waist: d => `a waist ${show('length', Math.abs(d))} ${d < 0 ? 'smaller' : 'larger'}`, hips: d => `hips ${show('length', Math.abs(d))} ${d < 0 ? 'smaller' : 'larger'}`, chest: d => `a chest ${show('length', Math.abs(d))} ${d < 0 ? 'smaller' : 'larger'}`,
    shoulders: d => `shoulders ${show('length', Math.abs(d))} ${d < 0 ? 'narrower' : 'broader'}`, arms: d => `arms ${show('length', Math.abs(d))} ${d < 0 ? 'thinner' : 'thicker'}`, thighs: d => `thighs ${show('length', Math.abs(d))} ${d < 0 ? 'thinner' : 'thicker'}`,
    calves: d => `calves ${show('length', Math.abs(d))} ${d < 0 ? 'thinner' : 'thicker'}`, neck: d => `a neck ${show('length', Math.abs(d))} ${d < 0 ? 'thinner' : 'thicker'}`,
  };
  const GOAL_ZONE = { waist: 'core', hips: 'hips', chest: 'chest', shoulders: 'shoulders', arms: 'arms', thighs: 'thighs', calves: 'calves', neck: 'neck' };
  function renderTargets() {
    const list = $('#tg-list'); list.innerHTML = ''; const diffs = [];
    const first = state.checkins[0].m;
    for (const key of GOAL_KEYS) {
      if (!(Number(state.goals[key]) > 0)) continue; const m = M_BY_ID[key]; const t = m.type; const cur = state.now[key]; const goal = state.goals[key];
      const d = hasValue(key) ? goal - cur : null; if (d != null) diffs.push({ key, d, rel: Math.abs(d) / cur });
      const base = first[key]; const progress = base != null && cur != null && base !== goal ? clamp((cur - base) / (goal - base), 0, 1) : null;
      const input = node('input', { class: 'input', style: 'max-width:120px', inputmode: 'decimal', 'aria-label': `${m.label} goal (${unitName(t)})`, value: trim(toDisplay(t, goal), 2) });
      input.addEventListener('change', () => { const v = parseNum(input.value); if (v == null || Number.isNaN(v) || v <= 0) { input.value = trim(toDisplay(t, goal), 2); return; } state.goals[key] = fromDisplay(t, v); renderTargets(); refresh(); });
      list.append(node('div', { class: 'goal' }, node('div', { class: 'goal-head' }, node('strong', { text: m.label }), node('button', { type: 'button', class: 'btn small ghost', 'aria-label': `Remove ${m.label} goal`, onclick: () => { delete state.goals[key]; renderTargets(); refresh(); } }, 'Remove')),
        node('div', { class: 'goal-vals' }, node('span', { class: 'muted', text: 'Now' }), node('strong', { text: hasValue(key) ? show(t, cur) : 'Not recorded' }), node('span', { class: 'arrow', 'aria-hidden': 'true', text: '→' }), node('span', { class: 'muted', text: 'Goal' }), input, node('span', { class: 'muted', text: unitName(t) })),
        node('div', { class: 'delta', text: d == null ? 'Record your current value to see the difference.' : d === 0 ? 'Already at your goal.' : `${show(t, Math.abs(d))} ${m.id === 'bodyFat' ? (d < 0 ? 'lower' : 'higher') : d < 0 ? 'less' : 'more'} (${Math.abs((d / cur) * 100).toFixed(0)}%)${stage ? targetModelNote(key) : ''}` }),
        progress != null ? node('div', { style: 'margin-top:6px' }, node('div', { class: 'bar', role: 'progressbar', 'aria-label': `${m.label} progress`, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(progress * 100) }, node('i', { style: `width:${progress * 100}%` })), node('span', { class: 'tiny', text: `${Math.round(progress * 100)}% of the way from your first check-in` })) : null));
    }
    if (!list.childElementCount) list.append(node('p', { class: 'muted', text: 'No goals yet. Add one below — a blank goal simply keeps your current value.' }));
    diffs.sort((a, b) => b.rel - a.rel);
    const phrases = diffs.slice(0, 3).map(x => GOAL_PHRASE[x.key](x.d));
    $('#tg-sentence').textContent = phrases.length ? `Your goal body has ${phrases.length > 1 ? phrases.slice(0, -1).join(', ') + ' and ' + phrases.at(-1) : phrases[0]}.` : 'Add a goal to see how it would change your body.';
    const chips = $('#tg-focus'); chips.innerHTML = '';
    for (const x of diffs.slice(0, 4)) { const zone = GOAL_ZONE[x.key]; if (zone) chips.append(node('button', { type: 'button', class: 'pick', onclick: () => { if (stage) { stage.setHighlight([zone]); setView(state.view, [zone]); } } }, `Look at ${M_BY_ID[x.key].label.toLowerCase().replace(' (around)', '')}`)); }
    if (chips.childElementCount) chips.append(node('button', { type: 'button', class: 'pick', onclick: () => { if (stage) { stage.setHighlight(null); setView('front'); } } }, 'Whole body'));
    const sel = $('#tg-metric'); if (!sel.childElementCount) { for (const key of GOAL_KEYS) sel.append(node('option', { value: key, text: M_BY_ID[key].label })); sel.addEventListener('change', syncGoalField); syncGoalField(); }
    const miles = $('#tg-miles'); miles.innerHTML = '';
    state.milestones.forEach((ms, i) => { const id = `ms-${i}`; const box = node('input', { type: 'checkbox', id, checked: ms.done }); box.addEventListener('change', () => { ms.done = box.checked; }); miles.append(node('label', { class: 'mile', for: id }, box, node('span', {}, node('strong', { text: ms.t }), node('br'), node('span', { class: 'tiny', text: ms.d })))); });
  }
  function targetModelNote(key) {
    const m = M_BY_ID[key]; if (m.status === 'fitted' && m.site) { const g = stage.fit(entriesGoal()).report[key]; return g && g.status === 'limit' ? ' · beyond what the model can show' : ' · shown on the model'; }
    return m.status === 'approx' ? ' · roughly shown' : '';
  }
  function syncGoalField() { const key = $('#tg-metric').value; const m = M_BY_ID[key]; $('#tg-value-label').textContent = `Goal (${unitName(typeOf(m))})`; $('#tg-value').value = ''; $('#tg-hint').textContent = `${rangeText(m)}${hasValue(key) ? ` You are at ${show(m.type, state.now[key])} now.` : ''}`; }
  function applyCompare() {
    if (!stage) return;
    const split = state.mode === 'split';
    stage.setCompare({ mode: state.mode, split: state.split });
    $('#split-handle').hidden = !split; $('#split-tags').hidden = !split;
    $$('#tg-mode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
    positionSplit();
  }
  function positionSplit() { $('#split-handle').style.left = `${state.split * 100}%`; $('#split-knob').setAttribute('aria-valuenow', String(Math.round(state.split * 100))); }

  /* ---------------------------------------------------------------- History */
  const HIST_TYPE = { weight: 'mass', bodyFat: 'percent' };
  const histType = k => HIST_TYPE[k] || 'length';
  const histWords = (k, d) => ({ weight: `${show('mass', Math.abs(d))} ${d < 0 ? 'lighter' : 'heavier'}`, bodyFat: `body fat ${trim(Math.abs(d), 1)} points ${d < 0 ? 'lower' : 'higher'}`, waist: `waist ${show('length', Math.abs(d))} ${d < 0 ? 'smaller' : 'larger'}`, chest: `chest ${show('length', Math.abs(d))} ${d < 0 ? 'smaller' : 'larger'}`, hips: `hips ${show('length', Math.abs(d))} ${d < 0 ? 'smaller' : 'larger'}`, arms: `arms ${show('length', Math.abs(d))} ${d < 0 ? 'thinner' : 'thicker'}`, thighs: `thighs ${show('length', Math.abs(d))} ${d < 0 ? 'thinner' : 'thicker'}` })[k];
  let histAnim = 0; let histPos = null;
  function renderHistory() {
    const n = state.checkins.length; const range = $('#hs-range'); range.max = String(n - 1); range.value = String(state.checkIndex);
    const ticks = $('#hs-ticks'); ticks.innerHTML = ''; state.checkins.forEach((c, i) => ticks.append(node('span', { text: i === 0 || i === n - 1 || n <= 8 ? fmtDate(c.date) : '' })));
    const sel = $('#hs-metric'); if (!sel.childElementCount) { for (const k of HISTORY_KEYS) sel.append(node('option', { value: k, text: M_BY_ID[k].label })); sel.value = state.chartKey; sel.addEventListener('change', () => { state.chartKey = sel.value; renderHistory(); }); }
    $('#ci-weight-l').textContent = `Weight (${unitName('mass')})`; $('#ci-waist-l').textContent = `Waist (${unitName('length')})`;
    $('#ci-date').value = $('#ci-date').value || TODAY; $('#ci-date').max = TODAY;
    const i = state.checkIndex; const c = state.checkins[i]; const first = state.checkins[0];
    $('#hs-date').textContent = `· ${fmtDate(c.date, true)} (${i + 1} of ${n})`;
    const changes = HISTORY_KEYS.map(k => ({ k, d: c.m[k] - first.m[k] })).filter(x => Number.isFinite(x.d) && Math.abs(x.d) >= 0.05).sort((a, b) => Math.abs(b.d / first.m[b.k]) - Math.abs(a.d / first.m[a.k])).slice(0, 3);
    $('#hs-sentence').textContent = i === 0 ? 'This is your first check-in. Everything after it is compared with this one.' : changes.length ? `Since ${fmtDate(first.date, true)}: ${changes.map(x => histWords(x.k, x.d)).join(', ')}.` : `Nothing has changed since ${fmtDate(first.date, true)}.`;
    const key = state.chartKey; const t = histType(key); const mm = M_BY_ID[key];
    $('#hs-latest-l').textContent = `${mm.label} · ${fmtDate(c.date)}`; $('#hs-latest-v').textContent = show(t, c.m[key]);
    const dd = c.m[key] - first.m[key]; $('#hs-latest-d').textContent = i === 0 ? 'First check-in' : `${dd === 0 ? 'No change' : `${show(t, Math.abs(dd))} ${dd < 0 ? 'down' : 'up'}`} since ${fmtDate(first.date)}`;
    $('#hs-col').textContent = `${mm.label} (${unitName(t)})`;
    const rows = $('#hs-table'); rows.innerHTML = '';
    for (let j = n - 1; j >= 0; j -= 1) { const d = state.checkins[j].m[key] - first.m[key]; rows.append(node('tr', j === i ? { 'aria-current': 'true', style: 'background:var(--soft)' } : {}, node('td', { text: fmtDate(state.checkins[j].date, true) }), node('td', { text: trim(toDisplay(t, state.checkins[j].m[key]), 1) }), node('td', { text: j === 0 ? '—' : `${d > 0 ? '+' : d < 0 ? '−' : ''}${trim(Math.abs(toDisplay(t, d)), 1)}` }))); }
    renderChart();
  }
  function renderChart() {
    const key = state.chartKey; const t = histType(key); const vals = state.checkins.map(c => toDisplay(t, c.m[key])); const lo = Math.min(...vals); const hi = Math.max(...vals); const span = hi - lo || 1;
    const W = 640; const H = 180; const xs = state.checkins.map((c, i) => 36 + (i / Math.max(1, vals.length - 1)) * (W - 56)); const ys = vals.map(v => 24 + (1 - (v - lo) / span) * (H - 56));
    const host = $('#hs-chart'); host.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('role', 'group'); svg.setAttribute('aria-label', `${M_BY_ID[key].label} across ${vals.length} check-ins`);
    const add = (tag, attrs, text) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text != null) e.textContent = text; svg.append(e); return e; };
    [0, 0.5, 1].forEach(f => { const y = 24 + f * (H - 56); add('line', { class: 'grid', x1: 36, x2: W - 20, y1: y, y2: y }); add('text', { x: 4, y: y + 4 }, trim(hi - f * span, 1)); });
    add('polyline', { class: 'line', points: xs.map((x, i) => `${x},${ys[i]}`).join(' ') });
    xs.forEach((x, i) => { const p = add('circle', { class: `pt${i === state.checkIndex ? ' on' : ''}`, cx: x, cy: ys[i], r: i === state.checkIndex ? 7 : 5, tabindex: 0, role: 'button', 'aria-label': `${fmtDate(state.checkins[i].date, true)}: ${trim(vals[i], 1)} ${unitName(t)}` }); p.addEventListener('click', () => gotoCheckin(i)); p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); gotoCheckin(i); } }); });
    add('text', { x: xs[0], y: H - 6 }, fmtDate(state.checkins[0].date)); add('text', { x: xs.at(-1) - 34, y: H - 6 }, fmtDate(state.checkins.at(-1).date));
    host.append(svg);
  }
  function applyGhost() {
    if (!stage) return;
    if (state.tab !== 'history') return;
    if (state.ghost && state.checkIndex > 0) { stage.apply(stage.fit(entriesCheckin(0)), 'secondary'); stage.setCompare({ mode: 'ghost' }); } else stage.setCompare({ mode: 'off' });
  }
  function gotoCheckin(i) { state.checkIndex = clamp(i, 0, state.checkins.length - 1); renderHistory(); showCheckin(state.checkIndex, true); applyGhost(); }
  function showCheckin(i, animate) {
    if (!stage) return;
    const target = stage.fit(entriesCheckin(i)); cancelAnimationFrame(histAnim);
    if (!animate || reduceMotion() || histPos == null) { stage.apply(target, 'primary'); histPos = i; state.fit = target; stage.setOverlay([]); return; }
    const from = histPos; const fa = stage.fit(entriesCheckin(Math.round(from))); const start = performance.now(); const ms = 520;
    const step = now => { const t = clamp((now - start) / ms, 0, 1); const e = t * t * (3 - 2 * t); stage.apply(stage.blend(fa, target, e), 'primary'); if (t < 1) histAnim = requestAnimationFrame(step); else { histPos = i; state.fit = target; } };
    histAnim = requestAnimationFrame(step); histPos = i;
  }
  let playing = 0;
  function togglePlay() {
    const btn = $('#hs-play');
    if (playing) { clearInterval(playing); playing = 0; btn.textContent = '▶ Play'; return; }
    btn.textContent = '❚❚ Pause'; if (state.checkIndex >= state.checkins.length - 1) gotoCheckin(0);
    playing = setInterval(() => { if (state.checkIndex >= state.checkins.length - 1) { togglePlay(); return; } gotoCheckin(state.checkIndex + 1); }, 900);
  }
  function saveCheckin() {
    const msg = $('#ci-msg'); const date = $('#ci-date').value || TODAY; const w = parseNum($('#ci-weight').value); const waist = parseNum($('#ci-waist').value);
    if (Number.isNaN(w) || Number.isNaN(waist)) { msg.textContent = 'Use numbers only, like 78 or 84.5.'; return; }
    if (w == null && waist == null) { msg.textContent = 'Add at least one number to record a check-in.'; return; }
    const latest = state.checkins.at(-1).m; const m = { ...latest };
    if (w != null) m.weight = fromDisplay('mass', w); if (waist != null) m.waist = fromDisplay('length', waist);
    const existing = state.checkins.findIndex(c => c.date === date);
    if (existing >= 0) state.checkins[existing] = { date, m: { ...state.checkins[existing].m, ...m } }; else { state.checkins.push({ date, m }); state.checkins.sort((a, b) => a.date.localeCompare(b.date)); }
    state.now = { ...state.now, ...(w != null ? { weight: m.weight } : {}), ...(waist != null ? { waist: m.waist } : {}) };
    state.edited = true; state.checkIndex = state.checkins.findIndex(c => c.date === date); histPos = null;
    $('#ci-weight').value = ''; $('#ci-waist').value = ''; msg.textContent = 'Saved. Your numbers on the other tabs are up to date too.';
    renderHistory(); showCheckin(state.checkIndex, false); applyGhost(); renderBlueprint();
  }

  /* ------------------------------------------------------------ render glue */
  function renderTab(name) { if (name === 'blueprint') renderBlueprint(); if (name === 'measurements') renderMeasurements(); if (name === 'mirror') renderMirror(); if (name === 'targets') renderTargets(); if (name === 'history') renderHistory(); }
  function renderDerived() {
    const t = state.tab;
    if (t === 'blueprint') renderBlueprint();
    if (t === 'measurements') { renderGuide(); renderReadout(); renderBodyFat(); renderSlice(); }
    if (t === 'mirror' && stage && state.fit) {
      const tapeEntered = ['neck', 'shoulders', 'chest', 'waist', 'hips', 'arms', 'thighs', 'calves'].filter(hasValue).length;
      $('#mr-h').textContent = show('height', state.fit.scale * stage.baseHeightCm); $('#mr-fit').textContent = `${Object.entries(state.fit.report).filter(([k, r]) => k !== 'height' && r.status === 'fitted' && r.achieved != null).length} of ${tapeEntered || 0}`;
    }
    if (t === 'targets') renderTargets();
  }
  function updateSubject() {
    const chip = $('#stage-subject'); const t = state.tab;
    chip.textContent = t === 'targets' ? 'Now vs goal' : t === 'history' ? `Check-in · ${fmtDate(state.checkins[state.checkIndex].date)}` : state.profile === 'empty' && !state.edited ? 'Generic body · nothing recorded' : state.edited ? 'Sample person · your edits' : 'Sample person · Alex';
  }
  function setProfile(kind) {
    state.profile = kind; state.edited = false; state.now = kind === 'sample' ? { ...SAMPLE } : {}; state.prov = {};
    $('#profile-sample').setAttribute('aria-pressed', String(kind === 'sample')); $('#profile-empty').setAttribute('aria-pressed', String(kind === 'empty'));
    updateSubject(); renderBlueprint(); refreshNow();
  }
  function setUnits(imperial) {
    units.imperial = imperial; $('#units-metric').setAttribute('aria-pressed', String(!imperial)); $('#units-imperial').setAttribute('aria-pressed', String(imperial));
    renderTab(state.tab); if (state.tab === 'history') renderHistory(); renderBlueprint(); refresh(); if (window.PlanFace) window.PlanFace.unitsChanged();
  }

  /* ------------------------------------------------------------------ wiring */
  function wire() {
    $('#units-metric').addEventListener('click', () => setUnits(false)); $('#units-imperial').addEventListener('click', () => setUnits(true));
    const tabs = $$('#tabs [role=tab]');
    tabs.forEach((b, i) => { b.addEventListener('click', () => selectTab(b.dataset.tab)); b.addEventListener('keydown', e => { let j; if (e.key === 'ArrowRight') j = (i + 1) % tabs.length; if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length; if (e.key === 'Home') j = 0; if (e.key === 'End') j = tabs.length - 1; if (j !== undefined) { e.preventDefault(); selectTab(tabs[j].dataset.tab, { focus: true }); } }); });
    $$('[data-view]').forEach(b => b.addEventListener('click', () => { const keep = state.tab === 'measurements' ? M_BY_ID[state.selected].view.zone : state.tab === 'mirror' && state.part ? [state.part] : null; setView(b.dataset.view, keep); }));
    $('#turn').addEventListener('click', e => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', String(on)); if (stage) stage.setAutoRotate(on); });
    $('#reset-view').addEventListener('click', () => { state.part = null; if (stage) stage.setHighlight(null); $$('#mr-parts .pick').forEach(b => b.setAttribute('aria-pressed', 'false')); $('#mr-picked').textContent = ''; setView('front'); });
    $('#profile-sample').addEventListener('click', () => setProfile('sample')); $('#profile-empty').addEventListener('click', () => setProfile('empty'));
    $$('#ms-route button').forEach(b => b.addEventListener('click', () => {
      const m = M_BY_ID[state.selected]; const route = b.dataset.route;
      if (route === 'skip') { state.undo = hasValue(m.key) ? state.now[m.key] : null; commit(m, null); } else if (state.route === 'skip') state.undo = null;
      state.route = route; renderGuide(); renderEntry(); renderReadout();
    }));
    $('#bf-m').addEventListener('click', () => { state.bf = 'M'; renderBodyFat(); }); $('#bf-f').addEventListener('click', () => { state.bf = 'F'; renderBodyFat(); });
    $('#bf-use').addEventListener('click', () => { const v = Number($('#bf-use').dataset.v); if (v > 0) { state.now.bodyFat = v; state.prov.bodyFat = 'Calculated estimate'; state.edited = true; updateSubject(); refresh(); toast(`Body fat set to ${v.toFixed(1)}% — estimated`); } });
    $('#ov-ratio').addEventListener('input', renderOval);
    $('#mr-whole').addEventListener('click', () => { state.part = null; $$('#mr-parts .pick').forEach(b => b.setAttribute('aria-pressed', 'false')); $('#mr-picked').textContent = ''; if (stage) stage.setHighlight(null); setView(state.view); });
    $('#mr-tape').addEventListener('click', e => { state.tape = !state.tape; e.currentTarget.setAttribute('aria-pressed', String(state.tape)); refreshNow(); });
    $('#mr-face').addEventListener('click', () => focusFace('eyes'));
    $('#mr-pig-on').addEventListener('change', e => { state.look.pigOn = e.target.checked; $('#mr-pig').disabled = !e.target.checked; applyLook(); });
    $('#mr-pig').addEventListener('input', e => { state.look.pig = e.target.value; applyLook(); });
    $('#mr-tan').addEventListener('input', e => { state.look.tan = Number(e.target.value); $('#mr-tan-v').textContent = `${state.look.tan}%`; applyLook(); });
    $('#mr-tan-pat').addEventListener('change', e => { state.look.tanPat = e.target.value; applyLook(); });
    $$('#mr-light button').forEach(b => b.addEventListener('click', () => { state.look.light = b.dataset.light; $$('#mr-light button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); applyLook(); }));
    $('#mr-reset').addEventListener('click', () => { Object.assign(state.look, { pigOn: false, pig: '#996951', tan: 0, tanPat: 'tee', light: 'studio' }); $('#mr-pig-on').checked = false; $('#mr-pig').disabled = true; $('#mr-pig').value = '#996951'; $('#mr-tan').value = 0; $('#mr-tan-v').textContent = '0%'; $('#mr-tan-pat').value = 'tee'; $$('#mr-light button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.light === 'studio'))); applyLook(); });
    $$('#tg-mode button').forEach(b => b.addEventListener('click', () => { state.mode = b.dataset.mode; applyCompare(); }));
    $('#tg-add').addEventListener('click', () => {
      const key = $('#tg-metric').value; const m = M_BY_ID[key]; const v = parseNum($('#tg-value').value); const hint = $('#tg-hint');
      if (v == null || Number.isNaN(v) || v <= 0) { hint.textContent = `Enter a goal in ${unitName(typeOf(m))}, like ${trim(toDisplay(typeOf(m), (m.range[0] + m.range[1]) / 2), 0)}.`; return; }
      state.goals[key] = fromDisplay(typeOf(m), v); $('#tg-value').value = ''; renderTargets(); refresh(); $('#tg-hint').textContent = `${m.label} goal saved. A blank goal keeps your current value.`;
    });
    $('#tg-value').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#tg-add').click(); } });
    const knob = $('#split-knob'); const card = $('#stage-card');
    const moveSplit = clientX => { const r = card.getBoundingClientRect(); state.split = clamp((clientX - r.left) / r.width, 0.05, 0.95); if (stage) stage.setCompare({ split: state.split }); positionSplit(); };
    knob.addEventListener('pointerdown', e => { knob.setPointerCapture(e.pointerId); const mv = ev => moveSplit(ev.clientX); const up = () => { knob.removeEventListener('pointermove', mv); knob.removeEventListener('pointerup', up); }; knob.addEventListener('pointermove', mv); knob.addEventListener('pointerup', up); });
    knob.addEventListener('keydown', e => { const d = e.key === 'ArrowLeft' ? -0.05 : e.key === 'ArrowRight' ? 0.05 : 0; if (d) { e.preventDefault(); state.split = clamp(state.split + d, 0.05, 0.95); if (stage) stage.setCompare({ split: state.split }); positionSplit(); } });
    $('#hs-range').addEventListener('input', e => gotoCheckin(Number(e.target.value)));
    $('#hs-prev').addEventListener('click', () => gotoCheckin(state.checkIndex - 1)); $('#hs-next').addEventListener('click', () => gotoCheckin(state.checkIndex + 1)); $('#hs-play').addEventListener('click', togglePlay);
    $('#hs-ghost').addEventListener('change', e => { state.ghost = e.target.checked; applyGhost(); });
    $('#ci-save').addEventListener('click', saveCheckin);
    $$('#ci-weight, #ci-waist').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveCheckin(); } }));
  }

  /* The sticky stage fills the space left below the header, then the full window once it scrolls away. */
  function sizeStage() {
    const top = $('#workspace').getBoundingClientRect().top; const wide = matchMedia('(min-width: 1041px)').matches;
    const compact = wide && top > 120;
    const h = compact ? clamp(window.innerHeight - top - 16, 480, 760) : null;
    const card = $('#stage-card'); const next = h == null ? '' : `${Math.round(h)}px`;
    if (card.style.getPropertyValue('--stage-h') !== next) { if (next) card.style.setProperty('--stage-h', next); else card.style.removeProperty('--stage-h'); }
  }
  let sizeQueued = false;
  const queueSize = () => { if (sizeQueued) return; sizeQueued = true; requestAnimationFrame(() => { sizeQueued = false; sizeStage(); }); };

  /* ------------------------------------------------------------------- boot */
  function boot() {
    window.addEventListener('scroll', queueSize, { passive: true }); window.addEventListener('resize', queueSize); sizeStage();
    wire(); renderOval(); renderTab('blueprint'); updateSubject();
    if (window.PlanFace) window.PlanFace.init({ imperial: () => units.imperial, focusFace: g => { if (state.tab === 'mirror') focusFace(g); }, setSkinHex: hex => { state.look.skin = hex; } });
    const initial = location.hash.slice(1); if (TABS.includes(initial) && initial !== 'blueprint') { selectTab(initial); } else { selectTab('blueprint'); }
    bootStage();
    window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.includes(h) && h !== state.tab) selectTab(h); });
  }
  boot();
})();

#!/usr/bin/env node
// Renders the generated blocks of docs/real-human-3d/03-anatomy-spec.md from anatomy-spec.mjs.
//   node docs/real-human-3d/code/render-anatomy.mjs --write   rewrite the blocks
//   node docs/real-human-3d/code/render-anatomy.mjs --check   exit 1 if the document is out of date
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANATOMY, FACE_BLENDSHAPES, GROUPS, REQUEST_INDEX, RIG_GROUPS, SHIPPED_JOINTS, TEXTURE_TILES, TIER_TEXTURE_BUDGET_MIB, TIER_TILE_LEVELS, tileDensity, tileMiB } from './anatomy-spec.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TARGET = resolve(here, '../03-anatomy-spec.md');
const STATUS = { mesh: 'separate mesh', 'skin-surface': 'part of the skin', partial: 'partial', absent: 'absent' };
const f1 = (n) => n.toFixed(1);

function tiles() {
  const rows = Object.entries(TEXTURE_TILES).map(([name, t]) => `| ${name} | ${t.size}² | ${t.note} | ${f1(tileDensity(name))} | ${f1(tileMiB(name))} | ${f1(tileDensity(name, 1))} | ${f1(tileMiB(name, 1))} |`);
  return ['| Tile | Size | Holds | Texels/cm (full) | MiB (full) | Texels/cm (half) | MiB (half) |', '| --- | --- | --- | --- | --- | --- | --- |', ...rows].join('\n');
}

function tierMemory() {
  const rows = Object.entries(TIER_TILE_LEVELS).map(([tier, levels]) => {
    const mib = Object.keys(TEXTURE_TILES).reduce((sum, name) => sum + tileMiB(name, levels[name]), 0);
    const half = Object.entries(levels).filter(([, l]) => l === 1).map(([n]) => n).join(', ') || 'none';
    return `| ${tier} | ${half} | ${f1(mib)} | ${TIER_TEXTURE_BUDGET_MIB[tier]} |`;
  });
  return ['| Tier | Tiles at half size | Texture memory (MiB) | Budget (MiB) |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

function rig() {
  const total = Object.values(RIG_GROUPS).flat().length;
  const rows = Object.entries(RIG_GROUPS).map(([name, joints]) => {
    const isNew = joints.filter(j => !SHIPPED_JOINTS.includes(j)).length;
    const sample = joints.length > 8 ? `${joints.slice(0, 4).join(', ')}, … (${joints.length})` : joints.join(', ');
    return `| ${name} | ${joints.length} | ${isNew} | ${sample} |`;
  });
  return ['| Group | Joints | New | Names |', '| --- | --- | --- | --- |', ...rows, `| **Total** | **${total}** | **${total - SHIPPED_JOINTS.length}** | shipped rig: ${SHIPPED_JOINTS.length} joints |`].join('\n');
}

function blendshapes() {
  const groups = {};
  for (const name of FACE_BLENDSHAPES) (groups[name.match(/^[a-z]+/)[0]] ??= []).push(name);
  const rows = Object.entries(groups).map(([k, v]) => `| ${k} | ${v.length} | ${v.join(', ')} |`);
  return ['| Region | Count | Shapes |', '| --- | --- | --- |', ...rows, `| **Total** | **${FACE_BLENDSHAPES.length}** | |`].join('\n');
}

function anatomy() {
  const out = [];
  const summary = ['| Part | Group | Today | Tile (texels/cm) | Joints (**new** in bold) |', '| --- | --- | --- | --- | --- |'];
  for (const a of ANATOMY) {
    const bones = a.bones.map(b => b.startsWith('@') ? `**${RIG_GROUPS[b.slice(1)].length} ${b.slice(1)}**` : SHIPPED_JOINTS.includes(b) ? b : `**${b}**`).join(', ') || '—';
    summary.push(`| ${a.label} | ${GROUPS[a.group]} | ${STATUS[a.today]} | ${a.tile ? `${a.tile} (${Math.round(tileDensity(a.tile))})` : '—'} | ${bones} |`);
  }
  out.push(summary.join('\n'));
  for (const [group, title] of Object.entries(GROUPS)) {
    const parts = ANATOMY.filter(a => a.group === group); if (!parts.length) continue;
    out.push(`### ${title}`);
    for (const a of parts) {
      const drives = [...a.metrics.map(m => `\`${m}\``), ...(a.appearance ?? []).map(m => `\`${m}\` (appearance)`)].join(', ') || '—';
      const added = a.newMetrics.map(m => `\`${m}\``).join(', ') || '—';
      out.push([
        `#### ${a.label}`,
        `\`${a.id}\` · today: **${STATUS[a.today]}** · tile: ${a.tile ? `${a.tile}, ${f1(tileDensity(a.tile))} texels/cm` : 'none'}${a.edgeMm ? ` · mesh edge ${a.edgeMm} mm` : ''} · viewer region: ${a.region ?? 'to add'}`,
        '',
        `- **What a real one is like:** ${a.real}`,
        `- **How the plan builds it:** ${a.build}`,
        `- **Driven by:** ${drives}. **New inputs:** ${added}.`,
      ].join('\n'));
    }
  }
  return out.join('\n\n');
}

function requestIndex() {
  const byId = Object.fromEntries(ANATOMY.map(a => [a.id, a]));
  const rows = REQUEST_INDEX.map(([word, ids]) => `| ${word} | ${ids.map(id => `${byId[id].label} (${STATUS[byId[id].today]})`).join('; ')} |`);
  return ['| You named | Covered by (and what the shipped model has) |', '| --- | --- |', ...rows].join('\n');
}

const BLOCKS = { 'request-index': requestIndex, tiles, 'tier-memory': tierMemory, rig, blendshapes, anatomy };

function render(text) {
  let next = text;
  for (const [name, make] of Object.entries(BLOCKS)) {
    const re = new RegExp(`(<!-- begin:${name} -->)[\\s\\S]*?(<!-- end:${name} -->)`);
    if (!re.test(next)) throw new Error(`03-anatomy-spec.md has no "${name}" block`);
    next = next.replace(re, (_, a, b) => `${a}\n${make()}\n${b}`);
  }
  return next;
}

const mode = process.argv[2];
const current = readFileSync(TARGET, 'utf8');
const updated = render(current);
if (mode === '--write') { writeFileSync(TARGET, updated); console.log('03-anatomy-spec.md updated'); }
else if (mode === '--check') { if (updated !== current) { console.error('03-anatomy-spec.md is out of date: run render-anatomy.mjs --write'); process.exit(1); } console.log('03-anatomy-spec.md is up to date'); }
else { console.error('usage: render-anatomy.mjs --write | --check'); process.exit(2); }

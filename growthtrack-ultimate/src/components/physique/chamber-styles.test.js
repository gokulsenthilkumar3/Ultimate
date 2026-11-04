// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { afterAll, beforeAll, expect, it } from 'vitest';

const root = new URL('../../styles/app-styles.css', import.meta.url);
const owned = new URL('../../styles/chamber-entry.css', import.meta.url);
async function inline(source, url) {
  for (const match of [...source.matchAll(/@import\s+['"]([^'"]+)['"](?:\s+layer\(([\w-]+)\))?;/g)]) {
    const next = new URL(match[1], url);
    const content = await inline(await readFile(next, 'utf8'), next);
    source = source.replace(match[0], match[2] ? `@layer ${match[2]} { ${content} }` : content);
  }
  return source;
}
let browser, before, after;
beforeAll(async () => {
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  const source = await readFile(root, 'utf8');
  const legacyImport = "@import '../index.css' layer(legacy);";
  expect(source).toContain(legacyImport);
  const original = source.replace(legacyImport, `${legacyImport}\n@import './chamber.css' layer(legacy);`);
  before = await inline(original, root);
  after = await inline(source, root) + await inline(await readFile(owned, 'utf8'), owned);
}, 20000);
afterAll(async () => { await browser?.close(); });

const markup = `<div class="app-shell" data-ui-system="editorial" data-palette="forest"><div class="main-area"><main class="content-area"><section class="physique-lab physique-lab--cinematic"><div class="physique-lab__stage chamber-fullscreen-wrap"><div class="chamber-layout"><header class="chamber-topbar"><div class="chamber-topbar__brand"><span class="chamber-topbar__title">Mirror</span></div><div class="chamber-topbar__chips"><span class="hud-chip healthy">Recorded</span></div><div class="chamber-topbar__controls"><button class="chamber-view-btn active">Current</button><button class="chamber-pill">Front</button></div></header><div class="chamber-canvas-wrap"><canvas></canvas></div><div class="chamber-overlay"><span class="chamber-overlay-text">Loading</span></div><aside class="chamber-intelligence-rail"><div class="chamber-readout">Measurements</div></aside><section class="chamber-editor"><button class="chamber-fab">Edit</button></section><div class="chamber-stage-badge">Current</div><div class="chamber-storyline"><button>Front</button></div></div></div></section></main></div></div>`;

it.each([390, 960, 1280, 1920])('preserves renderer styles and geometry when its stylesheet loads on demand at %ipx', async width => {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const snapshot = async (css, theme) => {
    await page.setContent(`<style>${css}</style>${markup}`);
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    return page.evaluate(() => [...document.querySelectorAll('[class]')].map(element => {
      const style = getComputedStyle(element);
      return Object.fromEntries(['display', 'position', 'width', 'height', 'minHeight', 'maxHeight', 'color', 'backgroundColor', 'borderRadius', 'padding', 'margin', 'gap', 'inset', 'fontSize', 'fontWeight', 'lineHeight', 'overflow', 'zIndex', 'boxShadow'].map(key => [key, style[key]]));
    }));
  };
  try {
    for (const theme of ['light', 'dark', 'amoled']) expect(await snapshot(after, theme)).toEqual(await snapshot(before, theme));
  } finally { await page.close(); }
}, 20000);

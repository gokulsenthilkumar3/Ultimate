// @vitest-environment node
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import PageTemplate from './PageTemplate';
import DataTable from './DataTable';
import FilterBar from './FilterBar';
import FileUploader from './FileUploader';
import Tabs from './Tabs';

let browser, css;
beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
  const entryUrl = new URL('../../styles/app-styles.css', import.meta.url);
  const entry = await readFile(entryUrl, 'utf8');
  const imports = [...entry.matchAll(/@import\s+(['"])([^'"]+)\1(?:\s+layer\(([\w-]+)\))?;/g)];
  const sheets = await Promise.all(imports.map(async match => {
    const source = await readFile(new URL(match[2], entryUrl), 'utf8');
    return match[3] ? `@layer ${match[3]} { ${source} }` : source;
  }));
  let index = 0;
  css = entry.replace(/@import\s+(['"])([^'"]+)\1(?:\s+layer\(([\w-]+)\))?;/g, () => sheets[index++]);
}, 20000);
afterAll(async () => { await browser?.close(); });

const content = renderToStaticMarkup(<PageTemplate type="record" title="Transaction records with a long title" actions={<button>New transaction</button>} aside={<p>Related information about records</p>}>
  <FilterBar query="" onQueryChange={() => {}}><label>Account <select><option>Primary</option></select></label></FilterBar>
  <Tabs label="View" value="all" onChange={() => {}} tabs={[{ value: 'all', label: 'All records' }, { value: 'archived', label: 'Archived records' }]} />
  <DataTable caption="Transactions" rows={[{ id: 'a', value: 'a'.repeat(180) }]} rowKey={row => row.id} columns={[{ id: 'value', header: 'Reference', accessor: row => row.value, sortable: true }]} />
  <FileUploader onFilesSelected={() => {}} />
</PageTemplate>);
// Navigation fixtures exercise CSS cascade/geometry. Router/store interaction tests
// cover the actual navigation components separately, without requiring the app/backend.
function shell(dir = 'ltr', collapsed = false, width = 1280) {
  const navigation = width < 640
    ? `<div class="gt-mobile-navigation" data-responsive-foundation><nav class="gt-mobile-dock">${['Finance', 'Insights', 'Wellness', 'Workspace'].map(label => `<a href="#"><span>${label}</span></a>`).join('')}<button>More</button></nav></div>`
    : `<aside class="gt-app-navigation" data-mode="${width < 1024 ? 'compact' : 'desktop'}" data-responsive-foundation data-collapsed="${collapsed}"><div class="gt-navigation-rail"><a href="#">Finance</a><button>Modules</button></div></aside>`;
  return `<style>html,body{margin:0;font-family:Arial,sans-serif}button{font:inherit}</style><style>${css}</style>
  <div class="app-shell" dir="${dir}" data-ui-system="v3"><div class="main-area"><header class="app-header">Header</header><nav class="command-subnav">Legacy strip</nav><main class="content-area">${content}</main></div>
  ${navigation}</div>`;
}

describe('browser responsive geometry and accessibility styles', () => {
  it.each([320, 639, 640, 1023, 1024, 1280])('keeps one navigation surface, 44px targets, and content within the viewport at %ipx', async width => {
    const page = await browser.newPage({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
    try {
      await page.setContent(shell('ltr', false, width));
      const result = await page.evaluate(() => {
        const style = selector => getComputedStyle(document.querySelector(selector));
        const rail = Boolean(document.querySelector('.gt-app-navigation') && style('.gt-app-navigation').display !== 'none');
        const dock = Boolean(document.querySelector('.gt-mobile-navigation') && style('.gt-mobile-navigation').display !== 'none');
        const targets = [...document.querySelectorAll('[data-responsive-foundation] button, .gt-mobile-dock a, .gt-navigation-rail a')].filter(node => node.getClientRects().length).map(node => node.getBoundingClientRect());
        const main = document.querySelector('.main-area').getBoundingClientRect();
        return { rail, dock, minHeight: Math.min(...targets.map(rect => rect.height)), minWidth: Math.min(...targets.map(rect => rect.width)), overflow: document.documentElement.scrollWidth - window.innerWidth, offset: parseFloat(style('.main-area').paddingInlineStart), strip: style('.command-subnav').display, mainLeft: main.left, mainRight: main.right, headerClearance: parseFloat(style('.main-area').paddingTop) };
      });
      expect(result.rail).toBe(width >= 640); expect(result.dock).toBe(width <= 639);
      expect(result.minHeight).toBeGreaterThanOrEqual(44); expect(result.minWidth).toBeGreaterThanOrEqual(44);
      expect(result.overflow).toBeLessThanOrEqual(1);
      expect(result.offset).toBe(width <= 639 ? 0 : width < 1024 ? 76 : 332);
      expect(result.strip).toBe('none');
      expect(result.mainLeft).toBe(0); expect(result.mainRight).toBe(width);
      expect(result.headerClearance).toBeGreaterThanOrEqual(44);
    } finally { await page.close(); }
  });
  it('puts RTL rail/header offsets on the right, supports collapsed desktop, and reverses search chrome', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      await page.setContent(shell('rtl', true));
      const result = await page.evaluate(() => {
        const rail = document.querySelector('.gt-navigation-rail').getBoundingClientRect();
        const input = document.querySelector('.gt-search-field input').getBoundingClientRect();
        const icon = document.querySelector('.gt-search-field svg').getBoundingClientRect();
        const main = getComputedStyle(document.querySelector('.main-area'));
        return { railRight: rail.right, railLeft: rail.left, paddingLeft: main.paddingLeft, paddingRight: main.paddingRight, iconRight: icon.right, inputRight: input.right };
      });
      expect(result.railRight).toBe(1280); expect(result.railLeft).toBe(1204);
      expect(result.paddingLeft).toBe('0px'); expect(result.paddingRight).toBe('76px');
      expect(result.iconRight).toBeGreaterThan(result.inputRight - 40);
    } finally { await page.close(); }
  });
  it('uses solid surfaces and preserves forced-colors focus with reduced motion', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 800 }, forcedColors: 'active', reducedMotion: 'reduce' });
    try {
      await page.setContent(shell('ltr', false, 390));
      await page.locator('.gt-mobile-dock button').focus();
      const result = await page.locator('.gt-mobile-dock button').evaluate(node => {
        const style = getComputedStyle(node), surface = getComputedStyle(node.parentElement);
        return { outline: style.outlineStyle, outlineWidth: style.outlineWidth, transition: style.transitionDuration, background: surface.backgroundColor };
      });
      expect(result.outline).toBe('solid'); expect(parseFloat(result.outlineWidth)).toBeGreaterThanOrEqual(2);
      expect(parseFloat(result.transition)).toBeLessThanOrEqual(.001); expect(result.background).not.toBe('rgba(0, 0, 0, 0)');
    } finally { await page.close(); }
  });
  it('reflows at 200% page zoom and retains safe-area fallback spacing', async () => {
    // 200% zoom of a 1280px screen gives a 640 CSS-pixel layout viewport.
    const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
    try {
      await page.setContent(shell('ltr', false, 640));
      expect(await page.locator('.gt-app-navigation').isVisible()).toBe(true);
      expect(await page.locator('.gt-mobile-navigation').isVisible()).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.setViewportSize({ width: 320, height: 400 });
      await page.setContent(shell('ltr', false, 320));
      const dock = await page.locator('.gt-mobile-dock').boundingBox();
      expect(dock.x).toBeGreaterThanOrEqual(8); expect(dock.x + dock.width).toBeLessThanOrEqual(312);
    } finally { await page.close(); }
  });
});

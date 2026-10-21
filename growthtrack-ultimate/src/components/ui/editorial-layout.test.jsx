// @vitest-environment node
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Button from './Button';
import DataTable from './DataTable';
import FilterBar from './FilterBar';
import PageTemplate from './PageTemplate';
import Tabs from './Tabs';

let browser;
let styles;

beforeAll(async () => {
  const base = new URL('../../styles/', import.meta.url);
  const [tokens, primitives, responsive, editorial] = await Promise.all([
    'design-tokens.css', 'design-system.css', 'responsive-foundation.css', 'editorial-components.css',
  ].map(name => readFile(new URL(name, base), 'utf8')));
  styles = `@layer tokens, components, gt-responsive-foundation;
    @layer tokens { ${tokens} }
    @layer components { ${primitives} }
    ${responsive}
    ${editorial}`;
  browser = await chromium.launch({ headless: true });
}, 20000);
afterAll(async () => { await browser?.close(); });

const markup = renderToStaticMarkup(<PageTemplate type="record" title="A longer editorial record title" accent="Workspace" subtitle="Details, actions, and a supporting table." actions={<Button>New record</Button>}>
  <FilterBar query="" onQueryChange={() => {}} resultCount={1} />
  <Tabs label="Views" value="all" onChange={() => {}} tabs={[{ value: 'all', label: 'All records' }, { value: 'recent', label: 'Recent records' }]} />
  <DataTable caption="Records" rows={[{ id: 'one', value: 'Reference '.repeat(20) }]} rowKey={row => row.id} columns={[{ id: 'value', header: 'Reference', accessor: row => row.value, sortable: true }]} />
</PageTemplate>);

describe('editorial component layout', () => {
  it.each([320, 1280])('keeps its page, controls, and table within a %ipx viewport', async width => {
    const page = await browser.newPage({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
    try {
      await page.setContent(`<style>html,body{margin:0}.fixture{box-sizing:border-box;inline-size:100%;padding:16px}</style><style>${styles}</style><div class="fixture" data-theme="light">${markup}</div>`);
      const metrics = await page.evaluate(() => {
        const heading = document.querySelector('.gt-editorial-header__title');
        const buttons = [...document.querySelectorAll('[data-responsive-foundation] button')].filter(node => node.getClientRects().length);
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          minButtonHeight: Math.min(...buttons.map(button => button.getBoundingClientRect().height)),
          headingSize: parseFloat(getComputedStyle(heading).fontSize),
          headerBackground: getComputedStyle(document.querySelector('.gt-editorial-header')).backgroundImage,
        };
      });
      expect(metrics.overflow).toBeLessThanOrEqual(1);
      expect(metrics.minButtonHeight).toBeGreaterThanOrEqual(44);
      expect(metrics.headingSize).toBeGreaterThanOrEqual(32);
      expect(metrics.headerBackground).toContain('gradient');
      await page.locator('[role="tab"]').first().focus();
      expect(parseFloat(await page.locator('[role="tab"]').first().evaluate(node => getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(3);
    } finally { await page.close(); }
  });
});

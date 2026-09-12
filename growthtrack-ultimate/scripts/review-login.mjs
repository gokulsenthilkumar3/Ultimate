import { chromium } from '@playwright/test';
import fs from 'node:fs';
const phase = process.argv[2] || 'after';
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [390, 1440]) {
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await page.route('**/api/**', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Not signed in"}' }));
      await page.goto('http://127.0.0.1:5178/Ultimate/login');
      await page.getByRole('textbox', { name: 'Email' }).waitFor();
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
      const audit = await page.evaluate(async () => {
        const report = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
        return { violations: report.violations, incomplete: report.incomplete, passes: report.passes.length };
      });
      const layout = await page.evaluate(() => {
        const button = document.querySelector('button[type="submit"]').getBoundingClientRect();
        const banner = document.querySelector('.consent-banner')?.getBoundingClientRect();
        return { horizontalOverflow: document.documentElement.scrollWidth > innerWidth, submitBottom: button.bottom, bannerTop: banner?.top, bannerBottom: banner?.bottom, viewportHeight: innerHeight };
      });
      if (phase === 'after' && (layout.horizontalOverflow || (layout.bannerTop && layout.submitBottom > layout.bannerTop))) throw new Error(`Login layout overlap at ${width}/${theme}: ${JSON.stringify(layout)}`);
      await page.screenshot({ path: `docs/ui-review/login-${phase}-${theme}-${width}.png`, fullPage: true, animations: 'disabled' });
      results.push({ width, theme, layout, ...audit });
      await page.close();
    }
  }
} finally { await browser.close(); }
fs.writeFileSync(`docs/ui-review/axe-login-${phase}.json`, JSON.stringify(results, null, 2));
console.log(results.map(({width,theme,violations,passes}) => ({width,theme,violations: violations.map(v => v.id), passes})));

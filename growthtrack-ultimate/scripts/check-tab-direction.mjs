/** Reproduce a profile direction change on the real rendered rails without changing fixture records. */
export async function checkTabDirection(page) {
  const rail = page.locator('.gt-overflow-rail[data-overflow="true"]').first();
  if (!await rail.count()) throw new Error('Choose a viewport with an overflowing navigation row.');
  const row = rail.locator('[data-overflow-items]').first();
  const original = await page.evaluate(() => ({ html: document.documentElement.getAttribute('dir'), shell: document.querySelector('.app-shell')?.getAttribute('dir') }));
  try {
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.querySelector('.app-shell').dir = 'rtl'; });
    await page.waitForFunction(frame => frame.querySelector('.gt-overflow-rail__control:last-child')?.getAttribute('aria-label')?.endsWith(' left'), await rail.elementHandle());
    await row.evaluate(element => element.scrollTo({ left: 0, behavior: 'instant' }));
    const forward = rail.locator('.gt-overflow-rail__control').last();
    await forward.click();
    await page.waitForFunction(element => element.scrollLeft < -2, await row.elementHandle());
    for (const tablist of await page.locator('.gt-tabs[role="tablist"][data-has-indicator="true"]').all()) {
      await page.waitForFunction(element => {
        const selected = element.querySelector('[aria-selected="true"]'), indicator = element.querySelector('.gt-tabs__indicator');
        return selected && indicator && Math.abs(selected.getBoundingClientRect().left - indicator.getBoundingClientRect().left) < 3;
      }, await tablist.elementHandle());
    }
  } finally {
    await page.evaluate(({ html, shell }) => {
      if (html == null) document.documentElement.removeAttribute('dir'); else document.documentElement.setAttribute('dir', html);
      const app = document.querySelector('.app-shell'); if (shell == null) app.removeAttribute('dir'); else app.setAttribute('dir', shell);
    }, original);
  }
}

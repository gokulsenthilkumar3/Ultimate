/** Exercise browser scrolling against loopback-only fictional fixtures. */
export async function checkTabOverflow(page) {
  const rails = page.locator('.gt-overflow-rail[data-horizontal="true"]'), results = [];
  for (let index = 0; index < await rails.count(); index++) {
    const rail = rails.nth(index), row = rail.locator('[data-overflow-items]').first();
    const label = await row.getAttribute('aria-label') || 'navigation row';
    let stage = 'measure';
    try {
    const dimensions = await row.evaluate(element => ({ maximum: element.scrollWidth - element.clientWidth, initial: element.scrollLeft }));
    if (dimensions.maximum <= 2) { results.push({ label, overflowing: false }); continue; }
    await rail.scrollIntoViewIfNeeded();
    await row.evaluate(element => { element.scrollLeft = 0; });
    await page.waitForTimeout(60);
    const forward = rail.locator('.gt-overflow-rail__control').last();
    stage = 'next button';
    if (!await forward.isVisible() || !await forward.isEnabled()) throw new Error(`Missing overflow control: ${label}`);
    await forward.click();
    await page.waitForFunction(element => Math.abs(element.scrollLeft) > 10, await row.elementHandle(), { timeout: 2000 });
    await page.waitForTimeout(400);
    await row.evaluate(element => { element.scrollTo({ left: 0, behavior: 'instant' }); });
    await row.hover();
    stage = 'mouse wheel';
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 160);
    await page.waitForFunction(element => Math.abs(element.scrollLeft) > 2, await row.elementHandle(), { timeout: 2000 });
    if (Math.abs(await page.evaluate(() => window.scrollY) - before) > 2) throw new Error(`Mouse wheel moved the page instead of ${label}`);
    await row.evaluate(element => { element.scrollTo({ left: getComputedStyle(element).direction === 'rtl' ? -(element.scrollWidth - element.clientWidth) : element.scrollWidth - element.clientWidth, behavior: 'instant' }); });
    const atEnd = await page.evaluate(() => ({ y: window.scrollY, remaining: document.documentElement.scrollHeight - innerHeight - scrollY }));
    if (atEnd.remaining > 80) {
      stage = 'release page scrolling at row end';
      await page.mouse.wheel(0, 100);
      await page.waitForFunction(y => window.scrollY > y + 2, atEnd.y, { timeout: 2000 });
    }
    await row.evaluate((element, initial) => element.scrollTo({ left: initial, behavior: 'instant' }), dimensions.initial);
    results.push({ label, overflowing: true, buttons: 'passed', wheel: 'passed', boundary: 'passed' });
    } catch (failure) {
      const details = await rail.evaluate(frame => {
        const row = frame.querySelector('[data-overflow-items]'), rect = row?.getBoundingClientRect(), style = row && getComputedStyle(row);
        return { row: { width: row?.clientWidth, height: row?.clientHeight, scrollWidth: row?.scrollWidth, left: row?.scrollLeft, top: rect?.top, display: style?.display, direction: style?.flexDirection, wrap: style?.flexWrap, overflow: style?.overflow }, pageY: scrollY, pageHeight: document.documentElement.scrollHeight, bodyOverflow: getComputedStyle(document.body).overflow, controls: [...frame.querySelectorAll('.gt-overflow-rail__control')].map(button => ({ hidden: button.hidden, disabled: button.disabled, x: button.getBoundingClientRect().x, y: button.getBoundingClientRect().y, width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })) };
      });
      const error = new Error(`${label} / ${stage}: ${failure.message}`); error.details = details; throw error;
    }
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  return results;
}

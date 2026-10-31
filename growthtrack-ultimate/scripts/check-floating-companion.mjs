const PREFERENCE_KEY = 'growthtrack.presentation.v5';
const ROUTES = { finance: '/Ultimate/finance/overview', hub: '/Ultimate/hub/overview', actions: '/Ultimate/insights/actions', agents: '/Ultimate/hub/agents' };

/** Exercise the actual UI only inside page-performance's loopback fictional fixture. */
export async function checkFloatingCompanion(page, { origin } = {}) {
  const current = new URL(page.url());
  if (!origin || current.origin !== origin || !['127.0.0.1', 'localhost', '[::1]'].includes(current.hostname) || !current.pathname.startsWith('/Ultimate/')) throw new Error('Companion checks require the isolated loopback fixture.');
  const original = await page.evaluate(key => ({ url: location.href, preference: localStorage.getItem(key), fixture: window.__floatingCompanionFixture }), PREFERENCE_KEY);
  if (original.fixture?.origin !== origin || original.fixture?.owner !== 'isolated-test-owner') throw new Error('Missing explicit fictional companion-check fixture marker.');
  if (await page.getByRole('dialog').count()) throw new Error('Close fixture dialogs before checking the companion.');
  const viewport = page.viewportSize();
  const completed = [], forbidden = [];
  let stage = 'setup', auditEventsStubbed = 0;
  const guard = async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    if (url.origin !== origin) { forbidden.push({ path: url.pathname, method, reason: 'external request' }); return route.abort(); }
    if (/^\/(?:api\/(?:agents?|ai|chat|models?)(?:\/|$)|v1\/(?:chat|completions|models)(?:\/|$))/.test(url.pathname)) {
      forbidden.push({ path: url.pathname, method, reason: 'model request' }); return route.abort();
    }
    // Navigation audit events are acknowledged locally; no record writes leave this page.
    if (url.pathname === '/api/logs' && method === 'POST') { auditEventsStubbed++; return route.fulfill({ status: 200, json: { success: true } }); }
    if (url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      forbidden.push({ path: url.pathname, method, reason: 'record mutation' }); return route.abort();
    }
    return route.fallback();
  };
  const ready = async id => {
    await page.waitForFunction(id => document.querySelector('.app-shell')?.getAttribute('data-active-tab') === id && document.querySelector('#main-content h1, #main-content h2') && !document.querySelector('#main-content .app-loading-skeleton'), id);
  };
  const visit = async (route, id) => { await page.goto(origin + route, { waitUntil: 'load' }); await ready(id); };
  const launcher = () => page.getByRole('button', { name: 'Open companion', exact: true });
  const panel = () => page.getByRole('dialog', { name: 'Your companion', exact: true });
  const toggle = () => page.locator('.app-header [data-companion-toggle]');
  const check = async (name, action) => { stage = name; const detail = await action(); completed.push({ name, passed: true, ...(detail || {}) }); };
  const compactAtlas = async art => {
    const image = art.locator('.personal-companion__sprite');
    await page.waitForFunction(element => element.complete && element.naturalWidth === 512 && element.naturalHeight === 512, await image.elementHandle());
    const atlas = await image.evaluate(element => {
      const frame = element.closest('.personal-companion__frame');
      return { src: new URL(element.currentSrc || element.src).pathname, naturalWidth: element.naturalWidth, naturalHeight: element.naturalHeight, frameWidth: frame.clientWidth, frameHeight: frame.clientHeight };
    });
    if (!atlas.src.endsWith('/personal-companion-small-v1.webp') || atlas.frameWidth <= 0 || Math.abs(atlas.frameWidth - atlas.frameHeight) > 1) throw new Error('Compact personal companion is not a loaded, square 512px atlas.');
    return atlas;
  };
  await page.route('**/*', guard);
  try {
    if (current.pathname === ROUTES.finance) await ready('finance'); else await visit(ROUTES.finance, 'finance');
    if (await toggle().getAttribute('aria-pressed') === 'false') await toggle().click();
    await check('launcher is available', async () => { await launcher().waitFor({ state: 'visible' }); });
    await check('dialog owner links and Escape focus', async () => {
      await launcher().click(); await panel().waitFor({ state: 'visible' });
      if (!await panel().evaluate(element => element.contains(document.activeElement))) throw new Error('Opening the panel did not move focus into its dialog.');
      const agents = panel().getByRole('link', { name: /Open Agents/ }), actions = panel().getByRole('link', { name: /Action Center/ });
      const paths = {};
      for (const [name, link] of [['agents', agents], ['actions', actions]]) {
        const href = await link.getAttribute('href');
        if (!href) throw new Error(`${name} owner link has no href.`);
        paths[name] = new URL(href, page.url()).pathname;
        if (paths[name] !== ROUTES[name]) throw new Error(`${name} link points to ${paths[name]}.`);
      }
      await page.keyboard.press('Escape'); await panel().waitFor({ state: 'hidden' });
      if (!await launcher().evaluate(element => element === document.activeElement)) throw new Error('Escape did not restore the launcher focus.');
      return { ownerPaths: paths };
    });
    await check('four decorative poses use one compact atlas and retain the chosen pose', async () => {
      const preference = await page.evaluate(key => localStorage.getItem(key), PREFERENCE_KEY);
      await launcher().click(); await panel().waitFor({ state: 'visible' });
      const controls = panel().getByRole('group', { name: 'Companion pose', exact: true });
      if (!(await controls.textContent()).includes('Decoration only')) throw new Error('Pose controls do not explain their decorative role.');
      const states = [], sources = new Set();
      for (const [index, [label, pose]] of [['Rest', 'idle'], ['Wave', 'greet'], ['Focus', 'listen'], ['Cheer', 'celebrate']].entries()) {
        const button = controls.getByRole('button', { name: label + ' pose', exact: true });
        await button.focus(); await page.keyboard.press(index % 2 ? 'Space' : 'Enter');
        await page.waitForFunction(({ label, pose }) => {
          const button = document.querySelector(`.companion-panel__poses [aria-label="${label} pose"]`);
          return button?.getAttribute('aria-pressed') === 'true' && document.activeElement === button && [...document.querySelectorAll('.floating-companion .personal-companion')].every(art => art.getAttribute('data-pose') === pose);
        }, { label, pose });
        if (await controls.locator('[aria-pressed="true"]').count() !== 1) throw new Error('More than one decorative pose is selected.');
        const launcherAtlas = await compactAtlas(launcher().locator('.personal-companion'));
        const previewAtlas = await compactAtlas(panel().locator('.personal-companion'));
        sources.add(launcherAtlas.src); sources.add(previewAtlas.src);
        states.push({ label, pose, keyboard: index % 2 ? 'Space' : 'Enter', atlas: previewAtlas });
      }
      const focus = controls.getByRole('button', { name: 'Focus pose', exact: true });
      await focus.focus(); await page.keyboard.press('Enter');
      await page.keyboard.press('Escape'); await panel().waitFor({ state: 'hidden' });
      if (!await launcher().evaluate(element => element === document.activeElement)) throw new Error('Pose selection broke Escape focus restoration.');
      if (await launcher().locator('.personal-companion').getAttribute('data-pose') !== 'listen') throw new Error('The selected Focus pose changed after Escape.');
      if (sources.size !== 1) throw new Error('Decorative poses loaded different atlas sources.');
      if (await page.evaluate(key => localStorage.getItem(key), PREFERENCE_KEY) !== preference) throw new Error('Decorative pose selection wrote presentation preferences.');
      if (forbidden.length) throw new Error('Decorative pose selection attempted a model request or record mutation.');
      return { poses: states, atlasSources: [...sources], retainedAfterEscape: 'listen', preferencesUnchanged: true };
    });
    await check('Action Center navigation focuses main', async () => {
      await launcher().click(); await panel().getByRole('link', { name: /Action Center/ }).click();
      await ready('actions'); await panel().waitFor({ state: 'hidden' });
      // Wait through the route effects and dialog cleanup, catching late trigger restoration.
      await page.waitForTimeout(150);
      const focus = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
      if (new URL(page.url()).pathname !== ROUTES.actions || focus !== 'main-content') throw new Error(`Action Center navigation ended with focus on ${focus}.`);
      return { focus };
    });
    await check('header hide and show persist across reload', async () => {
      await toggle().click();
      await page.waitForFunction(() => !document.querySelector('.floating-companion'));
      if (await toggle().getAttribute('aria-label') !== 'Show floating companion') throw new Error('Hidden state has no Show companion header label.');
      if (!await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}').companion === false, PREFERENCE_KEY)) throw new Error('Hidden preference was not saved.');
      await page.reload({ waitUntil: 'load' }); await ready('actions');
      if (await toggle().getAttribute('aria-pressed') !== 'false' || await launcher().count()) throw new Error('Hidden companion returned after reload.');
      await toggle().click(); await launcher().waitFor({ state: 'visible' });
      if (!await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}').companion === true, PREFERENCE_KEY)) throw new Error('Visible preference was not saved.');
      await page.reload({ waitUntil: 'load' }); await ready('actions'); await launcher().waitFor({ state: 'visible' });
      if (await toggle().getAttribute('aria-pressed') !== 'true') throw new Error('Visible companion preference was lost after reload.');
      return { hiddenAfterReload: true, visibleAfterReload: true };
    });
    await check('Settings modal obscures the launcher', async () => {
      await page.getByRole('button', { name: 'Open account and settings', exact: true }).click();
      await page.getByRole('dialog', { name: 'Settings', exact: true }).waitFor({ state: 'visible' });
      await page.locator('.floating-companion').waitFor({ state: 'hidden' });
      if (await launcher().count()) throw new Error('Companion remains exposed to assistive technology behind Settings.');
      await page.keyboard.press('Escape');
      await page.getByRole('dialog', { name: 'Settings', exact: true }).waitFor({ state: 'hidden' });
      await launcher().waitFor({ state: 'visible' });
    });
    await check('Finance and Hub area labels', async () => {
      const labels = {};
      for (const [id, label] of [['finance', 'Finance'], ['hub', 'Hub']]) {
        await visit(ROUTES[id], id);
        const text = (await page.locator('.app-header__context').textContent() || '').trim();
        if (!text.endsWith(label)) throw new Error(`${id} header context is ${text}.`);
        labels[id] = label;
      }
      return { labels };
    });
    await check('mobile launcher clears the bottom dock', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      const dock = page.getByRole('navigation', { name: 'Quick navigation', exact: true });
      await dock.waitFor({ state: 'visible' }); await launcher().waitFor({ state: 'visible' });
      if (!await dock.getByRole('link', { name: 'Finance', exact: true }).isVisible() || !await dock.getByRole('button', { name: 'Hub', exact: true }).isVisible()) throw new Error('Mobile Finance or Hub label is unavailable.');
      const bounds = await page.evaluate(() => {
        const rect = element => { const { left, right, top, bottom } = element.getBoundingClientRect(); return { left, right, top, bottom }; };
        return { companion: rect(document.querySelector('.floating-companion')), dock: rect(document.querySelector('.gt-mobile-dock')) };
      });
      const { companion, dock: dockRect } = bounds;
      if (companion.left < dockRect.right && companion.right > dockRect.left && companion.top < dockRect.bottom && companion.bottom > dockRect.top) throw new Error('Floating companion intersects the mobile bottom dock.');
      return { viewport: { width: 390, height: 844 }, bounds };
    });
    if (forbidden.length) throw new Error('Companion checks attempted a model request, external request or record mutation.');
    return { status: 'passed', checks: completed, network: { modelRequests: 0, recordMutations: 0, externalRequests: 0, auditEventsStubbed } };
  } catch (failure) {
    const error = new Error(`${stage}: ${failure.message}`);
    error.details = { stage, completed, forbidden };
    throw error;
  } finally {
    // These are device-local fixture preferences. Always put them back, including on failure.
    try {
      for (let index = 0; index < 3 && await page.getByRole('dialog').count(); index++) await page.keyboard.press('Escape');
      await page.evaluate(({ key, preference }) => {
        if (preference === null) localStorage.removeItem(key); else localStorage.setItem(key, preference);
        window.dispatchEvent(new StorageEvent('storage', { key }));
      }, { key: PREFERENCE_KEY, preference: original.preference });
      if (viewport) await page.setViewportSize(viewport);
      if (page.url() !== original.url) { await page.goto(original.url, { waitUntil: 'load' }); await page.waitForSelector('.app-shell'); }
    } finally { await page.unroute('**/*', guard); }
  }
}

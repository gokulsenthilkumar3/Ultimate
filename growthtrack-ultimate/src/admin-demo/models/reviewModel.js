import { PAGE_BY_ID, PAGE_VIEWS, REVIEW_DENSITIES, REVIEW_STATES, reviewKey } from '../catalog.js';

export const REVIEW_VERSION = 'growthtrack-admin-design-2026-10-28-v5';
export function compactReviews(reviews) {
  return { format: 'growthtrack-ui-review-store', version: REVIEW_VERSION, entries: Object.entries(reviews).map(([key, entry]) => [key, entry.status, entry.note, entry.reviewedAt]) };
}
export function restoreReviews(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  if (value.format === 'growthtrack-ui-review-store') {
    if (value.version !== REVIEW_VERSION || !Array.isArray(value.entries)) return {};
    value = Object.fromEntries(value.entries.flatMap(tuple => {
      if (!Array.isArray(tuple) || tuple.length !== 4 || typeof tuple[0] !== 'string' || tuple[0].length > 500) return [];
      const [key, status, note, reviewedAt] = tuple;
      const parts = key.split(':');
      if (parts.length !== 6) return [];
      const [pageId, variant, theme, state, density, viewportKey] = parts;
      if (!Object.hasOwn(PAGE_BY_ID, pageId) || !/^\d+x\d+$/.test(viewportKey)) return [];
      const [width, height] = viewportKey.split('x').map(Number), page = PAGE_BY_ID[pageId];
      return [[key, { version: REVIEW_VERSION, page: pageId, path: page.path, view: variant === 'default' ? '' : variant, theme, state, density, viewport: { width, height }, status, note, reviewedAt }]];
    }));
  }
  return Object.fromEntries(Object.entries(value).filter(([key, entry]) => {
    if (!entry || typeof entry !== 'object' || entry.version !== REVIEW_VERSION || !Object.hasOwn(PAGE_BY_ID, entry.page)) return false;
    const page = PAGE_BY_ID[entry.page];
    if (entry.path !== page.path || !(page.views.length ? page.views.includes(entry.view) : entry.view === '')) return false;
    if (!['light', 'dark'].includes(entry.theme) || !REVIEW_STATES.includes(entry.state) || !['approved', 'changes-requested'].includes(entry.status)) return false;
    if (!REVIEW_DENSITIES.includes(entry.density)) return false;
    if (typeof entry.note !== 'string' || entry.note.length > 4000 || typeof entry.reviewedAt !== 'string' || !Number.isFinite(Date.parse(entry.reviewedAt))) return false;
    if (!entry.viewport || ![entry.viewport.width, entry.viewport.height].every(size => Number.isInteger(size) && size > 0 && size <= 100000)) return false;
    return key === reviewKey(page, entry.view, entry.theme, entry.state, `${entry.viewport.width}x${entry.viewport.height}`, entry.density);
  }));
}

export function reviewCoverage(reviews, { theme, state, density, viewport }) {
  const pages = new Map();
  const targets = PAGE_VIEWS.map(({ page, view }) => {
    const key = reviewKey(page, view, theme, state, `${viewport.width}x${viewport.height}`, density);
    const status = reviews[key]?.status || 'unreviewed';
    if (!pages.has(page.id)) pages.set(page.id, { page, targets: [], approved: 0, changes: 0 });
    const group = pages.get(page.id);
    const target = { page, view, key, status };
    group.targets.push(target);
    if (status === 'approved') group.approved++;
    if (status === 'changes-requested') group.changes++;
    return target;
  });
  const approved = targets.filter(target => target.status === 'approved').length;
  const changes = targets.filter(target => target.status === 'changes-requested').length;
  return { pages: [...pages.values()], targets, approved, changes, pending: targets.length - approved, completedPages: [...pages.values()].filter(page => page.approved === page.targets.length).length };
}

export function nextPendingReview(coverage, pageId, view) {
  const current = coverage.targets.findIndex(target => target.page.id === pageId && target.view === view);
  for (let step = 1; step <= coverage.targets.length; step++) {
    const target = coverage.targets[(current + step) % coverage.targets.length];
    if (target.status !== 'approved') return target;
  }
  return null;
}

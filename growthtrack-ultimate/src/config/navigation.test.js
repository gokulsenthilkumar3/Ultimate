import { describe, expect, it } from 'vitest';
import { canonicalModule, GROUPS, MODULE_DEFINITIONS, ROUTE_ALIASES, TABS } from './navigation';

describe('canonical module registry', () => {
  it('gives every navigable module a complete public contract', () => {
    for (const module of MODULE_DEFINITIONS) {
      expect(module.id).toBeTruthy();
      expect(module.canonicalPath).toBe(`/${module.id}`);
      expect(module.label).toBeTruthy();
      expect(module.description).toBeTruthy();
      expect(module.icon).toBeTypeOf('object');
      expect(module.keywords).toBeInstanceOf(Array);
      expect(['ready', 'setup-required', 'planned']).toContain(module.availability);
      expect(module.area).toBe(module.group);
      expect(['primary', 'secondary', 'hidden-alias']).toContain(module.navigation);
      expect(['command', 'record', 'analytics', 'detail', 'settings', 'immersive']).toContain(module.pageTemplate);
    }
  });

  it('keeps group tabs and aliases resolvable', () => {
    Object.values(GROUPS).flatMap(group => group.tabs).forEach(id => expect(TABS[id]).toBeTruthy());
    Object.entries(ROUTE_ALIASES).forEach(([alias, target]) => {
      expect(canonicalModule(alias).id).toBe(target);
      expect(canonicalModule(alias).canonicalPath).toBe(`/${target}`);
    });
  });
});

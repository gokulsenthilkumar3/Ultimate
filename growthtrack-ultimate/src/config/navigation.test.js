import { describe, expect, it } from 'vitest';
import { canonicalModule, GROUP_ORDER, GROUPS, MODULE_DEFINITIONS, navigationGroups, normalizeGroupOrder, ROUTE_ALIASES, TABS } from './navigation';
import { FEATURE_GROUPS } from './featureRegistry';

describe('canonical module registry', () => {
  it('shares the icon-free shell grouping contract with every navigation entry', () => {
    for (const [id, tab] of Object.entries(TABS)) expect(tab.group).toBe(FEATURE_GROUPS[id]);
    expect(FEATURE_GROUPS.forex).toBe('money');
    for (const id of ['customers', 'finsync', 'oxfin']) expect(FEATURE_GROUPS[id]).toBe('customers');
  });
  it('keeps Finance and Hub names when older configuration supplies the previous labels', () => {
    const groups = navigationGroups([{ id: 'money', label: 'Money', tabs: ['transactions'] }, { id: 'system', label: 'More' }]);
    expect(groups.money.label).toBe('Finance');
    expect(groups.system.label).toBe('Hub');
    expect(groups.money.tabs[0]).toBe('transactions');
    expect(groups.money.tabs).toContain('finance');
  });
  it('gives every navigable module a complete public contract', () => {
    for (const module of MODULE_DEFINITIONS) {
      expect(module.id).toBeTruthy();
      expect(module.canonicalPath).toBe(module.id === 'customers' ? '/customers' : `/${module.area}/${module.module}`);
      expect(module.label).toBeTruthy();
      expect(module.description).toBeTruthy();
      expect(module.icon).toBeTypeOf('object');
      expect(module.keywords).toBeInstanceOf(Array);
      expect(['ready', 'setup-required', 'planned']).toContain(module.availability);
      expect(['finance', 'insights', 'wellness', 'workspace', 'life', 'hub']).toContain(module.area);
      expect(['primary', 'secondary', 'hidden-alias']).toContain(module.navigation);
      expect(['command', 'record', 'analytics', 'detail', 'settings', 'immersive']).toContain(module.pageTemplate);
    }
  });

  it('keeps group tabs and aliases resolvable', () => {
    Object.values(GROUPS).flatMap(group => group.tabs).forEach(id => expect(TABS[id]).toBeTruthy());
    Object.entries(ROUTE_ALIASES).forEach(([alias, target]) => {
      expect(canonicalModule(alias).id).toBe(target);
      expect(canonicalModule(alias).canonicalPath).toBe(TABS[target].canonicalPath);
    });
  });

  it('migrates only the obsolete default area order and preserves deliberate custom order', () => {
    expect(normalizeGroupOrder(['today', 'body', 'wellness', 'insights', 'work', 'money', 'life', 'system'])).toEqual(GROUP_ORDER);
    expect(normalizeGroupOrder(['life', 'money']).slice(0, 2)).toEqual(['life', 'money']);
  });
});

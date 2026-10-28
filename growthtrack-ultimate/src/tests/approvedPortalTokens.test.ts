import { describe, expect, it } from 'vitest';
import { tokens } from '../design/tokens';
import { GROUPS, normalizeGroupOrder, GROUP_ORDER, TABS } from '../config/navigation';
import { featurePath, resolveFeatureRoute } from '../config/featureRegistry';

const luminance = (hex: string) => {
  const channels = hex.replace('#', '').match(/../g)!.map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
};
const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
describe('approved production visual contract', () => {
  for (const [name, theme] of Object.entries({ ...tokens.themes, ...Object.fromEntries(Object.entries(tokens.colorThemes).map(([key, preset]) => [key, preset.colors])) })) {
    for (const surface of [theme.canvas, theme.surface, theme.surfaceRaised]) {
      it(`${name} normal, muted and tertiary text remain readable on ${surface}`, () => { for (const text of [theme.text, theme.muted, theme.subtle]) expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5); });
      it(`${name} input boundaries are discernible on ${surface}`, () => expect(contrast(theme.inputBorder, surface)).toBeGreaterThanOrEqual(3));
    }
    it(`${name} semantic text and primary actions remain readable`, () => { for (const text of [theme.danger, theme.success, theme.warning, theme.info]) expect(contrast(text, theme.surface)).toBeGreaterThanOrEqual(4.5); expect(contrast(theme.action, theme.onAction)).toBeGreaterThanOrEqual(4.5); });
    it(`${name} sidebar labels remain readable`, () => { for (const text of [theme.sidebarText, theme.sidebarMuted]) expect(contrast(text, theme.sidebar)).toBeGreaterThanOrEqual(4.5); });
  }
  it('moves customer administration out of personal finance without removing canonical URLs', () => {
    expect(GROUPS.customers.tabs).toEqual(['customers', 'finsync', 'oxfin']);
    expect(GROUPS.money.tabs).not.toContain('finsync'); expect(GROUPS.money.tabs).not.toContain('oxfin');
    expect(featurePath('finsync')).toBe('/finance/finsync');
    expect(resolveFeatureRoute('/customers/oxfin').redirect).toBe('/finance/oxfin');
    expect(resolveFeatureRoute('/customers').feature?.id).toBe('customers');
    expect(TABS.finsync.group).toBe('customers');
  });
  it('upgrades the previous default ordering while preserving deliberate choices', () => {
    expect(normalizeGroupOrder(['money', 'insights', 'wellness', 'work', 'life', 'system'])).toEqual(GROUP_ORDER);
    expect(normalizeGroupOrder(['life', 'work']).slice(0, 2)).toEqual(['life', 'work']);
    expect(normalizeGroupOrder(['life', 'work'])).toContain('customers');
  });
});

import { describe, expect, it } from 'vitest';
import { tokens } from './tokens';
const luminance = (hex: string) => hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
describe('kinetic 5 colour contract', () => {
  it.each(Object.entries(tokens.kinetic.themes))('keeps readable text and controls in %s', (_name, theme) => {
    for (const surface of [theme.canvas, theme.surface, theme.surfaceRaised]) { expect(contrast(theme.text, surface)).toBeGreaterThanOrEqual(4.5); expect(contrast(theme.muted, surface)).toBeGreaterThanOrEqual(4.5); expect(contrast(theme.link, surface)).toBeGreaterThanOrEqual(4.5); }
    expect(contrast(theme.inputBorder, theme.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(theme.sidebarText, theme.sidebar)).toBeGreaterThanOrEqual(4.5);
  });
  it('pairs the new bright primary with ink and keeps the 4.2 fallback values', () => {
    expect(tokens.version).toMatch(/^5\.\d+\.\d+$/);
    expect(contrast(tokens.palettes.coral.light, tokens.palettes.coral.lightText)).toBeGreaterThanOrEqual(4.5);
    expect(tokens.illustration.colors.coral).toBe('#FF806B');
    expect(tokens.illustration.themes.light.canvas).toBe('#F7F9F6');
  });
});

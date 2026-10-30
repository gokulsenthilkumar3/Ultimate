import { describe, expect, it } from 'vitest';
import { tokens } from './tokens';

function luminance(hex: string) {
  const linear = hex.slice(1).match(/../g)!.map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

describe('illustrated workspace readability', () => {
  it.each(Object.entries(tokens.illustration.themes))('keeps text, navigation and input outlines readable in %s', (_name, theme) => {
    for (const background of [theme.canvas, theme.surface, theme.surfaceRaised]) {
      expect(contrast(theme.text, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.muted, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(theme.sidebarText, theme.sidebar)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.sidebarMuted, theme.sidebar)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.sidebarActiveText, theme.sidebarActive)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.inputBorder, theme.surface)).toBeGreaterThanOrEqual(3);
  });

  it('uses dark readable ink on each bright character accent', () => {
    const { ink, coral, mint, yellow, lilac } = tokens.illustration.colors;
    for (const background of [coral, mint, yellow, lilac]) expect(contrast(ink, background)).toBeGreaterThanOrEqual(4.5);
  });
});

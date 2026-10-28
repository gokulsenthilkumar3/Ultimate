import { tokens } from './tokens';

export const COLOR_THEMES = tokens.colorThemes;
export type ColorThemeId = keyof typeof COLOR_THEMES;
export function isColorTheme(value: string): value is ColorThemeId {
  return Object.hasOwn(COLOR_THEMES, value);
}
/** Presets update both existing preference fields in one acknowledged write. */
export function palettePreferencePatch(palette: string) {
  return isColorTheme(palette) ? { palette, theme: COLOR_THEMES[palette].mode } : { palette };
}
/** Choosing a different mode leaves a fixed-mode preset rather than mislabelling it. */
export function themePreferencePatch(palette: string, theme: string) {
  return isColorTheme(palette) && COLOR_THEMES[palette].mode !== theme ? { theme, palette: 'forest' } : { theme };
}

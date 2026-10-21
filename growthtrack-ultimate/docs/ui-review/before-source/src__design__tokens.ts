/** GrowthTrack visual contract. Keep component styles on semantic tokens. */
export const tokens = {
  color: {
    accent: '#0A84FF', accentStrong: '#0071E3', success: '#30D158', warning: '#FF9F0A', danger: '#FF453A',
    canvas: '#07080B', surface: '#12141B', text: '#F5F5F7', textMuted: '#A1A1AA', textSubtle: '#71717A',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32, '3xl': 48 },
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  motion: { fast: '150ms', standard: '220ms', emphasized: '320ms' },
  shadow: { control: '0 4px 14px rgba(0,0,0,.16)', card: '0 18px 60px rgba(0,0,0,.22)' },
} as const;

export type TokenSet = typeof tokens;

/** GrowthTrack visual contract. Keep component styles on semantic tokens. */
export const tokens = {
  color: {
    accent: '#0A84FF', accentStrong: '#005FCC', success: '#30D158', warning: '#FF9F0A', danger: '#B42318',
    canvas: '#07080B', surface: '#12141B', text: '#F5F5F7', textMuted: '#A1A1AA', textSubtle: '#71717A',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32, '3xl': 48 },
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  motion: { fast: '150ms', standard: '220ms', emphasized: '280ms', ease: 'cubic-bezier(0.2, 0, 0, 1)', reduced: '0ms' },
  shadow: { control: '0 4px 14px rgba(0,0,0,.16)', card: '0 18px 60px rgba(0,0,0,.22)' },
  typography: { family: 'Inter, ui-sans-serif, system-ui, sans-serif', size: { caption: 12, label: 14, body: 16, title: 24, display: 40 }, lineHeight: { body: 1.5, heading: 1.15 }, weight: { regular: 400, medium: 500, strong: 650 } },
  zIndex: { base: 0, sticky: 20, popover: 80, modal: 100, toast: 120 },
  breakpoint: { tablet: 640, desktop: 1024 },
  target: { minimum: 44, large: 52 },
  themes: {
    dark: { canvas: '#090B10', surface: '#141820', text: '#F5F7FA', muted: '#A9B4C5', border: '#657186', action: '#005FCC', onAction: '#FFFFFF', danger: '#FFB4AB', success: '#75D9A1', focus: '#9EC5FF' },
    light: { canvas: '#F5F7FA', surface: '#FFFFFF', text: '#182230', muted: '#475467', border: '#667085', action: '#005FCC', onAction: '#FFFFFF', danger: '#B42318', success: '#187044', focus: '#005FCC' },
  },
} as const;

export type TokenSet = typeof tokens;

/** GrowthTrack visual contract. Keep component styles on semantic tokens. */
export const tokens = {
  color: {
    accent: '#007AFF', accentStrong: '#0057B8', success: '#248A3D', warning: '#C93400', danger: '#BA1A1A',
    canvas: '#F5F5F7', surface: '#FFFFFF', text: '#1D1D1F', textMuted: '#515154', textSubtle: '#6E6E73',
  },
  space: { '1': 4, '2': 8, '3': 12, '4': 16, '5': 24, '6': 32, '7': 40, '8': 48, '9': 64 },
  radius: { xs: 8, sm: 12, md: 16, lg: 20, xl: 28, pill: 999 },
  motion: { instant: '100ms', fast: '160ms', standard: '220ms', emphasized: '280ms', spring: 'cubic-bezier(.22, 1, .36, 1)', ease: 'cubic-bezier(.2, 0, 0, 1)', reduced: '0ms' },
  shadow: { control: '0 1px 2px rgba(15,23,42,.06), 0 6px 16px rgba(15,23,42,.06)', card: '0 1px 2px rgba(15,23,42,.04), 0 18px 48px rgba(15,23,42,.08)', floating: '0 18px 60px rgba(15,23,42,.16)' },
  typography: { family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif', size: { caption: 12, label: 14, body: 16, title: 24, display: 40 }, lineHeight: { body: 1.5, heading: 1.15 }, weight: { regular: 400, medium: 590, strong: 700 } },
  zIndex: { base: 0, sticky: 20, popover: 80, modal: 100, toast: 120 },
  breakpoint: { tablet: 640, desktop: 1024 },
  target: { minimum: 44, large: 52, icon: 44 },
  themes: {
    dark: { canvas: '#000000', surface: '#1C1C1E', surfaceRaised: '#2C2C2E', text: '#F5F5F7', muted: '#AEAEB2', border: '#545458', action: '#0A84FF', onAction: '#FFFFFF', danger: '#FF453A', success: '#30D158', warning: '#FF9F0A', focus: '#64D2FF' },
    light: { canvas: '#F5F5F7', surface: '#FFFFFF', surfaceRaised: '#FFFFFF', text: '#1D1D1F', muted: '#515154', border: '#86868B', action: '#007AFF', onAction: '#FFFFFF', danger: '#BA1A1A', success: '#248A3D', warning: '#C93400', focus: '#005FCC' },
  },
} as const;

export type TokenSet = typeof tokens;

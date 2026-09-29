/** GrowthTrack's semantic visual contract. Generated CSS is derived from here. */
export const tokens = {
  version: '3.0.0',
  space: { '1': 4, '2': 8, '3': 12, '4': 16, '5': 24, '6': 32, '7': 40, '8': 48, '9': 64 },
  radius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
  motion: { instant: '80ms', fast: '140ms', standard: '200ms', emphasized: '240ms', ease: 'cubic-bezier(.2, 0, 0, 1)', reduced: '0ms' },
  shadow: {
    control: '0 1px 2px rgb(28 34 30 / .06)',
    card: '0 3px 16px rgb(28 34 30 / .045)',
    floating: '0 20px 60px rgb(20 25 22 / .2)',
  },
  typography: {
    family: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    display: '"Iowan Old Style", "Baskerville", "Palatino Linotype", Georgia, serif',
    size: { caption: 12, label: 14, body: 16, title: 28, display: 44 },
    lineHeight: { body: 1.5, heading: 1.12 },
    weight: { regular: 400, medium: 500, strong: 700 },
  },
  zIndex: { base: 0, sticky: 20, popover: 80, modal: 100, toast: 120 },
  breakpoint: { tablet: 640, desktop: 1024 },
  target: { minimum: 44, large: 52, icon: 44 },
  themes: {
    light: {
      canvas: '#F6F3EC', surface: '#FFFEFA', surfaceRaised: '#F0ECE4', surfaceSunken: '#EAE5DB',
      text: '#202722', muted: '#4E5951', subtle: '#636D65', border: '#CFCFC4', borderStrong: '#A5ADA3',
      danger: '#9D3135', success: '#266B46', warning: '#875510', info: '#235E83', focus: '#235E83',
    },
    dark: {
      canvas: '#111815', surface: '#1B2420', surfaceRaised: '#27312B', surfaceSunken: '#151E19',
      text: '#F1F1E9', muted: '#CBD0C6', subtle: '#AEB8AC', border: '#576359', borderStrong: '#869187',
      danger: '#F6A4A4', success: '#89D6A9', warning: '#EBC582', info: '#9BCBE7', focus: '#B9E2F5',
    },
    amoled: {
      canvas: '#000000', surface: '#090D0A', surfaceRaised: '#17201A', surfaceSunken: '#050805',
      text: '#F5F6EF', muted: '#D4DAD1', subtle: '#B5C0B3', border: '#607063', borderStrong: '#98A99A',
      danger: '#F6A4A4', success: '#91E2B1', warning: '#F2CE8E', info: '#A2D7F5', focus: '#C9EAFA',
    },
  },
  palettes: {
    gold: { light: '#79500C', dark: '#F0CA80' },
    ocean: { light: '#165C84', dark: '#8DCFF0' },
    mint: { light: '#19694E', dark: '#85DDB6' },
    violet: { light: '#5B4798', dark: '#C4B6FC' },
    rose: { light: '#963E57', dark: '#F5AABE' },
  },
} as const;

export type TokenSet = typeof tokens;

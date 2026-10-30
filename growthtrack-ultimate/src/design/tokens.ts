/** GrowthTrack's semantic visual contract. Generated CSS is derived from here. */
export const tokens = {
  version: '5.0.0',
  space: { '1': 4, '2': 8, '3': 12, '4': 16, '5': 24, '6': 32, '7': 40, '8': 48, '9': 64 },
  radius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
  motion: { instant: '0ms', fast: '120ms', standard: '200ms', emphasized: '240ms', ease: 'cubic-bezier(.2, 0, 0, 1)', reduced: '0ms' },
  shadow: {
    control: '0 1px 2px rgb(15 33 25 / .06)',
    card: '0 1px 2px rgb(15 33 25 / .06)',
    floating: '0 24px 64px rgb(15 33 25 / .24)',
  },
  typography: {
    family: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    display: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    size: { caption: 12, label: 14, body: 14, title: 28, display: 34 },
    lineHeight: { body: 1.5714, heading: 1.2857 },
    weight: { regular: 400, medium: 500, strong: 700 },
  },
  zIndex: { base: 0, sticky: 20, popover: 80, modal: 100, toast: 120 },
  breakpoint: { tablet: 640, desktop: 1024 },
  target: { minimum: 44, large: 52, icon: 44 },
  illustration: {
    colors: { ink: '#233D36', paper: '#FFFBED', coral: '#FF806B', mint: '#85D9B8', yellow: '#F9CE5B', lilac: '#C7B3E8' },
    radius: { xs: 6, sm: 10, md: 16, lg: 20, xl: 24, pill: 999 },
    themes: {
      light: {
        canvas: '#FFFBED', surface: '#FFFDF7', surfaceRaised: '#F1F0E4', surfaceSunken: '#F3F0E5',
        text: '#233D36', muted: '#53665B', subtle: '#607165', border: '#D6DCC9', borderStrong: '#A7B49C', inputBorder: '#83937C',
        sidebar: '#E3EED9', sidebarText: '#233D36', sidebarMuted: '#53665B', sidebarActive: '#CADFBD', sidebarActiveText: '#233D36',
      },
      dark: {
        canvas: '#17221E', surface: '#202E27', surfaceRaised: '#2B3A30', surfaceSunken: '#15211B',
        text: '#F8F4E5', muted: '#C0CBB9', subtle: '#A6BAA5', border: '#405043', borderStrong: '#64765F', inputBorder: '#85957A',
        sidebar: '#111D16', sidebarText: '#F8F4E5', sidebarMuted: '#B2C7A8', sidebarActive: '#33482D', sidebarActiveText: '#D0EDB7',
      },
      amoled: {
        canvas: '#000000', surface: '#0C120E', surfaceRaised: '#1C291F', surfaceSunken: '#050805',
        text: '#F8F4E5', muted: '#C0CBB9', subtle: '#A6BAA5', border: '#405043', borderStrong: '#64765F', inputBorder: '#85957A',
        sidebar: '#000000', sidebarText: '#F8F4E5', sidebarMuted: '#B2C7A8', sidebarActive: '#263C23', sidebarActiveText: '#D0EDB7',
      },
    },
  },
  // 4.2 aliases remain available to the playful fallback and independent products.
  kinetic: {
    colors: { ink: '#10231C', paper: '#FFF8E7', coral: '#FF5A3C', mint: '#2EE6A8', yellow: '#FFD23F', lilac: '#A78BFA', blue: '#3B82F6', coralText: '#B3341F' },
    motion: { fast: '120ms', standard: '180ms', emphasized: '220ms', ease: 'cubic-bezier(.22,1,.36,1)' },
    radius: { xs: 6, sm: 10, md: 16, lg: 20, xl: 24, pill: 999 },
    themes: {
      light: { canvas: '#FFF8E7', surface: '#FFFDF6', surfaceRaised: '#F3ECD9', surfaceSunken: '#EFE8D5', text: '#10231C', muted: '#46594C', subtle: '#536452', border: '#C9CFBA', borderStrong: '#82917A', inputBorder: '#71836A', sidebar: '#E4EAD6', sidebarText: '#10231C', sidebarMuted: '#46594C', sidebarActive: '#D1DDC1', sidebarActiveText: '#10231C', danger: '#C0261B', success: '#0F6B42', warning: '#7A4A00', info: '#6140A4', focus: '#2563EB', link: '#1D4ED8' },
      dark: { canvas: '#111D18', surface: '#1A2C23', surfaceRaised: '#273C30', surfaceSunken: '#0D1712', text: '#FFF8E7', muted: '#C9D4BE', subtle: '#B3C5AA', border: '#425B48', borderStrong: '#8FA383', inputBorder: '#91A786', sidebar: '#0B1510', sidebarText: '#FFF8E7', sidebarMuted: '#C9D4BE', sidebarActive: '#304A32', sidebarActiveText: '#FFF8E7', danger: '#FF9B89', success: '#55F0BE', warning: '#FFE066', info: '#C4B5FD', focus: '#93C5FD', link: '#93C5FD' },
      amoled: { canvas: '#000000', surface: '#0A120D', surfaceRaised: '#17261B', surfaceSunken: '#030604', text: '#FFF8E7', muted: '#C9D4BE', subtle: '#B3C5AA', border: '#425B48', borderStrong: '#8FA383', inputBorder: '#91A786', sidebar: '#000000', sidebarText: '#FFF8E7', sidebarMuted: '#C9D4BE', sidebarActive: '#243C27', sidebarActiveText: '#FFF8E7', danger: '#FF9B89', success: '#55F0BE', warning: '#FFE066', info: '#C4B5FD', focus: '#93C5FD', link: '#93C5FD' },
    },
  },
  themes: {
    light: {
      canvas: '#F6F8F6', surface: '#FFFFFF', surfaceRaised: '#EEF2EE', surfaceSunken: '#EEF2EE',
      text: '#15211B', muted: '#5A6B61', subtle: '#607165', border: '#E1E7E2', borderStrong: '#C9D3CB', inputBorder: '#7C8D82',
      danger: '#C0392B', success: '#187547', warning: '#8C5B24', info: '#2B6CB0', focus: '#1C8055',
      sidebar: '#0F2119', sidebarText: '#DCE8E0', sidebarMuted: '#A4BAAD', sidebarActive: '#1C3A2B',
      action: '#1C8055', onAction: '#FFFFFF',
    },
    dark: {
      canvas: '#0C1410', surface: '#13201A', surfaceRaised: '#1A2A22', surfaceSunken: '#1A2A22',
      text: '#E8F0EB', muted: '#9DB0A6', subtle: '#8EAAA0', border: '#24362C', borderStrong: '#34503F', inputBorder: '#617F6C',
      danger: '#E06A5E', success: '#5BC18B', warning: '#D9A441', info: '#80B5E3', focus: '#3BA876',
      sidebar: '#0A120E', sidebarText: '#DCE8E0', sidebarMuted: '#A4BAAD', sidebarActive: '#1C3A2B',
      action: '#3BA876', onAction: '#0A120E',
    },
    amoled: {
      canvas: '#000000', surface: '#090D0A', surfaceRaised: '#17201A', surfaceSunken: '#050805',
      text: '#F5F6EF', muted: '#D4DAD1', subtle: '#B5C0B3', border: '#24362C', borderStrong: '#34503F', inputBorder: '#617F6C',
      danger: '#F6A4A4', success: '#91E2B1', warning: '#F2CE8E', info: '#A2D7F5', focus: '#C9EAFA',
      sidebar: '#000000', sidebarText: '#DCE8E0', sidebarMuted: '#A4BAAD', sidebarActive: '#1C3A2B',
      action: '#3BA876', onAction: '#0A120E',
    },
  },
  colorThemes: {
    bcl: {
      label: 'BCL', mode: 'dark', description: 'Midnight black, electric cobalt blue and acid lime.',
      swatches: ['#080B12', '#2E5BFF', '#CAFF12'],
      colors: {
        canvas: '#080B12', surface: '#101621', surfaceRaised: '#182131', surfaceSunken: '#0B101A',
        text: '#F1F5FF', muted: '#B0BDCF', subtle: '#94A7C1', border: '#28354A', borderStrong: '#435674', inputBorder: '#627A9B',
        danger: '#FF8C9C', success: '#78D59D', warning: '#F5C77D', info: '#8AB4FF', focus: '#CAFF12',
        sidebar: '#05070C', sidebarText: '#E6EDFF', sidebarMuted: '#A6B6CF', sidebarActive: '#192C54', sidebarActiveText: '#CAFF12',
        brand: '#2E5BFF', onBrand: '#FFFFFF', action: '#5A83FF', onAction: '#080B12', highlight: '#CAFF12',
      },
    },
    gbb: {
      label: 'GBB', mode: 'light', description: 'Muted sage grey, warm cream beige and deep burgundy.',
      swatches: ['#DDE2D8', '#F3EBDD', '#70243E'],
      colors: {
        canvas: '#F3EBDD', surface: '#FFF9EF', surfaceRaised: '#DDE2D8', surfaceSunken: '#E8E3D8',
        text: '#29272B', muted: '#625F5F', subtle: '#655E61', border: '#D7CFC3', borderStrong: '#B0A79D', inputBorder: '#8B7C7E',
        danger: '#9E3646', success: '#356347', warning: '#86591E', info: '#2C5D76', focus: '#70243E',
        sidebar: '#3E1F2E', sidebarText: '#FFF4E8', sidebarMuted: '#D1C4BE', sidebarActive: '#61263E', sidebarActiveText: '#FFF4E8',
        brand: '#70243E', onBrand: '#FFF9EF', action: '#70243E', onAction: '#FFF9EF', highlight: '#70243E',
      },
    },
  },
  palettes: {
    coral: { light: '#FF5A3C', dark: '#FF7A5C', lightText: '#10231C', darkText: '#10231C' },
    forest: { light: '#1C8055', dark: '#3BA876' },
    gold: { light: '#79500C', dark: '#F0CA80' },
    ocean: { light: '#165C84', dark: '#8DCFF0' },
    mint: { light: '#19694E', dark: '#85DDB6' },
    violet: { light: '#5B4798', dark: '#C4B6FC' },
    rose: { light: '#963E57', dark: '#F5AABE' },
  },
} as const;

export type TokenSet = typeof tokens;

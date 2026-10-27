# Desktop and laptop layout

The minimum desktop design target is a 14-inch laptop. Browser layouts use CSS
viewport dimensions rather than physical inches, which browsers cannot reliably
measure. Baseline viewports are 1280×720 and 1366×768; larger desktop checks use
1920×1080. Display scaling and browser zoom can reduce the available CSS pixels.

- Below 640px: mobile navigation and stacked content.
- From 640px through 1439px: compact navigation rail; module navigation opens in
  a dismissible drawer so it does not squeeze the page.
- From 1440px: desktop navigation with the existing collapse control.
- Dashboard and physique columns also respond to the available content width.
- Short desktop viewports get a shorter 3D canvas without reducing text or
  control sizes. The inspector stacks when the workspace cannot fit both panels.

The shared styles live in `src/styles/desktop-responsive.css`; viewer-specific
rules remain in `avatar-workspace.css` and `parametric-studio.css`.

Run `npx playwright test --config playwright.laptop.config.ts` for all registered
page layouts, navigation resizing, and the 3D physique workspace with intercepted
API fixtures. These checks do not access the owner's records. They check the
host app's default pages; embedded companion applications and every populated
record or secondary view require their own content-specific checks.

# Shared design adapters

The versioned typed source remains `growthtrack-ultimate/src/design/tokens.ts`.
Run `npm run design:sync` from the repository root after changing tokens.
Run `npm run design:check` to detect drift without writing files.

The generator emits local CSS into FinSync web, OxFin web, Family Connect,
Equity/NiftyLens, and Forex. Each product consumes its own generated file, so
standalone builds do not import React components or files outside their product.
The generator itself uses Ultimate's installed TypeScript dependency.

Adapters expose `--gt-*` semantic values, explicit light/dark selectors, a system
theme fallback, focus rings, minimum control heights, surface/glass utilities,
reduced-motion behavior, and forced-color borders. Existing product-specific
colors remain until their individual component migrations are verified.

Use `.gt-surface` for an elevated panel and add `.gt-glass` only when translucency
does not reduce readability. Supply a visible label for every control. Surface
utilities do not supply keyboard behavior: dialogs must still trap and restore
focus, and menus must implement their own keyboard contract.

Never edit generated adapters manually. Checked-in local copies are intentional
and allow independent product deployment. No database migration is required.

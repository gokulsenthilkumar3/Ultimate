# Native modules in Ultimate

The user requested NiftyLens, Family Connect and Forex in one Ultimate application on 30 October 2026. The production router will load domain-owned React pages, rather than companion iframes. FinSync and OxFin remain independent customer products.

## Flow and ownership

- NiftyLens: existing configured market price cache → searchable, sortable, paged market watch → quote/range detail and movers. The source, timestamp, refresh state and configuration errors remain explicit. Planned options/index feeds are not simulated.
- Family Connect: connect an existing Family account (or explicitly register) inside Ultimate → select/create an authorized tree → people and relationships → memories, private documents, events and access management. Its existing database, JWT and roles remain authoritative. Ultimate does not impersonate a Family user or grant access by matching an email. Connection is memory-only and cleared when the Ultimate session changes.
- Forex: existing local dataset and saved artifacts → model/currency/window selection → recent, historical, comparison and volatility views → bounded downloadable rows. Historical fitted outputs are labelled as such, with no claim of held-out accuracy or live prices. No training, data migration or automatic external AI calls.

## Interaction and performance

Shared headers, keyboard tabs, focus-managed dialogs, form errors, retry states, loading skeletons and theme tokens follow Ultimate. Flat character art, spring entrances, press/hover reactions and subtle pointer parallax use transforms. Motion respects the global pause, app/OS reduced-motion preferences, hidden documents and offscreen characters. Entrances animate at most eight sections; tables are paged and charts have bounded points. Native modules are separate lazy chunks and do not load Next.js, Streamlit or React Flow in the browser.

Data queries are cancellable and scoped to their account. Writes are explicit, never automatically retried. Family API authorization is enforced server-side for events, documents, relationships and member edits before native controls are exposed. Private files are downloaded through authenticated requests; no token appears in a URL. Existing standalone builds remain supported.

## Verification gate

Verify route compatibility and absence of native iframes, mocked user flows and account isolation, Family permission guards, Forex chronology/bounds, market-provider failures, production builds and workspace checks. Browser screenshots are a separate rendered review, not implied by test counts. No deployment or database migration is part of this change.

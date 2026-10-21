# Companion source audit and native merge map

Checked against sibling source trees on 2026-10-04. This is code inventory, not a data import or a claim that a README/PRD feature is implemented. Original applications and data remain untouched.

| Source | Observed implementation | Ultimate-owned destination | Merge work still required |
| --- | --- | --- | --- |
| `../FinSync` | Next.js `apps/web/app/dashboard` has transactions, budget, bills, wallets, cards, investments, analytics, profile and settings pages; Firebase-oriented monorepo | Finance ledger, budgets, subscriptions/bills, portfolio and account import | Inspect actual write paths and Firestore data shape; preview/dedupe transactions, accounts and attachments; migrate identity and reconcile balances |
| `../FinSync/OxFin` | Separate Next.js web app and wallet/bills/payments/identity service directories | Finance wallet, cards, bills, investments against canonical accounts and ledger | Define account/card/bill records without duplicate balances; map service APIs, permissions, payment boundaries and import fixtures |
| `../Forex` | Python model/data/MLops packages, `src/api`, Streamlit `app/dashboard.py` | Finance currency watchlists and sourced forecasts; isolated internal model worker | Freeze model/artifact versions, input currency pairs, timestamps, uncertainty and scenario API; validate output against fixtures before display |
| `../Equity/NiftyLens` | Next.js app with market price route and components; PRD lists watchlists, charts, options, alerts and portfolio goals | Finance markets, charts, options, alerts, canonical portfolio | Distinguish implemented code from unchecked PRD items; verify market provider rights, timestamps and availability; import holdings/alerts only with owner mapping |
| `../Family Connect/familyconnect` | React/Vite pages for tree, members, events, media, timeline and settings; Express/Prisma backend | Life family spaces, relationships, memories, shared calendar and private documents | Migrate memberships and invitations to Ultimate grants; test record-level permissions, file bytes and shared edit conflicts before import |

The registered companion routes in Ultimate are discovery and migration views. They link to existing Ultimate-owned workflows and show remaining gaps. They do not iframe the standalone apps, issue handoff credentials, or claim synchronized data. The original app links remain available until source/target parity is verified.

For each source, the next executable artifact is a fixture-backed mapping of source IDs, owner IDs, amounts/currencies, timestamps, attachments and deletion state to Ultimate canonical records. Import jobs must offer preview, deterministic IDs, deduplication, a rollback manifest and a reconciliation report. No standalone runtime should be retired before its core workflows and imported owner data pass parity tests.

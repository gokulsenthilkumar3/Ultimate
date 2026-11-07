# Family interchange: GEDCOM export and import

Date: 7 November 2026. This implements the "interchange" item of the [Family roadmap](2026-11-07-family-compact-workspace.md) with an open standard that needs no API key, no account with another service and no cloud resource. No database migration, deployment or desktop packaging is included. It is stacked on the [connector admission plan](2026-11-07-family-admission.md).

## Free integrations considered

"Free" was judged by three questions: does it need a key or account, does private family data leave the owner's services, and does it fit the roadmap's rule that nothing is enabled silently. Provider terms below are not re-verified; read them before building.

| Idea | Key or account | Private data leaves | Decision |
| --- | --- | --- | --- |
| GEDCOM 5.5.1 file exchange with Gramps, FamilySearch, MyHeritage, Ancestry and similar tools | none | no, local parsing | **Implemented here** |
| iCalendar (`.ics`) of birthdays and milestones for the existing Ultimate Calendar import | none | no | Proposed. Ultimate already imports/exports `.ics`; Family needs the recurring-birthday and timezone rules the roadmap says to define first |
| vCard 4.0 export of contact details | none | no | Proposed; low value until people carry contact fields |
| Public-holiday overlay (for example Nager.Date) | none documented | only a country and year | Proposed, opt-in, through the existing bounded fetch helper; adds an external dependency |
| Browser-side OCR (for example Tesseract.js) for scanned certificates | none | no, runs in the browser | Proposed; needs explicit scoped consent per the roadmap and a large asset download |
| Birthplace geocoding (OpenStreetMap Nominatim) | none, strict usage policy | yes, place names | Not started: needs explicit consent, caching and policy review |
| Third-party genealogy APIs (FamilySearch, WikiTree, Wikidata) | OAuth or keys | yes, person data | Not started: keys, terms and consent first |
| Push notifications (ntfy) | none if self-hosted | yes, message text | Later: self-hosted only, and Family notifications are not yet in Ultimate's notification center |
| Open-Meteo weather | none | coordinates only | Already used by Insights; not relevant to Family |

## Implemented

Backend (`Family Connect/familyconnect/backend`):

- `src/services/gedcom.ts`: pure export and bounded parser; no database, network or file access.
- `GET /trees/:id/export/gedcom`: any tree member; returns `{ filename, mediaType, gedcom, summary }`. Trees above 5,000 people or 25,000 connections return 413.
- `POST /trees/:id/import/gedcom/preview`: editors, family heads and admins. Writes nothing; returns counts, warnings, ignored record types, a short sample and probable duplicates of existing people.
- `POST /trees/:id/import/gedcom`: same roles. Re-parses on the server, so the preview is never trusted. In one serializable transaction it creates new people and connections only. Probable duplicates (same name ignoring order, case, punctuation and Latin accents, so “Kumar, Ravi” matches “Ravi Kumar”; Tamil and other scripts are never folded; equal or unknown birth dates) return 409 `DUPLICATES` unless `allowDuplicates` is true. A conflict returns 409 and changes nothing.
- Metadata-only console lines (`family.interchange`: actor, tree, counts) and, since the [completion plan](2026-11-07-family-completion.md), durable audit-trail entries written in the same transaction. No names or file content are recorded in either.
- Advertised contract `family-native/1.3`; the scoped OpenAPI contract is 1.3.0, generated from the runtime Zod schemas.

Ultimate (`growthtrack-ultimate`):

- People tab gains a "Share and back up" card ([FamilyInterchange.jsx](../../growthtrack-ultimate/src/domains/family/FamilyInterchange.jsx)). Export is offered to everyone in the tree; import (review, then confirm) only to editors. UTF-16 files are decoded; files over 1 MB or without a `.ged` extension are refused before any request.
- The bridge classes the new routes as `transfer`, so they share the lowest per-account budget (10 per minute, 2 in flight).

### What maps and what does not

| In the file | In Family |
| --- | --- |
| `NAME`, `SEX`, `BIRT` date and place, `DEAT` date, `OCCU`, `RELI`, `NOTE` | name, gender, birth date and location, death date, occupation, religion, biography |
| `FAM` with `HUSB` and `WIFE`, `MARR` and `DIV` dates | `spouse` connection with marriage/divorce dates |
| `CHIL` | `parent` connection from each listed parent to the child. `PEDI adopted`, `foster` and `sealing` keep the parent link and label it “Adoptive parent”, “Foster parent” or “Sealing parent” (the family line stays in the tree and the kind of link stays visible); `PEDI step` becomes `step_parent` |
| Month-only, year-only and `ABT`/`CAL`/`EST` birth and death dates, and `DEAT Y` with no date | stored with their certainty (month and year dates as the first day of the period) and, for a death with no date, as deceased with an unknown date. Ranges (`BET`, `BEF`, `AFT`, `FROM`, `TO`) and other calendars are not guessed: the original wording is kept at the start of the person's notes |
| `OBJE`, `SOUR`, `EVEN`, shared notes and other records | counted and reported as not imported; media paths and URLs are never read, fetched or echoed |

On export, a parent connection labeled “Adoptive parent” or “Foster parent” is written as `PEDI adopted` or `PEDI foster` when every listed parent of that child shares it; a child whose parents differ is written without `PEDI` and counted as `mixed_pedigree`. Connections GEDCOM cannot express (`cousin`, `friend`, `mentor`, `godparent`, `inlaw`, `aunt_uncle`, `niece_nephew`, `adopted`, `step_*` and a third or later parent) are counted in `summary.omitted` and shown to the user rather than silently dropped. Internal record IDs are not exported.

## Bounds and safety

1 MiB, 100,000 lines, 1,000 people and 2,500 families per import; names, places, occupation, religion and notes are shortened to the Family API's own field limits with a warning. A transaction that exceeds its 15-second budget (kept under the bridge's 20 seconds) is rolled back and reported as 503 with a plain message. The preview also warns about people repeated inside one file and about dates it cannot read. The parser skips malformed lines with a count, rejects ancestry cycles before anything is written, skips self-parent links, ignores duplicate records and declared non-UTF-8 character sets produce a warning. It never throws on random input (tested with a seeded fuzz run) and keeps tag counts in a `Map`, so hostile tag names cannot pollute prototypes.

## Verified

- Backend: the Family suite passes (see the [completion plan](2026-11-07-family-completion.md) for current counts and the PostgreSQL run), including the OpenAPI drift and route-registration checks, schema check and TypeScript build.
- Ultimate: the focused Family UI, admission and bridge suites pass. ESLint reports no errors in `src/domains/family` or `server/domains` (an earlier unrelated `no-control-regex` error in `server/domains/streaming.js` now has a documented exemption on that line); seven older warnings in files this work did not change remain. UI impact and handoff drift checks pass.
- All fixtures are fictional and use injected databases or mocked requests. No Family or owner data was read or written, no GEDCOM from a real tool (Gramps, FamilySearch and so on) was tested, and the new card has not been rendered in a browser or reviewed by the user.

## Not done and not claimed

- **Dates:** only the Gregorian day, month, year and approximate forms are stored. Ranges, other calendars and partial marriage or divorce dates (relationships store exact dates only) are reported, and person dates keep their wording in notes.
- **Adoption and foster links** are a label on an ordinary parent connection, not a schema type. Editing or clearing that label in the UI drops the distinction, and the tree and kinship inference still treat the person as a parent.
- Import adds people; it does not merge into, update or de-duplicate existing records. Duplicate flags use the name and birth date only: they now tolerate name order, case, punctuation and Latin accents but not other spelling variants, and they can still flag namesakes.
- Import is synchronous inside the request. A slow database link fails safely (rolled back, clear message), and a retry with the same key returns the committed result instead of importing twice. The roadmap's background-job variant is not built, and large files and slow links have not been timed.
- Events other than birth, death and marriage, sources, media, multiple names and GEDCOM 7 features are not mapped. Family stores no per-person provenance.
- The cache invalidation covers the tree views of users with access (up to 500); other caches expire on their normal 3 to 10 minute TTL.

## What is still open

What is still open, and why, is in the [completion plan](2026-11-07-family-completion.md).

Run `npm test` in the Family backend and `npm --prefix growthtrack-ultimate exec -- vitest run src/domains/family tests/unit/family-admission.server.test.js tests/unit/family-bridge.server.test.js`.

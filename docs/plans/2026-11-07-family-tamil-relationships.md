# Family: easier relationships and one Me per tree

Implemented for the native Ultimate web UI on 7 November 2026. This extends the [shared session](2026-11-07-family-shared-session.md) and [stabilization work](2026-11-07-family-hardening.md). It does not repackage the desktop application or migrate databases.

## Using the page

1. Open Life → Family Connect and choose a tree.
2. Select **Choose Me**, select your existing person and save. Alternatively open a profile and select **This is me**. An empty tree offers **Add yourself**.
3. Select **Add person**, or open someone's profile and select **Add their relative**. Only the name is required; profile details are optional.
4. Choose the person already in the tree and the new person's relationship to them. The preview states the direction explicitly: the new person is Appa (father) of the selected person. Saving creates the person and connection together.
5. For two existing people, use **Add relationship**. Choose the anchor, their relative and the relative's role. The saved tuple always means `member1 is the relationship of member2`.
6. Use **People** for full-tree search, then **Show in tree** to focus a person without changing Me. Newly added people also become the focused branch. Zoom and **Center on Me** help navigation.

Me is a private account preference with one scalar member ID per tree, persisted in `User.preferences.familySelf`. Selecting another person replaces the previous value. It does not attach a login to a person, claim exclusive ownership of that person, change tree roles or affect another user's Me selection. Viewers can choose their own Me but cannot add/edit people. Existing preferences and selections in other trees are preserved. A deleted or out-of-tree selection reads as unselected. No new database column or migration was needed.

## Tamil terminology and structure

The shared public JSON contract contains 26 Tamil presets, in addition to the 14 existing structural categories. Presets cover parents/children, older and younger siblings, specific relatives on each parent's side, spouses and in-laws. They show Tamil script, transliteration and English meaning. Users can enter their family's preferred display term while retaining the structural category.

Vocabulary was checked against [Michigan State University's Basic Tamil family vocabulary](https://openbooks.lib.msu.edu/basictamil/chapter/chapter-3-1/) and the [University of Chicago Tamil course](https://tamilcourse.uchicago.edu/node/5). These references document regional variation; the UI does not assume one form of address is universal. Kinship facts inform the preset labels, not inferred caste, religion or marriage conventions.

Grandparent labels are derived from two recorded parent links, not saved as a false direct parent relationship. Add a grandparent as a parent of your parent. Connect an aunt/uncle to your parent as a sibling as well as recording their direct kinship label to you when desired. Simple loaded ancestor/descendant paths can show Thatha/Paati; the UI does not invent paternal/maternal detail or missing relationships. Existing `adopted` links have no newly assumed parent/child direction.

Solid diagram links show recorded parent/child generations; other connections are dashed. Me has a distinct marker, and profiles show recorded relationships as full directional sentences. General graph focus and Me are separate state. The diagram remains bounded to 60 visible people; the API bounds the native tree subset to 120 people/600 relationships and prioritizes the focused person and up to 60 adjacent relationships. This is not a full unbounded graph or branch-collapse implementation. People remains the full-directory search path.

## Backend and contract

- `GET /api/native/family/trees/:id/me` reads the current account's selection after checking membership.
- `PUT /api/native/family/trees/:id/me` accepts only `{ "memberId": "..." }` or null to clear. It validates the person belongs to the authorized tree and updates only the authenticated user's preferences in a serializable transaction.
- `POST /api/native/family/members` accepts optional `markAsMe` and `relative` data. The person, relationship and preference update commit together or roll back together.
- `POST /api/native/family/relationships` accepts a validated preset ID or existing structural type. The server resolves preset/type agreement and rejects unsupported combinations.
- Create/update relationship paths check self-links, same-tree membership, duplicate relationships (including inverse parent/child representations) and ancestry cycles in serializable transactions. Symmetric links such as siblings/spouses do not create ancestry cycles. The ancestry check is bounded at 10,000 existing parent/child/step links; larger trees receive a reviewable 409 rather than skipping validation. Database-level graph constraints and legacy-data cleanup remain future work.
- Me/person/relationship request schemas are included in the generated native OpenAPI additions. The full legacy response contract remains incomplete.

Shared vocabulary: `Family Connect/familyconnect/backend/src/contracts/kinship.json`. It contains public terminology only and is imported explicitly by both Family's backend and native UI. No backend implementation or private data is imported into the UI.

## Verification

- Family build/schema check and 28 backend tests passed using isolated databases, including Me replacement/clear, preference preservation, access denial, atomic rollback, preset validation and ancestry checks.
- 23 selected Ultimate tests passed for shared sessions, bridge recovery, existing native workflows, kinship labels and bounded Me/focus layout.
- Four Chrome scenarios passed at 1440px and 390px, including Me replacement, one-call person/relative creation, direction previews, People → Show in tree without changing Me, service retry and horizontal overflow checks.
- Ultimate TypeScript, architecture, agent, evidence and repository checks passed. Architecture checking explicitly excludes non-JS/TS dependency resolution; the JSON import was exercised by the real browser bundler and Family build.
- Screenshots use fictional records and remain under ignored `growthtrack-ultimate/playwright-report/`. Browser scenarios intercepted APIs; they did not mutate owner records. Actual owner-session visual sign-off remains a user review.

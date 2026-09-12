# Interface component contract

This migration extends the existing React/CSS system without adding a styling framework. The application imports generated semantic theme variables before shared control CSS. Existing palette choices remain available on legacy screens; shared controls deliberately use one accessible action blue.

| Component | API and usage | State contract |
|---|---|---|
| Button | `variant="primary/secondary/ghost/tertiary/danger"`, `size="sm/md/lg"`, `icon`, forwarded ref | Native disabled; `loading` + `loadingLabel`; optional `status="error/success"`; caller supplies descriptive outcome text |
| TextField | Required visible `label`; native input props; `hint`, `error`, `success`; forwarded ref | Descriptions merged, errors announced, error overrides success, readonly/disabled/native constraints preserved |
| SelectField | Visible `label`; `{value,label,disabled}` options; native select props | Native keyboard and mobile picker; hint/error/success semantics shared with fields |
| StunningDatePicker | Existing import retained; `label`, ISO `value`, string `onChange`; native min/max/required/autocomplete | Native date-only input; no UTC conversion; browser supplies locale and mobile calendar |
| Modal | `open`, `title`, `onClose`, `actions`, children | Unique label ID; focus trap; Escape/backdrop; restores trigger; scroll lock; mobile sheet |
| ConfirmDialog | Existing API retained | Focus Cancel; waits for returned promise; pending prevents repeated confirmation; rejection stays open |
| ToastProvider | Existing `toast.success/error/warning/info` API | Routine status versus urgent alert; errors and actionable messages persist; 44px dismissal/action controls |
| LoadingSkeleton | Existing API retained | Named loading status; visual placeholders unchanged |

Example:

```jsx
<TextField label="Email" type="email" autoComplete="email"
  value={email} onChange={event => setEmail(event.target.value)}
  error={errors.email} hint="Use the email linked to your account." />
<Button loading={saving} loadingLabel="Saving changes…" onClick={save}>
  Save changes
</Button>
```

The action handler must return its persistence promise and propagate failures to ConfirmDialog. Components do not invent a success state, fake loading delays, or declare navigation links invalid merely to satisfy a state matrix. Use disabled/loading/error/success only when applicable to the control's task.

## Responsive and visual rules

- Mobile below 640px: 16px input text, 44px controls, modal bottom sheet, content scrolls above privacy choices.
- Tablet 640–1024px: shared fluid controls and modal width cap; legacy screen grids still need audit.
- Desktop above 1024px: same semantic hierarchy and maximum dialog width; no smaller click targets.
- 4/8px spacing family, 12–16px control/card radii, restrained shadows, readable neutral surfaces.
- 150ms control feedback, 220ms standard transition, 280ms emphasis. Reduced motion removes shared control transitions/spinner rotation. No new motion package.
- Lucide remains the icon family. Decorative icons are hidden from accessible names in the shared button.
- Existing EmptyState provides illustration/icon slots. A new Table/Card/Tabs/Nav/Tooltip system is not implemented by this patch; those modules remain in the migration backlog.

## Files and patch boundaries

`patches/` contains a full-file unified patch for each changed file with a captured working baseline. These are review artifacts, not commits. `before-source/` preserves the source used for audit line references and rollback comparison. App.jsx integration changes were not captured before this run and are documented here: import design-tokens.css before design-system.css; add the connection notice inside main-content.

New runtime files: `src/lib/uiMessages.js`, `src/styles/design-tokens.css`. Updated token source: `src/design/tokens.ts`. New regression suite: `src/tests/interfaceRegression.test.jsx`. Reproducibility scripts: `scripts/build-design-tokens.mjs`, `scripts/audit-interface.mjs`, `scripts/review-login.mjs`, `scripts/write-ui-review.mjs`.

Run scripts from growthtrack-ultimate. Do not regenerate the before inventory against modified source; it is the historical baseline. The normal npm shim is broken on this machine, so validation calls Node entry points directly. No dependency install, database change or production deployment is required.

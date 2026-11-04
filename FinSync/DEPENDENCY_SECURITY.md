# FinSync web dependency security

The November 2026 remediation targets `apps/web` and its resolved production and
development graph. Run from `FinSync`:

```powershell
npm audit --workspace=apps/web
npm audit --omit=dev --workspace=apps/web
```

An audit is a dated advisory-database result, not a security certification.
The mobile application and root Firebase CLI/tooling have separate dependency
graphs; a clean web audit does not assert a clean aggregate workspace audit.

## Maintained decisions

Verified 5 November 2026: both audit commands above returned **0 advisories**,
as did the full web audit from a clean isolated installation. Eight focused
profile/directory tests and two real Firebase emulator tests passed. The latter
exercise the patched client SDK transport and protected Firestore rules with
synthetic accounts. Verification does not stop the original running Next process.

The final isolated `npm run lint --workspace=apps/web` and production build both
passed, including TypeScript and all 21 generated pages. The build used synthetic
Firebase configuration, no local environment files and no real service calls.
Next's existing middleware-convention deprecation warning remains; it is not an
advisory or a failed build. Generated README, environment-template, repository
and diff-whitespace checks passed as well.

- Retain Firebase 13 and Firebase Admin. Do not accept npm's suggested downgrade
  to Firebase 9 merely to avoid a transitive advisory.
- Next 16.4.5 replaces Next 15's affected pinned PostCSS dependency. Its matching
  ESLint configuration uses ESLint 9 flat configuration and `eslint .`, because
  `next lint` is no longer available. The callback page supplies the required
  Suspense boundary around its search-parameter consumer.
- Root overrides pin patched gRPC 1.14.7 and PostCSS 8.5.32. Firestore's old gRPC
  minor constraint requires an explicit override; keep Node client/emulator
  round trips in verification before changing it.
- Brace expansion stays on patched major 1 for consumers requiring that API.
  Babel stays on patched major 7. Gaxios 7.1.3 moves to patched 7.3.1.
- Glob/minimatch overrides replace affected modern generations while leaving
  legacy major 7 glob and pre-7 minimatch consumers untouched. These changes
  cross major boundaries: verify the owning CLI/library workflows when changing
  them, and prefer removing an override once upstream constraints are patched.
- React Hooks linting uses patched Zod 4, which that consumer explicitly
  supports. The version-scoped Zod override does not require every application
  using Zod 3 to migrate. HumanFS uses the patched 0.16.8 release.

Root overrides apply across the npm workspace. Review affected consumers before
changing them; preserve application manifests rather than hiding audit failures
through omitted dependencies or audit-ignore lists.

## Reproducibility

The lockfile was regenerated from the actual root/web/mobile manifests in an
isolated directory to eliminate stale override and missing-transitive metadata.
A clean install must include both Firebase's Firestore package and patched gRPC;
an audit reporting zero because a dependency is absent is not a valid fix.

The original installed tree may still be held by a running Next.js native binary.
Do not stop another task or force-delete its modules to apply an upgrade. Complete
a clean install after that process stops, or use an isolated verification tree.
Never copy real `.env.local`, keys or databases into verification directories.

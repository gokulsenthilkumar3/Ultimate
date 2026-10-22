# 🤝 Contributing to FamilyConnect

Thank you for your interest in contributing! This document outlines our workflow.

---

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** from `main` using the naming convention below
4. **Make your changes** following the code standards
5. **Test your changes** — write/update tests where applicable
6. **Submit a Pull Request** to `main`

---

## Branch Naming Convention

```
feat/short-description       — New feature
fix/short-description        — Bug fix
chore/short-description      — Maintenance, deps
docs/short-description       — Documentation
refactor/short-description   — Code refactor
perf/short-description       — Performance improvement
```

**Examples:**
- `feat/circular-tree-layout`
- `fix/member-search-crash`
- `docs/api-endpoints`

---

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

Optional longer description

Closes #issue-number
```

**Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `test`, `style`

**Examples:**
```
feat(tree): add circular layout algorithm
fix(auth): handle token expiry gracefully
docs(api): add relationship endpoints
```

---

## Pull Request Checklist

Before opening a PR, ensure:

- [ ] Code follows the project's TypeScript/ESLint standards
- [ ] Tests added/updated for new functionality
- [ ] No console.log statements in production code
- [ ] PR description clearly explains what and why
- [ ] Screenshots/videos included for UI changes
- [ ] Linked to the relevant GitHub issue

---

## Code Standards

### TypeScript
- Strict mode enabled
- No `any` types — use proper types or `unknown`
- Interfaces for objects, types for unions/primitives

### React
- Functional components only
- Custom hooks for reusable logic
- Memoize expensive computations with `useMemo`/`useCallback`
- `React.lazy` for route-level code splitting

### CSS / Tailwind
- Use CSS variables from the design system
- Mobile-first responsive design
- No inline styles except for dynamic values

---

## Issue Labels

Use these labels when creating issues:

| Label | When to use |
|---|---|
| `bug` | Something is broken |
| `enhancement` | New feature request |
| `phase-1` | MVP scope |
| `phase-2` | Extended features |
| `good first issue` | Good for new contributors |
| `help wanted` | Extra attention needed |
| `design` | Needs design work |

---

## Development Setup

See the [README](README.md#getting-started) for full setup instructions.

---

## Questions?

Open a [Discussion](https://github.com/gokulsenthilkumar3/familyconnect/discussions) or reach out via GitHub issues.

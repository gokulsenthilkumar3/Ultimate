# Scripts

This folder contains one-off utility and migration scripts used during development.
These are **not part of the application runtime** — they are developer tools only.

## Files

| Script | Purpose |
|--------|--------|
| `fix-usestore.mjs` | Migrates old `useStore.js` references to new `userStore.js` Zustand store |
| `replace-hovers.js` | Replaces legacy hover styles across components with CSS variable equivalents |
| `generate_humanoid.py` | Python utility to generate/modify the `humanoid-base.glb` 3D model |

## Usage

Run these only when explicitly needed during migrations. They are safe to delete once their migration is confirmed complete.

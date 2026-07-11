# Zustand Store Migration Guide

## Why Migration Matters

When you change the shape of `userStore.js` (add, rename, or remove fields),
users with old data in `localStorage` will silently get broken state.

Zustand's `persist` middleware supports versioned migrations to handle this.

## How to Bump the Store Version

1. Make your schema change in `userStore.js`
2. Increment the `version` number in the persist config
3. Add a migration case for the old version

```js
export const useUserStore = create(
  persist(
    (set, get) => initialState,
    {
      name: 'growthtrack-user',  // localStorage key
      version: 2,                // <-- bump this
      migrate: (persistedState, version) => {
        if (version === 0) {
          // v0 -> v1: initial version, no migration needed
          return persistedState;
        }
        if (version === 1) {
          // v1 -> v2: example — renamed 'workouts' to 'training'
          return {
            ...persistedState,
            training: persistedState.workouts ?? [],
            workouts: undefined,
          };
        }
        return persistedState;
      },
    }
  )
);
```

## Rules

- NEVER delete a version case from `migrate` (old users may still be on it)
- Always test migration by manually setting old localStorage state in DevTools
- Keep `initialState` as the canonical default shape

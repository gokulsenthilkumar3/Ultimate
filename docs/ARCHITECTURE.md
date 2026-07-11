# Architecture Overview

## Data Flow

```
UI Components
     ↓ useUserStore() hook
Zustand Store (userStore.js)  ← version: number (for migration)
     ↓ persist middleware
localStorage   ↔   REST API (VITE_API_BASE)
                        ↓
               PostgreSQL / Supabase
```

## Store Versioning (IMPORTANT)

When you change the shape of `userStore.js`, you MUST bump the version and add migration logic:

```js
// userStore.js
export const useUserStore = create(
  persist(
    (set, get) => ({ ...initialState }),
    {
      name: 'growthtrack-user',
      version: 2, // bump this on schema changes
      migrate: (persistedState, version) => {
        if (version === 1) {
          // migrate v1 → v2: e.g. rename field
          return { ...persistedState, newField: persistedState.oldField };
        }
        return persistedState;
      },
    }
  )
);
```

**Why this matters:** Any user with old localStorage data will have their state broken silently without migration.

## Error Boundaries

Wrap each major tab in a React Error Boundary to prevent full-app crashes:

```jsx
// src/components/TabErrorBoundary.jsx
import { Component } from 'react';

export class TabErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h3>⚠️ This tab encountered an error</h3>
          <pre>{this.state.error?.message}</pre>
          <button onClick={() => this.setState({ hasError: false })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Usage in `App.jsx`:
```jsx
<TabErrorBoundary>
  <FinanceTab />
</TabErrorBoundary>
```

## Lazy Loading

Heavy tabs (3D Model, Finance, Charts) should be lazy loaded:

```jsx
const Body3D = React.lazy(() => import('./components/Body3D'));
const FinanceTab = React.lazy(() => import('./components/FinanceTab'));

// In render:
<Suspense fallback={<div>Loading...</div>}>
  <Body3D />
</Suspense>
```

## Tech Stack

| Tool | Version | Role |
|------|---------|------|
| React | 19 | UI framework |
| Vite | 5 | Build tool |
| Zustand | 5 | State + persistence |
| Recharts | 2.12 | Charts |
| Playwright | latest | E2E testing |
| Vitest | latest | Unit testing |

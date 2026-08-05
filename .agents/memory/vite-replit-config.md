---
name: Vite config for Replit preview
description: Required vite.config.js settings for the app to show in the Replit preview pane
---

# Vite Config for Replit

**Why:** The project originally had `base: '/Ultimate/'` and no server block, causing the preview iframe to fail.

## Required settings (growthtrack-ultimate/vite.config.js)
```js
export default defineConfig({
  base: '/',
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  // ...rest
});
```

**Why:** Replit preview is proxied — requests come from a different origin. `host: '0.0.0.0'` and `allowedHosts: true` are both required. Port must be 5000 for `outputType: 'webview'` workflows.

**How to apply:** Any new Vite project on Replit needs these three server settings.

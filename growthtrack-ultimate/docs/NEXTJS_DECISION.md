# Next.js decision

GrowthTrack remains a Vite React SPA with a local Express/Prisma API.

Next.js would be useful for public SEO pages, server-rendered content, or a hosted full-stack deployment. The signed-in GrowthTrack workspace is a private, highly interactive client application with WebGL, local Ollama, browser geolocation, and a local SQLite database. Server-side rendering does not improve those features and would require replacing the existing router, server, authentication flow, build/deployment paths, and many browser-only components.

The current split also keeps local data ownership clear:

- Vite serves the private interface.
- Express owns authenticated APIs, uploads, integrations, and audit logs.
- Prisma owns the local SQLite schema.
- React Query/Zustand own client cache and UI state.

If a public marketing site needs SEO later, it can be implemented separately in Next.js without migrating the private application.

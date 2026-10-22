# 🏗️ Technical Architecture — FamilyConnect

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│   React 18 + TypeScript + Vite                              │
│   Tailwind CSS + Framer Motion + React Flow                 │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS / WebSocket
┌────────────────────────▼────────────────────────────────────┐
│                        API GATEWAY                          │
│   CloudFlare CDN + Rate Limiting + Auth Middleware          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     BACKEND SERVICES                        │
│   Node.js 20 + Express.js REST API                          │
│   Socket.io (Real-time) │ Background Jobs (Bull/Redis)      │
└─────┬──────────────────┬──────────────────┬─────────────────┘
      │                  │                  │
┌─────▼──────┐   ┌───────▼──────┐   ┌──────▼──────┐
│ PostgreSQL  │   │    Redis      │   │  AWS S3 /   │
│  (Primary)  │   │   (Cache)     │   │ Cloudinary  │
│   Prisma    │   │               │   │  (Media)    │
└────────────┘   └──────────────┘   └─────────────┘
```

## Frontend Architecture

### State Management

```
Zustand Stores:
  familyStore     — Active tree, members, relationships
  uiStore         — Modals, loading states, sidebar state
  authStore       — Current user, session, permissions
```

### Data Flow

```
Component → Hook → React Query → API Client → Backend
                              ↓
                         Zustand Store → Component Re-render
```

### Tree Rendering Pipeline

```
Raw Member Data
  → Build Graph (adjacency list)
    → Layout Algorithm (Dagre / ELK)
      → React Flow Nodes & Edges
        → Canvas Render
          → User Interactions (pan/zoom/click)
```

## Backend Architecture

### API Structure

```
Express App
  ├── Middleware Layer
  │   ├── CORS, Helmet, Compression
  │   ├── Rate Limiting (express-rate-limit)
  │   ├── Auth (JWT verification)
  │   └── Request validation (Zod)
  ├── Route Layer
  │   ├── /api/v1/auth
  │   ├── /api/v1/trees
  │   ├── /api/v1/members
  │   ├── /api/v1/relationships
  │   ├── /api/v1/events
  │   └── /api/v1/documents
  ├── Controller Layer (Business Logic)
  ├── Service Layer (DB + External)
  └── WebSocket Layer (Socket.io)
```

### Caching Strategy

| Data | Cache Layer | TTL |
|---|---|---|
| User preferences | Redis | 1 hour |
| Tree metadata | Redis | 15 mins |
| Member list | Redis | 5 mins |
| Static assets | CloudFlare CDN | 30 days |
| Search results | Redis | 2 mins |

## Database Design

### Entity Relationship

```
User ──< FamilyTree ──< Member
                  \       |
                   ──< Relationship (member1_id, member2_id)
                  \       |
                   ──< Event
                  \       |
                   ──< Document
                  \       |
                   ──< AccessControl >── User
```

### Index Strategy

- `members(tree_id)` — fetch all members of a tree
- `members(tree_id, name)` — member search
- `relationships(tree_id, member1_id)` — relationship lookup
- `events(tree_id, date)` — calendar queries
- `access_control(tree_id, user_id)` — permission checks

## Security Architecture

```
Request Flow:
  1. CloudFlare DDoS protection
  2. Rate limiting (IP + User based)
  3. JWT validation
  4. Permission check (AccessControl table)
  5. Row-level security (Prisma middleware)
  6. Response sanitization
  7. Audit log write
```

## Deployment Architecture

```
Production:
  Frontend   → Vercel (CDN + Edge Functions)
  Backend    → Render / Railway (Auto-scaling)
  Database   → Supabase (Managed PostgreSQL)
  Cache      → Upstash (Serverless Redis)
  Storage    → Cloudinary (Image CDN)
  Monitoring → Sentry + Grafana

CI/CD:
  GitHub Actions → Test → Build → Deploy
```

## Scalability Considerations

- **Horizontal scaling:** Stateless API servers behind load balancer
- **Read replicas:** Database replication for read-heavy tree queries
- **Graph DB:** Consider Neo4j for trees with 50K+ members (Phase 4)
- **Message queue:** RabbitMQ/Bull for async operations (email, notifications)
- **CDN:** CloudFlare for all static assets and media

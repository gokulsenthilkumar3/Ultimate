# 🌳 FamilyConnect

> **"One place for all your family stories, connections, and memories"**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRD Status](https://img.shields.io/badge/PRD-v1.0-brightgreen)](docs/PRD.md)
[![Phase](https://img.shields.io/badge/Phase-1%20MVP-blue)](docs/ROADMAP.md)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20PostgreSQL-informational)](docs/ARCHITECTURE.md)

FamilyConnect is a modern, culturally-rich family tree platform designed for Indian families — both domestic and diaspora. It delivers a premium digital experience for documenting multi-generational family connections, preserving memories, and celebrating Indian family values.

---

## 🖼️ Preview

> Coming Soon — Interactive family tree canvas with infinite zoom, animated member nodes, and cultural relationship labels.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🌳 **Dynamic Tree Canvas** | Infinite zoom canvas (like Figma), multi-generational, collapsible branches |
| 👥 **Relationship Management** | Parents, Siblings, Spouses, In-laws, Custom cultural labels ("Choti Mom", "Bade Papa") |
| 🖼️ **Member Profiles** | Photos, bio, milestones, contact info, social handles |
| 📅 **Family Calendar** | Birthdays, anniversaries, festivals (Diwali, Holi, Eid), RSVP tracking |
| 📁 **Documentation Center** | Secure storage for certificates, property deeds, passports |
| 🤝 **Collaboration** | Role-based access (Viewer, Editor, Admin, Family Head), real-time editing |
| 📊 **Stats Dashboard** | Member count, geographic spread, tree health score |
| 🔒 **Privacy-First** | AES-256 encryption, granular visibility controls, GDPR compliant |

---

## 🏗️ Tech Stack

### Frontend
- **React 18 + TypeScript** — component architecture
- **Vite** — fast builds
- **Tailwind CSS + Framer Motion** — styling and animations
- **React Flow** — tree visualization canvas
- **Zustand** — state management
- **React Query** — data fetching & caching

### Backend
- **Node.js 20 + Express.js** — REST API server
- **PostgreSQL + Prisma** — relational database with type-safe ORM
- **Firebase Auth / Auth0** — authentication
- **AWS S3 / Cloudinary** — file storage
- **Socket.io** — real-time collaboration
- **Redis** — caching layer

---

## 📁 Project Structure

```
familyconnect/
├── frontend/                  # React + TypeScript app
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        # Buttons, Cards, Modals
│   │   │   ├── tree/          # Tree canvas, nodes, connections
│   │   │   ├── profile/       # Member profiles
│   │   │   ├── timeline/      # Events, stories, photos
│   │   │   └── dashboard/     # Stats, overview
│   │   ├── pages/             # Route pages
│   │   ├── hooks/             # Custom React hooks
│   │   ├── store/             # Zustand state stores
│   │   ├── utils/             # Helpers & formatters
│   │   ├── types/             # TypeScript types
│   │   └── api/               # API client
│   └── public/
├── backend/                   # Node.js + Express API
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   ├── controllers/       # Business logic
│   │   ├── models/            # Prisma models
│   │   ├── middleware/        # Auth, rate limiting, etc.
│   │   ├── services/          # External integrations
│   │   └── utils/             # Shared utilities
│   └── prisma/
│       └── schema.prisma      # DB schema
├── docs/                      # Project documentation
│   ├── PRD.md                 # Product Requirements Document
│   ├── ARCHITECTURE.md        # Technical architecture
│   ├── ROADMAP.md             # Phased roadmap
│   ├── API.md                 # API reference
│   └── DESIGN_SYSTEM.md      # Design tokens & components
└── .github/
    ├── workflows/             # CI/CD pipelines
    └── ISSUE_TEMPLATE/        # Issue templates
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20
- PostgreSQL >= 15
- pnpm (recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/gokulsenthilkumar3/familyconnect.git
cd familyconnect

# Install frontend dependencies
cd frontend && pnpm install

# Install backend dependencies
cd ../backend && pnpm install

# Setup environment variables
cp .env.example .env
# Fill in your values

# Run DB migrations
pnpm prisma migrate dev

# Start development servers
pnpm dev  # starts both frontend (5173) and backend (3000)
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/familyconnect

# Auth
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Storage
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET_NAME=familyconnect-media

# Redis
REDIS_URL=redis://localhost:6379

# App
NEXT_PUBLIC_API_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret
```

---

## 📖 Documentation

| Document | Description |
|---|---|
| [📋 PRD](docs/PRD.md) | Full Product Requirements Document |
| [🏗️ Architecture](docs/ARCHITECTURE.md) | Technical architecture and system design |
| [🗺️ Roadmap](docs/ROADMAP.md) | Phased development roadmap |
| [🔌 API Reference](docs/API.md) | Endpoint documentation |
| [🎨 Design System](docs/DESIGN_SYSTEM.md) | Color palette, typography, component specs |
| [🤝 Contributing](CONTRIBUTING.md) | Contribution guidelines |

---

## 🗺️ Roadmap

| Phase | Timeline | Status |
|---|---|---|
| **Phase 1 — MVP** | 12 weeks | 🔄 In Progress |
| **Phase 2 — Extended Features** | +4-6 weeks | 📅 Planned |
| **Phase 3 — Collaboration & Mobile** | +6-8 weeks | 📅 Planned |
| **Phase 4 — AI & Monetization** | 6+ months | 💡 Future |

See [ROADMAP.md](docs/ROADMAP.md) for detailed phase breakdowns.

---

## 💰 Monetization

| Plan | Price | Members | Storage |
|---|---|---|---|
| **Free** | $0/mo | Up to 50 | 2 GB |
| **Pro** | $9.99/mo | Unlimited | 100 GB |
| **Family** | $19.99/mo | Unlimited | 500 GB |

---

## 🔒 Security & Privacy

- **AES-256** encryption at rest, **TLS** in transit
- **GDPR compliant** — right to access, delete, portability
- **Granular privacy controls** — member-level visibility settings
- **Two-Factor Authentication** (optional)
- **SOC 2 Type II** certification target
- **Audit Logs** — all data modifications tracked

---

## 📊 Success Metrics (MVP)

- ✅ 500+ signups in first month
- ✅ Avg tree size ≥ 8 members
- ✅ Tree rendering < 1s (50 members)
- ✅ NPS > 30 (beta testers)
- ✅ Zero critical bugs in production
- ✅ Mobile responsive (all views)

---

## 🤝 Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/add-circular-tree-layout`)
3. Commit your changes (`git commit -m 'feat: add circular tree layout'`)
4. Push to the branch (`git push origin feature/add-circular-tree-layout`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Gokul Senthilkumar**  
Full Stack Developer | SDET  
📍 Tamil Nadu, India  
🐙 [@gokulsenthilkumar3](https://github.com/gokulsenthilkumar3)

---

<p align="center">Made with ❤️ for Indian families worldwide 🇮🇳</p>

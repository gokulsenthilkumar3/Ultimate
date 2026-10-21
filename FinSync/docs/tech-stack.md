# Technology Stack - Detailed Breakdown

**Last Updated**: November 1, 2025  
**Version**: 1.0

---

## Overview

FinSync Super uses a modern JAMstack architecture with React ecosystem for consistency across web and mobile platforms. This document provides detailed information about each technology layer.

---

## Frontend Technologies

### Web Application

| Technology | Version | Purpose | Key Features |
|------------|---------|---------|--------------|
| **React.js** | 19.0 | UI framework | Server Components, concurrent rendering, automatic batching |
| **Next.js** | 15.0 | React framework | SSR, App Router, Server Actions, nested layouts |
| **TypeScript** | 5.3 | Type safety | Enhanced IDE support, compile-time error detection |

**Why Next.js?**
- Server-Side Rendering (SSR) for SEO-friendly dashboards
- Server Components for efficient data fetching
- App Router for nested layouts (`/dashboard/charts`)
- API routes for serverless endpoints
- Built-in optimization (images, fonts)

**Setup Command:**
```bash
npx create-next-app@latest apps/web --typescript --tailwind --app
```

---

### Mobile Application

| Technology | Version | Purpose | Key Features |
|------------|---------|---------|--------------|
| **React Native** | 0.75 | Mobile framework | Native performance, hot reload, 90% code share with web |
| **Expo** | SDK 51 | Development platform | EAS Build, OTA updates, managed workflow |
| **Expo Modules** | Latest | Native features | Camera (QR scans), notifications, secure storage |

**Why Expo?**
- Simplified development workflow
- Over-the-air (OTA) updates without app store approval
- EAS Build for cloud-based iOS/Android builds
- Expo modules for SMS access, camera, biometrics
- Easy transition to bare workflow if needed

**Setup Command:**
```bash
npx create-expo-app apps/mobile --template
```

**Key Expo Modules:**
- `expo-sms`: SMS access for transaction parsing
- `expo-camera`: QR code scanning for UPI payments
- `expo-local-authentication`: Biometric authentication
- `expo-notifications`: Push notifications for bill reminders
- `expo-secure-store`: Encrypted local storage for tokens

---

### State Management

| Technology | Version | Purpose | Use Cases |
|------------|---------|---------|-----------|
| **Redux Toolkit** | 2.2 | Global state | Transactions, balances, user profile |
| **Zustand** | 4.5 | Lightweight state | UI state, temporary filters |
| **React Query** | 5.0 | Server state | API data caching, sync status |

**State Architecture:**
```
Redux Slices:
├── auth          # User authentication state
├── transactions  # Transaction data and filters
├── budgets       # Budget allocations and tracking
├── investments   # Portfolio data
└── sync          # Sync status and conflicts

Zustand Stores:
├── ui            # Theme, sidebar, modals
└── filters       # Temporary search/filter state
```

**Persistence:**
- Web: `redux-persist` with localStorage
- Mobile: `redux-persist` with AsyncStorage
- Offline: Optimistic updates with rollback on sync failure

---

### UI Components & Styling

| Technology | Version | Purpose | Benefits |
|------------|---------|---------|----------|
| **Tailwind CSS** | 3.4 | Utility-first CSS | Rapid styling, consistent design system |
| **Shadcn/UI** | 0.9 | Component library | Accessible, customizable, headless |
| **Framer Motion** | 11.0 | Animation | Smooth transitions, gesture support |
| **Lucide Icons** | 0.300 | Icon set | Consistent, customizable icons |

**Design System:**
```typescript
// tailwind.config.js
colors: {
  primary: '#10b981',      // Green for income/positive
  danger: '#ef4444',       // Red for expenses/negative
  warning: '#f59e0b',      // Orange for alerts
  info: '#3b82f6',         // Blue for investments
  neutral: '#6b7280',      // Gray for neutral
}
```

**Shadcn Components Used:**
- `Card`, `Button`, `Input`, `Select` - Core UI
- `Dialog`, `Sheet`, `Popover` - Overlays
- `Chart` (via Recharts integration) - Data visualization
- `Table`, `DataTable` - Transaction lists

---

### Charts & Data Visualization

| Technology | Version | Purpose | Use Cases |
|------------|---------|---------|-----------|
| **Recharts** | 2.10 | React charts | Line charts, donut charts, bar charts |
| **D3.js** | 7.9 | Advanced viz | Complex investment breakdowns, network graphs |

**Chart Types Implemented:**
1. **Line Chart**: Monthly spending trends
2. **Donut Chart**: Category breakdown, investment allocation
3. **Bar Chart**: Category comparison, income vs. expenses
4. **Area Chart**: Portfolio value over time
5. **Composed Chart**: Multi-metric dashboards

**Responsive SVG Configuration:**
```jsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={transactions}>
    <Line dataKey="amount" stroke="#10b981" />
    <Tooltip content={<CustomTooltip />} />
  </LineChart>
</ResponsiveContainer>
```

---

## Backend Technologies

### Server Runtime

| Technology | Version | Purpose | Features |
|------------|---------|---------|----------|
| **Node.js** | 22.0 | Runtime | Built-in test runner, performance improvements |
| **Express.js** | 4.19 | Web framework | RESTful APIs, middleware support |
| **TypeScript** | 5.3 | Type safety | Shared types with frontend |

**API Structure:**
```
/api
├── /auth
│   ├── POST /login
│   ├── POST /register
│   └── POST /refresh
├── /transactions
│   ├── GET /list
│   ├── POST /parse
│   └── PATCH /:id
├── /sync
│   ├── POST /banks
│   └── GET /status
└── /analytics
    ├── GET /summary
    └── POST /budget
```

**Middleware Stack:**
- `helmet`: Security headers
- `cors`: Cross-origin resource sharing
- `express-rate-limit`: Rate limiting
- `morgan`: Request logging
- Custom auth middleware (JWT validation)

---

### Serverless Functions

| Technology | Version | Purpose | Triggers |
|------------|---------|---------|----------|
| **Firebase Functions** | SDK 12.0 | Event-driven compute | HTTP, Firestore, Pub/Sub, Auth |

**Cloud Functions:**
```javascript
// functions/src/index.ts
export const parseSMS = functions.https.onRequest(/* Twilio webhook */);
export const categorizeTransaction = functions.firestore
  .document('transactions/{id}')
  .onCreate(/* AI categorization */);
export const syncBalances = functions.pubsub
  .schedule('every 6 hours')
  .onRun(/* Poll bank APIs */);
```

**Benefits:**
- Auto-scaling to zero
- Pay per invocation
- Integrated with Firebase ecosystem
- Regional deployment for latency

---

## Database Layer

### Firebase Firestore (NoSQL)

**Version**: v10  
**Use Cases**: Real-time data, user profiles, transactions

**Collections Schema:**
```
/users/{userId}
  ├── profile (doc)
  ├── /accounts (subcollection)
  ├── /transactions (subcollection)
  ├── /budgets (subcollection)
  └── /investments (subcollection)
```

**Why Firestore?**
- Real-time listeners for instant web-mobile sync
- Offline persistence with automatic sync
- Security rules for access control
- Scalable to millions of documents
- Free tier: 50K reads, 20K writes per day

**Pricing (Blaze Plan):**
- Stored data: $0.18/GB/month
- Document reads: $0.06 per 100K
- Document writes: $0.18 per 100K
- **Estimated**: ~$10/month at 1K active users

---

### Firebase Realtime Database

**Version**: v10  
**Use Cases**: Live balance updates, presence system

**Structure:**
```json
{
  "users": {
    "userId123": {
      "balances": {
        "savings": 50000,
        "checking": 20000,
        "lastUpdated": 1698876543000
      },
      "presence": "online"
    }
  }
}
```

**Why Realtime DB + Firestore?**
- Realtime DB: Lower latency for frequently changing data
- Firestore: Better querying for transaction history
- Hybrid approach optimizes cost and performance

---

### PostgreSQL (via Supabase)

**Version**: 2.0  
**Use Cases**: Relational data, complex queries, ACID transactions

**Tables:**
- `loan_schedules`: EMI payment tracking with foreign keys
- `recurring_transactions`: Scheduled payments with joins
- `investment_portfolio`: Historical P&L calculations

**Why Supabase?**
- PostgreSQL with Firebase-like API
- Row-level security (RLS)
- Real-time subscriptions via WebSockets
- Edge functions for low-latency (India region)
- Free tier: 500MB database, 2GB bandwidth

**Setup:**
```bash
npx supabase init
npx supabase start
```

---

## AI & Machine Learning

### OpenAI API

**Model**: GPT-4o (September 2025 update)  
**Pricing**: $0.02/1K tokens (input), $0.06/1K tokens (output)

**Use Cases:**
1. **SMS Parsing**: Extract merchant, amount, category from unstructured text
2. **Categorization**: Auto-tag transactions (e.g., "Swiggy" → Food & Dining)
3. **Budget Advice**: Generate personalized recommendations
4. **Financial Q&A**: Answer user queries about their finances

**Example Prompt:**
```javascript
const prompt = `
Extract transaction details from this SMS:
"Your A/c XX1234 debited Rs.450 on 01-Nov-25 at Cafe Coffee Day Mumbai. Avl Bal: Rs.12,340"

Return JSON: {merchant, amount, type, category, location}
`;
```

**Fine-tuning Plan** (Month 3):
- Collect 1000+ labeled SMS examples
- Fine-tune GPT-4o-mini for faster, cheaper categorization
- Deploy via Firebase Functions

---

### Hugging Face Transformers

**Version**: Transformers.js 2.0 (browser-compatible)  
**Models**: DistilBERT, FinBERT (financial sentiment)

**Use Cases:**
- Edge inference for privacy-sensitive categorization
- Sentiment analysis for news feed (Pulse feature)
- Local semantic search in transaction history

**Browser Deployment:**
```javascript
import { pipeline } from '@xenova/transformers';
const classifier = await pipeline('text-classification', 'FinBERT');
const result = await classifier('Company announces Q4 profits surge');
// → {label: 'positive', score: 0.97}
```

---

## DevOps & Infrastructure

### Containerization

| Technology | Version | Purpose |
|------------|---------|---------|
| **Docker** | 27.0 | Container runtime |
| **Docker Compose** | 2.24 | Multi-container dev |

**Docker Services:**
```yaml
# docker-compose.yml
services:
  backend:
    image: finsync/backend:latest
    ports: ["3001:3001"]
  
  postgres:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]
  
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

---

### Orchestration (Production)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Kubernetes** | 1.31 | Container orchestration |
| **Helm** | 3.14 | Package management |

**K8s Deployment:**
- EKS (AWS) or GKE (Google Cloud) for managed cluster
- Auto-scaling based on CPU/memory
- Horizontal Pod Autoscaler (HPA) for traffic spikes
- Blue-green deployments for zero downtime

---

### CI/CD Pipeline

**Platform**: GitHub Actions

**Workflows:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  test:
    - Run unit tests (Jest)
    - Run E2E tests (Cypress)
    - Code quality (ESLint, Prettier)
  
  build:
    - Build Docker images
    - Push to registry (GHCR)
  
  deploy:
    - Deploy to Kubernetes
    - Run smoke tests
    - Notify Slack
```

---

### Monitoring & Observability

| Tool | Version | Purpose | Cost |
|------|---------|---------|------|
| **Sentry** | 8.0 | Error tracking | Free (5K events/mo) |
| **Datadog** | 1.0 | APM, metrics | $15/host/mo |
| **Firebase Analytics** | Latest | User behavior | Free |

**Alerts Configured:**
- API error rate >1%
- Sync latency >2 seconds
- Database query time >500ms
- Memory usage >80%

---

## Hosting & Deployment

### Web Hosting

**Platform**: Vercel  
**Plan**: Pro ($20/month)

**Features:**
- Edge network for global CDN
- Automatic HTTPS
- Preview deployments per PR
- Analytics and Web Vitals

**Deployment:**
```bash
vercel --prod
# Auto-deploys from main branch via GitHub integration
```

---

### Mobile Deployment

**Platform**: EAS (Expo Application Services)

**Build Configuration:**
```json
// eas.json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  }
}
```

**Commands:**
```bash
eas build --platform android --profile production
eas submit --platform ios --latest
```

---

## Security Stack

| Layer | Technology | Implementation |
|-------|------------|----------------|
| **Encryption** | AES-256 | At rest (Firebase), in transit (TLS 1.3) |
| **Auth** | Firebase Auth + Auth0 | MFA, biometrics, OAuth2 |
| **API Security** | Helmet.js, CORS | Security headers, CSRF tokens |
| **Secrets** | Firebase Config + Vault | Environment variables, API keys |
| **Compliance** | PCI DSS | Tokenized payments via Razorpay |

---

## Development Tools

| Tool | Purpose | Cost |
|------|---------|------|
| **VS Code** | IDE | Free |
| **Postman** | API testing | Free |
| **Figma** | Design | Pro $12/user/mo |
| **Jira** | Project mgmt | Starter $10/10 users/mo |
| **Slack** | Communication | Free |
| **GitHub** | Version control | Free (Team $4/user/mo) |

---

## Cost Summary (Monthly)

### MVP Phase (0-1K users)
- Firebase Blaze: $10
- Vercel Pro: $20
- Supabase Pro: $25
- OpenAI API: $50
- Sentry: $0 (free tier)
- **Total**: ~$105/month

### Growth Phase (1K-10K users)
- Firebase: $50
- API costs (Plaid, etc.): $500
- Hosting: $50
- Monitoring: $50
- **Total**: ~$650/month

---

## Version Compatibility Matrix

| Frontend | Backend | Database | Mobile |
|----------|---------|----------|--------|
| React 19 | Node 22 | Firestore v10 | RN 0.75 |
| Next.js 15 | Express 4.19 | Postgres 16 | Expo 51 |
| TypeScript 5.3 | TypeScript 5.3 | Redis 7 | TS 5.3 |

---

## Next Steps

1. ✅ Review and approve tech stack
2. [ ] Set up development environments
3. [ ] Create boilerplate applications
4. [ ] Configure Firebase project
5. [ ] Set up CI/CD pipeline

---

**Document Owner**: Technical Lead  
**Review Frequency**: Monthly  
**Last Review**: November 1, 2025

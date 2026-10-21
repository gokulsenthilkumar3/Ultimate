# Technical Documentation

## System Architecture

### High-Level Architecture Diagram
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │◄──►│  NextAuth Layer  │◄──►│  PostgreSQL DB  │
│  (Frontend)     │    │  (Auth System)   │    │  (User Data)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Routes    │    │  Session Store   │    │  Redis Cache    │
│  (Business API) │    │  (JWT Sessions)  │    │  (Performance)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │
        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ External APIs   │    │ Payment Providers│    │Investment APIs  │
│ (OAuth, etc)    │    │ (Stripe/Razorpay)│    │(Zerodha/Groww)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified TIMESTAMP,
    image TEXT,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    failed_login_attempts INTEGER DEFAULT 0,
    lockout_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Wallets Table
```sql
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL,
    type VARCHAR(20) DEFAULT 'full',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Transactions Table
```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER REFERENCES wallets(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### NextAuth Standard Tables
- `accounts` - OAuth provider account linking
- `sessions` - User session management
- `verification_tokens` - Email verification tokens

### Custom Security Tables
- `password_history` - Password change tracking for policy enforcement

## API Endpoints

### Authentication APIs
```
POST /api/auth/register
POST /api/auth/[...nextauth]
GET  /api/auth/[...nextauth]
```

### User APIs
```
GET  /api/user/balance
GET  /api/user/transactions
POST /api/user/transfer
GET  /api/user/security-status
POST /api/user/mfa/setup
POST /api/user/mfa/verify
```

### Financial APIs
```
POST /api/investments/order
POST /api/payments/checkout
POST /api/bills/parse
POST /api/oxcrypto/convert
GET  /api/wallets/[type]
```

### AI & Analytics APIs
```
GET  /api/ai/recommendations
```

## Component Architecture

### UI Component Hierarchy
```
App Layout
├── NavigationRail (Sidebar)
├── Main Content Area
│   ├── Dashboard Page
│   │   ├── Balance Cards
│   │   ├── Transaction Charts
│   │   ├── Recent Transactions
│   │   └── AI Recommendations
│   ├── Wallets Page
│   ├── Investments Page
│   ├── Cards Page
│   ├── Bills Page
│   └── Settings Page
└── Modals
    ├── Transfer Modal
    ├── MFA Setup Modal
    └── Consent Center
```

### Reusable Components
- `Button` - Animated button with variants
- `Card` - Glassmorphism card container
- `Input` - Styled form inputs
- `Charts` - Recharts-based data visualization
- `PhysicalCard` - 3D card component
- `Badge` - Status indicators

## Security Implementation

### Authentication Flow
1. User submits credentials
2. Password verification with bcrypt
3. MFA check if enabled
4. Account lockout validation
5. Session creation with JWT
6. Rate limiting enforcement

### Authorization Middleware
```typescript
// Session validation
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Security Headers
- Content Security Policy (CSP)
- Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

## Performance Optimization

### Frontend Optimizations
- Code splitting with dynamic imports
- Image optimization with Next.js Image component
- Font optimization with next/font
- Client-side caching with SWR
- Bundle analysis with webpack-bundle-analyzer

### Backend Optimizations
- Database connection pooling
- Redis caching for sessions
- Query optimization with indexes
- Response compression
- CDN for static assets

### Database Indexes
```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
```

## Error Handling

### Global Error Boundaries
```typescript
// app/error.tsx
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div>
            <h2>Something went wrong!</h2>
            <button onClick={reset}>Try again</button>
        </div>
    );
}
```

### API Error Responses
```typescript
return NextResponse.json(
    { error: 'Descriptive error message', code: 'ERROR_CODE' },
    { status: 400 }
);
```

## Testing Strategy

### Unit Testing
- Component testing with Jest and React Testing Library
- Hook testing with @testing-library/react-hooks
- Utility function testing

### Integration Testing
- API route testing
- Database integration tests
- Authentication flow testing

### End-to-End Testing
- Cypress or Playwright for user flows
- Cross-browser testing
- Mobile responsiveness testing

## Monitoring & Logging

### Application Logging
```typescript
// Structured logging
console.log('executed query', { 
    text: queryText, 
    duration: executionTime, 
    rows: rowCount 
});
```

### Performance Monitoring
- Web Vitals tracking
- Database query performance
- API response times
- User session analytics

### Error Monitoring
- Sentry integration for error tracking
- Custom error boundaries
- Performance degradation alerts

## Deployment Configuration

### Vercel Deployment
```json
// vercel.json
{
  "builds": [
    {
      "src": "next.config.js",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### Docker Configuration
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
```

## Environment Configuration

### Development (.env.local)
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev_secret_key

# Feature Flags
OXFIN_PAYMENT_PROVIDER=stripe
OXFIN_INVESTMENT_PROVIDER=zerodha

# API Keys
STRIPE_SECRET_KEY=sk_test_...
KITE_API_KEY=test_api_key
```

### Production
```bash
# Secure production configuration
DATABASE_URL=postgresql://user:pass@prod-db:5432/db
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=super_secret_production_key

# Production API keys
STRIPE_SECRET_KEY=sk_live_...
KITE_API_KEY=prod_api_key
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build
```

This technical documentation provides a comprehensive overview of the OxFin system architecture, implementation details, and operational guidelines for developers and system administrators.
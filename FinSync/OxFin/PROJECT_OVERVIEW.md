# OxFin - Financial Intelligence Platform

## Project Overview

OxFin is a modern, minimalist fintech dashboard built with Next.js 16, designed to provide users with a seamless financial management experience. The platform offers wallet management, investment tracking, bill payments, and AI-powered financial insights.

## Key Features

### 🏦 Core Banking Features
- **Multi-Wallet Management**: Full and Lite wallet types with INR/OX currency support
- **Secure Transfers**: Internal wallet transfers with transaction history
- **Real-time Balance Tracking**: Live balance updates across all wallets
- **Transaction History**: Comprehensive transaction logging and categorization

### 📈 Investment Management
- **Stock Portfolio Tracking**: Real-time stock holdings with performance metrics
- **Multiple Broker Integration**: Support for Zerodha Kite and Groww APIs
- **Portfolio Analytics**: Performance charts and asset allocation visualization
- **Order Placement**: Buy/sell stock orders through integrated brokers

### 🔐 Security & Authentication
- **Multi-Factor Authentication (MFA)**: TOTP-based 2FA for enhanced security
- **Account Lockout Protection**: Automatic lockout after 5 failed login attempts
- **OAuth Integration**: Google and GitHub authentication support
- **Session Management**: JWT-based sessions with 8-hour expiry
- **Rate Limiting**: API request throttling for security

### 🤖 AI-Powered Features
- **Smart Financial Insights**: AI-generated spending and saving recommendations
- **Personalized Advice**: Context-aware financial guidance
- **Pattern Recognition**: Spending habit analysis and anomaly detection

### 💳 Additional Services
- **Physical & Virtual Cards**: Card management interface
- **Bill Payment System**: Utility bill tracking and payment
- **OxCrypto Integration**: Custom cryptocurrency exchange functionality
- **Consent Management**: User consent center for data privacy

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Framer Motion for animations, Lucide React for icons
- **State Management**: React Context API
- **Authentication**: NextAuth.js

### Backend
- **Runtime**: Node.js
- **Database**: PostgreSQL with connection pooling
- **Caching**: Redis
- **ORM**: Direct SQL queries with pg library
- **Security**: bcrypt for password hashing, otplib for MFA

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Deployment**: Vercel (frontend), self-hosted (backend)
- **Environment Management**: dotenv

## Architecture

### Project Structure
```
AntiGravity-Finance/
├── ox-fin-backend/           # Backend services and database
│   ├── infrastructure/       # Database initialization scripts
│   ├── .env.example         # Environment variable template
│   └── docker-compose.yml   # Container orchestration
└── ox-fin-web/              # Next.js frontend application
    ├── src/
    │   ├── app/             # App Router pages and API routes
    │   ├── components/      # Reusable UI components
    │   ├── lib/             # Business logic and utilities
    │   ├── guards/          # Security middleware
    │   └── types/           # TypeScript interfaces
    ├── public/              # Static assets
    └── scripts/             # Development and migration scripts
```

### Data Flow
1. **Authentication**: NextAuth.js handles user sessions and credentials
2. **API Layer**: RESTful API routes in `/src/app/api/` handle business logic
3. **Database**: PostgreSQL stores user data, wallets, transactions, and investments
4. **Caching**: Redis used for session storage and performance optimization
5. **External Services**: Integration with payment providers and investment platforms

## Security Features

### Authentication Security
- Password hashing with bcrypt (12 rounds)
- Account lockout after 5 failed attempts (15-minute cooldown)
- MFA support with TOTP (Time-based One-Time Password)
- Session timeout handling
- OAuth provider integration (Google, GitHub)

### API Security
- Rate limiting middleware
- CSRF protection
- Security headers (CSP, HSTS, X-Frame-Options)
- Input validation with Zod schema validation
- SQL injection prevention through parameterized queries

### Data Protection
- Environment variable configuration
- Database connection encryption (SSL in production)
- Secure password history tracking
- Session token management

## Development Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL client
- Git

### Quick Start
1. Clone the repository
2. Start backend services: `cd ox-fin-backend && docker-compose up -d`
3. Install frontend dependencies: `cd ox-fin-web && npm install`
4. Configure environment variables (copy `.env.example` to `.env.local`)
5. Run development server: `npm run dev`

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/oxfin

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key

# Feature Flags
OXFIN_PAYMENT_PROVIDER=stripe
OXFIN_INVESTMENT_PROVIDER=zerodha

# API Keys
STRIPE_SECRET_KEY=sk_test_...
RAZORPAY_KEY_ID=rzp_test_...
KITE_API_KEY=your_kite_api_key
```

## Deployment

### Frontend (Vercel)
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Self-hosted)
1. Deploy PostgreSQL database (AWS RDS, Supabase, or self-hosted)
2. Deploy Redis instance
3. Configure environment variables
4. Deploy application to cloud provider (AWS, GCP, Azure)

## Contributing

### Development Guidelines
- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error handling
- Write comprehensive tests
- Maintain consistent code formatting

### Git Workflow
- Feature branches from `main`
- Pull requests with code review
- Semantic commit messages
- Automated testing on CI/CD

## License

This project is proprietary and confidential. All rights reserved.
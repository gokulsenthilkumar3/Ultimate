# README.md

# OxFin - Financial Intelligence Platform

<p align="center">
  <img src="https://placehold.co/400x200/2563EB/white?text=OxFin+Logo" alt="OxFin Logo" width="200"/>
</p>

<p align="center">
  <strong>Modern, minimalist fintech dashboard with AI-powered financial insights</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## 🚀 Overview

OxFin is a cutting-edge financial management platform built with Next.js 16, offering users a seamless experience for wallet management, investment tracking, and AI-powered financial insights. Designed with security and performance in mind, it provides enterprise-grade features for modern fintech applications.

## ✨ Key Features

### 🏦 Core Banking
- **Multi-Wallet Management** - Full and Lite wallet types with INR/OX support
- **Secure Fund Transfers** - Real-time transfers with transaction history
- **Balance Tracking** - Live updates across all financial accounts
- **Transaction Management** - Comprehensive logging and categorization

### 📈 Investment Platform
- **Stock Portfolio Tracking** - Real-time holdings with performance analytics
- **Broker Integration** - Zerodha Kite and Groww API support
- **Portfolio Analytics** - Charts and asset allocation visualization
- **Order Placement** - Buy/sell capabilities through integrated brokers

### 🔐 Advanced Security
- **Multi-Factor Authentication** - TOTP-based 2FA protection
- **Account Protection** - Lockout after failed attempts
- **OAuth Integration** - Google and GitHub authentication
- **Rate Limiting** - API request throttling for security

### 🤖 AI-Powered Insights
- **Smart Financial Recommendations** - Personalized spending and saving advice
- **Pattern Recognition** - Spending habit analysis
- **Anomaly Detection** - Unusual transaction alerts
- **Predictive Analytics** - Future financial planning

### 💳 Additional Services
- **Card Management** - Physical and virtual card interfaces
- **Bill Payment System** - Utility payments with auto-pay
- **OxCrypto Exchange** - Custom cryptocurrency trading
- **Consent Management** - GDPR-compliant data privacy controls

## 🛠 Tech Stack

### Frontend
- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Framer Motion](https://www.framer.com/motion/)** - Animation library
- **[NextAuth.js](https://next-auth.js.org/)** - Authentication solution

### Backend
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database
- **[Redis](https://redis.io/)** - In-memory data store
- **[Docker](https://www.docker.com/)** - Containerization

### Infrastructure
- **[Vercel](https://vercel.com/)** - Frontend deployment
- **[Docker Compose](https://docs.docker.com/compose/)** - Local development
- **[Stripe/Razorpay](https://stripe.com/)** - Payment processing
- **[Zerodha Kite/Groww](https://kite.zerodha.com/)** - Investment APIs

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL client

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/your-username/oxfin.git
cd oxfin
```

2. **Start backend services:**
```bash
cd ox-fin-backend
docker-compose up -d
```

3. **Install frontend dependencies:**
```bash
cd ../ox-fin-web
npm install
```

4. **Configure environment:**
```bash
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

5. **Run development server:**
```bash
npm run dev
```

6. **Open your browser:**
```
http://localhost:3000
```

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
KITE_API_KEY=your_kite_api_key
```

## 📚 Documentation

### Comprehensive Guides
- **[Project Overview](PROJECT_OVERVIEW.md)** - High-level architecture and features
- **[Technical Documentation](TECHNICAL_DOCUMENTATION.md)** - System architecture and implementation details
- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference and endpoints
- **[Development Guide](DEVELOPMENT_GUIDE.md)** - Setup, coding standards, and best practices
- **[Security Documentation](SECURITY_DOCUMENTATION.md)** - Security architecture and compliance
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[User Guide](USER_GUIDE.md)** - End-user documentation and tutorials

### Quick Links
- [Authentication API](API_DOCUMENTATION.md#authentication-api)
- [User Management](API_DOCUMENTATION.md#user-management-api)
- [Investment API](API_DOCUMENTATION.md#investment-api)
- [Security Features](SECURITY_DOCUMENTATION.md)

## 🏗 Architecture

### System Components
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │◄──►│  NextAuth Layer  │◄──►│  PostgreSQL DB  │
│   (Frontend)    │    │  (Auth System)   │    │  (User Data)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Routes    │    │  Session Store   │    │  Redis Cache    │
│  (Business API) │    │  (JWT Sessions)  │    │  (Performance)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Flow
1. **Authentication** → NextAuth.js handles user sessions
2. **API Layer** → RESTful routes in `/src/app/api/`
3. **Database** → PostgreSQL with connection pooling
4. **Caching** → Redis for session storage
5. **External Services** → Payment and investment providers

## 🔧 Development

### Scripts
```bash
npm run dev        # Start development server
npm run build      # Create production build
npm run start      # Start production server
npm run lint       # Run ESLint
npm test           # Run tests
```

### Development Tools
- **TypeScript** - Full type safety
- **ESLint** - Code quality enforcement
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **React Testing Library** - Component testing

### Contributing Guidelines
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 🛡 Security

### Security Features
- **Multi-Factor Authentication** with TOTP
- **Account Lockout** after failed attempts
- **Rate Limiting** on all API endpoints
- **Input Validation** with Zod schemas
- **Security Headers** for all responses
- **Encrypted Storage** for sensitive data

### Compliance
- GDPR-compliant data handling
- PCI DSS payment security standards
- OWASP security best practices
- Regular security audits

## 📊 Performance

### Optimizations
- **Code Splitting** with dynamic imports
- **Image Optimization** with Next.js Image component
- **Database Connection Pooling**
- **Redis Caching** for session data
- **CDN Integration** for static assets

### Monitoring
- Web Vitals tracking
- Error boundary implementation
- Performance logging
- User experience analytics

## 🌐 Deployment

### Production Deployment
1. **Frontend** - Deploy to Vercel
2. **Backend** - Self-hosted with Docker
3. **Database** - PostgreSQL (AWS RDS/Supabase)
4. **Caching** - Redis (AWS ElastiCache)

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
DATABASE_URL=postgresql://prod-user:pass@db-host:5432/oxfin
```

## 🤝 Contributing

We welcome contributions! Please see our [Development Guide](DEVELOPMENT_GUIDE.md) for:

- Coding standards and best practices
- Testing requirements
- Pull request process
- Code review guidelines
- Security contribution guidelines

### Ways to Contribute
- Bug reports and fixes
- Feature requests and implementations
- Documentation improvements
- Security vulnerability reports
- Performance optimizations

## 📄 License

This project is proprietary and confidential. All rights reserved.

**Company**: AntiGravity Financial Technologies  
**Contact**: legal@oxfin.com  
**Website**: https://oxfin.com

## 🙏 Acknowledgments

- [Next.js Team](https://nextjs.org/) for the amazing framework
- [Vercel](https://vercel.com/) for deployment platform
- Open source community for libraries and tools
- Financial industry partners for API integrations

## 📞 Support

### Getting Help
- **Documentation**: Check our comprehensive guides
- **Issues**: Report bugs on GitHub
- **Email**: support@oxfin.com
- **Community**: Join our developer community

### Business Inquiries
- **Partnerships**: partners@oxfin.com
- **Enterprise Sales**: sales@oxfin.com
- **API Access**: api@oxfin.com

---

<p align="center">
  <strong>Built with ❤️ for the future of finance</strong>
</p>

<p align="center">
  <a href="https://oxfin.com">Website</a> •
  <a href="https://docs.oxfin.com">Documentation</a> •
  <a href="https://status.oxfin.com">Status</a> •
  <a href="https://careers.oxfin.com">Careers</a>
</p>
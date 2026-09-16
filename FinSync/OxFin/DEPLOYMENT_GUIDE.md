# Deployment Guide

## Production Deployment Overview

This guide covers the complete deployment process for the OxFin financial platform, including infrastructure setup, configuration, and deployment strategies for both frontend and backend services.

## Prerequisites

### System Requirements
- **Frontend**: Node.js 18+, 2GB RAM minimum
- **Backend**: PostgreSQL 13+, Redis 6+, 4GB RAM minimum
- **Infrastructure**: Docker/Docker Compose for containerization
- **Domain**: Registered domain with SSL certificate capability

### Accounts Needed
- **Vercel Account** (for frontend hosting)
- **Cloud Provider Account** (AWS, GCP, or Azure)
- **Domain Registrar Account**
- **Payment Processor Accounts** (Stripe, Razorpay)
- **Investment API Accounts** (Zerodha, Groww)

## Infrastructure Architecture

### Production Architecture Diagram
```
Internet
    │
    ▼
┌─────────────────┐
│   Load Balancer │
│   (Cloudflare)  │
└─────────────────┘
    │       │
    ▼       ▼
┌─────────┐ ┌─────────┐
│ Vercel  │ │Backend  │
│Frontend │ │Services │
└─────────┘ └─────────┘
    │           │
    ▼           ▼
┌─────────┐ ┌─────────┐
│  CDN    │ │Database │
│(Assets) │ │(Postgres)│
└─────────┘ └─────────┘
            │
            ▼
        ┌─────────┐
        │  Redis  │
        │(Caching)│
        └─────────┘
```

## Backend Deployment

### Database Setup (PostgreSQL)

#### Option 1: AWS RDS
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier oxfin-production \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username oxfin_admin \
  --master-user-password "secure_password_here" \
  --allocated-storage 100 \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted
```

#### Option 2: Supabase
1. Create account at supabase.com
2. Create new project
3. Get connection string from Settings > Database

#### Option 3: Self-hosted
```bash
# Production docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  pgdata:
```

### Redis Setup

#### Option 1: AWS ElastiCache
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id oxfin-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxxxxx
```

#### Option 2: Self-hosted Redis
```bash
# Add to docker-compose.yml
redis:
  image: redis:7-alpine
  restart: always
  command: redis-server --appendonly yes
  volumes:
    - redisdata:/data
  ports:
    - "6379:6379"
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 30s
    timeout: 10s
    retries: 3

volumes:
  redisdata:
```

### Database Initialization
```bash
# Run database migrations
psql $DATABASE_URL -f ox-fin-backend/infrastructure/init.sql

# Create indexes for performance
psql $DATABASE_URL -c "
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
"
```

## Frontend Deployment (Vercel)

### Vercel Configuration

#### vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "NEXTAUTH_URL": "https://yourdomain.com"
  }
}
```

### Environment Variables Setup
```bash
# Set environment variables in Vercel
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
vercel env add STRIPE_SECRET_KEY production
vercel env add KITE_API_KEY production
```

### Deployment Process
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Or deploy via Git integration
git push origin main
```

## Backend API Deployment

### Self-hosted Backend Setup

#### Production Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
```

#### docker-compose.production.yml
```yaml
version: '3.8'
services:
  oxfin-backend:
    build: .
    restart: always
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Cloud Provider Deployment

#### AWS Deployment
```bash
# Create EC2 instance
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-groups oxfin-security-group

# Deploy with Docker
ssh ec2-user@your-instance-ip
docker-compose -f docker-compose.production.yml up -d
```

#### GCP Deployment
```bash
# Create Compute Engine instance
gcloud compute instances create oxfin-backend \
  --machine-type e2-medium \
  --image-family ubuntu-2004-lts \
  --image-project ubuntu-os-cloud \
  --zone us-central1-a

# Deploy application
gcloud compute ssh oxfin-backend
docker-compose -f docker-compose.production.yml up -d
```

## Domain and SSL Configuration

### Domain Setup

#### DNS Configuration
```bash
# A Records
@    → YOUR_SERVER_IP
www  → YOUR_SERVER_IP

# CNAME for Vercel frontend
app  → cname.vercel-dns.com
```

#### SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Reverse Proxy Configuration (Nginx)

#### nginx.conf
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring and Logging

### Application Monitoring

#### Health Check Endpoint
```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    await query('SELECT 1');
    
    // Check Redis connection
    const redis = new Redis(process.env.REDIS_URL);
    await redis.ping();
    
    return NextResponse.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 503 }
    );
  }
}
```

#### Monitoring Setup
```bash
# Install monitoring tools
npm install @sentry/nextjs
npm install winston
```

### Log Management

#### Structured Logging
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Usage
logger.info('User login successful', { 
  userId: user.id, 
  ip: request.ip 
});
```

## Backup and Disaster Recovery

### Database Backup Strategy

#### Automated Backups
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backups/oxfin_backup_$DATE.sql

# Keep only last 30 days
find backups/ -name "oxfin_backup_*.sql" -mtime +30 -delete
```

#### Backup Schedule
```bash
# Add to crontab
0 2 * * * /path/to/backup_script.sh  # Daily at 2 AM
0 3 * * 0 /path/to/weekly_backup.sh  # Weekly on Sunday
```

### Recovery Procedures

#### Database Restoration
```bash
# Restore from backup
psql $DATABASE_URL < backups/oxfin_backup_20240115_020000.sql

# Verify restoration
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

## Performance Optimization

### Caching Strategy

#### Redis Caching Implementation
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache user data
export async function getCachedUser(userId: string) {
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);
  
  const user = await getUserFromDB(userId);
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user));
  return user;
}
```

### CDN Configuration

#### Static Asset Optimization
```next.config.js
const nextConfig = {
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/avif', 'image/webp']
  },
  experimental: {
    optimizeCss: true
  }
};
```

## Security Hardening

### Production Security Checklist

#### Server Security
- [ ] Firewall configuration (ufw/iptables)
- [ ] SSH key-only authentication
- [ ] Regular security updates
- [ ] Fail2ban installation
- [ ] Log monitoring setup

#### Application Security
- [ ] Environment variables secured
- [ ] Database connections encrypted
- [ ] API rate limiting enabled
- [ ] Security headers configured
- [ ] Regular dependency updates

### Security Configuration

#### Server Hardening
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Secure SSH
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
```

## Testing Production Deployment

### Pre-deployment Checklist

#### Functionality Tests
- [ ] User registration and login
- [ ] Wallet creation and management
- [ ] Fund transfers
- [ ] Investment order placement
- [ ] Payment processing
- [ ] MFA functionality

#### Performance Tests
- [ ] Load testing with 100+ concurrent users
- [ ] Response time under load
- [ ] Database query performance
- [ ] Memory usage monitoring

#### Security Tests
- [ ] SSL certificate validation
- [ ] Security header verification
- [ ] Input validation testing
- [ ] Authentication flow testing

### Testing Commands
```bash
# Health check
curl -I https://yourdomain.com/health

# API testing
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Performance testing
npm install -g artillery
artillery quick --count 100 --num 50 https://yourdomain.com/api/health
```

## Maintenance and Updates

### Update Procedures

#### Frontend Updates
```bash
# Pull latest changes
git pull origin main

# Deploy to Vercel
vercel --prod
```

#### Backend Updates
```bash
# Update backend service
cd /path/to/backend
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Maintenance Windows
- **Weekly**: Security updates (2 AM Sunday)
- **Monthly**: Database maintenance (First Saturday)
- **Quarterly**: Full system audit and optimization

This deployment guide provides a comprehensive framework for deploying the OxFin platform to production. Always test thoroughly in a staging environment before production deployment.
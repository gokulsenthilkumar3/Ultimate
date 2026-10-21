# Development Guide

## Getting Started

### Prerequisites
Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Docker** and **Docker Compose**
- **Git**
- **PostgreSQL** client (psql)

### Initial Setup

1. **Clone the Repository**
```bash
git clone <repository-url>
cd AntiGravity-Finance
```

2. **Start Backend Services**
```bash
cd ox-fin-backend
docker-compose up -d
```

3. **Install Frontend Dependencies**
```bash
cd ../ox-fin-web
npm install
```

4. **Configure Environment Variables**
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:
```bash
# Database Configuration
DATABASE_URL=postgresql://oxfin_user:oxfin_pass@localhost:5432/oxfin

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_super_secret_key_here

# Feature Flags
OXFIN_PAYMENT_PROVIDER=stripe
OXFIN_INVESTMENT_PROVIDER=zerodha

# API Keys (Development placeholders)
STRIPE_SECRET_KEY=sk_test_placeholder
RAZORPAY_KEY_ID=rzp_test_placeholder
KITE_API_KEY=placeholder_api_key
```

5. **Run Development Server**
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Project Structure

### Directory Layout
```
ox-fin-web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── [page]/           # Page components
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/            # Reusable components
│   │   ├── auth/             # Authentication components
│   │   ├── layout/           # Layout components
│   │   └── ui/               # UI components
│   ├── lib/                  # Business logic
│   │   ├── investments/      # Investment providers
│   │   ├── payments/         # Payment providers
│   │   └── utils.ts          # Utility functions
│   ├── guards/               # Security middleware
│   └── types/                # TypeScript interfaces
├── public/                   # Static assets
├── scripts/                  # Development scripts
└── tests/                    # Test files
```

## Development Workflow

### Creating New Features

1. **Create a Feature Branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Implement Your Feature**
- Follow the existing component structure
- Use TypeScript for type safety
- Implement proper error handling
- Write unit tests

3. **Code Quality Checks**
```bash
npm run lint          # Check for linting errors
npm run type-check    # TypeScript compilation check
npm test              # Run tests
```

4. **Commit Your Changes**
```bash
git add .
git commit -m "feat: add your feature description"
```

### Component Development

#### Creating a New Component
```typescript
// src/components/ui/YourComponent.tsx
'use client';

import { cn } from '@/lib/utils';

interface YourComponentProps {
  className?: string;
  // Add your props here
}

export default function YourComponent({ 
  className,
  ...props 
}: YourComponentProps) {
  return (
    <div className={cn('base-styles', className)} {...props}>
      {/* Your component content */}
    </div>
  );
}
```

#### Component Guidelines
- Use functional components with TypeScript interfaces
- Implement proper prop typing
- Use the `cn` utility for conditional class names
- Add `'use client'` directive for client components
- Follow existing styling patterns

### API Route Development

#### Creating a New API Endpoint
```typescript
// src/app/api/your-endpoint/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Your business logic here
    const data = await fetchData();
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}
```

#### API Best Practices
- Always validate authentication
- Implement proper error handling
- Use consistent response formats
- Add input validation with Zod
- Include security middleware

### Database Operations

#### Adding New Database Queries
```typescript
// src/lib/db.ts
import { query } from '@/lib/db';

export async function getUserWallets(userId: string) {
  const result = await query(
    `SELECT id, balance, currency, type 
     FROM wallets 
     WHERE user_id = $1 
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}
```

#### Database Migration
1. Update `ox-fin-backend/infrastructure/init.sql`
2. Add new table/column definitions
3. Restart Docker containers to apply changes
4. Test the new schema

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/components/Button.test.tsx

# Run with coverage
npm run test:coverage
```

### Writing Tests
```typescript
// Example component test
import { render, screen } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### API Route Testing
```typescript
// Example API test
import { GET } from '@/app/api/user/balance/route';
import { createMockRequest } from '@/lib/test-utils';

describe('Balance API', () => {
  it('returns user balance', async () => {
    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('totalBalance');
  });
});
```

## Styling Guidelines

### CSS Architecture
- Use Tailwind CSS utility classes
- Follow the existing design system
- Maintain consistency with color palette
- Use the `cn` utility for conditional classes

### Design System
```css
/* Color Palette */
--primary: hsl(221, 83%, 53%);    /* Blue */
--success: hsl(142, 70%, 45%);    /* Green */
--error: hsl(0, 84%, 60%);        /* Red */
--background: hsl(210, 40%, 98%); /* Light background */

/* Spacing System */
--grid-unit: 4px;
--space-1: 4px;
--space-2: 8px;
--space-4: 16px;
--space-8: 32px;
```

### Component Styling Example
```typescript
export default function Card({ 
  className, 
  variant = 'default',
  ...props 
}: CardProps) {
  const baseClasses = 'rounded-2xl border p-6 transition-all';
  const variants = {
    default: 'bg-white border-slate-200',
    elevated: 'bg-white border-slate-200 shadow-lg',
    glass: 'bg-white/80 backdrop-blur-xl border-white/20'
  };

  return (
    <div 
      className={cn(baseClasses, variants[variant], className)} 
      {...props}
    />
  );
}
```

## Security Best Practices

### Authentication
- Always validate session tokens
- Implement proper role-based access control
- Use secure password hashing (bcrypt)
- Enable MFA for sensitive operations

### Input Validation
```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(12)
});

// Validate input
const result = UserSchema.safeParse(userData);
if (!result.success) {
  return NextResponse.json(
    { error: 'Invalid input', issues: result.error.issues },
    { status: 400 }
  );
}
```

### Security Headers
All API responses should include security headers:
```typescript
const headers = {
  'Content-Security-Policy': "default-src 'self'",
  'Strict-Transport-Security': 'max-age=15768000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff'
};
```

## Performance Optimization

### Code Splitting
```typescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  ssr: false,
  loading: () => <div>Loading chart...</div>
});
```

### Image Optimization
```typescript
import Image from 'next/image';

export default function OptimizedImage() {
  return (
    <Image
      src="/path/to/image.jpg"
      alt="Description"
      width={800}
      height={600}
      quality={85}
      priority // For above-the-fold images
    />
  );
}
```

### Database Query Optimization
```typescript
// Use indexes and efficient queries
const getUserData = async (userId: string) => {
  // Use specific columns instead of SELECT *
  const result = await query(
    `SELECT u.id, u.name, u.email, w.balance
     FROM users u
     JOIN wallets w ON u.id = w.user_id
     WHERE u.id = $1
     LIMIT 1`,
    [userId]
  );
  return result.rows[0];
};
```

## Debugging

### Browser Debugging
- Use React DevTools extension
- Enable React strict mode in development
- Use console.log strategically with context
- Monitor Network tab for API calls

### Server-side Debugging
```typescript
// Add detailed logging
console.log('Debug info:', {
  userId: session?.user?.id,
  timestamp: new Date().toISOString(),
  payload: requestBody
});
```

### Error Tracking
```typescript
// Implement error boundaries
'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Deployment

### Local Development
```bash
# Start development server
npm run dev

# Build for production testing
npm run build
npm start
```

### Production Deployment
1. Set production environment variables
2. Build the application:
```bash
npm run build
```
3. Deploy to Vercel or your preferred hosting platform
4. Configure domain and SSL certificates

### Environment Variables for Production
```bash
# Production configuration
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_production_secret
DATABASE_URL=postgresql://user:pass@prod-db:5432/db
```

## Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check if Docker containers are running
docker-compose ps

# Restart database containers
docker-compose restart postgres

# Check database logs
docker-compose logs postgres
```

**Authentication Not Working**
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your domain
- Ensure database is properly initialized

**Build Errors**
```bash
# Clear build cache
rm -rf .next
npm run build

# Check TypeScript errors
npm run type-check
```

### Getting Help
- Check existing documentation
- Review GitHub issues
- Contact the development team
- Use proper logging for debugging

This guide provides comprehensive instructions for developing, testing, and maintaining the OxFin application. Always follow security best practices and coding standards when contributing to the project.
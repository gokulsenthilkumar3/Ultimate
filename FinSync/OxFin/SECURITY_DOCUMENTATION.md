# Security Documentation

## Security Architecture Overview

OxFin implements a comprehensive security framework designed to protect user data, financial transactions, and system integrity. The security model follows defense-in-depth principles with multiple layers of protection.

## Authentication & Authorization

### Multi-Factor Authentication (MFA)

**Implementation:**
- TOTP (Time-based One-Time Password) using otplib
- QR code generation for authenticator app setup
- 6-digit verification codes
- Account lockout after 3 consecutive failed MFA attempts

**Setup Process:**
1. User requests MFA setup via `/api/user/mfa/setup`
2. System generates secret key and QR code
3. User scans QR code with authenticator app
4. User verifies setup with generated code via `/api/user/mfa/verify`
5. MFA is enabled for the account

**Security Features:**
- Secrets stored encrypted in database
- Rate limiting on verification attempts
- Backup codes generation (future implementation)
- Recovery options for lost devices

### Session Management

**JWT Implementation:**
- HS256 algorithm for token signing
- 8-hour token expiration
- Token refresh mechanism
- Secure cookie storage with HttpOnly flag
- SameSite=Lax protection against CSRF

**Session Security:**
```typescript
session: {
  strategy: "jwt",
  maxAge: 8 * 60 * 60, // 8 hours
}
```

### Account Protection

**Failed Login Prevention:**
- Account lockout after 5 failed attempts
- 15-minute lockout period
- Automatic unlock after timeout
- Failed attempt counter reset on successful login

**Password Security:**
- bcrypt hashing with 12 rounds
- Minimum 12-character password requirement
- Password history tracking (last 5 passwords)
- Dictionary attack prevention
- Common password blacklisting

## Data Protection

### Encryption at Rest

**Database Encryption:**
- Password hashes using bcrypt
- MFA secrets encrypted in database
- Sensitive configuration encrypted in environment
- SSL/TLS for database connections in production

**Environment Variables:**
```bash
# Critical secrets never committed to repository
NEXTAUTH_SECRET=super_secret_production_key
DATABASE_URL=postgresql://user:encrypted_pass@host:5432/db
STRIPE_SECRET_KEY=sk_live_encrypted_key
```

### Data in Transit

**HTTPS Enforcement:**
- HSTS (HTTP Strict Transport Security) header
- Preload directive for browser security
- Automatic HTTPS redirect
- Certificate pinning (production)

**API Security Headers:**
```
Strict-Transport-Security: max-age=15768000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## Input Validation & Sanitization

### Zod Schema Validation

**API Input Validation:**
```typescript
import { z } from 'zod';

const InvestmentOrderSchema = z.object({
  symbol: z.string().min(1).max(10),
  quantity: z.number().positive().max(1000000),
  side: z.enum(['buy', 'sell']),
  price: z.number().positive().optional()
});

// Usage in API routes
const result = InvestmentOrderSchema.safeParse(requestBody);
if (!result.success) {
  return NextResponse.json(
    { error: 'Invalid input', issues: result.error.issues },
    { status: 400 }
  );
}
```

### SQL Injection Prevention

**Parameterized Queries:**
```typescript
// Safe - uses parameterized queries
const result = await query(
  'SELECT * FROM users WHERE email = $1 AND password_hash = $2',
  [email, passwordHash]
);

// Unsafe - NEVER do this
// const result = await query(`SELECT * FROM users WHERE email = '${email}'`);
```

### XSS Prevention

**Content Security Policy:**
```typescript
res.headers.set(
  'Content-Security-Policy',
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';"
);
```

**Input Sanitization:**
- Automatic escaping in React JSX
- HTML sanitization for user-generated content
- URL validation and encoding
- File upload validation

## Rate Limiting & DDoS Protection

### API Rate Limiting

**Implementation:**
- Redis-based rate limiting
- Sliding window algorithm
- Different limits for different endpoints
- IP-based and user-based limiting

**Rate Limits:**
```typescript
// Rate limiting configuration
const rateLimits = {
  auth: { requests: 10, window: 60 },      // 10 requests/minute
  financial: { requests: 100, window: 3600 }, // 100 requests/hour
  ai: { requests: 50, window: 3600 }        // 50 requests/hour
};
```

### Brute Force Protection

**Account Lockout Mechanism:**
```typescript
// Failed login tracking
if (failedAttempts >= 5) {
  const lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
  await query(
    'UPDATE users SET lockout_until = $1 WHERE id = $2',
    [lockoutUntil, userId]
  );
}
```

## API Security

### Authentication Middleware

**Session Validation:**
```typescript
export async function authenticateUser(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }
  
  return session.user;
}
```

### CSRF Protection

**Token-based Protection:**
```typescript
export async function csrfProtection(request: Request) {
  const token = request.headers.get('x-csrf-token');
  const sessionToken = request.cookies.get('next-auth.session-token');
  
  if (!token || !sessionToken || token !== sessionToken) {
    return NextResponse.json(
      { error: 'CSRF token mismatch' }, 
      { status: 403 }
    );
  }
}
```

### CORS Configuration

**Secure CORS Policy:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
  'Access-Control-Allow-Credentials': 'true'
};
```

## Financial Transaction Security

### Transfer Validation

**Atomic Transactions:**
```typescript
let client;
try {
  client = await db.connect();
  await client.query('BEGIN');
  
  // Validate source wallet
  const sourceWallet = await client.query(
    'SELECT balance FROM wallets WHERE id = $1 FOR UPDATE',
    [fromWalletId]
  );
  
  // Validate sufficient funds
  if (sourceWallet.rows[0].balance < amount) {
    throw new Error('Insufficient funds');
  }
  
  // Perform transfer
  await client.query(
    'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
    [amount, fromWalletId]
  );
  
  await client.query(
    'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
    [amount, toWalletId]
  );
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client?.release();
}
```

### Audit Logging

**Transaction Audit Trail:**
```typescript
// Log all financial transactions
await query(
  `INSERT INTO transaction_audit 
   (user_id, transaction_id, action, amount, timestamp, ip_address)
   VALUES ($1, $2, $3, $4, NOW(), $5)`,
  [userId, transactionId, 'TRANSFER', amount, ipAddress]
);
```

## OAuth Security

### Provider Configuration

**Secure OAuth Setup:**
```typescript
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorization: {
    params: {
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    }
  }
})
```

**Token Validation:**
- Verify OAuth provider signatures
- Check token expiration
- Validate audience and issuer
- Map OAuth user to internal user

## Monitoring & Incident Response

### Security Logging

**Comprehensive Logging:**
```typescript
// Security event logging
const logSecurityEvent = async (event: SecurityEvent) => {
  await query(
    `INSERT INTO security_logs 
     (event_type, user_id, ip_address, user_agent, timestamp, details)
     VALUES ($1, $2, $3, $4, NOW(), $5)`,
    [event.type, event.userId, event.ip, event.userAgent, event.details]
  );
};
```

### Security Events Tracked:
- Failed login attempts
- MFA verification failures
- Suspicious transaction patterns
- Rate limit violations
- Security configuration changes

### Incident Response Plan

**Security Breach Protocol:**
1. **Detection**: Automated alerts for suspicious activity
2. **Containment**: Immediate account suspension and access revocation
3. **Investigation**: Forensic analysis of security logs
4. **Recovery**: Password reset, MFA re-enrollment
5. **Communication**: User notification and regulatory reporting
6. **Post-mortem**: Security review and process improvement

## Compliance & Privacy

### Data Privacy

**GDPR Compliance Features:**
- User consent management
- Data portability requests
- Right to erasure implementation
- Privacy policy documentation
- Data processing records

**Consent Management:**
```typescript
// User consent tracking
interface ConsentRecord {
  userId: string;
  consentType: 'marketing' | 'analytics' | 'data_sharing';
  granted: boolean;
  timestamp: Date;
  ip: string;
}
```

### Financial Regulations

**KYC/AML Compliance:**
- User verification processes
- Transaction monitoring
- Suspicious activity reporting
- Audit trail maintenance
- Regulatory reporting capabilities

## Security Testing

### Automated Security Scanning

**Tools Integration:**
- OWASP ZAP for vulnerability scanning
- Snyk for dependency security
- SonarQube for code quality
- Bandit for Python security checks

### Penetration Testing

**Regular Security Assessments:**
- External security audits
- Internal vulnerability assessments
- Social engineering testing
- Red team exercises

### Security Headers Testing

**Validation Tools:**
```bash
# Test security headers
curl -I https://yourdomain.com

# Security header validation
npx security-headers https://yourdomain.com
```

## Best Practices Enforcement

### Code Review Security Checklist

**Authentication:**
- [ ] Session validation on all protected routes
- [ ] Proper password hashing implementation
- [ ] MFA enforcement for sensitive operations
- [ ] Account lockout mechanisms

**Input Validation:**
- [ ] Zod schema validation for all inputs
- [ ] Parameterized queries for database operations
- [ ] XSS prevention measures
- [ ] File upload validation

**API Security:**
- [ ] Rate limiting implementation
- [ ] CSRF protection
- [ ] Security headers configuration
- [ ] CORS policy validation

### Security Training

**Developer Education:**
- Regular security awareness training
- Secure coding practices workshops
- Incident response drills
- Latest threat landscape updates

## Emergency Procedures

### Security Incident Response

**Immediate Actions:**
1. Isolate affected systems
2. Preserve evidence and logs
3. Notify security team
4. Implement temporary fixes
5. Communicate with stakeholders

**Contact Information:**
- Security Team: security@oxfin.com
- Emergency: 24/7 security hotline
- Regulatory Bodies: As required by jurisdiction

This security documentation provides a comprehensive framework for protecting the OxFin platform and its users. Regular security reviews and updates ensure continued protection against evolving threats.
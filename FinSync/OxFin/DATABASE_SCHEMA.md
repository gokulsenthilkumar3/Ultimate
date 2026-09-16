# DATABASE_SCHEMA.md

# Database Schema Documentation

## Overview

This document describes the complete database schema for the OxFin financial platform. The schema is designed to support all core financial operations while maintaining data integrity, security, and performance.

## Database Structure

### Core Tables

#### 1. Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified TIMESTAMP,
    image TEXT,
    password_hash VARCHAR(255), -- Nullable for OAuth users
    role VARCHAR(50) DEFAULT 'user',
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    failed_login_attempts INTEGER DEFAULT 0,
    lockout_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

**Fields Description:**
- `id`: Unique user identifier
- `name`: User's full name
- `email`: Unique email address (authentication)
- `email_verified`: Email verification timestamp
- `image`: Profile image URL
- `password_hash`: bcrypt hashed password
- `role`: User role (user, admin, moderator)
- `two_factor_enabled`: MFA status flag
- `two_factor_secret`: Encrypted TOTP secret
- `failed_login_attempts`: Consecutive failed login count
- `lockout_until`: Account lockout expiration
- `created_at/updated_at`: Timestamps for audit trail

#### 2. Wallets Table
```sql
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL,
    type VARCHAR(20) DEFAULT 'full', -- 'full' or 'lite'
    interest_rate DECIMAL(5,2) DEFAULT 0.00,
    daily_limit NUMERIC(12,2) DEFAULT 999999.99,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_currency ON wallets(currency);
CREATE INDEX idx_wallets_type ON wallets(type);
```

**Fields Description:**
- `id`: Unique wallet identifier
- `user_id`: Foreign key to users table
- `balance`: Current wallet balance
- `currency`: Currency code (INR, USD, OX, etc.)
- `type`: Wallet type (full/lite)
- `interest_rate`: Annual interest rate percentage
- `daily_limit`: Maximum daily transaction limit
- `created_at/updated_at`: Audit timestamps

#### 3. Transactions Table
```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER REFERENCES wallets(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'credit', 'debit', 'transfer'
    description TEXT,
    category VARCHAR(50),
    reference_id VARCHAR(100), -- External reference (payment ID, order ID)
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'reversed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_category ON transactions(category);
```

**Fields Description:**
- `id`: Unique transaction identifier
- `wallet_id`: Related wallet
- `amount`: Transaction amount (positive for credit, negative for debit)
- `type`: Transaction type classification
- `description`: Transaction description
- `category`: Spending/income category
- `reference_id`: External system reference
- `status`: Current transaction status
- `created_at/updated_at`: Timestamps

### NextAuth Standard Tables

#### 4. Accounts Table
```sql
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type VARCHAR(255),
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_account_id)
);

-- Indexes
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_provider ON accounts(provider);
```

#### 5. Sessions Table
```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires);
```

#### 6. Verification Tokens Table
```sql
CREATE TABLE verification_tokens (
    identifier VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(identifier, token)
);
```

### Security Tables

#### 7. Password History Table
```sql
CREATE TABLE password_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_password_history_user_id ON password_history(user_id);
CREATE INDEX idx_password_history_created_at ON password_history(created_at);
```

#### 8. Security Logs Table
```sql
CREATE TABLE security_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at);
CREATE INDEX idx_security_logs_ip_address ON security_logs(ip_address);
```

### Investment Tables

#### 9. Investment Holdings Table
```sql
CREATE TABLE investment_holdings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    quantity DECIMAL(16,8) NOT NULL,
    average_price NUMERIC(12,2) NOT NULL,
    current_price NUMERIC(12,2),
    invested_amount NUMERIC(12,2) NOT NULL,
    current_value NUMERIC(12,2),
    provider VARCHAR(50) DEFAULT 'zerodha', -- 'zerodha', 'groww'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_investment_holdings_user_id ON investment_holdings(user_id);
CREATE INDEX idx_investment_holdings_symbol ON investment_holdings(symbol);
CREATE INDEX idx_investment_holdings_provider ON investment_holdings(provider);
```

#### 10. Investment Orders Table
```sql
CREATE TABLE investment_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    quantity DECIMAL(16,8) NOT NULL,
    side VARCHAR(10) NOT NULL, -- 'buy' or 'sell'
    order_type VARCHAR(20) DEFAULT 'market', -- 'market', 'limit', 'stoploss'
    price NUMERIC(12,2), -- For limit orders
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'placed', 'executed', 'cancelled', 'rejected'
    provider_order_id VARCHAR(100), -- External order ID from broker
    provider VARCHAR(50) DEFAULT 'zerodha',
    executed_price NUMERIC(12,2),
    executed_quantity DECIMAL(16,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_investment_orders_user_id ON investment_orders(user_id);
CREATE INDEX idx_investment_orders_symbol ON investment_orders(symbol);
CREATE INDEX idx_investment_orders_status ON investment_orders(status);
CREATE INDEX idx_investment_orders_created_at ON investment_orders(created_at);
```

### Payment Tables

#### 11. Payment Methods Table
```sql
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'card', 'bank', 'upi', 'wallet'
    provider VARCHAR(50), -- 'stripe', 'razorpay', 'upi'
    last4 VARCHAR(4),
    expiry_month INTEGER,
    expiry_year INTEGER,
    name VARCHAR(100), -- Cardholder/bank account name
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    metadata JSONB, -- Additional provider-specific data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_type ON payment_methods(type);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(is_default);
```

#### 12. Payments Table
```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    payment_method_id INTEGER REFERENCES payment_methods(id),
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'succeeded', 'failed', 'cancelled'
    provider VARCHAR(50), -- 'stripe', 'razorpay'
    provider_payment_id VARCHAR(100), -- External payment ID
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider ON payments(provider);
CREATE INDEX idx_payments_created_at ON payments(created_at);
```

### Bill Management Tables

#### 13. Billers Table
```sql
CREATE TABLE billers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'electricity', 'water', 'telecom', 'insurance'
    provider_id VARCHAR(100), -- External biller ID
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_billers_category ON billers(category);
CREATE INDEX idx_billers_is_active ON billers(is_active);
```

#### 14. User Bills Table
```sql
CREATE TABLE user_bills (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    biller_id INTEGER REFERENCES billers(id),
    bill_number VARCHAR(100),
    amount NUMERIC(12,2) NOT NULL,
    due_date DATE NOT NULL,
    billing_period_start DATE,
    billing_period_end DATE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
    auto_pay_enabled BOOLEAN DEFAULT FALSE,
    auto_pay_method_id INTEGER REFERENCES payment_methods(id),
    paid_at TIMESTAMP,
    payment_id INTEGER REFERENCES payments(id),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_bills_user_id ON user_bills(user_id);
CREATE INDEX idx_user_bills_biller_id ON user_bills(biller_id);
CREATE INDEX idx_user_bills_due_date ON user_bills(due_date);
CREATE INDEX idx_user_bills_status ON user_bills(status);
```

### Consent and Privacy Tables

#### 15. User Consent Table
```sql
CREATE TABLE user_consent (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL, -- 'marketing', 'analytics', 'data_sharing'
    granted BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, consent_type)
);

-- Indexes
CREATE INDEX idx_user_consent_user_id ON user_consent(user_id);
CREATE INDEX idx_user_consent_consent_type ON user_consent(consent_type);
```

### Audit and Analytics Tables

#### 16. Transaction Audit Table
```sql
CREATE TABLE transaction_audit (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'transfer'
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_transaction_audit_transaction_id ON transaction_audit(transaction_id);
CREATE INDEX idx_transaction_audit_user_id ON transaction_audit(user_id);
CREATE INDEX idx_transaction_audit_action ON transaction_audit(action);
```

#### 17. User Activity Log Table
```sql
CREATE TABLE user_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_activity_type ON user_activity_log(activity_type);
CREATE INDEX idx_user_activity_log_created_at ON user_activity_log(created_at);
```

## Relationships Diagram

```
users
├── wallets (1:N)
│   ├── transactions (1:N)
│   └── payment_methods (1:N)
├── accounts (1:N)
├── sessions (1:N)
├── password_history (1:N)
├── security_logs (1:N)
├── investment_holdings (1:N)
├── investment_orders (1:N)
├── payments (1:N)
├── user_bills (1:N)
├── user_consent (1:N)
├── transaction_audit (1:N)
└── user_activity_log (1:N)

billers (1:N)
└── user_bills

payment_methods (1:N)
├── payments
└── user_bills (auto_pay_method_id)
```

## Data Integrity Constraints

### Foreign Key Constraints
- All foreign keys use `ON DELETE CASCADE` for automatic cleanup
- User deletion cascades to all related data
- Wallet deletion cascades to transactions

### Check Constraints
```sql
-- Ensure positive balances
ALTER TABLE wallets ADD CONSTRAINT check_wallet_balance 
CHECK (balance >= 0);

-- Ensure valid transaction types
ALTER TABLE transactions ADD CONSTRAINT check_transaction_type
CHECK (type IN ('credit', 'debit', 'transfer'));

-- Ensure valid investment order sides
ALTER TABLE investment_orders ADD CONSTRAINT check_order_side
CHECK (side IN ('buy', 'sell'));

-- Ensure valid payment statuses
ALTER TABLE payments ADD CONSTRAINT check_payment_status
CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled'));
```

### Unique Constraints
- User email addresses (users.email)
- Session tokens (sessions.session_token)
- Provider account combinations (accounts.provider + provider_account_id)
- Verification tokens (verification_tokens.token)
- User consent types (user_consent.user_id + consent_type)

## Performance Optimization

### Indexing Strategy
- Primary keys automatically indexed
- Foreign key columns indexed for JOIN performance
- Frequently queried columns indexed
- Composite indexes for multi-column queries
- Partial indexes for filtered queries

### Partitioning (for large datasets)
```sql
-- Example: Partition transactions by year
CREATE TABLE transactions_2024 (
    CHECK (created_at >= DATE '2024-01-01' AND created_at < DATE '2025-01-01')
) INHERITS (transactions);

CREATE TABLE transactions_2025 (
    CHECK (created_at >= DATE '2025-01-01' AND created_at < DATE '2026-01-01')
) INHERITS (transactions);
```

## Security Considerations

### Data Encryption
- Passwords: bcrypt hashing with 12 rounds
- MFA secrets: AES-256 encryption
- Sensitive PII: Database-level encryption
- Connection: SSL/TLS for data in transit

### Access Control
- Row-level security policies
- Role-based access control
- Audit logging for all data access
- Session-based authentication

### Backup and Recovery
- Daily automated backups
- Point-in-time recovery capability
- Cross-region backup storage
- Regular restore testing

## Migration Scripts

### Initial Setup
```sql
-- Run this to initialize the database
\i infrastructure/init.sql
```

### Version Updates
```sql
-- Migration from v1.0 to v1.1
ALTER TABLE wallets ADD COLUMN interest_rate DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE wallets ADD COLUMN daily_limit NUMERIC(12,2) DEFAULT 999999.99;
CREATE INDEX idx_wallets_interest_rate ON wallets(interest_rate);
```

This schema documentation provides a complete reference for the OxFin database structure, relationships, and implementation details for developers and database administrators.
-- init.sql for OxFin backend
-- Create tables for the application
BEGIN;

-- Users table extended for NextAuth and custom security
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

-- Accounts table for OAuth providers (NextAuth standard)
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
    UNIQUE(provider, provider_account_id)
);

-- Sessions table for database strategies (NextAuth standard)
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMP NOT NULL
);

-- Verification tokens for passwordless/email flows (NextAuth standard)
CREATE TABLE verification_tokens (
    identifier VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires TIMESTAMP NOT NULL,
    UNIQUE(identifier, token)
);

-- Password History for policy enforcement (Custom)
CREATE TABLE password_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business Domain Tables
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL,
    type VARCHAR(20) DEFAULT 'full', -- 'full' or 'lite'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type VARCHAR(20) NOT NULL, -- e.g., 'deposit', 'withdrawal'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Fail rather than discard or silently repair unowned financial records.
ALTER TABLE wallets ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN wallet_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS wallets_user_id_idx ON wallets(user_id);
CREATE INDEX IF NOT EXISTS transactions_wallet_created_idx ON transactions(wallet_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts(user_id);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS password_history_user_id_idx ON password_history(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS transfer_requests (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    request_key VARCHAR(128) NOT NULL,
    fingerprint TEXT NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, request_key)
);
-- Unconstrained NUMERIC plus explicit precision checks rejects excess decimals
-- rather than letting NUMERIC(12,2) silently round a submitted amount.
ALTER TABLE wallets ADD CONSTRAINT wallets_balance_valid
    CHECK (balance >= 0 AND balance <= 9999999999.99 AND scale(balance) <= 2);
ALTER TABLE wallets ADD CONSTRAINT wallets_currency_valid CHECK (currency ~ '^[A-Z]{3}$');
ALTER TABLE transactions ADD CONSTRAINT transactions_amount_valid
    CHECK (abs(amount) <= 9999999999.99 AND scale(amount) <= 2);
COMMIT;

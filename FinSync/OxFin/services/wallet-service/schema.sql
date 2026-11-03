-- Reference prototype only. Apply to the database selected by WALLET_DB_URL,
-- never to the legacy OxFin web database (its wallets use integer IDs).
BEGIN;
CREATE TABLE wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL CHECK (length(user_id) > 0),
    currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0 AND balance < 'Infinity'::numeric),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wallets_user_created_idx ON wallets(user_id, created_at, id);
COMMIT;

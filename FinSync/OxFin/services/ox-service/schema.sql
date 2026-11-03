-- Reference prototype only: use OX_DB_URL, separate from the legacy web DB.
-- OX fractional precision is intentionally retained; it is not a fiat-cent unit.
BEGIN;
CREATE TABLE ox_wallets (
    user_id TEXT PRIMARY KEY CHECK (length(user_id) > 0),
    balance_ox NUMERIC NOT NULL DEFAULT 0 CHECK (balance_ox >= 0 AND balance_ox < 'Infinity'::numeric),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE ox_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES ox_wallets(user_id) ON DELETE RESTRICT,
    type TEXT NOT NULL CHECK (type IN ('buy','transfer_out','transfer_in')),
    amount_ox NUMERIC NOT NULL CHECK (amount_ox > 0 AND amount_ox < 'Infinity'::numeric),
    fee_ox NUMERIC NOT NULL DEFAULT 0 CHECK (fee_ox >= 0 AND fee_ox < 'Infinity'::numeric),
    counterparty_user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ox_transactions_user_created_idx ON ox_transactions(user_id, created_at DESC, id);
COMMIT;

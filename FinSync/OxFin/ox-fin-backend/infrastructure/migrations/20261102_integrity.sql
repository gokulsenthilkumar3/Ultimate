BEGIN;
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
COMMIT;

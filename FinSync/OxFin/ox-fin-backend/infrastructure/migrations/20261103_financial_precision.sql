BEGIN;
-- Keep existing numeric values exactly as stored. Abort on invalid existing data;
-- no balances, ownership, or ledger entries are rewritten by this migration.
ALTER TABLE wallets ALTER COLUMN balance TYPE NUMERIC;
ALTER TABLE transactions ALTER COLUMN amount TYPE NUMERIC;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'wallets'::regclass AND conname = 'wallets_balance_valid') THEN
        ALTER TABLE wallets ADD CONSTRAINT wallets_balance_valid
            CHECK (balance >= 0 AND balance <= 9999999999.99 AND scale(balance) <= 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'wallets'::regclass AND conname = 'wallets_currency_valid') THEN
        ALTER TABLE wallets ADD CONSTRAINT wallets_currency_valid CHECK (currency ~ '^[A-Z]{3}$');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'transactions'::regclass AND conname = 'transactions_amount_valid') THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_amount_valid
            CHECK (abs(amount) <= 9999999999.99 AND scale(amount) <= 2);
    END IF;
END $$;
COMMIT;

-- Reference prototype only: PAYMENTS_DB_URL owns this database. User IDs are
-- external identity references, not foreign keys into the legacy web database.
BEGIN;
CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL CHECK (length(user_id) > 0),
    source TEXT NOT NULL,
    destination TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0 AND amount < 'Infinity'::numeric),
    currency TEXT NOT NULL,
    country TEXT NOT NULL,
    rail TEXT NOT NULL CHECK (rail IN ('UPI','IMPS','NEFT','RTGS','ACH','SEPA','SWIFT','OX')),
    purpose_code TEXT,
    status TEXT NOT NULL CHECK (status IN ('created','pending','processing','succeeded','failed')),
    external_reference TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_user_created_idx ON payments(user_id, created_at DESC, id);
COMMIT;

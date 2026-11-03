-- Reference prototype only. The BILLS_DB_URL database owns bills and rules;
-- biller/user IDs are external references supplied by their owning services.
BEGIN;
CREATE TABLE bills (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL CHECK (length(user_id) > 0),
    biller_id TEXT NOT NULL,
    country TEXT NOT NULL,
    service_type TEXT NOT NULL,
    amount_due NUMERIC NOT NULL CHECK (amount_due > 0 AND amount_due < 'Infinity'::numeric),
    currency TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('detected','pending_approval','scheduled','paid','failed','cancelled')),
    source TEXT NOT NULL CHECK (source IN ('sms','email','whatsapp','manual','api')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE autopay_rules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL CHECK (length(user_id) > 0),
    biller_id TEXT NOT NULL,
    funding_source TEXT NOT NULL CHECK (funding_source IN ('wallet','ox','card')),
    type TEXT NOT NULL CHECK (type IN ('fixed_amount','full_statement')),
    schedule TEXT NOT NULL CHECK (schedule = 'on_due_date'),
    max_amount_per_charge NUMERIC CHECK (max_amount_per_charge > 0 AND max_amount_per_charge < 'Infinity'::numeric),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX bills_user_due_idx ON bills(user_id, due_date, id);
CREATE INDEX bills_scheduled_due_idx ON bills(due_date) WHERE status = 'scheduled';
CREATE INDEX autopay_rules_user_created_idx ON autopay_rules(user_id, created_at DESC, id);
CREATE INDEX autopay_rules_active_biller_idx ON autopay_rules(user_id, biller_id) WHERE active;
COMMIT;

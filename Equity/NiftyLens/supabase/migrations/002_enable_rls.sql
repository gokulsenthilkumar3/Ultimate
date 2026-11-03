-- Legacy Supabase backend only. The current client uses src/lib/firestore.ts.
-- Keep the historical SQL installation replayable for legacy consumers.
CREATE TABLE IF NOT EXISTS public.watchlists (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 symbol text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, symbol)
);
CREATE TABLE IF NOT EXISTS public.portfolios (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 symbol text NOT NULL,
 qty numeric NOT NULL CHECK(qty > 0),
 avg_price numeric NOT NULL CHECK(avg_price >= 0),
 buy_date date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portfolios_user_id_idx ON public.portfolios(user_id);
CREATE TABLE IF NOT EXISTS public.alerts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 symbol text NOT NULL,
 condition text NOT NULL CHECK(condition IN ('above', 'below')),
 threshold numeric NOT NULL CHECK(threshold > 0),
 channel text NOT NULL CHECK(channel IN ('email', 'telegram')),
 triggered_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alerts_user_id_idx ON public.alerts(user_id);

-- Migration 002: Enable Row Level Security on user-scoped tables
-- Run this in Supabase SQL editor or via supabase db push

-- ── watchlists ──────────────────────────────────────────
alter table watchlists enable row level security;

create policy "Users can read own watchlists"
  on watchlists for select
  using (auth.uid() = user_id);

create policy "Users can insert own watchlists"
  on watchlists for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own watchlists"
  on watchlists for delete
  using (auth.uid() = user_id);


-- ── portfolios ──────────────────────────────────────────
alter table portfolios enable row level security;

create policy "Users can read own portfolio"
  on portfolios for select
  using (auth.uid() = user_id);

create policy "Users can insert own portfolio"
  on portfolios for insert
  with check (auth.uid() = user_id);

create policy "Users can update own portfolio"
  on portfolios for update
  using (auth.uid() = user_id);

create policy "Users can delete own portfolio"
  on portfolios for delete
  using (auth.uid() = user_id);


-- ── alerts ──────────────────────────────────────────────
alter table alerts enable row level security;

create policy "Users can read own alerts"
  on alerts for select
  using (auth.uid() = user_id);

create policy "Users can insert own alerts"
  on alerts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own alerts"
  on alerts for delete
  using (auth.uid() = user_id);


-- ── price_cache — public read, service-role write only ──
alter table price_cache enable row level security;

create policy "Anyone can read price cache"
  on price_cache for select
  using (true);

-- Writes come from the Python pipeline using service_role key.
-- No anon or authenticated insert allowed.

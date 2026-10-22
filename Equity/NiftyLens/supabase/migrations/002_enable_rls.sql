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

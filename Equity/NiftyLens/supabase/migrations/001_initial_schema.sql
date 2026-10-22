-- NiftyLens Module 1: price_cache table

create table if not exists public.price_cache (
  symbol        text primary key,
  ltp           numeric(12, 2) not null,
  open          numeric(12, 2) not null default 0,
  high          numeric(12, 2) not null default 0,
  low           numeric(12, 2) not null default 0,
  volume        bigint not null default 0,
  updated_at    timestamptz not null default now()
);

-- Index for fast symbol lookups
create index if not exists idx_price_cache_updated_at on public.price_cache (updated_at desc);

-- Enable Row Level Security (public read)
alter table public.price_cache enable row level security;

create policy "Public read price_cache"
  on public.price_cache for select
  using (true);

-- Only service role can insert/update
create policy "Service role write price_cache"
  on public.price_cache for all
  using (auth.role() = 'service_role');

-- Enable Realtime
alter publication supabase_realtime add table public.price_cache;

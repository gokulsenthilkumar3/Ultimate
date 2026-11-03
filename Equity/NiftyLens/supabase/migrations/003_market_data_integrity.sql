-- Legacy Supabase installation. Validate existing records without replacing them.
-- In PostgreSQL, numeric NaN sorts above Infinity and passes a simple > 0 check.
BEGIN;

-- 002 historically enabled RLS on manually provisioned user tables. Its added
-- CREATE TABLE definitions only repair fresh replay: already migrated databases
-- need these required fields, ownership keys, uniqueness and domains as well.
ALTER TABLE public.watchlists
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN symbol SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT now(),
  DROP CONSTRAINT IF EXISTS watchlists_user_id_fkey,
  ADD CONSTRAINT watchlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS watchlists_user_id_symbol_key ON public.watchlists(user_id, symbol);

ALTER TABLE public.portfolios
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN symbol SET NOT NULL,
  ALTER COLUMN qty SET NOT NULL,
  ALTER COLUMN avg_price SET NOT NULL,
  ALTER COLUMN buy_date SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT now(),
  DROP CONSTRAINT IF EXISTS portfolios_user_id_fkey,
  ADD CONSTRAINT portfolios_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS portfolios_user_id_idx ON public.portfolios(user_id);

ALTER TABLE public.alerts
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN symbol SET NOT NULL,
  ALTER COLUMN condition SET NOT NULL,
  ALTER COLUMN threshold SET NOT NULL,
  ALTER COLUMN channel SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT now(),
  DROP CONSTRAINT IF EXISTS alerts_user_id_fkey,
  ADD CONSTRAINT alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT alerts_condition_valid CHECK (condition IN ('above', 'below')),
  ADD CONSTRAINT alerts_channel_valid CHECK (channel IN ('email', 'telegram'));
CREATE INDEX IF NOT EXISTS alerts_user_id_idx ON public.alerts(user_id);

ALTER TABLE public.price_cache
  ADD CONSTRAINT price_cache_symbol_nonempty CHECK (length(btrim(symbol)) > 0),
  ADD CONSTRAINT price_cache_prices_valid CHECK (
    ltp >= 0 AND ltp < 'Infinity'::numeric AND
    open >= 0 AND open < 'Infinity'::numeric AND
    high >= 0 AND high < 'Infinity'::numeric AND
    low >= 0 AND low < 'Infinity'::numeric
  ),
  ADD CONSTRAINT price_cache_volume_nonnegative CHECK (volume >= 0);

ALTER TABLE public.watchlists
  ADD CONSTRAINT watchlists_symbol_nonempty CHECK (length(btrim(symbol)) > 0);

ALTER TABLE public.portfolios
  ADD CONSTRAINT portfolios_symbol_nonempty CHECK (length(btrim(symbol)) > 0),
  ADD CONSTRAINT portfolios_numbers_valid CHECK (
    qty > 0 AND qty < 'Infinity'::numeric AND
    avg_price >= 0 AND avg_price < 'Infinity'::numeric
  );

ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_symbol_nonempty CHECK (length(btrim(symbol)) > 0),
  ADD CONSTRAINT alerts_threshold_valid CHECK (threshold > 0 AND threshold < 'Infinity'::numeric);

COMMIT;

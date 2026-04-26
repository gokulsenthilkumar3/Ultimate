/**
 * Supabase Cloud Persistence Scaffold
 * ────────────────────────────────────
 * This file provides the Supabase client and sync helpers for
 * cloud-persisting user data across devices.
 *
 * ── SETUP STEPS (requires a free Supabase account):
 * 1. Go to https://supabase.com → New Project
 * 2. Create a table called `user_profiles` with columns:
 *    - id: uuid (primary key, default: gen_random_uuid())
 *    - user_id: text (unique, your local identifier)
 *    - data: jsonb
 *    - updated_at: timestamptz (default: now())
 * 3. Enable Row Level Security (RLS) — optional for personal use
 * 4. Copy your project URL and anon key to .env.local:
 *    VITE_SUPABASE_URL=https://yourproject.supabase.co
 *    VITE_SUPABASE_ANON_KEY=your-anon-key-here
 * 5. Uncomment the import in this file and call initSupabase()
 *
 * ── DO NOT commit your .env.local to git.
 */

// Uncomment this import once you have Supabase installed:
// import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;
const USER_ID_KEY   = 'growthtrack-user-id';

/** Check if Supabase is configured */
const isConfigured = () => Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Get or create a stable local user ID */
const getLocalUserId = () => {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
};

/**
 * Sync user data to Supabase (upsert).
 * Call this from your Zustand store middleware or on unmount.
 *
 * @param {object} data - The full Zustand state to persist
 * @returns {Promise<{error: object|null}>}
 */
export async function syncToCloud(data) {
  if (!isConfigured()) {
    // Silently skip — Supabase not configured yet
    return { error: null };
  }
  try {
    // const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    // const { error } = await supabase
    //   .from('user_profiles')
    //   .upsert({ user_id: getLocalUserId(), data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    // return { error };

    console.log('[Supabase] Sync called — add your credentials to .env.local to activate cloud sync.');
    return { error: null };
  } catch (err) {
    console.error('[Supabase] Sync failed:', err);
    return { error: err };
  }
}

/**
 * Load user data from Supabase.
 * Returns null if not configured or no data found.
 *
 * @returns {Promise<object|null>}
 */
export async function loadFromCloud() {
  if (!isConfigured()) return null;
  try {
    // const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    // const { data, error } = await supabase
    //   .from('user_profiles')
    //   .select('data')
    //   .eq('user_id', getLocalUserId())
    //   .single();
    // if (error || !data) return null;
    // return data.data;

    return null;
  } catch {
    return null;
  }
}

export { getLocalUserId, isConfigured };

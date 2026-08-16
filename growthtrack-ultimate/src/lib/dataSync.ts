import { supabase } from './supabaseClient';

const STORAGE_KEY = 'growthtrack-app-state-v1';
const USER_ID_KEY = 'growthtrack-user-id';
const PROFILE_TABLE = 'user_profiles';

type AppState = Record<string, any>;

const isSupabaseConfigured = () => {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
};

const safeParse = (value: string | null, fallback: any) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const getLocalUserId = () => {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
};

const getLocalState = (): AppState => safeParse(localStorage.getItem(STORAGE_KEY), {});

const setLocalState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const getSyncedState = () => {
  return getLocalState();
};

export const setSyncedState = async (patch: AppState) => {
  const current = getLocalState();
  const next = { ...current, ...patch };
  setLocalState(next);

  if (isSupabaseConfigured()) {
    const payload = {
      user_id: getLocalUserId(),
      data: next,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from(PROFILE_TABLE)
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.warn('[Sync] Supabase save failed, kept local cache:', error.message);
    }
  }

  return next;
};

export const loadSyncedState = async () => {
  if (!isSupabaseConfigured()) return getLocalState();

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select('data')
    .eq('user_id', getLocalUserId())
    .maybeSingle();

  if (error || !data?.data) {
    return getLocalState();
  }

  const cloudState = data.data as AppState;
  setLocalState(cloudState);
  return cloudState;
};

export const syncEndpoint = async (
  endpoint: string,
  method: string = 'GET',
  data: any = null,
) => {
  const state = await loadSyncedState();
  const key = endpoint.replace(/^\/+/, '').replace(/\//g, '__');
  const current = state[key];

  if (method === 'GET') {
    return current ?? null;
  }

  let nextValue = data;

  if (method === 'DELETE') {
    nextValue = null;
  } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    if (key === 'user' && current && data && typeof current === 'object' && typeof data === 'object') {
      nextValue = { ...current, ...data };
    } else if (Array.isArray(current)) {
      if (method === 'POST') {
        nextValue = [...current, data];
      } else if (method === 'PUT' || method === 'PATCH') {
        nextValue = current.map((item) => {
          if (!item || typeof item !== 'object') return item;
          if (data?.id && item.id === data.id) return { ...item, ...data };
          return item;
        });
      }
    } else if (current && typeof current === 'object' && data && typeof data === 'object') {
      nextValue = { ...current, ...data };
    }
  }

  const nextState = { ...state };

  if (method === 'DELETE') {
    delete nextState[key];
  } else {
    nextState[key] = nextValue;
  }

  await setSyncedState(nextState);

  if (key === 'user') return nextValue;
  if (method === 'POST' && nextValue && typeof nextValue === 'object' && !Array.isArray(nextValue) && !nextValue.id) {
    return { id: `${key}_${Date.now()}`, ...nextValue };
  }

  return nextValue;
};

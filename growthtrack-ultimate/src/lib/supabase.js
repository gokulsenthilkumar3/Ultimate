// Supabase client stub — provides a no-op client when credentials are not configured.
// MetricLogger.jsx imports from '../lib/supabase'

const handler = {
  get: (target, prop) => {
    if (prop === 'from') return () => handler;
    if (prop === 'storage') return handler;
    if (prop === 'auth') return handler;
    if (['select', 'insert', 'update', 'delete', 'upsert', 'upload', 'download', 'getPublicUrl'].includes(prop)) {
      return () => Promise.resolve({ data: null, error: new Error('Supabase not configured') });
    }
    return () => handler;
  },
};

export const supabase = new Proxy({}, handler);

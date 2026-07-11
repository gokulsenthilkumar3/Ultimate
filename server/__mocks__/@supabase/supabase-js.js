/**
 * Manual mock for @supabase/supabase-js
 * Placed in server/__mocks__/@supabase/supabase-js.js
 *
 * Vitest (and Jest) resolve __mocks__ relative to node_modules automatically
 * when vi.mock('@supabase/supabase-js') is called WITHOUT a factory.
 * This avoids all ESM hoisting issues.
 */

globalThis.__db__     = globalThis.__db__     || { tasks: [], shopping: [] };
globalThis.__nextId__ = globalThis.__nextId__ || 1;

function buildChain(tableName) {
  if (!globalThis.__db__[tableName]) globalThis.__db__[tableName] = [];
  const store  = () => globalThis.__db__[tableName];
  let _eqVal   = null;
  let _pending = null;

  const ch = {
    select: () => ch,
    order:  () => ch,
    limit:  () => ch,
    gte:    () => ch,
    lte:    () => ch,
    eq:     (_f, v) => { _eqVal = v; return ch; },
    single: () => Promise.resolve({ data: _pending, error: null }),

    upsert: (row) => {
      const id  = globalThis.__nextId__++;
      const r   = Array.isArray(row) ? row[0] : row;
      const rec = { id, ...r, created_at: new Date().toISOString() };
      store().push(rec);
      _pending = { id };
      return ch;
    },

    insert: (row) => {
      const id  = globalThis.__nextId__++;
      const r   = Array.isArray(row) ? row[0] : row;
      const rec = { id, ...r, created_at: new Date().toISOString() };
      store().push(rec);
      _pending = { id };
      return ch;
    },

    update: (patch) => {
      const arr = store();
      const idx = arr.findIndex(r => String(r.id) === String(_eqVal));
      if (idx !== -1) Object.assign(arr[idx], patch);
      _pending = arr[idx] || null;
      return ch;
    },

    delete: () => {
      const arr = store();
      const idx = arr.findIndex(r => String(r.id) === String(_eqVal));
      if (idx !== -1) arr.splice(idx, 1);
      _pending = null;
      return ch;
    },

    then: (res, rej) =>
      Promise.resolve({
        data: _pending !== null ? _pending : [...store()],
        error: null,
      }).then(res, rej),
  };
  ch[Symbol.toStringTag] = 'Promise';
  return ch;
}

export const createClient = () => ({ from: (t) => buildChain(t) });
export default { createClient };

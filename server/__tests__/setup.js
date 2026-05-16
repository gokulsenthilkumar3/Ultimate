// Server test setup — point SQLite to an in-memory database so CI
// never needs a real DB_PATH env variable or a file on disk.
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV  = 'test';
// Provide a dummy Supabase URL/key so the import doesn't throw
process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
process.env.SUPABASE_KEY = 'placeholder-anon-key';

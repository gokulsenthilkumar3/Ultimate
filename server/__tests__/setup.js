// Server test setup — mock Supabase so tests never need real credentials
// The actual server/index.js uses Supabase exclusively (no SQLite).
process.env.NODE_ENV     = 'test';
process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
process.env.SUPABASE_KEY = 'placeholder-anon-key';
// SUPABASE_SERVICE_KEY is what index.js checks
process.env.SUPABASE_SERVICE_KEY = 'placeholder-service-key';

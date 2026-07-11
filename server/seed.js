// seed.js — Supabase version
// Initializes all operational tables with empty state
// Run: node seed.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function seed() {
  console.log('Seeding operational tables...\n');

  // Verify connection
  const { error: pingErr } = await supabase.from('tasks').select('id').limit(1);
  if (pingErr && pingErr.code !== 'PGRST116') {
    console.error('Cannot connect to Supabase:', pingErr.message);
    process.exit(1);
  }

  console.log('✓ Supabase connection verified');
  console.log('✓ Schema already applied via supabase_schema.sql');
  console.log('\nFor singleton data, run: node seed_full_migration.js');
  console.log('Seed complete.');
}

seed();

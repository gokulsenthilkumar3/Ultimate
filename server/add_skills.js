// add_skills.js — Supabase version
// Run: node add_skills.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const NEW_SKILLS = [
  { id: '9',  label: 'PostgreSQL',    proficiency: 70, icon: '🐘', category: 'Programming' },
  { id: '10', label: 'React',         proficiency: 85, icon: '⚛️', category: 'Programming' },
  { id: '11', label: 'Node.js',       proficiency: 80, icon: '🟢', category: 'Programming' },
  { id: '12', label: 'Load Testing',  proficiency: 75, icon: '⚡', category: 'Programming' },
];

async function addSkills() {
  // Fetch current skills
  const { data, error: fetchErr } = await supabase
    .from('skills')
    .select('data')
    .eq('id', 1)
    .single();

  if (fetchErr) {
    console.error('Failed to fetch skills:', fetchErr.message);
    process.exit(1);
  }

  const existing = JSON.parse(data.data);
  const merged = [...existing, ...NEW_SKILLS];

  const { error: upsertErr } = await supabase
    .from('skills')
    .upsert({ id: 1, data: JSON.stringify(merged) }, { onConflict: 'id' });

  if (upsertErr) {
    console.error('Failed to update skills:', upsertErr.message);
  } else {
    console.log(`✓ Added ${NEW_SKILLS.length} skills. Total: ${merged.length}`);
  }
}

addSkills();

// seed_full_migration.js — Supabase version
// Run: node seed_full_migration.js
// Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY in .env or environment

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── DATA ────────────────────────────────────────────────────────────────────
// NOTE: All personal data is stored in the live database and Render env vars.
//       This seed file uses GENERIC placeholder values only.
//       Replace these placeholders with your actual data ONLY in your local .env
//       or directly in the Supabase dashboard — NEVER commit real PII here.

const USER_PROFILE = {
  name: process.env.USER_NAME || 'GrowthTrack User',
  email: process.env.USER_EMAIL || 'user@example.com',
  age: parseInt(process.env.USER_AGE) || 25,
  height: parseInt(process.env.USER_HEIGHT_CM) || 175,
  weight: parseInt(process.env.USER_WEIGHT_KG) || 70,
  dob: process.env.USER_DOB || '2000-01-01',
  bmi: '22.9',
  bodyFat: 18,
  muscleMass: 55,
  skinTones: {
    Face: '#C68642', Neck: '#C68642', Torso: '#C68642',
    Hands: '#B57531', Arms: '#C68642', Legs: '#C68642',
    Butt: '#D2A172', D_Zone: '#B57531'
  },
  bodyMeasurements: {
    Shoulder_Width: { current_in: '18.0"', target_in: '22.0"', priority: 'HIGH', note: 'Measure from acromion to acromion.' },
    Chest_Girth:    { current_in: '38.0"', target_in: '44.0"', priority: 'HIGH', note: 'Measure around the fullest part of chest.' },
    Waist_Line:     { current_in: '32.0"', target_in: '30.0"', priority: 'HIGH', note: 'Measure at the narrowest point.' },
    Arm_Biceps:     { current_in: '13.0"', target_in: '16.0"', priority: 'MEDIUM', note: 'Measure flexed at peak.' },
    Hair_Density:   { current_in: 'Medium', target_in: 'Thick', priority: 'MEDIUM', note: 'Visual assessment of scalp coverage.' },
    Tooth_Shade:    { current_in: 'A2', target_in: 'B1 (Bleach)', priority: 'LOW', note: 'Using standard dental shade guide.' },
  },
  socialMedia: {
    LinkedIn: process.env.USER_LINKEDIN || '',
    GitHub: process.env.USER_GITHUB || '',
    Instagram: process.env.USER_INSTAGRAM || '',
  }
};

const TRAINING_PLAN = {
  split: 'Push / Pull / Legs + Aesthetic',
  scheduleNote: '5-Day Hypertrophy Split optimized for V-Taper and shoulder-to-waist ratio.',
  priority_exercises: [
    {
      area: 'Shoulder Width (Lateral Delts)',
      exercises: [
        { name: 'Lateral Raises (Cable/DB)', sets: '4 x 15-20', type: 'Hypertrophy' },
        { name: 'Overhead Press (Heavy)',    sets: '3 x 6-8',   type: 'Strength' }
      ]
    },
    {
      area: 'Chest Depth (Upper Pecs)',
      exercises: [
        { name: 'Incline DB Press',          sets: '3 x 10-12', type: 'Hypertrophy' },
        { name: 'Low-to-High Cable Flyes',   sets: '3 x 15',    type: 'Isolation' }
      ]
    },
    {
      area: 'Back Width (Lats)',
      exercises: [
        { name: 'Weighted Pullups',          sets: '3 x Max',   type: 'Strength' },
        { name: 'Lat Pulldowns (Wide)',       sets: '3 x 12',    type: 'Hypertrophy' }
      ]
    }
  ]
};

const NUTRITION = {
  calories: 2950,
  protein: '170g',
  carbs: '320g',
  fat: '85g',
  meals: [
    { icon: '🍳', name: 'Protective Breakfast', time: '08:00 AM', items: ['4 Eggs', 'Oatmeal with Blueberries', '1 Scoop Whey'] },
    { icon: '🍲', name: 'Performance Lunch',    time: '01:00 PM', items: ['200g Chicken Breast', '150g Rice', 'Steam Broccoli'] },
    { icon: '🥤', name: 'Post-Workout Fuel',    time: '05:00 PM', items: ['1 Banana', '5g Creatine', '40g Whey Protein'] },
    { icon: '🥩', name: 'Recovery Dinner',      time: '08:30 PM', items: ['200g Lean Beef/Fish', 'Sweet Potato', 'Mixed Greens'] },
  ]
};

const LIFESTYLE_TIPS = [
  {
    icon: '☕', title: 'Caffeine Management', urgency: 'CRITICAL',
    points: ['Stop all caffeine intake by 12:00 PM', 'Switch to herbal tea in afternoon', 'Limit to 2 cups max per day']
  },
  {
    icon: '📱', title: 'Circadian Anchoring', urgency: 'URGENT',
    points: ['10 mins sunlight exposure upon waking', 'No blue light 1 hour before sleep', 'Use red light mode on devices']
  },
  {
    icon: '🌬️', title: 'Asthma/Allergy Control', urgency: 'HIGH',
    points: ['Keep inhaler accessible at all times', 'Dust-proof bedroom (air purifier)', 'Deep breathing exercises (Wim Hof)']
  }
];

const MEDICAL_DATA = {
  testsRequired: [
    { name: 'Complete Blood Count (CBC)',       priority: 'High',     frequency: 'Yearly' },
    { name: 'Lipid Panel (Cholesterol)',         priority: 'High',     frequency: 'Yearly' },
    { name: 'Liver Function (ALT, AST, GGT)',   priority: 'Critical', frequency: '6 Months' },
    { name: 'Kidney Function (Creatinine, BUN)', priority: 'High',    frequency: 'Yearly' },
    { name: 'Thyroid Panel (TSH, T3, T4)',       priority: 'Medium',   frequency: 'Yearly' },
    { name: 'Testosterone (Total & Free)',       priority: 'High',     frequency: '6 Months' },
    { name: 'Vitamin D3',                        priority: 'High',     frequency: '6 Months' },
    { name: 'HbA1c (Blood Sugar)',               priority: 'Medium',   frequency: 'Yearly' },
  ]
};

const GOLDEN_RATIO = {
  table: [
    { part: 'Chest Girth', current_in: '36.0"', target_in: '43.0"', gap: '+7.0"',   priority: 'high',     color: '#ff4444' },
    { part: 'Waist (Gut)', current_in: '32.0"', target_in: '29.5"', gap: '-2.5"',   priority: 'critical', color: '#ff0000' },
    { part: 'Arm Size',    current_in: '12.0"', target_in: '16.5"', gap: '+4.5"',   priority: 'medium',   color: '#ffa500' },
    { part: 'Shoulders',   current_in: 'Narrow', target_in: 'Broad', gap: 'Massive', priority: 'high',    color: '#ff4444' },
    { part: 'PE Length',   current_in: '5.90"', target_in: '7.90"', gap: '+2.0"',   priority: 'high',     color: '#ff4444' },
    { part: 'PE Girth',    current_in: '4.00"', target_in: '5.25"', gap: '+1.25"',  priority: 'medium',   color: '#ffa500' },
    { part: 'Body Fat %',  current_in: '18.5%', target_in: '11.0%', gap: '-7.5%',   priority: 'critical', color: '#ff0000' },
  ]
};

const HEALTH_QA = [
  {
    round: 'Bio-Marker Baseline', color: '#06b6d4',
    items: [
      { q: 'Current Weight & Height', a: '63kg / 182cm' },
      { q: 'Calculated BMI',          a: '19.0 (Low-Normal)' }
    ]
  },
  {
    round: 'Sleep Architecture', color: '#8b5cf6',
    items: [
      { q: 'Average Nightly Sleep', a: '5.5 Hours' },
      { q: 'Weekly Sleep Debt',     a: '14 Hours (Critical)' }
    ]
  },
  {
    round: 'Metabolic Status', color: '#f59e0b',
    items: [
      { q: 'Hydration Marker (Urine)', a: 'Dark/Yellow (Dehydrated)' },
      { q: 'Daily Water Intake',       a: '1–2 Litres' }
    ]
  }
];

const INITIAL_SKILLS = [
  { id: '1', label: 'English',        proficiency: 85, icon: '🇬🇧', category: 'Languages' },
  { id: '2', label: 'Spanish',        proficiency: 40, icon: '🇪🇸', category: 'Languages' },
  { id: '3', label: 'Python',         proficiency: 75, icon: '🐍',  category: 'Programming' },
  { id: '4', label: 'JavaScript',     proficiency: 90, icon: '🟡', category: 'Programming' },
  { id: '5', label: 'Stock Trading',  proficiency: 55, icon: '📈', category: 'Finance' },
  { id: '6', label: 'Public Speaking', proficiency: 65, icon: '🎤', category: 'Communication' },
  { id: '7', label: 'Boxing',         proficiency: 50, icon: '🥊', category: 'Fitness & Health' },
  { id: '8', label: 'Budgeting',      proficiency: 80, icon: '💰', category: 'Life Finance' },
];

const INITIAL_EVENTS = [
  { id: '1', title: 'Morning Run',  date: '2026-05-03', type: 'fitness', completed: false },
  { id: '2', title: 'Code Review',  date: '2026-05-03', type: 'work',    completed: true },
];

// ─── SEED ────────────────────────────────────────────────────────────────────

const SEED_MAP = {
  user_profile:       USER_PROFILE,
  training_plan:      TRAINING_PLAN,
  nutrition_strategy: NUTRITION,
  lifestyle_tips:     LIFESTYLE_TIPS,
  medical_data:       MEDICAL_DATA,
  physique_targets:   GOLDEN_RATIO,
  assessment_qa:      HEALTH_QA,
  skills:             INITIAL_SKILLS,
  calendar_events:    INITIAL_EVENTS,
};

async function migrate() {
  console.log('Starting Supabase seed migration...\n');

  for (const [table, data] of Object.entries(SEED_MAP)) {
    const { error } = await supabase
      .from(table)
      .upsert({ id: 1, data: JSON.stringify(data) }, { onConflict: 'id' });

    if (error) {
      console.error(`  ✗ ${table}: ${error.message}`);
    } else {
      console.log(`  ✓ ${table}`);
    }
  }

  console.log('\nMigration complete. All singleton tables seeded in Supabase.');
}

migrate().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

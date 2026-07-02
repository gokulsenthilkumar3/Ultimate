// ══════════════════════════════════════════════════════════════
// USER PROFILE — Ultimate Digital Twin Engine v2.0
// ══════════════════════════════════════════════════════════════
// This file is now a STATIC SCHEMA only.
// All actual data is now stored in the SQLite database.
// ══════════════════════════════════════════════════════════════

export const USER = null;

export const STATUS = {
  critical: { label: 'Critical', color: '#ef4444', bg: '#7f1d1d' },
  warning:  { label: 'Warning',  color: '#f59e0b', bg: '#78350f' },
  moderate: { label: 'Moderate', color: '#f97316', bg: '#7c2d12' },
  fair:     { label: 'Fair',     color: '#eab308', bg: '#713f12' },
  good:     { label: 'Good',     color: '#22c55e', bg: '#14532d' },
  optimal:  { label: 'Optimal',  color: '#06b6d4', bg: '#164e63' },
};

export const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'body3d', label: '3D Twin' },
  { id: 'assessment', label: 'Assessment' },
  { id: 'medical', label: 'Medical' },
  { id: 'physique', label: 'Physique' },
  { id: 'training', label: 'Training' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'goals', label: 'Goals' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'progress', label: 'Progress' },
  { id: 'skills', label: 'Skills' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'projects', label: 'Projects' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'timesheet', label: 'Timesheet' },
  { id: 'logs', label: 'Logs' },
];

export const HEALTH_SCORE = 0;

// Body Parts Map (Schema only)
export const BODY_PARTS = {};

// Metrics List (UI Mapping only)
export const BODY_METRICS_LIST = [
  { id: 'weight', label: 'Weight', unit: 'kg', icon: '⚖️' },
  { id: 'chest', label: 'Chest', unit: 'in', icon: '👕' },
  { id: 'shoulders', label: 'Shoulders', unit: 'in', icon: '📐' },
  { id: 'waist', label: 'Waist', unit: 'in', icon: '👖' },
  { id: 'arms', label: 'Arms', unit: 'in', icon: '💪' },
  { id: 'hips', label: 'Hips', unit: 'in', icon: '🍑' },
  { id: 'thighs', label: 'Thighs', unit: 'in', icon: '🦵' },
  { id: 'd_size', label: 'D-Size', unit: 'in', icon: '🍆' },
  { id: 'd_girth', label: 'D-Girth', unit: 'in', icon: '🔴' },
];

export const VITALS_METRICS_LIST = [
  { id: 'sleep', label: 'Sleep', unit: 'hr', icon: '😴' },
  { id: 'water', label: 'Water', unit: 'L', icon: '💧' },
  { id: 'caffeine', label: 'Caffeine', unit: 'cup',icon: '☕' },
  { id: 'stress', label: 'Stress', unit: '1-10',icon: '🧠' },
  { id: 'hr', label: 'Heart Rate',unit: 'bpm',icon: '❤️' },
];

export const HOLISTIC_METRICS_LIST = [
  { id: 'eyePower', label: 'Eye Power', unit: 'dp', icon: '👓' },
  { id: 'memoryPower', label: 'Memory', unit: '%', icon: '🧠' },
  { id: 'stamina', label: 'Stamina', unit: 'min',icon: '🏃' },
  { id: 'flexibility', label: 'Flexibility', unit: '%', icon: '🧘' },
  { id: 'hairHealth', label: 'Hair Health', unit: '%', icon: '💇' },
  { id: 'skinGlow', label: 'Skin Glow', unit: '%', icon: '✨' },
  { id: 'gutHealth', label: 'Gut Health', unit: '%', icon: '🥫' },
  { id: 'brainExercise', label: 'Brain Exercise', unit: 'min', icon: '🧩' },
  { id: 'sight', label: 'Sight', unit: '%', icon: '👁️' },
  { id: 'hearing', label: 'Hearing', unit: '%', icon: '👂' },
  { id: 'smell', label: 'Smell', unit: '%', icon: '👃' },
  { id: 'taste', label: 'Taste', unit: '%', icon: '👅' },
  { id: 'touch', label: 'Touch', unit: '%', icon: '🤚' },
];

export const SKILLS_METRICS_LIST = [
  { id: 'language_english', label: 'English', unit: '%', icon: '🇬🇧', category: 'Languages' },
  { id: 'language_spanish', label: 'Spanish', unit: '%', icon: '🇪🇸', category: 'Languages' },
  { id: 'language_french', label: 'French', unit: '%', icon: '🇫🇷', category: 'Languages' },
  { id: 'language_german', label: 'German', unit: '%', icon: '🇩🇪', category: 'Languages' },
  { id: 'sign_language', label: 'Sign Language', unit: '%', icon: '🤟', category: 'Communication' },
  { id: 'morse_code', label: 'Morse Code', unit: '%', icon: '📡', category: 'Communication' },
  { id: 'programming_python', label: 'Python', unit: '%', icon: '🐍', category: 'Programming' },
  { id: 'programming_javascript', label: 'JavaScript', unit: '%', icon: '🟡', category: 'Programming' },
  { id: 'programming_java', label: 'Java', unit: '%', icon: '☕', category: 'Programming' },
  { id: 'programming_cpp', label: 'C++', unit: '%', icon: '🔵', category: 'Programming' },
  { id: 'stocks_trading', label: 'Stock Trading', unit: '%', icon: '📈', category: 'Finance' },
  { id: 'finance_budgeting', label: 'Budgeting', unit: '%', icon: '💰', category: 'Finance' },
  { id: 'finance_investing', label: 'Investing', unit: '%', icon: '📉', category: 'Finance' },
  { id: 'finance_crypto', label: 'Cryptocurrency', unit: '%', icon: '₿', category: 'Finance' },
];

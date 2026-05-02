const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'tracker.db'));

const NEW_SKILLS = [
  { id: 'language_english', label: 'English', proficiency: 50, unit: '%', icon: '🇬🇧', category: 'Languages' },
  { id: 'language_spanish', label: 'Spanish', proficiency: 50, unit: '%', icon: '🇪🇸', category: 'Languages' },
  { id: 'language_french', label: 'French', proficiency: 50, unit: '%', icon: '🇫🇷', category: 'Languages' },
  { id: 'language_german', label: 'German', proficiency: 50, unit: '%', icon: '🇩🇪', category: 'Languages' },
  { id: 'sign_language', label: 'Sign Language', proficiency: 50, unit: '%', icon: '🤟', category: 'Communication' },
  { id: 'morse_code', label: 'Morse Code', proficiency: 50, unit: '%', icon: '📡', category: 'Communication' },
  { id: 'programming_python', label: 'Python', proficiency: 50, unit: '%', icon: '🐍', category: 'Programming' },
  { id: 'programming_javascript', label: 'JavaScript', proficiency: 50, unit: '%', icon: '🟡', category: 'Programming' },
  { id: 'programming_java', label: 'Java', proficiency: 50, unit: '%', icon: '☕', category: 'Programming' },
  { id: 'programming_cpp', label: 'C++', proficiency: 50, unit: '%', icon: '🔵', category: 'Programming' },
  { id: 'stocks_trading', label: 'Stock Trading', proficiency: 50, unit: '%', icon: '📈', category: 'Finance' },
  { id: 'finance_budgeting', label: 'Budgeting', proficiency: 50, unit: '%', icon: '💰', category: 'Finance' },
  { id: 'finance_investing', label: 'Investing', proficiency: 50, unit: '%', icon: '📉', category: 'Finance' },
  { id: 'finance_crypto', label: 'Cryptocurrency', proficiency: 50, unit: '%', icon: '₿', category: 'Finance' },
];

db.prepare(`INSERT OR REPLACE INTO skills (id, data) VALUES (1, ?)`).run(JSON.stringify(NEW_SKILLS));

console.log('Skills inserted successfully.');

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
const { PrismaClient } = require('@prisma/client');
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configured = process.env.DATABASE_URL;
const databaseUrl = configured?.startsWith('file:./') ? `file:${path.resolve(projectRoot, configured.slice(5)).replaceAll('\\', '/')}` : configured || `file:${path.join(projectRoot, 'dev.db').replaceAll('\\', '/')}`;
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: databaseUrl }) });

const settings = {
  appMetadata: { name: 'GrowthTrack Ultimate', description: 'Private personal operating system', startUrl: '/Ultimate/', themeColor: '#09090b' },
  aiAgent: { provider: 'ollama', baseUrl: 'http://127.0.0.1:11434', model: 'gemma3', timeoutMs: 12000, enabled: true },
  maps: { timelineUrl: 'https://www.google.com/maps/timeline', syncIntervalMinutes: 15, browserTrackingEnabled: false },
  documentProviders: [
    { id: 'google-drive', label: 'Google Drive', enabled: true }, { id: 'onedrive', label: 'OneDrive', enabled: true },
    { id: 'dropbox', label: 'Dropbox', enabled: true }, { id: 'local', label: 'Local Network', enabled: true },
  ],
  currentSources: {
    weatherUrl: 'https://api.open-meteo.com/v1/forecast',
    newsSources: [{ id: 'hacker-news', label: 'Hacker News', url: 'https://hacker-news.firebaseio.com/v0/topstories.json', enabled: true }],
    weatherCodes: { '0': ['Clear sky', '☀️'], '1': ['Mainly clear', '🌤️'], '2': ['Partly cloudy', '⛅'], '3': ['Overcast', '☁️'], '45': ['Foggy', '🌫️'], '48': ['Icy fog', '🌫️'], '51': ['Light drizzle', '🌦️'], '53': ['Drizzle', '🌦️'], '55': ['Heavy drizzle', '🌧️'], '61': ['Light rain', '🌧️'], '63': ['Rain', '🌧️'], '65': ['Heavy rain', '🌧️'], '71': ['Light snow', '🌨️'], '73': ['Snow', '🌨️'], '75': ['Heavy snow', '❄️'], '80': ['Showers', '🌦️'], '81': ['Rain showers', '🌧️'], '82': ['Violent showers', '⛈️'], '95': ['Thunderstorm', '⛈️'], '96': ['Thunderstorm', '⛈️'], '99': ['Thunderstorm', '⛈️'] },
  },
  healthTemplates: { senses: {}, lifestyle: { posture: '', diets: [], hobbies: [], broncoTest: '' }, specialized: [], recoveryMetrics: [] },
  assessmentQuestions: [
    ['current_weight', 'Current Weight', 'e.g. 72 kg'], ['target_weight', 'Target Weight', 'e.g. 80 kg'], ['height', 'Height', 'e.g. 175 cm'],
    ['activity_level', 'Activity Level', 'Sedentary / Lightly active / Active / Very active'], ['diet_preference', 'Diet Preference', 'Veg / Non-veg / Vegan'],
    ['sleep_hours', 'Average Sleep Hours', 'e.g. 7'], ['workout_days', 'Workout Days per Week', 'e.g. 4'], ['main_goal', 'Main Health Goal', 'e.g. Build muscle or improve endurance'],
    ['health_conditions', 'Any Health Conditions', 'e.g. None, knee pain, or hypertension'], ['motivation', 'What motivates you?', 'e.g. Sports, aesthetics, or health'],
  ].map(([key, label, placeholder]) => ({ key, label, placeholder })),
  sleepTips: [
    { tip: 'Keep bed and wake times consistent within a 30-minute window.', priority: 'HIGH' },
    { tip: 'Use morning daylight to help anchor your circadian rhythm.', priority: 'HIGH' },
    { tip: 'Avoid caffeine late enough that it does not disrupt sleep.', priority: 'MED' },
    { tip: 'Keep the bedroom quiet, dark, and comfortably cool.', priority: 'MED' },
    { tip: 'Review trends over several nights instead of judging one night.', priority: 'LOW' },
  ],
  appCatalog: [
    ['overview','Overview','🏠','Core'],['current','Current','⚡','Core'],['insights','Insights','📊','Core'],
    ['physique','Physique','🏋️','Health'],['training','Training','💪','Health'],['nutrition','Nutrition','🥗','Health'],['medical','Medical','🩺','Health'],['health','Health+','❤️','Health'],['habits','Habits','🔥','Health'],['strength','Strength','🏆','Health'],
    ['goals','Goals','🎯','Productivity'],['tasks','Tasks','✅','Productivity'],['projects','Projects','🚀','Productivity'],['workspace','Workspace','🗂️','Productivity'],['timesheet','Timesheet','⏱️','Productivity'],['skills','Skills','⚡','Productivity'],
    ['finance','Finance','💰','Finance'],['sip','SIP Calculator','📈','Finance'],['portfolio','Portfolio','💹','Finance'],['shopping','Shopping','🛒','Finance'],
    ['ai','Agent','🤖','Tools'],['maps','Maps','🗺️','Tools'],['logs','Logs','📋','Tools'],['databases','Databases','🗄️','Tools'],['apps','Apps','🚀','Tools'],['about','About','ℹ️','Tools'],['profile','Profile','🪪','Tools']
  ].map(([id,label,icon,group]) => ({ id, label, icon, group, color: '#7c3aed', description: label })),
  navigation: {
    groups: [
      { id: 'today', label: 'Today', tabs: ['overview', 'current'] }, { id: 'body', label: 'Body', tabs: ['physique', 'assessment', 'training', 'strength', 'nutrition', 'hydration'] },
      { id: 'wellness', label: 'Wellness', tabs: ['sleep', 'lifestyle', 'mind', 'medical', 'health', 'habits'] }, { id: 'insights', label: 'Insights', tabs: ['insights'] },
      { id: 'work', label: 'Workspace', tabs: ['workspace', 'tasks', 'projects', 'timesheet', 'skills'] }, { id: 'money', label: 'Money', tabs: ['finance', 'shopping', 'sip', 'portfolio'] },
      { id: 'life', label: 'Life', tabs: ['social', 'entertainment', 'maps'] }, { id: 'system', label: 'More', tabs: ['ai', 'databases', 'profile', 'help', 'logs', 'apps', 'about'] },
    ],
  },
};

for (const [key, value] of Object.entries(settings)) {
  const row = { value: JSON.stringify(value), valueType: 'json', category: key === 'aiAgent' || key === 'maps' || key === 'currentSources' ? 'integration' : 'application' };
  await prisma.appSetting.upsert({ where: { key }, update: row, create: { key, ...row } });
}
await prisma.$disconnect();
console.log(`Seeded ${Object.keys(settings).length} application settings.`);

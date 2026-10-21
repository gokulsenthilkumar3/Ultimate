import {
  Activity, Bell, Bot, BriefcaseBusiness, CalendarDays, CircleUserRound, Clapperboard,
  Cloud, Database, Dumbbell, FileText, Goal, HandCoins, HeartPulse, HelpCircle,
  History, Home, Landmark, LayoutDashboard, ListChecks, Map, PieChart, Ruler,
  Settings, ShieldCheck, ShoppingBag, Sparkles, Target, TrendingUp, Trophy,
  Users, Utensils, WalletCards, Waves, CheckCircle,
} from 'lucide-react';
import { FEATURES, FEATURE_BY_ID } from './featureRegistry';

const TAB_CORE = {
  overview: { label: 'Overview', group: 'insights', icon: Home, emoji: '🏠', keywords: ['home', 'today', 'dashboard'] },
  current: { label: 'Current', group: 'insights', icon: Activity, emoji: '🌤', keywords: ['now', 'status'] },
  wellnessCommand: { label: 'Wellness Command', group: 'wellness', icon: HeartPulse, emoji: '💚', keywords: ['wellness command', 'health command'] },
  wellness: { label: 'Wellness Command', group: 'wellness', icon: HeartPulse, emoji: '💚', keywords: ['wellness command', 'health command'] },
  life: { label: 'Life Command', group: 'life', icon: Users, emoji: '🌐', keywords: ['life command'] },
  hub: { label: 'Hub Command', group: 'system', icon: LayoutDashboard, emoji: '🧭', keywords: ['hub command'] },
  physique: { label: 'Physique', group: 'wellness', icon: Ruler, emoji: '📐', keywords: ['blueprint', '3d mirror', 'targets', 'history', 'humanoid'] },
  assessment: { label: 'Assessment', group: 'wellness', icon: ListChecks, emoji: '📋', keywords: ['body assessment'] },
  training: { label: 'Training', group: 'wellness', icon: Dumbbell, emoji: '💪', keywords: ['workout', 'fitness'] },
  strength: { label: 'Strength', group: 'wellness', icon: Trophy, emoji: '🏋', keywords: ['lifting', '1rm'] },
  nutrition: { label: 'Nutrition', group: 'wellness', icon: Utensils, emoji: '🥗', keywords: ['food', 'diet'] },
  hydration: { label: 'Hydration', group: 'wellness', icon: Waves, emoji: '💧', keywords: ['water'] },
  sleep: { label: 'Sleep', group: 'wellness', icon: History, emoji: '😴', keywords: ['rest'] },
  lifestyle: { label: 'Lifestyle', group: 'wellness', icon: Sparkles, emoji: '🌿', keywords: ['wellbeing'] },
  mind: { label: 'Mind & Wellness', group: 'wellness', icon: HeartPulse, emoji: '🧠', keywords: ['meditation', 'mental'] },
  medical: { label: 'Medical', group: 'wellness', icon: ShieldCheck, emoji: '🏥', keywords: ['health records'] },
  health: { label: 'Health+', group: 'wellness', icon: HeartPulse, emoji: '🩺', keywords: ['vitals'] },
  habits: { label: 'Habits', group: 'wellness', icon: Goal, emoji: '🔥', keywords: ['routine', 'streak'] },
  insights: { label: 'Insights', group: 'insights', icon: TrendingUp, emoji: '📊', keywords: ['analytics', 'dashboards', 'growth forecast', 'growthcast'] },
  actions: { label: 'Action Center', group: 'insights', icon: CheckCircle, emoji: '⚡', keywords: ['next actions', 'priorities', 'recommendations'] },
  analytics: { label: 'Analytics', group: 'insights', icon: TrendingUp, emoji: '📊', keywords: ['insights', 'metrics'] },
  dashboards: { label: 'Dashboards', group: 'insights', icon: LayoutDashboard, emoji: '▦', keywords: ['dashboard', 'overview'] },
  forecast: { label: 'Forecast', group: 'insights', icon: TrendingUp, emoji: '🔮', keywords: ['growth forecast', 'prediction'] },
  progress: { label: 'Progress', group: 'insights', icon: PieChart, emoji: '📈', keywords: ['trends'] },
  goals: { label: 'Goals', group: 'work', icon: Target, emoji: '🎯', keywords: ['targets', 'outcomes'] },
  workspace: { label: 'Workspace', group: 'work', icon: BriefcaseBusiness, emoji: '🗂', keywords: ['calendar', 'documents', 'notes', 'cloud'] },
  tasks: { label: 'Tasks', group: 'work', icon: ListChecks, emoji: '✅', keywords: ['todo'] },
  projects: { label: 'Projects', group: 'work', icon: BriefcaseBusiness, emoji: '🛠', keywords: ['work'] },
  timesheet: { label: 'Timesheet', group: 'work', icon: CalendarDays, emoji: '⏱', keywords: ['time tracking'] },
  skills: { label: 'Skills', group: 'work', icon: Trophy, emoji: '⚡', keywords: ['learning'] },
  finance: { label: 'Finance', group: 'money', icon: WalletCards, emoji: '💰', keywords: ['transactions', 'budget'] },
  shopping: { label: 'Shopping', group: 'money', icon: ShoppingBag, emoji: '🛒', keywords: ['purchases'] },
  sip: { label: 'SIP Calculator', group: 'money', icon: HandCoins, emoji: '💰', keywords: ['investment'] },
  portfolio: { label: 'Portfolio', group: 'money', icon: Landmark, emoji: '💹', keywords: ['investments'] },
  social: { label: 'Social Media', group: 'life', icon: Users, emoji: '🌐', keywords: ['media', 'posts'] },
  entertainment: { label: 'Entertainment', group: 'life', icon: Clapperboard, emoji: '🎬', keywords: ['netflix', 'prime video', 'zee5', 'hotstar'] },
  maps: { label: 'Maps', group: 'life', icon: Map, emoji: '🗺', keywords: ['places'] },
  ai: { label: 'Agents', group: 'system', icon: Bot, emoji: '🤖', keywords: ['ollama', 'assistant', 'llm', 'agents'] },
  databases: { label: 'Databases', group: 'system', icon: Database, emoji: '🗃', keywords: ['data'] },
  profile: { label: 'Profile', group: 'system', icon: CircleUserRound, emoji: '👤', keywords: ['users', 'security', 'appearance', 'integrations', 'settings'] },
  help: { label: 'Helpdesk', group: 'system', icon: HelpCircle, emoji: '❓', keywords: ['docs', 'documentation', 'support'] },
  logs: { label: 'Logs', group: 'system', icon: FileText, emoji: '📊', keywords: ['audit', 'sessions'] },
  apps: { label: 'Apps', group: 'system', icon: Cloud, emoji: '🚀', keywords: ['connectors', 'integrations'] },
  about: { label: 'About', group: 'system', icon: Sparkles, emoji: 'ℹ️', keywords: ['version'] },
  notifications: { label: 'Notifications', group: 'system', icon: Bell, emoji: '🔔', keywords: ['alerts', 'reminders'] },
  pricing: { label: 'Plans', group: 'system', icon: ShieldCheck, emoji: '✨', keywords: ['pricing', 'subscription'] },
  finsync: { label: 'FinSync', group: 'money', icon: WalletCards, emoji: '💳', keywords: ['banking', 'budget', 'cards', 'sync'] },
  oxfin: { label: 'OxFin', group: 'money', icon: Landmark, emoji: '🏦', keywords: ['wallets', 'cards', 'investments', 'intelligence'] },
  equity: { label: 'Equity Lens', group: 'money', icon: TrendingUp, emoji: '📊', keywords: ['stocks', 'nifty', 'options', 'markets'] },
  forex: { label: 'Forex Forecast', group: 'insights', icon: Sparkles, emoji: '📈', keywords: ['forex', 'ml', 'currency', 'prediction'] },
  family: { label: 'Family Connect', group: 'life', icon: Users, emoji: '🌳', keywords: ['family', 'trees', 'memories', 'vault'] },
  companion: { label: 'Apps Suite', group: 'system', icon: Cloud, emoji: '🎛️', keywords: ['companion', 'suite', 'ecosystem', 'integrated', 'matrix'] },
};

const AREA_GROUP = { finance: 'money', insights: 'insights', wellness: 'wellness', workspace: 'work', life: 'life', hub: 'system' };
const AREA_ICON = { finance: WalletCards, insights: TrendingUp, wellness: HeartPulse, workspace: BriefcaseBusiness, life: Users, hub: LayoutDashboard };
export const TABS = Object.freeze(Object.fromEntries(FEATURES.map(feature => {
  const meta = TAB_CORE[feature.id] || { icon: AREA_ICON[feature.area], emoji: '▦', keywords: [] };
  return [feature.id, Object.freeze({
    ...meta, ...feature, group: AREA_GROUP[feature.area], description: `${feature.label} · ${feature.area}`,
    shortLabel: feature.label, order: 0, navigation: 'secondary', pageTemplate: feature.template,
  })];
})));

export const GROUPS = {
  insights: { label: 'Insights', icon: TrendingUp, tabs: ['overview', 'actions', 'current', 'analytics', 'dashboards', 'progress', 'forecast', 'forex'] },
  money: { label: 'Finance', icon: WalletCards, tabs: FEATURES.filter(item => item.area === 'finance').map(item => item.id) },
  wellness: { label: 'Wellness', icon: HeartPulse, tabs: ['wellness', 'sleep', 'lifestyle', 'mind', 'medical', 'health', 'habits', 'physique', 'assessment', 'training', 'strength', 'nutrition', 'hydration'] },
  work: { label: 'Workspace', icon: BriefcaseBusiness, tabs: ['workspace', 'calendar', 'documents', 'notes', 'tasks', 'projects', 'timesheet', 'skills', 'goals'] },
  life: { label: 'Life', icon: Users, tabs: ['life', 'family', 'social', 'entertainment', 'maps'] },
  system: { label: 'Hub', icon: LayoutDashboard, tabs: ['hub', 'companion', 'apps', 'ai', 'databases', 'profile', 'notifications', 'help', 'logs', 'about', 'pricing'] },
};

// Finance is the primary command and appears first in the main navigation.
export const GROUP_ORDER = ['money', 'insights', 'wellness', 'work', 'life', 'system'];
export const MOBILE_QUICK_GROUPS = ['money', 'insights', 'wellness', 'work'];
const LEGACY_DEFAULT_GROUP_ORDER = ['wellness', 'insights', 'work', 'money', 'life', 'system'];
export const TAB_GROUP_MAP = Object.fromEntries(Object.entries(TABS).map(([id, tab]) => [id, tab.group]));
export const ROUTE_ALIASES = Object.fromEntries(FEATURES.flatMap(item => item.aliases.map(alias => [alias, item.id])));
export const MODULE_DEFINITIONS = Object.freeze(Object.values(TABS).map(meta => Object.freeze({
  ...meta,
  aliases: Object.entries(ROUTE_ALIASES).filter(([, target]) => target === meta.id).map(([alias]) => alias),
})));
export const NAVIGABLE_MODULES = {
  ...Object.fromEntries(Object.entries(FEATURE_BY_ID).map(([id, meta]) => [id, meta.label])),
};

export function normalizeGroupOrder(saved = []) {
  const valid = Array.isArray(saved) ? saved.filter(id => Object.hasOwn(GROUPS, id)) : [];
  // Prior releases persisted their old default with removed 'today'/'body'
  // entries. Treat that exact sequence as an obsolete default, not a choice.
  if (valid.join('|') === LEGACY_DEFAULT_GROUP_ORDER.join('|')) return [...GROUP_ORDER];
  return [...new Set([...valid, ...GROUP_ORDER])];
}

export function normalizeTabOrder(saved, available) {
  const valid = [...new Set((Array.isArray(available) ? available : []).map(id => ROUTE_ALIASES[id] || id).filter(id => Object.hasOwn(TABS, id)))];
  return [...new Set([...(Array.isArray(saved) ? saved : []).map(id => ROUTE_ALIASES[id] || id).filter(id => valid.includes(id)), ...valid])];
}

export function navigationGroups(configured = []) {
  return Object.fromEntries(Object.entries(GROUPS).map(([id, group]) => {
    const custom = Array.isArray(configured) ? configured.find(item => item?.id === id) : null;
    return [id, {
      ...group,
      label: id === 'system' ? 'Hub' : (typeof custom?.label === 'string' && custom.label.trim() ? custom.label : group.label),
      // Configuration may reorder modules, but must never hide built-in destinations.
      tabs: normalizeTabOrder(custom?.tabs, group.tabs),
    }];
  }));
}

export function tabMeta(id) {
  return TABS[id] || TABS[ROUTE_ALIASES[id]] || { id, canonicalPath: `/${id}`, label: id, description: 'Workspace', icon: Settings, emoji: '📌', keywords: [], aliases: [], availability: 'planned' };
}

export function canonicalModule(id) {
  return tabMeta(ROUTE_ALIASES[id] || id);
}

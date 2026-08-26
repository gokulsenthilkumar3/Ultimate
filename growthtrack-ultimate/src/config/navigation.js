import {
  Activity, Bot, BriefcaseBusiness, CalendarDays, CircleUserRound, Clapperboard,
  Cloud, Database, Dumbbell, FileText, Goal, HandCoins, HeartPulse, HelpCircle,
  History, Home, Landmark, LayoutDashboard, ListChecks, Map, PieChart, Ruler,
  Settings, ShieldCheck, ShoppingBag, Sparkles, Target, TrendingUp, Trophy,
  Users, Utensils, WalletCards, Waves,
} from 'lucide-react';

export const TABS = {
  overview: { label: 'Overview', group: 'today', icon: Home, emoji: '🏠', keywords: ['home', 'today', 'dashboard'] },
  current: { label: 'Current', group: 'today', icon: Activity, emoji: '🌤', keywords: ['now', 'status'] },
  physique: { label: 'Physique', group: 'body', icon: Ruler, emoji: '📐', keywords: ['blueprint', '3d mirror', 'targets', 'history', 'humanoid'] },
  assessment: { label: 'Assessment', group: 'body', icon: ListChecks, emoji: '📋', keywords: ['body assessment'] },
  training: { label: 'Training', group: 'body', icon: Dumbbell, emoji: '💪', keywords: ['workout', 'fitness'] },
  strength: { label: 'Strength', group: 'body', icon: Trophy, emoji: '🏋', keywords: ['lifting', '1rm'] },
  nutrition: { label: 'Nutrition', group: 'body', icon: Utensils, emoji: '🥗', keywords: ['food', 'diet'] },
  hydration: { label: 'Hydration', group: 'body', icon: Waves, emoji: '💧', keywords: ['water'] },
  sleep: { label: 'Sleep', group: 'wellness', icon: History, emoji: '😴', keywords: ['rest'] },
  lifestyle: { label: 'Lifestyle', group: 'wellness', icon: Sparkles, emoji: '🌿', keywords: ['wellbeing'] },
  mind: { label: 'Mind & Wellness', group: 'wellness', icon: HeartPulse, emoji: '🧠', keywords: ['meditation', 'mental'] },
  medical: { label: 'Medical', group: 'wellness', icon: ShieldCheck, emoji: '🏥', keywords: ['health records'] },
  health: { label: 'Health+', group: 'wellness', icon: HeartPulse, emoji: '🩺', keywords: ['vitals'] },
  habits: { label: 'Habits', group: 'wellness', icon: Goal, emoji: '🔥', keywords: ['routine', 'streak'] },
  insights: { label: 'Insights', group: 'insights', icon: TrendingUp, emoji: '📊', keywords: ['analytics', 'dashboards', 'growth forecast', 'growthcast'] },
  progress: { label: 'Progress', group: 'insights', icon: PieChart, emoji: '📈', keywords: ['trends'] },
  goals: { label: 'Goals', group: 'insights', icon: Target, emoji: '🎯', keywords: ['targets', 'forecast'] },
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
  ai: { label: 'Agent', group: 'system', icon: Bot, emoji: '🤖', keywords: ['ollama', 'assistant', 'llm'] },
  databases: { label: 'Databases', group: 'system', icon: Database, emoji: '🗃', keywords: ['data'] },
  profile: { label: 'Profile', group: 'system', icon: CircleUserRound, emoji: '👤', keywords: ['users', 'security', 'appearance', 'integrations', 'settings'] },
  help: { label: 'Helpdesk', group: 'system', icon: HelpCircle, emoji: '❓', keywords: ['docs', 'documentation', 'support'] },
  logs: { label: 'Logs', group: 'system', icon: FileText, emoji: '📊', keywords: ['audit', 'sessions'] },
  apps: { label: 'Apps', group: 'system', icon: Cloud, emoji: '🚀', keywords: ['connectors', 'integrations'] },
  about: { label: 'About', group: 'system', icon: Sparkles, emoji: 'ℹ️', keywords: ['version'] },
};

export const GROUPS = {
  today: { label: 'Today', icon: Home, tabs: ['overview', 'current'] },
  body: { label: 'Body', icon: Dumbbell, tabs: ['physique', 'assessment', 'training', 'strength', 'nutrition', 'hydration'] },
  wellness: { label: 'Wellness', icon: HeartPulse, tabs: ['sleep', 'lifestyle', 'mind', 'medical', 'health', 'habits'] },
  insights: { label: 'Insights', icon: TrendingUp, tabs: ['insights'] },
  work: { label: 'Workspace', icon: BriefcaseBusiness, tabs: ['workspace', 'tasks', 'projects', 'timesheet', 'skills'] },
  money: { label: 'Money', icon: WalletCards, tabs: ['finance', 'shopping', 'sip', 'portfolio'] },
  life: { label: 'Life', icon: Users, tabs: ['social', 'entertainment', 'maps'] },
  system: { label: 'More', icon: LayoutDashboard, tabs: ['ai', 'databases', 'profile', 'help', 'logs', 'apps', 'about'] },
};

export const GROUP_ORDER = Object.keys(GROUPS);
export const MOBILE_QUICK_GROUPS = ['today', 'body', 'insights', 'work', 'system'];
export const TAB_GROUP_MAP = Object.fromEntries(Object.entries(TABS).map(([id, tab]) => [id, tab.group]));
export const ROUTE_ALIASES = { humanoid: 'physique', analytics: 'insights', dashboards: 'insights', forecast: 'insights', calendar: 'workspace', documents: 'workspace', notes: 'workspace', settings: 'profile' };
export const NAVIGABLE_MODULES = {
  ...Object.fromEntries(Object.entries(TABS).map(([id, meta]) => [id, meta.label])),
  humanoid: 'Humanoid', analytics: 'Analytics', dashboards: 'Dashboards', forecast: 'Growth Forecast',
  calendar: 'Calendar', documents: 'Documents', notes: 'Notes', settings: 'Profile & Settings',
};

export function normalizeGroupOrder(saved = []) {
  return [...saved.filter(id => GROUPS[id]), ...GROUP_ORDER.filter(id => !saved.includes(id))];
}

export function tabMeta(id) {
  return TABS[id] || TABS[ROUTE_ALIASES[id]] || { label: id, icon: Settings, emoji: '📌', keywords: [] };
}

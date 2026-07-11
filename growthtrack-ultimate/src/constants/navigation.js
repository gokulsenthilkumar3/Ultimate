/**
 * constants/navigation.js — GrowthTrack Ultimate
 *
 * Single source of truth for navigation groupings.
 * Previously defined inline inside BottomNavBar.jsx — extracted here
 * so App.jsx, FloatingNav, BottomNavBar and tests all share one map.
 *
 * USAGE:
 *   import { TAB_GROUP_MAP, GROUPS, BOTTOM_NAV_GROUPS } from '../constants/navigation';
 */

/**
 * Maps every tab id → its group id.
 * Used by FloatingNav to bucket tabs into labeled sections.
 */
export const TAB_GROUP_MAP = {
  // ── Core Health & Body ──────────────────────────────────────────────────
  overview:   'core',
  humanoid:   'core',
  physique:   'core',
  assessment: 'core',

  // ── Fitness ─────────────────────────────────────────────────────────────
  training:   'fitness',
  strength:   'fitness',
  nutrition:  'fitness',
  hydration:  'fitness',
  habits:     'fitness',

  // ── Wellness ────────────────────────────────────────────────────────────
  sleep:      'wellness',
  lifestyle:  'wellness',
  mind:       'wellness',
  medical:    'wellness',
  health:     'wellness',

  // ── Analytics & Progress ────────────────────────────────────────────────
  progress:   'analytics',
  goals:      'analytics',
  analytics:  'analytics',
  forecast:   'analytics',

  // ── Productivity ────────────────────────────────────────────────────────
  tasks:      'productivity',
  calendar:   'productivity',
  timesheet:  'productivity',
  projects:   'productivity',
  skills:     'productivity',

  // ── Finance ─────────────────────────────────────────────────────────────
  finance:    'finance',
  shopping:   'finance',
  sip:        'finance',

  // ── Life ────────────────────────────────────────────────────────────────
  entertainment: 'life',
  social:     'life',
  maps:       'life',

  // ── Creative & Knowledge ────────────────────────────────────────────────
  notes:      'creative',
  documents:  'creative',
  portfolio:  'creative',

  // ── Tech & Work ─────────────────────────────────────────────────────────
  databases:  'tech',
  ai:         'tech',
  current:    'tech',
  logs:       'tech',

  // ── Dashboards ──────────────────────────────────────────────────────────
  dashboards: 'dashboards',
  about:      'dashboards',
};

/**
 * Ordered list of group descriptors used to build FloatingNav dividers.
 * Order here controls the order sections appear in the nav.
 */
export const GROUPS = [
  { id: 'core',         label: 'Body' },
  { id: 'fitness',      label: 'Fitness' },
  { id: 'wellness',     label: 'Wellness' },
  { id: 'analytics',    label: 'Analytics' },
  { id: 'productivity', label: 'Work' },
  { id: 'finance',      label: 'Finance' },
  { id: 'life',         label: 'Life' },
  { id: 'creative',     label: 'Create' },
  { id: 'tech',         label: 'Tech' },
  { id: 'dashboards',   label: 'Boards' },
];

/**
 * Bottom nav bar groups — the 5 primary sections shown as tab icons on mobile.
 * Each entry carries an icon name (Lucide) and a list of tab IDs that belong to it.
 */
export const BOTTOM_NAV_GROUPS = [
  {
    id:    'home',
    label: 'Home',
    icon:  'Home',
    tabs:  ['overview', 'humanoid', 'physique', 'assessment'],
  },
  {
    id:    'body',
    label: 'Body',
    icon:  'Dumbbell',
    tabs:  ['training', 'strength', 'nutrition', 'hydration', 'habits', 'sleep', 'lifestyle', 'mind', 'medical', 'health'],
  },
  {
    id:    'track',
    label: 'Track',
    icon:  'BarChart2',
    tabs:  ['progress', 'goals', 'analytics', 'forecast', 'logs'],
  },
  {
    id:    'work',
    label: 'Work',
    icon:  'Briefcase',
    tabs:  ['tasks', 'calendar', 'timesheet', 'projects', 'skills', 'finance', 'shopping', 'notes', 'documents', 'databases', 'ai', 'current', 'portfolio', 'social', 'entertainment', 'maps', 'sip'],
  },
  {
    id:    'system',
    label: 'System',
    icon:  'Settings',
    tabs:  ['dashboards', 'about', 'settings', 'apps', 'notifications'],
  },
];

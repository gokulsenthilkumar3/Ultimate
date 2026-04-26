/**
 * icons.js — Centralized icon mapping to replace inconsistent OS emoji usage.
 *
 * Why: Native emojis render differently across Windows / macOS / iOS / Android,
 * breaking the premium cross-platform aesthetic. This file maps every emoji ID
 * used across the dashboard to a Lucide React icon component.
 *
 * Usage:
 *   import { getIcon } from '../utils/icons';
 *   const Icon = getIcon('brain');
 *   return <Icon size={20} />;
 */

import {
  Brain, Moon, Activity, BookOpen, Trees, Droplets, Apple,
  Dumbbell, Sun, Music, Bike, Eye, Ear, Hand,
  Heart, Flame, Zap, Thermometer, Shield, Wind,
  Scale, Shirt, Footprints, Pill, ShoppingCart, Utensils,
  TrendingUp, BarChart2, Star, CheckCircle, AlertCircle,
  Users, Globe, Code, DollarSign, Bitcoin, Calculator,
  Ruler, Bone, Leaf
} from 'lucide-react';

/** Map from emoji character or ID to Lucide icon component */
export const ICON_MAP = {
  // Lifestyle Habit emojis
  '🏃': Activity,
  '💤': Moon,
  '🧘': Wind,
  '📚': BookOpen,
  '🌳': Trees,
  '💧': Droplets,
  '🍎': Apple,
  '🧠': Brain,
  '🏋️': Dumbbell,
  '☀️': Sun,
  '🎵': Music,
  '🚴': Bike,

  // Body / Organ icons
  'brain':    Brain,
  'heart':    Heart,
  'bone':     Bone,
  'eye':      Eye,
  'ear':      Ear,
  'hand':     Hand,
  'leaf':     Leaf,
  'shield':   Shield,
  'flame':    Flame,
  'zap':      Zap,
  'thermo':   Thermometer,
  'scale':    Scale,
  'ruler':    Ruler,

  // Senses
  '👁️': Eye,
  '👂': Ear,
  '👃': Activity,
  '👅': Utensils,
  '🤚': Hand,

  // Skills
  '🇬🇧': Globe,
  '🇪🇸': Globe,
  '🇫🇷': Globe,
  '🇩🇪': Globe,
  '🐍': Code,
  '🟡': Code,
  '☕': Code,
  '🔵': Code,
  '📈': TrendingUp,
  '💰': DollarSign,
  '📉': BarChart2,
  '₿': Bitcoin,
  '🤟': Users,
  '📡': Activity,

  // General
  '⚖️': Scale,
  '👕': Shirt,
  '📐': Ruler,
  '👖': Scale,
  '💪': Dumbbell,
  '🍑': Activity,
  '🦵': Activity,
  '🍆': Ruler,
  '🔴': Activity,
  '😴': Moon,
  '❤️': Heart,
  '🧩': Brain,
  '💇': Users,
  '✨': Star,
  '🥫': Activity,

  // Status
  'check':   CheckCircle,
  'alert':   AlertCircle,
  'star':    Star,
};

/**
 * Get a Lucide icon component for an emoji or icon ID.
 * Falls back to Activity icon if not found.
 *
 * @param {string} emojiOrId - emoji character or string ID
 * @returns {React.ComponentType}
 */
export function getIcon(emojiOrId) {
  return ICON_MAP[emojiOrId] || Activity;
}

/**
 * IconFromEmoji — React component wrapper for emoji → Lucide icon.
 *
 * @example
 * <IconFromEmoji emoji="🧠" size={20} color="var(--accent)" />
 */
export function IconFromEmoji({ emoji, size = 16, color = 'currentColor', ...props }) {
  const Icon = getIcon(emoji);
  return <Icon size={size} color={color} {...props} />;
}

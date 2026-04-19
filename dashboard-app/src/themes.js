// ═══════════════════════════════════════════════════════════
// THEME DEFINITIONS
// ═══════════════════════════════════════════════════════════

export const COLOR_ACCENTS = {
  gold:   { name: "Gold",   primary: "#f59e0b", light: "#fbbf24", dark: "#d97706", glow: "rgba(245,158,11,0.25)", id: "gold"   },
  cyan:   { name: "Ocean",  primary: "#06b6d4", light: "#22d3ee", dark: "#0891b2", glow: "rgba(6,182,212,0.25)",  id: "cyan"   },
  purple: { name: "Violet", primary: "#8b5cf6", light: "#a78bfa", dark: "#7c3aed", glow: "rgba(139,92,246,0.25)", id: "purple" },
  rose:   { name: "Rose",   primary: "#f43f5e", light: "#fb7185", dark: "#e11d48", glow: "rgba(244,63,94,0.25)",  id: "rose"   },
  green:  { name: "Mint",   primary: "#10b981", light: "#34d399", dark: "#059669", glow: "rgba(16,185,129,0.25)", id: "green"  },
};

export const DARK_THEME = {
  id: "dark",
  "--bg-base":       "#070b14",
  "--bg-surface":    "#0d1220",
  "--bg-elevated":   "#111827",
  "--bg-card":       "rgba(255,255,255,0.04)",
  "--bg-card-hover": "rgba(255,255,255,0.07)",
  "--bg-glass":      "rgba(13,18,32,0.85)",
  "--border":        "rgba(255,255,255,0.08)",
  "--border-strong": "rgba(255,255,255,0.14)",
  "--text-1":        "#f1f5f9",
  "--text-2":        "#94a3b8",
  "--text-3":        "#475569",
  "--text-4":        "#2d3748",
  "--shadow":        "0 8px 32px rgba(0,0,0,0.5)",
  "--shadow-lg":     "0 20px 60px rgba(0,0,0,0.6)",
};

export const LIGHT_THEME = {
  id: "light",
  "--bg-base":       "#f0f4ff",
  "--bg-surface":    "#e8edf8",
  "--bg-elevated":   "#ffffff",
  "--bg-card":       "rgba(255,255,255,0.85)",
  "--bg-card-hover": "rgba(255,255,255,0.98)",
  "--bg-glass":      "rgba(240,244,255,0.92)",
  "--border":        "rgba(0,0,0,0.08)",
  "--border-strong": "rgba(0,0,0,0.15)",
  "--text-1":        "#0f1729",
  "--text-2":        "#374151",
  "--text-3":        "#6b7280",
  "--text-4":        "#9ca3af",
  "--shadow":        "0 8px 32px rgba(0,0,0,0.1)",
  "--shadow-lg":     "0 20px 60px rgba(0,0,0,0.15)",
};

export function applyTheme(mode, accent) {
  const base = mode === "light" ? LIGHT_THEME : DARK_THEME;
  const ac   = COLOR_ACCENTS[accent] || COLOR_ACCENTS.gold;
  const root = document.documentElement;
  Object.entries(base).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.setProperty("--accent",       ac.primary);
  root.style.setProperty("--accent-light", ac.light);
  root.style.setProperty("--accent-dark",  ac.dark);
  root.style.setProperty("--accent-glow",  ac.glow);
  root.style.setProperty("--mode",         mode);
}

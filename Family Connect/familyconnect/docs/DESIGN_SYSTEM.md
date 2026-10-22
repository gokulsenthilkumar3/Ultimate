# 🎨 Design System — FamilyConnect

## Color Palette

### Primary

| Name | Hex | Usage |
|---|---|---|
| Deep Saffron | `#FF6B35` | CTAs, active states, Indian identity |
| Navy Blue | `#0A1128` | Backgrounds, dark surfaces |
| Cream | `#FFF8F3` | Warm secondary backgrounds |

### Accents

| Name | Hex | Usage |
|---|---|---|
| Emerald | `#10B981` | Success, prosperity |
| Soft Rose | `#F87171` | Celebrations, milestones |
| Gold | `#F59E0B` | Premium highlights |

### Neutrals

| Name | Hex | Usage |
|---|---|---|
| Dark Gray | `#1F2937` | Primary text |
| Medium Gray | `#6B7280` | Secondary text |
| Light Gray | `#F3F4F6` | Surface backgrounds |
| White | `#FFFFFF` | Base surfaces |

## CSS Variables

```css
:root {
  /* Primary */
  --color-saffron: #FF6B35;
  --color-navy: #0A1128;
  --color-cream: #FFF8F3;

  /* Accents */
  --color-emerald: #10B981;
  --color-rose: #F87171;
  --color-gold: #F59E0B;

  /* Neutrals */
  --color-gray-900: #1F2937;
  --color-gray-600: #6B7280;
  --color-gray-100: #F3F4F6;
  --color-white: #FFFFFF;

  /* Typography */
  --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;

  /* Spacing */
  --space-1: 0.25rem;   /*  4px */
  --space-2: 0.5rem;    /*  8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
}
```

## Typography Scale

| Token | Size | Weight | Usage |
|---|---|---|---|
| `--text-h1` | 48px | 700 | Page headlines |
| `--text-h2` | 32px | 700 | Section titles |
| `--text-h3` | 24px | 600 | Card titles |
| `--text-body` | 16px | 400 | Body copy |
| `--text-sm` | 14px | 400 | Buttons, labels |
| `--text-xs` | 12px | 400 | Captions, metadata |

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: var(--color-saffron);
  color: white;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 14px;
  transition: all 180ms ease;
}
.btn-primary:hover {
  background: #e85a2a;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  border: 1.5px solid var(--color-saffron);
  color: var(--color-saffron);
  padding: 11px 24px;
  border-radius: var(--radius-md);
}
```

### Member Card

```css
.member-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-md);
  transition: all 180ms ease;
}
.member-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
```

### Tree Node

```css
.tree-node {
  width: 120px;
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
  border: 1.5px solid var(--color-gray-100);
}
.tree-node.selected {
  border-color: var(--color-saffron);
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.2);
}
```

## Animations

```css
/* Entrance animation */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Node entrance stagger */
@keyframes nodeEnter {
  from { opacity: 0; transform: scale(0.8); }
  to   { opacity: 1; transform: scale(1); }
}

/* Ripple on button click */
@keyframes ripple {
  to { transform: scale(4); opacity: 0; }
}

/* Shimmer skeleton */
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}
```

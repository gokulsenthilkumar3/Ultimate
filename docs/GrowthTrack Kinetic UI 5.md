# GrowthTrack Kinetic UI 5.0 — cinematic, 2D-animated, performance-first specification

This is the complete next-generation UI direction to layer on top of the current `character-workspace-v3` / `data-ui-style="playful"` system. It preserves the existing React shell, route registry, token pipeline and accessibility rules, and upgrades the presentation to a **cinematic, high-contrast, 2D-animated workspace** with a hard performance contract that scales from low-spec laptops to ProMotion displays.

Proposed presentation name: **`kinetic-workspace-v4`**  
Proposed flag: `data-ui-style="kinetic"` with `playful` retained as fallback.  
Proposed token version: **5.0.0** (4.2.0 tokens remain aliases during migration).

---

## 1. Direction summary

| Area             | Decision                                                                                                                                                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feeling          | Warm, bright, **energetic, dramatic, cinematic** — like a MacBook studio display that animates.                                                                                                                                                                                         |
| Characters       | Vibrant **2D Glow Crew** (Blip, Mochi, Ziggy, Nova). Chunky SVG shapes, thick ink outlines, high-saturation fills, squash-and-stretch, state machine. No 3D characters.                                                                                                                 |
| Motion libraries | **Framer Motion** for page/component/layout flows; **GSAP + ScrollTrigger** only for landing/hero timelines and one-shot choreography; **Web Animations API** for imperative one-shots; **CSS** for micro-interactions; **Three.js** only for Physique 3D and one optional hero accent. |
| 3D policy        | 3D is rare and earned: Physique workspace, optional landing orb with 2D fallback. Everything else is 2D SVG, CSS, canvas particles and motion graphics.                                                                                                                                 |
| Visual style     | Bolder palette, higher contrast, minimal workspace copy, oversized tabular numbers, generous whitespace, "studio display" hierarchy.                                                                                                                                                    |
| Performance      | 60 fps sustained (120 fps opportunistic); zero perceptible lag; adaptive quality tiers; hard budgets for JS, CSS, fonts, GPU layers and concurrent animations.                                                                                                                          |
| Loading          | Predictive route prefetch, lazy chunks, virtualization, skeleton-first rendering, and a "never block first paint" rule.                                                                                                                                                                 |
| Accessibility    | Reduced-motion, keyboard, focus, contrast and forced-colors support are non-negotiable; animation is never the only status signal.                                                                                                                                                      |

**One-line brief:** "A cinematic, illustrated, 2D-animated studio workspace that snaps, celebrates and flows — but never drops a frame on a spec laptop."

---

## 2. Performance contract — never lag

These are acceptance gates, not aspirations. If a gate fails, the offending effect is downgraded by the adaptive motion provider before shipping.

| Metric                           | Target                                               | Enforcement                                                                    |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| Frame rate                       | 60 fps sustained; 120 fps opportunistic on ProMotion | FPS sampler (2 s window); auto-downgrade one tier if <50 fps.                  |
| Frame budget                     | 16.7 ms @ 60 Hz; 8.3 ms @ 120 Hz                     | `PerformanceObserver` long tasks; flag any >50 ms during navigation/animation. |
| INP                              | <200 ms on real controls                             | Measure on click, tab, filter and form submit.                                 |
| LCP                              | <2.5 s on 4G mid-tier laptop                         | Critical routes: `/welcome`, `/login`, `/insights/overview`.                   |
| CLS                              | <0.05                                                | Reserve space for fonts, skeleton, consent banner and character art.           |
| Initial JS                       | <180 KB gzip                                         | Route chunks <90 KB gzip each; shell chunk minimal.                            |
| Critical CSS                     | <45 KB gzip                                          | Motion CSS split by route; GSAP/Three.js never in shell.                       |
| Fonts                            | Max 2 files, preloaded, `font-display: swap`         | Inter variable Latin subset preferred.                                         |
| GPU-promoted layers              | <30 during any screen                                | Remove `will-change` after animation completes.                                |
| Working set                      | <250 MB tab after 30 min                             | No leaked timelines, observers, WebGL resources or RAF loops.                  |
| Concurrent decorative animations | ≤12 Tier 2, ≤6 Tier 1, ≤3 Tier 0                     | Centralised counter in motion provider.                                        |
| Canvas particles                 | ≤120 particles, DPR ≤2                               | One shared canvas; never one DOM node per particle.                            |

### Animation property rules (compositor-only)

- Animate **only** `transform` and `opacity` for continuous or high-frequency motion.
- Never continuously animate `width`, `height`, `top`, `left`, `margin`, `box-shadow`, `filter`, `background-position` or `backdrop-filter`.
- Short one-shot colour/border transitions allowed at ≤200 ms and must not run during scroll.
- Use `contain: layout paint style` on animated cards/sections.
- Use `content-visibility: auto` with `contain-intrinsic-size` on below-the-fold sections.
- Pause all decorative motion when `document.hidden`, when offscreen via `IntersectionObserver`, or when reduced motion is active.
- Never run GSAP and Framer Motion on the same property of the same element.
- Never animate inside a scroll handler; use `ScrollTrigger` with one scheduled frame per scroll update.

---

## 3. Visual system — studio display, bolder, cinematic

### 3.1 Palette — high contrast, dramatic accents

Keep the cream/ink identity but push saturation and contrast. Coral becomes the energetic primary. Mint is success/secondary. Yellow is highlight/celebration. Lilac is information/insight. Electric blue is link/focus only, with white text.

| Role          | Value     | Use                              |
| ------------- | --------- | -------------------------------- |
| Ink           | `#10231C` | Text, outlines, dark UI          |
| Paper         | `#FFF8E7` | Canvas                           |
| Coral         | `#FF5A3C` | Primary action, Blip             |
| Coral text    | `#B3341F` | Coral-toned body text on cream   |
| Mint          | `#2EE6A8` | Success, secondary, Mochi        |
| Yellow        | `#FFD23F` | Highlight, Ziggy                 |
| Lilac         | `#A78BFA` | Info, Nova                       |
| Electric blue | `#3B82F6` | Links/focus with white text only |
| Danger        | `#C0261B` | Destructive                      |
| Success text  | `#0F6B42` | Success copy on cream            |
| Warning text  | `#7A4A00` | Warning copy on cream            |

Contrast checks:

- Ink on paper ~15:1; ink on coral ~5.3:1; ink on mint ~10:1; ink on yellow ~11:1; ink on lilac ~6:1.
- Never pale coral body text on cream; use `#B3341F`.
- Dark/AMOLED accent luminance raised: coral `#FF7A5C`, mint `#55F0BE`, yellow `#FFE066`, lilac `#C4B5FD`.

### 3.2 Typography — bigger numbers, less text

- **Inter Variable** Latin subset, or current Inter 400/500/600/700 plus 800 for hero metrics.
- "One hero number" rule: every workspace page has a primary metric at **72–120 px**, weight 750–800, tabular numerals, `tracking: -0.04em`.
- Secondary metrics 40–56 px; card titles 16–20 px; body 14/22 px; labels 12 px weight 600.
- Strip explanatory paragraphs from workspace cards. Move rationale into tooltips, helpdesk or a "Why this matters" disclosure.
- Public landing/login keep expressive display type but shorter paragraphs.

| Role          | Size                      | Weight |
| ------------- | ------------------------- | ------ |
| Hero metric   | `clamp(64px, 8vw, 120px)` | 800    |
| Page title    | 32–40 px                  | 700    |
| Section title | 22–28 px                  | 700    |
| Card title    | 16–20 px                  | 650    |
| Body          | 14 / 22 px                | 400    |
| Label         | 12 px                     | 600    |
| Button        | 14–15 px                  | 650    |

### 3.3 Layout — MacBook screen effect

- Max content width **1440 px**; 64–80 px page padding; 12-column grid; 24 px gutters.
- Cards: 16–24 px radius, 1.5–2 px ink outline, **hard 4 px offset shadow** (not soft blur).
- Generous whitespace; group metrics in threes; single-row toolbars.
- Desktop rail 224 px, collapsible to 64 px; floating dock at narrow widths.
- Reserve space for character art, consent banner and skeletons to protect CLS.
- No heavy animated background on scrolling surfaces.

---

## 4. Character system v4 — the Glow Crew (2D, vibrant)

Replace the static-feeling sticker set with a **vibrant 2D cast** built around a proper state machine. All characters are layered SVG sprites reused via `<symbol>` + `<use>`.

| Character | Form                                     | Role                                 | Personality                   |
| --------- | ---------------------------------------- | ------------------------------------ | ----------------------------- |
| **Blip**  | Coral comet/fox-spark with trailing tail | Focus, primary action, attention     | Energetic, snaps to attention |
| **Mochi** | Mint rounded blob with tiny arms         | Success, calm progress, empty states | Soft, bouncy, celebrates      |
| **Ziggy** | Yellow lightning/zigzag sprite           | Warnings, quick actions, streaks     | Fast, jittery, playful        |
| **Nova**  | Lilac four-point star                    | Information, insights, loading       | Curious, twinkles             |

Existing Siren/Snip/Sunny remain as aliases if routes reference them; the new cast renders by default.

### 4.1 Character animation states

| State     | Trigger             | Animation                                  | Duration           | Tier                      |
| --------- | ------------------- | ------------------------------------------ | ------------------ | ------------------------- |
| Idle      | Default             | Float ±6 px, subtle rotate ±1°             | 4–6 s loop         | All                       |
| Blink     | Random              | Eyes scaleY → 0.1 → 1                      | 120 ms every 6–9 s | All                       |
| Wave      | Greeting/login      | Arm −12° → +8°                             | 600 ms × 2         | Tier 1+                   |
| Listen    | Password/form focus | Eyes close, head tilt 2°                   | 300 ms             | All                       |
| Snip      | Dismiss/remove      | Scissor blades ±15°                        | 500 ms × 2         | Tier 1+                   |
| Celebrate | Success/check-in    | Squash 1.08 → 0.94 → 1 + 6 confetti pieces | 700 ms             | Tier 1+ (confetti Tier 2) |
| Oops      | Error               | Quick shake ±3°, sad eyes                  | 350 ms             | All                       |
| Sleep     | Loading >2 s        | Eyes closed, slow float                    | Loop               | All                       |

### 4.2 SVG and rendering rules

- One `<symbol>` sprite per character, reused via `<use>`; ≤20 paths, ≤5 groups per character.
- No SVG filters on animated layers. Flat fills + CSS outlines only.
- Animate `<g>` transforms with `transform-box: fill-box; transform-origin: center`.
- Character entrance: GSAP once (850 ms, 100 ms stagger), then hand off to CSS/WAAPI loops.
- One instance per location; pause offscreen with `IntersectionObserver` (40 px margin).
- Provide a static reduced-motion pose.

### 4.3 Character-based micro animations (throughout the workspace)

- **Form focus** → character listens.
- **Save success** → Mochi celebrates, inline checkmark pops.
- **Delete/dismiss** → Snip snaps, row exits with fade + rise.
- **Loading >2 s** → character sleep pose + skeleton.
- **Empty state** → Nova twinkles beside the empty message.
- **Error** → Ziggy jitter + Oops shake + inline error text.
- **Streak/milestone** → Ziggy sparks + count-up hero number.
- **Navigation change** → character "hello" 450 ms rotation.
- **Sign-out** → Sunny wave, draft-choice cards lift 2 px on hover.

---

## 5. Motion stack and ownership

| Layer                          | Tool                            | Use                                               | Guardrails                                                                     |
| ------------------------------ | ------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Page/route transitions         | Framer Motion `AnimatePresence` | Snap fade + 8 px rise + 0.995 scale               | `mode="wait"`, ≤240 ms; no layout animation on lists >20 rows                  |
| Shared element / tab indicator | Framer Motion `layoutId`        | Tab underline, dock selection, card expand        | Only small sets                                                                |
| Component micro-interactions   | CSS transitions/keyframes       | Hover, press, focus, checkbox, toggle             | Transform/opacity only; ≤200 ms                                                |
| Landing/hero choreography      | GSAP + ScrollTrigger            | Entrance sequence, snip scene, parallax           | Kill on unmount; `gsap.matchMedia` for reduced motion; max 2 scrubbed sections |
| Imperative one-shots           | Web Animations API              | Confetti, count-up fallback, character reaction   | Cancel on unmount; no layout reads in loop                                     |
| 3D                             | Three.js / existing R3F         | Physique only; optional hero orb with 2D fallback | Lazy chunk; `frameloop="demand"`; DPR cap 2; dispose resources                 |
| Particles                      | Single `<canvas>`               | Confetti, spark bursts                            | ≤120 particles; DPR ≤2; pause hidden                                           |

**Bundle strategy:**

- Framer Motion `LazyMotion` + `domAnimation` + `m` components keep initial bundle small.
- GSAP + ScrollTrigger loaded only on `/welcome` and `/login` via dynamic import.
- Three.js loaded only inside `/wellness/physique` 3D view.
- Never let two libraries animate the same property of the same element.
- Route chunks prefetched on hover/focus and during idle (`requestIdleCallback`).

---

## 6. Cinematic + snap animation catalogue

| Surface                 | Effect                              | Implementation                    | Timing                               |
| ----------------------- | ----------------------------------- | --------------------------------- | ------------------------------------ |
| Route change            | Snap fade + 8 px rise + 0.995 scale | Framer `AnimatePresence`          | 220 ms, spring 500/34                |
| Page section reveal     | Staggered rise                      | Framer `staggerChildren` 40 ms    | 320 ms                               |
| Sidebar/dock selection  | Shared highlight slides             | `layoutId`                        | Spring 500/34                        |
| Button hover            | Lift 2 px, arrow +3 px              | CSS transform                     | 180 ms                               |
| Button press            | Scale 0.98                          | CSS                               | 120 ms                               |
| Magnetic button         | Pointer-follow max 4 px             | GSAP `quickTo`                    | Fine pointers only                   |
| Tab underline           | Slide + width spring                | Framer layout                     | 300 ms                               |
| Hero number             | Count up                            | Framer `useSpring` or GSAP        | 600 ms; instant under reduced motion |
| Checkbox                | Path draw + pop                     | WAAPI + CSS                       | 300 ms                               |
| Demo check              | Pop 0.8 → 1.18 → 1                  | CSS keyframe                      | 400 ms                               |
| Toast                   | Slide + spring                      | Framer                            | 320 ms                               |
| Dialog                  | Scale 0.96 → 1 + backdrop fade      | Framer                            | 240 ms                               |
| Skeleton                | Translate shimmer                   | CSS transform                     | 1.4 s loop                           |
| Character idle          | Float/blink                         | CSS/WAAPI                         | 4–6 s                                |
| Character celebrate     | Squash + canvas confetti            | WAAPI + canvas                    | 700 ms                               |
| Landing hero            | Timeline choreography               | GSAP                              | 1.2 s total, 100 ms stagger          |
| Landing parallax        | Decorative layers ±16 px            | GSAP ScrollTrigger                | One scheduled frame per scroll       |
| Login character         | Eyes close on password focus        | CSS class toggle                  | 200 ms                               |
| 3D Physique             | Rotate on demand                    | R3F demand loop                   | No continuous rAF                    |
| Cinematic section entry | Masked reveal + scale 0.98 → 1      | Framer + CSS clip-path (GPU-safe) | 420 ms                               |
| Snap page swap          | Cross-fade + 0.5 % scale            | Framer                            | 160 ms                               |

**Snap feel:** default spring `{ type: "spring", stiffness: 500, damping: 34, mass: 0.8 }`; default ease `cubic-bezier(.22,1,.36,1)`; press feedback 120 ms; route transitions 220 ms; nothing longer than 1.2 s except character idle.

---

## 7. Micro-animation system

Small, fast, compositor-only feedback on every interactive control.

| Control          | Micro animation                  | Duration              |
| ---------------- | -------------------------------- | --------------------- |
| Primary button   | Lift 2 px + arrow shift 3 px     | 180 ms / 120 ms press |
| Secondary button | Border brighten + 1 px translate | 160 ms                |
| Icon button      | Rotate 6° on hover, snap back    | 140 ms                |
| Checkbox         | Path draw + scale pop            | 300 ms                |
| Radio card       | Ring expand + label weight bump  | 200 ms                |
| Toggle           | Knob spring + track fill         | 220 ms                |
| Tabs             | Underline slide + chip pop       | 300 / 320 ms          |
| Input focus      | 2 px outline + subtle lift       | 160 ms                |
| Field error      | Shake 3 px × 2 + inline message  | 350 ms                |
| Toast            | Slide + icon pop                 | 320 ms                |
| Row hover        | Background fill + 1 px lift      | 140 ms                |
| Row removal      | Fade + 8 px rise                 | 260 ms                |
| Sort indicator   | Rotate 180°                      | 200 ms                |
| Pagination       | Number pop                       | 200 ms                |
| Dialog           | Scale + backdrop fade            | 240 ms                |
| Menu open        | Clip-path reveal                 | 200 ms                |
| Sidebar item     | Highlight slide + icon hello     | 300 / 450 ms          |
| Card expand      | Shared element spring            | 320 ms                |
| Save success     | Checkmark draw + Mochi celebrate | 700 ms                |
| Error            | Ziggy jitter + inline alert      | 350 ms                |
| Hero metric      | Count-up                         | 600 ms                |

All micro-animations are transform/opacity only, gated by reduced motion and tier.

---

## 8. Adaptive quality — every spec laptop

Runtime detection chooses a tier; the motion provider applies it centrally.

| Tier                    | Example hardware                                                  | Effects                                                                                                        |
| ----------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Tier 0 — Lite**       | 4-core, 4–8 GB RAM, integrated GPU, battery saver, reduced motion | Static/blink characters; no parallax; no confetti; no blur; 3D DPR 1; 3 concurrent animations; simpler shadows |
| **Tier 1 — Mainstream** | 8 GB, Iris Xe / Apple M1, 60 Hz                                   | Full 2D motion; 6 confetti pieces; limited parallax; 3D DPR 1.5; 6 concurrent animations                       |
| **Tier 2 — Pro**        | 16 GB+, M2 Pro / RTX, 120 Hz                                      | Full effects; 12 confetti pieces; parallax; 3D DPR 2; 12 concurrent animations                                 |

Detection inputs:

- `navigator.hardwareConcurrency`
- `navigator.deviceMemory`
- `matchMedia('(prefers-reduced-motion: reduce)')`
- `navigator.getBattery?.()`
- FPS sampler (2 s window) → auto-downgrade one tier if <50 fps.
- Manual **Lite motion** toggle in Settings → Appearance.

Rules:

- Adaptive decisions live in `KineticProvider`, not scattered through components.
- Tier 0 keeps every functional action and status; it removes only decoration.
- Tier downgrade is silent; upgrade requires sustained performance.

---

## 9. Loading and capacity strategy

### 9.1 Code and routes

- Route-level `React.lazy` + `Suspense` with skeleton fallback.
- Prefetch chunks on hover/focus and idle.
- Vite `manualChunks`: `react`, `framer`, `gsap`, `three`, `charts`, `vendor`.
- Defer domain CSS with route imports.
- `startTransition` for non-urgent filter/search updates.

### 9.2 Fonts and assets

- Inter variable WOFF2, Latin subset, preloaded; `size-adjust` fallback to protect CLS.
- SVGO character/logo assets; inline critical logo; sprite icons.
- Images: AVIF/WebP, `srcset`, `loading="lazy"`, `decoding="async"`, fixed dimensions.
- No unused weights, italics or handwriting fonts shipped.

### 9.3 Heavy surfaces

- Virtualize tables/lists above 50 rows.
- Server-paginate customer admin, logs, transactions, notes.
- `content-visibility: auto` on below-the-fold sections.
- Charts render on visibility; stop animation when offscreen.
- Three.js: Draco/meshopt, KTX2 textures, LOD, dispose geometry/material/texture, DPR cap, no shadows on low tier.

### 9.4 Caching

- Hashed immutable assets with long cache headers.
- Optional service worker for shell + font cache; never cache customer records.
- Preconnect only to required origins; no third-party map tiles until consent.

### 9.5 Skeleton-first rendering

- Every route renders its shell skeleton within one frame; content fills progressively.
- Skeletons use the shimmer keyframe only on `transform`, never `background-position`.

---

## 10. Accessibility and motion gating

- Respect `prefers-reduced-motion`; disable decorative loops, parallax, confetti and count-up.
- Visible **Pause motion / Play motion** control in header and landing.
- Focus outline 3 px, offset 2 px, high contrast.
- No flashing above 3 Hz; no audio autoplay.
- Animation is never the only status indicator — pair with text and icon.
- Tabs keep focus on the actual button; dialogs trap focus and restore trigger focus.
- Forced-colors mode preserves borders, selected states and focus.
- Big numbers carry accessible text labels; colour is not the only signal.

---

## 11. Three.js rules — only where it earns its cost

- Allowed: Physique 3D workspace; optional landing hero orb with a 2D SVG fallback.
- Not allowed: every card, chart or empty state.
- `frameloop="demand"`; render only on camera/pose change or user interaction.
- DPR cap: 2 Tier 2, 1.5 Tier 1, 1 Tier 0.
- Dispose on unmount; handle context loss; pause when offscreen.
- No bloom on low tier; no real-time shadows Tier 0/1.
- Three.js chunk never in initial bundle.

---

## 12. Implementation map

| Concern                 | File / area                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Tokens 5.0.0            | `src/design/tokens.ts`, `styles/design-tokens.css`                                           |
| Kinetic styles          | new `src/styles/kinetic-motion.css`, `kinetic-layout.css`                                    |
| Motion provider         | new `src/components/motion/KineticProvider.tsx`                                              |
| Adaptive quality        | new `src/hooks/useQualityTier.ts`                                                            |
| Page transitions        | new `src/components/motion/PageTransition.tsx`, `App.jsx`                                    |
| Character v4            | `components/motion/CharacterArt.jsx` → `GlowCrew.tsx` + sprite assets                        |
| Confetti                | new `components/motion/ConfettiCanvas.tsx`                                                   |
| Number animation        | new `components/ui/AnimatedNumber.tsx`                                                       |
| Magnetic button         | new `components/ui/MagneticButton.tsx`                                                       |
| Tabs/button/modal/toast | existing `Tabs.jsx`, `Button.jsx`, `Modal.jsx`, `useToast.jsx`                               |
| GSAP landing            | `pages/LandingPage.jsx`, dynamic import                                                      |
| Three.js boundary       | `components/PhysiqueRenderer.jsx`, `HumanoidViewer.tsx`                                      |
| Docs/inventory          | rerun `node scripts/ui-guide-inventory.mjs`, `application-docs.mjs`, `npm run context:index` |

Token migration: add 5.0.0 values, keep 4.2.0 aliases, regenerate via `npm run design:sync`, verify with `npm run design:check`.

---

## 13. Verification and acceptance

| Phase            | Evidence                                                                    |
| ---------------- | --------------------------------------------------------------------------- |
| Motion inventory | Every animated surface listed with owner, property, duration, tier behavior |
| Bundle audit     | JS/CSS/font budgets met; GSAP/Three.js not in shell chunk                   |
| Performance      | Lighthouse CI budgets, long-task observer, FPS sampler, 4× CPU throttle     |
| Low-tier test    | Tier 0 emulation: no dropped interactions, <3 concurrent loops              |
| Memory soak      | 30-minute session; no leaked timelines, observers or WebGL resources        |
| Accessibility    | Reduced motion, keyboard, focus, contrast, forced colors                    |
| Visual review    | 1024/1280/1440/1920, light/dark/AMOLED, kinetic + playful fallback          |
| Regression       | Existing route/view tests and sign-out/login flows unchanged                |

Do not mark visual review complete from a successful build alone. Rendered browser review remains a separate gate, as in the current documentation.

---

## 14. Guardrails — what not to do

- Do not animate layout properties or `box-shadow` continuously.
- Do not put 3D everywhere; 3D is a Physique/hero accent, not the workspace default.
- Do not run GSAP and Framer Motion on the same element property.
- Do not create one DOM node per confetti particle.
- Do not use heavy `backdrop-filter` on scrolling cards.
- Do not autoplay audio or loop large videos.
- Do not block first paint on fonts or Three.js.
- Do not add another permanent override stylesheet; consolidate into tokens + kinetic CSS.
- Do not claim deployment or full view parity from this design change.

**Bottom line:** keep the workspace clean and readable, make the 2D Glow Crew vibrant and expressive, use Framer Motion and GSAP for cinematic snap choreography, reserve Three.js for Physique and one hero accent, and enforce the frame/bundle/layer budgets so the experience stays fast — genuinely never lagging — on every spec laptop from Tier 0 to Tier 2.

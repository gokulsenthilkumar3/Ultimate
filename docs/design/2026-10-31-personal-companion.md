# Personal companion artwork and welcome scene

The user supplied three own-photo references and authorised a combined illustrated character for the welcome page and floating agent. Original photos remain in the user's Downloads folder and are not copied into the application. Login retains its existing nonpersonal illustration.

## Reference analysis and direction

| Reference | Useful visible detail | Applied to the illustration |
| --- | --- | --- |
| Graduation portrait | Curly hair, clear glasses, yellow academic outfit | Hair silhouette and a small yellow ribbon accent |
| Casual outdoor portrait | Sage checked shirt, relaxed smile | Simplified sage checks and friendly posture |
| White-background portrait | Clear frontal facial detail, glasses, short moustache and beard | Main likeness reference |

The result is an original stylised chibi with four consistent poses: relaxed, greeting, thinking and celebrating. It is an illustration inspired by the supplied photos, not a fitted 3D scan or an animated photograph. The welcome scene uses layered paper shapes and CSS perspective for depth; no new WebGL renderer or 3D model is required.

Character poses are decorative choices. They do not imply that an agent is thinking, that a model is connected or that records were checked. Actual models, selected sources, consent, chat and reviewed actions remain with Agents.

## Assets and runtime

- Master: `docs/design/assets/personal-companion-v1.png`, generated through the built-in image tool with a transparent background.
- Welcome atlas: `growthtrack-ultimate/public/assets/illustrations/personal-companion-v1.webp`, 1280 × 1280, 261,962 bytes.
- Compact atlas: `growthtrack-ultimate/public/assets/illustrations/personal-companion-small-v1.webp`, 512 × 512, 63,184 bytes.
- `PersonalCompanionArt` clips one cell of the two-by-two sheet and swaps poses without downloading separate images. Its reserved square avoids layout shifts. The welcome page requests the detailed atlas; the optional floater requests the compact atlas.
- `scripts/optimize-companion-art.mjs` performs format/size optimisation and verifies transparent alpha; it preserves the generated master. It does not recreate or edit the reference photographs.
- Transform animation shares existing viewport, dialog, pause, visibility, quality and motion-budget controls. A parent-governed scene can disable the artwork's own admission with `motion={false}`. Reduced-motion users can still select poses and use every action.

Research informed the implementation: [Chrome's motion guidance](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/motion) recommends transform/opacity animation for compositor work; [W3C technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html) describes respecting reduced-motion preferences. Neither source establishes measured performance for this app; the local browser checks supply separate evidence.

## Final generation prompt

Built-in image generation, with the three user-supplied images as reference inputs and `transparent_background: true`:

> Use case: stylized-concept / identity-preserve. Create a production-ready character sprite atlas for the GrowthTrack welcome page and optional floating agent mascot, inspired by the SAME adult man in these three user-owned reference photographs. Image 1 supplies the graduation yellow accent and lively hair shape; image 2 supplies the sage checked shirt and relaxed warmth; image 3 is the primary reference for the face, clear rectangular glasses, curly black hair, short moustache and beard. Preserve the recognizable likeness and warm brown skin while interpreting as a friendly original premium 2D illustrated chibi companion, large expressive head and tiny rounded body, roughly 2 heads tall. Flat clean cut-paper illustration with crisp dark green outlines, subtle warm cel shading, sophisticated clean shapes, no photorealism, no plastic toy rendering. Outfit: simplified sage check shirt, dark trousers, a small yellow graduation-sash-inspired neck ribbon as a distinctive keepsake. This is a friendly pet-like human mascot, charming and calm rather than a corporate stock avatar. Layout is CRITICAL: a square transparent sprite sheet divided into EXACTLY TWO COLUMNS and TWO ROWS, four EQUAL SQUARE CELLS. Each cell has the same character scale, feet baseline, center position and generous transparent padding; entire character and hands stay safely within its own cell. Top-left: relaxed neutral gentle smile, hands at sides. Top-right: same character greeting with one hand raised in a friendly wave. Bottom-left: same character thinking, hand gently touching chin, attentive expression. Bottom-right: same character celebrating a small success, both hands lifted, joyful closed-mouth smile. Render only these four isolated full-body figures, with NO other objects, labels, text, panel borders, backgrounds, frames, shadows on a ground plane or watermark. Background must be genuinely transparent. Keep all four identities, face shapes, clothing, colors, outlines, body sizes and composition consistent so cells work as runtime states. No photographic backgrounds and no other people.

## Rendered verification

Production build, TypeScript and the affected artwork, landing, motion, navigation and session tests pass. Chrome rendered the personal welcome scene and floating companion at 1280px and 390px. Desktop welcome/companion/login screenshots and mobile greeting/celebration screenshots were inspected. Mobile keyboard checks exercised all four welcome poses against the decoded 1280px atlas and all four floating-companion poses against the decoded 512px atlas; every clipping frame was square and each scene reused one atlas source.

The floating panel preserves its selected pose through Escape, restores focus, follows actual Agents/Action Center destinations and keeps local visibility across reloads. Its model, external and record-mutation request counts were zero. Login has neither personal-art DOM nor attempted/loaded atlas requests. Original login password focus/reveal and old welcome Snip/demo interactions also pass.

The combined reduced-motion/Lite run reports zero active animations for Welcome and Finance while all pose and companion controls remain usable. Reports are ignored local fixtures: `.gstack/benchmark-reports/personal-desktop-20261031`, `personal-mobile-20261031` and `personal-reduced-20261031`. They do not establish live-service performance or the user's visual approval.

No original image was overwritten. The generated master remains alongside the final prompt above; runtime assets contain only the derived illustration.

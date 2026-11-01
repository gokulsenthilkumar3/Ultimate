# Welcome character motion refinement

Implemented for `/Ultimate/welcome` at the user's request. This changes the public illustration scene, not the authenticated workspace or its data.

The existing four-pose companion atlas is preserved. `pages/WelcomeCompanion.jsx` owns the welcome scene: repeated pose selection replays its gesture, changes blend through at most two art layers, and a bounded timeout removes the outgoing layer. Focus stays on the selected control. The selected pose and caption update immediately when motion is disabled.

Entrance, ambient breathing and gesture transforms have separate wrappers. The sprite's transform still selects its atlas cell and is never tweened. The entrance settles over 1.05 seconds; greeting, listening and celebration have anticipation and a soft finish. A static radial halo and sparse glints provide depth, with only opacity and transform animated. Full-quality ambient tracks have slow 8–12 second rhythms; lower quality keeps the static lighting and user-triggered gestures. The scene reserves its peak motion cost and honors viewport visibility, hidden documents, dialogs, pause, reduced motion and quality limits through the existing motion admission hook.

`pages/welcome-crew-motion.css` gives the four Glow Crew characters distinct restrained motions, with long rests and staggered phases. It replaces existing body tracks rather than adding timers or extra tracks. Fine-pointer hover acknowledgment is decorative; the cards keep their article semantics.

Verification: production build and 26 targeted tests pass, including same-pose replay, rapid changes, pause/resume, static selection and timeout cleanup. Actual rendered desktop/mobile motion review is pending: both the browser access host and native computer-use connection were unavailable. These checks are not visual approval or a performance benchmark.

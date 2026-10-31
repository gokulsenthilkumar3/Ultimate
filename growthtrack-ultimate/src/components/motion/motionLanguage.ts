/** A quick response, a little travel, then a soft landing. Shared by the shell and page choreography. */
export const MOTION_EASE = 'cubic-bezier(.16, 1, .3, 1)';
export const SELECTION_SPRING = { type: 'spring' as const, stiffness: 460, damping: 32, mass: .65 };
export const DIALOG_SPRING = { type: 'spring' as const, stiffness: 420, damping: 34, mass: .85 };
export const FEEDBACK_SPRING = { type: 'spring' as const, stiffness: 510, damping: 34, mass: .65 };

export function panelFrames(direction = 1): Keyframe[] {
  return [
    { opacity: .55, transform: `translateX(${direction * 12}px)` },
    { opacity: 1, transform: 'translateX(0)' },
  ];
}

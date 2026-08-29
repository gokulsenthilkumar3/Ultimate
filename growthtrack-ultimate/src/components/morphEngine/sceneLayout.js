/** Responsive X-axis separation keeps both figures inside narrow stages. */
export const getDualSeparation = (canvasWidth = 1440) => (
  canvasWidth < 760 ? 0.54 : canvasWidth < 1120 ? 0.74 : 0.9
);


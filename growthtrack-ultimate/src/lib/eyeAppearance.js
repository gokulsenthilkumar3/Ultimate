import { APPEARANCE_DETAIL, appearanceSeed, numberInRange } from './appearanceDetail';
import { AVATAR_EXPOSURE } from './avatarPresentation';

export const EYE_APPEARANCE = APPEARANCE_DETAIL.eyes;
const hex = (value, fallback) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;

export function resolveEyeAppearance(metrics = {}) {
  const { defaults, controls, pupilModes } = EYE_APPEARANCE;
  return {
    color: hex(metrics.eyeColor, defaults.color),
    scleraColor: hex(metrics.scleraColor, defaults.scleraColor),
    pupilMode: pupilModes.some(mode => mode.id === metrics.eyePupilMode) ? metrics.eyePupilMode : defaults.pupilMode,
    limbalRing: typeof metrics.irisLimbalRing === 'boolean' ? metrics.irisLimbalRing : defaults.limbalRing,
    seed: appearanceSeed(metrics.eyeSeed ?? defaults.seed),
    ...Object.fromEntries(controls.map(control => [control.property,
      numberInRange(metrics[control.key], control.min, control.max, defaults[control.property])])),
  };
}

/** Artistic response to the actual renderer exposure control, not a lux or
 * medical model. Use the same exposure limits as the existing viewer. */
export function pupilDiameterForExposure(appearance, exposure) {
  if (appearance.pupilMode !== 'exposure') return appearance.pupilSizeMm;
  const { min, max } = AVATAR_EXPOSURE;
  const amount = (numberInRange(exposure, min, max, EYE_APPEARANCE.response.referenceExposure) - min) / (max - min);
  const smooth = amount * amount * (3 - 2 * amount);
  const pupil = EYE_APPEARANCE.controls.find(control => control.property === 'pupilSizeMm');
  return pupil.max + (pupil.min - pupil.max) * smooth;
}

export function advancePupil(current, target, delta, immediate = false) {
  if (immediate || !Number.isFinite(current)) return target;
  const step = numberInRange(delta, 0, EYE_APPEARANCE.response.maxDeltaSeconds, 0);
  return target + (current - target) * Math.exp(-step / EYE_APPEARANCE.response.seconds);
}

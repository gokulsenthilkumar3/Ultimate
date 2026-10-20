// Shared settings contract. Defaults describe the UI, never the owner's body.
export const AVATAR_PANEL_WIDTH = Object.freeze({ min: 320, max: 520, step: 20, default: 400 });
export const AVATAR_EXPOSURE = Object.freeze({ min: .72, max: 1.35, step: .01 });
export const DEFAULT_AVATAR_PRESENTATION = Object.freeze({ density: 'comfortable', guideDetail: 'detailed', interfaceEffects: true, inspectorWidth: AVATAR_PANEL_WIDTH.default,
  backgroundMode:'scene',backgroundColor:'#263247',backgroundBottomColor:'#0b0f16',showStage:true,lightingMode:'neutral' });
export const AVATAR_DENSITY_OPTIONS = Object.freeze([{ value:'comfortable', label:'Comfortable' }, { value:'compact', label:'Compact' }]);
export const AVATAR_GUIDE_OPTIONS = Object.freeze([{ value:'detailed', label:'Diagram and instructions' }, { value:'concise', label:'Diagram with expandable instructions' }]);
export const AVATAR_EFFECT_OPTIONS = Object.freeze([
  { key:'bloom', label:'Soft highlight glow', minimumTier:'MED' },
  { key:'vignette', label:'Edge shading', minimumTier:'MED' },
  { key:'depthOfField', label:'Background focus blur', minimumTier:'HIGH', motionSensitive:true },
  { key:'chromaticAberration', label:'Lens color separation', minimumTier:'HIGH', motionSensitive:true },
  { key:'filmGrain', label:'Film texture', minimumTier:'MED', motionSensitive:true },
]);
export function sanitizeAvatarPresentation(input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const width = Number(source.inspectorWidth);
  return {
    density: AVATAR_DENSITY_OPTIONS.some(o => o.value === source.density) ? source.density : DEFAULT_AVATAR_PRESENTATION.density,
    guideDetail: AVATAR_GUIDE_OPTIONS.some(o => o.value === source.guideDetail) ? source.guideDetail : DEFAULT_AVATAR_PRESENTATION.guideDetail,
    interfaceEffects: typeof source.interfaceEffects === 'boolean' ? source.interfaceEffects : DEFAULT_AVATAR_PRESENTATION.interfaceEffects,
    inspectorWidth: Number.isFinite(width) && width > 0 ? Math.max(AVATAR_PANEL_WIDTH.min,Math.min(AVATAR_PANEL_WIDTH.max,width)) : AVATAR_PANEL_WIDTH.default,
    backgroundMode:['scene','color','gradient'].includes(source.backgroundMode) ? source.backgroundMode : 'scene',
    backgroundColor:/^#[\da-f]{6}$/i.test(source.backgroundColor || '') ? source.backgroundColor : DEFAULT_AVATAR_PRESENTATION.backgroundColor,
    backgroundBottomColor:/^#[\da-f]{6}$/i.test(source.backgroundBottomColor || '') ? source.backgroundBottomColor : DEFAULT_AVATAR_PRESENTATION.backgroundBottomColor,
    showStage:typeof source.showStage === 'boolean' ? source.showStage : true,
    lightingMode:source.lightingMode === 'cinematic' ? 'cinematic' : 'neutral',
  };
}

export function resolveAvatarEffects({ cinematic = {}, gpuTier = 'MED', reducedMotion = false, mode = 'FULL' } = {}) {
  const full = mode === 'FULL' && gpuTier === 'HIGH' && !reducedMotion;
  const polish = gpuTier !== 'LOW' && mode !== 'NONE';
  return {
    bloom: polish && Boolean(cinematic.bloom),
    vignette: polish && Boolean(cinematic.vignette),
    depthOfField: full && Boolean(cinematic.depthOfField),
    chromaticAberration: full && Boolean(cinematic.chromaticAberration),
    filmGrain: polish && !reducedMotion && Boolean(cinematic.filmGrain),
    ssao: full && Boolean(cinematic.ssao),
  };
}

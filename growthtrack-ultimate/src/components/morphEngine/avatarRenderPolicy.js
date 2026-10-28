// Telemetry is deliberately excluded: publishing frame samples must not wake
// an idle renderer and create an endless rendering/telemetry feedback loop.
const RENDER_INPUTS = [
  'cloneA', 'cloneB', 'viewMode', 'renderMode', 'gpuTier', 'avatarWorkspace',
  'wardrobeState', 'wardrobePreferences', 'anatomyDepth', 'anatomyPreview',
  'anatomyCustomization', 'captureRedacted', 'morphOverrides', 'modelDiagnostics',
  'cameraPreset', 'cameraRevision', 'cameraZoom', 'cameraBookmarkView',
  'focusedBodyPart', 'splitDividerX', 'timelineScrubIndex', 'autoRotate',
  'animationState', 'poseDragging', 'cinematicState', 'vfxState', 'stressLevel',
];

export const renderInputsChanged = (next, previous) => RENDER_INPUTS.some(key => next[key] !== previous[key]);

export function needsAnimatedFrames(state, reducedMotion = false) {
  const workspace = state.avatarWorkspace || {};
  const animation = state.animationState || {};
  if (state.autoRotate || state.poseDragging) return true;
  if (reducedMotion) return false;
  if (state.vfxState?.aura && ['DUAL', 'GHOST'].includes(state.viewMode)) return true;
  if (workspace.showStage && workspace.lightingMode === 'cinematic') return true;
  if (state.cinematicState?.filmGrain && state.gpuTier !== 'LOW') return true;
  const measuring = workspace.inspectorOpen && ['measurements', 'anatomy'].includes(workspace.inspectorSection);
  const customPose = workspace.poseStudio?.[workspace.avatarContext]?.enabled;
  // These workflows render a neutral or saved static pose. A previously selected
  // animation must not keep invalidating frames that the rig does not use.
  if (measuring || customPose || state.viewMode !== 'SOLO' || state.captureRedacted) return false;
  if (!animation.playing || ['standing','sitting','tpose','flex','squat'].includes(animation.animationId)) return false;
  if (animation.animationId !== 'idle') return true;
  return workspace.naturalMotion && workspace.avatarContext !== 'goal';
}

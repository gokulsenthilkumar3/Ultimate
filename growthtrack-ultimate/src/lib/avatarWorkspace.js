export const INSPECTOR_SECTIONS = ['measurements', 'face', 'hair', 'skin', 'anatomy', 'clothing', 'view'];
export const WORKSPACE_MODES = ['current', 'goal', 'compare', 'timeline'];
export const COMPARE_STYLES = ['side-by-side', 'overlay', 'split', 'difference'];

export const DEFAULT_AVATAR_WORKSPACE = Object.freeze({
  inspectorSection: 'measurements',
  inspectorOpen: true,
  inspectorWidth: 400,
  avatarContext: 'current',
  workspaceMode: 'current',
  compareStyle: 'side-by-side',
  presentationMode: false,
  qualityPreference: 'automatic',
  saveStatus: 'saved',
});

export function sanitizeAvatarWorkspace(input = {}) {
  const next = { ...DEFAULT_AVATAR_WORKSPACE, ...input };
  return {
    inspectorSection: INSPECTOR_SECTIONS.includes(next.inspectorSection) ? next.inspectorSection : 'measurements',
    inspectorOpen: next.inspectorOpen !== false,
    inspectorWidth: Math.max(320, Math.min(520, Number(next.inspectorWidth) || 400)),
    avatarContext: next.avatarContext === 'goal' ? 'goal' : 'current',
    workspaceMode: WORKSPACE_MODES.includes(next.workspaceMode) ? next.workspaceMode : 'current',
    compareStyle: COMPARE_STYLES.includes(next.compareStyle) ? next.compareStyle : 'side-by-side',
    presentationMode: next.presentationMode === true,
    qualityPreference: ['automatic', 'performance', 'balanced', 'high'].includes(next.qualityPreference) ? next.qualityPreference : 'automatic',
    saveStatus: ['saved', 'saving', 'unsaved', 'error'].includes(next.saveStatus) ? next.saveStatus : 'saved',
  };
}

export function workspaceToRendererMode(workspace) {
  if (workspace.workspaceMode === 'timeline') return 'TIMELINE';
  if (workspace.workspaceMode !== 'compare') return 'SOLO';
  return {
    'side-by-side': 'DUAL', overlay: 'GHOST', split: 'SPLIT', difference: 'DELTA',
  }[workspace.compareStyle] || 'DUAL';
}

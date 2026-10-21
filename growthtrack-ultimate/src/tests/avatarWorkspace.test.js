import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR_WORKSPACE, sanitizeAvatarWorkspace, workspaceToRendererMode } from '../lib/avatarWorkspace';

describe('avatar workspace contract', () => {
  it('starts in the current body with the measurements inspector open', () => {
    expect(DEFAULT_AVATAR_WORKSPACE).toMatchObject({
      inspectorSection: 'measurements', inspectorOpen: true,
      avatarContext: 'current', workspaceMode: 'current',
      compareStyle: 'side-by-side', presentationMode: false,
      qualityPreference: 'automatic', saveStatus: 'saved',
    });
  });

  it('maps each user-facing comparison choice to the compatible renderer', () => {
    expect(workspaceToRendererMode({ workspaceMode: 'current' })).toBe('SOLO');
    expect(workspaceToRendererMode({ workspaceMode: 'goal' })).toBe('SOLO');
    expect(workspaceToRendererMode({ workspaceMode: 'timeline' })).toBe('TIMELINE');
    expect(workspaceToRendererMode({ workspaceMode: 'compare', compareStyle: 'side-by-side' })).toBe('DUAL');
    expect(workspaceToRendererMode({ workspaceMode: 'compare', compareStyle: 'overlay' })).toBe('GHOST');
    expect(workspaceToRendererMode({ workspaceMode: 'compare', compareStyle: 'split' })).toBe('SPLIT');
    expect(workspaceToRendererMode({ workspaceMode: 'compare', compareStyle: 'difference' })).toBe('DELTA');
  });

  it('bounds inspector width and rejects stale or unsupported preference values', () => {
    expect(sanitizeAvatarWorkspace({ inspectorWidth: 100 }).inspectorWidth).toBe(320);
    expect(sanitizeAvatarWorkspace({ inspectorWidth: 900 }).inspectorWidth).toBe(520);
    expect(sanitizeAvatarWorkspace({ inspectorSection: 'morphs', workspaceMode: 'ghost', saveStatus: 'pending' }))
      .toMatchObject({ inspectorSection: 'measurements', workspaceMode: 'current', saveStatus: 'saved' });
  });

  it('keeps goal context independent from the renderer comparison style', () => {
    const state = sanitizeAvatarWorkspace({ avatarContext: 'goal', workspaceMode: 'goal', compareStyle: 'difference' });
    expect(state.avatarContext).toBe('goal');
    expect(workspaceToRendererMode(state)).toBe('SOLO');
  });
});

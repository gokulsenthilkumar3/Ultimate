import { it, expect } from 'vitest';
import { readDroppedBodyPart, focusInspectionPart } from './bodyPartDrag';
import use3DStore from '../../store/use3DStore';

it('rejects unknown/prototype drops and covered private targets while accepting known public parts', () => {
  const transfer = id => ({ getData: () => id });
  for (const id of ['__proto__','constructor','toString','external-file','']) expect(readDroppedBodyPart(transfer(id))).toBeNull();
  expect(readDroppedBodyPart(transfer('leftHand'))).toBe('leftHand');
  expect(readDroppedBodyPart(transfer('anatomy'))).toBeNull();
  expect(readDroppedBodyPart(transfer('anatomy'),true)).toBe('anatomy');
});

it('focuses a region without replacing custom light or effect settings', () => {
  use3DStore.getState().setCinematicSetting('vignette',true);
  use3DStore.getState().setCinematicSetting('exposure',1.15);
  const before = { ...use3DStore.getState().cinematicState };
  focusInspectionPart('leftHand');
  expect(use3DStore.getState().focusedBodyPart).toBe('leftHand');
  expect(use3DStore.getState().viewMode).toBe('SOLO');
  expect(use3DStore.getState().cinematicState).toEqual(before);
});

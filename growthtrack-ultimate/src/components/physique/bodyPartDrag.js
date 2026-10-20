import use3DStore from '../../store/use3DStore';
import { BODY_PART_MAP } from '../morphEngine/bodyRegions';

export const BODY_PART_DRAG_TYPE = 'application/x-ultimate-body-part';

export function readDroppedBodyPart(transfer, privateAllowed = false) {
  const id = transfer?.getData(BODY_PART_DRAG_TYPE);
  if (!Object.prototype.hasOwnProperty.call(BODY_PART_MAP, id)) return null;
  const region = BODY_PART_MAP[id];
  return region && (!region.private || privateAllowed) ? id : null;
}

export function focusInspectionPart(id) {
  const store = use3DStore.getState();
  store.setAvatarWorkspace({ workspaceMode: store.avatarWorkspace.avatarContext === 'goal' ? 'goal' : 'current' });
  store.setViewMode('SOLO');
  store.setFocusedBodyPart(id === 'body' ? null : id);
}

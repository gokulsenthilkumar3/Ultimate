import { useMemo } from 'react';
import useAvatarRecord from '../../hooks/useAvatarRecord';
import { anatomyEligibility } from './anatomyPolicy';

/** One eligibility decision for the renderer and the editor, from the owner's
    saved date of birth and the loaded asset's declared anatomy. */
export function useAnatomyEligibility(diagnostics) {
  const { dateOfBirth } = useAvatarRecord();
  const bodyBase = diagnostics?.modelAsset?.preset ?? null;
  const assetAnatomySex = diagnostics?.privateAnatomySex ?? null;
  const hasPrivateAnatomy = Boolean(diagnostics?.hasPrivateAnatomy);
  // Re-evaluated per calendar day so a birthday takes effect without a reload.
  const today = new Date().toDateString();
  return useMemo(
    () => anatomyEligibility({ dateOfBirth, bodyBase, assetAnatomySex, hasPrivateAnatomy, now: new Date(today) }),
    [dateOfBirth, bodyBase, assetAnatomySex, hasPrivateAnatomy, today],
  );
}

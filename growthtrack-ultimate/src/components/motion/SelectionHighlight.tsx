import { m } from 'framer-motion';
import { useKinetic } from './KineticContext';
import { SELECTION_SPRING } from './motionLanguage';
export default function SelectionHighlight({ id, active }: { id: string; active: boolean }) {
  const { enabled, canAnimate, tier } = useKinetic();
  if (!enabled || !active) return null;
  return <m.span className="kinetic-selection" aria-hidden="true" layout="position" layoutId={id} transition={canAnimate && tier > 0 ? SELECTION_SPRING : { duration: 0 }} />;
}

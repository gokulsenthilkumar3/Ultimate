import { m } from 'framer-motion';
import { useKinetic } from './KineticContext';
export default function SelectionHighlight({ id, active }: { id: string; active: boolean }) {
  const { enabled, canAnimate, tier } = useKinetic();
  if (!enabled || !active) return null;
  return <m.span className="kinetic-selection" aria-hidden="true" layoutId={id} transition={canAnimate && tier > 0 ? { type: 'spring', stiffness: 500, damping: 34, mass: .8 } : { duration: 0 }} />;
}

import { useState } from 'react';
import { Bell, Check, RotateCcw, Scissors } from 'lucide-react';
import CharacterScene from '../components/motion/CharacterScene';
import { useKinetic } from '../components/motion/KineticContext';
import { emitCelebration } from '../components/motion/ConfettiHost';
import MagneticButton from '../components/ui/MagneticButton';

/** A fictional, page-local interaction: nothing is saved or sent to the app. */
export default function SirenSnipScene() {
  const [snipped, setSnipped] = useState(false);
  const { enabled } = useKinetic();
  const Action = enabled ? MagneticButton : 'button';

  return <figure className="siren-snip" data-snipped={String(snipped)}>
    <div className="siren-snip__stage" id="siren-snip-stage" aria-hidden="true">
      <svg className="siren-snip__thread" viewBox="0 0 600 530" fill="none" focusable="false">
        <path d="M98 88C-10 158 113 218 273 191S615 198 537 294 273 447 129 412" />
      </svg>
      <CharacterScene happy={snipped} state={snipped ? 'snip' : 'idle'} />
      <span className="siren-snip__noise siren-snip__noise--tabs"><span>12</span>Too many tabs</span>
      <span className="siren-snip__noise siren-snip__noise--ping"><Bell size={14} />One more ping!</span>
      <span className="siren-snip__noise siren-snip__noise--everything">Do. All. The. Things.</span>
      <span className="siren-snip__hello">{snipped ? 'Ahh. That’s better.' : 'Hey, let’s make room.'}</span>
      <span className="siren-snip__win"><Check size={15} />Space for the good stuff.</span>
      {!enabled && <div className="siren-snip__confetti"><i /><i /><i /><i /><i /><i /></div>}
    </div>
    <figcaption className="siren-snip__caption">
      <p id="siren-snip-caption" aria-live="polite" aria-atomic="true">{snipped ? 'A little less noise. A little more room for you.' : 'Siren spots the noise. Snip makes a little space.'}</p>
      <Action type="button" onClick={event => { if (!snipped) { const rect = event.currentTarget.getBoundingClientRect(); emitCelebration(rect.x + rect.width / 2, rect.y); } setSnipped(current => !current); }} aria-controls="siren-snip-stage" aria-describedby="siren-snip-caption">
        {snipped ? <RotateCcw size={17} aria-hidden="true" /> : <Scissors size={17} aria-hidden="true" />}
        {snipped ? 'Play it again' : 'Snip the noise'}
      </Action>
    </figcaption>
  </figure>;
}

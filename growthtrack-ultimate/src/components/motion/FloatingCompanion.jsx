import React, { lazy, Suspense, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, BookOpen, ClipboardCheck, Hand, Leaf, MessageCircle, PartyPopper, Sparkles, X } from 'lucide-react';
import { featurePath } from '../../config/featureRegistry';
import { setKineticPreferences } from '../../hooks/useKineticPreferences';
import { useKinetic } from './KineticContext';
import AgentKite from './AgentKite';
import Modal from '../ui/Modal';
import './floating-companion.css';
import useStore from '../../store/useStore';
import useFocusCompanion from '../../hooks/useFocusCompanion';
const CompanionTools = lazy(() => import('./CompanionTools'));

const POSES = [
  { state: 'idle', label: 'Rest', icon: Leaf },
  { state: 'greet', label: 'Wave', icon: Hand },
  { state: 'listen', label: 'Focus', icon: BookOpen },
  { state: 'celebrate', label: 'Cheer', icon: PartyPopper },
];

/** A device-local launcher. The real Agents page owns all models, consent and actions. */
export default function FloatingCompanion() {
  const user = useStore(state => state.user);
  const focus = useFocusCompanion(user?.id);
  const { pathname, search } = useLocation();
  const route = pathname + search;
  const [panel, setPanel] = useState({ route, open: false });
  const [greeting, setGreeting] = useState(false);
  const [pose, setPose] = useState('idle');
  // Reset in the navigation render so modal cleanup cannot run in a later focus-stealing commit.
  if (panel.route !== route) setPanel({ route, open: false });
  const open = panel.route === route && panel.open;
  const setOpen = next => setPanel({ route, open: next });
  const { activeDialog, canAnimate, tier } = useKinetic();
  const obscured = Boolean(activeDialog && !activeDialog.closest('.floating-companion'));
  const hide = () => {
    setKineticPreferences({ companion: false });
    document.querySelector('[data-companion-toggle]')?.focus({ preventScroll: true });
  };
  return <aside className="floating-companion" id="floating-companion" aria-label="Workspace companion" hidden={obscured} data-animate={canAnimate && tier > 0}>
    <button className="floating-companion__hide" type="button" aria-label="Hide floating companion" title="Hide companion" onClick={hide}><X size={14} aria-hidden="true" /></button>
    <button className="floating-companion__creature" type="button" aria-label="Open Sidekick companion" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} onPointerEnter={() => setGreeting(true)} onPointerLeave={() => setGreeting(false)} onFocus={() => setGreeting(true)} onBlur={() => setGreeting(false)}>
      <span className="floating-companion__stage">
        <span className="floating-companion__halo" aria-hidden="true" />
        <span className="floating-companion__spark" aria-hidden="true"><Sparkles size={15} strokeWidth={1.6} /></span>
        <span className="floating-companion__ground" aria-hidden="true" />
        <AgentKite compact enabled={!open && (greeting || pose !== 'idle' || focus.timer?.phase === 'running')} state={focus.timer?.phase === 'running' ? 'listen' : greeting && pose === 'idle' ? 'greet' : pose} className="floating-companion__art" />
      </span>
      <span className="floating-companion__tag">{focus.timer?.phase === 'running' ? `${Math.floor(focus.seconds / 60)}:${String(focus.seconds % 60).padStart(2, '0')}` : 'Kite'}</span>
    </button>
    <Modal open={open} title="Your companion" onClose={() => setOpen(false)} className="companion-panel">
      <div className="companion-panel__intro"><div className="companion-panel__portrait-stage"><AgentKite compact state={pose} className="companion-panel__portrait" /></div><p>Meet Kite, your sidekick.<br /><strong>A little lift for your next step.</strong></p></div>
      <fieldset className="companion-panel__poses" aria-describedby="companion-pose-note"><legend>Companion pose</legend><div>{POSES.map(({ state, label, icon: Icon }) => <button type="button" key={state} aria-label={label + ' pose'} aria-pressed={pose === state} onClick={() => setPose(state)}><Icon size={16} aria-hidden="true" /><span>{label}</span></button>)}</div><p id="companion-pose-note">Decoration only · choose a pose for this visit.</p></fieldset>
      <p>Ask a question or prepare a plan in Agents. You choose which records to share and review changes before saving.</p>
      <Suspense fallback={<p role="status">Opening companion tools…</p>}><CompanionTools user={user} focus={focus} onHide={hide} /></Suspense>
      <div className="companion-panel__links">
        <Link to={featurePath('ai')} onClick={() => setOpen(false)}><MessageCircle size={19} aria-hidden="true" /><span><strong>Open Agents</strong><small>Chat, sources and reviewed plans</small></span><ArrowUpRight size={18} aria-hidden="true" /></Link>
        <Link to={featurePath('actions')} onClick={() => setOpen(false)}><ClipboardCheck size={19} aria-hidden="true" /><span><strong>Action Center</strong><small>Review your next steps</small></span><ArrowUpRight size={18} aria-hidden="true" /></Link>
      </div>
      <button type="button" className="companion-panel__off" onClick={hide}>Hide companion on this device</button>
      <p className="companion-panel__hint">Bring it back with the companion button in the header or Display preferences.</p>
    </Modal>
  </aside>;
}

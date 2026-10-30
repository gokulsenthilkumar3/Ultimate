import { useId, useState } from 'react';
import { ArrowRight, FolderHeart, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import CharacterScene from './motion/CharacterScene';

function SignOutChoices({ drafts, busy, error, onCancel, onConfirm }) {
  const [choice, setChoice] = useState('keep');
  const id = useId();
  const available = Boolean(drafts?.available);
  const count = available ? drafts.count : 0;
  const remove = available && count > 0 && choice === 'remove';
  return <Modal open title="Ready to sign out?" className="signout-dialog" descriptionId={`${id}-description`} closeDisabled={busy} onClose={onCancel} actions={<>
    <Button variant="secondary" data-dialog-autofocus disabled={busy} onClick={onCancel}>Stay signed in</Button>
    <Button variant={remove ? 'danger' : 'primary'} loading={busy} loadingLabel="Signing out…" onClick={() => onConfirm(remove)} icon={<LogOut size={17} />}>{remove ? 'Sign out & remove drafts' : 'Sign out'}{!busy && <ArrowRight size={16} aria-hidden="true" />}</Button>
  </>}>
    <div className="signout-dialog__hero">
      <div><span className="signout-dialog__eyebrow">A LITTLE PAUSE IS GOOD, TOO.</span><p>A little break.<br /><strong>A fresh perspective.</strong></p></div>
      <div className="signout-dialog__art"><span className="signout-dialog__orbit" /><CharacterScene kind="sunny" /><span className="signout-dialog__wave" aria-hidden="true">see you soon!</span></div>
    </div>
    <p id={`${id}-description`} className="signout-dialog__description">Your saved records stay in your workspace. {available ? count > 0 ? `You have ${count} unfinished ${count === 1 ? 'draft' : 'drafts'} in this browser.` : 'There are no unfinished drafts in this browser.' : 'We couldn’t check local drafts. Signing out will keep them.'}</p>
    {available && count > 0 && <fieldset className="signout-dialog__choices" disabled={busy}>
      <legend>What would you like to do with your local drafts?</legend>
      <label className="signout-choice" data-selected={choice === 'keep'}>
        <input type="radio" name={`${id}-drafts`} value="keep" checked={choice === 'keep'} disabled={busy} onChange={() => setChoice('keep')} />
        <span className="signout-choice__icon"><FolderHeart size={22} aria-hidden="true" /></span>
        <span className="signout-choice__copy"><strong>Keep my drafts <small>KEEP WORKING LATER</small></strong><span>Leave unfinished entries on this browser.</span></span>
        <span className="signout-choice__check" aria-hidden="true" />
      </label>
      <label className="signout-choice signout-choice--remove" data-selected={choice === 'remove'}>
        <input type="radio" name={`${id}-drafts`} value="remove" checked={choice === 'remove'} disabled={busy} onChange={() => setChoice('remove')} />
        <span className="signout-choice__icon"><Trash2 size={21} aria-hidden="true" /></span>
        <span className="signout-choice__copy"><strong>Remove local drafts</strong><span>Permanently discard unfinished entries from this browser.</span></span>
        <span className="signout-choice__check" aria-hidden="true" />
      </label>
    </fieldset>}
    <p className="signout-dialog__privacy"><ShieldCheck size={16} aria-hidden="true" />{remove ? 'Only local drafts will be removed. Saved server records stay in place.' : 'On a shared device? Anyone using this browser profile could access drafts kept here.'}</p>
    {error && <p className="signout-dialog__error" role="alert">{error}</p>}
  </Modal>;
}

/** Choice resets to keep on every opening. Authentication and draft writes stay in App. */
export default function SignOutDialog({ open, ...props }) {
  return open ? <SignOutChoices {...props} /> : null;
}

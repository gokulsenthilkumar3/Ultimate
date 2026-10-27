import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowUpRight, ListChecks } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { describeAgentAction } from '../../lib/agentActions';

export default function AgentPlanCard({ plan, busy, stale, onApply }) {
  const [chosen, setChosen] = useState([]);
  const [review, setReview] = useState(false);
  const available = plan.actions.filter(entry => !entry.status || entry.status === 'proposed');
  const selected = available.filter(entry => chosen.includes(entry.id));
  const applied = plan.actions.filter(entry => entry.status === 'applied').length;
  return <section className="gt-agent-plan" aria-label="Proposed action plan">
    <div className="gt-agent-plan__heading"><ListChecks size={18} aria-hidden="true" /><strong>{plan.actions.length ? 'Review your action plan' : 'A little more detail will help'}</strong>
      {applied > 0 && <span>{applied}/{plan.actions.length} saved</span>}</div>
    <p>{plan.summary}</p>
    {plan.actions.length > 0 && <>
      <p className="gt-agent-plan__hint">Choose the changes you want. They are saved only after you review and apply them.</p>
      <ol className="gt-agent-plan__actions">{plan.actions.map(entry => {
        const detail = describeAgentAction(entry.command, plan.context);
        return <li key={entry.id} data-status={entry.status || 'proposed'}>
          <label><input type="checkbox" checked={chosen.includes(entry.id)} disabled={busy || stale || Boolean(entry.status && entry.status !== 'proposed')}
            onChange={event => setChosen(ids => event.target.checked ? [...ids, entry.id] : ids.filter(id => id !== entry.id))} />
            <span><strong>{detail.title}</strong><small>{entry.status === 'applied' ? 'Saved' : entry.status === 'applying' ? 'Saving…' : entry.status === 'failed' ? 'Needs attention' : 'Not applied'}</small></span>
            {entry.status === 'applied' && <Check size={18} aria-hidden="true" />}</label>
          <dl>{detail.fields.map(field => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
          {entry.command.kind === 'task.complete' && <p className="gt-agent-plan__hint">The selected task will move to Completed.</p>}
          {entry.error && <p className="gt-agent-plan__error" role="alert">{entry.error} Check the destination before generating another plan.</p>}
          {entry.status === 'applied' && <Link className="gt-agent-plan__link" to={detail.destination}>Open {entry.command.kind.startsWith('task.') ? 'Tasks' : entry.command.kind.startsWith('goal.') ? 'Goals' : entry.command.kind.startsWith('habit.') ? 'Habits' : 'Notes'}<ArrowUpRight size={14} aria-hidden="true" /></Link>}
        </li>;
      })}</ol>
      {stale && available.length > 0 && <p className="gt-agent-plan__hint">Your selected context changed. Prepare a fresh plan before applying more changes.</p>}
      {available.length > 0 && <Button variant="secondary" disabled={busy || stale || !selected.length} onClick={() => setReview(true)}>Review selected actions ({selected.length})</Button>}
    </>}
    <Modal open={review} title={`Apply ${selected.length} ${selected.length === 1 ? 'change' : 'changes'}?`} onClose={() => setReview(false)} actions={<>
      <Button variant="secondary" onClick={() => setReview(false)}>Keep reviewing</Button>
      <Button disabled={busy || stale || !selected.length} onClick={() => { setReview(false); void onApply(selected); }}>Apply {selected.length} {selected.length === 1 ? 'change' : 'changes'}</Button>
    </>}>
      <p>These changes will be saved to your current account, one at a time. A failed change will be shown separately.</p>
      <ol className="gt-agent-plan__review">{selected.map(entry => {
        const detail = describeAgentAction(entry.command, plan.context);
        return <li key={entry.id}><strong>{detail.title}</strong><dl>{detail.fields.map(field => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl></li>;
      })}</ol>
    </Modal>
  </section>;
}

import React, { useId } from 'react';
import { CheckSquare, CircleHelp, Clock3, DollarSign, FileText, FolderOpen, Heart, Pill, ShoppingCart, Target } from 'lucide-react';
import Button from './Button';

const ICONS = { CheckSquare, Heart, Target, FileText, DollarSign, ShoppingCart, Clock: Clock3, Pill, Folder: FolderOpen };

/** A human recovery surface. It never claims data is missing until loading has completed. */
export default function EmptyState({ icon = 'CircleHelp', title, description, actionLabel, ctaLabel, onAction, className = '' }) {
  const id = useId();
  const Icon = typeof icon === 'string' ? (ICONS[icon] || CircleHelp) : icon;
  const action = actionLabel || ctaLabel;
  return <section className={`empty-state gt-empty-state ${className}`.trim()} role="status" aria-labelledby={`${id}-title`}>
    <span className="empty-state__icon" aria-hidden="true"><Icon size={26} strokeWidth={1.6} /></span>
    <h2 id={`${id}-title`} className="empty-state__title">{title}</h2>
    {description && <p className="empty-state__desc">{description}</p>}
    {action && onAction && <Button onClick={onAction}>{action}</Button>}
  </section>;
}

export const EMPTY_STATES = {
  tasks: { icon: 'CheckSquare', title: 'Your list is ready when you are.', description: 'Add the first task and give today a clear next step.', actionLabel: 'Add task' },
  habits: { icon: 'Heart', title: 'Start with one small habit.', description: 'A simple routine can make today feel more intentional.', actionLabel: 'Add habit' },
  goals: { icon: 'Target', title: 'Give your next milestone a name.', description: 'Set a goal and a target date to make progress easier to see.', actionLabel: 'Create goal' },
  notes: { icon: 'FileText', title: 'Nothing here yet.', description: 'Capture an idea, reminder, or reflection while it is fresh.', actionLabel: 'New note' },
  finance: { icon: 'DollarSign', title: 'Your money picture starts here.', description: 'Add a transaction to begin seeing your spending clearly.', actionLabel: 'Add transaction' },
  shopping: { icon: 'ShoppingCart', title: 'Your list is clear.', description: 'Add something when it comes to mind.', actionLabel: 'Add item' },
  timesheet: { icon: 'Clock', title: 'No time logged yet.', description: 'Start a timer or add a session whenever you are ready.', actionLabel: 'Log time' },
  medical: { icon: 'Pill', title: 'No medications added.', description: 'Add a medication with its dosage and schedule.', actionLabel: 'Add medication' },
  documents: { icon: 'Folder', title: 'Your documents will appear here.', description: 'Add a file or link one when you are ready.', actionLabel: 'Add document' },
};

/**
 * components/ui/EmptyState.jsx — GrowthTrack Ultimate
 *
 * Generic empty-state component used across 9 modules.
 * Pass in an icon name (Lucide), a title, a description, and optional
 * action button props.
 *
 * Usage:
 *   <EmptyState
 *     icon="CheckSquare"
 *     title="No tasks yet"
 *     description="Create your first task to start tracking your work."
 *     actionLabel="Add task"
 *     onAction={() => dispatch('open-add-form')}
 *   />
 */

import React from 'react';

/**
 * Lucide icon resolver — we keep this component framework-agnostic.
 * Import icons lazily so the component doesn’t add to the base bundle.
 */
const ICON_MAP = {
  CheckSquare:  () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  Heart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Target: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  FileText: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  DollarSign: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  ShoppingCart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Pill: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
    </svg>
  ),
  Folder: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Default: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

/**
 * EmptyState
 *
 * @param {object}   props
 * @param {string}   [props.icon='Default']  — key of ICON_MAP
 * @param {string}   props.title             — bold heading
 * @param {string}   [props.description]     — supporting text
 * @param {string}   [props.actionLabel]     — button label; omit to hide button
 * @param {Function} [props.onAction]        — click handler for action button
 * @param {string}   [props.className]       — extra CSS classes on root
 */
export default function EmptyState({
  icon        = 'Default',
  title,
  description,
  actionLabel,
  onAction,
  className   = '',
}) {
  const IconComp = ICON_MAP[icon] ?? ICON_MAP.Default;

  return (
    <div
      className={`empty-state ${className}`}
      role="status"
      aria-label={title}
    >
      <div className="empty-state__icon" aria-hidden="true">
        <IconComp />
      </div>

      <h3 className="empty-state__title">{title}</h3>

      {description && (
        <p className="empty-state__desc">{description}</p>
      )}

      {actionLabel && onAction && (
        <button
          className="empty-state__action btn btn-primary"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Pre-configured empty-state presets for each of the 9 modules.
 * Import and spread the preset to save typing:
 *
 *   import EmptyState, { EMPTY_STATES } from '../ui/EmptyState';
 *   <EmptyState {...EMPTY_STATES.tasks} onAction={handleAddTask} />
 */
export const EMPTY_STATES = {
  tasks: {
    icon:        'CheckSquare',
    title:       'No tasks yet',
    description: 'Create your first task to start tracking your work.',
    actionLabel: 'Add task',
  },
  habits: {
    icon:        'Heart',
    title:       'No habits tracked',
    description: 'Build your first habit and start your streak today.',
    actionLabel: 'Add habit',
  },
  goals: {
    icon:        'Target',
    title:       'No goals set',
    description: 'Define a goal with a target date to start making progress.',
    actionLabel: 'Create goal',
  },
  notes: {
    icon:        'FileText',
    title:       'Nothing noted yet',
    description: 'Capture an idea, reminder, or reflection.',
    actionLabel: 'New note',
  },
  finance: {
    icon:        'DollarSign',
    title:       'No transactions',
    description: 'Log your first transaction to start tracking your finances.',
    actionLabel: 'Add transaction',
  },
  shopping: {
    icon:        'ShoppingCart',
    title:       'Your list is empty',
    description: 'Add items you want to buy or track.',
    actionLabel: 'Add item',
  },
  timesheet: {
    icon:        'Clock',
    title:       'No time logged',
    description: 'Start a timer or manually add a session to track your time.',
    actionLabel: 'Log time',
  },
  medical: {
    icon:        'Pill',
    title:       'No medications added',
    description: 'Add medications with their dosage and schedule.',
    actionLabel: 'Add medication',
  },
  documents: {
    icon:        'Folder',
    title:       'No documents yet',
    description: 'Upload or link your first document.',
    actionLabel: 'Add document',
  },
};

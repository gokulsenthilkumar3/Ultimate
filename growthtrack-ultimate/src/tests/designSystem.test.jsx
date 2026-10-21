import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Button from '../components/ui/Button';
import TextField from '../components/ui/TextField';
import SelectField from '../components/ui/SelectField';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Switch from '../components/ui/Switch';
import Tabs from '../components/ui/Tabs';

describe('design system primitives', () => {
  it('exposes loading and disabled semantics', () => {
    render(<Button loading>Save changes</Button>);
    const button = screen.getByRole('button', { name: 'Working…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
  it('associates labels, hints, and errors with fields', () => {
    render(<TextField label="Email" type="email" hint="Use your account email" error="Enter a valid email" required />);
    const input = screen.getByRole('textbox', { name: /Email/ });
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain('-hint');
    expect(input.getAttribute('aria-describedby')).toContain('-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
  });
  it('supports keyboard activation', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Continue</Button>);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Continue' }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onClick).toHaveBeenCalled();
  });
  it('provides labelled native select keyboard behavior', () => {
    render(<SelectField label="Timezone" options={[{ value: 'utc', label: 'UTC' }]} />);
    expect(screen.getByRole('combobox', { name: 'Timezone' })).toHaveValue('utc');
  });
  it('closes modal on Escape and exposes a dialog name', () => {
    const onClose = vi.fn();
    render(<Modal open title="Delete task" onClose={onClose}>Confirm</Modal>);
    expect(screen.getByRole('dialog', { name: 'Delete task' })).toBeVisible();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
  it('keeps legacy empty-state callers compatible with the shared button contract', () => {
    const onAction = vi.fn();
    render(<EmptyState icon="CheckSquare" title="Your list is ready" description="Start when ready." ctaLabel="Add task" onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    expect(onAction).toHaveBeenCalledOnce();
  });
  it('describes a switch and exposes selected tab state', () => {
    const onChange = vi.fn();
    render(<><Switch label="Daily reminder" description="A gentle nudge each morning." checked={false} onChange={onChange} /><Tabs label="Range" value="week" onChange={onChange} tabs={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} /></>);
    expect(screen.getByRole('switch', { name: 'Daily reminder' })).toHaveAccessibleDescription('A gentle nudge each morning.');
    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'true');
  });
});

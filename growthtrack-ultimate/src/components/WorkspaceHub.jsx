import React, { Suspense, lazy } from 'react';
import { CalendarDays, CheckCircle2, FolderKanban, NotebookPen } from 'lucide-react';
import useHashTab, { handleTabKeyDown } from '../hooks/useHashTab';
import Card from './ui/Card';
import LoadingSkeleton from './ui/LoadingSkeleton';
import Tabs from './ui/Tabs';

const Calendar = lazy(() => import('./Calendar'));
const Documents = lazy(() => import('./Documents'));
const Notes = lazy(() => import('./Notes'));
const Tasks = lazy(() => import('./Tasks'));
const Projects = lazy(() => import('./Projects'));
const Timesheet = lazy(() => import('./Timesheet'));
const Skills = lazy(() => import('./Skills'));
const GoalsDashboard = lazy(() => import('./GoalsDashboard'));

const TABS = [
  { id: 'calendar', label: 'Calendar', description: 'Plan the day' },
  { id: 'documents', label: 'My Files', description: 'Keep files together' },
  { id: 'notes', label: 'Notes', description: 'Capture an idea' },
  { id: 'tasks', label: 'Tasks', description: 'Focus your next actions' },
  { id: 'projects', label: 'Projects', description: 'Keep work moving' },
  { id: 'timesheet', label: 'Timesheet', description: 'Track your time' },
  { id: 'skills', label: 'Skills', description: 'Develop your capabilities' },
  { id: 'goals', label: 'Goals', description: 'Set and track outcomes' },
];
const TAB_IDS = TABS.map(item => item.id);

export default function WorkspaceHub({ initialTab = 'calendar' }) {
  const [tab, selectTab] = useHashTab(TAB_IDS, initialTab);
  const highlights = [
    { label: 'Plan', detail: 'Calendar and time', icon: CalendarDays, tab: 'calendar' },
    { label: 'Focus', detail: 'Tasks and projects', icon: CheckCircle2, tab: 'tasks' },
    { label: 'Create', detail: 'Notes and files', icon: NotebookPen, tab: 'notes' },
  ];

  return (
    <section className="module-page workspace-command">
      <Card className="workspace-command__header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Make space for your best work.</h1>
          <p className="page-subtitle">Plan the day, keep your work together, and return to what matters without losing your place.</p>
        </div>
        <div className="workspace-command__badge"><FolderKanban size={18} aria-hidden="true" /> Your work, in one place</div>
      </Card>

      <div className="workspace-command__highlights" aria-label="Workspace shortcuts">
        {highlights.map(({ label, detail, icon: Icon, tab: destination }) => (
          <Card as="button" interactive type="button" key={label} className="workspace-command__shortcut" onClick={() => selectTab(destination)}>
            <Icon size={19} aria-hidden="true" />
            <span><strong>{label}</strong><small>{detail}</small></span>
          </Card>
        ))}
      </div>

      <Tabs
        className="workspace-command__tabs"
        label="Workspace areas"
        idPrefix="workspace-tab"
        tabs={TABS.map(item => ({ value: item.id, label: item.label, description: item.description, panelId: 'workspace-tabpanel' }))}
        value={tab}
        onChange={selectTab}
        onKeyDown={event => handleTabKeyDown(event, { tabs: TABS, activeTab: tab, selectTab, idPrefix: 'workspace-tab' })}
      />

      <div
        id="workspace-tabpanel"
        role="tabpanel"
        aria-labelledby={`workspace-tab-${tab}`}
        tabIndex={0}
      >
        <Suspense fallback={<LoadingSkeleton variant="workspace" />}>
          {tab === 'calendar' && <Calendar />}
          {tab === 'documents' && <Documents />}
          {tab === 'notes' && <Notes />}
          {tab === 'tasks' && <Tasks />}
          {tab === 'projects' && <Projects />}
          {tab === 'timesheet' && <Timesheet />}
          {tab === 'skills' && <Skills />}
          {tab === 'goals' && <GoalsDashboard />}
        </Suspense>
      </div>
    </section>
  );
}

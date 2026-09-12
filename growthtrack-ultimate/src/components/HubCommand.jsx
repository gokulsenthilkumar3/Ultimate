import React, { lazy, Suspense, useState } from 'react';
import { Bell, Bot, LayoutDashboard, Settings, Sparkles } from 'lucide-react';
import { handleTabKeyDown } from '../hooks/useHashTab';
import Card from './ui/Card';
import LoadingSkeleton from './ui/LoadingSkeleton';
import Tabs from './ui/Tabs';

const AppLauncher = lazy(() => import('./AppLauncher'));
const AiDashboard = lazy(() => import('./AiDashboard'));
const Databases = lazy(() => import('./Databases'));
const ProfileEditor = lazy(() => import('./ProfileEditor'));
const NotificationCenter = lazy(() => import('./NotificationCenter'));
const Helpdesk = lazy(() => import('./Helpdesk'));
const Logs = lazy(() => import('./Logs'));
const About = lazy(() => import('./About'));
const Pricing = lazy(() => import('./Pricing'));

const AREAS = [
  ['command', 'Hub Command', null, 'Your starting point'],
  ['apps', 'Apps', AppLauncher, 'Open a tool'],
  ['ai', 'Agents', AiDashboard, 'Work with assistance'],
  ['databases', 'Databases', Databases, 'Manage your data'],
  ['profile', 'Profile', ProfileEditor, 'Personalize your space'],
  ['notifications', 'Notifications', NotificationCenter, 'Review updates'],
  ['help', 'Helpdesk', Helpdesk, 'Get a clear answer'],
  ['logs', 'Logs', Logs, 'See recent activity'],
  ['about', 'About', About, 'About GrowthTrack'],
  ['pricing', 'Plans', Pricing, 'Review your plan'],
];

export default function HubCommand({ setActiveTab, notificationState }) {
  const [area, setArea] = useState('command');
  const ActiveArea = AREAS.find(([id]) => id === area)?.[2];
  const navigateFromHub = (id) => {
    if (AREAS.some(([areaId]) => areaId === id)) setArea(id);
    else setActiveTab?.(id);
  };
  const shortcuts = [
    { id: 'apps', label: 'Open a tool', detail: 'Everything in your workspace', icon: LayoutDashboard },
    { id: 'notifications', label: 'See what changed', detail: 'Updates that deserve attention', icon: Bell },
    { id: 'profile', label: 'Make it yours', detail: 'Preferences and your profile', icon: Settings },
  ];
  return <section className="module-page hub-command">
    <Card className="hub-command__header"><div><p className="eyebrow">Hub</p><h1>Your space, clearly organized.</h1><p className="page-subtitle">Tools, assistance, and support—right where you expect them.</p></div><div className="hub-command__badge"><Sparkles size={18} aria-hidden="true" /> Your GrowthTrack hub</div></Card>
    <Tabs className="hub-command__tabs" label="Hub areas" idPrefix="hub-tab" tabs={AREAS.map(([id, label, , description]) => ({ value: id, label, description, panelId: 'hub-tabpanel' }))} value={area} onChange={setArea} onKeyDown={event => handleTabKeyDown(event, { tabs: AREAS.map(([id]) => ({ id })), activeTab: area, selectTab: setArea, idPrefix: 'hub-tab' })} />
    <section id="hub-tabpanel" role="tabpanel" aria-labelledby={`hub-tab-${area}`} tabIndex={0}>{area === 'command' ? <div className="hub-command__shortcuts" aria-label="Hub shortcuts">{shortcuts.map(({ id, label, detail, icon: Icon }) => <Card as="button" interactive type="button" className="hub-command__shortcut" key={id} onClick={() => setArea(id)}><Icon size={21} aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span></Card>)}</div> : <Suspense fallback={<LoadingSkeleton variant="hub" />}><ActiveArea setActiveTab={navigateFromHub} onNavigate={navigateFromHub} notificationState={notificationState} /></Suspense>}</section>
  </section>;
}

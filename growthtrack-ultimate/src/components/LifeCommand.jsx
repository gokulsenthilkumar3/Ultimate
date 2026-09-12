import React, { lazy, Suspense, useState } from 'react';
import { Clapperboard, Compass, Heart, MessageCircle } from 'lucide-react';
import { handleTabKeyDown } from '../hooks/useHashTab';
import Card from './ui/Card';
import LoadingSkeleton from './ui/LoadingSkeleton';
import Tabs from './ui/Tabs';

const SocialMedia = lazy(() => import('./SocialMedia'));
const Entertainment = lazy(() => import('./Entertainment'));
const Maps = lazy(() => import('./Maps'));

const AREAS = [
  ['command', 'Life Command', null, 'A quieter overview'],
  ['social', 'Social Media', SocialMedia, 'Connect and create'],
  ['entertainment', 'Entertainment', Entertainment, 'Watch and unwind'],
  ['maps', 'Maps', Maps, 'Explore your places'],
];

const SHORTCUTS = [
  { area: 'social', label: 'Connect', detail: 'Conversations and sharing', icon: MessageCircle },
  { area: 'entertainment', label: 'Unwind', detail: 'A little space to recharge', icon: Clapperboard },
  { area: 'maps', label: 'Explore', detail: 'Places worth remembering', icon: Compass },
];

export default function LifeCommand() {
  const [area, setArea] = useState('command');
  const ActiveArea = AREAS.find(([id]) => id === area)?.[2];
  return <section className="module-page life-command">
    <Card className="life-command__header"><div><p className="eyebrow">Life</p><h1>Make room for life, too.</h1><p className="page-subtitle">Connections, places, and quiet moments—kept close without getting in the way.</p></div><div className="life-command__badge"><Heart size={18} aria-hidden="true" /> Your personal space</div></Card>
    <Tabs className="life-command__tabs" label="Life areas" idPrefix="life-tab" tabs={AREAS.map(([id, label, , description]) => ({ value: id, label, description, panelId: 'life-tabpanel' }))} value={area} onChange={setArea} onKeyDown={event => handleTabKeyDown(event, { tabs: AREAS.map(([id]) => ({ id })), activeTab: area, selectTab: setArea, idPrefix: 'life-tab' })} />
    <section id="life-tabpanel" role="tabpanel" aria-labelledby={`life-tab-${area}`} tabIndex={0}>{area === 'command' ? <div className="life-command__shortcuts" aria-label="Life shortcuts">{SHORTCUTS.map(({ area: destination, label, detail, icon: Icon }) => <Card as="button" interactive type="button" className="life-command__shortcut" key={destination} onClick={() => setArea(destination)}><Icon size={21} aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span></Card>)}</div> : <Suspense fallback={<LoadingSkeleton variant="life" />}><ActiveArea /></Suspense>}</section>
  </section>;
}

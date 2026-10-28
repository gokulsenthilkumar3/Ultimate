import React from 'react';
import { ArrowUpRight, Avatar, Button, CalendarDays, Heart, Metrics, Panel, Plus, ShieldCheck, Users } from '../components';
import { FILES } from '../fixtures';
import { FAMILY_EVENTS, FAMILY_MEMBERS } from '../models/familyModel';
import { formatDate } from '../models/calendarModel';
import { SAMPLE_DATE } from '../models/chartModel';
import FileScreen from './FileScreen';

export default function FamilyScreen({ view, addRecord, openRecord, added = [], familyEvents = [] }) {
  const members = added.filter(entry => entry.type === 'family member');
  const events = [...FAMILY_EVENTS, ...familyEvents].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = events.filter(event => event.date >= SAMPLE_DATE);
  return <>
    <Metrics items={[{ label: 'Family members', value: FAMILY_MEMBERS.length + members.length, detail: 'in your sample family', icon: Users }, { label: 'Shared memories', value: '24', detail: 'moments worth keeping', icon: Heart }, { label: 'Upcoming events', value: upcoming.length, detail: 'on the sample calendar', icon: CalendarDays }, { label: 'Vault items', value: FILES.filter(file => file[2] === 'Family Connect').length, detail: 'family files and collections', icon: ShieldCheck }]} />
    {view === 'vault' ? <FileScreen workspace="Family Connect" openRecord={openRecord} /> : view === 'memories' ? <div className="three-columns">{[['Sunday at home', '12 moments · October 2026', 'memory-sage'], ['A summer together', '8 moments · June 2026', 'memory-peach'], ['Little celebrations', '4 moments · September 2026', 'memory-lilac']].map(([title, text, color]) => <button className="memory-card" key={title} onClick={() => openRecord({ title, type: 'Sample memory collection', notes: text })}><div className={`memory-cover ${color}`}><Heart size={40} strokeWidth={1} /><span>FAMILY MOMENTS</span></div><div><h3>{title}</h3><p>{text}</p></div></button>)}</div> : view === 'timeline' ? <Panel title="Family timeline" subtitle="Big milestones. Small moments. All connected."><div className="timeline">{[...members.map(member => ({ id: member.id, date: SAMPLE_DATE, title: `${member.title} added`, notes: 'New sample family member' })), ...events].map(event => <div key={event.id}><time>{formatDate(event.date, { day: '2-digit', month: 'short' })}</time><span className="timeline-node" /><article><h3>{event.title}</h3><p>{event.notes}</p></article></div>)}</div></Panel> : <div className="grid-main">
      <Panel title="The Raman family" subtitle="Three generations, one shared story" action={<Button icon={Plus} onClick={() => addRecord('family member')}>Add sample member</Button>}>
        <div className="family-tree"><svg viewBox="0 0 600 310" aria-hidden="true"><path d="M230 70H370 M300 70V145 M230 165H370 M300 165V240 M170 240H430 M170 240V265 M430 240V265" fill="none" stroke="var(--border-strong)" strokeWidth="2" /></svg>{[0, 1, 2].map(generation => <div className="family-generation" key={generation}>{FAMILY_MEMBERS.slice(generation * 2, generation * 2 + 2).map(member => <button key={member.id} className="family-node" onClick={() => openRecord({ ...member, type: 'Family member' })}><Avatar name={member.title} initials={member.initials} color={member.color} /><strong>{member.title}</strong><small>{member.role}</small></button>)}</div>)}</div>
        {members.length > 0 && <div className="family-new-members"><h3>New members</h3><p className="muted small">These members have no relationship assigned yet.</p>{members.map(member => <button key={member.id} className="event-item" onClick={() => openRecord({ ...member, role: 'Unlinked member' })}><Avatar name={member.title} color="sage" small /><span><strong>{member.title}</strong><small>Unlinked member</small></span><ArrowUpRight size={15} /></button>)}</div>}
      </Panel>
      <Panel title="Coming together" subtitle="On the family calendar"><div className="events-list">{upcoming.map(event => <button key={event.id} className="event-item" onClick={() => openRecord({ ...event, type: 'Family event' })}><span className="event-date"><strong>{formatDate(event.date, { day: '2-digit' })}</strong><small>{formatDate(event.date, { month: 'short' }).toUpperCase()}</small></span><span><strong>{event.title}</strong><small>{event.notes}</small></span><ArrowUpRight size={15} /></button>)}</div><div className="panel-bottom"><Button icon={Plus} onClick={() => addRecord('family event')}>Add sample event</Button></div></Panel>
    </div>}
  </>;
}

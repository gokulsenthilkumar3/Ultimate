import React from 'react';
import { Panel, Progress, RecordsTable } from '../components';
const SAMPLE_SKILLS = [
  { id: 'skill-coding', title: 'Software foundations', category: 'Technical', progress: 72, date: '2026-10-27' },
  { id: 'skill-writing', title: 'Clear writing', category: 'Communication', progress: 48, date: '2026-10-26' },
  { id: 'skill-planning', title: 'Project planning', category: 'Organisation', progress: 60, date: '2026-10-24' },
];
export default function SkillsScreen({ view, added = [], openRecord }) {
  const records = [...SAMPLE_SKILLS, ...added.map(entry => ({ ...entry, category: 'Uncategorised', progress: 0 }))];
  if (view === 'history') return <Panel title="Skill practice history" subtitle="Fictional practice entries and skills created in this demo."><RecordsTable label="Skill history" rows={[...records].sort((a, b) => b.date.localeCompare(a.date))} columns={[{ key: 'date', label: 'Date' }, { key: 'title', label: 'Skill' }, { key: 'category', label: 'Category' }]} onRow={openRecord} /></Panel>;
  if (view === 'radar') {
    const angles = records.map((_, index) => -Math.PI / 2 + index / records.length * Math.PI * 2);
    const coords = angles.map((angle, index) => `${150 + Math.cos(angle) * records[index].progress},${135 + Math.sin(angle) * records[index].progress}`).join(' ');
    return <div className="two-columns"><Panel title="Sample practice profile" subtitle="Illustrative practice coverage, not measured competency."><svg viewBox="0 0 300 290" className="skill-radar" role="img" aria-label="Illustrative practice coverage by skill"><circle cx="150" cy="135" r="100" fill="none" stroke="var(--border-strong)" />{angles.map((angle, index) => <g key={records[index].id}><line x1="150" y1="135" x2={150 + Math.cos(angle) * 100} y2={135 + Math.sin(angle) * 100} stroke="var(--border)" /><text x={150 + Math.cos(angle) * 118} y={135 + Math.sin(angle) * 118} textAnchor="middle" fill="var(--text-2)" fontSize="12">{index + 1}</text></g>)}<polygon points={coords} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="2" /></svg></Panel><Panel title="Practice dimensions" subtitle="These values are sample placeholders."><div className="support-body">{records.map((row, index) => <Progress key={row.id} label={`${index + 1}. ${row.title}`} value={row.progress} />)}</div></Panel></div>;
  }
  if (view === 'list') return <Panel title="Your skill library" subtitle="Skills have their own domain data, separate from project progress."><RecordsTable label="Skill library" rows={records} columns={[{ key: 'title', label: 'Skill' }, { key: 'category', label: 'Category' }, { key: 'progress', label: 'Sample practice coverage', numeric: true, render: row => `${row.progress}%` }]} onRow={openRecord} /></Panel>;
  return <Panel title="Skill map" subtitle="A sample grouping of areas to practise."><div className="three-columns skill-tree">{[...new Set(records.map(row => row.category))].map(category => <section key={category}><h3>{category}</h3>{records.filter(row => row.category === category).map(row => <button key={row.id} className="workspace-card" onClick={() => openRecord({ ...row, type: 'Sample skill' })}><h3>{row.title}</h3><p>Sample practice coverage: {row.progress}%</p></button>)}</section>)}</div></Panel>;
}

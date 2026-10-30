import React, { useMemo } from 'react';

import { layoutFamilyTree } from './treeLayout';


export default function FamilyTree({ members, relationships, total, onSelect }) {
  const graph = useMemo(() => layoutFamilyTree(members, relationships), [members, relationships]);
  return <><p className="native-notice" style={{ margin: '0 20px 16px' }}>Showing {graph.visible.length} of {total} people. Parent links set generations; other connections are shown between people. Use People to search the full tree.</p><div className="native-tree" tabIndex={0} role="region" aria-label="Family tree diagram"><svg width={graph.width} height={graph.height} aria-label="Family relationships">{graph.edges.map(edge => { const a = graph.positions.get(edge.member1Id), b = graph.positions.get(edge.member2Id); return <path key={edge.id} d={`M${a.x + 80},${a.y + 28} C${a.x + 80},${(a.y + b.y) / 2 + 28} ${b.x + 80},${(a.y + b.y) / 2 + 28} ${b.x + 80},${b.y + 28}`}><title>{edge.type.replaceAll('_', ' ')}</title></path>; })}{graph.visible.map(member => { const point = graph.positions.get(member.id); return <g key={member.id} role="button" tabIndex={0} aria-label={`Open ${member.name}`} onClick={() => onSelect(member)} onKeyDown={event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); onSelect(member); } }} transform={`translate(${point.x},${point.y})`}><title>{member.name}</title><rect width="160" height="58" /><text x="14" y="25">{member.name.length > 20 ? `${member.name.slice(0, 19)}…` : member.name}</text><text x="14" y="44" style={{ fontSize: 10, fill: 'var(--gt-muted)' }}>{member.birthDate ? new Date(member.birthDate).getUTCFullYear() : 'Add their story'}{member.deathDate ? ` – ${new Date(member.deathDate).getUTCFullYear()}` : ''}</text></g>; })}</svg></div></>;
}

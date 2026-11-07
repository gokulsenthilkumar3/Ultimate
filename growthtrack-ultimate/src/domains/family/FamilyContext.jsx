import React from 'react';
import { Field, RefreshButton } from '../native/ModuleUI';

export default function FamilyContext({ trees, treeId, onTree, counts, me, onChooseMe, onClearMe, role, busy, query, account }) {
  if(!trees.length)return null;
  return <div className="family-context" role="region" aria-label="Family workspace context">
    {trees.length > 0 && <Field label="Active tree"><select aria-label="Active tree" value={treeId || ''} disabled={busy} onChange={event => onTree(event.target.value)}>{trees.map(tree => <option key={tree.id} value={tree.id}>{tree.name}</option>)}</select></Field>}
    {treeId && <dl className="family-context__counts" aria-label="Tree totals">{[['People',counts.members ?? '—'],['Connections',counts.relationships ?? '—'],['Files',counts.documents ?? '—'],['Milestones',counts.events ?? '—']].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    {treeId && <button type="button" className="native-link family-context__identity" disabled={busy} onClick={onChooseMe} title="Change your private Me marker">{me?.member ? 'Change Me' : 'Choose Me'}</button>}
    {treeId && <RefreshButton query={query} />}
  </div>;
}

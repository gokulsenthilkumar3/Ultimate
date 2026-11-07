import React from 'react';
import { Field, RefreshButton } from '../native/ModuleUI';

export default function FamilyContext({ trees, treeId, onTree, counts, me, onChooseMe, onClearMe, role, busy, query, account }) {
  if(!trees.length)return <div className="family-session-mini"><span className="native-status">Ultimate session · {account.user.name||account.user.email}</span></div>;
  return <div className="family-context" role="region" aria-label="Family workspace context">
    {trees.length > 0 && <Field label="Active tree"><select aria-label="Active tree" value={treeId || ''} disabled={busy} onChange={event => onTree(event.target.value)}>{trees.map(tree => <option key={tree.id} value={tree.id}>{tree.name}</option>)}</select></Field>}
    {treeId && <dl className="family-context__counts" aria-label="Tree totals">{[['People',counts.members ?? '—'],['Connections',counts.relationships ?? '—'],['Files',counts.documents ?? '—'],['Milestones',counts.events ?? '—']].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    <div className="family-context__account"><span className="native-status">Ultimate session · {account.user.name || account.user.email}</span>{role && <small>{role.replaceAll('_',' ')} access</small>}</div>
    {treeId && <button type="button" className="native-button native-button--quiet family-context__identity" disabled={busy} onClick={onChooseMe} title="Choose your private Me marker">{me?.member ? `Me: ${me.member.name}` : 'Choose Me'}</button>}
    {treeId && <RefreshButton query={query} />}
  </div>;
}

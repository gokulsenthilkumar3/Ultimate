import React, { useState } from 'react';
export default function AccessRole({ row, ownerId, busy, onSave }) {
  const [role,setRole] = useState(row.role);
  const locked = row.userId === ownerId;
  return <div className="native-actions"><select aria-label={`Role for ${row.user?.name || row.user?.email || 'member'}`} value={role} disabled={busy || locked} onChange={event => setRole(event.target.value)}>{['viewer','editor','family_head','admin'].map(value => <option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select>{role !== row.role && <button type="button" className="native-button native-button--quiet" disabled={busy} onClick={() => onSave(row.user.email,role)}>Save role</button>}{locked && <small>Tree owner</small>}</div>;
}

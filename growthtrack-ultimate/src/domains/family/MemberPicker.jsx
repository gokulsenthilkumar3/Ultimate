import React, { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Field } from '../native/ModuleUI';
import { familyRequest } from './familyClient';

/** Search the full authorized directory without loading the whole tree into a select. */
export default function MemberPicker({ name, label, account, treeId, initial = [], optional = true }) {
  const [search, setSearch] = useState(''), [picked, setPicked] = useState(null);
  const deferred = useDeferredValue(search);
  const query = useQuery({ queryKey: ['native-family', account.owner, account.user.id, treeId, 'picker', deferred], queryFn: ({ signal }) => familyRequest(`/members?treeId=${encodeURIComponent(treeId)}&page=0&limit=25&search=${encodeURIComponent(deferred)}`, { connection: account, signal }), enabled: Boolean(deferred.trim()), retry: false });
  const choices = [...new Map([...(picked ? [picked] : []), ...(deferred ? query.data?.rows || [] : initial)].map(person => [person.id, person])).values()];
  return <div className="native-form"><Field label={`Find ${label.toLowerCase()}`}><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search all people…" /></Field><Field label={label}><select name={name} value={picked?.id || ''} onChange={event => setPicked(choices.find(person => person.id === event.target.value) || null)} required={!optional}><option value="">{optional ? 'Entire family' : 'Choose a person'}</option>{choices.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>{query.isFetching && <small role="status">Finding people…</small>}{query.isError && <small className="native-form-error" role="alert">{query.error.message}</small>}</div>;
}

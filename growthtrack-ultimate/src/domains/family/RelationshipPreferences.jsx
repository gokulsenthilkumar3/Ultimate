import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { familyRequest } from './familyClient';
import MemberPicker from './MemberPicker';
import { Card, Field, ModuleSkeleton } from '../native/ModuleUI';

const ROLES = ['childhood','colleague','neighbour','mentor','mentee','friend'];
const INTEGRATIONS = ['calendar','tasks','notes','files','finance','wellness','places','entertainment','skills'];
export default function RelationshipPreferences({ account, treeId, people }) {
  const client = useQueryClient(), [person,setPerson] = useState(null);
  const key = ['family-private-relationships',account.owner,account.user.id,treeId];
  const path = `/trees/${encodeURIComponent(treeId)}/relationship-preferences`;
  const query = useQuery({ queryKey:key, queryFn:({signal})=>familyRequest(path,{connection:account,signal}), retry:false });
  const mutation = useMutation({ mutationFn:body=>familyRequest(path,{connection:account,method:'PUT',body}), onSuccess:data=>client.setQueryData(key,data) });
  return <Card title="My circles & sharing" description="Your circles and relationship roles are private. Approve each person and app separately.">
    <MemberPicker name="private-person" label="Choose a person" account={account} treeId={treeId} initial={people} onPick={value=>{setPerson(value);mutation.reset();}} />
    {query.isPending ? <ModuleSkeleton label="Loading private preferences"/> : query.isError ? <p role="alert">{query.error.message}</p> : person && <PreferenceForm key={person.id + ':' + query.dataUpdatedAt} person={person} value={query.data?.people?.[person.id]} save={body=>mutation.mutate(body)} busy={mutation.isPending}/>}
    {mutation.isError && <p role="alert">{mutation.error.message}</p>}
    {mutation.isSuccess && <p role="status">Your private preferences and approvals were saved.</p>}
  </Card>;
}
function PreferenceForm({person,value={},save,busy}) {
  const [circle,setCircle]=useState(value.circle||''), [roles,setRoles]=useState(value.roles||[]), [integrations,setIntegrations]=useState(value.integrations||[]);
  const toggle=(values,setValues,item)=>setValues(values.includes(item)?values.filter(v=>v!==item):[...values,item]);
  return <form className="native-form" onSubmit={event=>{event.preventDefault();save({memberId:person.id,circle:circle||null,roles,integrations});}}>
    <h3>{person.name}</h3><Field label="Private closeness circle"><select value={circle} onChange={e=>setCircle(e.target.value)}><option value="">No circle</option><option value="inner">Inner circle</option><option value="close">Close friend</option><option value="friend">Friend</option><option value="acquaintance">Acquaintance</option></select></Field>
    <fieldset><legend>Relationship roles</legend>{ROLES.map(role=><label key={role} style={{display:'block'}}><input type="checkbox" checked={roles.includes(role)} onChange={()=>toggle(roles,setRoles,role)}/> {role}</label>)}</fieldset>
    <fieldset><legend>Approved apps for this person</legend><p>These approvals record your choices. Automatic synchronization is not available yet; no records are shared by saving this form.</p>{INTEGRATIONS.map(id=><label key={id} style={{display:'block'}}><input type="checkbox" checked={integrations.includes(id)} onChange={()=>toggle(integrations,setIntegrations,id)}/> {id} · awaiting connector</label>)}</fieldset>
    <button className="native-button" disabled={busy} type="submit">{busy?'Saving…':'Save private choices'}</button>
  </form>;
}

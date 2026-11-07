import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { familyRequest } from './familyClient';
import { Card, ModuleSkeleton, QueryMessage } from '../native/ModuleUI';
import { dateLabel } from '../native/format';
import { useNavigate } from 'react-router-dom';

export default function FamilyToday({account,treeId,people,counts,open}) {
  const navigate=useNavigate(),onView=value=>navigate(`/life/family?view=${encodeURIComponent(value)}`);
  const from=new Date();from.setUTCHours(0,0,0,0);const to=new Date(from);to.setUTCDate(to.getUTCDate()+30);
  const events=useQuery({queryKey:['native-family',account.owner,account.user.id,treeId,'today',from.toISOString().slice(0,10)],queryFn:({signal})=>familyRequest(`/events?treeId=${encodeURIComponent(treeId)}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&page=0`,{connection:account,signal}),retry:false});
  const rows=events.data?.rows||[];
  return <div className="family-today">
    <Card title="Your family, today" description="A quiet place to reconnect, remember and plan."><div className="family-today-actions"><button className="native-button" type="button" onClick={()=>onView('tree')}>Explore relationships</button><button className="native-button native-button--quiet" type="button" onClick={()=>onView('memories')}>Visit your memories</button><button className="native-button native-button--quiet" type="button" onClick={()=>onView('connections')}>Review circles & sharing</button></div><p className="family-inline-help">{counts.members??people.length} people · {counts.relationships??0} connections · {counts.documents??0} files</p></Card>
    <Card title="Next 30 days" description="Recorded milestones in this tree. Recurring birthdays are not expanded here yet."><QueryMessage query={events}/>{events.isPending?<ModuleSkeleton label="Loading upcoming milestones"/>:events.isSuccess&&<>{rows.length?<ol className="family-timeline">{rows.map(event=><li key={event.id}><div><time dateTime={event.date}>{dateLabel(event.date)}</time><h3>{event.title}</h3>{event.member&&<button type="button" className="native-link" onClick={()=>open('profile',event.member)}>{event.member.name}</button>}{event.location&&<p>{event.location}</p>}</div></li>)}</ol>:<p className="family-inline-help">No recorded milestones in the next 30 days. Add a milestone from Timeline.</p>}<button type="button" className="native-link" onClick={()=>onView('timeline')}>Open full timeline</button></>}</Card>
    <Card title="Build your family story" description="Small contributions make a lasting record."><div className="family-today-actions"><button type="button" className="native-button native-button--quiet" onClick={()=>onView('people')}>Find a person</button><button type="button" className="native-button native-button--quiet" onClick={()=>onView('vault')}>Review family documents</button></div><p className="family-inline-help">App approvals currently save your choices; automatic cross-app synchronization is still awaiting connectors.</p></Card>
  </div>;
}

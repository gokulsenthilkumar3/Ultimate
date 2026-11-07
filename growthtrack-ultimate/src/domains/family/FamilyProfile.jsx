import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageState from '../../components/ui/PageState';
import { ModuleSkeleton, QueryMessage } from '../native/ModuleUI';
import { dateLabel } from '../native/format';
import { describeDate } from './familyDates';
import { familyRequest } from './familyClient';
import { relationToMe } from './kinship';

export default function FamilyProfile({ account, treeId, person, edit, onEdit, onRelative, onShow, onMe, onOpen, onPhoto, onAddMemory, onAddEvent, meId, meBusy, connections, people }) {
  const [section,setSection]=useState('details');
  const key=['native-family',account.owner,account.user.id,'profile',person.id];
  const full=useQuery({queryKey:key,queryFn:({signal})=>familyRequest(`/members/${encodeURIComponent(person.id)}`,{connection:account,signal}),retry:false});
  const photos=useQuery({queryKey:[...key,'photos'],queryFn:({signal})=>familyRequest(`/documents/${encodeURIComponent(treeId)}?page=0&type=photo&memberId=${encodeURIComponent(person.id)}`,{connection:account,signal}),enabled:section==='memories'&&full.isSuccess,retry:false});
  const events=useQuery({queryKey:[...key,'events'],queryFn:({signal})=>familyRequest(`/events/${encodeURIComponent(treeId)}?page=0&memberId=${encodeURIComponent(person.id)}`,{connection:account,signal}),enabled:section==='timeline'&&full.isSuccess,retry:false});
  const record=full.data||person, disabled=meBusy||full.isPending||full.isError;
  const denied=[full,photos,events].some(query=>query.isError&&[401,403,404].includes(query.error?.status));
  if(denied)return <>{[full,photos,events].map((query,index)=><QueryMessage key={index} query={query}/>)}</>;
  const related=connections.filter(edge=>edge.member1Id===person.id||edge.member2Id===person.id);
  return <div className="native-form"><QueryMessage query={full}/>
    <p className="native-status">{relationToMe(record,meId,people,connections)||'Family member'}</p>
    <div className="family-profile-actions">{edit&&<><button type="button" className="native-button" onClick={()=>onRelative(record)} disabled={disabled}>Add their relative</button><button type="button" className="native-button native-button--quiet" onClick={()=>onEdit(record)} disabled={disabled}>Edit this person</button></>}<button type="button" className="native-link" onClick={()=>onShow(record)} disabled={disabled}>Show in tree</button><button type="button" className="native-link" onClick={()=>onMe(record.id)} disabled={disabled||meId===record.id}>{meId===record.id?'This is Me':'This is me'}</button></div>
    <nav className="family-profile-tabs" aria-label="Person details">{[['details','Profile'],['memories','Memories'],['timeline','Timeline']].map(([id,label])=><button type="button" key={id} aria-pressed={section===id} onClick={()=>setSection(id)}>{label}</button>)}</nav>
    {full.isPending?<ModuleSkeleton label="Loading person"/>:section==='details'?<>
      <dl className="native-detail-list">{[['Birth date',describeDate(record.birthDate,record.birthDatePrecision,record.birthDateApproximate)],['Birth location',record.birthLocation||'Not recorded'],['Occupation',record.occupation||'Not recorded'],['Religion',record.religion||'Not recorded'],['Death date',record.deathDate?describeDate(record.deathDate,record.deathDatePrecision,record.deathDateApproximate):record.deathRecorded?'Passed away, date not known':'Not recorded']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="family-biography">{record.bio||'Their story is waiting to be written.'}</p>
      {related.length>0&&<><h3>Connections</h3><ul className="family-profile-relationships">{related.slice(0,30).map(edge=>{const other=people.find(person=>person.id===(edge.member1Id===record.id?edge.member2Id:edge.member1Id));if(!other)return null;const label=relationToMe(other,record.id,people,connections)||edge.type.replaceAll('_',' ');return <li key={edge.id}><i aria-hidden="true">{other.name[0]}</i><div><button type="button" className="native-link" onClick={()=>onOpen(other)}>{other.name}</button><small>{label}{other.birthDate?` · Born ${other.birthDate.slice(0,4)}`:''}</small></div></li>;})}</ul></>}
    </>:section==='memories'?<><QueryMessage query={photos}/>{edit&&<button type="button" className="native-button native-button--quiet" onClick={()=>onAddMemory(record)}>Add a memory for {record.name}</button>}{photos.isPending?<ModuleSkeleton label="Loading person memories"/>:photos.data&&!photos.isError&&(photos.data.rows.length?<ul className="family-profile-relationships">{photos.data.rows.map(document=><li key={document.id}><div><button type="button" className="native-link" onClick={()=>onPhoto(document,record)}>{document.fileName}</button><small>{dateLabel(document.uploadedAt)} · Tree-level access</small></div></li>)}</ul>:<PageState state="empty" title="No photos for this person" description="An editor can attach a photo to their story."/>)}</>:<><QueryMessage query={events}/>{edit&&<button type="button" className="native-button native-button--quiet" onClick={()=>onAddEvent(record)}>Add a milestone for {record.name}</button>}{events.isPending?<ModuleSkeleton label="Loading person timeline"/>:events.data&&!events.isError&&(events.data.rows.length?<ol className="family-timeline">{events.data.rows.map(event=><li key={event.id}><div><time dateTime={event.date}>{dateLabel(event.date)}</time><h3>{event.title}</h3><p>{event.description}</p></div></li>)}</ol>:<PageState state="empty" title="No milestones for this person" description="Recorded birthdays, achievements and other events will appear here."/>)}</>}
  </div>;
}

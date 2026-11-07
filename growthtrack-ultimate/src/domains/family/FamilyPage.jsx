import React, { useDeferredValue, useEffect, useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/ui/Modal';
import PageState from '../../components/ui/PageState';
import { Card, Field, ModuleFrame, ModuleSkeleton, QueryMessage } from '../native/ModuleUI';
import { canEditFamily, connectFamily, familyEpoch, familyRequest, useFamilyConnection } from './familyClient';
import MemberPicker from './MemberPicker';
import RelationshipFields from './RelationshipFields';
import NewPersonFields from './NewPersonFields';
import { kinshipPayload } from './kinship';
import FamilyContext from './FamilyContext';
import FamilyTabContent from './FamilyTabContent';
import FamilyUploadFields from './FamilyUploadFields';
import FamilyProfile from './FamilyProfile';

const TABS = [{ value: 'tree', label: 'Family tree' }, { value: 'people', label: 'People' }, { value: 'memories', label: 'Memories' }, { value: 'vault', label: 'Private vault' }, { value: 'timeline', label: 'Timeline' }, { value: 'access', label: 'Access' }];
const EMPTY = [];
const EVENTS = ['birthday', 'marriage', 'death', 'anniversary', 'festival', 'gathering', 'migration', 'achievement'];
const human = text => text.replaceAll('_', ' ');
const formValues = form => Object.fromEntries(new FormData(form));

function FamilySession({ owner }) {
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController(); setError('');
    // The parent initializes the owner epoch in its effect before this task runs.
    queueMicrotask(async () => {
      if (controller.signal.aborted) return;
      const expected = familyEpoch();
      try { const result = await familyRequest('/session', { method: 'POST', body: {}, signal: controller.signal }); if (!controller.signal.aborted) connectFamily(owner, result, expected); }
      catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
    });
    return () => controller.abort();
  }, [owner, attempt]);
  if (!owner) return <Card title="Your Ultimate session is required"><p className="native-notice">Sign in to Ultimate to open your family workspace.</p></Card>;
  return error ? <Card title="Family is part of your Ultimate workspace" description="No separate Family sign-in is needed."><div className="native-card__body"><p className="native-form-error" role="alert">{error}</p><button type="button" className="native-button" onClick={() => setAttempt(value => value + 1)}>Retry Family connection</button></div></Card> : <ModuleSkeleton label="Opening Family with your Ultimate session" />;
}

function ProfileFields({ member, account }) {
  const [bio, setBio] = useState(member?.bio || ''), [notes, setNotes] = useState(''), [aiError, setAiError] = useState(''), [drafting, setDrafting] = useState(false);
  return <><Field label="Full name"><input name="name" defaultValue={member?.name || ''} maxLength={160} required /></Field><div className="native-form-grid"><Field label="Birth date"><input type="date" name="birthDate" defaultValue={member?.birthDate?.slice(0, 10) || ''} /></Field><Field label="Death date (optional)"><input type="date" name="deathDate" defaultValue={member?.deathDate?.slice(0, 10) || ''} /></Field><Field label="Gender"><select name="gender" defaultValue={member?.gender || ''}><option value="">Unspecified</option>{['male', 'female', 'other'].map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Birth location"><input name="birthLocation" defaultValue={member?.birthLocation || ''} maxLength={300} /></Field><Field label="Occupation"><input name="occupation" defaultValue={member?.occupation || ''} maxLength={300} /></Field><Field label="Religion (optional)"><input name="religion" defaultValue={member?.religion || ''} maxLength={200} /></Field></div><Field label="Their story"><textarea name="bio" value={bio} onChange={event => setBio(event.target.value)} maxLength={10000} /></Field>{member && <details><summary className="native-link">Draft a biography with Gemini</summary><Field label="Life notes · one fact per line" hint="This action sends these notes and the saved profile to Gemini. Review the draft before saving."><textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={5000} /></Field><button type="button" className="native-button native-button--quiet" disabled={drafting || !notes.trim()} onClick={async () => { setDrafting(true); setAiError(''); try { const result = await familyRequest('/ai/generate-bio', { connection: account, method: 'POST', body: { memberId: member.id, bulletPoints: notes.split('\n').filter(Boolean).slice(0, 20) } }); setBio(result.bio); } catch (error) { setAiError(error.message); } finally { setDrafting(false); } }}>{drafting ? 'Drafting…' : 'Send notes & draft biography'}</button>{aiError && <p role="alert" className="native-form-error">{aiError}</p>}</details>}</>;
}

function PrivatePhoto({ account, document, onDownload, onBack }) {
  const [url, setUrl] = useState(null), [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); let objectUrl; familyRequest(`/documents/file/${encodeURIComponent(document.id)}`, { connection: account, blob: true, signal: controller.signal }).then(blob => { if (controller.signal.aborted) return; if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(blob.type)) { setError('This image format cannot be previewed. Download the original to view it.'); return; } objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }).catch(failure => { if (!controller.signal.aborted) setError(failure.message); }); return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); }; }, [account, document.id]);
  return <>{onBack&&<button type="button" className="native-link" onClick={onBack}>Back to person</button>}<p className="family-inline-help">{document.member?.name||'Family memory'} · {document.uploadedAt?new Date(document.uploadedAt).toLocaleDateString():'Date not recorded'} · Tree-level access</p>{error ? <p className="native-form-error" role="alert">{error}</p> : url ? <img className="native-photo" src={url} alt={document.fileName} /> : <ModuleSkeleton label="Loading private photo" />}<button type="button" className="native-button native-button--quiet" onClick={onDownload}>Download original</button></>;
}

function FamilyWorkspace({ account, view, onViewChange }) {
  const client = useQueryClient(), owner = account.owner;
  const formId = useId();
  const [chosenTree, setChosenTree] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(0), [modal, setModal] = useState(null), [notice, setNotice] = useState(''), [downloadBusy, setDownloadBusy] = useState(null), [fileError, setFileError] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [focusedPerson, setFocusedPerson] = useState(null);
  const [memberLife,setMemberLife] = useState('all'), [peopleView,setPeopleView] = useState('grid'), [eventType,setEventType] = useState(''), [eventPerson,setEventPerson] = useState(null);
  const rootKey = ['native-family', owner, account.user.id];
  const get = (path, signal) => familyRequest(path, { connection: account, signal });
  const list = useQuery({ queryKey: [...rootKey, 'trees'], queryFn: ({ signal }) => get('/trees', signal), staleTime: 30_000, retry: false });
  const trees = list.data || EMPTY;
  const treeId = trees.some(tree => tree.id === chosenTree) ? chosenTree : trees[0]?.id;
  const me = useQuery({ queryKey: [...rootKey, treeId, 'me'], queryFn: ({ signal }) => get(`/trees/${encodeURIComponent(treeId)}/me`, signal), enabled: Boolean(treeId), retry: false });
  const meId = me.data?.memberId || '';
  const focusId = focusedPerson && focusedPerson.treeId === treeId ? focusedPerson.id : meId;
  const tree = useQuery({ queryKey: [...rootKey, treeId, 'tree', focusId], queryFn: ({ signal }) => get(`/trees/${encodeURIComponent(treeId)}?native=1${focusId ? `&focus=${encodeURIComponent(focusId)}` : ''}`, signal), enabled: Boolean(treeId), placeholderData:(previous,previousQuery)=>previousQuery?.queryKey?.[3]===treeId?previous:undefined, staleTime: 0, retry: false });
  const treeBlocked = (tree.isError && [401, 403, 404].includes(tree.error?.status)) || (me.isError && [403, 404].includes(me.error?.status));
  const role = treeBlocked ? undefined : tree.data?.currentUserRole, edit = canEditFamily(role);
  const members = useQuery({ queryKey: [...rootKey, treeId, 'members', page, deferredSearch, memberLife], queryFn: ({ signal }) => get(`/members?treeId=${encodeURIComponent(treeId)}&page=${page}&limit=25&search=${encodeURIComponent(deferredSearch)}&life=${memberLife}`, signal), enabled: Boolean(treeId && view === 'people'), retry: false });
  const events = useQuery({ queryKey: [...rootKey, treeId, 'events', page, eventType, eventPerson?.id], queryFn: ({ signal }) => get(`/events/${encodeURIComponent(treeId)}?page=${page}${eventType?`&type=${eventType}`:''}${eventPerson?.id?`&memberId=${encodeURIComponent(eventPerson.id)}`:''}`, signal), enabled: Boolean(treeId && view === 'timeline'), retry: false });
  const documents = useQuery({ queryKey: [...rootKey, treeId, 'documents', page, view], queryFn: ({ signal }) => get(`/documents/${encodeURIComponent(treeId)}?page=${page}${view === 'memories' ? '&type=photo' : ''}`, signal), enabled: Boolean(treeId && ['memories', 'vault'].includes(view)), retry: false });
  const access = useQuery({ queryKey: [...rootKey, treeId, 'access'], queryFn: ({ signal }) => get(`/trees/${encodeURIComponent(treeId)}/access`, signal), enabled: Boolean(treeId && view === 'access'), retry: false });
  const permissionChanged = [members, events, documents, access, me].some(query => query.isError && [403, 404].includes(query.error?.status));
  const refreshTree = tree.refetch;
  useEffect(() => { if (permissionChanged) refreshTree(); }, [permissionChanged, refreshTree]);
  const mutation = useMutation({ mutationFn: ({ path, body, method = 'POST' }) => familyRequest(path, { connection: account, method, body }), retry: false,
    onSuccess: async result => { if (modal?.kind === 'tree') setChosenTree(result.id); if (modal?.kind === 'member') setFocusedPerson({ treeId, id: result.id }); setModal(null); setNotice('Saved to Family Connect.'); await client.invalidateQueries({ queryKey: rootKey }); },
    onError: failure => { if (failure.status === 403) tree.refetch(); },
  });
  const meMutation = useMutation({ mutationFn: async memberId => { const selectedTreeId = treeId; const result = await familyRequest(`/trees/${encodeURIComponent(selectedTreeId)}/me`, { connection: account, method: 'PUT', body: { memberId } }); return { ...result, selectedTreeId }; }, retry: false,
    onSuccess: async result => { client.setQueryData([...rootKey, result.selectedTreeId, 'me'], result); if (result.selectedTreeId !== treeId) return; setFocusedPerson(null); setNotice(result.memberId ? 'Your Me selection is saved. There is only one Me in this tree for your account.' : 'Your Me selection was cleared.'); setModal(null); },
  });
  const roleMutation = useMutation({ mutationFn: async body => { const selectedTreeId = treeId; await familyRequest(`/trees/${encodeURIComponent(selectedTreeId)}/invite`,{connection:account,method:'POST',body});return selectedTreeId; }, retry:false,
    onSuccess: async selectedTreeId => { setNotice('Tree access updated.'); await client.invalidateQueries({queryKey:[...rootKey,selectedTreeId]}); },
  });
  const open = (kind, record) => { mutation.reset(); meMutation.reset(); setNotice(''); setFileError(''); setModal({ kind, record }); };
  const close = () => { if (!mutation.isPending && !meMutation.isPending) { setModal(null); mutation.reset(); } };
  useEffect(() => () => { void client.cancelQueries({ queryKey: ['native-family', owner] }); client.removeQueries({ queryKey: ['native-family', owner] }); }, [client, owner]);
  const changeView = next => { setPage(0); setSearch(''); setModal(null); setNotice(''); onViewChange?.(next); };
  const download = async document => { if (downloadBusy) return; setDownloadBusy(document.id); setFileError(''); try { const blob = await familyRequest(`/documents/file/${encodeURIComponent(document.id)}`, { connection: account, blob: true }); const url = URL.createObjectURL(blob); const link = window.document.createElement('a'); link.href = url; link.download = document.fileName; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (failure) { setFileError(failure.message); } finally { setDownloadBusy(null); } };
  const submit = event => {
    event.preventDefault(); const values = formValues(event.currentTarget), kind = modal.kind;
    if (kind === 'tree') mutation.mutate({ path: '/trees', body: { name: values.name, isPublic: false } });
    if (kind === 'edit') mutation.mutate({ path: `/members/${modal.record.id}`, method: 'PUT', body: { ...values, gender: values.gender || null } });
    if (kind === 'member') {
      const { markAsMe, connectRelative, anchorId, kinshipId, customLabel, marriageDate, ...profile } = values;
      const relative = anchorId ? { memberId: anchorId, ...kinshipPayload(kinshipId, customLabel), ...(marriageDate ? { marriageDate } : {}) } : undefined;
      mutation.mutate({ path: '/members', body: { ...profile, gender: profile.gender || null, treeId, markAsMe: markAsMe === 'on', ...(relative ? { relative } : {}) } });
    }
    if (kind === 'relationship') mutation.mutate({ path: '/relationships', body: { treeId, member1Id: values.relativeId, member2Id: values.anchorId, ...kinshipPayload(values.kinshipId, values.customLabel), ...(values.marriageDate ? { marriageDate: values.marriageDate } : {}) } });
    if (kind === 'me') { meMutation.mutate(values.memberId); return; }
    if (kind === 'event') mutation.mutate({ path: '/events', body: { ...values, treeId, memberId: values.memberId || undefined } });
    if (kind === 'upload') { const body = new FormData(event.currentTarget); body.set('treeId', treeId); mutation.mutate({ path: '/documents', body }); }
    if (kind === 'invite') mutation.mutate({ path: `/trees/${treeId}/invite`, body: values });
  };
  const people = useMemo(() => [...new Map([...(tree.data?.members || EMPTY), ...(me.data?.member ? [me.data.member] : [])].map(person => [person.id, person])).values()], [tree.data?.members, me.data?.member]);
  const connections = tree.data?.relationships || EMPTY;
  const currentQuery = view === 'people' ? members : view === 'timeline' ? events : ['memories', 'vault'].includes(view) ? documents : view === 'access' ? access : tree;
  const titles = { tree: 'Create a private tree', member: 'Add a person & connect them', edit: 'Edit person', relationship: 'Connect two people', me: 'Choose who is Me', event: 'Add a family milestone', upload: 'Keep a memory safe', invite: 'Invite a registered Family user', profile: modal?.record?.name, photo: modal?.record?.fileName };
  const busy = mutation.isPending || meMutation.isPending || roleMutation.isPending;
  const selectTree = id => { setChosenTree(id);setPage(0);setSearch('');setModal(null);setMemberLife('all');setEventType('');setEventPerson(null);setFocusedPerson(null); };
  const context = <FamilyContext trees={trees} treeId={treeId} onTree={selectTree} counts={tree.data?._count||{}} me={me.data} onChooseMe={()=>open('me')} onClearMe={()=>meMutation.mutate(null)} role={role} busy={busy} query={currentQuery} account={account}/>;
  return <ModuleFrame compact context={context} domain="family" title="Family Connect" subtitle="The people and moments that make you, you." kind="snip" view={view} tabs={TABS.map(tab => ({ ...tab, disabled: busy }))} onViewChange={changeView} actions={<button type="button" className="native-button native-button--quiet" disabled={busy} onClick={() => open('tree')}><Plus size={16} />New tree</button>}>
    <QueryMessage query={list}/><QueryMessage query={tree}/><QueryMessage query={me}/>
    {meMutation.isError&&!modal&&<p className="native-form-error" role="alert">{meMutation.error.message}</p>}
    {roleMutation.isError&&<p className="native-form-error" role="alert">{roleMutation.error.message}</p>}
    {notice&&<p className="family-inline-status" role="status">{notice}</p>}{fileError&&<p className="native-form-error" role="alert">{fileError}</p>}
    {list.isPending?<ModuleSkeleton label="Loading your family trees"/>:!treeId&&!list.isError?<div className="family-empty"><PageState state="empty" title="A new chapter starts here" description="Create a private tree, then add your people."/><button type="button" className="native-button" onClick={()=>open('tree')}>Create your first tree</button></div>:treeId&&<>
      {tree.isPending?<ModuleSkeleton label="Loading family tree and permissions"/>:tree.data&&!treeBlocked&&<>
        {currentQuery!==tree&&<QueryMessage query={currentQuery}/>}
        <FamilyTabContent view={view} edit={edit} role={role} treeId={treeId} tree={tree.data} people={people} connections={connections} meId={meId} focusId={focusId} open={open} onFocusPerson={person=>setFocusedPerson({treeId,id:person.id})} account={account} members={members} events={events} documents={documents} access={access} page={page} setPage={setPage} search={search} setSearch={setSearch} memberLife={memberLife} setMemberLife={setMemberLife} peopleView={peopleView} setPeopleView={setPeopleView} eventType={eventType} setEventType={setEventType} eventPerson={eventPerson} setEventPerson={setEventPerson} download={download} downloadBusy={downloadBusy} onSaveRole={(email,role)=>roleMutation.mutate({email,role})} roleBusy={busy}/>
      </>}
    </>}
    <Modal open={Boolean(modal)} title={titles[modal?.kind]} onClose={close} closeDisabled={busy} className={`family-modal ${['member','relationship','photo'].includes(modal?.kind)?'family-modal--wide':''}`} placement={['profile','edit','event','invite'].includes(modal?.kind)?'drawer':'dialog'} actions={modal&&!['profile','photo'].includes(modal.kind)?<><button type="submit" form={formId} className="native-button" disabled={busy}>{busy?'Saving…':modal.kind==='me'?'Mark as Me':modal.kind==='invite'?'Save tree access':'Save to Family Connect'}</button><button type="button" className="native-button native-button--quiet" onClick={close} disabled={busy}>Cancel</button></>:null}>{meMutation.isError && <p className="native-form-error" role="alert">{meMutation.error.message}</p>}{modal && (modal.kind === 'profile' ? <FamilyProfile key={modal.record.id} account={account} treeId={treeId} onOpen={person=>open('profile',person)} onPhoto={(document,person)=>open('photo',{...document,backToPerson:person})} onAddMemory={person=>open('upload',{person,photo:true})} onAddEvent={person=>open('event',{person})} person={modal.record} edit={edit} onEdit={person => open('edit', person)} onRelative={person => open('member', { anchor: person })} onShow={person => { setFocusedPerson({ treeId, id: person.id }); changeView('tree'); }} onMe={id => meMutation.mutate(id)} meId={meId} meBusy={meMutation.isPending} connections={connections} people={people} /> : modal.kind === 'photo' ? <PrivatePhoto account={account} document={modal.record} onDownload={() => download(modal.record)} onBack={modal.record.backToPerson?()=>open('profile',modal.record.backToPerson):undefined} /> : <form id={formId} className="native-form" onSubmit={submit}>
      {modal.kind === 'tree' && <Field label="Tree name"><input name="name" required maxLength={160} placeholder="Our family" /></Field>}
      {modal.kind === 'edit' && <ProfileFields member={modal.record} account={account} />}
      {modal.kind === 'member' && <NewPersonFields account={account} treeId={treeId} people={people} anchor={modal.record?.anchor || me.data?.member} currentMe={me.data?.member} markAsMe={modal.record?.markAsMe} />}
      {modal.kind === 'relationship' && <RelationshipFields account={account} treeId={treeId} people={people} anchor={me.data?.member} />}
      {modal.kind === 'me' && <><p className="family-inline-help">Choose your person in this tree. This changes only your private Me marker.</p><MemberPicker name="memberId" label="My person" account={account} treeId={treeId} initial={people} defaultPerson={me.data?.member} optional={false} />{meId&&<button type="button" className="native-link" disabled={busy} onClick={()=>meMutation.mutate(null)}>Clear Me</button>}</>}
      {modal.kind === 'event' && <><Field label="Milestone title"><input name="title" maxLength={300} required /></Field><div className="native-form-grid"><Field label="Type"><select name="type">{EVENTS.map(type => <option key={type}>{type}</option>)}</select></Field><Field label="Date"><input type="date" name="date" required /></Field></div><MemberPicker name="memberId" label="Person (optional)" account={account} treeId={treeId} initial={people} defaultPerson={modal.record?.person} /><Field label="Location"><input name="location" maxLength={300} /></Field><Field label="The story"><textarea name="description" maxLength={10000} /></Field></>}
      {modal.kind === 'upload' && <FamilyUploadFields account={account} treeId={treeId} people={people} photo={view==='memories'||modal.record?.photo} person={modal.record?.person}/>}
      {modal.kind === 'invite' && <><Field label="Member account email" hint="Ask the person to open Family in Ultimate once before inviting them."><input type="email" name="email" autoComplete="off" required /></Field><Field label="Tree role"><select name="role">{['viewer', 'editor', 'family_head', 'admin'].map(role => <option key={role} value={role}>{human(role)}</option>)}</select></Field><p className="native-notice">An existing member’s role will be updated. Admin access includes the ability to invite other accounts.</p></>}
      {mutation.isError && <p className="native-form-error" role="alert">{mutation.error.message}</p>}
    </form>)}</Modal>
  </ModuleFrame>;
}

export default function FamilyPage({ view = 'tree', onViewChange }) {
  const { user } = useAuth(); const owner = user?.id || user?.email;
  const account = useFamilyConnection(owner);
  const selectedView = TABS.some(tab => tab.value === view) ? view : 'tree';
  return account ? <FamilyWorkspace key={`${owner}:${account.user.id}`} account={account} view={selectedView} onViewChange={onViewChange} /> : <ModuleFrame compact domain="family" title="Family Connect" subtitle="The people and moments that make you, you." kind="snip" view={selectedView} tabs={TABS} onViewChange={onViewChange}><FamilySession key={owner} owner={owner} /></ModuleFrame>;
}

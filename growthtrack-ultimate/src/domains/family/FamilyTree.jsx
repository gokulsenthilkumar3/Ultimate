import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, useReactFlow, MarkerType, useNodesInitialized } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { layoutFamilyTree, layoutFriendCircles, layoutMixedRelationships } from './treeLayout';
import { useQuery } from '@tanstack/react-query';
import { familyRequest } from './familyClient';
import { relationToMe } from './kinship';
import MemberPicker from './MemberPicker';
import PageState from '../../components/ui/PageState';
import { graphFocus } from './graphFocus';
import { graphAppearance } from './graphAppearance';
import './family-graph.css';
const FamilyTreeWebGL=lazy(()=>import('./FamilyTreeWebGL'));
const webGLPreviewEnabled=import.meta.env.VITE_FAMILY_WEBGL_ENABLED==='true'||(typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('webgl')==='1');
class WebGLBoundary extends React.Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<p role="alert" className="family-graph-notice">WebGL is unavailable. <button type="button" onClick={this.props.onFallback}>Return to standard canvas</button></p>:this.props.children;}
}

function PersonAvatar({person,account}) {
  const [url,setUrl]=useState(null);
  useEffect(()=>{
    setUrl(null);
    if(!/^\/uploads\/[A-Za-z0-9_.-]+$/.test(person.photoUrl||''))return;
    const controller=new AbortController();let objectUrl;
    familyRequest(`/documents/upload/${encodeURIComponent(person.photoUrl.split('/').pop())}`,{connection:account,blob:true,signal:controller.signal}).then(blob=>{
      if(controller.signal.aborted||!['image/jpeg','image/png','image/webp','image/gif'].includes(blob.type))return;
      objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
    }).catch(()=>{});
    return ()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[person.photoUrl,account]);
  return <span className="family-person-avatar" aria-hidden="true">{url?<img src={url} alt="" onError={()=>setUrl(null)}/>:person.name.split(/\s+/).slice(0,2).map(word=>word[0]).join('')}</span>;
}
function PersonNode({ data }) {
  const { person, label, me, onSelect, onRelative, onCenter, horizontal, account, appearance } = data;
  const [primary,...native]=label.split(' · ');
  return <div className="family-person-card" data-me={me} data-deceased={Boolean(person.deathDate)} data-kind={appearance?.kind} data-tone={appearance?.tone}><Handle type="target" position={horizontal?Position.Left:Position.Top}/><Handle id="partner-in" type="target" position={Position.Left}/>
    {!me&&<span className="family-generation-cue" title={appearance?.cue} aria-label={appearance?.cue}>{appearance?.kind==='ancestor'?'↑':appearance?.kind==='descendant'?'↓':appearance?.kind==='social'?'◇':'○'}</span>}
    <span className="family-drag-handle" title="Drag to arrange" aria-hidden="true">⠿</span>
    <button type="button" className="family-person-main nodrag" data-family-person aria-label={`Open ${person.name}${me?', Me':''}`} title={`${person.name} · ${label}`} onClick={()=>onSelect(person)}><PersonAvatar person={person} account={account}/><span className="family-person-copy"><strong>{person.name}</strong><small>{person.birthDate?.slice(0,4)||'Date unknown'}{person.deathDate?` – ${person.deathDate.slice(0,4)} · In memory`:''}</small><span>{primary||'Family member'}{native.length>0&&<small lang="ta">{native.join(' · ')}</small>}</span></span>{me&&<b className="family-person-me">Me</b>}</button>
    <div className="family-person-quick nodrag"><button type="button" onClick={()=>onSelect(person)}>Profile</button>{onRelative&&<button type="button" onClick={()=>onRelative(person)}>+ Relative</button>}<button type="button" onClick={()=>onCenter(person)}>Center</button></div><Handle type="source" position={horizontal?Position.Right:Position.Bottom}/><Handle id="partner-out" type="source" position={Position.Right}/></div>;
}
function UnionNode({data}) { return <><Handle type="target" position={data.horizontal?Position.Left:Position.Top}/><Handle type="source" position={data.horizontal?Position.Right:Position.Bottom}/></>; }
function ZoneNode({data}) {return <span className="family-zone-label">{data.label}</span>;}
const nodeTypes = { person: PersonNode, union:UnionNode, zone:ZoneNode };

function Canvas({ members, relationships, total, onSelect, meId, focusId=meId, account, treeId, onFocusPerson, onAddPerson, onAddRelationship, onRelative }) {
  const flow = useReactFlow();
  const initialized=useNodesInitialized();
  const [mode, setMode] = useState('family');
  const [showLabels,setShowLabels] = useState(false);
  const [search,setSearch]=useState(''),[list,setList]=useState(false),[focusMode,setFocusMode]=useState(false),[pathTarget,setPathTarget]=useState(null),[horizontal,setHorizontal]=useState(false);
  const [focusRadius,setFocusRadius]=useState(2);
  const [renderer,setRenderer]=useState('standard');
  const [previewEnabled,setPreviewEnabled]=useState(webGLPreviewEnabled);
  const [spacing,setSpacing]=useState('comfortable');
  const appearance=useMemo(()=>graphAppearance(members,relationships,meId),[members,relationships,meId]);
  const privateChoices = useQuery({queryKey:['family-private-relationships',account.owner,account.user.id,treeId],queryFn:({signal})=>familyRequest(`/trees/${encodeURIComponent(treeId)}/relationship-preferences`,{connection:account,signal}),retry:false});
  const choices = privateChoices.data?.people;
  const visibleRelationships = useMemo(() => {
    const filtered = relationships.filter(edge => mode === 'combined' || (mode === 'friends' ? ['friend','mentor'].includes(edge.type) : !['friend','mentor'].includes(edge.type)));
    if (mode !== 'friends' || !meId) return filtered;
    const privateEdges = Object.entries(choices || {}).filter(([id,value])=>id!==meId && (value.circle || value.roles?.length) && !filtered.some(edge=>[edge.member1Id,edge.member2Id].includes(meId)&&[edge.member1Id,edge.member2Id].includes(id))).map(([id,value])=>({id:`private-${id}`,member1Id:meId,member2Id:id,type:'friend',customLabel:`Private · ${value.roles?.join(', ') || value.circle}`}));
    return [...filtered,...privateEdges];
  }, [relationships, mode, choices, meId]);
  const visibleMembers = useMemo(() => mode !== 'friends' ? members : members.filter(person => person.id === (focusId || meId) || visibleRelationships.some(edge => edge.member1Id === person.id || edge.member2Id === person.id)), [members, visibleRelationships, mode, focusId, meId]);
  const graph=useMemo(()=>mode==='friends'?layoutFriendCircles(visibleMembers,visibleRelationships,meId||focusId,choices):mode==='combined'?layoutMixedRelationships(visibleMembers,visibleRelationships,focusId,meId):layoutFamilyTree(visibleMembers,visibleRelationships,120,focusId,meId),[visibleMembers,visibleRelationships,focusId,meId,mode,choices]);
  const [dragged,setDragged]=useState({}),[snap,setSnap]=useState(true),[hovered,setHovered]=useState(null),[arrangement,setArrangement]=useState(0);
  const dragKey=`${mode}:${horizontal}:${spacing}`;
  const focusEdges=useMemo(()=>mode==='combined'&&focusMode?visibleRelationships.filter(edge=>!['friend','mentor'].includes(edge.type)):visibleRelationships,[mode,focusMode,visibleRelationships]);
  const highlighted=useMemo(()=>focusMode||pathTarget?graphFocus(focusEdges,meId,pathTarget,focusRadius):null,[focusEdges,meId,focusMode,pathTarget,focusRadius]);
  const point=id=>{const p=graph.positions.get(id),factor=spacing==='airy'?1.35:spacing==='compact'?1:1.15;const scaled={x:p.x*factor,y:p.y*(spacing==='airy'?1.2:1)};return dragged[dragKey]?.[id]||(horizontal&&mode!=='friends'?{x:scaled.y*1.7,y:scaled.x}:scaled);};
  const centerPerson=person=>{const p=point(person.id);if(p)flow.setCenter(p.x+104,p.y+48,{zoom:1,duration:0});onFocusPerson?.(person);};
  const selectPerson=person=>{setPathTarget(person.id===meId?null:person.id);setFocusMode(person.id===meId);setFocusRadius(1);onSelect(person);};
  const nodes=graph.visible.map(person=>({id:person.id,type:'person',position:point(person.id),width:208,height:100,data:{person,account,appearance:appearance.get(person.id),label:relationToMe(person,meId,members,relationships),me:person.id===meId,onSelect:selectPerson,onRelative,onCenter:centerPerson,horizontal:horizontal&&mode!=='friends'},style:{opacity:(search&&!person.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))||(highlighted&&!highlighted.nodes.has(person.id))?.2:1},draggable:false,connectable:false,focusable:false}));
  const sharedChildren=new Map(),unionIds=new Set();
  if(mode!=='friends')for(const partner of graph.edges.filter(edge=>edge.type==='spouse')){
    const childEdges=graph.edges.filter(edge=>['parent','child','step_parent','step_child'].includes(edge.type)).map(edge=>({edge,parent:['child','step_child'].includes(edge.type)?edge.member2Id:edge.member1Id,child:['child','step_child'].includes(edge.type)?edge.member1Id:edge.member2Id}));
    for(const relation of childEdges.filter(row=>row.parent===partner.member1Id)){
      const other=childEdges.find(row=>row.parent===partner.member2Id&&row.child===relation.child);
      if(!other||sharedChildren.has(relation.child))continue;
      const unionId=`union-${partner.id}`;
      if(!unionIds.has(unionId)){
        const a=point(partner.member1Id),b=point(partner.member2Id);
        nodes.push({id:unionId,type:'union',position:{x:(a.x+b.x)/2+104,y:(a.y+b.y)/2+50},width:1,height:1,data:{horizontal},selectable:false,focusable:false,draggable:false,style:{pointerEvents:'none'}});unionIds.add(unionId);
      }
      sharedChildren.set(relation.child,{unionId,first:relation.edge.id,second:other.edge.id});
    }
  }
  if(mode==='combined')for(const zone of graph.zones||[]){
    const zonePeople=graph.visible.filter(person=>zone.name==='Family'?!graph.friendIds.has(person.id):graph.friendIds.has(person.id));
    const points=zonePeople.map(person=>point(person.id));
    if(points.length){const x=Math.min(...points.map(p=>p.x))-35,y=Math.min(...points.map(p=>p.y))-55;
      nodes.unshift({id:zone.id,type:'zone',position:{x,y},data:{label:zone.name},width:Math.max(...points.map(p=>p.x))+245-x,height:Math.max(...points.map(p=>p.y))+140-y,style:{width:Math.max(...points.map(p=>p.x))+245-x,height:Math.max(...points.map(p=>p.y))+140-y,pointerEvents:'none',zIndex:-1},selectable:false,draggable:false,focusable:false});
    }
  }
  const edges=graph.edges.filter(edge=>![...sharedChildren.values()].some(joint=>joint.second===edge.id)).map(edge=>{
    const partner=edge.type==='spouse',social=['friend','mentor'].includes(edge.type),lineage=['parent','child','step_parent','step_child'].includes(edge.type);
    const color=partner?'var(--family-marriage)':social?'var(--gt-muted)':'var(--family-lineage)';
    const dim=highlighted&&(highlighted.edges?!highlighted.edges.has(edge.id):!highlighted.nodes.has(edge.member1Id)||!highlighted.nodes.has(edge.member2Id));
    const target=['child','step_child'].includes(edge.type)?edge.member1Id:edge.member2Id;
    const candidate=sharedChildren.get(target);
    const joint=candidate?.first===edge.id?candidate:null;
    const jointHighlighted=joint&&(highlighted?.edges?.has(joint.first)||highlighted?.edges?.has(joint.second));
    return {id:edge.id,source:joint?.first===edge.id?joint.unionId:['child','step_child'].includes(edge.type)?edge.member2Id:edge.member1Id,target,...(partner?{sourceHandle:'partner-out',targetHandle:'partner-in'}:{}),type:'default',label:partner?'♥':showLabels?(edge.customLabel||edge.type.replaceAll('_',' ')):undefined,labelStyle:{fill:color,fontSize:11},labelBgStyle:{fill:'var(--gt-surface)',stroke:'var(--gt-border)'},labelBgPadding:[7,4],labelBgBorderRadius:9,markerEnd:lineage?{type:MarkerType.ArrowClosed,color,width:14,height:14}:undefined,focusable:true,style:{stroke:color,strokeWidth:highlighted?.edges?.has(edge.id)||jointHighlighted?2.5:1.5,strokeDasharray:social?'5 6':undefined,opacity:dim&&!jointHighlighted?.12:social?.5:.85},ariaLabel:`${members.find(person=>person.id===edge.member1Id)?.name||'Person'} is ${edge.customLabel||edge.type.replaceAll('_',' ')} of ${members.find(person=>person.id===edge.member2Id)?.name||'person'}`};
  });
  if(mode==='combined')for(const edge of edges){const relation=graph.edges.find(row=>row.id===edge.id);if(['friend','mentor'].includes(relation?.type)){edge.sourceHandle='partner-out';edge.targetHandle='partner-in';}}
  useEffect(()=>{if(initialized&&!list)flow.fitView({padding:.12,maxZoom:1.25,duration:0});},[initialized,list,graph,flow,horizontal,mode,arrangement,spacing]);
  const centerMe=()=>{setPathTarget(null);setFocusMode(true);setFocusRadius(2);const me=members.find(person=>person.id===meId);if(me)centerPerson(me);};
  return <>
    <div className="family-graph-toolbar" role="toolbar" aria-label="Relationship graph controls">
      <select aria-label="Relationship layers" value={mode} onChange={e=>{setMode(e.target.value);setPathTarget(null);}}><option value="family">Family generations · குடும்பம்</option><option value="friends">Friends & mentors · நண்பர்கள்</option><option value="combined">All relationships</option></select>
      <select aria-label="Graph layout" disabled={mode==='friends'} value={horizontal?'horizontal':'vertical'} onChange={e=>setHorizontal(e.target.value==='horizontal')}><option value="vertical">Top down</option><option value="horizontal">Left to right</option></select>
      <select aria-label="Node spacing" value={spacing} onChange={event=>setSpacing(event.target.value)}><option value="compact">Compact spacing</option><option value="comfortable">Comfortable spacing</option><option value="airy">Airy spacing</option></select>
      {onAddPerson&&<button type="button" className="native-button" onClick={onAddPerson}>+ Add person</button>}{onAddRelationship&&<button type="button" className="native-button native-button--quiet" onClick={onAddRelationship}>Connect people</button>}
      <input type="search" aria-label="Highlight people by name" placeholder="Find in this view…" value={search} onChange={e=>setSearch(e.target.value)}/>
      <button type="button" className="native-button native-button--quiet" onClick={centerMe} disabled={!meId}>◎ Me</button>
      <button type="button" className="native-button native-button--quiet" onClick={()=>{setFocusMode(false);setPathTarget(null);setSearch('');flow.fitView({padding:.25,duration:0});}}>Fit all</button>
      <button type="button" className="native-button native-button--quiet" onClick={()=>{setDragged({});setArrangement(value=>value+1);}}>Auto-arrange</button>
      {previewEnabled?<select aria-label="Graph renderer" value={renderer} onChange={event=>setRenderer(event.target.value)}><option value="standard">Standard canvas</option><option value="webgl">WebGL preview</option></select>:<button type="button" className="native-link" onClick={()=>setPreviewEnabled(true)}>Enable WebGL preview</button>}
    </div>
    <div className="family-graph-options"><span>↘ Lineage</span><span className="family-legend-marriage">♥ Partners</span><span>┄ Friends / mentors</span><label><input type="checkbox" checked={snap} onChange={event=>setSnap(event.target.checked)}/> Snap to grid</label><label><input type="checkbox" checked={showLabels} onChange={event=>setShowLabels(event.target.checked)}/> Edge labels</label>{(focusMode||pathTarget)&&<button type="button" className="native-link" onClick={()=>{setFocusMode(false);setPathTarget(null);}}>Clear focus</button>}</div>
    <div className="family-generation-legend" aria-label="Person card legend"><span data-tone="parent">↑ Parents</span><span data-tone="ancestor">↑ Earlier ancestors</span><span data-tone="descendant">↓ Descendants</span><span data-tone="extended">○ Other family / unlinked</span><span data-tone="social">◇ Social</span><small>Generation cues follow recorded parental links from Me.</small></div>
    {mode==='friends'&&<p role="status">Private circles: inner → close → friend → acquaintance → unassigned. Set circles in Circles & sharing. {privateChoices.isError?'Private circles could not be loaded; showing unassigned people.':''}</p>}
    {pathTarget&&!highlighted?.connected&&<p className="family-graph-notice" role="status">No path to Me is recorded in this loaded branch. Explore another branch or enable all relationships.</p>}
    {list?<div className="family-graph-list" aria-label="Accessible relationship list"><ul>{graph.visible.map(person=><li key={person.id}><button type="button" className="native-link" onClick={()=>selectPerson(person)}>{person.name}{person.id===meId?' · Me':''}</button><span>{relationToMe(person,meId,members,relationships)||'Relationship not recorded'}</span><ul>{graph.edges.filter(edge=>edge.member1Id===person.id).map(edge=><li key={edge.id}>{edge.customLabel||edge.type.replaceAll('_',' ')} → {graph.visible.find(p=>p.id===edge.member2Id)?.name}</li>)}</ul></li>)}</ul></div>:renderer==='webgl'?<WebGLBoundary onFallback={()=>setRenderer('standard')}><Suspense fallback={<p role="status">Loading WebGL preview…</p>}><FamilyTreeWebGL graph={graph} meId={meId} onSelect={selectPerson} highlighted={highlighted}/></Suspense></WebGLBoundary>:<div className="family-flow-stage family-flow-stage--premium" role="region" aria-label="Family tree diagram">
      <ReactFlow nodes={nodes.map(node=>node.type==='person'?{...node,draggable:true,className:graph.friendIds?.has(node.id)?'family-social-node':undefined}:node)} edges={edges.map(edge=>hovered&&edge.source!==hovered&&edge.target!==hovered?{...edge,style:{...edge.style,opacity:.12}}:edge)} nodeTypes={nodeTypes} onNodeMouseEnter={(_,node)=>setHovered(node.id)} onNodeMouseLeave={()=>setHovered(null)} onNodesChange={changes=>{const positions=changes.filter(change=>change.type==='position'&&change.position&&graph.positions.has(change.id));if(positions.length)setDragged(previous=>({...previous,[dragKey]:{...previous[dragKey],...Object.fromEntries(positions.map(change=>[change.id,change.position]))}}));}} snapToGrid={snap} snapGrid={[20,20]} nodeDragThreshold={6} nodesDraggable nodesConnectable={false} nodesFocusable={false} edgesFocusable={false} deleteKeyCode={null} fitView fitViewOptions={{padding:.12,maxZoom:1.25}} minZoom={.15} maxZoom={2} zoomOnPinch panOnDrag preventScrolling={false} proOptions={{hideAttribution:true}}>
        <Background gap={20} color="var(--gt-border)"/>
        <Controls position="bottom-right" showInteractive={false} className="family-graph-zoom"/>
        <MiniMap position="bottom-right" pannable zoomable className="family-flow-minimap" nodeColor={node=>node.type==='union'?'transparent':node.data.me?'#0d9488':'#64748b'} nodeStrokeColor={node=>node.type==='union'?'transparent':'#475569'} maskColor="#94a3b826" bgColor="#f3f1eb" nodeBorderRadius={4}/>
      </ReactFlow>
    </div>}
    <div className="family-graph-footer"><span>{graph.visible.length} of {total} people loaded · Select a card to trace its path and open the profile.</span><div role="group" aria-label="Graph presentation"><button type="button" aria-pressed={!list} onClick={()=>setList(false)}>Visual tree</button><button type="button" aria-pressed={list} onClick={()=>setList(true)}>Accessible list</button></div></div>
    <details className="family-graph-expand"><summary>Explore another branch</summary><MemberPicker name="canvas-person" label="Search the full tree and load their connections" account={account} treeId={treeId} initial={members} emptyLabel="Search every person…" onPick={person=>{if(person){setPathTarget(null);onFocusPerson?.(person);}}}/></details>
  </>;
}
class GraphBoundary extends React.Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="native-form"><PageState state="error" title="The graph could not be displayed" description="Your records are still available in this people list. You can also switch to People." onRetry={()=>this.setState({failed:false})}/><ul>{this.props.members.slice(0,120).map(person=><li key={person.id}><button type="button" className="native-link" onClick={()=>this.props.onSelect(person)}>{person.name}</button></li>)}</ul></div>:this.props.children;}
}
export default function FamilyTree(props){return <GraphBoundary key={props.treeId} members={props.members} onSelect={props.onSelect}><ReactFlowProvider><Canvas {...props}/></ReactFlowProvider></GraphBoundary>;}

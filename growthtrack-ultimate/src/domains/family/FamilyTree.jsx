import React, { useEffect, useMemo } from 'react';
import { yearLabel } from './familyDates';
import { Background, Controls, Handle, MiniMap, Panel, Position, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { layoutFamilyTree } from './treeLayout';
import { relationToMe } from './kinship';
import MemberPicker from './MemberPicker';
import PageState from '../../components/ui/PageState';

function PersonNode({ data }) {
  const { person, label, me, onSelect } = data;
  return <><Handle type="target" position={Position.Top}/><button type="button" className="family-flow-person nodrag" data-family-person data-me={me} aria-label={`Open ${person.name}${me?', Me':''}`} title={`${person.name}${label?` · ${label}`:''}`} onClick={()=>onSelect(person)}><strong>{person.name}</strong><small>{person.birthDate?yearLabel(person.birthDate,person.birthDateApproximate):'Birth date not recorded'}{person.deathDate?` – ${yearLabel(person.deathDate,person.deathDateApproximate)}`:person.deathRecorded?' – ?':''}</small><span>{label||'Family member'}</span></button><Handle type="source" position={Position.Bottom}/></>;
}
const nodeTypes = { person: PersonNode };

function Canvas({ members, relationships, total, onSelect, meId, focusId=meId, account, treeId, onFocusPerson }) {
  const flow = useReactFlow();
  const graph=useMemo(()=>layoutFamilyTree(members,relationships,120,focusId,meId),[members,relationships,focusId,meId]);
  const nodes=useMemo(()=>graph.visible.map(person=>({id:person.id,type:'person',position:graph.positions.get(person.id),data:{person,label:relationToMe(person,meId,members,relationships),me:person.id===meId,onSelect},draggable:false,connectable:false,focusable:false})),[graph,members,relationships,meId,onSelect]);
  const edges=useMemo(()=>graph.edges.map(edge=>({id:edge.id,source:['child','step_child'].includes(edge.type)?edge.member2Id:edge.member1Id,target:['child','step_child'].includes(edge.type)?edge.member1Id:edge.member2Id,type:'smoothstep',focusable:false,style:{stroke:'var(--gt-muted)',strokeWidth:1.5,strokeDasharray:['parent','child','step_parent','step_child'].includes(edge.type)?undefined:'5 4'},ariaLabel:edge.customLabel||edge.type.replaceAll('_',' ')})),[graph]);
  useEffect(()=>{const point=graph.positions.get(focusId);if(point)flow.setCenter(point.x+80,point.y+38,{zoom:Math.max(.75,flow.getZoom()),duration:0});},[focusId,graph,flow]);
  const centerMe=()=>{const point=graph.positions.get(meId);if(point)flow.setCenter(point.x+80,point.y+38,{zoom:1,duration:0});};
  return <>
    <div className="family-flow-stage" role="region" aria-label="Family tree diagram">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} nodesDraggable={false} nodesConnectable={false} nodesFocusable={false} edgesFocusable={false} deleteKeyCode={null} fitView fitViewOptions={{padding:.2}} minZoom={.15} maxZoom={2} zoomOnPinch panOnDrag preventScrolling={false} attributionPosition="bottom-left">
        <Background gap={20} color="var(--gt-border)"/>
        <Controls position="bottom-right" showInteractive={false}/>
        <MiniMap position="top-right" pannable zoomable className="family-flow-minimap" nodeColor="var(--gt-surface-raised)" nodeStrokeColor="var(--gt-border)" maskColor="color-mix(in srgb, var(--gt-canvas) 75%, transparent)"/>
        <Panel position="top-left" className="family-flow-search"><MemberPicker name="canvas-person" label="Find a person" account={account} treeId={treeId} initial={members} emptyLabel="Search this tree…" onPick={person=>{if(person)onFocusPerson?.(person);}}/></Panel>
        <Panel position="bottom-left" className="family-flow-actions"><button type="button" className="native-button native-button--quiet" onClick={()=>flow.fitView({padding:.2,duration:0})}>Fit to Screen</button><button type="button" className="native-button native-button--quiet" onClick={centerMe} disabled={!meId}>Center on Me</button></Panel>
      </ReactFlow>
    </div>
    <div className="family-flow-caption"><span>{graph.visible.length} of {total} people loaded · solid: generations · dashed: other connections</span><details><summary>Accessible people list</summary><ul>{graph.visible.map(person=><li key={person.id}><button type="button" className="native-link" onClick={()=>onSelect(person)}>{person.name}{person.id===meId?' · Me':''}</button></li>)}</ul></details></div>
  </>;
}
class GraphBoundary extends React.Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="native-form"><PageState state="error" title="The graph could not be displayed" description="Your records are still available in this people list. You can also switch to People." onRetry={()=>this.setState({failed:false})}/><ul>{this.props.members.slice(0,120).map(person=><li key={person.id}><button type="button" className="native-link" onClick={()=>this.props.onSelect(person)}>{person.name}</button></li>)}</ul></div>:this.props.children;}
}
export default function FamilyTree(props){return <GraphBoundary key={props.treeId} members={props.members} onSelect={props.onSelect}><ReactFlowProvider><Canvas {...props}/></ReactFlowProvider></GraphBoundary>;}

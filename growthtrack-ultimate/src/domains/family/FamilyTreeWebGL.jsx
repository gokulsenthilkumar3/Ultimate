import React, { useMemo, useState } from 'react';
import { GraphCanvas } from 'reagraph';
import { graphAppearance } from './graphAppearance';

export function toWebGLGraph(members,relationships,meId,friendIds=new Set()) {
  const ids=new Set(members.map(person=>person.id));
  return {nodes:members.map(person=>({id:person.id,label:person.name,fill:person.id===meId?'#0d9488':friendIds.has(person.id)?'#94a3b8':'#b99367',size:person.id===meId?9:6,data:{zone:friendIds.has(person.id)?'Friends & mentors':'Family'}})),edges:relationships.filter(edge=>ids.has(edge.member1Id)&&ids.has(edge.member2Id)).map(edge=>({id:edge.id,source:['child','step_child'].includes(edge.type)?edge.member2Id:edge.member1Id,target:['child','step_child'].includes(edge.type)?edge.member1Id:edge.member2Id,label:edge.customLabel||edge.type.replaceAll('_',' '),fill:['friend','mentor'].includes(edge.type)?'#a1a1aa':edge.type==='spouse'?'#b8657e':'#64748b',dashed:['friend','mentor'].includes(edge.type),size:['friend','mentor'].includes(edge.type)?.4:1,data:{type:edge.type}}))};
}
export default function FamilyTreeWebGL({graph,meId,onSelect,highlighted}) {
  const [layout,setLayout]=useState('custom'),[arrange,setArrange]=useState(0);
  const data=useMemo(()=>{
    const data=toWebGLGraph(graph.visible,graph.edges,meId,graph.friendIds),appearance=graphAppearance(graph.visible,graph.edges,meId);
    const colors={me:'#0d9488',parent:'#6366b5',ancestor:'#9a75b0',descendant:'#398b73',extended:'#b39258',social:'#7b8b9d',neutral:'#94a3b8'};
    for(const node of data.nodes)node.fill=colors[appearance.get(node.id)?.tone]||'#94a3b8';
    return data;
  },[graph,meId]);
  const edges=layout==='treeTd2d'?data.edges.filter(edge=>['parent','child','step_parent','step_child'].includes(edge.data.type)):data.edges;
  return <><div className="family-graph-options"><label>WebGL layout <select aria-label="WebGL layout" value={layout} onChange={event=>setLayout(event.target.value)}><option value="custom">Family + friends zones</option><option value="treeTd2d">Ancestry only</option><option value="forceDirected2d">Network 2D</option><option value="forceDirected3d">Network 3D</option><option value="radialOut2d">Radial network</option></select></label><button type="button" className="native-link" onClick={()=>setArrange(v=>v+1)}>Reset WebGL arrangement</button><span>Preview · drag nodes to arrange · use the list for keyboard access</span></div>
    <div className="family-webgl-stage"><GraphCanvas labelFontUrl={`${import.meta.env.BASE_URL}assets/graph-font/NotoSans.ttf`} key={`${layout}:${arrange}`} nodes={data.nodes} edges={edges} layoutType={layout} layoutOverrides={layout==='custom'?{getNodePosition:(id,{drags})=>drags?.[id]?.position||{x:(graph.positions.get(id)?.x||0)/5,y:-(graph.positions.get(id)?.y||0)/5,z:0}}:undefined} clusterAttribute={layout.startsWith('forceDirected')?'zone':undefined} draggable animated={false} actives={highlighted?[...highlighted.nodes,...(highlighted.edges||[])]:undefined} selections={meId?[meId]:[]} onNodeClick={node=>{const person=graph.visible.find(p=>p.id===node.id);if(person)onSelect(person);}}/></div>
  </>;
}

export function graphFocus(edges, start, target, radius=2) {
  const neighbors=new Map();
  for(const edge of edges)for(const [a,b] of [[edge.member1Id,edge.member2Id],[edge.member2Id,edge.member1Id]]){if(!neighbors.has(a))neighbors.set(a,[]);neighbors.get(a).push({id:b,edge:edge.id});}
  const distances=new Map(start?[[start,0]]:[]),previous=new Map(),queue=start?[start]:[];
  for(let i=0;i<queue.length;i++)for(const next of neighbors.get(queue[i])||[]){if(distances.has(next.id))continue;distances.set(next.id,distances.get(queue[i])+1);previous.set(next.id,{id:queue[i],edge:next.edge});queue.push(next.id);}
  if(target&&distances.has(target)){const nodes=new Set([target]),edges=new Set();for(let id=target;previous.has(id);){const p=previous.get(id);edges.add(p.edge);nodes.add(p.id);id=p.id;}return {nodes,edges,connected:true};}
  return {nodes:new Set([...distances].filter(([,d])=>d<=radius).map(([id])=>id)),edges:null,connected:!target};
}

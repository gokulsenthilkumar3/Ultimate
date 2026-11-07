/** Derive generation cues only from recorded directed parental links. */
export function graphAppearance(members,relationships,meId) {
  const parents=new Map(),children=new Map(),familyIds=new Set(),socialIds=new Set();
  for(const edge of relationships){
    if(['friend','mentor'].includes(edge.type)){socialIds.add(edge.member1Id);socialIds.add(edge.member2Id);continue;}
    familyIds.add(edge.member1Id);familyIds.add(edge.member2Id);
    if(!['parent','child','step_parent','step_child'].includes(edge.type))continue;
    const [parent,child]=['child','step_child'].includes(edge.type)?[edge.member2Id,edge.member1Id]:[edge.member1Id,edge.member2Id];
    parents.set(child,[...(parents.get(child)||[]),parent]);children.set(parent,[...(children.get(parent)||[]),child]);
  }
  const walk=map=>{const result=new Map(meId?[[meId,0]]:[]),queue=meId?[meId]:[];for(let i=0;i<queue.length;i++)for(const id of map.get(queue[i])||[]){if(result.has(id))continue;result.set(id,result.get(queue[i])+1);queue.push(id);}return result;};
  const ancestors=walk(parents),descendants=walk(children);
  return new Map(members.map(person=>{
    if(person.id===meId)return [person.id,{kind:'me',tone:'me',cue:'Me'}];
    const up=ancestors.get(person.id),down=descendants.get(person.id);
    if(up&&down)return [person.id,{kind:'unresolved',tone:'neutral',cue:'Check lineage'}];
    if(up)return [person.id,{kind:'ancestor',tone:up===1?'parent':'ancestor',cue:`↑ ${up} generation${up===1?'':'s'}`}];
    if(down)return [person.id,{kind:'descendant',tone:'descendant',cue:`↓ ${down} generation${down===1?'':'s'}`}];
    if(socialIds.has(person.id)&&!familyIds.has(person.id))return [person.id,{kind:'social',tone:'social',cue:'Social connection'}];
    return [person.id,{kind:'extended',tone:'extended',cue:meId?'Other recorded branch':'Choose Me for generation cues'}];
  }));
}

export function layoutMixedRelationships(members,relationships,focusId,meId) {
  const socialTypes=new Set(['friend','mentor']);
  const familyEdges=relationships.filter(edge=>!socialTypes.has(edge.type));
  const familyIds=new Set([meId||focusId,...familyEdges.flatMap(edge=>[edge.member1Id,edge.member2Id])]);
  const socialIds=new Set(relationships.filter(edge=>socialTypes.has(edge.type)).flatMap(edge=>[edge.member1Id,edge.member2Id]));
  const friends=members.filter(person=>socialIds.has(person.id)&&!familyIds.has(person.id));
  const family=layoutFamilyTree(members.filter(person=>!friends.includes(person)),familyEdges,120,focusId,meId);
  const positions=new Map(family.positions),anchor=positions.get(meId)||positions.get(focusId)||{x:0,y:0};
  const right=Math.max(0,...[...positions.values()].map(p=>p.x))+550;
  friends.forEach((person,index)=>{
    const ring=Math.floor(index/7),slot=index%7,count=Math.min(7,friends.length-ring*7);
    const angle=count===1?0:-Math.PI/2+slot*Math.PI/(count-1),radius=220+ring*260;
    positions.set(person.id,{x:right+Math.cos(angle)*radius,y:anchor.y+Math.sin(angle)*radius});
  });
  const visible=[...family.visible,...friends].slice(0,120),ids=new Set(visible.map(p=>p.id));
  const zone=(name,people)=>{if(!people.length)return null;const points=people.map(p=>positions.get(p.id));const x=Math.min(...points.map(p=>p.x))-35,y=Math.min(...points.map(p=>p.y))-55;return {id:`zone-${name}`,name,x,y,width:Math.max(...points.map(p=>p.x))+245-x,height:Math.max(...points.map(p=>p.y))+140-y};};
  return {visible,positions,edges:relationships.filter(e=>ids.has(e.member1Id)&&ids.has(e.member2Id)),friendIds:new Set(friends.map(p=>p.id)),zones:[zone('Family',family.visible),zone('Friends & mentors',friends)].filter(Boolean)};
}

export function layoutFriendCircles(members, relationships, focusId, preferences = {}) {
  const centre = members.find(person => person.id === focusId) || members[0];
  const visible = centre ? [centre, ...members.filter(person => person.id !== centre.id)].slice(0,120) : [];
  const positions = new Map(), rings = new Map();
  if (centre) positions.set(centre.id,{x:0,y:0});
  for (const person of visible.slice(1)) {
    const ring = ({inner:1,close:2,friend:3,acquaintance:4})[preferences[person.id]?.circle] || 5;
    rings.set(ring,[...(rings.get(ring)||[]),person]);
  }
  // Unknown closeness stays outside recorded circles; never infer intimacy.
  for (const [ring,people] of rings) people.forEach((person,index)=>{
    const angle = index * Math.PI * 2 / people.length - Math.PI/2;
    const radius = Math.max(ring*230,people.length*185/(2*Math.PI));
    positions.set(person.id,{x:Math.cos(angle)*radius,y:Math.sin(angle)*radius});
  });
  const ids = new Set(visible.map(person=>person.id));
  return {visible,positions,edges:relationships.filter(edge=>ids.has(edge.member1Id)&&ids.has(edge.member2Id))};
}

export function layoutFamilyTree(members, relationships, limit = 60, focusId, pinId) {
  const available = new Map(members.map(person => [person.id, person])), neighbors = new Map();
  for (const edge of relationships) {
    neighbors.set(edge.member1Id, [...(neighbors.get(edge.member1Id) || []), edge.member2Id]);
    neighbors.set(edge.member2Id, [...(neighbors.get(edge.member2Id) || []), edge.member1Id]);
  }
  const ordered = [], seen = new Set(), focusQueue = [...new Set([focusId, pinId].filter(id => available.has(id)))];
  for (let i = 0; i < focusQueue.length && ordered.length < limit; i++) {
    const id = focusQueue[i]; if (seen.has(id)) continue; seen.add(id);
    if (available.has(id)) ordered.push(available.get(id));
    focusQueue.push(...(neighbors.get(id) || []).filter(next => !seen.has(next)));
  }
  const visible = [...ordered, ...members.filter(person => !seen.has(person.id))].slice(0, limit), ids = new Set(visible.map(member => member.id));
  const edges = relationships.filter(edge => ids.has(edge.member1Id) && ids.has(edge.member2Id));
  const parents = edges.filter(edge => ['parent', 'child', 'step_parent', 'step_child'].includes(edge.type)).map(edge => ['child', 'step_child'].includes(edge.type) ? [edge.member2Id, edge.member1Id] : [edge.member1Id, edge.member2Id]);
  const indegree = new Map(visible.map(member => [member.id, 0])), levels = new Map(visible.map(member => [member.id, 0]));
  parents.forEach(([, child]) => indegree.set(child, indegree.get(child) + 1));
  const queue = visible.filter(member => indegree.get(member.id) === 0).map(member => member.id);
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    parents.filter(([parent]) => parent === id).forEach(([, child]) => {
      levels.set(child, Math.min(8, Math.max(levels.get(child), levels.get(id) + 1)));
      indegree.set(child, indegree.get(child) - 1); if (indegree.get(child) === 0) queue.push(child);
    });
  }
  // Partners belong beside one another. Propagate generation constraints
  // through partners before positioning their descendants; social edges do
  // not participate in ancestry or generation assignment.
  for (let pass = 0; pass < visible.length; pass++) {
    let changed = false;
    for (const edge of edges.filter(edge => ['spouse','sibling'].includes(edge.type))) {
      const level = Math.max(levels.get(edge.member1Id), levels.get(edge.member2Id));
      for (const id of [edge.member1Id, edge.member2Id]) if (levels.get(id) !== level) { levels.set(id, level); changed = true; }
    }
    for (const [parent, child] of parents) {
      const level = Math.min(8, levels.get(parent) + 1);
      if (levels.get(child) < level) { levels.set(child, level); changed = true; }
    }
    if (!changed) break;
  }
  const groups = new Map(), positions = new Map();
  for(const member of visible){const level=levels.get(member.id);groups.set(level,[...(groups.get(level)||[]),member]);}
  let maximum=0;
  for(const [level,people] of [...groups].sort(([a],[b])=>a-b)){
    const ordered=[],placed=new Set();
    // Adjacent partners make union lines short instead of crossing a generation.
    for(const person of people){
      if(placed.has(person.id))continue;
      ordered.push(person);placed.add(person.id);
      for(const edge of edges.filter(edge=>edge.type==='spouse'&&[edge.member1Id,edge.member2Id].includes(person.id))){
        const partnerId=edge.member1Id===person.id?edge.member2Id:edge.member1Id;
        const partner=people.find(p=>p.id===partnerId);
        if(partner&&!placed.has(partner.id)){ordered.push(partner);placed.add(partner.id);}
      }
    }
    maximum=Math.max(maximum,ordered.length);
    ordered.forEach((person,index)=>positions.set(person.id,{x:(index-(ordered.length-1)/2)*260,y:level*230}));
  }
  return { visible, edges, positions, width: Math.max(360,maximum*260), height: Math.max(230,groups.size*230) };
}

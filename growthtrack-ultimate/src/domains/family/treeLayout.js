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
  const counts = new Map(), positions = new Map();
  visible.forEach(member => { const level = levels.get(member.id), index = counts.get(level) || 0; counts.set(level, index + 1); positions.set(member.id, { x: 24 + (index % 6) * 185, y: 24 + level * 190 + Math.floor(index / 6) * 86 }); });
  // Keep crowded generations apart, including disconnected/cyclic records.
  let offset = 24;
  [...counts.keys()].sort((a, b) => a - b).forEach(level => { visible.filter(member => levels.get(member.id) === level).forEach((member, index) => positions.set(member.id, { x: 24 + index % 6 * 185, y: offset + Math.floor(index / 6) * 86 })); offset += Math.ceil(counts.get(level) / 6) * 86 + 44; });
  return { visible, edges, positions, width: Math.max(360, Math.min(6, Math.max(...counts.values(), 1)) * 185 + 24), height: Math.max(160, offset) };
}

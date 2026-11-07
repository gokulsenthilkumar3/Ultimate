import { describe,it,expect } from 'vitest';
import { graphFocus } from './graphFocus';
import { layoutFamilyTree,layoutMixedRelationships } from './treeLayout';
const edges=[{id:'a',member1Id:'parent',member2Id:'me',type:'parent'},{id:'b',member1Id:'grandparent',member2Id:'parent',type:'parent'},{id:'c',member1Id:'great',member2Id:'grandparent',type:'parent'}];
describe('relationship canvas focus',()=>{
 it('separates twenty friends from family generations without duplicating Me',()=>{
  const friends=Array.from({length:20},(_,i)=>({id:`friend-${i}`}));
  const members=[{id:'me'},{id:'parent'},...friends];
  const graph=layoutMixedRelationships(members,[{id:'parent-link',type:'parent',member1Id:'parent',member2Id:'me'},...friends.map(p=>({id:p.id,type:'friend',member1Id:'me',member2Id:p.id}))],'me','me');
  expect(graph.visible.filter(p=>p.id==='me')).toHaveLength(1);
  expect(graph.friendIds.size).toBe(20);expect(graph.zones).toHaveLength(2);
  expect(graph.positions.get('parent').y).toBeLessThan(graph.positions.get('me').y);
  expect(friends.every(p=>graph.positions.get(p.id).x>graph.positions.get('me').x+400)).toBe(true);
 });
 it('limits Me focus to two degrees and highlights a directional-independent path',()=>{
  expect([...graphFocus(edges,'me').nodes]).toEqual(['me','parent','grandparent']);
  const result=graphFocus(edges,'me','great');
  expect([...result.edges]).toEqual(['c','b','a']);expect(result.connected).toBe(true);
  expect(graphFocus(edges,'me','disconnected').connected).toBe(false);
 });
 it('keeps every generation on one row with non-overlapping cards',()=>{
  const members=Array.from({length:12},(_,i)=>({id:String(i)}));
  const graph=layoutFamilyTree(members,[]);
  const points=[...graph.positions.values()].sort((a,b)=>a.x-b.x);
  expect(new Set(points.map(p=>p.y)).size).toBe(1);
  expect(points.slice(1).every((p,i)=>p.x-points[i].x>=260)).toBe(true);
 });
 it('aligns a sibling without a separately recorded parent link',()=>{
  const graph=layoutFamilyTree([{id:'parent'},{id:'me'},{id:'sibling'}],[{id:'p',member1Id:'parent',member2Id:'me',type:'parent'},{id:'s',member1Id:'me',member2Id:'sibling',type:'sibling'}]);
  expect(graph.positions.get('me').y).toBe(graph.positions.get('sibling').y);
  expect(graph.positions.get('parent').y).toBeLessThan(graph.positions.get('me').y);
 });
});

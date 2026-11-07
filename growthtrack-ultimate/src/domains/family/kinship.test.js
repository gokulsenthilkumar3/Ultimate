import { describe, it, expect } from 'vitest';
import { KINSHIP, kinshipPayload, relationToMe } from './kinship';
import { layoutFamilyTree, layoutFriendCircles } from './treeLayout';
describe('Tamil kinship and Me',()=>{
 it('uses recorded age for Tamil sibling labels and preserves mentor direction',()=>{
  const me={id:'me',birthDate:'2000-01-01'}, older={id:'older',gender:'female',birthDate:'1990-01-01'};
  expect(relationToMe(older,'me',[me,older],[{member1Id:'me',member2Id:'older',type:'sibling'}])).toBe('Older sister · அக்கா');
  expect(relationToMe({id:'student'},'me',[],[{member1Id:'me',member2Id:'student',type:'mentor'}])).toBe('Mentee');
  expect(relationToMe({id:'step'},'me',[],[{member1Id:'step',member2Id:'me',type:'step_parent'}])).toBe('Step-parent');
 });
 it('positions assigned circles closer than unassigned friends',()=>{
  const graph=layoutFriendCircles([{id:'me'},{id:'close'},{id:'unknown'}],[],'me',{close:{circle:'inner'}});
  const radius=id=>Math.hypot(graph.positions.get(id).x,graph.positions.get(id).y);
  expect(radius('me')).toBe(0);expect(radius('close')).toBeLessThan(radius('unknown'));
 });
 it('keeps explicit structural types under Tamil labels',()=>{
  expect(KINSHIP.filter(item=>item.tamil)).toHaveLength(31);
  expect(kinshipPayload('appa')).toMatchObject({type:'parent',presetId:'appa'});
  expect(kinshipPayload('mama')).toMatchObject({type:'aunt_uncle'});
  expect(kinshipPayload('chithi-maternal','My family term').customLabel).toBe('My family term');
 });
 it('derives grandparents through parent links without guessing maternal/paternal naming',()=>{
  const edges=[{member1Id:'parent',member2Id:'me',type:'parent'},{member1Id:'grandparent',member2Id:'parent',type:'parent'}];
  expect(relationToMe({id:'grandparent',gender:'female'},'me',[],edges)).toBe('Paati · பாட்டி');
  expect(relationToMe({id:'me'},'me',[],edges)).toBe('Me · நான்');
 });
 it('keeps Me and the connected branch visible even beyond the original cap',()=>{
  const members=Array.from({length:150},(_,i)=>({id:String(i),name:`Person ${i}`}));
  const graph=layoutFamilyTree(members,[{id:'link',member1Id:'149',member2Id:'148',type:'parent'}],60,'149');
  expect(graph.visible).toHaveLength(60);expect(graph.visible[0].id).toBe('149');expect(graph.positions.has('148')).toBe(true);
  const focused=layoutFamilyTree(members,[],60,'0','149');expect(focused.positions.has('149')).toBe(true);
 });
});

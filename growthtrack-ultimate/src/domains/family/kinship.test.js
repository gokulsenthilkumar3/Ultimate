import { describe, it, expect } from 'vitest';
import { KINSHIP, kinshipPayload, relationToMe } from './kinship';
import { layoutFamilyTree } from './treeLayout';
describe('Tamil kinship and Me',()=>{
 it('keeps explicit structural types under Tamil labels',()=>{
  expect(KINSHIP.filter(item=>item.tamil)).toHaveLength(26);
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

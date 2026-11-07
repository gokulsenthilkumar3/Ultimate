import {it,expect} from 'vitest';
import {graphAppearance} from './graphAppearance';
it('distinguishes recorded ancestors and descendants without treating friends as parents',()=>{
 const members=['me','parent','grandparent','child','cousin','friend'].map(id=>({id}));
 const rows=[['parent','me','parent'],['parent','grandparent','child'],['me','child','parent'],['me','cousin','cousin'],['me','friend','friend']].map(([member1Id,member2Id,type])=>({member1Id,member2Id,type}));
 const result=graphAppearance(members,rows,'me');
 expect(result.get('parent')).toMatchObject({kind:'ancestor',tone:'parent'});
 expect(result.get('grandparent')).toMatchObject({kind:'ancestor',tone:'ancestor'});
 expect(result.get('child').kind).toBe('descendant');
 expect(result.get('cousin').kind).toBe('extended');expect(result.get('friend').kind).toBe('social');
});
it('does not assign generation colors from arbitrary canvas positions or when Me is absent',()=>{
 const result=graphAppearance([{id:'a'},{id:'b'}],[{member1Id:'a',member2Id:'b',type:'parent'}],null);
 expect([...result.values()].every(value=>value.kind==='extended')).toBe(true);
});

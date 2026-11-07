const test=require('node:test'),assert=require('node:assert/strict');
const {createPersonIdentityHandlers}=require('../dist/controllers/personIdentity.controller');
const {createPersonHandler}=require('../dist/controllers/members.controller');
const {createRelationshipHandler}=require('../dist/controllers/relationships.controller');
const {validateRelationship}=require('../dist/services/relationshipRules');
const response=()=>({code:200,status(code){this.code=code;return this;},set(){return this;},json(body){this.body=body;}});
function fixture(role='editor'){
 let state={preferences:{theme:'keep',familySelf:{'other-tree':'other-person'}},members:[{id:'person-a',treeId:'tree-a',name:'Fictional A'},{id:'person-b',treeId:'tree-a',name:'Fictional B'}],relationships:[]};
 const tx={
  accessControl:{findUnique:async({where})=>where.treeId_userId.treeId==='tree-a'&&where.treeId_userId.userId==='owner'?{role}:null},
  user:{findUnique:async()=>({preferences:state.preferences}),update:async({data})=>{state.preferences=data.preferences;return data;}},
  member:{findFirst:async({where})=>state.members.find(person=>person.id===where.id&&person.treeId===where.treeId)||null,count:async({where})=>state.members.filter(person=>where.id.in.includes(person.id)&&person.treeId===where.treeId).length,create:async({data})=>{const member={id:'new-person',...data};state.members.push(member);return member;}},
  relationship:{findFirst:async()=>null,findMany:async()=>state.relationships,create:async({data})=>{const row={id:'new-link',...data};state.relationships.push(row);return row;}},
 };
 const db={...tx,$transaction:async callback=>{const snapshot=structuredClone(state);try{return await callback(tx);}catch(error){state=snapshot;throw error;}}};
 return{db,tx,get state(){return state;}};
}
const req=(body,userId='owner')=>({params:{id:'tree-a'},user:{id:userId},body});
test('Me is one scalar per account/tree, replaces selection, preserves other preferences and can be cleared by viewers',async()=>{
 const f=fixture('viewer'),handlers=createPersonIdentityHandlers(f.db);
 for(const id of ['person-a','person-b',null]){const res=response();await handlers.setMe(req({memberId:id}),res);assert.equal(res.code,200);assert.equal(f.state.preferences.familySelf['tree-a'],id);assert.equal(f.state.preferences.familySelf['other-tree'],'other-person');assert.equal(f.state.preferences.theme,'keep');}
 const bad=response();await handlers.setMe(req({memberId:'private-other-tree'}),bad);assert.equal(bad.code,400);
 const override=response();await handlers.setMe(req({memberId:'person-a',userId:'victim'}),override);assert.equal(override.code,400);
 const outsider=response();await handlers.setMe(req({memberId:'person-a'},'outsider'),outsider);assert.equal(outsider.code,403);
});
test('a new person, Tamil relationship and Me selection commit together with explicit direction',async()=>{
 const f=fixture(),res=response();await createPersonHandler(f.db)(req({treeId:'tree-a',name:'Fictional father',markAsMe:true,relative:{memberId:'person-a',presetId:'appa'}}),res);
 assert.equal(res.code,201);assert.equal(f.state.members.length,3);assert.equal(f.state.preferences.familySelf['tree-a'],'new-person');
 assert.equal(f.state.relationships[0].member1Id,'new-person');assert.equal(f.state.relationships[0].member2Id,'person-a');assert.equal(f.state.relationships[0].type,'parent');assert.match(f.state.relationships[0].customLabel,/அப்பா/);
});
test('failed cross-tree connection rolls back the new person and Me; viewers cannot add people',async()=>{
 const f=fixture(),res=response();await createPersonHandler(f.db)(req({treeId:'tree-a',name:'Fictional person',markAsMe:true,relative:{memberId:'private-person',presetId:'amma'}}),res);
 assert.equal(res.code,400);assert.equal(f.state.members.length,2);assert.equal(f.state.relationships.length,0);assert.equal(f.state.preferences.familySelf['tree-a'],undefined);
 const denied=response();await createPersonHandler(fixture('viewer').db)(req({treeId:'tree-a',name:'Rejected'}),denied);assert.equal(denied.code,403);
});
test('ancestry rejects self/cycles and inverse parent duplicates but permits non-ancestry connections',async()=>{
 const f=fixture();f.state.members.push({id:'person-c',treeId:'tree-a'});f.state.relationships.push({member1Id:'person-a',member2Id:'person-b',type:'parent'},{member1Id:'person-b',member2Id:'person-c',type:'parent'});
 await assert.rejects(validateRelationship(f.tx,'tree-a','person-c','person-a','parent'),/own ancestor/);
 await assert.rejects(validateRelationship(f.tx,'tree-a','person-b','person-a','child'),/already connected/);
 await assert.rejects(validateRelationship(f.tx,'tree-a','person-a','person-a','parent'),/different people/);
 await validateRelationship(f.tx,'tree-a','person-c','person-a','cousin');
});
test('Tamil preset creation rejects forged preset/type pairs and serializes relationship changes',async()=>{
 const f=fixture(),handler=createRelationshipHandler(f.db),res=response();
 await handler(req({treeId:'tree-a',member1Id:'person-a',member2Id:'person-b',presetId:'mama'}),res);assert.equal(res.code,201);assert.equal(f.state.relationships[0].type,'aunt_uncle');
 const invalid=response();await handler(req({treeId:'tree-a',member1Id:'person-a',member2Id:'person-b',presetId:'appa',type:'friend'}),invalid);assert.equal(invalid.code,400);
});

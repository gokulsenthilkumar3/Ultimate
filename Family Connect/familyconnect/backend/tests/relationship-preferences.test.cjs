const test = require('node:test');
const assert = require('node:assert/strict');
const {createRelationshipPreferencesHandlers} = require('../dist/controllers/relationshipPreferences.controller');
function fixture(access = true, member = true) {
  let saved;
  const tx = {accessControl:{findUnique:async()=>access?{}:null},member:{findFirst:async()=>member?{id:'person'}:null},user:{findUnique:async()=>({preferences:{familySelf:{tree:'me'}}}),update:async input=>{saved=input;}}};
  const handlers=createRelationshipPreferencesHandlers({$transaction:async fn=>fn(tx)});
  const res={statusCode:200,status(code){this.statusCode=code;return this;},set(){return this;},json(body){this.body=body;return this;}};
  return {handlers,res,saved:()=>saved};
}
test('private choices preserve Me and write only the authenticated account',async()=>{
  const f=fixture();
  await f.handlers.saveRelationshipPreferences({user:{id:'owner'},params:{id:'tree'},body:{memberId:'person',circle:'close',roles:['childhood'],integrations:['calendar']}},f.res);
  assert.equal(f.res.statusCode,200);
  assert.deepEqual(f.saved().where,{id:'owner'});
  assert.deepEqual(f.saved().data.preferences.familySelf,{tree:'me'});
  assert.deepEqual(f.res.body.people.person.integrations,['calendar']);
});
test('tree access and same-tree person checks prevent private preference writes',async()=>{
  for(const [access,member,status] of [[false,true,403],[true,false,400]]){
    const f=fixture(access,member);
    await f.handlers.saveRelationshipPreferences({user:{id:'owner'},params:{id:'tree'},body:{memberId:'person',circle:null,roles:[],integrations:[]}},f.res);
    assert.equal(f.res.statusCode,status);assert.equal(f.saved(),undefined);
  }
});
test('unknown integrations and client-supplied ownership are rejected',async()=>{
  const f=fixture();
  await f.handlers.saveRelationshipPreferences({user:{id:'owner'},params:{id:'tree'},body:{memberId:'person',circle:null,roles:[],integrations:['unknown'],userId:'other'}},f.res);
  assert.equal(f.res.statusCode,400);assert.equal(f.saved(),undefined);
});

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createContract}=require('../scripts/family-contract.cjs');
test('checked-in OpenAPI matches runtime Zod schemas and every new mutation route is wired',()=>{
 const generated=createContract(),stored=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/stabilization.openapi.json'),'utf8'));
 assert.deepEqual(stored,generated);
 for(const resource of ['members','relationships','events','documents']){
  const router=require('../dist/routes/'+resource+'.routes').default;
  for(const method of Object.keys(generated.paths['/'+resource+'/{id}']).filter(key=>key!=='parameters')){
   assert.ok(router.stack.some(layer=>layer.route?.path==='/:id'&&layer.route.methods[method]),`${method} ${resource}/:id must be registered`);
  }
 }
 assert.equal(stored.components.securitySchemes.UltimateSession.in,'cookie');
 assert.equal(stored.components.schemas.EventPatch.additionalProperties,false);
 assert.equal(stored.components.schemas.RelationshipPatch.additionalProperties,false);
});

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
 const trees=require('../dist/routes/trees.routes').default;
 for(const [route,method] of [['/:id/export/gedcom','get'],['/:id/import/gedcom/preview','post'],['/:id/import/gedcom','post'],['/:id/audit','get']]){
  assert.ok(trees.stack.some(layer=>layer.route?.path===route&&layer.route.methods[method]),`${method} trees${route} must be registered`);
 }
 for(const path of ['/trees/{id}/export/gedcom','/trees/{id}/import/gedcom/preview','/trees/{id}/import/gedcom','/trees/{id}/audit'])assert.ok(generated.paths[path],path+' must be documented');
 assert.equal(stored.components.schemas.GedcomImport.additionalProperties,false);
 assert.ok(stored.components.schemas.GedcomImport.properties.idempotencyKey,'imports are retry-safe');
 assert.ok(stored.components.schemas.PersonCreate.properties.deathRecorded&&stored.components.schemas.PersonCreate.properties.birthDatePrecision,'profile payloads carry date certainty');
 assert.equal(stored.components.securitySchemes.UltimateSession.in,'cookie');
 assert.equal(stored.components.schemas.EventPatch.additionalProperties,false);
 assert.equal(stored.components.schemas.RelationshipPatch.additionalProperties,false);
});

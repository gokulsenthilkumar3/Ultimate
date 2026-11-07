const test=require('node:test'),assert=require('node:assert/strict');
const {createEventRangeHandler}=require('../dist/controllers/eventRange.controller');
const {createReadinessProbe}=require('../dist/services/readiness');
const response=()=>({code:200,status(code){this.code=code;return this;},set(){return this;},json(body){this.body=body;}});
test('calendar batch range enforces membership and inclusive UTC dates with bounded paging',async()=>{
 let allowed=true,query,reads=0;
 const db={$transaction:async callback=>callback({accessControl:{findUnique:async()=>allowed?{role:'viewer'}:null},event:{findMany:async args=>{query=args;reads++;return [];},count:async()=>0}})};
 const handler=createEventRangeHandler(db),req={user:{id:'fixture-owner'},query:{treeId:'tree-a',from:'2026-12-29',to:'2027-01-04',page:'1'}},res=response();
 await handler(req,res);assert.equal(res.code,200);assert.equal(query.take,100);assert.equal(query.skip,100);
 assert.equal(query.where.date.gte.toISOString(),'2026-12-29T00:00:00.000Z');assert.equal(query.where.date.lt.toISOString(),'2027-01-05T00:00:00.000Z');
 allowed=false;const denied=response();await handler(req,denied);assert.equal(denied.code,403);assert.equal(reads,1);
 for(const change of [{from:'2027-01-05'},{to:'2029-01-01'},{page:'-1'},{treeId:['tree-a']},{userId:'attacker'}]){const invalid=response();await handler({...req,query:{...req.query,...change}},invalid);assert.equal(invalid.code,400);}
});
test('readiness distinguishes reachable, failed and hanging databases without leaking details',async()=>{
 assert.equal(await createReadinessProbe({$queryRaw:async()=>[{'?column?':1}]})(),true);
 assert.equal(await createReadinessProbe({$queryRaw:async()=>{throw Error('private connection details');}})(),false);
 let calls=0,finish;const probe=createReadinessProbe({$queryRaw:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}},5);
 assert.equal(await probe(),false);assert.equal(await probe(),false);assert.equal(calls,1);finish([]);
});

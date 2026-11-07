const test=require('node:test'),assert=require('node:assert/strict'),jwt=require('jsonwebtoken');
const {familyRateLimitKey}=require('../dist/middlewares/rateLimiter.middleware');
test('valid shared identities have independent limits; forged headers remain IP-limited',()=>{
 const before=process.env.ULTIMATE_BRIDGE_SECRET;process.env.ULTIMATE_BRIDGE_SECRET='b2'.repeat(32);
 try{
  const req=(sub,signature=true)=>({ip:'127.0.0.1',method:'GET',originalUrl:'/api/v1/trees',headers:{'x-ultimate-assertion':signature?jwt.sign({sub,method:'GET',path:'/api/v1/trees'},process.env.ULTIMATE_BRIDGE_SECRET,{algorithm:'HS256',issuer:'growthtrack-ultimate',audience:'family-api',expiresIn:30}):sub}});
  assert.notEqual(familyRateLimitKey(req('owner-a')),familyRateLimitKey(req('owner-b')));
  assert.equal(familyRateLimitKey(req('forged-a',false)),familyRateLimitKey(req('forged-b',false)));
  assert.match(familyRateLimitKey(req('owner-a')),/^ultimate:/);
 }finally{if(before===undefined)delete process.env.ULTIMATE_BRIDGE_SECRET;else process.env.ULTIMATE_BRIDGE_SECRET=before;}
});

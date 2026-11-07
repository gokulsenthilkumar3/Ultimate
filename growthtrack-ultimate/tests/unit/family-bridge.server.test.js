// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { registerFamilyBridge } from '../../server/domains/familyBridge.js';
import { ultimateIdentity, openUltimateSession } from '../../../Family Connect/familyconnect/backend/src/services/ultimateIdentity';
import { requireAuth } from '../../../Family Connect/familyconnect/backend/src/middlewares/auth.middleware';
import legacyAuthRoutes from '../../../Family Connect/familyconnect/backend/src/routes/auth.routes';

const secret = 'a1'.repeat(32), servers = [];
async function listen(app) { const server = http.createServer(app); servers.push(server); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return `http://127.0.0.1:${server.address().port}`; }
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(servers.splice(0).map(server => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); })); });
function token(path, changes = {}) { return jwt.sign({ method: 'GET', path, sub: 'owner', ...changes }, secret, { issuer: 'growthtrack-ultimate', audience: 'family-api', expiresIn: 30 }); }

describe('shared Ultimate / Family boundary', () => {
  it('requires Ultimate auth and CSRF, strips browser credentials and preserves Family permissions', async () => {
    vi.stubEnv('ULTIMATE_BRIDGE_SECRET', secret); vi.stubEnv('ULTIMATE_OWNER_ID', 'owner'); vi.stubEnv('ULTIMATE_FAMILY_USER_ID', 'existing-family');
    const seen = [], family = express(); family.use(express.json());
    family.use('/legacy-auth', legacyAuthRoutes);
    family.post('/api/v1/auth/ultimate-session', async (req, res) => {
      const identity = ultimateIdentity(req);
      const result = await openUltimateSession(identity, { findUnique: async () => ({ id: 'existing-family', name: 'Existing member', email: 'family@example.invalid' }), upsert: () => { throw Error('Existing account must not be replaced'); } });
      res.json(result);
    });
    family.get('/api/v1/trees', requireAuth, (req, res) => { seen.push(req.headers); res.json(req.user.id === 'existing-family' ? [{ id: 'permitted-tree' }] : []); });
    family.post('/api/v1/members', requireAuth, (_req, res) => res.status(403).json({ error: 'Tree access denied' }));
    family.put('/api/v1/events/:id', requireAuth, (req,res)=>res.json({id:req.params.id,...req.body}));
    family.delete('/api/v1/events/:id', requireAuth, (req,res)=>res.json({deleted:req.body.confirm===req.params.id,id:req.params.id}));
    family.get('/api/v1/documents/file/private', requireAuth, (_req, res) => res.type('image/png').send(Buffer.from('synthetic-private-file')));
    family.post('/api/v1/documents', requireAuth, express.raw({type:()=>true}), (req,res)=>res.json({multipart:req.body.toString().includes('synthetic-upload')}));
    const familyUrl = await listen(family), core = express(); core.use(express.json());
    expect((await fetch(familyUrl+'/legacy-auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'ignored@example.invalid',password:'ignored'})})).status).toBe(410);
    expect((await fetch(familyUrl+'/api/v1/trees',{headers:{Authorization:'Bearer any-legacy-token'}})).status).toBe(401);
    registerFamilyBridge(core, (req, res, next) => {
      if (req.headers.cookie !== 'ultimate=valid') return res.status(401).json({error:'Authentication required'});
      if (!['GET','HEAD'].includes(req.method) && req.headers['x-csrf-token'] !== 'synthetic-csrf') return res.status(403).json({error:'Invalid CSRF'});
      req.user={id:'owner',fullName:'Ultimate owner',email:'owner@example.invalid'}; next();
    }, {baseUrl:familyUrl,secret});
    const base = await listen(core), headers={Cookie:'ultimate=valid','X-CSRF-Token':'synthetic-csrf'};
    expect((await fetch(base+'/api/native/family/trees')).status).toBe(401);
    expect((await fetch(base+'/api/native/family/session',{method:'POST',headers:{Cookie:'ultimate=valid'}})).status).toBe(403);
    const session=await (await fetch(base+'/api/native/family/session',{method:'POST',headers})).json();
    expect(session.authMode).toBe('ultimate');expect(session.user.id).toBe('existing-family');expect(session.token).toBeUndefined();
    const trees=await fetch(base+'/api/native/family/trees',{headers:{...headers,Authorization:'Bearer attacker','X-Ultimate-Assertion':'attacker','X-User-Id':'victim'}});
    expect(await trees.json()).toEqual([{id:'permitted-tree'}]);
    expect(seen[0].cookie).toBeUndefined();expect(seen[0].authorization).toBeUndefined();expect(seen[0]['x-user-id']).toBeUndefined();
    expect(trees.headers.get('x-ultimate-assertion')).toBeNull();expect(trees.headers.get('cache-control')).toBe('no-store');
    expect((await fetch(base+'/api/native/family/members',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({treeId:'forbidden-tree'})})).status).toBe(403);
    expect((await fetch(base+'/api/native/family/events/fictional-event',{method:'DELETE',headers:{Cookie:'ultimate=valid','Content-Type':'application/json'},body:JSON.stringify({confirm:'fictional-event'})})).status).toBe(403);
    expect(await (await fetch(base+'/api/native/family/events/fictional-event',{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({title:'Fictional update'})})).json()).toEqual({id:'fictional-event',title:'Fictional update'});
    expect(await (await fetch(base+'/api/native/family/events/fictional-event',{method:'DELETE',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({confirm:'fictional-event'})})).json()).toEqual({deleted:true,id:'fictional-event'});
    const download=await fetch(base+'/api/native/family/documents/file/private',{headers});expect(download.headers.get('content-type')).toContain('image/png');expect(await download.text()).toBe('synthetic-private-file');
    const upload=new FormData();upload.set('file',new Blob(['synthetic-upload']),'example.txt');
    expect(await (await fetch(base+'/api/native/family/documents',{method:'POST',headers,body:upload})).json()).toEqual({multipart:true});
    expect((await fetch(base+'/api/native/family/auth/login',{method:'POST',headers})).status).toBe(404);
  });
  it('rejects tampering, wrong request/audience, expired/future tokens and fake identity overrides', () => {
    const env={ULTIMATE_BRIDGE_SECRET:secret,ULTIMATE_OWNER_ID:'owner',ULTIMATE_FAMILY_USER_ID:'existing-family'};
    const request=value=>({headers:{'x-ultimate-assertion':value},method:'GET',originalUrl:'/api/v1/trees'});
    expect(ultimateIdentity(request(token('/api/v1/trees')),env).id).toBe('existing-family');
    for(const value of [token('/api/v1/members'),token('/api/v1/trees',{method:'POST'}),token('/api/v1/trees')+'tampered',token('/api/v1/trees',{iat:Math.floor(Date.now()/1000)-100}),token('/api/v1/trees',{iat:Math.floor(Date.now()/1000)+100}),jwt.sign({sub:'owner',method:'GET',path:'/api/v1/trees'},secret,{issuer:'wrong',audience:'family-api',expiresIn:30})])expect(()=>ultimateIdentity(request(value),env)).toThrow();
    expect(ultimateIdentity(request(token('/api/v1/trees',{sub:'other',familyUserId:'existing-family',email:'family@example.invalid'})),env).id).not.toBe('existing-family');
  });
  it('stops forwarding after three upstream failures without retrying a request', async () => {
    let attempts=0;
    const family=express();family.get('/api/v1/trees',(_req,res)=>{attempts++;res.status(503).json({error:'Fixture service unavailable'});});
    const familyUrl=await listen(family),core=express();
    registerFamilyBridge(core,(req,_res,next)=>{req.user={id:'fixture-owner'};next();},{baseUrl:familyUrl,secret});
    const base=await listen(core);
    for(let count=0;count<3;count++){const res=await fetch(base+'/api/native/family/trees');expect(res.status).toBe(503);await res.json();}
    const blocked=await fetch(base+'/api/native/family/trees');expect(blocked.status).toBe(503);expect((await blocked.json()).code).toBe('FAMILY_CIRCUIT_OPEN');expect(attempts).toBe(3);
  });
  it('creates only a stable session identity and never takes a legacy account by email', async () => {
    const identity=ultimateIdentity({headers:{'x-ultimate-assertion':token('/api/v1/trees',{sub:'new'})},method:'GET',originalUrl:'/api/v1/trees'},{ULTIMATE_BRIDGE_SECRET:secret});
    const users={findUnique:vi.fn(async()=>null),upsert:vi.fn(async input=>({id:input.create.id,email:input.create.email,name:input.create.name}))};
    const response=await openUltimateSession(identity,users);expect(response.user.id).toBe(identity.id);expect(response.user.email).toContain('@ultimate.invalid');expect(response.token).toBeUndefined();
    expect(users.upsert.mock.calls[0][0].update).toEqual({});
    await expect(openUltimateSession({...identity,linked:true},users)).rejects.toThrow('does not exist');
  });
});

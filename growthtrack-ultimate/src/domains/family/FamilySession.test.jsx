import React from 'react';
import {act,cleanup,render,screen,waitFor} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import FamilyPage from './FamilyPage';
import {familyRequest,resetFamilyConnection} from './familyClient';
import {setCsrfToken} from '../../lib/apiClient';
const auth=vi.hoisted(()=>({user:{id:'owner-a'}}));
vi.mock('../../context/AuthContext',()=>({useAuth:()=>auth}));
vi.mock('./FamilyTree',()=>({default:()=>null}));
const clients=[];const response=(body,status=200)=>({ok:status<400,status,json:async()=>body});
function show(){const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});clients.push(client);return render(<MemoryRouter><QueryClientProvider client={client}><FamilyPage/></QueryClientProvider></MemoryRouter>);}
beforeEach(()=>{auth.user={id:'owner-a'};resetFamilyConnection(null);setCsrfToken('synthetic-csrf');});
afterEach(()=>{cleanup();clients.splice(0).forEach(client=>client.clear());resetFamilyConnection(null);vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('Family uses the Ultimate session',()=>{
 it('explains an older API returning an HTML 404 instead of a generic service error',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:404,json:async()=>{throw new SyntaxError('HTML response');}})));
  await expect(familyRequest('/trees/fixture/me',{connection:{owner:'owner-a',authMode:'ultimate',user:{id:'family-a'}}})).rejects.toMatchObject({status:404,message:'This Family feature is missing from the running API. Start the latest Family build and retry.'});
 });
 it('opens without a second login and sends cookies/CSRF through the protected native API',async()=>{
  const calls=[];vi.stubGlobal('fetch',vi.fn(async(url,options)=>{calls.push({url,options});return url.endsWith('/session')?response({authMode:'ultimate',user:{id:'family-a',name:'Family owner'}}):response([]);}));
  show();await screen.findByText('Ultimate session · Family owner');
  expect(screen.queryByLabelText('Password')).toBeNull();expect(screen.queryByRole('button',{name:'Disconnect Family account'})).toBeNull();
  expect(calls[0].url).toBe('/api/native/family/session');expect(calls[0].options.credentials).toBe('include');expect(calls[0].options.headers.get('X-CSRF-Token')).toBe('synthetic-csrf');
  expect(calls.every(call=>!call.options.headers.has('Authorization'))).toBe(true);
 });
 it('shows service readiness rather than offering a second account when the service is unavailable',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>response({error:'Family service is unavailable.'},503)));show();await screen.findByRole('alert');
  expect(screen.getByRole('button',{name:'Retry Family connection'})).toBeVisible();expect(screen.queryByLabelText('Password')).toBeNull();
 });
 it('does not expire a new Ultimate session when an old Family request finishes with 401',async()=>{
  let resolve;vi.stubGlobal('fetch',vi.fn(()=>new Promise(done=>{resolve=done;})));const expire=vi.fn();window.addEventListener('growthtrack:auth-expired',expire);
  const pending=familyRequest('/trees',{connection:{owner:'owner-a',authMode:'ultimate',user:{id:'family-a'}}}).catch(error=>error);
  resetFamilyConnection('owner-b');resolve(response({error:'Session expired'},401));await pending;expect(expire).not.toHaveBeenCalled();window.removeEventListener('growthtrack:auth-expired',expire);
 });
});

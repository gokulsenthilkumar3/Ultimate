// @vitest-environment node
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAgentsRouter } from '../../server/agents/router.js';

const servers=[];
afterEach(async()=>{await Promise.all(servers.splice(0).map(server=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);})));});
async function setup(plan, extra={}) {
  const fetchImpl=vi.fn(async url=>url.endsWith('/api/tags')?Response.json({models:[{name:'gemma3:1b'}]}):Response.json({message:{content:typeof plan==='string'?plan:JSON.stringify(plan)},done:true}));
  const app=express();app.use((req,_res,next)=>{req.user={id:'fixture-owner'};next();});
  app.use('/api/agents',createAgentsRouter({provider:'ollama',ollamaBaseUrl:'http://fixture-model:11434',fetchImpl,...extra}));
  const server=await new Promise(resolve=>{const running=app.listen(0,'127.0.0.1',()=>resolve(running));});servers.push(server);
  return {fetchImpl,post:body=>fetch(`http://127.0.0.1:${server.address().port}/api/agents/plan`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})};
}
const request=extra=>({model:'gemma3:1b',messages:[{role:'user',content:'Create a task to review the draft.'}],today:'2026-10-27',...extra});
describe('Agents reviewable plans',()=>{
  it('uses a structured output schema and returns proposals without executing writes',async()=>{
    const app=await setup({summary:'One useful next step.',actions:[{kind:'task.create',title:'Review the draft'}]});
    const response=await app.post(request());expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({requiresReview:true,actions:[{kind:'task.create',title:'Review the draft'}]});
    const sent=JSON.parse(app.fetchImpl.mock.calls[1][1].body);expect(sent).toMatchObject({stream:false,format:{type:'object'},options:{temperature:0,num_predict:2048}});
    expect(sent.messages.filter(message=>message.role==='system')).toHaveLength(1);
    expect(app.fetchImpl.mock.calls.map(([url])=>url)).toEqual(['http://fixture-model:11434/api/tags','http://fixture-model:11434/api/chat']);
  });
  it.each([
    {summary:'Unsafe',actions:[{kind:'shell',command:'anything'}]},
    {summary:'Unselected',actions:[{kind:'task.complete',recordId:'other-record'}]},
    {summary:'Hidden fields',actions:[{kind:'task.create',title:'Draft',url:'https://external.test'}]},
    'not JSON',
  ])('rejects an invalid or unselected proposed action %j',async plan=>{
    const app=await setup(plan);const response=await app.post(request());expect(response.status).toBe(502);expect(await response.json()).toMatchObject({code:'invalid_plan'});
  });
  it('permits only a selected record of the correct collection',async()=>{
    const app=await setup({summary:'Finish the selected task.',actions:[{kind:'task.complete',recordId:'task-1'}]});
    const context=[{id:'task-1',type:'tasks',domain:'workspace',label:'Review draft',text:'{"title":"Review draft"}'}];
    expect((await app.post(request({context}))).status).toBe(200);
    expect((await app.post(request({context:[{...context[0],type:'goals'}]}))).status).toBe(502);
  });
  it('checks sensitive consent and payload bytes before contacting the model',async()=>{
    const app=await setup({summary:'A plan.',actions:[]});
    const context=[{id:'m1',type:'metrics',domain:'wellness',label:'Weight',text:'72kg'}];
    expect((await app.post(request({context}))).status).toBe(400);
    expect((await app.post(request({extra:'x'.repeat(65*1024)}))).status).toBe(413);
    expect(app.fetchImpl).not.toHaveBeenCalled();
  });
  it('allows clarification without inventing app actions',async()=>{
    const app=await setup({summary:'Which task would you like to work on?',actions:[]});
    const response=await app.post(request());expect(response.status).toBe(200);expect((await response.json()).actions).toEqual([]);
  });
});

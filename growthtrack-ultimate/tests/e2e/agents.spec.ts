import { test, expect, OWNER, emptyState } from './foundation-fixture';

const model='gemma3:1b';
const ready={configured:true,provider:'ollama-local',ready:true,models:[{id:model,label:model,capabilities:{text:true}}],capabilities:{streaming:true,actions:false,reviewedActions:['task.create','task.complete','note.create']}};
const response=(text:string)=>`event: meta\ndata: {"model":"${model}"}\n\nevent: delta\ndata: ${JSON.stringify({text})}\n\nevent: done\ndata: {"done":true}\n\n`;
async function available(page, status = ready) { await page.route('**/api/agents/readiness',route=>route.fulfill({json:status})); }

test('registered views preserve a draft and fit laptop, desktop, and narrow widths',async({page})=>{
  const groqModels = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'].map(id => ({ id, label: id, capabilities: { text: true } }));
  await available(page, { ...ready, provider: 'groq', models: groqModels });
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  for(const viewport of [{width:1280,height:720},{width:1366,height:768},{width:1152,height:648},{width:1366,height:650},{width:1024,height:768},{width:1920,height:1080},{width:768,height:1024},{width:390,height:844},{width:320,height:800}]){
    await page.setViewportSize(viewport);await page.goto('/hub/agents',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#main-content h1')).toHaveText('Agents');
    await expect(page.getByText('2 available chat models · Groq',{exact:true})).toBeVisible();
    await page.getByRole('combobox',{name:'Chat model',exact:true}).selectOption('qwen/qwen3.8-27b');
    await page.getByRole('textbox',{name:'Message',exact:true}).fill('A draft that stays with this session');
    for(const [label,key,region] of [['Context','context','Context selection'],['Settings','settings','Model settings'],['Activity','history','Session history']]){
      await page.getByRole('tab',{name:label,exact:true}).click();
      await expect(page).toHaveURL(new RegExp(`view=${key}`));
      await expect(page.getByRole('region',{name:region,exact:true})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),`${label} at ${viewport.width}`).toBeLessThanOrEqual(1);
    }
    await page.getByRole('tab',{name:'Chat',exact:true}).click();
    await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveValue('A draft that stays with this session');
    await expect(page.getByRole('combobox',{name:'Chat model',exact:true})).toHaveValue('qwen/qwen3.8-27b');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    if(viewport.width>=1024){
      const box=await page.getByRole('textbox',{name:'Message',exact:true}).boundingBox();expect(box!.y+box!.height).toBeLessThan(viewport.height);
      const frame=await page.getByRole('log',{name:'Conversation'}).boundingBox();
      const heading=await page.getByRole('heading',{name:'What would you like to work on?'}).boundingBox();
      expect(heading!.y).toBeGreaterThanOrEqual(frame!.y);
      for(const card of await page.locator('.gt-agents__presets button').all()){
        const bounds=await card.boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(frame!.y+frame!.height);
      }
    }
    await page.screenshot({path:test.info().outputPath(`chat-${viewport.width}x${viewport.height}.png`)});
  }
  await page.setViewportSize({width:1366,height:768});
  await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();
  await page.screenshot({path:test.info().outputPath('chat-dark-1366.png')});
  await page.getByRole('tab',{name:'Context',exact:true}).click();
  await page.screenshot({path:test.info().outputPath('context-dark-1366.png')});
  await page.getByRole('tab',{name:'Settings',exact:true}).click();
  await page.screenshot({path:test.info().outputPath('settings-dark-1366.png')});
  expect(errors).toEqual([]);
});

test('a reviewed task plan saves only confirmed changes and survives a record-page reload',async({page})=>{
  await available(page);let writes=0;
  const tasks:any[]=[{id:'task-old',title:'Existing fixture task',status:'pending',done:false,priority:'p3',userId:OWNER.id}];
  await page.route('**/api/state',route=>route.fulfill({json:{...emptyState(),tasks}}));
  await page.route(url=>url.pathname==='/api/tasks'||url.pathname.startsWith('/api/tasks/'),async route=>{
    if(route.request().method()==='GET')return route.fulfill({json:tasks});
    writes++;const body=route.request().postDataJSON();
    if(route.request().method()==='POST'){const task={...body,id:'task-new',userId:OWNER.id};tasks.push(task);return route.fulfill({json:task});}
    const task=tasks.find(t=>new URL(route.request().url()).pathname.endsWith('/'+t.id));Object.assign(task,body);return route.fulfill({json:{...task}});
  });
  await page.route('**/api/agents/plan',route=>route.fulfill({json:{requiresReview:true,model,summary:'Create the report task and finish the selected task.',actions:[{kind:'task.create',title:'Prepare fixture report',priority:'p2'},{kind:'task.complete',recordId:'task-old'}]}}));
  await page.setViewportSize({width:1280,height:720});await page.goto('/hub/agents?view=context');
  await page.getByRole('checkbox',{name:/Tasks: Existing fixture task/}).check();
  await page.getByRole('tab',{name:'Chat',exact:true}).click();await page.getByRole('button',{name:'Plan & act',exact:true}).click();
  await page.getByRole('textbox',{name:'Message',exact:true}).fill('Create a report task and finish the selected task.');
  await page.getByRole('button',{name:'Prepare plan',exact:true}).click();
  const plan=page.getByRole('region',{name:'Proposed action plan',exact:true});await expect(plan).toBeVisible();
  expect(writes).toBe(0);await expect(plan.getByRole('button',{name:'Review selected actions (0)'})).toBeDisabled();
  for(const checkbox of await plan.getByRole('checkbox').all())await checkbox.check();
  await plan.getByRole('button',{name:'Review selected actions (2)'}).click();
  await expect(page.getByRole('dialog',{name:'Apply 2 changes?'})).toBeVisible();expect(writes).toBe(0);
  await page.getByRole('button',{name:'Keep reviewing',exact:true}).click();expect(writes).toBe(0);
  await plan.getByRole('button',{name:'Review selected actions (2)'}).click();await page.getByRole('button',{name:'Apply 2 changes',exact:true}).click();
  await expect(plan.getByText('2/2 saved',{exact:true})).toBeVisible();expect(writes).toBe(2);
  await page.screenshot({path:test.info().outputPath('applied-plan-1280.png')});
  await plan.getByRole('link',{name:'Open Tasks',exact:true}).first().click();
  await expect(page.getByText('Prepare fixture report',{exact:true})).toBeVisible();await page.reload();
  await expect(page.getByText('Prepare fixture report',{exact:true})).toBeVisible();expect(tasks.find(t=>t.id==='task-old').done).toBe(true);expect(writes).toBe(2);
});

test('connection failure offers setup and recovery without losing a draft',async({page})=>{
  let connected=false;
  await page.route('**/api/agents/readiness',route=>route.fulfill(connected?{json:ready}:{status:503,json:{configured:false,provider:'ollama-local',ready:false,models:[],code:'not_configured',reason:'Configure OLLAMA_BASE_URL on the server.'}}));
  await page.setViewportSize({width:1366,height:650});await page.goto('/hub/agents');
  await expect(page.getByRole('heading',{name:'Connect your local AI',exact:true})).toBeVisible();
  const connectionFrame=await page.getByRole('log',{name:'Conversation'}).boundingBox();
  const setupButton=await page.getByRole('button',{name:'Setup instructions',exact:true}).boundingBox();
  expect(setupButton!.y+setupButton!.height).toBeLessThanOrEqual(connectionFrame!.y+connectionFrame!.height);
  await page.screenshot({path:test.info().outputPath('setup-1366x650.png')});
  const message=page.getByRole('textbox',{name:'Message',exact:true});await message.fill('Keep my draft while I connect.');
  await expect(page.getByRole('button',{name:'Send message',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Setup instructions',exact:true}).click();await expect(page.getByRole('region',{name:'Local model setup',exact:true})).toBeVisible();
  connected=true;await page.getByRole('button',{name:'Refresh models',exact:true}).click();await expect(page.getByText('1 installed chat model',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Back to chat',exact:true}).click();await expect(message).toHaveValue('Keep my draft while I connect.');
  await expect(page.getByRole('button',{name:'Send message',exact:true})).toBeEnabled();
});

test('stream errors restore the prompt and a retry does not resend failed history',async({page})=>{
  await available(page);const payloads:any[]=[];
  await page.route('**/api/agents/chat',route=>{payloads.push(route.request().postDataJSON());return route.fulfill(payloads.length===1?{status:503,json:{error:'Fixture model unavailable',code:'upstream_unavailable'}}:{contentType:'text/event-stream',body:response('Fixture answer with a practical next step.')});});
  await page.goto('/hub/agents');await page.getByRole('textbox',{name:'Message',exact:true}).fill('Help me plan a focused afternoon.');await page.getByRole('button',{name:'Send message',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Fixture model unavailable');await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveValue('Help me plan a focused afternoon.');
  expect(payloads).toHaveLength(1);await page.getByRole('button',{name:'Send message',exact:true}).click();
  await expect(page.getByText('Fixture answer with a practical next step.',{exact:true})).toBeVisible();
  expect(payloads[1].messages).toEqual([{role:'user',content:'Help me plan a focused afternoon.'}]);expect(payloads[1].context).toEqual([]);
});

test('unselected model references cannot produce executable actions',async({page})=>{
  await available(page);let writes=0;
  await page.route('**/api/tasks',route=>{writes++;return route.fulfill({status:500,json:{error:'Unexpected write'}});});
  await page.route('**/api/agents/plan',route=>route.fulfill({json:{model,requiresReview:true,summary:'An invalid reference.',actions:[{kind:'task.complete',recordId:'unselected-task'}]}}));
  await page.goto('/hub/agents');await page.getByRole('button',{name:'Plan & act',exact:true}).click();await page.getByRole('textbox',{name:'Message',exact:true}).fill('Finish a task.');await page.getByRole('button',{name:'Prepare plan',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('could not be validated');await expect(page.getByRole('region',{name:'Proposed action plan',exact:true})).toHaveCount(0);expect(writes).toBe(0);
});

test('app overviews are opt-in and insights render useful Markdown without writing records', async ({ page }) => {
  await available(page);
  const tasks = [{ id: 'open', title: 'Review fixture', userId: OWNER.id, due_date: '2020-01-01', status: 'pending' }, { id: 'done', title: 'Finished fixture', userId: OWNER.id, done: true }];
  await page.route('**/api/state', route => route.fulfill({ json: { ...emptyState(), tasks } }));
  const payloads: any[] = []; let writes = 0;
  await page.route('**/api/tasks', route => { if (route.request().method() !== 'GET') writes++; return route.fulfill({ json: tasks }); });
  await page.route('**/api/agents/chat', route => {
    payloads.push(route.request().postDataJSON());
    return route.fulfill({ contentType: 'text/event-stream', body: response('## Findings\n\nFrom **Workspace overview**, one task is overdue.\n\n| Status | Count |\n| --- | --- |\n| Open | 1 |\n| Complete | 1 |\n\n[Open Tasks](/workspace/tasks) to review the next step. This covers loaded records only.') });
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/hub/agents?view=context');
  const overview = page.getByRole('checkbox', { name: /App overviews: Workspace overview/ });
  await expect(overview).not.toBeChecked(); await overview.check();
  await page.getByRole('tab', { name: 'Chat', exact: true }).click();
  await page.getByRole('button', { name: 'Insights', exact: true }).click();
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('What needs attention in my shared workspace?');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Findings', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Tasks', exact: true })).toHaveAttribute('href', '/workspace/tasks');
  expect(payloads[0].intent).toBe('insights'); expect(payloads[0].context).toHaveLength(1);
  expect(JSON.parse(payloads[0].context[0].text).facts.tasks).toMatchObject({ total: 2, completed: 1, open: 1, overdue: 1 });
  expect(writes).toBe(0);
  await page.screenshot({ path: test.info().outputPath('insights-1366.png') });
  await page.getByRole('tab', { name: 'Context', exact: true }).click(); await overview.uncheck();
  await page.getByRole('tab', { name: 'Chat', exact: true }).click();
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Explain a general concept.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect.poll(() => payloads.length).toBe(2);
  expect(payloads[1]).toMatchObject({ intent: 'general', context: [], messages: [{ role: 'user', content: 'Explain a general concept.' }] });
  expect(writes).toBe(0);
});

test('keyboard views, forced colors and confirmation focus remain usable',async({page})=>{
  await available(page);await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto('/hub/agents');
  const chat=page.getByRole('tab',{name:'Chat',exact:true});await chat.focus();await chat.press('End');await expect(page.getByRole('tab',{name:'Settings',exact:true})).toBeFocused();
  await expect(page).toHaveURL(/view=settings/);await page.keyboard.press('Escape');await expect(chat).toBeFocused();await expect(chat).toHaveAttribute('aria-selected','true');
  expect(await chat.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
  await page.screenshot({path:test.info().outputPath('forced-colors-390.png')});
});

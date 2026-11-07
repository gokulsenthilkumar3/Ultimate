const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const start = port => spawn(process.execPath, ['dist/index.js'], { cwd: root, windowsHide: true, env: {
  ...process.env, PORT: String(port), LISTEN_HOST: '127.0.0.1', REDIS_DISABLED: '1',
  DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:1/unused',
  ULTIMATE_BRIDGE_SECRET: 'a1'.repeat(32), ULTIMATE_OWNER_ID: '', ULTIMATE_FAMILY_USER_ID: '',
}, stdio: ['ignore','pipe','pipe'] });

test('a duplicate Family listener fails loudly instead of reporting a healthy stale instance', async () => {
  const owner = http.createServer(); await new Promise(resolve => owner.listen(0,'127.0.0.1',resolve));
  const child = start(owner.address().port); let output = '', errors = '';
  child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { errors += data; });
  let timer;
  try {
    const exit = await Promise.race([new Promise(resolve => child.once('exit',code=>resolve(code))), new Promise(resolve => { timer=setTimeout(()=>resolve('still-running'),5000); })]);
    assert.equal(exit,1,`Expected exit 1 on EADDRINUSE, got ${exit}.`);
    assert.match(errors,/EADDRINUSE/); assert.doesNotMatch(output,/Server running|family.listening/);
  } finally { clearTimeout(timer); if(child.exitCode===null) child.kill(); await new Promise(resolve=>owner.close(resolve)); }
});

test('a successfully bound Family build advertises the native contract and returns JSON for missing routes', async () => {
  const child = start(0); let pending = '', timer;
  try {
    const listening = await new Promise((resolve,reject) => {
      timer=setTimeout(()=>reject(Error('Family test process did not bind')),5000);
      child.once('exit',code=>reject(Error('Family exited before binding: '+code)));
      child.stdout.on('data',data=>{pending+=data;for(const line of pending.split('\n')){try{const event=JSON.parse(line);if(event.event==='family.listening')resolve(event);}catch{}}});
    });
    clearTimeout(timer);
    const health=await (await fetch(`http://127.0.0.1:${listening.port}/health`)).json();
    assert.equal(health.apiContract,'family-native/1.3');
    const missing=await fetch(`http://127.0.0.1:${listening.port}/api/v1/not-a-real-route`);
    assert.equal(missing.status,404);assert.equal((await missing.json()).code,'FAMILY_ROUTE_NOT_FOUND');
  } finally { clearTimeout(timer); if(child.exitCode===null)child.kill(); }
});

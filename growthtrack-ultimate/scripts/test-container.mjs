import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

// This test owns a labelled disposable volume and container. No host database,
// .env, vault or credentials are mounted. No production containers are touched.
const image = process.argv[2] || 'growthtrack-ultimate:verification';
const id = `growthtrack-smoke-${randomUUID()}`;
const password = randomBytes(24).toString('hex');
const key = randomBytes(32).toString('hex');
const label = 'com.growthtrack.disposable-smoke';
let containerCreated = false;
let volumeCreated = false;
function docker(args, { allowFailure = false, environment = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { shell: false, windowsHide: true, env: { ...process.env, ...environment }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 || allowFailure ? resolve({ code, output }) : reject(new Error(`Docker ${args[0]} failed:\n${output}`)));
  });
}
try {
  await docker(['volume', 'create', '--label', `${label}=${id}`, id]);
  volumeCreated = true;
  const mount = ['--mount', `type=volume,source=${id},target=/data`];
  await docker(['run', '--rm', ...mount, image, 'init']);
  const repeat = await docker(['run', '--rm', ...mount, image, 'init'], { allowFailure: true });
  assert.notEqual(repeat.code, 0, 'Initialization must refuse existing storage');
  assert.match(repeat.output, /EEXIST/);
  await docker(['run', '--rm', ...mount, '--env', 'OWNER_EMAIL=smoke@example.invalid', '--env', 'OWNER_NAME=Isolated smoke owner', '--env', 'OWNER_PASSWORD', image, 'owner'], { environment: { OWNER_PASSWORD: password } });
  await docker(['run', '--detach', '--name', id, '--label', `${label}=${id}`, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--tmpfs', '/tmp:size=64m,mode=1777', ...mount,
    '--publish', '127.0.0.1::3001', '--env', 'APP_URL=https://localhost/Ultimate', '--env', 'APP_ORIGINS=https://localhost', '--env', 'APP_ENCRYPTION_KEY', image], { environment: { APP_ENCRYPTION_KEY: key } });
  containerCreated = true;
  const port = (await docker(['port', id, '3001/tcp'])).output.trim();
  assert.match(port, /^127\.0\.0\.1:\d+$/);
  const base = `http://${port}`;
  let online = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(`${base}/api/health`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(2000) });
      if ((await response.json()).status === 'online') { online = true; break; }
    } catch { /* Wait only for this isolated container. */ }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.equal(online, true, 'The image must start with connected database');
  const anonymous = await fetch(`${base}/api/v1/workspace/notes`);
  assert.equal(anonymous.status, 401);
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://localhost' }, body: JSON.stringify({ email: 'smoke@example.invalid', password }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Strict/);
  const session = await login.json();
  async function api(path, method = 'GET', body, expected = 200) {
    const response = await fetch(`${base}${path}`, { method, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Cookie: cookie.split(';')[0], 'X-CSRF-Token': session.csrfToken, Origin: 'https://localhost' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const payload = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(payload)}`);
    return payload;
  }
  const notes = '/api/v1/workspace/notes';
  const created = await api(notes, 'POST', { id: randomUUID(), mutationId: 'smoke-create', title: 'Smoke note', content: 'First body' });
  assert.equal(created.revision, 1);
  const saved = await api(`${notes}/${created.id}`, 'PUT', { mutationId: 'smoke-edit', expectedRevision: 1, content: 'Second body' });
  assert.equal(saved.revision, 2);
  const replay = await api(`${notes}/${created.id}`, 'PUT', { mutationId: 'smoke-edit', expectedRevision: 1, content: 'Second body' });
  assert.deepEqual(replay, saved);
  const conflict = await api(`${notes}/${created.id}`, 'PUT', { mutationId: 'smoke-stale', expectedRevision: 1, content: 'Losing body' }, 409);
  assert.equal(conflict.current.content, 'Second body');
  assert.equal((await api(`${notes}/${created.id}/revisions`)).items.length, 2);
  const tombstone = await api(`${notes}/${created.id}`, 'DELETE', { mutationId: 'smoke-delete', expectedRevision: 2 });
  assert.equal(tombstone.revision, 3);
  const restored = await api(`${notes}/${created.id}/restore`, 'POST', { mutationId: 'smoke-restore', expectedRevision: 3, revision: 1 });
  assert.equal(restored.revision, 4); assert.equal(restored.content, 'First body');
  assert.equal((await api(`${notes}/sync`)).changes.length, 4);
  const form = new FormData();
  form.set('file', new Blob(['Private smoke bytes'], { type: 'text/plain' }), 'smoke.txt');
  const uploadedResponse = await fetch(`${base}/api/files`, { method: 'POST', headers: { Cookie: cookie.split(';')[0], 'X-CSRF-Token': session.csrfToken, Origin: 'https://localhost' }, body: form });
  assert.equal(uploadedResponse.status, 201);
  const uploaded = await uploadedResponse.json();
  assert.equal(uploaded.encryptedAtRest, true);
  const downloaded = await fetch(`${base}${uploaded.downloadUrl}`, { headers: { Cookie: cookie.split(';')[0] } });
  assert.equal(await downloaded.text(), 'Private smoke bytes');
  await docker(['exec', id, 'node', 'scripts/container-health.mjs']);
  await docker(['exec', id, 'node', 'scripts/container-entry.mjs', 'backup']);
  const frontend = await fetch(`${base}/Ultimate/workspace/notes`, { headers: { Accept: 'text/html' } });
  assert.equal(frontend.status, 200); assert.match(await frontend.text(), /<script type="module"/);
  console.log('Container smoke passed: explicit initialization, authentication, Notes receipts/conflicts/history/sync, encrypted file round trip, health, frontend and backup/restore drill.');
} finally {
  // Verify our unique labels before deleting temporary test resources.
  if (containerCreated) {
    const owned = await docker(['inspect', '--format', `{{index .Config.Labels "${label}"}}`, id]);
    assert.equal(owned.output.trim(), id);
    await docker(['rm', '--force', id]);
  }
  if (volumeCreated) {
    const owned = await docker(['volume', 'inspect', '--format', `{{index .Labels "${label}"}}`, id]);
    assert.equal(owned.output.trim(), id);
    await docker(['volume', 'rm', id]);
  }
}

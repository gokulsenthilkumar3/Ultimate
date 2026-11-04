import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const entry = 'server/agents/jev.js';

// Follow the authored relative-import closure without executing any application
// entry point, database, environment loader or provider request.
async function importClosure(file, files = new Set()) {
  if (files.has(file)) return files;
  files.add(file);
  const source = await fs.readFile(path.join(root, file), 'utf8');
  for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
    if (!match[1].startsWith('.')) continue;
    const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]));
    assert(!dependency.startsWith('../'), 'Decision module escaped its application');
    await importClosure(dependency, files);
  }
  return files;
}

function electronIncludes(file, patterns) {
  let included = false;
  for (const raw of patterns) {
    const negative = raw.startsWith('!');
    const pattern = negative ? raw.slice(1) : raw;
    // This shared module closure uses exact-file and directory-subtree entries.
    // Refuse unsupported positive patterns instead of assuming inclusion.
    const matches = pattern === file || (pattern.endsWith('/**/*') && file.startsWith(pattern.slice(0, -4)));
    if (matches) included = !negative;
  }
  return included;
}

async function dockerSources() {
  const dockerfile = await fs.readFile(path.join(root, 'Dockerfile'), 'utf8');
  const runtime = dockerfile.split(/^FROM .* AS runtime\s*$/mi)[1];
  assert(runtime, 'Docker runtime stage is missing');
  return [...runtime.matchAll(/^COPY --from=build (.+)$/gm)].flatMap(match => {
    const args = match[1].trim().split(/\s+/);
    return args.slice(0, -1).filter(value => value.startsWith('/app/')).map(value => value.slice(5));
  });
}

for (const packaging of ['Docker runtime', 'Electron files']) {
  test(`${packaging} retains and imports the disabled decision module in isolation`, async t => {
    const files = await importClosure(entry);
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
    const docker = packaging === 'Docker runtime' ? await dockerSources() : [];
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'growthtrack-decision-package-'));
    t.after(async () => {
      const relative = path.relative(os.tmpdir(), directory);
      assert(relative.startsWith('growthtrack-decision-package-') && !relative.includes(path.sep), 'Unexpected fixture cleanup');
      await fs.rm(directory, { recursive: true, force: true });
    });
    await fs.writeFile(path.join(directory, 'package.json'), JSON.stringify({ type: 'module' }));
    // Dependencies are shared read-only; relative application imports must resolve
    // exclusively from the staged tree. No original source directories are linked.
    await fs.symlink(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    for (const file of files) {
      const included = packaging === 'Docker runtime'
        ? docker.some(source => source === file || (!source.includes('*') && file.startsWith(source + '/')))
        : electronIncludes(file, manifest.build.files);
      assert(included, `${packaging} omits runtime import ${file}`);
      const target = path.join(directory, file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(path.join(root, file), target);
    }
    const probe = `const m = await import('./${entry}'); if (!m.JEV_ROUTES?.none || m.createJevAdvisor().configured || m.createLayaAdvisor().configured) throw Error('Invalid disabled-provider contract'); console.log('isolated decision import passed');`;
    const environment = { ...process.env };
    delete environment.NODE_OPTIONS;
    // Declared Node 22.12 support must not depend on default type stripping
    // (which was enabled only in 22.18). Exercise that same constraint here.
    const result = spawnSync(process.execPath, ['--no-experimental-strip-types', '--input-type=module', '--eval', probe], {
      cwd: directory, env: environment, encoding: 'utf8', timeout: 15000, windowsHide: true,
    });
    assert.equal(result.status, 0, `${packaging} failed under Node ${process.versions.node}: ${result.error?.message || result.stderr}`);
    assert.match(result.stdout, /isolated decision import passed/);
  });
}

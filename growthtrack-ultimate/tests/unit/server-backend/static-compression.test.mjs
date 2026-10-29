import test from 'node:test';
import assert from 'node:assert/strict';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import staticCompressionPlugin from '../../../build/staticCompressionPlugin.js';

test('compression uses finalized files and excludes HTML, maps, tiny chunks and model assets', async t => {
  const code = 'export const fixture = ' + JSON.stringify('fixture '.repeat(1000)) + ';';
  const css = '.fixture { color: red; }\n'.repeat(100);
  const bundle = {
    'assets/page-test1234.js': { type: 'chunk', code },
    'assets/page-test1234.css': { type: 'asset', source: css },
    'assets/icon-test1234.js': { type: 'chunk', code: 'export default 1;' },
    'index.html': { type: 'asset', source: code },
    'assets/page-test1234.js.map': { type: 'asset', source: code },
    'assets/body-test1234.glb': { type: 'asset', source: Buffer.from(code) },
  };
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'growthtrack-compression-test-'));
  t.after(async () => {
    const relative = path.relative(os.tmpdir(), directory);
    if (!relative.startsWith('growthtrack-compression-test-') || relative.includes(path.sep)) throw new Error('Unexpected compression fixture path.');
    await fs.rm(directory, { recursive: true, force: true });
  });
  await fs.mkdir(path.join(directory, 'assets'));
  for (const [file, entry] of Object.entries(bundle)) await fs.writeFile(path.join(directory, file), entry.type === 'chunk' ? entry.code : entry.source);
  // Simulate Vite's late preload rewrite: the disk output owns the bytes.
  bundle['assets/page-test1234.js'].code = 'stale code before finalization';
  await staticCompressionPlugin().writeBundle({ dir: directory }, bundle);
  const emitted = (await fs.readdir(path.join(directory, 'assets'))).filter(file => /\.(?:br|gz)$/.test(file));
  assert.equal(emitted.length, 4);
  for (const [file, original] of [['assets/page-test1234.js', code], ['assets/page-test1234.css', css]]) {
    const br = await fs.readFile(path.join(directory, file + '.br'));
    const gz = await fs.readFile(path.join(directory, file + '.gz'));
    assert.equal(brotliDecompressSync(br).toString(), original);
    assert.equal(gunzipSync(gz).toString(), original);
    assert(br.length < Buffer.byteLength(original));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
test('installer is per-user, preserves app data, adds shortcuts and has a reproducible build entry', () => {
  const pkg = JSON.parse(fs.readFileSync('growthtrack-ultimate/package.json'));
  assert.equal(pkg.build.nsis.oneClick, true); assert.equal(pkg.build.nsis.perMachine, false);
  assert.equal(pkg.build.nsis.deleteAppDataOnUninstall, false);
  assert.equal(pkg.build.nsis.createDesktopShortcut, true); assert.equal(pkg.build.nsis.createStartMenuShortcut, true);
  assert.ok(pkg.scripts['release:windows'].includes('--installer'));
  assert.ok(fs.existsSync('growthtrack-ultimate/' + pkg.build.win.icon));
});
test('ignore rules exclude private/release files but keep build source and installer branding', () => {
  const ignored = ['growthtrack-ultimate/.env.sqlserver', 'growthtrack-ultimate/desktop-local-connection.json', 'growthtrack-release-check/setup.exe', 'private.mdf', 'private.ldf', 'private.trn', 'private.pfx'];
  const source = ['growthtrack-ultimate/build/uiBuildInfo.js', 'growthtrack-ultimate/build/icon.ico', 'growthtrack-ultimate/build/staticCompressionPlugin.js'];
  for (const file of ignored) assert.equal(spawnSync('git', ['check-ignore', '-q', '--no-index', file]).status, 0, file);
  for (const file of source) assert.equal(spawnSync('git', ['check-ignore', '-q', '--no-index', file]).status, 1, file);
});

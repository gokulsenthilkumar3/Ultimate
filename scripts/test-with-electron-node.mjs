import path from 'node:path';
import vm from 'node:vm';
import fs from 'node:fs';

const asarRoot = path.resolve('growthtrack-release-local/app-asar-extracted');

const entryFiles = [
  'desktop.js',
  'desktop-config.js',
  'server.js',
  'server/domains/desktopDatabase.js',
  'server/domains/databaseInitialization.js',
  'server/domains/noteMigration.js',
  'server/domains/ownerProvisioning.js',
  'server/domains/desktopCompanion.js'
];

for (const rel of entryFiles) {
  const full = path.join(asarRoot, rel);
  const code = fs.readFileSync(full, 'utf8');
  try {
    new vm.SourceTextModule(code, { identifier: full });
    console.log('OK:', rel);
  } catch (err) {
    console.error('FAILED in', rel, ':', err);
  }
}

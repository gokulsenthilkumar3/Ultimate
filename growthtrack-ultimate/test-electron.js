import { app } from 'electron';

console.log('Testing desktop imports in Electron runtime...');

const modules = [
  './desktop-config.js',
  './server/domains/desktopDatabase.js',
  './server/domains/databaseInitialization.js',
  './server/domains/noteMigration.js',
  './server/domains/ownerProvisioning.js',
  './server/domains/desktopCompanion.js',
  './server/domains/sqliteBackup.js',
  './server.js'
];

for (const m of modules) {
  try {
    await import(m);
    console.log('SUCCESS:', m);
  } catch (err) {
    console.error('FAILED MODULE:', m);
    console.error(err);
  }
}

app.quit();

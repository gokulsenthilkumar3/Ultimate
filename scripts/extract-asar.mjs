import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const asar = require(path.resolve('growthtrack-ultimate/node_modules/@electron/asar/lib/asar.js'));

const asarPath = path.resolve('growthtrack-release-local/win-unpacked/resources/app.asar');
const dest = path.resolve('growthtrack-release-local/app-asar-extracted');

console.log('Extracting asar from:', asarPath);
asar.extractAll(asarPath, dest);
console.log('Extracted to:', dest);

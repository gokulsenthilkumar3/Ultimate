#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docPath = path.resolve(__dirname, '../docs/BLENDER_PRIORITY_FIXES.md');

try {
  const text = readFileSync(docPath, 'utf8');
  console.log(text);
} catch (err) {
  console.error(`✗ Could not read priority fixes doc: ${err.message}`);
  process.exit(1);
}

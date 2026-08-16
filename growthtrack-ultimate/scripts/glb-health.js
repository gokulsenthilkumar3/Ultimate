#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const validator = path.resolve(__dirname, './validate-glb.js');
const glbPath = process.argv[2];

const args = glbPath ? [validator, glbPath] : [validator];
const result = spawnSync(process.execPath, args, { encoding: 'utf8' });

const stdout = (result.stdout || '').trim();
const stderr = (result.stderr || '').trim();
const lines = stdout.split(/\r?\n/).filter(Boolean);
const summaryLine = lines.find((line) => line.includes('Vertices:')) || 'GLB summary unavailable';
const failLines = stderr
  .split(/\r?\n/)
  .filter((line) => line.startsWith('✗ '))
  .slice(0, 6);

console.log(summaryLine);
if (failLines.length) {
  console.log(failLines.join('\n'));
}

process.exit(result.status ?? 1);

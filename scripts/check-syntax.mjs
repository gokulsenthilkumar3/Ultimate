import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

let errors = 0;
function check(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        check(full);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      try {
        execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
      } catch (err) {
        console.error('SYNTAX ERROR IN:', full);
        console.error(err.stderr?.toString());
        errors++;
      }
    }
  }
}

check('growthtrack-ultimate');
console.log(`Scan completed. Total syntax errors: ${errors}`);

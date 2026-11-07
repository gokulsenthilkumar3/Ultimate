import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const parser = await import('file:///' + path.resolve('growthtrack-ultimate/node_modules/@babel/parser/lib/index.js').replace(/\\/g, '/'));

let found = 0;
function check(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        check(full);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs') || entry.name.endsWith('.jsx'))) {
      const code = fs.readFileSync(full, 'utf8');
      try {
        parser.parse(code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        });
      } catch (err) {
        if (err.message.includes("Unexpected token ')'") || err.message.includes("Unexpected token")) {
          console.error(`🚨 SYNTAX ERROR in ${full}: ${err.message} at line ${err.loc?.line}:${err.loc?.column}`);
          found++;
        }
      }
    }
  }
}

console.log('Scanning growthtrack-ultimate...');
check('growthtrack-ultimate');
console.log(`Scan finished. Found ${found} syntax errors.`);

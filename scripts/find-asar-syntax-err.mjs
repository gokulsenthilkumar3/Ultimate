import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

let total = 0;
let errors = 0;

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scan(full);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      total++;
      const code = fs.readFileSync(full, 'utf8');
      try {
        new vm.SourceTextModule(code, { identifier: full });
      } catch (err) {
        if (err instanceof SyntaxError) {
          console.error(`\n🚨 SYNTAX ERROR in ${full}:`);
          console.error(err.message);
          console.error(err.stack);
          errors++;
        }
      }
    }
  }
}

const target = path.resolve('growthtrack-release-local/app-asar-extracted');
console.log('Scanning extracted asar files in:', target);
scan(target);
console.log(`\nScan finished. Total checked: ${total}, Syntax errors: ${errors}`);

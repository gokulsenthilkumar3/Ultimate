const fs = require('fs');
const path = require('path');
const p = path.resolve('node_modules', 'metro', 'package.json');
const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));

if (!pkg.exports) {
  pkg.exports = {};
}

// Add the missing exports that Expo CLI complains about
pkg.exports['./src/lib/TerminalReporter'] = './src/lib/TerminalReporter.js';
pkg.exports['./src/lib/TerminalReporter.js'] = './src/lib/TerminalReporter.js';

fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
console.log('Patched metro/package.json successfully');

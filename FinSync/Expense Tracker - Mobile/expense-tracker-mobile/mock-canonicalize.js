const fs = require('fs');
const path = require('path');
const dir = path.resolve('node_modules', 'metro-core', 'private');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
const file = path.join(dir, 'canonicalize.js');
// Mocking the canonicalize function which was removed in newer metro versions
// but is still expected by the mismatched metro-cache version.
fs.writeFileSync(file, 'module.exports = function(key) { return JSON.stringify(key); };\n');
console.log("Mocked canonicalize.js");

const fs = require('fs');
const path = require('path');

const mocks = [
  {
    path: 'node_modules/metro-core/private/canonicalize.js',
    content: 'module.exports = function(key) { return JSON.stringify(key); };'
  },
  {
    path: 'node_modules/metro/private/lib/TerminalReporter.js',
    content: 'module.exports = class TerminalReporter { update() {} log() {} };'
  },
  {
    path: 'node_modules/metro/src/lib/TerminalReporter.js',
    content: 'module.exports = class TerminalReporter { update() {} log() {} };'
  }
];

mocks.forEach(mock => {
  const fullPath = path.resolve(__dirname, mock.path);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, mock.content);
  console.log('Mocked', mock.path);
});

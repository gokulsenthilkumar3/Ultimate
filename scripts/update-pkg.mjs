import fs from 'node:fs';
const file = 'growthtrack-ultimate/package.json';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  '    "dev": "concurrently \\"vite\\" \\"node server.js\\"",',
  '    "dev": "concurrently \\"vite --configLoader native\\" \\"node server.js\\"",'
);
fs.writeFileSync(file, text);
console.log('Successfully updated package.json dev script');


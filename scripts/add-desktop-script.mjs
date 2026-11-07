import fs from 'node:fs';

const file = 'package.json';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('"desktop":')) {
  text = text.replace(
    '"build:desktop": "npm --prefix growthtrack-ultimate run build:desktop",',
    '"desktop": "npm --prefix growthtrack-ultimate run desktop",\n    "build:desktop": "npm --prefix growthtrack-ultimate run build:desktop",'
  );
  fs.writeFileSync(file, text);
  console.log('Added desktop script to root package.json');
}

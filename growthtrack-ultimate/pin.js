import fs from 'fs';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const type of ['dependencies', 'devDependencies']) {
  if (pkg[type]) {
    for (const key in pkg[type]) {
      pkg[type][key] = pkg[type][key].replace(/[\^~]/g, '');
    }
  }
}
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

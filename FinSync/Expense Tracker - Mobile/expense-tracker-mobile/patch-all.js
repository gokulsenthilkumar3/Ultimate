const fs = require('fs');
const path = require('path');

const packages = [
  'metro',
  'metro-cache',
  'metro-config',
  'metro-core',
  'metro-resolver',
  'metro-transform-worker',
  'metro-transform-plugins'
];

packages.forEach(pkgName => {
  try {
    const p = path.resolve('node_modules', pkgName, 'package.json');
    if (fs.existsSync(p)) {
      const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (pkg.exports) {
        delete pkg.exports;
        fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
        console.log(`Patched ${pkgName}`);
      }
    }
  } catch (e) {
    console.error(`Error patching ${pkgName}:`, e);
  }
});

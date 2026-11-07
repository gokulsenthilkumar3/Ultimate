import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
export const applicationRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function uiSourceHash(root = applicationRoot) {
  const hash = createHash('sha256');
  const visit = relative => {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    if (fs.statSync(absolute).isDirectory()) for (const entry of fs.readdirSync(absolute).sort()) visit(path.join(relative, entry));
    else hash.update(relative.replaceAll('\\', '/')).update('\0').update(fs.readFileSync(absolute)).update('\0');
  };
  for (const relative of ['src', 'build', 'public', 'index.html', 'companion.html', 'vite.config.js', 'package.json', 'package-lock.json']) visit(relative);
  return hash.digest('hex');
}
export default function uiBuildInfo() {
  return { name: 'growthtrack-ui-build-info', apply: 'build', generateBundle() {
    const pkg = JSON.parse(fs.readFileSync(path.join(applicationRoot, 'package.json'), 'utf8'));
    this.emitFile({ type: 'asset', fileName: 'build-info.json', source: JSON.stringify({ version: pkg.version, sourceHash: uiSourceHash(), builtAt: new Date().toISOString() }, null, 2) + '\n' });
  } };
}

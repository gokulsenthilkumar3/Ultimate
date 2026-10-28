import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FEATURES } from '../growthtrack-ultimate/src/config/featureRegistry.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean))];
const css = files.filter(file => /\.(css|scss)$/.test(file) && fs.existsSync(path.join(root, file))).sort().map(file => ({
  file,
  disposition: file.includes('before-source/') ? 'historical snapshot; keep outside runtime' : file.includes('/admin-demo/') ? 'isolated fixture-only reference demo' : file.endsWith('growthtrack-design.css') || file.endsWith('styles/design-tokens.css') ? 'regenerate through approved shared token source' : /styles\/(app-styles|editorial-shell|editorial-components|editorial-overviews|editorial-settings|responsive-foundation|desktop-responsive)\.css$/.test(file) ? 'approved production shared shell/primitives; rendered verification pending' : file.includes('/domains/customer-admin/') ? 'production customer-admin presentation; adapter setup required' : file.includes('styles/ui-system-v') || /styles\/(ios27|premium|ultimate-ui|experience)\.css$/.test(file) || file.endsWith('theme-v4.css') ? 'domain compatibility styles; retire only after parity' : 'domain styles consume approved shared semantics; inspect remaining overrides',
  designDirectionApproval: 'user approved demo and authorised real-app implementation', renderedVerification: 'pending',
}));
const routes = FEATURES.map(f => ({ id: f.id, currentPath: f.canonicalPath, label: f.label, area: f.area, views: f.views, destination: f.canonicalPath, scope: ['customers', 'finsync', 'oxfin'].includes(f.id) ? 'production customer-admin UI; adapter setup required' : ['equity', 'forex', 'family'].includes(f.id) ? 'approved shell; native portal migration still requires parity' : f.id === 'ai' ? 'optional tool; no core dependency' : 'approved production shell and shared primitives; domain runtime retained', designDirectionApproval: 'user-approved', renderedVerification: 'pending' }));
const outputs = {
  'docs/plans/css-migration-inventory.json': { version: 2, scope: 'All tracked and nonignored source stylesheets; broad design approval is separate from rendered verification.', count: css.length, files: css },
  'docs/plans/ui-route-inventory.json': { version: 2, scope: 'Every production feature and view, including customer administration. Demo adds four public pages.', featureCount: routes.length, viewCount: routes.reduce((n, r) => n + Math.max(1, r.views.length), 0), routes },
};
for (const [file, data] of Object.entries(outputs)) {
  const content = JSON.stringify(data, null, 2) + '\n'; const target = path.join(root, file);
  if (process.argv.includes('--check')) { if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== content) throw new Error(`Design inventory drift: ${file}`); }
  else fs.writeFileSync(target, content);
}
console.log(`${routes.length} feature routes and ${css.length} stylesheets ${process.argv.includes('--check') ? 'verified' : 'inventoried'}. Rendered verification remains pending.`);

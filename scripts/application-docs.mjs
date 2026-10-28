import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apps = JSON.parse(fs.readFileSync(path.join(root, 'docs/applications.json'), 'utf8'));
const check = process.argv.includes('--check');
const link = (from, target) => path.relative(path.join(root, from), path.join(root, target)).replace(/\\/g, '/') || '.';
const block = commands => `\n\`\`\`powershell\n${commands.join('\n')}\n\`\`\`\n`;
let stale = 0;
for (const app of apps) {
  const target = path.join(root, app.path, 'README.md');
  if (!target.startsWith(root + path.sep)) throw new Error('README target escaped workspace.');
  const lines = [
    `# ${app.title}`, '', app.purpose, '',
    `**Runtime:** ${app.runtime}`, '', `**Status:** ${app.status}`, '',
    '## Setup', '', 'Run these commands from this application directory. Configure required values locally before starting the live application.',
    app.install.length ? block(app.install) : '\nThis is reference source, not a complete standalone installation. Follow the status and limitations below before attempting execution.\n',
    '## Run', app.start.length ? block(app.start) : '\nNo supported standalone launch is documented for this reference package.\n',
    '## Configuration', '', ...app.environment.map(text => `- ${text}`), '',
    'Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.', '',
    '## Verification', app.checks.length ? block(app.checks) : '\nNo complete verification command is declared for this reference package.\n',
    '## Scope and limitations', '', ...app.notes.map(text => `- ${text}`), '',
    '## Workspace documentation', '',
    `- [Application directory](${link(app.path, 'docs/APPLICATIONS.md')})`,
    `- [Ownership and independent builds](${link(app.path, 'docs/BUILD_BOUNDARIES.md')})`,
    `- [Desktop redesign and architecture](${link(app.path, 'docs/plans/2026-10-28-admin-redesign.md')})`,
    `- [Complete architecture and UI review handoff](${link(app.path, 'docs/UI_ARCHITECTURE_HANDOFF.md')})`,
    `- [Implemented UI proposal and remaining review gates](${link(app.path, 'docs/plans/2026-10-28-proposal-implementation.md')})`,
    `- [Approved production UI integration](${link(app.path, 'docs/plans/2026-10-28-production-ui.md')})`,
    `- [UI impact and scale checks](${link(app.path, 'docs/plans/2026-10-28-ui-system-impact.md')})`,
    `- [Code retrieval and embedding plan](${link(app.path, 'docs/plans/2026-10-28-code-retrieval.md')})`,
    '', '<!-- Generated from docs/applications.json by scripts/application-docs.mjs. Edit the catalog, then regenerate. -->', '',
  ];
  const content = lines.join('\n');
  if (check) { if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== content) { console.error(`Stale README: ${app.path}/README.md`); stale++; } }
  else fs.writeFileSync(target, content);
}
const directory = ['# Application directory', '', 'One documentation format for every application and reference package. Product status describes the current source; planned portal integration is not presented as shipped.', '', '| Application | Purpose | Status |', '| --- | --- | --- |', ...apps.map(app => `| [${app.title}](${link('docs', path.join(app.path, 'README.md')).replace(/ /g, '%20')}) | ${app.purpose} | ${app.status} |`), '', 'Generated from `applications.json`. Run `node scripts/application-docs.mjs --check` to detect drift.', ''].join('\n');
const directoryPath = path.join(root, 'docs/APPLICATIONS.md');
if (check) { if (!fs.existsSync(directoryPath) || fs.readFileSync(directoryPath, 'utf8').replace(/\r\n/g, '\n') !== directory) stale++; }
else fs.writeFileSync(directoryPath, directory);
if (stale) process.exitCode = 1;
console.log(`${apps.length} application READMEs ${check ? 'checked' : 'generated'}${stale ? `; ${stale} stale` : ''}.`);

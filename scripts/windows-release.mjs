// Build and upload only the verified installer assets; never git-add binaries.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), repository = 'gokulsenthilkumar3/Ultimate';
if (args.some(arg => !['--publish','--update-draft'].includes(arg) && !arg.startsWith('--from='))) throw new Error('Usage: npm run release:windows:draft -- [--from=release-folder] [--update-draft] [--publish]');
const from = args.find(arg => arg.startsWith('--from='))?.slice(7);
if (!from) execFileSync(process.execPath, ['growthtrack-ultimate/scripts/build-desktop.mjs', '--installer'], { cwd: root, stdio: 'inherit', windowsHide: true });
const folder = from ? path.resolve(root, from) : path.join(root, fs.readdirSync(root).filter(name => /^growthtrack-release-\d{14}$/.test(name)).sort().at(-1));
if (!folder.startsWith(root + path.sep)) throw new Error('Release folder must be inside this workspace.');
const manifestPath = path.join(folder, 'release-manifest.json'), manifest = JSON.parse(fs.readFileSync(manifestPath));
if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(manifest.version) || !/^GrowthTrack-Ultimate-[\w.-]+-Setup\.exe$/.test(manifest.file) || manifest.profile !== 'standalone' || !/^[a-f0-9]{64}$/.test(manifest.sha256)) throw new Error('Invalid installer manifest.');
const installer = path.join(folder, manifest.file);
if (crypto.createHash('sha256').update(fs.readFileSync(installer)).digest('hex') !== manifest.sha256) throw new Error('Installer checksum mismatch.');
execFileSync(process.execPath, ['growthtrack-ultimate/scripts/verify-desktop-build.mjs', path.join(folder, 'win-unpacked/resources/app.asar')], { cwd: root, stdio: 'inherit' });
const tag = `desktop-v${manifest.version}`;
const gh = argv => execFileSync('gh', argv, { cwd: root, encoding: 'utf8', windowsHide: true });
const metadata = JSON.parse(gh(['repo', 'view', repository, '--json', 'nameWithOwner,isPrivate']));
if (metadata.nameWithOwner !== repository || metadata.isPrivate) throw new Error('Expected the configured public Ultimate repository.');
const exists = spawnSync('gh', ['release', 'view', tag, '--repo', repository], { encoding: 'utf8', windowsHide: true });
if (exists.status === 0) {
  const previous = JSON.parse(gh(['release', 'view', tag, '--repo', repository, '--json', 'isDraft']));
  if (!previous.isDraft || !args.includes('--update-draft')) throw new Error('Release exists. Only an explicit --update-draft may replace assets of an unpublished draft.');
}
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const dirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root, encoding: 'utf8' }).trim());
manifest.source = { commitContext: commit, workingTreeDirty: dirty, uiSourceHash: manifest.uiBuild.sourceHash };
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const notes = fs.readFileSync(path.join(folder, 'RELEASE-NOTES.txt'), 'utf8')
  + `\nPublisher signature: ${manifest.signing}.\nSource context: ${commit}. ${dirty ? 'Built from the local working tree; pending source changes are not represented by the release tag alone.' : 'Built from the clean checked-out source.'}\n`;
const notesPath = path.join(root, '.code-index/windows-release-notes.txt');
fs.mkdirSync(path.dirname(notesPath), { recursive: true }); fs.writeFileSync(notesPath, notes);
const assets = [installer, path.join(folder, 'SHA256SUMS.txt'), manifestPath, path.join(folder, 'RELEASE-NOTES.txt')];
if (exists.status === 0) {
  gh(['release', 'upload', tag, '--repo', repository, '--clobber', ...assets]);
  gh(['release', 'edit', tag, '--repo', repository, '--notes-file', notesPath]);
} else console.log(gh(['release', 'create', tag, '--repo', repository, '--target', commit, '--title', `GrowthTrack Ultimate ${manifest.version} — Windows`, '--notes-file', notesPath, '--draft', ...assets]).trim());
const release = JSON.parse(gh(['release', 'view', tag, '--repo', repository, '--json', 'url,isDraft,assets']));
if (!release.assets.some(asset => asset.name === manifest.file && asset.size === manifest.bytes)) throw new Error('Uploaded installer metadata did not match. Review the release before publishing.');
const remote = JSON.parse(gh(['api', `repos/${repository}/releases?per_page=100`])).find(item => item.tag_name === tag && item.draft);
if (!remote?.assets.some(asset => asset.name === manifest.file && asset.digest === `sha256:${manifest.sha256}`)) throw new Error('GitHub installer digest differs; release remains a draft.');
if (args.includes('--publish')) {
  gh(['release', 'edit', tag, '--repo', repository, '--draft=false', '--latest']);
  release.isDraft = false;
  release.url = `https://github.com/${repository}/releases/tag/${tag}`;
}
console.log(JSON.stringify({ url: release.url, draft: release.isDraft, installer: manifest.file, sha256: manifest.sha256 }));

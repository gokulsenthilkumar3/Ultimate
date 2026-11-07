import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const outputDir = `../growthtrack-release-${timestamp}`;
const run = (file, args) => execFileSync(file, args, { cwd: projectRoot, stdio: 'inherit', windowsHide: true });
const localServer = process.argv.includes('--local-server');
const installer = process.argv.includes('--installer');
if (process.argv.slice(2).some(arg => !['--local-server', '--installer'].includes(arg))) throw new Error('Supported arguments: --installer, --local-server');
if (installer && localServer) throw new Error('Distributable installers must not depend on the developer\'s loopback server.');
const connectionFile = path.join(projectRoot, 'desktop-local-connection.json');
const previousConnection = fs.existsSync(connectionFile) ? fs.readFileSync(connectionFile) : null;
try {
fs.writeFileSync(connectionFile, JSON.stringify({ serverUrl: localServer ? 'http://127.0.0.1:3001/Ultimate/' : null, allowLoopback: localServer }, null, 2));

run(process.execPath, ['scripts/generate-prisma.mjs']);
run(process.execPath, ['scripts/generate-schema.mjs']);
fs.mkdirSync(path.join(projectRoot, 'prisma-generated'), { recursive: true });
fs.cpSync(path.join(projectRoot, 'node_modules', '.prisma', 'client'), path.join(projectRoot, 'prisma-generated', 'client'), { recursive: true });
// Building an installer must not change the developer's or owner's database.
// Apply reviewed migrations through the deployment workflow separately.
run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--configLoader', 'native']);
run(process.execPath, ['node_modules/electron-builder/out/cli/cli.js', '--win', ...(installer ? ['nsis', '--x64', '--publish', 'never'] : ['--dir']), `--config.directories.output=${outputDir}`]);
run(process.execPath, ['scripts/verify-desktop-build.mjs', path.join(outputDir, 'win-unpacked/resources/app.asar')]);
if (installer) {
  const output = path.resolve(projectRoot, outputDir);
  const files = fs.readdirSync(output).filter(name => /-Setup\.exe$/.test(name));
  if (files.length !== 1) throw new Error('Expected exactly one Windows installer.');
  const packageInfo = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const build = JSON.parse(fs.readFileSync(path.join(projectRoot, 'dist/build-info.json'), 'utf8'));
  const exe = files[0], bytes = fs.readFileSync(path.join(output, exe));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const signing = execFileSync('powershell.exe', ['-NoProfile', '-Command', '(Get-AuthenticodeSignature -LiteralPath $env:GROWTHTRACK_SIGN_FILE).Status.ToString()'], { encoding: 'utf8', windowsHide: true, env: { ...process.env, GROWTHTRACK_SIGN_FILE: path.join(output, exe) } }).trim();
  fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), `${sha256}  ${exe}\n`);
  fs.writeFileSync(path.join(output, 'release-manifest.json'), JSON.stringify({ version: packageInfo.version, file: exe, bytes: bytes.length, sha256, uiBuild: build, profile: 'standalone', installation: 'per-user-one-click', signing }, null, 2) + '\n');
  const notes = `GrowthTrack Ultimate ${packageInfo.version} for Windows x64\n\nDownload ${exe}, open it, then complete private account setup. No Node.js, npm, Prisma Studio or SQL Server installation is needed for the private local workspace. The installer adds shortcuts and an uninstaller; app data is retained on uninstall.\n\nYour own SQL Server setup is separate and remains operator-configured. Shared-server mode requires a reachable trusted backend. Optional cloud APIs require account authorization.\n\nSHA-256: ${sha256}\nUI source: ${build.sourceHash}\n\nCheck the actual Windows publisher signature. This build must not be described as signed unless Authenticode verifies it.\n`;
  fs.writeFileSync(path.join(output, 'RELEASE-NOTES.txt'), notes);
  console.log(`Windows installer: ${path.join(output, exe)}`);
}

console.log(`Desktop build complete. Output: ${path.resolve(projectRoot, outputDir)}`);
} finally {
  if (previousConnection) fs.writeFileSync(connectionFile, previousConnection);
  else fs.rmSync(connectionFile, { force: true });
}

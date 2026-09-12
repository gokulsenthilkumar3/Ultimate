import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const outputDir = `../growthtrack-release-${timestamp}`;
const run = (file, args) => execFileSync(file, args, { cwd: projectRoot, stdio: 'inherit', windowsHide: true });

run(process.execPath, ['node_modules/prisma/build/index.js', 'generate']);
fs.rmSync(path.join(projectRoot, 'prisma-generated'), { recursive: true, force: true });
fs.mkdirSync(path.join(projectRoot, 'prisma-generated'), { recursive: true });
fs.cpSync(path.join(projectRoot, 'node_modules', '.prisma', 'client'), path.join(projectRoot, 'prisma-generated', 'client'), { recursive: true });
run(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push']);
run(process.execPath, ['node_modules/vite/bin/vite.js', 'build']);
run(process.execPath, ['node_modules/electron-builder/out/cli/cli.js', '--win', `--config.directories.output=${outputDir}`]);

console.log(`Desktop build complete. Output: ${path.resolve(projectRoot, outputDir)}`);

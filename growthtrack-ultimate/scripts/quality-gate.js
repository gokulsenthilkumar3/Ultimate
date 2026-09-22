#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];

function record(name, status, detail) {
  results.push({ name, status, detail });
  const icon = status === 'pass' ? '✓' : status === 'warn' ? '!' : '✗';
  console.log(`${icon} ${name}: ${detail}`);
}

function runNode(name, modulePath, args = [], { advisory = false } = {}) {
  const result = spawnSync(process.execPath, [modulePath, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
  });
  if (result.status === 0) {
    record(name, 'pass', 'passed');
    return true;
  }
  const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim().split(/\r?\n/).slice(-6).join(' | ');
  record(name, advisory ? 'warn' : 'fail', output || `exited with ${result.status}`);
  return false;
}

function runCommand(name, command, args = [], { advisory = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
    shell: process.platform === 'win32',
  });
  if (result.status === 0) {
    record(name, 'pass', 'passed');
    return true;
  }
  const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim().split(/\r?\n/).slice(-8).join(' | ');
  record(name, advisory ? 'warn' : 'fail', output || `exited with ${result.status}`);
  return false;
}

function verifyRequiredFiles() {
  const files = [
    'public/assets/models/humanoid-base.glb',
    'public/assets/models/humanoid-base-lite.glb',
    'src/components/ChamberCanvas.jsx',
    'src/components/morphEngine/ProceduralHumanoid.jsx',
    'src/components/morphEngine/HumanoidClone.jsx',
    'src/components/morphEngine/PostProcessingStack.jsx',
    'src/components/body3d/physicalSkinMaterial.js',
    'src/lib/rendererQualityGate.js',
  ];
  const missing = files.filter((file) => !existsSync(path.join(projectRoot, file)));
  record('Renderer assets', missing.length ? 'fail' : 'pass', missing.length ? `missing ${missing.join(', ')}` : 'all required runtime files are present');
}

function verifySecurityHeaders() {
  const headerPath = path.join(projectRoot, 'public/_headers');
  const source = existsSync(headerPath) ? readFileSync(headerPath, 'utf8') : '';
  const required = ['Content-Security-Policy:', 'X-Content-Type-Options: nosniff', 'X-Frame-Options: DENY', 'Referrer-Policy:'];
  const missing = required.filter((header) => !source.includes(header));
  record('Browser security policy', missing.length ? 'fail' : 'pass', missing.length ? `missing ${missing.join(', ')}` : 'CSP, anti-sniffing, frame and referrer protections are configured');
}

function verifyOfflineModelRuntime() {
  const loaderPath = path.join(projectRoot, 'src/components/morphEngine/useModelLoader.js');
  const source = readFileSync(loaderPath, 'utf8');
  const remoteDecoder = /https?:\/\/[^'"`]+(?:draco|decoder)/i.exec(source);
  record(
    'Offline model runtime',
    remoteDecoder ? 'fail' : 'pass',
    remoteDecoder ? `remote decoder dependency found: ${remoteDecoder[0]}` : 'GLBs and their loader require no remote decoder',
  );
}

function verifyDesktopSecurity() {
  const source = readFileSync(path.join(projectRoot, 'desktop.js'), 'utf8');
  const preload = path.join(projectRoot, 'preload.cjs');
  const failures = [];
  if (!/nodeIntegration:\s*false/.test(source)) failures.push('Node integration is not disabled');
  if (!/contextIsolation:\s*true/.test(source)) failures.push('context isolation is not enabled');
  if (!/sandbox:\s*true/.test(source)) failures.push('renderer sandbox is not enabled');
  if (!existsSync(preload)) failures.push('allowlisted preload bridge is missing');
  record('Electron renderer isolation', failures.length ? 'fail' : 'pass', failures.length ? failures.join(' · ') : 'Node disabled, context isolated, sandboxed, preload allowlisted');
}

function verifyNoSimulatedFinanceMutation() {
  const source = readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
  const route = source.match(/app\.post\('\/api\/finance\/sync\/bank'[\s\S]*?\n\}\);/i)?.[0] || '';
  const unsafe = /Math\.random|createMany|Mock\)/.test(route);
  record('Finance connector honesty', route && !unsafe ? 'pass' : 'fail', route ? (unsafe ? 'bank sync still writes simulated data' : 'unconfigured sync is non-mutating') : 'bank sync route missing');
}

function verifyBundleBudgets() {
  const assetDir = path.join(projectRoot, 'dist/assets');
  if (!existsSync(assetDir)) {
    record('3D bundle budget', 'fail', 'production assets were not generated');
    return;
  }
  const assets = readdirSync(assetDir).map((name) => ({ name, bytes: statSync(path.join(assetDir, name)).size }));
  const three = assets.find((asset) => asset.name.startsWith('three-vendor-'));
  const chamber = assets.find((asset) => asset.name.startsWith('ChamberCanvas-'));
  const failures = [];
  if (!three || three.bytes > 1_350_000) failures.push(`Three vendor ${three ? Math.round(three.bytes / 1024) : 'missing'} KB`);
  if (!chamber || chamber.bytes > 90_000) failures.push(`Chamber ${chamber ? Math.round(chamber.bytes / 1024) : 'missing'} KB`);
  record('3D bundle budget', failures.length ? 'fail' : 'pass', failures.length ? failures.join(' · ') : `Three ${Math.round(three.bytes / 1024)} KB · chamber ${Math.round(chamber.bytes / 1024)} KB`);
}

console.log('\nGrowthTrack Release Quality Gate\n');
verifyRequiredFiles();
verifySecurityHeaders();
verifyOfflineModelRuntime();
verifyDesktopSecurity();
verifyNoSimulatedFinanceMutation();

runCommand('TypeScript', 'npm', ['run', 'typecheck']);
runCommand('Source lint', 'npm', ['run', 'lint']);
runCommand('Prisma schema', 'npx', ['prisma', 'validate']);
runCommand('Production dependency audit', 'npm', ['run', 'security:audit']);

runNode('Renderer lint', path.join(projectRoot, 'node_modules/eslint/bin/eslint.js'), [
  'src/components/ChamberCanvas.jsx',
  'src/components/morphEngine/HumanoidClone.jsx',
  'src/components/morphEngine/UberShader.js',
  'src/components/morphEngine/PostProcessingStack.jsx',
  'src/components/morphEngine/CameraRig.jsx',
  'src/components/body3d/physicalSkinMaterial.js',
  'src/lib/rendererQualityGate.js',
  'src/store/use3DStore.js',
]);
runNode('Automated regression suite', path.join(projectRoot, 'node_modules/vitest/vitest.mjs'), ['--run']);
runNode('Production build', path.join(projectRoot, 'node_modules/vite/bin/vite.js'), ['build']);
verifyBundleBudgets();
runNode('Strict authored GLB', path.join(projectRoot, 'scripts/validate-glb.js'));
runNode('Strict mobile GLB', path.join(projectRoot, 'scripts/validate-glb.js'), ['public/assets/models/humanoid-base-lite.glb']);

const blockingFailures = results.filter((result) => result.status === 'fail');
const advisories = results.filter((result) => result.status === 'warn');
console.log(`\nResult: ${blockingFailures.length ? 'BLOCKED' : 'RELEASE READY'} · ${results.length - blockingFailures.length - advisories.length}/${results.length} passed · ${advisories.length} advisory\n`);
process.exit(blockingFailures.length ? 1 : 0);

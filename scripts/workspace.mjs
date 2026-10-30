/**
 * GrowthTrack Workspace Launcher
 *
 * Usage: node scripts/workspace.mjs [target...]
 * Targets: gateway | ultimate | finsync | oxfin | family | equity | forex
 *
 * Default (no args): gateway + ultimate
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { createRequire } from 'node:module';
import { PRODUCT_UI_ROOT } from '../growthtrack-ultimate/src/config/products.js';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(root, 'growthtrack-ultimate/package.json'));
const readEnv = file => fs.existsSync(file) ? require('dotenv').parse(fs.readFileSync(file)) : {};
const oxfinEnvironment = readEnv(path.join(root, 'FinSync/OxFin/ox-fin-web/.env.local'));
const oxfinDatabaseUrl = oxfinEnvironment.DATABASE_URL ? new URL(oxfinEnvironment.DATABASE_URL) : null;
if (oxfinDatabaseUrl) oxfinDatabaseUrl.port = process.env.OXFIN_DB_PORT || '5434';
const nextEnvironment = id => ({ PORT: { finsync: '5101', oxfin: '5102', equity: '5105' }[id], NEXT_PUBLIC_BASE_PATH: `${PRODUCT_UI_ROOT}/${id}`, NEXT_PUBLIC_API_BASE: `/api/${id}` });

// ── Per-product ANSI colours ──────────────────────────────────────────────────
const COLORS = {
  gateway: '\x1b[36m',  // cyan
  ultimate: '\x1b[32m', // green
  finsync:  '\x1b[32m', // green
  oxfin:    '\x1b[34m', // blue
  family:   '\x1b[33m', // yellow
  equity:   '\x1b[35m', // magenta
  forex:    '\x1b[35m', // magenta
  studio:   '\x1b[33m', // yellow
  reset:    '\x1b[0m',
  dim:      '\x1b[2m',
  bold:     '\x1b[1m',
};

// ── Product process map ───────────────────────────────────────────────────────
// Next.js accepts port via -p flag, Vite via --port flag.
// We set PORT env too for anything that reads process.env.PORT.
const COMMANDS = {
  gateway: {
    cwd: root,
    command: 'node',
    args: ['scripts/gateway.mjs'],
    env: {},
    uiUrl: 'http://127.0.0.1:5300',
    ports: [5300],
    healthUrls: ['http://127.0.0.1:5300/health'],
  },
  ultimate: {
    cwd: path.join(root, 'growthtrack-ultimate'),
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    env: { GROWTHTRACK_WORKSPACE: '1', GATEWAY_URL: 'http://127.0.0.1:5300', LISTEN_HOST: '127.0.0.1' },
    uiUrl:  'http://127.0.0.1:5000/Ultimate/',
    apiUrl: 'http://127.0.0.1:3001',
    ports: [3001, 5000],
    healthUrls: ['http://127.0.0.1:3001/api/health', 'http://127.0.0.1:5000/Ultimate/'],
  },
  finsync: {
    // FinSync workspace uses `web:dev` script to start apps/web
    cwd: path.join(root, 'FinSync'),
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev', '--workspace=apps/web', '--', '--hostname', '127.0.0.1'],
    env: nextEnvironment('finsync'),
    uiUrl: `http://localhost:5000${PRODUCT_UI_ROOT}/finsync/`,
    ports: [5101],
    healthUrls: [`http://127.0.0.1:5101${PRODUCT_UI_ROOT}/finsync/`],
  },
  oxfin: {
    cwd: path.join(root, 'FinSync', 'OxFin', 'ox-fin-web'),
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev', '--', '-p', '5102', '--hostname', '127.0.0.1'],
    env: { ...nextEnvironment('oxfin'), ...(oxfinDatabaseUrl ? { DATABASE_URL: oxfinDatabaseUrl.href } : {}), REDIS_URL: 'redis://127.0.0.1:6381', NEXTAUTH_URL: 'http://localhost:5000/api/oxfin/auth' },
    uiUrl: `http://localhost:5000${PRODUCT_UI_ROOT}/oxfin/`,
    ports: [5102],
    healthUrls: [`http://127.0.0.1:5102${PRODUCT_UI_ROOT}/oxfin/`],
  },
  family: {
    cwd: path.join(root, 'Family Connect', 'familyconnect', 'frontend'),
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev', '--', '--port', '5104', '--host', '127.0.0.1', '--strictPort'],
    env: { VITE_BASE_PATH: `${PRODUCT_UI_ROOT}/family/`, VITE_API_BASE: '/api/family' },
    uiUrl: `http://localhost:5000${PRODUCT_UI_ROOT}/family/`,
    ports: [5104],
    healthUrls: [`http://127.0.0.1:5104${PRODUCT_UI_ROOT}/family/`],
  },
  'family-api': {
    cwd: path.join(root, 'Family Connect/familyconnect/backend'),
    command: process.execPath,
    args: ['node_modules/ts-node/dist/bin.js', 'src/index.ts'],
    env: { PORT: '3104', REDIS_URL: 'redis://127.0.0.1:6381' },
    apiUrl: 'http://127.0.0.1:5300/api/family/health',
    ports: [3104], healthUrls: ['http://127.0.0.1:3104/health'],
  },
  equity: {
    cwd: path.join(root, 'Equity', 'NiftyLens'),
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev', '--', '-p', '5105', '--hostname', '127.0.0.1'],
    env: nextEnvironment('equity'),
    uiUrl: `http://localhost:5000${PRODUCT_UI_ROOT}/equity/`,
    ports: [5105],
    healthUrls: [`http://127.0.0.1:5105${PRODUCT_UI_ROOT}/equity/`],
  },
  forex: {
    cwd: path.join(root, 'Forex'),
    command: process.platform === 'win32' ? path.join(root, 'Forex', '.venv', 'Scripts', 'python.exe') : path.join(root, 'Forex', '.venv', 'bin', 'python'),
    args: ['-m', 'streamlit', 'run', 'app/dashboard.py', '--server.port', '8501', '--server.address', '127.0.0.1', '--server.baseUrlPath', `${PRODUCT_UI_ROOT}/forex`, '--server.headless', 'true'],
    env: { PYTHONPATH: path.join(root, 'Forex'), DATA_PATH: 'Dataset/Forex_Data.csv', MODEL_DIR: 'outputs' },
    uiUrl: `http://localhost:5000${PRODUCT_UI_ROOT}/forex/`,
    ports: [8501],
    healthUrls: [`http://127.0.0.1:8501${PRODUCT_UI_ROOT}/forex/_stcore/health`],
  },
  'forex-api': {
    cwd: path.join(root, 'Forex'),
    command: process.platform === 'win32' ? path.join(root, 'Forex/.venv/Scripts/python.exe') : path.join(root, 'Forex/.venv/bin/python'),
    args: ['-m', 'uvicorn', 'src.api.app:app', '--host', '127.0.0.1', '--port', '8000', '--root-path', '/api/forex'],
    env: { PYTHONPATH: path.join(root, 'Forex'), MODEL_DIR: 'outputs', DATA_PATH: 'Dataset/Forex_Data.csv' },
    apiUrl: 'http://127.0.0.1:5300/api/forex/docs',
    ports: [8000], healthUrls: ['http://127.0.0.1:8000/health'],
  },
  studio: {
    cwd: path.join(root, 'growthtrack-ultimate'),
    command: 'node',
    args: ['scripts/db-studio.mjs'],
    env: { DB_STUDIO_PORT: '5556' },
    uiUrl: 'http://localhost:5556',
    ports: [5556],
    healthUrls: ['http://127.0.0.1:5556/api/tables'],
  },
};

// Windows cannot reliably spawn npm.cmd with shell:false on every Node build.
// Invoke npm's CLI through the active Node executable instead.
if (process.platform === 'win32') {
  const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  for (const spec of Object.values(COMMANDS)) {
    if (spec.command === 'npm.cmd') {
      spec.command = process.execPath;
      spec.args = [npmCli, ...spec.args];
    }
  }
}

function portInUse(port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const done = used => { socket.destroy(); resolve(used); };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(250, () => done(true));
  });
}
async function serviceHealthy(url) {
  try { const response = await fetch(url, { signal: AbortSignal.timeout(5000) }); return response.ok; } catch { return false; }
}

// ── Parse targets ─────────────────────────────────────────────────────────────
const names = process.argv.slice(2).map(n => n.toLowerCase());
const selected = [...new Set((names.length ? names : ['gateway', 'ultimate', 'studio', 'family-api', 'forex-api']).flatMap(name => name === 'family' ? ['family-api', name] : name === 'forex' ? ['forex-api', name] : [name]))];

const unknown = selected.filter(n => !COMMANDS[n]);
if (unknown.length) {
  console.error(`\x1b[31mUnknown targets: ${unknown.join(', ')}\x1b[0m`);
  console.error(`Valid: ${Object.keys(COMMANDS).join(', ')}`);
  process.exitCode = 1;
  process.exit(1);
}

// ── Banner ────────────────────────────────────────────────────────────────────
console.log(`\n${COLORS.bold}${COLORS.reset}🚀 ${COLORS.bold}GrowthTrack Workspace${COLORS.reset}\n`);
for (const name of selected) {
  const spec = COMMANDS[name];
  const color = COLORS[name] || '';
  const url = spec.uiUrl || spec.apiUrl || '';
  if (spec.manual) {
    console.log(`  ${color}[${name}]${COLORS.reset} ${COLORS.dim}⚠ manual — ${spec.manual}${COLORS.reset}`);
  } else {
    console.log(`  ${color}[${name}]${COLORS.reset}${url ? `  →  ${COLORS.dim}${url}${COLORS.reset}` : ''}`);
  }
}
console.log('');

// ── Launch ────────────────────────────────────────────────────────────────────
const procs = [];
const MAX_LABEL = Math.max(...selected.map(n => n.length));

for (const name of selected) {
  const spec = COMMANDS[name];
  if (spec.manual) continue; // user must start manually

  if (!fs.existsSync(spec.cwd)) {
    console.error(`${COLORS[name] || ''}[${name}]${COLORS.reset} ${COLORS.dim}directory not found: ${spec.cwd}${COLORS.reset}`);
    process.exitCode = 1;
    continue;
  }

  const packageFile = path.join(spec.cwd, 'package.json');
  const dependencyMarker = fs.existsSync(packageFile) ? path.join(spec.cwd, 'node_modules', '.bin') : null;
  if (spec.command.endsWith('npm') || spec.command.endsWith('npm.cmd')) {
    if (dependencyMarker && !fs.existsSync(dependencyMarker)) {
    console.error(`${COLORS[name] || ''}[${name}]${COLORS.reset} \x1b[31mdependencies are not installed in ${spec.cwd}. Run npm install there, then rerun this launcher.\x1b[0m`);
    process.exitCode = 1;
    continue;
    }
  }

  const occupied = [];
  for (const port of spec.ports || []) if (await portInUse(port)) occupied.push(port);
  if (occupied.length) {
    const healthy = await Promise.all((spec.healthUrls || []).map(serviceHealthy));
    if (occupied.length === spec.ports.length && healthy.length && healthy.every(Boolean)) console.warn(`${COLORS[name] || ''}[${name}]${COLORS.reset} ${COLORS.dim}already running and healthy on port${occupied.length > 1 ? 's' : ''} ${occupied.join(', ')} — reusing the existing service.${COLORS.reset}`);
    else { console.error(`${COLORS[name] || ''}[${name}]${COLORS.reset} \x1b[31mport conflict on ${occupied.join(', ')} but the existing service is unhealthy or has old routing. Restart it before relaunching.${COLORS.reset}`); process.exitCode = 1; }
    continue;
  }

  const child = spawn(spec.command, spec.args, {
    cwd:   spec.cwd,
    shell: false,
    stdio: 'inherit',
    env:   { ...process.env, FORCE_COLOR: '1', ...spec.env },
  });

  procs.push(child);

  child.on('error', err => {
    console.error(`${COLORS[name] || ''}[${name}]${COLORS.reset} \x1b[31mFailed to start: ${err.message}\x1b[0m`);
    if (err.code === 'ENOENT') {
      console.error(`${COLORS[name] || ''}[${name}]${COLORS.reset} ${COLORS.dim}Is "${spec.command}" installed and on PATH?${COLORS.reset}`);
    }
  });

  child.on('exit', code => {
    if (code && code !== 0) {
      console.error(`${COLORS[name] || ''}[${name}]${COLORS.reset} \x1b[31mexited with code ${code}\x1b[0m`);
      process.exitCode = code;
    }
  });
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown() {
  console.log(`\n${COLORS.dim}Stopping all processes…${COLORS.reset}`);
  for (const p of procs) { if (!p.killed) p.kill('SIGTERM'); }
  setTimeout(() => process.exit(0), 1500);
}
process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

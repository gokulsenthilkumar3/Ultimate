import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url)), dist = path.join(root, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(dist, '.vite/manifest.json'), 'utf8'));
function closure(key, seen = new Set()) { if (seen.has(key)) return seen; seen.add(key); for (const dependency of manifest[key]?.imports || []) closure(dependency, seen); return seen; }
const keys = [...closure('index.html')];
const files = [...new Set(keys.flatMap(key => [manifest[key]?.file, ...(manifest[key]?.css || [])]).filter(Boolean))];
const size = file => gzipSync(fs.readFileSync(path.join(dist, file))).length;
const js = files.filter(file => file.endsWith('.js')), css = files.filter(file => file.endsWith('.css'));
const fonts = fs.readdirSync(path.join(dist, 'assets')).filter(file => /\.(woff2?|ttf|otf)$/.test(file));
const appSource = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
const routeSources = new Set([...appSource.matchAll(/lazy\(\(\) => import\('\.\/([^']+)'\)\)/g)].map(match => `src/${match[1]}`));
const routeFiles = Object.entries(manifest).filter(([key, value]) => value.isDynamicEntry && routeSources.has(key.replace(/\.[jt]sx?$/, '')));
const oversizedRoutes = routeFiles.map(([key, value]) => ({ key, gzipBytes: size(value.file) })).filter(route => route.gzipBytes >= 90000);
const graph = JSON.parse(fs.readFileSync(path.join(dist, '.vite/kinetic-graph.json'), 'utf8'));
const forbidden = js.flatMap(file => (graph.chunks[file]?.heavyModules || []).map(module => ({ file, module })));
const initialJS = js.reduce((sum, file) => sum + size(file), 0), criticalCSS = css.reduce((sum, file) => sum + size(file), 0);
const gates = { initialJS: initialJS < 180000, criticalCSS: criticalCSS < 45000, fonts: fonts.length <= 2, routeChunks: oversizedRoutes.length === 0, lazyHeavyDependencies: forbidden.length === 0 };
const report = { gates, initialJS, criticalCSS, fonts, oversizedRoutes, forbidden, entryChunks: js.map(file => ({ file, gzipBytes: size(file) })), cssChunks: css.map(file => ({ file, gzipBytes: size(file) })), browserMetrics: 'separate browser verification required' };
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes('--check') && Object.values(gates).some(pass => !pass)) process.exitCode = 1;

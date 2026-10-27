// Render the real companion components with explicit, read-only identity adapters.
// This server is test-only: it cannot authenticate to, or mutate, a product service.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const root = fileURLToPath(new URL('../../', import.meta.url));
const host = path.join(root, 'growthtrack-ultimate');
const require = createRequire(path.join(host, 'package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const ts = require('typescript');
const fixtureRoot = path.join(host, 'tests/companion-ui');
const product = process.argv[2];
if (!['finsync', 'oxfin'].includes(product)) throw new Error('Choose finsync or oxfin.');
const source = path.join(root, product === 'finsync' ? 'FinSync/apps/web' : 'FinSync/OxFin/ox-fin-web/src');
const app = path.join(source, 'app');
const routes = [];
async function visit(dir) { for (const item of await fs.readdir(dir, { withFileTypes: true })) { if (item.isDirectory() && item.name !== 'api') await visit(path.join(dir, item.name)); else if (item.name === 'page.tsx') routes.push(path.relative(app, path.join(dir, item.name)).replaceAll('\\', '/')); } }
await visit(app);
const file = value => `/@fs/${value.replaceAll('\\', '/')}`;
const imports = routes.map((route, i) => `import Page${i} from ${JSON.stringify(file(path.join(app, route)))};`).join('\n');
const pageMap = routes.map((route, i) => `${JSON.stringify('/' + route.replace(/\/?page.tsx$/, ''))}:Page${i}`).join(',');
const wrapperImport = product === 'finsync' ? `import Layout from ${JSON.stringify(file(path.join(app, 'dashboard/layout.tsx')))};` : `import Navigation from ${JSON.stringify(file(path.join(source, 'components/layout/NavigationRail.tsx')))};`;
const wrapper = product === 'finsync' ? `location.pathname.startsWith('/dashboard') ? <Layout><Page /></Layout> : <Page />` : `<div className="flex min-h-screen bg-background text-foreground"><Navigation /><main className="oxfin-main flex-1 lg:pl-64"><Page /></main></div>`;
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import ${JSON.stringify(file(path.join(app, 'globals.css')))};${wrapperImport}\n${imports}\nconst pages={${pageMap}};const Page=pages[location.pathname]||pages['/'];createRoot(document.getElementById('root')).render(${wrapper});`;
const identity = path.join(fixtureRoot, 'identity.js');
const productRequire = createRequire(path.join(source, product === 'finsync' ? 'package.json' : '../package.json'));
const plugins = [];
if (product === 'oxfin') { const postcss = await import(pathToFileURL(productRequire.resolve('@tailwindcss/postcss')).href); plugins.push(postcss.default({ base: source })); }
const server = await createServer({
  configFile: false, root: fixtureRoot,
  plugins: [{ name: 'isolated-companion-entry', resolveId: id => id === '/entry.jsx' ? '\0entry.jsx' : undefined, load: id => id === '\0entry.jsx' ? ts.transpileModule(entry, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText : undefined }],
  cacheDir: path.join(host, 'node_modules/.vite', `companion-${product}`),
  resolve: { alias: [
    { find: '@/lib/firebase', replacement: identity }, { find: 'firebase/firestore', replacement: path.join(fixtureRoot, 'firestore.js') }, { find: 'firebase/auth', replacement: identity },
    { find: 'next-auth/react', replacement: identity }, { find: 'next/navigation', replacement: path.join(fixtureRoot, 'next-navigation.js') },
    { find: 'next/link', replacement: path.join(fixtureRoot, 'next-link.jsx') }, { find: 'next/image', replacement: path.join(fixtureRoot, 'next-image.jsx') },
    { find: '@/packages', replacement: path.join(root, 'FinSync/packages') },
    { find: '@', replacement: source }, { find: /^react$/, replacement: require.resolve('react') }, { find: /^react-dom\/client$/, replacement: require.resolve('react-dom/client') },
    { find: /^react-dom$/, replacement: require.resolve('react-dom') }, { find: /^react\/jsx-runtime$/, replacement: require.resolve('react/jsx-runtime') },
  ], dedupe: ['react', 'react-dom'] },
  esbuild: { jsx: 'automatic' }, define: { 'process.env.NODE_ENV': '"development"', 'process.env': '{}' },
  css: { postcss: { plugins } }, server: { host: '127.0.0.1', port: product === 'finsync' ? 5571 : 5572, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
console.log(`Read-only ${product} UI fixtures: http://127.0.0.1:${product === 'finsync' ? 5571 : 5572}`);

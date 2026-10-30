/** Documentation-only source inventory. Reads production src; never environments or records. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { FEATURES } from '../growthtrack-ultimate/src/config/featureRegistry.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const src = path.join(root, 'growthtrack-ultimate/src');
const require = createRequire(path.join(root, 'growthtrack-ultimate/package.json'));
const ts = require('typescript');
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const cell = text => String(text).replaceAll('&', '&amp;').replaceAll('|', '&#124;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('`', '&#96;').replace(/\s+/g, ' ').trim();
const sourceLink = (file, line) => `[${relative(file).replace('growthtrack-ultimate/src/', '')}:${line}](../${relative(file)}#L${line})`;
function resolve(from, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), specifier);
  for (const file of [base, ...['.js', '.jsx', '.ts', '.tsx', '.css', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'].map(extension => base + extension)]) {
    if (!file.startsWith(src + path.sep) || !/\.(?:[jt]sx?|css)$/.test(file) || /(?:\.test\.|\/admin-demo\/|\/test-setup\/)/.test(file.replaceAll('\\', '/'))) continue;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}
const queue = [path.join(src, 'main.jsx'), path.join(src, 'App.jsx')];
const seen = new Set(), controls = [], links = [], fields = [], forms = [], tabs = [], interactions = [], animations = [], fonts = new Map(), colors = new Map();
function addFont(value, file, line) {
  const key = value.replace(/\s+/g, ' ').trim();
  if (!fonts.has(key)) fonts.set(key, []);
  fonts.get(key).push({ file, line });
}
while (queue.length) {
  const file = queue.shift();
  if (seen.has(file)) continue;
  seen.add(file);
  const source = fs.readFileSync(file, 'utf8');
  const lineAt = position => source.slice(0, position).split('\n').length;
  for (const match of source.matchAll(/#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{4}\b|#[\da-f]{3}\b|(?:rgba?|hsla?)\([\d\s,./%]+\)/gi)) {
    const value = match[0].toLowerCase().replace(/\s+/g, ' ');
    if (!colors.has(value)) colors.set(value, []);
    colors.get(value).push({ file, line: lineAt(match.index) });
  }
  if (file.endsWith('.css')) {
    for (const match of source.matchAll(/@import\s+['"]([^'"]+)['"]/g)) { const dependency = resolve(file, match[1]); if (dependency) queue.push(dependency); }
    for (const match of source.matchAll(/font-family\s*:\s*([^;}\n]+)/g)) addFont(match[1], file, lineAt(match.index));
    for (const match of source.matchAll(/(?:^|[;{])\s*font\s*:\s*([^;}\n]+)/g)) addFont(`font shorthand: ${match[1]}`, file, lineAt(match.index));
    for (const match of source.matchAll(/@keyframes\s+([\w-]+)/g)) animations.push({ name: match[1], file, line: lineAt(match.index) });
    continue;
  }
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const expression = value => {
    if (!value) return '';
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
    if (ts.isJsxExpression(value)) return value.expression ? `{${value.expression.getText(tree)}}` : '';
    return value.getText(tree);
  };
  const visible = node => {
    if (ts.isJsxText(node)) return node.text.trim();
    if (ts.isJsxExpression(node)) return expression(node);
    if (ts.isJsxElement(node)) return node.children.map(visible).filter(Boolean).join(' ');
    return '';
  };
  const attr = (opening, name) => expression(opening.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(tree) === name)?.initializer);
  const shorten = value => String(value).replace(/\s+/g, ' ').trim().slice(0, 220);
  function formAction(node) {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (ts.isJsxElement(parent) && parent.openingElement.tagName.getText(tree) === 'form') return attr(parent.openingElement, 'onSubmit');
    }
    return '';
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const dependency = resolve(file, node.moduleSpecifier.text); if (dependency) queue.push(dependency);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) {
      const dependency = resolve(file, node.arguments[0].text); if (dependency) queue.push(dependency);
    }
    if (ts.isPropertyAssignment(node) && node.name.getText(tree).replaceAll(/['"]/g, '') === 'fontFamily' && ts.isStringLiteral(node.initializer)) addFont(node.initializer.text, file, lineAt(node.getStart(tree)));
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const tag = opening.tagName.getText(tree);
      const item = { file, line: lineAt(node.getStart(tree)), tag };
      const label = attr(opening, 'aria-label') || attr(opening, 'label') || visible(node) || attr(opening, 'title');
      const button = tag === 'button' || tag.endsWith('.button') || tag === 'Button' || /[A-Z]\w*Button$/.test(tag) || attr(opening, 'role') === 'button';
      const link = ['a', 'Link', 'NavLink'].includes(tag);
      const field = ['input', 'select', 'textarea'].includes(tag) || /(?:Field|Slider|Switch|Picker|Checkbox|Toggle|Combobox|Select)$/.test(tag);
      if (button) {
        const action = attr(opening, 'onClick') || (attr(opening, 'type') === 'submit' || (!attr(opening, 'type') && tag === 'button') ? formAction(node) : '') || '(handler supplied by props/component; follow source)';
        controls.push({ ...item, label: shorten(label || '(label supplied through component props or an icon)'), action: shorten(action) });
      }
      if (link) links.push({ ...item, label: shorten(label || '(child/component label)'), destination: shorten(attr(opening, 'to') || attr(opening, 'href') || '(supplied through props)') });
      if (field) fields.push({ ...item, label: shorten(attr(opening, 'aria-label') || attr(opening, 'label') || attr(opening, 'name') || attr(opening, 'id') || attr(opening, 'placeholder') || '(label/legend supplied by parent)'), type: shorten(attr(opening, 'type') || tag), action: shorten(attr(opening, 'onChange') || attr(opening, 'onValueChange') || '(native form or component props)') });
      if (tag === 'form') forms.push({ ...item, label: shorten(attr(opening, 'aria-label') || attr(opening, 'id') || '(page-owned form)'), action: shorten(attr(opening, 'onSubmit') || attr(opening, 'action') || '(native/default form)') });
      if (tag === 'Tabs' || attr(opening, 'role') === 'tablist') tabs.push({ ...item, label: shorten(attr(opening, 'label') || attr(opening, 'aria-label') || '(page-owned tabs)'), definition: shorten(attr(opening, 'tabs') || attr(opening, 'items') || '(inline buttons; see button render sites)') });
      if (!button && !link && !field && tag !== 'form') {
        const events = ['onClick', 'onDoubleClick', 'onDrop', 'onKeyDown', 'onPointerDown'].flatMap(name => attr(opening, name) ? [`${name}: ${attr(opening, name)}`] : []);
        if (events.length) interactions.push({ ...item, label: shorten(label || attr(opening, 'className') || '(page-owned interactive surface)'), action: shorten(events.join('; ')) });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
}
controls.sort((a, b) => relative(a.file).localeCompare(relative(b.file)) || a.line - b.line);
for (const items of [links, fields, forms, tabs, interactions]) items.sort((a, b) => relative(a.file).localeCompare(relative(b.file)) || a.line - b.line);
animations.sort((a, b) => a.name.localeCompare(b.name) || relative(a.file).localeCompare(relative(b.file)));
const group = feature => ['customers', 'finsync', 'oxfin'].includes(feature.id) ? 'Customers' : feature.id === 'forex' ? 'Finance' : ({ finance: 'Finance', insights: 'Insights', wellness: 'Growth', workspace: 'Work', life: 'Life', hub: 'Platform' })[feature.area];
const groups = ['Customers', 'Finance', 'Growth', 'Work', 'Life', 'Insights', 'Platform'];
const routes = groups.flatMap(area => FEATURES.filter(feature => group(feature) === area).map(feature => `| ${area} | ${feature.label} | \`${feature.canonicalPath}\` | ${feature.views.length ? feature.views.map(view => `\`${view}\``).join(', ') : 'No registered sub-view'} | ${feature.template}; ${feature.availability} |`));
const block = ['<!-- BEGIN GENERATED UI ROUTES -->', '', `The registry currently contains **${FEATURES.length} module definitions**. This is a source inventory, not rendered coverage. View IDs are listed exactly as registered; see the implementation-status notes above and the page workflows below. A registry value of ready is metadata, not a live-service or visual-test result.`, '', 'A supported view uses a query such as `/wellness/physique?view=measurements`. Not every page currently binds every registered view to its own distinct panel. Public pages `/welcome`, `/login`, `/privacy` and `/terms`, overlays and nested 3D controls are additional surfaces outside these module definitions.', '', '| Navigation area | Module | Canonical path | Registered view IDs | Template; availability metadata |', '| --- | --- | --- | --- | --- |', ...routes, '', '<!-- END GENERATED UI ROUTES -->'].join('\n');
const guidePath = path.join(root, 'docs/UI_WORKFLOW_AND_STYLE_GUIDE.md');
const original = fs.readFileSync(guidePath, 'utf8').replaceAll('\r\n', '\n');
const guide = original.replace(/<!-- BEGIN GENERATED UI ROUTES -->[\s\S]*?<!-- END GENERATED UI ROUTES -->/, block);
if (!original.includes('<!-- BEGIN GENERATED UI ROUTES -->')) throw new Error('UI guide route markers are missing.');
const inventoryPath = path.join(root, 'docs/UI_CONTROL_INVENTORY.md');
const inventory = [
  '# UI control, font and animation source inventory', '',
  'Generated by `node scripts/ui-guide-inventory.mjs`. Read [the full UI workflow and style guide](UI_WORKFLOW_AND_STYLE_GUIDE.md) first.', '',
  `Scope: ${seen.size} local production source modules reachable from Ultimate main/App through literal imports. This includes lazy imports and imported stylesheets. It excludes the isolated admin demo, tests, dependencies, server files, environment files and application records.`, '',
  `The tables contain ${controls.length} button/component render sites, ${links.length} link render sites, ${fields.length} field render sites, ${forms.length} form render sites, ${tabs.length} tab-group render sites and ${animations.length} CSS keyframe declarations. They are not visible-button counts, unique runtime actions, browser coverage or a claim that all legacy styles are active. A mapped control represents its render site; its labels and instances depend on page data. Expressions are shown as source expressions, abbreviated at 220 characters. Follow the source link for the handler and full expression.`, '',
  'This is a static literal-import inventory. Computed imports, runtime DOM construction, controls implemented inside third-party packages, callbacks hidden inside spread props and browser-computed styles require inspection of their owning code/runtime. Native submit buttons inherit the nearest form handler where it can be read. Parent labels, dynamic names and submitted record values are not evaluated; this generator does not read live data.', '',
  '## Button render sites', '', '| Control | Accessible label or visible source text | Click or form-submit handler expression | Source |', '| --- | --- | --- | --- |',
  ...controls.map(item => `| ${cell(item.tag)} | ${cell(item.label)} | ${cell(item.action)} | ${sourceLink(item.file, item.line)} |`), '',
  '## Navigation and action links', '', '| Link | Accessible label or visible source text | Destination expression | Source |', '| --- | --- | --- | --- |',
  ...links.map(item => `| ${cell(item.tag)} | ${cell(item.label)} | ${cell(item.destination)} | ${sourceLink(item.file, item.line)} |`), '',
  '## Form fields and selectors', '', '| Field/component | Label, name or source identifier | Type | Change handler expression | Source |', '| --- | --- | --- | --- | --- |',
  ...fields.map(item => `| ${cell(item.tag)} | ${cell(item.label)} | ${cell(item.type)} | ${cell(item.action)} | ${sourceLink(item.file, item.line)} |`), '',
  '## Forms and submit actions', '', '| Form identifier | Submit handler expression | Source |', '| --- | --- | --- |',
  ...forms.map(item => `| ${cell(item.label)} | ${cell(item.action)} | ${sourceLink(item.file, item.line)} |`), '',
  '## Shared and inline tab groups', '', '| Tab group | Definition expression | Source |', '| --- | --- | --- |',
  ...tabs.map(item => `| ${cell(item.label)} | ${cell(item.definition)} | ${sourceLink(item.file, item.line)} |`), '',
  '## Other interactive surfaces', '',
  'These include clickable cards/rows/headers, drop areas, custom component callbacks and backdrop/key handlers. Some are decorative or propagation handlers rather than independent user actions. They are included so native buttons are not mistaken for the entire interaction surface.', '',
  '| Element/component | Label or source context | Handler expression | Source |', '| --- | --- | --- | --- |',
  ...interactions.map(item => `| ${cell(item.tag)} | ${cell(item.label)} | ${cell(item.action)} | ${sourceLink(item.file, item.line)} |`), '',
  '## Font-family and font shorthand declarations', '',
  'These are referenced declarations, including legacy overrides and monospace utilities. They do not prove that every named family has a bundled font file. The current shared interface preloads one Inter Variable Latin WOFF2 covering normal weights 100–900 with font-display: swap; font aliases and fallbacks are explained in the main guide.', '',
  '| Family declaration | Source examples |', '| --- | --- |',
  ...[...fonts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([value, sources]) => `| ${cell(value)} | ${sources.slice(0, 3).map(item => sourceLink(item.file, item.line)).join(', ')}${sources.length > 3 ? `; ${sources.length} sites total` : ''} |`), '',
  '## Colour literal references', '',
  'Shared theme/accent palettes are explained in the main guide. This table also captures retained domain/chart/SVG/3D colour literals and alpha overlays in reachable source. A literal is not a separate selectable palette. These are source references, not a computed-style audit; a matching hexadecimal fragment in source may be an identifier. Variable-derived colours and third-party defaults are not evaluated.', '',
  '| Colour literal | Source examples |', '| --- | --- |',
  ...[...colors.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([value, sources]) => `| ${cell(value)} | ${sources.slice(0, 2).map(item => sourceLink(item.file, item.line)).join(', ')}${sources.length > 2 ? `; ${sources.length} sites total` : ''} |`), '',
  '## CSS keyframe declarations', '',
  'This includes retained legacy/domain keyframes. The main guide identifies the animations used by the current character workflow and their actual durations and gating rules.', '',
  '| Keyframes | Source |', '| --- | --- |', ...animations.map(item => `| \`${item.name}\` | ${sourceLink(item.file, item.line)} |`), '',
].join('\n');
const check = process.argv.includes('--check');
for (const [file, content] of [[guidePath, guide], [inventoryPath, inventory]]) {
  for (const match of content.matchAll(/\]\(([^)\n]+)\)/g)) {
    const href = match[1].replace(/^<|>$/g, '').split('#')[0];
    if (!href || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
    const target = path.resolve(path.dirname(file), decodeURIComponent(href));
    if (!fs.existsSync(target)) throw new Error(`Broken UI documentation link in ${relative(file)}: ${href}`);
  }
}
for (const [file, text] of [[guidePath, guide], [inventoryPath, inventory]]) {
  if (check) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n') !== text) throw new Error(`UI documentation drift: ${relative(file)}`);
  } else fs.writeFileSync(file, text);
}
console.log(JSON.stringify({ status: check ? 'verified' : 'generated', modules: FEATURES.length, productionSources: seen.size, buttonRenderSites: controls.length, linkRenderSites: links.length, fieldRenderSites: fields.length, formRenderSites: forms.length, tabGroupRenderSites: tabs.length, otherInteractionRenderSites: interactions.length, fontDeclarations: fonts.size, colorLiterals: colors.size, cssKeyframes: animations.length, browserVerification: 'not-established' }));

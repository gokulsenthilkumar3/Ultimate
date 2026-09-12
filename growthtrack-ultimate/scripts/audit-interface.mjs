import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Source inventory, not an accessibility certification. Dynamic instances need runtime review.
const root = process.cwd();
const phase = process.argv[2] || 'after';
const output = path.join(root, 'docs', 'ui-review');
fs.mkdirSync(output, { recursive: true });
const files = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (/node_modules|dist|__tests__|tests|test-setup/.test(item.name)) continue;
    const target = path.join(dir, item.name);
    if (item.isDirectory()) walk(target);
    else if (/\.(jsx?|tsx?)$/.test(item.name) && !/\.test\./.test(item.name)) files.push(target);
  }
}
walk(path.join(root, 'src'));
const elements = [], messages = [];
const category = tag => /button/i.test(tag) ? 'A Buttons' : /input|textarea|TextField/i.test(tag) ? 'B Fields' : /select|dropdown/i.test(tag) ? 'C Selects' : /date|calendar/i.test(tag) ? 'D Dates' : /checkbox|radio|switch|toggle/i.test(tag) ? 'E Choices' : /slider|range|stepper/i.test(tag) ? 'F Range' : /upload|dropzone/i.test(tag) ? 'G Upload' : /modal|dialog|popover|tooltip|drawer/i.test(tag) ? 'H Overlays' : /table|list|card/i.test(tag) ? 'I Collections' : /nav|tabs|^a$/i.test(tag) ? 'J Navigation' : /toast|alert|empty|loading|skeleton|progress/i.test(tag) ? 'K Feedback' : 'Q Interaction';
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, /tsx$/.test(file) ? ts.ScriptKind.TSX : /jsx$/.test(file) ? ts.ScriptKind.JSX : ts.ScriptKind.TS);
  const location = node => `${path.relative(root, file).replaceAll('\\', '/')}:${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1}`;
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(ast);
      const attrs = node.attributes.getText(ast);
      if (/^(button|input|textarea|select|a|nav|table|summary)$/.test(tag) || /Button|Field|Select|Date|Calendar|Checkbox|Radio|Switch|Toggle|Slider|Upload|Modal|Dialog|Popover|Tooltip|Drawer|Table|List|Card|Tabs|Nav|Toast|Alert|Empty|Loading|Skeleton|Progress/.test(tag) || /onClick|onKeyDown|role=|tabIndex=/.test(attrs)) {
        elements.push({ category: category(tag), element: tag, location: location(node), source: node.getText(ast).replace(/\s+/g, ' ').slice(0, 800), review: 'Source inventoried; runtime states require verification' });
      }
    }
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) && /error|failed|unable|couldn.t|cannot|invalid|required|loading|no .*yet|nothing|empty|try again|saved|success|offline/i.test(node.text)) {
      messages.push({ location: location(node), text: node.text.trim(), status: 'Candidate: classify user-facing versus diagnostic before rewrite' });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
const escape = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ').replaceAll('`', "'");
fs.writeFileSync(path.join(output, `inventory-${phase}.json`), JSON.stringify({ files: files.map(f => path.relative(root, f)), elements, messages }, null, 2));
fs.writeFileSync(path.join(output, `inventory-${phase}.md`), `# Interface inventory (${phase})\n\n${files.length} production source files; ${elements.length} static element instances; ${messages.length} message candidates. Repeated map items count as one source instance. This inventory does not establish correctness. CSS, canvas interactions and server responses require separate review.\n\n| Category | Element | File:Line | Source | Review |\n|---|---|---|---|---|\n` + elements.map(e => `| ${e.category} | ${e.element} | ${e.location} | \`${escape(e.source)}\` | ${e.review} |`).join('\n'));
console.log(JSON.stringify({ phase, files: files.length, elements: elements.length, messages: messages.length }));

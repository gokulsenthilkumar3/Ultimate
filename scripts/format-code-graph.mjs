// The generated graph is Git-ignored. Use Prettier's API to format this one
// explicitly selected artifact without bypassing ignore rules for other files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { format } from 'prettier';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filename = path.join(root, '.code-index/graph.json');
const source = fs.readFileSync(filename, 'utf8');
const formatted = await format(source, {
  parser: 'json',
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
});
if (!isDeepStrictEqual(JSON.parse(source), JSON.parse(formatted)))
  throw new Error('Formatting changed graph data.');
if (process.argv.includes('--check')) {
  if (source !== formatted)
    throw new Error('Graph formatting differs. Run npm run format:graph.');
  console.log('graph.json matches Prettier formatting.');
} else {
  fs.writeFileSync(filename + '.tmp', formatted);
  fs.renameSync(filename + '.tmp', filename);
  console.log(
    'Formatted .code-index/graph.json with Prettier; graph data unchanged.',
  );
}

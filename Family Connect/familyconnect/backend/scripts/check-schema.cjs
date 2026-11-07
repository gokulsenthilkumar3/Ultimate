const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

function schemaShape(text) {
  return [...text.replace(/\/\/[^\n]*/g, '').matchAll(/^(model|enum|datasource)\s+(\w+)\s*\{([\s\S]*?)^\}/gm)]
    .map(([, kind, name, body]) => [kind + ':' + name, body.split('\n').map(line => line.replace(/\s/g, '')).filter(Boolean).sort()])
    .sort(([a], [b]) => a.localeCompare(b));
}
function checkSchema() {
  const root = path.resolve(__dirname, '..');
  const canonical = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
  const generated = fs.readFileSync(path.join(root, 'node_modules/.prisma/client/schema.prisma'), 'utf8');
  assert.deepEqual(schemaShape(generated), schemaShape(canonical), 'Family Prisma client is stale. Stop Family API, run npm run prisma:generate, then rebuild. No migration is performed by this check.');
}
module.exports = { schemaShape, checkSchema };
if (require.main === module) {
  try { checkSchema(); console.log('Family schema and generated client agree.'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

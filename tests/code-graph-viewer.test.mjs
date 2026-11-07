import test from 'node:test';
import assert from 'node:assert/strict';
import { renderGraphHtml } from '../scripts/code-graph-viewer.mjs';

test('offline viewer embeds metadata as inert JSON even when paths contain HTML/script delimiters', () => {
  const file = 'src/</script><img src=x onerror=alert(1)>.js';
  const scope = '</script><script>globalThis.injected = true</script>';
  const html = renderGraphHtml(
    {
      files: { [file]: 'hash' },
      edges: [],
      coverage: [],
      diagnostics: [],
      scope,
      productConnections: [{ from: 'Ultimate', to: 'Invented relationship' }],
    },
    { generatedAt: '2026-11-05T00:00:00Z' },
  );
  const data = html.match(
    /<script id="graph-data" type="application\/json">([\s\S]*?)<\/script>/,
  )[1];
  assert.equal(JSON.parse(data).files[0], file);
  assert.equal(JSON.parse(data).scope, scope);
  assert.equal(Object.hasOwn(JSON.parse(data), 'productConnections'), false);
  assert.ok(!data.includes('<'));
  assert.ok(!html.includes('<img src=x'));
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /script-src 'sha256-/);
  assert.doesNotMatch(html, /<script[^>]+src=/);
});

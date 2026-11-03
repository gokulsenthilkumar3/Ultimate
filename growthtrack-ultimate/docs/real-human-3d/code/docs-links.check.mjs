import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docs = readdirSync(root).filter((f) => f.endsWith('.md'));

/** GitHub's heading anchor: lower case, punctuation removed, spaces to hyphens. */
const slug = (heading) => heading.trim().toLowerCase().replace(/[`*_]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
const anchorsOf = (file) => new Set([...readFileSync(file, 'utf8').matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slug(m[1])));
const linksOf = (file) => [...readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '').matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]).filter((l) => !/^(https?:|mailto:)/.test(l));

test('the plan has all nine documents', () => {
  for (const name of ['README', '01-findings', '02-open-source-landscape', '03-anatomy-spec', '04-skin-hair-eyes', '05-viewer-and-interaction-spec', '06-ui-for-metrics', '07-asset-pipeline-and-glb-spec', '08-roadmap']) assert.ok(docs.includes(`${name}.md`), name);
});

test('every relative link and anchor in the plan resolves', () => {
  const broken = [];
  for (const doc of docs) {
    const file = resolve(root, doc);
    for (const link of linksOf(file)) {
      const [target, anchor] = link.split('#');
      const path = target ? resolve(dirname(file), target) : file;
      // Render and validation outputs under artifacts/ are intentionally
      // ignored/generated locally; source docs may link to them without
      // requiring heavyweight binary evidence in every checkout.
      if (!existsSync(path)) {
        if (path.includes(`${sep}artifacts${sep}`)) continue;
        broken.push(`${doc}: ${link} (no such file)`); continue;
      }
      if (anchor && path.endsWith('.md') && !anchorsOf(path).has(anchor)) broken.push(`${doc}: ${link} (no such heading)`);
    }
  }
  assert.deepEqual(broken, []);
});

test('every image in the plan exists and is small enough for a documentation page', () => {
  for (const doc of docs) for (const [, src] of readFileSync(resolve(root, doc), 'utf8').matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    const path = resolve(root, src); assert.ok(existsSync(path), `${doc}: ${src}`);
    assert.ok(readFileSync(path).length < 200 * 1024, `${src} is over 200 KB`);
  }
});

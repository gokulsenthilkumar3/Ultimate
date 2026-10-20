import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseShareMethod, exportSize, mustRedact, safeFilename } from './share-export.mjs';

test('a 2x still keeps the aspect ratio', () => {
  const r = exportSize(559, 580, { scale: 2 });
  assert.deepEqual([r.width, r.height, r.clamped], [1118, 1160, false]);
});

test('a huge request is clamped to the GPU limit and keeps its aspect ratio', () => {
  const r = exportSize(1920, 1080, { scale: 8 });
  assert.ok(r.clamped && Math.max(r.width, r.height) <= 8192 && r.width * r.height <= 33177600);
  assert.ok(Math.abs(r.width / r.height - 1920 / 1080) < 0.01);
});

test('a smaller GPU texture limit wins', () => {
  assert.ok(exportSize(1000, 1000, { scale: 4, maxTexture: 2048 }).width <= 2048);
});

test('native file sharing is preferred only when the browser says it can share the file', () => {
  const file = { name: 'a.png' };
  assert.equal(chooseShareMethod({ share() {}, canShare: () => true }, file), 'native-files');
  assert.notEqual(chooseShareMethod({ share() {}, canShare: () => false }, file), 'native-files');
  assert.equal(chooseShareMethod({}, file), 'download');
  assert.equal(chooseShareMethod({ share() {}, canShare() { throw new Error('x'); } }, file), 'download');
});

test('private anatomy never reaches a still or a share', () => {
  assert.equal(mustRedact({ privateAnatomyVisible: true, wardrobe: 'ANATOMICAL', exportKind: 'share' }), true);
  assert.equal(mustRedact({ privateAnatomyVisible: false, wardrobe: 'ANATOMICAL', exportKind: 'screenshot' }), true);
  assert.equal(mustRedact({ privateAnatomyVisible: false, wardrobe: 'GYM', exportKind: 'screenshot' }), false);
});

test('filenames are safe', () => {
  assert.equal(safeFilename('My Body / Today!', new Date('2026-10-20T12:00:00Z')), 'my-body-today-2026-10-20.png');
  assert.equal(safeFilename('', new Date('2026-10-20T12:00:00Z')), 'physique-2026-10-20.png');
});

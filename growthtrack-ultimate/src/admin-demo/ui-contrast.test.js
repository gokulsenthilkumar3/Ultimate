import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
const css = fs.readFileSync(path.resolve('src/admin-demo/styles/tokens.css'), 'utf8');

function luminance(hex) {
  const stripped = hex.replace('#', '');
  const raw = stripped.length === 3 ? stripped.split('').map(value => value + value).join('') : stripped;
  const rgb = [0, 2, 4].map(offset => Number.parseInt(raw.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function ratio(a, b) { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + .05) / (values[1] + .05); }
const themes = [...css.matchAll(/(?:^|\n)\.portal(?:\[data-theme="dark"\])?\s*\{([^}]+)\}/g)]
  .map(match => Object.fromEntries([...match[1].matchAll(/(--[\w-]+):\s*(#[a-f\d]{6}\b|#[a-f\d]{3}\b|var\(--[\w-]+\))/gi)].map(([, key, value]) => [key, value])));
function resolve(tokens, name, visited = new Set()) {
  if (visited.has(name)) throw new Error(`Cyclic colour token: ${name}`);
  visited.add(name);
  const value = tokens[name];
  if (!value) throw new Error(`Missing colour token: ${name}`);
  return value.startsWith('var(') ? resolve(tokens, value.slice(4, -1), visited) : value;
}

describe('Readable semantic colours in both UI themes', () => {
  it('checks both the light and dark token sets', () => expect(themes).toHaveLength(2));
  for (const [index, theme] of themes.entries()) {
    const tokens = { ...themes[0], ...theme };
    for (const [foreground, background] of [
      ['--text', '--surface'], ['--text', '--bg'], ['--muted', '--surface'], ['--muted', '--bg'],
      ['--muted', '--surface-subtle'], ['--muted', '--accent-soft'],
      ['--accent', '--surface'], ['--positive', '--accent-soft'], ['--danger', '--surface'],
      ['--amber', '--amber-soft'], ['--sage-text', '--sage'], ['--blue-text', '--blue'],
      ['--peach-text', '--peach'], ['--lilac-text', '--lilac'], ['--sand-text', '--sand'],
      ['--text-3', '--surface'], ['--text-3', '--surface-2'], ['--info', '--info-soft'],
      ['--on-accent', '--accent'], ['--accent', '--bg'],
    ]) it(`${index ? 'dark' : 'light'}: ${foreground} on ${background}`, () => {
      expect(ratio(resolve(tokens, foreground), resolve(tokens, background))).toBeGreaterThanOrEqual(4.5);
    });
    for (const background of ['--surface', '--surface-2']) it(`${index ? 'dark' : 'light'}: input boundary on ${background}`, () => {
      expect(ratio(resolve(tokens, '--input-border'), resolve(tokens, background))).toBeGreaterThanOrEqual(3);
    });
  }
});

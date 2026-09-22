import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('release safety contracts', () => {
  it('keeps the Electron renderer isolated from Node', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'desktop.js'), 'utf8');
    expect(source).toMatch(/nodeIntegration:\s*false/);
    expect(source).toMatch(/contextIsolation:\s*true/);
    expect(source).toMatch(/sandbox:\s*true/);
  });

  it('never writes generated transactions from the bank-sync placeholder', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'server.js'), 'utf8');
    const route = source.match(/app\.post\('\/api\/finance\/sync\/bank'[\s\S]*?\n\}\);/i)?.[0];
    expect(route).toBeTruthy();
    expect(route).not.toMatch(/Math\.random|createMany|Mock\)/);
    expect(route).toMatch(/CONNECTOR_SETUP_REQUIRED/);
  });
});

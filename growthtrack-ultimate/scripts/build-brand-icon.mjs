import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// The checked-in ICO is derived exclusively from the original shared SVG.
// Regenerate after editing it: node scripts/build-brand-icon.mjs
const root = new URL('../', import.meta.url);
const svg = await fs.readFile(new URL('public/favicon.svg', root), 'utf8');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const images = [];
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{display:block;width:100%;height:100%}</style>${svg}`);
    images.push(await page.screenshot({ omitBackground: true }));
    await page.close();
  }
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  for (const [index, size] of sizes.entries()) {
    const entry = 6 + index * 16;
    header[entry] = size === 256 ? 0 : size; header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(images[index].length, entry + 8); header.writeUInt32LE(offset, entry + 12);
    offset += images[index].length;
  }
  const destination = new URL('build/icon.ico', root);
  await fs.writeFile(destination, Buffer.concat([header, ...images]));
  await fs.mkdir(new URL('../.code-index/brand/', root), { recursive: true });
  await fs.writeFile(new URL('../.code-index/brand/growthtrack-icon.png', root), images.at(-1));
  console.log(`Generated ${fileURLToPath(destination)} with ${sizes.join(', ')} px variants.`);
} finally { await browser.close(); }

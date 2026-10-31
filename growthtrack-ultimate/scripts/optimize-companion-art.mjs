// Format/size optimization only; the original image-generator artwork stays intact.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const source = new URL('../../docs/design/assets/personal-companion-v1.png', import.meta.url);
const destination = new URL('../public/assets/illustrations/', import.meta.url);
const bytes = await readFile(source);
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  for (const [name, size] of [['personal-companion-v1.webp', 1280], ['personal-companion-small-v1.webp', 512]]) {
    const output = await page.evaluate(async ({ base64, size }) => {
      const image = new Image(); image.src = 'data:image/png;base64,' + base64; await image.decode();
      if (image.naturalWidth !== image.naturalHeight || image.naturalWidth % 2) throw new Error('Expected a square two-by-two sprite atlas.');
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
      const context = canvas.getContext('2d'); context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, size, size);
      const alpha = context.getImageData(0, 0, 1, 1).data[3];
      if (alpha !== 0) throw new Error('The character sheet must retain its transparent background.');
      const encoded = canvas.toDataURL('image/webp', .88);
      if (!encoded.startsWith('data:image/webp;')) throw new Error('WebP encoding is unavailable.');
      return encoded.split(',')[1];
    }, { base64: bytes.toString('base64'), size });
    const buffer = Buffer.from(output, 'base64'); await writeFile(new URL(name, destination), buffer);
    console.log(`${name}: ${size}×${size}, ${buffer.length} bytes; alpha preserved`);
  }
  console.log(`Master preserved at ${fileURLToPath(source)}`);
} finally { await browser.close(); }

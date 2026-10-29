import { brotliCompress, constants, gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { Buffer } from 'node:buffer';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);

// Compress immutable code at build time instead of spending CPU on each request.
// HTML, source maps, records, uploads and large model assets stay outside this list.
export default function staticCompressionPlugin() {
  return {
    name: 'growthtrack-static-compression',
    apply: 'build',
    async writeBundle(options, bundle) {
      if (!options.dir) throw new Error('Static compression requires a build output directory.');
      await Promise.all(Object.keys(bundle).map(async fileName => {
        if (!/^assets\/[^/]+-[\w-]{6,}\.(?:js|css)$/.test(fileName)) return;
        // Vite finalizes module-preload references after generateBundle hooks.
        // Read the completed output, so sidecars always match the shipped code.
        const file = path.resolve(options.dir, fileName);
        const source = Buffer.from(await readFile(file));
        if (source.length < 1024) return;
        const [br, gz] = await Promise.all([
          compressBrotli(source, { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } }),
          compressGzip(source),
        ]);
        await Promise.all([writeFile(file + '.br', br), writeFile(file + '.gz', gz)]);
      }));
    },
  };
}

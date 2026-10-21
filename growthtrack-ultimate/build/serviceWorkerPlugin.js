import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export function staticBuildVersion(files) {
  return createHash('sha256').update([...files].sort().join('\n')).digest('hex').slice(0, 16);
}

export default function serviceWorkerPlugin() {
  return {
    name: 'growthtrack-static-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const version = staticBuildVersion(Object.keys(bundle));
      const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8').replaceAll('__BUILD_VERSION__', version);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

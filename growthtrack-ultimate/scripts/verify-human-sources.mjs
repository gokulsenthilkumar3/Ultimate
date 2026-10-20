// Developer evidence check. Cached source files are not required by CI;
// archived licence evidence and output GLB hashes are checked by check:assets.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=JSON.parse(fs.readFileSync(path.join(root,'docs/licenses/makehuman-v1.3.0-download-manifest.json')));
const assets=JSON.parse(fs.readFileSync(path.join(root,'docs/licenses/makehuman-system-assets-cc0-extract-manifest.json')));
let checked=0;
for(const [folder,entries,key] of [['.tmp/makehuman-v1.3.0',source.files,'path'],['.tmp/makehuman-cc0-assets',assets.members,'member']]) {
  for(const entry of entries) {
    const file=path.join(root,folder,entry[key]),bytes=fs.readFileSync(file);
    if(bytes.length!==entry.bytes || hash(bytes)!==entry.sha256)throw new Error(`Source evidence mismatch: ${entry[key]}`);
    if(entry.gitBlobSha1 && createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')!==entry.gitBlobSha1)throw new Error(`Git blob mismatch: ${entry[key]}`);
    checked++;
  }
}
console.log(`Verified ${checked} cached source files against pinned source and system-asset manifests.`);

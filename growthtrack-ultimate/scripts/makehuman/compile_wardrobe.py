"""Compile authored CC0 wardrobe sources; never use the older AGPL data cache.

Run after humanoid:fetch / humanoid:compile, then build-wardrobe-assets.mjs.
Requires the same project Python environment (numpy) as the human converter.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import zipfile

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
ARCHIVE_SHA = 'b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107'
SOURCES = {'tee': 'male_casualsuit04', 'sweatshirt': 'male_casualsuit02',
           'shirt': 'male_casualsuit03', 'suit': 'male_elegantsuit01'}


def module(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def main():
    archive = ROOT / '.tmp/makehuman-system-assets/makehuman_system_assets_cc0.zip'
    if hashlib.sha256(archive.read_bytes()).hexdigest() != ARCHIVE_SHA:
        raise ValueError('Wardrobe source archive does not match the approved CC0 pack')
    converter = module('human_converter', ROOT / 'scripts/build-makehuman-glb.py')
    compiler = module('human_sources', ROOT / 'scripts/makehuman/compile_sources.py')
    data = ROOT / '.tmp/makehuman-cc0-compiled'
    body = converter.make_mesh(np.load(data / '3dobjs/base.npz'), np.load(data / 'targets.npz', allow_pickle=True), 0, add_anatomy_detail=True)
    cache = ROOT / '.tmp/wardrobe-cc0'
    output = ROOT / 'public/assets/wardrobe'
    output.mkdir(parents=True, exist_ok=True)
    manifest = {'schemaVersion': 1, 'license': 'CC0-1.0', 'sourceUrl': 'https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html',
                'archiveSha256': ARCHIVE_SHA, 'inputs': [], 'garments': {}}
    notices = []
    with zipfile.ZipFile(archive) as bundle:
        for key, stem in SOURCES.items():
            folder = cache / stem
            folder.mkdir(parents=True, exist_ok=True)
            for suffix in ('.obj', '.mhclo', '.mhmat', '_normal.png', '_diffuse.png'):
                member = f'clothes/{stem}/{stem}{suffix}'
                if suffix == '_normal.png' and member not in bundle.namelist():
                    continue
                content = bundle.read(member)
                if suffix in ('.mhclo', '.mhmat') and b'explicitly released as CC0' not in content:
                    raise ValueError(f'Missing CC0 notice: {member}')
                (folder / (stem + suffix)).write_bytes(content)
                manifest['inputs'].append({'member': member, 'sha256': hashlib.sha256(content).hexdigest(), 'bytes': len(content)})
            source = compiler.load_obj(folder / (stem + '.obj'))
            # MakeHuman's nfaces is per-vertex valence. The accessory converter
            # expects per-polygon corner counts under that same key. Passing
            # valence through dropped the fourth corner of unrelated quads.
            source['nfaces'] = np.where(source['fvert'][:, 0] == source['fvert'][:, 3], 3, 4).astype(np.uint8)
            fitted = converter.fit_proxy(source, folder / (stem + '.mhclo'), body)
            triangle_count = int((source['nfaces'].astype(np.int64) - 2).sum())
            if len(fitted['indices']) != triangle_count * 3:
                raise ValueError(f'{stem}: garment conversion dropped polygon corners')
            notices.append(stem + '\n' + (folder / (stem + '.mhclo')).read_text().split('uuid ')[0])
            # Neutral authored coordinates, UVs, seam topology and folds. Body
            # bindings are generated against the exact released GLB next.
            geometry = {field: fitted[field].tolist() for field in ('positions', 'normals', 'uv_values', 'indices')}
            geometry['original_index'] = fitted['original_index'].tolist()
            compiled = json.dumps(geometry, separators=(',', ':')).encode()
            (cache / (key + '.json')).write_bytes(compiled)
            for suffix in ('_normal.png', '_diffuse.png'):
                if (folder / (stem + suffix)).exists():
                    shutil.copyfile(folder / (stem + suffix), output / (key + suffix))
            manifest['garments'][key] = {'source': stem, 'sourceTriangleCount': triangle_count, 'geometrySha256': hashlib.sha256(compiled).hexdigest(), 'normal': key + '_normal.png' if (folder / (stem + '_normal.png')).exists() else None, 'diffuse': key + '_diffuse.png'}
    (ROOT / 'docs/licenses/wardrobe-cc0-notices.txt').write_text('\n'.join(notices), encoding='utf-8', newline='\n')
    (cache / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('Compiled four licensed garment sets with authored topology, UVs and surface maps')


if __name__ == '__main__':
    main()

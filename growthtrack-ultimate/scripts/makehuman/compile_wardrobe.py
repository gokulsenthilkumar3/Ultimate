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
            fitted = converter.fit_proxy(compiler.load_obj(folder / (stem + '.obj')), folder / (stem + '.mhclo'), body)
            # Neutral authored coordinates, UVs, seam topology and folds. Body
            # bindings are generated against the exact released GLB next.
            geometry = {field: fitted[field].tolist() for field in ('positions', 'normals', 'uv_values', 'indices')}
            geometry['original_index'] = fitted['original_index'].tolist()
            (cache / (key + '.json')).write_text(json.dumps(geometry, separators=(',', ':')))
            for suffix in ('_normal.png', '_diffuse.png'):
                if (folder / (stem + suffix)).exists():
                    shutil.copyfile(folder / (stem + suffix), output / (key + suffix))
            manifest['garments'][key] = {'source': stem, 'normal': key + '_normal.png' if (folder / (stem + '_normal.png')).exists() else None, 'diffuse': key + '_diffuse.png'}
    (cache / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('Compiled four licensed garment sets with authored topology, UVs and surface maps')


if __name__ == '__main__':
    main()

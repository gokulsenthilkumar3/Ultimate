"""Export corrected CC0 proxy geometry without rebuilding the body or textures.

Use the converter's existing numpy environment. Run verify-human-sources.mjs
first. The repair consumer checks EVERY existing position and morph against
this output before changing any shipped file.
"""
import importlib.util
import json
from pathlib import Path
import sys
import numpy as np

root = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("human_converter", root / "scripts/build-makehuman-glb.py")
converter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(converter)
data = root / ".tmp/makehuman-cc0-compiled"
body = converter.make_mesh(np.load(data / "3dobjs/base.npz"), np.load(data / "targets.npz", allow_pickle=True), group_index=0, add_anatomy_detail=True)
output = {}
for name, folder, stem in [
    ("GrowthTrackEyes", "eyes/high-poly", "high-poly"),
    ("GrowthTrackHair", "hair/short02", "short02"),
    ("GrowthTrackEyebrows", "eyebrows/eyebrow001", "eyebrow001"),
    ("GrowthTrackEyelashes", "eyelashes/eyelashes01", "eyelashes01"),
]:
    source = np.load(data / folder / f"{stem}.npz")
    geometry = converter.fit_proxy(source, data / folder / f"{stem}.mhclo", body)
    keys = {tuple(key): i for i, key in enumerate(geometry["vertex_keys"])}
    legacy_keys, legacy_indices = {}, []
    valence = source["nfaces"]
    for i, row in enumerate(source["fvert"]):
        count = min(max(int(valence[i]), 3), 4) if i < len(valence) else 4
        corners = []
        for c in range(count):
            key = (int(row[c]), int(source["fuvs"][i, c]))
            if key not in legacy_keys:
                legacy_keys[key] = len(legacy_keys)
            corners.append(legacy_keys[key])
        for c in range(1, count - 1):
            legacy_indices.extend((corners[0], corners[c], corners[c + 1]))
    output[name] = {
        "positions": geometry["positions"].ravel().tolist(),
        "normals": geometry["normals"].ravel().tolist(),
        "uv": geometry["uv_values"].ravel().tolist(),
        "indices": geometry["indices"].tolist(),
        "morphs": {key: value.ravel().tolist() for key, value in geometry["morphs"].items()},
        "legacyOrder": [keys[key] for key in legacy_keys],
        "legacyIndices": legacy_indices,
        "sourceObj": f"{folder}/{stem}.obj",
    }
target = Path(sys.argv[1]) if len(sys.argv) > 1 else root / ".tmp/human-review/feature-repair.json"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(output, separators=(",", ":")))
print(f"Exported corrected geometry for {len(output)} CC0 proxies to {target}")

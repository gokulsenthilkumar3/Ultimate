"""Compare compiled CC0 sources with the MakeHuman 1.1.1 caches the shipped GLB was built from.

Usage: python -I scripts/makehuman/compare_sources.py --old <1.1.1 data dir> --new <compiled dir> [--report out.json]
Exit code 0 only when every compared field is identical.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np

MESH_FIELDS = ["coord", "texco", "fvert", "fuvs", "group", "fgstr", "fgidx", "nfaces", "vface"]


def array_result(old, new):
    if old.shape != new.shape:
        return {"equal": False, "detail": f"shape {old.shape} vs {new.shape}"}
    if np.array_equal(old, new):
        return {"equal": True}
    if np.issubdtype(old.dtype, np.floating):
        return {"equal": False, "detail": f"max abs diff {float(np.max(np.abs(old.astype(np.float64) - new.astype(np.float64)))):.3g}"}
    return {"equal": False, "detail": f"{int(np.count_nonzero(old != new))} differing elements"}


def mhclo_body(path: Path):
    # Header comments carry the licence text that changed; compare the bindings only.
    return [line.rstrip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip() and not line.lstrip().startswith("#")]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--old", type=Path, required=True)
    parser.add_argument("--new", type=Path, required=True)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    results = {}

    for relative in ["3dobjs/base.npz", "eyes/high-poly/high-poly.npz", "hair/short02/short02.npz"]:
        old, new = np.load(args.old / relative), np.load(args.new / relative)
        for field in MESH_FIELDS:
            if field in old.files or field in new.files:
                results[f"{relative}:{field}"] = array_result(old[field], new[field]) if field in old.files and field in new.files else {"equal": False, "detail": "field missing on one side"}

    old_targets = np.load(args.old / "targets.npz", allow_pickle=True)
    new_targets = np.load(args.new / "targets.npz", allow_pickle=True)
    for key in sorted(new_targets.files):
        results[f"targets.npz:{key}"] = array_result(old_targets[key], new_targets[key]) if key in old_targets.files else {"equal": False, "detail": "missing in 1.1.1"}

    for relative in ["eyes/high-poly/high-poly.mhclo", "hair/short02/short02.mhclo"]:
        results[relative] = {"equal": mhclo_body(args.old / relative) == mhclo_body(args.new / relative)}

    for relative in ["eyes/materials/brown_eye.png", "hair/short02/short02_diffuse.png", "hair/short02/short02_normal.png",
                     "skins/textures/young_lightskinned_male_diffuse.png", "skins/textures/young_lightskinned_male_diffuse2.png",
                     "skins/textures/young_darkskinned_male_diffuse.png"]:
        old_hash = hashlib.sha256((args.old / relative).read_bytes()).hexdigest()
        new_hash = hashlib.sha256((args.new / relative).read_bytes()).hexdigest()
        results[relative] = {"equal": old_hash == new_hash, **({} if old_hash == new_hash else {"detail": "file bytes differ"})}

    differing = {key: value for key, value in results.items() if not value["equal"]}
    summary = {"compared": len(results), "identical": len(results) - len(differing), "differences": differing}
    if args.report:
        args.report.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({k: summary[k] for k in ("compared", "identical")}), "differences:", json.dumps(differing, indent=1)[:4000])
    sys.exit(0 if not differing else 1)


if __name__ == "__main__":
    main()

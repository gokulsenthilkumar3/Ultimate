"""Compile pinned CC0 MakeHuman sources into the cache layout build-makehuman-glb.py reads.

Inputs are raw files only: base.obj and *.target from makehumancommunity/makehuman
at a pinned commit, and eye/hair/skin files from makehuman_system_assets_cc0.zip.
The compile rules reproduce MakeHuman v1.3.0 exactly (shared/wavefront.py
loadObjFile, core/files3d.py saveBinaryMesh, core/algos3d.py Target._save_binary),
so the output can be compared field by field with older caches.

Usage:
  python -I scripts/makehuman/compile_sources.py --makehuman <repo>/makehuman/data \
      --assets <extracted system assets> --targets scripts/makehuman/export-targets.json --out <new dir>
"""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

import numpy as np

MAX_FACES = 8


def load_obj(path: Path) -> dict:
    """Parse an OBJ the way MakeHuman's loadObjFile does."""
    verts, uvs, fverts, fuvs, groups = [], [], [], [], []
    group_names, group_index = [], {}
    current = None
    has_uv = False
    for line in path.read_text(encoding="utf-8").splitlines():
        data = line.split()
        if not data:
            continue
        command = data[0]
        if command == "v":
            verts.append((float(data[1]), float(data[2]), float(data[3])))
        elif command == "vt":
            uvs.append((float(data[1]), float(data[2])))
        elif command == "f":
            if current is None:
                if 0 not in group_index:
                    group_index[0] = len(group_names)
                    group_names.append("default-dummy-group")
                current = group_index[0]
            v_idx, uv_idx = [], []
            for corner in data[1:]:
                parts = corner.split("/")
                v_idx.append(int(parts[0]) - 1)
                if len(parts) > 1 and parts[1] != "":
                    uv_idx.append(int(parts[1]) - 1)
            if len(v_idx) == 3:
                v_idx.append(v_idx[0])
            if uv_idx:
                if len(uv_idx) == 3:
                    uv_idx.append(uv_idx[0])
                has_uv = True
            if len(uv_idx) < 4:
                uv_idx = [0, 0, 0, 0]
            fverts.append(v_idx)
            fuvs.append(uv_idx)
            groups.append(current)
        elif command == "g":
            name = data[1]
            if name not in group_index:
                group_index[name] = len(group_names)
                group_names.append(name)
            current = group_index[name]
    fvert = np.asarray(fverts, dtype=np.uint32)
    referenced = np.zeros(len(verts), dtype=bool)
    referenced[fvert.ravel()] = True
    if not referenced.all():
        raise ValueError(f"{path}: contains loose vertices")
    # Per-vertex face references, as module3d.Object3D builds them.
    vface = np.zeros((len(verts), MAX_FACES), dtype=np.uint32)
    nfaces = np.zeros(len(verts), dtype=np.uint8)
    for face_index, face in enumerate(fverts):
        for vertex in dict.fromkeys(face):
            if nfaces[vertex] < MAX_FACES:
                vface[vertex, nfaces[vertex]] = face_index
                nfaces[vertex] += 1
    text, index = "", []
    for name in group_names:
        index.append(len(text))
        text += name
    mesh = {
        "coord": np.asarray(verts, dtype=np.float32),
        "vface": vface,
        "nfaces": nfaces,
        "texco": np.asarray(uvs, dtype=np.float32),
        "fvert": fvert,
        "group": np.asarray(groups, dtype=np.uint16),
        "fgstr": np.frombuffer(text.encode("utf-8"), dtype="S1"),
        "fgidx": np.asarray(index, dtype=np.uint32),
        "MAX_FACES": np.asarray([MAX_FACES]),
    }
    if has_uv:
        mesh["fuvs"] = np.asarray(fuvs, dtype=np.uint32)
    return mesh


def load_target(path: Path):
    """Parse a .target and compile it like Target._save_binary."""
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        data = line.split()
        if len(data) != 4:
            continue
        rows.append((int(data[0]), float(data[1]), float(data[2]), float(data[3])))
    index = np.asarray([row[0] for row in rows], dtype=np.uint32)
    vector = np.asarray([row[1:] for row in rows], dtype=np.float32).reshape(-1, 3)
    return np.ascontiguousarray(index, dtype=np.uint16), np.ascontiguousarray(np.round(vector * 1e3), dtype=np.int16)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--makehuman", type=Path, required=True, help="makehuman/data folder at the pinned commit")
    parser.add_argument("--assets", type=Path, required=True, help="extracted CC0 system-asset members")
    parser.add_argument("--targets", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=False)
    record = {"inputs": [], "outputs": []}

    def note(kind, path):
        record[kind].append({"path": str(path.as_posix()), "sha256": sha256(path)})

    base_obj = args.makehuman / "3dobjs" / "base.obj"
    (args.out / "3dobjs").mkdir()
    np.savez_compressed(args.out / "3dobjs" / "base.npz", **load_obj(base_obj))
    note("inputs", base_obj)

    spec = json.loads(args.targets.read_text(encoding="utf-8"))
    arrays = {}
    for stem in spec["base"] + spec["targets"]:
        source = args.makehuman / "targets" / f"{stem}.target"
        index, vector = load_target(source)
        arrays[f"targets/{stem}.index"] = index
        arrays[f"targets/{stem}.vector"] = vector
        note("inputs", source)
    np.savez_compressed(args.out / "targets.npz", **arrays)

    for folder, name in (("eyes/high-poly", "high-poly"), ("hair/short02", "short02"),
                         ("eyebrows/eyebrow001", "eyebrow001"), ("eyelashes/eyelashes01", "eyelashes01")):
        (args.out / folder).mkdir(parents=True)
        obj = args.assets / folder / f"{name}.obj"
        np.savez_compressed(args.out / folder / f"{name}.npz", **load_obj(obj))
        shutil.copyfile(args.assets / folder / f"{name}.mhclo", args.out / folder / f"{name}.mhclo")
        note("inputs", obj)
        note("inputs", args.assets / folder / f"{name}.mhclo")

    copies = {
        "eyes/materials/brown_eye.png": "eyes/materials/brown_eye.png",
        "hair/short02/short02_diffuse.png": "hair/short02/short02_diffuse.png",
        "hair/short02/short02_normal.png": "hair/short02/short02_normal.png",
        "skins/young_caucasian_male/young_lightskinned_male_diffuse.png": "skins/textures/young_lightskinned_male_diffuse.png",
        "skins/young_caucasian_male2/young_lightskinned_male_diffuse2.png": "skins/textures/young_lightskinned_male_diffuse2.png",
        "skins/young_african_male/young_darkskinned_male_diffuse.png": "skins/textures/young_darkskinned_male_diffuse.png",
        "eyebrows/eyebrow001/eyebrow001.png": "eyebrows/eyebrow001/eyebrow001.png",
        "eyelashes/eyelashes01/eyelashes01.png": "eyelashes/eyelashes01/eyelashes01.png",
    }
    for source, target in copies.items():
        (args.out / target).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(args.assets / source, args.out / target)
        note("inputs", args.assets / source)

    for path in sorted(p for p in args.out.rglob("*") if p.is_file()):
        note("outputs", path)
    (args.out / "compile-record.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
    print(f"compiled {len(record['inputs'])} inputs into {args.out}")


if __name__ == "__main__":
    main()

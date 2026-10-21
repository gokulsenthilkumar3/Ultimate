"""Structurally compare two GLBs: decoded attributes, morph targets, indices, images and metadata.

Usage: python -I scripts/makehuman/compare_glb.py A.glb B.glb [--report out.json]
Exit code 0 when all geometry, morph and image data are identical.
"""
import argparse
import hashlib
import json
import struct
import sys

import numpy as np

COMPONENT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
WIDTH = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


class Glb:
    def __init__(self, path):
        data = open(path, "rb").read()
        json_length = struct.unpack_from("<I", data, 12)[0]
        self.json = json.loads(data[20:20 + json_length])
        bin_start = 20 + json_length
        bin_length = struct.unpack_from("<I", data, bin_start)[0]
        self.bin = data[bin_start + 8:bin_start + 8 + bin_length]

    def view(self, index, offset=0, length=None):
        view = self.json["bufferViews"][index]
        start = view.get("byteOffset", 0) + offset
        return self.bin[start:start + (length if length is not None else view["byteLength"] - offset)]

    def accessor(self, index):
        acc = self.json["accessors"][index]
        dtype = COMPONENT[acc["componentType"]]
        width = WIDTH[acc["type"]]
        out = np.zeros((acc["count"], width), dtype=dtype)
        if acc.get("bufferView") is not None:
            stride = self.json["bufferViews"][acc["bufferView"]].get("byteStride")
            item = np.dtype(dtype).itemsize * width
            raw = self.view(acc["bufferView"], acc.get("byteOffset", 0))
            if stride and stride != item:
                rows = [np.frombuffer(raw, dtype=dtype, count=width, offset=i * stride) for i in range(acc["count"])]
                out = np.asarray(rows, dtype=dtype).reshape(acc["count"], width)
            else:
                out = np.frombuffer(raw, dtype=dtype, count=acc["count"] * width).reshape(acc["count"], width).copy()
        sparse = acc.get("sparse")
        if sparse:
            idx_dtype = COMPONENT[sparse["indices"]["componentType"]]
            ids = np.frombuffer(self.view(sparse["indices"]["bufferView"], sparse["indices"].get("byteOffset", 0)), dtype=idx_dtype, count=sparse["count"])
            vals = np.frombuffer(self.view(sparse["values"]["bufferView"], sparse["values"].get("byteOffset", 0)), dtype=dtype, count=sparse["count"] * width).reshape(-1, width)
            out[ids] = vals
        return out

    def geometry(self):
        result = {}
        for mesh in self.json.get("meshes", []):
            names = mesh.get("extras", {}).get("targetNames", [])
            for p_index, primitive in enumerate(mesh["primitives"]):
                prefix = f"{mesh['name']}[{p_index}]"
                for attribute, accessor in primitive["attributes"].items():
                    result[f"{prefix}.{attribute}"] = self.accessor(accessor)
                if primitive.get("indices") is not None:
                    result[f"{prefix}.indices"] = self.accessor(primitive["indices"])
                for t_index, target in enumerate(primitive.get("targets", [])):
                    label = names[t_index] if t_index < len(names) else str(t_index)
                    for attribute, accessor in target.items():
                        result[f"{prefix}.morph[{label}].{attribute}"] = self.accessor(accessor)
        for skin in self.json.get("skins", []):
            if skin.get("inverseBindMatrices") is not None:
                result[f"skin[{skin.get('name', '')}].inverseBindMatrices"] = self.accessor(skin["inverseBindMatrices"])
        return result

    def images(self):
        return {image.get("name", str(i)): hashlib.sha256(self.view(image["bufferView"])).hexdigest()
                for i, image in enumerate(self.json.get("images", [])) if image.get("bufferView") is not None}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("a")
    parser.add_argument("b")
    parser.add_argument("--report")
    args = parser.parse_args()
    a, b = Glb(args.a), Glb(args.b)
    ga, gb = a.geometry(), b.geometry()
    differences = {}
    for key in sorted(set(ga) | set(gb)):
        if key not in ga or key not in gb:
            differences[key] = "missing in " + ("A" if key not in ga else "B")
        elif ga[key].shape != gb[key].shape:
            differences[key] = f"shape {ga[key].shape} vs {gb[key].shape}"
        elif not np.array_equal(ga[key], gb[key]):
            delta = np.abs(ga[key].astype(np.float64) - gb[key].astype(np.float64))
            differences[key] = f"max abs diff {delta.max():.3g}, differing values {int(np.count_nonzero(delta))}"
    ia, ib = a.images(), b.images()
    for name in sorted(set(ia) | set(ib)):
        if ia.get(name) != ib.get(name):
            differences[f"image[{name}]"] = "bytes differ" if name in ia and name in ib else "missing in " + ("A" if name not in ia else "B")
    meta = {key for key in ("asset", "extras", "extensionsUsed") if a.json.get(key) != b.json.get(key)}
    node_extras = [n.get("name") for n, m in zip(a.json.get("nodes", []), b.json.get("nodes", [])) if n.get("extras") != m.get("extras")]
    report = {"geometryKeys": len(set(ga) | set(gb)), "images": len(set(ia) | set(ib)), "differences": differences,
              "metadataDiffers": sorted(meta), "nodeExtrasDiffer": node_extras}
    if args.report:
        open(args.report, "w", encoding="utf-8").write(json.dumps(report, indent=2))
    print(json.dumps({k: (v if k != "differences" else len(v)) for k, v in report.items()}))
    for key, value in list(differences.items())[:25]:
        print(" ", key, "->", value)
    sys.exit(0 if not differences else 1)


if __name__ == "__main__":
    main()

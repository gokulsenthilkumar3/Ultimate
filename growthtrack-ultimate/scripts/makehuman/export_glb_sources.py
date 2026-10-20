# Run inside MakeHuman Community 1.3.0: Utilities > Scripting > Load this file > Execute.
#
# Exports the base character and one OBJ per converter target through
# MakeHuman's own OBJ writer, so the GLB body can be rebuilt from application
# output (no project claim, per MakeHuman's LICENSE.md section D).
#
# Edit the two paths below before running. Nothing outside OUTPUT_DIR is written.
import json
import os
import hashlib

TARGET_LIST = r"C:\path\to\growthtrack-ultimate\scripts\makehuman\export-targets.json"
OUTPUT_DIR = r"C:\path\to\makehuman-export"

human = MHScript.human  # noqa: F821  (provided by the Scripting tab)


def clear_targets():
    # Start from the bare base mesh, matching scripts/build-makehuman-glb.py,
    # rather than the application's default macro blend.
    for path in list(human.targetsDetailStack.keys()):
        human.setDetail(path, 0.0)
    human.applyAllTargets()


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def export(name, base, extra=None):
    clear_targets()
    for target in base:
        MHScript.applyTarget(target, 1.0)  # noqa: F821
    if extra:
        MHScript.applyTarget(extra, 1.0)  # noqa: F821
    MHScript.saveObj(name, OUTPUT_DIR)  # noqa: F821
    path = os.path.join(OUTPUT_DIR, name + ".obj")
    return {"file": name + ".obj", "target": extra, "sha256": sha256(path), "vertices": len(human.mesh.coord)}


def main():
    with open(TARGET_LIST, encoding="utf-8") as handle:
        spec = json.load(handle)
    if not os.path.isdir(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
    if os.listdir(OUTPUT_DIR):
        raise RuntimeError("OUTPUT_DIR must be empty so every file comes from this run.")
    import getpath
    import makehuman
    records = [export("base", spec["base"])]
    for target in spec["targets"]:
        records.append(export("target__" + target.replace("/", "__"), spec["base"], target))
    vertex_counts = {record["vertices"] for record in records}
    manifest = {
        "application": "MakeHuman " + makehuman.getVersionStr(),
        "exporter": "Scripting.saveObj (wavefront.writeObjFile)",
        "baseTargets": spec["base"],
        "targetCount": len(spec["targets"]),
        "vertexCounts": sorted(vertex_counts),
        "sysDataPath": getpath.getSysDataPath(),
        "exports": records,
    }
    with open(os.path.join(OUTPUT_DIR, "export-manifest.json"), "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
    clear_targets()
    print("Exported %d files to %s (vertex counts: %s)" % (len(records), OUTPUT_DIR, sorted(vertex_counts)))


main()

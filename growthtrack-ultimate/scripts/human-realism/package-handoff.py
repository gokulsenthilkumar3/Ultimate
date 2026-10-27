"""Create and read-back verify an explicit source/asset overlay."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[2]
files = [
    "package.json", "package-lock.json",
    "scripts/build-human-realism.mjs", "scripts/validate-human-family.mjs",
    "scripts/human75/micro.mjs",
    "src/config/humanAssetFamily.json", "src/config/humanAssetManifest.json",
    "src/components/HumanoidViewer.tsx", "src/components/ProfileEditor.jsx",
    "src/components/morphEngine/HumanoidClone.jsx",
    "src/components/morphEngine/modelAssetRegistry.js",
    "src/components/morphEngine/useModelLoader.js",
    "src/components/morphEngine/nativeAnatomy.js",
    "src/components/morphEngine/nativeContact.js",
    "src/components/morphEngine/nativeGuideFit.js",
    "src/components/morphEngine/nativeJunction.js",
    "src/components/morphEngine/nativeSacFit.js",
    "src/components/morphEngine/nativeSurfaceFit.js",
    "src/components/morphEngine/nativeSurfaceMeasurement.js",
    "src/components/morphEngine/nativeTissueSampler.js",
    "src/components/morphEngine/anatomySurface.js",
    "src/components/body3d/physicalSkinMaterial.js",
    "src/components/physique/AnatomyCustomizationPanel.jsx",
    "src/components/morphEngine/useNativeAnatomy.js",
    "src/components/morphEngine/useNativeAnatomy.test.js",
    "src/components/morphEngine/humanAssetFamily.test.js",
    "src/components/morphEngine/anatomyDeformation.js",
    "src/components/morphEngine/anatomyTissueGeometry.js",
    "src/components/morphEngine/anatomyGuides.js",
    "src/components/morphEngine/featureMaterials.js",
    "src/components/morphEngine/modelMeasurements.js",
    "src/lib/avatarEvidence.js",
    "tests/e2e/human-asset-family.spec.ts", "playwright.physique.config.ts",
    "docs/real-human-3d/16-private-anatomy.md",
    "docs/real-human-3d/17-human-asset-family.md",
    "docs/real-human-3d/README.md", "docs/real-human-3d/IMPLEMENTATION_PROGRESS.md",
    "docs/IMPLEMENTATION_STATUS.md",
    "docs/real-human-3d/data/human-r2/asset-build.json",
    "docs/real-human-3d/data/human-r2/validation.json",
    "public/assets/models/ASSET-PROVENANCE.json",
    "artifacts/human-r2/human-r2.blend",
    "artifacts/human-r2/human-r2-oblique.png",
    "artifacts/human-r2/human-r2-blender-roundtrip.glb",
    "artifacts/human-r2/blender-source.json",
    "artifacts/human-r2/generic-adult-complete.glb",
    "artifacts/human-r2/generic-adult-complete.blend",
    "artifacts/human-r2/generic-adult-complete.png",
    "artifacts/human-r2/complete-asset.json",
    "scripts/review-native-anatomy.html", "scripts/verify-private-anatomy.mjs",
    "scripts/verify-android-native.mjs",
    "scripts/verify-native-motion.mjs", "scripts/build-live-human.mjs",
    "scripts/review-private-finish.mjs",
    "scripts/live-human/main.js", "scripts/live-human/viewer.html",
    "tests/e2e/live-human-desktop.spec.ts", "playwright.live-human.config.ts",
    "artifacts/human-r2/live-human-3d.html", "artifacts/human-r2/live-viewer.json",
    "src/components/morphEngine/nativeSkinRegions.js",
    "src/components/morphEngine/anatomyTissueGeometry.test.js",
    "tests/e2e/native-anatomy-review.spec.ts", "playwright.native-devices.config.ts",
    "docs/real-human-3d/18-private-anatomy-finish.md",
]
files += [str(p.relative_to(root)).replace("\\", "/") for p in (root / "docs/real-human-3d/data/private-finish").glob("*.json")]
files += [str(p.relative_to(root)).replace("\\", "/") for p in (root / "scripts/human-realism").iterdir() if p.is_file()]
assets = json.loads((root / "src/config/humanAssetManifest.json").read_text(encoding="utf-8"))
for asset in assets["assets"].values():
    files += ["public/assets/models/" + asset["file"], "public/assets/models/" + asset["privateFile"]]
files = sorted(set(files))
manifest = {"version": 1, "purpose": "Overlay for the existing GrowthTrack repository, including actual GLBs and editable Blender source; existing imports/dependencies are required.", "family": assets["family"], "status": "candidate", "files": []}
output = root / "artifacts/human-r2/human-r2-implementation.zip"
with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for name in files:
        file = (root / name).resolve()
        if not file.is_relative_to(root):
            raise ValueError("File escapes project: " + name)
        data = file.read_bytes()
        manifest["files"].append({"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
        archive.writestr(name, data)
    archive.writestr("HANDOFF-MANIFEST.json", json.dumps(manifest, indent=2))
with zipfile.ZipFile(output) as archive:
    if len(archive.namelist()) != len(files) + 1:
        raise ValueError("Unexpected archive entries")
    for entry in manifest["files"]:
        data = archive.read(entry["path"])
        if len(data) != entry["bytes"] or hashlib.sha256(data).hexdigest() != entry["sha256"]:
            raise ValueError("Archive verification failed: " + entry["path"])
print(json.dumps({"archive": str(output), "files": len(files), "bytes": output.stat().st_size, "verified": True}))

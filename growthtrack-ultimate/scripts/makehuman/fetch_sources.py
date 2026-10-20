"""Fetch the pinned CC0 MakeHuman sources used to build the humanoid GLBs.

Downloads only what the converter needs, verifies every file, and writes into
new, empty folders under .tmp/:
  .tmp/makehuman-v1.3.0/       base.obj, the listed .target files and the licence files
                               from makehumancommunity/makehuman at the pinned commit,
                               each checked against its git blob SHA-1
  .tmp/makehuman-cc0-assets/   eye, hair and skin members extracted from
                               makehuman_system_assets_cc0.zip, checked against its SHA-256

Usage: python -I scripts/makehuman/fetch_sources.py
Then:  python -I scripts/makehuman/compile_sources.py ... (see docs/ASSET_LICENCE_RESOLUTION.md)
"""
import hashlib
import json
import os
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPOSITORY = "makehumancommunity/makehuman"
TAG = "v1.3.0"
COMMIT = "1f508f6083b2f823dab15de924b3bde72e08d77c"
ASSET_ZIP_URL = "https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip"
ASSET_ZIP_SHA256 = "b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107"
ASSET_MEMBERS = [
    "eyes/high-poly/high-poly.obj", "eyes/high-poly/high-poly.mhclo", "eyes/materials/brown.mhmat", "eyes/materials/brown_eye.png",
    "hair/short02/short02.obj", "hair/short02/short02.mhclo", "hair/short02/short02.mhmat",
    "hair/short02/short02_diffuse.png", "hair/short02/short02_normal.png",
    "skins/young_caucasian_male/young_lightskinned_male_diffuse.png", "skins/young_caucasian_male/young_caucasian_male.mhmat",
    "skins/young_caucasian_male2/young_lightskinned_male_diffuse2.png", "skins/young_african_male/young_darkskinned_male_diffuse.png",
    "eyebrows/eyebrow001/eyebrow001.obj",
    "eyebrows/eyebrow001/eyebrow001.mhclo",
    "eyebrows/eyebrow001/eyebrow001.mhmat",
    "eyebrows/eyebrow001/eyebrow001.png",
    "eyelashes/eyelashes01/eyelashes01.obj",
    "eyelashes/eyelashes01/eyelashes01.mhclo",
    "eyelashes/eyelashes01/eyelashes01.mhmat",
    "eyelashes/eyelashes01/eyelashes01.png",
]


def get(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=300) as response:
        return response.read()


def new_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=False)  # refuse to mix with older downloads
    return path


def fetch_repository_files(dest: Path):
    spec = json.loads((ROOT / "scripts/makehuman/export-targets.json").read_text(encoding="utf-8"))
    tree = json.loads(get(f"https://api.github.com/repos/{REPOSITORY}/git/trees/{COMMIT}?recursive=1"))
    blobs = {entry["path"]: entry["sha"] for entry in tree["tree"] if entry["type"] == "blob"}
    paths = ["LICENSE.md", "LICENSE.ASSETS.md", "makehuman/data/3dobjs/base.obj"]
    paths += [f"makehuman/data/targets/{stem}.target" for stem in spec["base"] + spec["targets"]]
    files = []
    for path in paths:
        data = get(f"https://raw.githubusercontent.com/{REPOSITORY}/{COMMIT}/{path}")
        sha1 = hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()
        if sha1 != blobs.get(path):
            raise SystemExit(f"{path}: git blob {sha1} does not match the pinned tree")
        target = dest / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        files.append({"path": path, "gitBlobSha1": sha1, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)})
    (dest / "download-manifest.json").write_text(json.dumps({"repository": REPOSITORY, "tag": TAG, "commit": COMMIT, "files": files}, indent=2), encoding="utf-8")
    return len(files)


def fetch_assets(dest: Path):
    archive = dest.parent / "makehuman-system-assets" / "makehuman_system_assets_cc0.zip"
    if not archive.exists():
        new_dir(archive.parent)
        archive.write_bytes(get(ASSET_ZIP_URL))
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != ASSET_ZIP_SHA256:
        raise SystemExit(f"{archive}: SHA-256 {digest} does not match the pinned value")
    members = []
    with zipfile.ZipFile(archive) as bundle:
        for name in ASSET_MEMBERS:
            target = (dest / name).resolve()
            if not str(target).startswith(str(dest.resolve()) + os.sep):
                raise SystemExit(f"unsafe archive path {name}")
            data = bundle.read(name)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            members.append({"member": name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)})
    (dest / "extract-manifest.json").write_text(json.dumps({"source": ASSET_ZIP_URL, "zipSha256": digest, "members": members}, indent=2), encoding="utf-8")
    return len(members)


def main():
    tmp = ROOT / ".tmp"
    repo_files = fetch_repository_files(new_dir(tmp / "makehuman-v1.3.0"))
    asset_files = fetch_assets(new_dir(tmp / "makehuman-cc0-assets"))
    print(f"fetched {repo_files} repository files at {TAG} ({COMMIT[:8]}) and {asset_files} CC0 asset members; all hashes verified")


if __name__ == "__main__":
    main()

"""List the MakeHuman targets the GLB converter uses, for the in-app export script.

Usage: python -I scripts/makehuman/list-export-targets.py > scripts/makehuman/export-targets.json

Reads BASE_SCULPT_SOURCES and MORPH_SOURCES from scripts/build-makehuman-glb.py
without importing it, so the list always matches the converter's recipes.
"""
import json
import re
from pathlib import Path

BUILD = Path(__file__).resolve().parents[1] / "build-makehuman-glb.py"


def main():
    text = BUILD.read_text(encoding="utf-8")
    morph_start = text.index("MORPH_SOURCES = {")
    morph_end = text.index("GENERATED_MORPH_NAMES")
    base_section = text[text.index("BASE_SCULPT_SOURCES"):morph_start]
    stem = lambda path: path[len("targets/"):]
    base = sorted({stem(p) for p in re.findall(r'"(targets/[^"]+)"', base_section)})
    # Recipes named in GENERATED_MORPH_NAMES are replaced by generated shapes in
    # the converter, so their MakeHuman targets are never read.
    generated_block = text[morph_end:text.index("}", morph_end)]
    generated = set(re.findall(r'"([a-z_]+)"', generated_block))
    targets = set()
    # Recipe lists may span several lines (overall_mass does), so match across them.
    for name, body in re.findall(r'"([a-z_]+)":\s*\[(.*?)\]', text[morph_start:morph_end], re.S):
        if name not in generated:
            targets.update(stem(p) for p in re.findall(r'"(targets/[^"]+)"', body))
    targets = sorted(targets - set(base))
    print(json.dumps({"generatedFrom": "scripts/build-makehuman-glb.py", "base": base, "targets": targets}, indent=2))


if __name__ == "__main__":
    main()

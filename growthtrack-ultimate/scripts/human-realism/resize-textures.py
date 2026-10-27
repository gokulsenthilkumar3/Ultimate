"""Resize embedded source maps with Blender's image tools, preserving alpha."""
import bpy
import os
import shutil
import sys

directory, size = sys.argv[sys.argv.index("--") + 1:]
size = int(size)
for filename in os.listdir(directory):
    if not filename.endswith(".png") or filename.endswith(".resized.png"):
        continue
    path = os.path.join(directory, filename)
    image = bpy.data.images.load(path, check_existing=False)
    opaque = ("Albedo" in filename or "IrisSclera" in filename) and not any(s in filename for s in ("Hair", "Eyebrow", "Eyelash"))
    maximum = min(size, 512) if "HairShort" in filename else size
    scale = min(1, maximum / max(image.size))
    if not opaque and scale == 1:
        shutil.copyfile(path, path[:-4] + ".resized.png")
        continue
    if "Normal" in filename or "Roughness" in filename or "Height" in filename:
        image.colorspace_settings.name = "Non-Color"
    if scale < 1:
        image.scale(max(1, round(image.size[0] * scale)), max(1, round(image.size[1] * scale)))
    image.file_format = "JPEG" if opaque else "PNG"
    image.filepath_raw = path[:-4] + (".jpg" if opaque else ".resized.png")
    image.save(quality=90)

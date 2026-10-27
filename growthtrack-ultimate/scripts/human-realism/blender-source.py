"""Build an editable source scene from the exact uncompressed R2 geometry.

The shipping binary is independently compressed losslessly. Blender is also
used for an actual GLB import/export probe, not merely a version check.
"""
import bpy
import json
import math
import os
import sys
from mathutils import Vector

work, output = sys.argv[sys.argv.index("--") + 1:]
work, output = os.path.abspath(work), os.path.abspath(output)
os.makedirs(output, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
if hasattr(bpy.context.preferences.filepaths, "save_preview_images"):
    bpy.context.preferences.filepaths.save_preview_images = False
bpy.ops.import_scene.gltf(filepath=os.path.join(work, "hero-authoring.glb"))
body = next(o for o in bpy.context.scene.objects if o.type == "MESH" and o.name in ("Body", "GrowthTrackBody"))
body["character_brief"] = "Lifelike generic adult male candidate; visual acceptance pending"
body["units"] = "metres; glTF Y-up, Blender Z-up"
public_count = len(body.data.vertices)
public_shapes = len(body.data.shape_keys.key_blocks) if body.data.shape_keys else 0
bpy.ops.import_scene.gltf(filepath=os.path.join(work, "hero-private-dcc.glb"))
public_rig = body.find_armature()
for obj in bpy.context.scene.objects:
    if obj.type == "MESH" and obj.get("sensitive") and public_rig:
        world_matrix = obj.matrix_world.copy()
        for modifier in obj.modifiers:
            if modifier.type == "ARMATURE":
                modifier.object = public_rig
        obj.parent = public_rig
        obj.matrix_world = world_matrix
    if obj.get("controlCage"):
        obj.hide_render = True
        obj.hide_set(True)
    if "PrivateAnatomy" in obj.name:
        obj.hide_render = True
        obj.hide_set(True)

scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1
bounds = [body.matrix_world @ Vector(p) for p in body.bound_box]
low = min(p.z for p in bounds)
high = max(p.z for p in bounds)
height = high - low
target = Vector((0, 0, low + height * .53))
bpy.ops.object.camera_add(location=(height * 1.3, -height * 2.1, target.z + height * .06))
camera = bpy.context.object
camera.name = "R2ReviewCamera"
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.angle = math.radians(28)
scene.camera = camera
for name, loc, energy, size in [
    ("NeutralKey", (height, -height * 2, high * 1.6), 450, height),
    ("NeutralFill", (-height, -height, high), 220, height * 1.5),
    ("Rim", (0, height, high), 350, height),
]:
    bpy.ops.object.light_add(type="AREA", location=loc)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
scene.render.engine = "CYCLES"
scene.cycles.samples = 16
scene.render.resolution_x = 640
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
if scene.world is None:
    scene.world = bpy.data.worlds.new("R2NeutralWorld")
scene.world.color = (.25, .25, .25)
scene.view_settings.view_transform = "AgX"
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.join(output, "human-r2-oblique.png")
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(output, "human-r2.blend"), compress=True)
bpy.ops.render.render(write_still=True)

# Export the public source only; no private meshes or private control scaffold
# may accidentally join an ordinary public round trip.
bpy.ops.object.select_all(action="DESELECT")
selected = []
for obj in scene.objects:
    if obj.type == "MESH" and (obj.name == "Body" or obj.name.startswith("GrowthTrack")) and not (obj.get("sensitive") or "Private" in obj.name):
        obj.select_set(True)
        selected.append(obj)
bpy.ops.export_scene.gltf(
    filepath=os.path.join(output, "human-r2-blender-roundtrip.glb"),
    export_format="GLB",
    use_selection=True,
    export_extras=True,
    export_morph=True,
)
report = {
    "blender": bpy.app.version_string,
    "source": "hero-authoring.glb",
    "body_vertices": public_count,
    "body_shape_keys_including_basis": public_shapes,
    "exported_public_objects": [o.name for o in selected],
    "source_file": "human-r2.blend",
    "roundtrip_file": "human-r2-blender-roundtrip.glb",
    "visual_acceptance": "pending; render must be reviewed",
}
with open(os.path.join(output, "blender-source.json"), "w", encoding="utf-8") as stream:
    json.dump(report, stream, indent=2)
print(json.dumps(report))

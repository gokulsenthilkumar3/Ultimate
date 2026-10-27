"""Editable, visible full adult from the exact standalone GLB."""
import bpy
import json
import math
import os
import sys
from mathutils import Vector

output = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(output, "generic-adult-complete.glb"))
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
body = next(o for o in scene.objects if o.type == "MESH" and o.name in ("Body", "GrowthTrackBody"))
rig = body.find_armature()
if rig is None:
    raise RuntimeError("Complete adult has no movable rig")
rig.show_in_front = True
body["reference"] = "Generic adult; dynamic contact and dimension fitting run in the accompanying application code"
bounds = [body.matrix_world @ Vector(point) for point in body.bound_box]
low, high = min(p.z for p in bounds), max(p.z for p in bounds)
height = high - low
target = Vector((0, 0, low + height * .52))
bpy.ops.object.camera_add(location=(height * 1.3, -height * 2.5, target.z + height * .08))
camera = bpy.context.object
camera.rotation_euler = (target-camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.angle = math.radians(28)
scene.camera = camera
for loc, energy in [((height,-height*2,high*1.5),450),((-height,-height,high),250),((0,height,high),300)]:
    bpy.ops.object.light_add(type="AREA",location=loc)
    light=bpy.context.object
    light.data.energy=energy
    light.data.shape="DISK"
    light.data.size=height
    light.rotation_euler=(target-light.location).to_track_quat("-Z","Y").to_euler()
scene.world=bpy.data.worlds.new("NeutralWorld")
scene.world.color=(.25,.25,.25)
scene.render.engine="CYCLES"
scene.cycles.samples=16
scene.render.resolution_x=640
scene.render.resolution_y=800
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.filepath=os.path.join(output,"generic-adult-complete.png")
scene.view_settings.view_transform="AgX"
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(output,"generic-adult-complete.blend"),compress=True)
bpy.ops.render.render(write_still=True)
print(json.dumps({"source":"generic-adult-complete.glb","editable":"generic-adult-complete.blend","joints":len(rig.data.bones),"meshes":len([o for o in scene.objects if o.type=="MESH"])}))

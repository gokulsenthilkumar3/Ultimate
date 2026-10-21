"""Blender --background --python scripts/prepare-avatar-source.py -- --input FILE --output DIR.

Creates a reviewable source scene and reference renders. Does not certify or
promote the input as an authored sculpt or calibrated production model.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path
import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--input', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(args.input.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
body = max(meshes, key=lambda o: len(o.data.vertices))
# Keep runtime topology intact. A separate subdivision reference is editable
# in Blender but must not be misrepresented as an artist-refined sculpt.
reference = body.copy()
reference.data = body.data.copy()
reference.name = 'SculptReference_Unreviewed'
bpy.context.collection.objects.link(reference)
subdivision = reference.modifiers.new('SculptReferenceSubdivision', 'SUBSURF')
subdivision.levels = 2
subdivision.render_levels = 2
reference.hide_render = True
reference.hide_set(True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.render.resolution_x = 768
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('NeutralStudio')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.3, 0.3, 0.3, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.5
corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
minimum = Vector(tuple(min(c[k] for c in corners) for k in range(3)))
maximum = Vector(tuple(max(c[k] for c in corners) for k in range(3)))
center = (minimum + maximum) / 2
height = maximum.z - minimum.z
for name, location, energy in [('Key', (3, -4, 4), 450), ('Fill', (-3, -2, 2), 300), ('Rear', (0, 3, 3), 350)]:
    bpy.ops.object.light_add(type='AREA', location=center + Vector(location))
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = 'DISK'
    light.data.size = 4
    light.rotation_euler = (center - light.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
camera.data.ortho_scale = max(height * 1.35, 2)
scene.camera = camera
manifest = {'schemaVersion': 1, 'inputSha256': hashlib.sha256(args.input.read_bytes()).hexdigest(),
    'blenderVersion': bpy.app.version_string, 'status': 'review-required',
    'calibration': 'unverified', 'license': 'source-evidence-review-required',
    'parts': [{'name': o.name, 'vertices': len(o.data.vertices),
               'morphs': [k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else []} for o in meshes]}
(args.output / 'source-manifest.json').write_text(json.dumps(manifest, indent=2))
for name, direction in [('front', (0, -4, 0)), ('side', (4, 0, 0)), ('back', (0, 4, 0))]:
    camera.location = center + Vector(direction)
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str((args.output / f'{name}.png').resolve())
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str((args.output / 'avatar-source.blend').resolve()))

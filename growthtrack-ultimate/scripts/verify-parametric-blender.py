"""Headless DCC interoperability check; writes only the named evidence folder.

blender --background --factory-startup --python scripts/verify-parametric-blender.py -- input.glb output-directory
This verifies ordinary external editing, not semantic recovery after sculpting.
"""
import bpy
import hashlib
import json
import os
import struct
import sys

arguments = sys.argv[sys.argv.index('--') + 1:]
if len(arguments) not in (2, 3):
    raise RuntimeError('Expected input.glb, an evidence output directory and optional identity target count.')
source, destination = (os.path.abspath(value) for value in arguments[:2])
expected_targets = int(arguments[2]) if len(arguments) == 3 else 0
os.makedirs(destination, exist_ok=True)
if hasattr(bpy.context.preferences.filepaths, 'file_preview_type'):
    bpy.context.preferences.filepaths.file_preview_type = 'NONE'
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=source)
scene_meshes = [item for item in bpy.context.scene.objects if item.type == 'MESH']
armatures = [item for item in bpy.context.scene.objects if item.type == 'ARMATURE']
with open(source, 'rb') as input_file:
    original = input_file.read()
json_length = struct.unpack_from('<I', original, 12)[0]
gltf = json.loads(original[20:20 + json_length])
joint_names = {gltf['nodes'][index]['name'] for index in gltf['skins'][0]['joints']}
source_mesh_names = {node['name'] for node in gltf['nodes'] if 'mesh' in node}
# Blender may add an Icosphere custom bone widget. That is DCC display data,
# not another mesh imported from the avatar's glTF mesh nodes.
meshes = [item for item in scene_meshes if item.name in source_mesh_names]
if len(meshes) != len(source_mesh_names) or len(meshes) < 5 or not armatures or len(joint_names) != 52:
    raise RuntimeError('The exported human did not retain its source meshes and 52-joint rig: ' + json.dumps({'meshes': len(meshes), 'armatures': len(armatures), 'source_joints': len(joint_names), 'objects': [(item.name, item.type) for item in bpy.context.scene.objects]}))
body = next(item for item in meshes if item.name == 'Body')
binding = next((modifier for modifier in body.modifiers if modifier.type == 'ARMATURE'), None)
if not binding or not binding.object:
    raise RuntimeError('The body has no armature binding.')
if not joint_names.issubset(set(binding.object.data.bones.keys())):
    raise RuntimeError('Some glTF joints are missing from the imported body armature.')
target_count = len(body.data.shape_keys.key_blocks) - 1 if body.data.shape_keys else 0
if target_count != expected_targets:
    raise RuntimeError('Unexpected identity shape key count: ' + str(target_count))
layered_eyes = [item for item in meshes if 'layered eye' in item.name]
eye_target_counts = {}
for eye in layered_eyes:
    source_node = next(node for node in gltf['nodes'] if node.get('name') == eye.name)
    source_eye = gltf['meshes'][source_node['mesh']]
    source_names = source_eye.get('extras', {}).get('targetNames', [])
    imported_names = list(eye.data.shape_keys.key_blocks.keys())[1:] if eye.data.shape_keys else []
    if imported_names != source_names:
        raise RuntimeError('The imported layered eye lost named shapes: ' + eye.name)
    eye_target_counts[eye.name] = len(imported_names)
if layered_eyes and len(layered_eyes) != 8:
    raise RuntimeError('The imported layered eye assembly is incomplete.')
initial_nose_weight = None
if expected_targets:
    nose = body.data.shape_keys.key_blocks.get('noseWider')
    if not nose:
        raise RuntimeError('Named source shape channels did not survive import.')
    initial_nose_weight = nose.value
    nose.value = min(1, nose.value + 0.15)

# A small material edit, a topology-preserving vertex edit and a pose edit
# demonstrate that this is editable geometry/rig data in a real DCC.
material = body.data.materials[0]
material.use_nodes = True
shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
shader.inputs['Roughness'].default_value = 0.63
body.data.vertices[0].co.x += 0.001
armature = binding.object
hips = next((bone for bone in armature.pose.bones if 'hips' in bone.name.lower()), None)
if not hips:
    raise RuntimeError('The exported rig has no named hips bone.')
hips.rotation_mode = 'XYZ'
hips.rotation_euler.z = 0.02
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(destination, 'avatar-edited.blend'), compress=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(destination, 'avatar-edited.glb'), export_format='GLB', export_skins=True, export_tangents=True, export_morph=True, export_morph_normal=False, export_animations=False)
with open(os.path.join(destination, 'avatar-edited.glb'), 'rb') as exported_file:
    exported = exported_file.read()
exported_json_length = struct.unpack_from('<I', exported, 12)[0]
exported_gltf = json.loads(exported[20:20 + exported_json_length])
exported_body_node = next(node for node in exported_gltf['nodes'] if node.get('name') == 'Body')
exported_body = exported_gltf['meshes'][exported_body_node['mesh']]
exported_names = exported_body.get('extras', {}).get('targetNames', [])
if len(exported_names) != expected_targets:
    raise RuntimeError('The edited GLB lost its named identity shape keys.')
exported_joint_names = {
    exported_gltf['nodes'][index]['name']
    for skin in exported_gltf['skins'] for index in skin['joints']
}
if not joint_names.issubset(exported_joint_names):
    raise RuntimeError('The edited GLB lost source rig joints.')
exported_eye_counts = {}
for eye in layered_eyes:
    node = next((node for node in exported_gltf['nodes'] if node.get('name') == eye.name), None)
    if node is None:
        raise RuntimeError('The edited GLB lost an eye layer: ' + eye.name)
    exported_eye = exported_gltf['meshes'][node['mesh']]
    count = len(exported_eye.get('extras', {}).get('targetNames', []))
    if count != eye_target_counts[eye.name]:
        raise RuntimeError('The edited GLB lost layered eye shapes: ' + eye.name)
    exported_eye_counts[eye.name] = count
exported_nose_weight = None
if expected_targets:
    original_body_node = next(node for node in gltf['nodes'] if node.get('name') == 'Body')
    original_names = gltf['meshes'][original_body_node['mesh']]['extras']['targetNames']
    if set(exported_names) != set(original_names):
        raise RuntimeError('The edited GLB changed the named identity channels.')
    exported_nose_weight = exported_body['weights'][exported_names.index('noseWider')]
    if abs(exported_nose_weight - nose.value) > 1e-6:
        raise RuntimeError('The edited GLB lost the external shape-key edit.')
report = {
    'blender': bpy.app.version_string,
    'input': source,
    'input_sha256': hashlib.sha256(original).hexdigest(),
    'meshes': len(meshes),
    'dcc_extra_meshes': [item.name for item in scene_meshes if item.name not in source_mesh_names],
    'armatures': len(armatures),
    'joints_per_armature': [len(item.data.bones) for item in armatures],
    'source_glb_joints': len(joint_names),
    'all_source_joints_retained': True,
    'layered_eye_meshes': len(layered_eyes),
    'eye_shape_keys': eye_target_counts,
    'exported_eye_shape_keys': exported_eye_counts,
    'dcc_helper_bones': [bone.name for bone in binding.object.data.bones if bone.name not in joint_names],
    'body_vertices': len(body.data.vertices),
    'body_triangles': sum(len(face.vertices) - 2 for face in body.data.polygons),
    'identity_shape_keys': len(body.data.shape_keys.key_blocks) - 1 if body.data.shape_keys else 0,
    'initial_noseWider_weight': initial_nose_weight,
    'edited_noseWider_weight': body.data.shape_keys.key_blocks['noseWider'].value if expected_targets else None,
    'exported_identity_shape_keys': len(exported_names),
    'exported_noseWider_weight': exported_nose_weight,
    'exported_source_joints_retained': True,
    'external_edits': {'roughness': 0.63, 'vertex_0_x_delta_m': 0.001, 'hips_z_rotation_rad': 0.02},
    'output_glb': 'avatar-edited.glb',
    'semantic_geometry_reimport': 'not-supported',
    'visual_acceptance': 'not-certified',
}
with open(os.path.join(destination, 'blender-edit-verification.json'), 'w', encoding='utf-8') as output:
    json.dump(report, output, indent=2)
print(json.dumps(report))

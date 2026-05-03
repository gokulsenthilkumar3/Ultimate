# Run: blender --background --python generate_humanoid.py
import bpy, os, random

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

MORPH_NAMES = [
    "overall_mass","gut_volume","face_roundness","chest_depth","pec_thickness",
    "deltoid_width","trap_swell","waist_narrow","oblique_def","bicep_peak",
    "tricep_horse","forearm_girth","glute_volume","hip_width","quad_sweep",
    "ham_thickness","calf_diamond","ankle_width","neck_thickness","trap_rise",
    "d_length","d_girth","vascularity_intensity","fitzpatrick_index",
]

# Torso
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.22, depth=0.7, location=(0,0,0.9))
torso = bpy.context.object; torso.name = "Body"

# Head
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.13, location=(0,0,1.45))
bpy.context.object.name = "Head"

# Arms
for side, x in (("L",0.33),("R",-0.33)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=0.055,depth=0.28,location=(x,0,1.18))
    bpy.context.object.name = f"UpperArm_{side}"
for side, x in (("L",0.42),("R",-0.42)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=0.045,depth=0.25,location=(x,0,0.88))
    bpy.context.object.name = f"LowerArm_{side}"

# Legs
for side, x in (("L",0.10),("R",-0.10)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=0.075,depth=0.38,location=(x,0,0.38))
    bpy.context.object.name = f"UpperLeg_{side}"
for side, x in (("L",0.10),("R",-0.10)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=0.055,depth=0.36,location=(x,0,0.0))
    bpy.context.object.name = f"LowerLeg_{side}"

# Join all
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = torso
bpy.ops.object.join()
body = bpy.context.object; body.name = "Body"

# Material
mat = bpy.data.materials.new("SkinMaterial")
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value = (0.76,0.60,0.44,1.0)
bsdf.inputs["Roughness"].default_value = 0.8
body.data.materials.append(mat)

# Shape keys / morph targets
body.shape_key_add(name="Basis", from_mix=False)
for morph_name in MORPH_NAMES:
    sk = body.shape_key_add(name=morph_name, from_mix=False)
    sk.value = 0.0
    random.seed(hash(morph_name))
    for kp in sk.data:
        kp.co.x += random.uniform(-0.005,0.005)
        kp.co.y += random.uniform(-0.005,0.005)
        kp.co.z += random.uniform(-0.003,0.003)

# Armature (Mixamo-compatible bone names)
bpy.ops.object.armature_add(location=(0,0,0))
arm_obj = bpy.context.object; arm_obj.name = "Armature"
arm = arm_obj.data
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.edit_bones
hip = eb[0]; hip.name = "Hips"; hip.head=(0,0,0.55); hip.tail=(0,0,0.75)
def ab(name,head,tail,parent=None):
    b=eb.new(name); b.head=head; b.tail=tail
    if parent: b.parent=eb[parent]
ab("Spine",(0,0,0.75),(0,0,0.95),"Hips")
ab("Spine1",(0,0,0.95),(0,0,1.15),"Spine")
ab("Neck",(0,0,1.30),(0,0,1.42),"Spine1")
ab("Head",(0,0,1.42),(0,0,1.58),"Neck")
ab("LeftShoulder",(0.08,0,1.20),(0.20,0,1.20),"Spine1")
ab("LeftArm",(0.20,0,1.20),(0.33,0,1.03),"LeftShoulder")
ab("LeftForeArm",(0.33,0,1.03),(0.42,0,0.83),"LeftArm")
ab("LeftHand",(0.42,0,0.83),(0.44,0,0.72),"LeftForeArm")
ab("RightShoulder",(-0.08,0,1.20),(-0.20,0,1.20),"Spine1")
ab("RightArm",(-0.20,0,1.20),(-0.33,0,1.03),"RightShoulder")
ab("RightForeArm",(-0.33,0,1.03),(-0.42,0,0.83),"RightArm")
ab("RightHand",(-0.42,0,0.83),(-0.44,0,0.72),"RightForeArm")
ab("LeftUpLeg",(0.10,0,0.55),(0.10,0,0.25),"Hips")
ab("LeftLeg",(0.10,0,0.25),(0.10,0,-0.15),"LeftUpLeg")
ab("LeftFoot",(0.10,0,-0.15),(0.10,0.08,-0.22),"LeftLeg")
ab("RightUpLeg",(-0.10,0,0.55),(-0.10,0,0.25),"Hips")
ab("RightLeg",(-0.10,0,0.25),(-0.10,0,-0.15),"RightUpLeg")
ab("RightFoot",(-0.10,0,-0.15),(-0.10,0.08,-0.22),"RightLeg")
bpy.ops.object.mode_set(mode='OBJECT')

# Parent mesh to armature with auto weights
body.select_set(True); arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.parent_set(type='ARMATURE_AUTO')

# Export
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "humanoid-base.glb")
bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB',
    export_draco_mesh_compression_enable=False,
    export_morph=True, export_morph_normal=True,
    export_skins=True, export_animations=False,
)
print(f"\n✅  GLB exported to: {out}\n")
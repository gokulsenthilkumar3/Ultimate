"""
Pure-Python GLB generator — no Blender needed.
Produces a Mixamo-compatible SkinnedMesh with 24 named morph targets.
Output: humanoid-base.glb
"""

import numpy as np
import struct, json, os
from pygltflib import (
    GLTF2, Scene, Node, Mesh, Primitive, Accessor, BufferView, Buffer,
    Skin, Asset, Material, PbrMetallicRoughness,
    FLOAT, UNSIGNED_SHORT, UNSIGNED_INT, VEC3, VEC4, SCALAR,
    ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER,
)

MORPH_NAMES = [
    "overall_mass","gut_volume","face_roundness","chest_depth","pec_thickness",
    "deltoid_width","trap_swell","waist_narrow","oblique_def","bicep_peak",
    "tricep_horse","forearm_girth","glute_volume","hip_width","quad_sweep",
    "ham_thickness","calf_diamond","ankle_width","neck_thickness","trap_rise",
    "d_length","d_girth","vascularity_intensity","fitzpatrick_index",
]

rng = np.random.default_rng(42)

# ── Build a simple T-pose humanoid body (cylinder stack) ─────────────────────
def cylinder_verts(cx, cy, cz, radius, height, segs=8):
    """Returns (vertices, normals, indices) for a closed cylinder."""
    verts, norms, tris = [], [], []
    half = height / 2
    # side verts: bottom ring then top ring
    for ring_z in [cz - half, cz + half]:
        for i in range(segs):
            a = 2 * np.pi * i / segs
            x = cx + radius * np.cos(a)
            y = cy + radius * np.sin(a)
            verts.append([x, y, ring_z])
            norms.append([np.cos(a), np.sin(a), 0.0])
    base = len(verts)
    # caps
    verts.append([cx, cy, cz - half]); norms.append([0,0,-1])  # bot centre
    verts.append([cx, cy, cz + half]); norms.append([0,0, 1])  # top centre
    bot_c, top_c = base, base + 1

    # side quads
    for i in range(segs):
        n = (i + 1) % segs
        b0, b1, t0, t1 = i, n, segs + i, segs + n
        tris += [[b0,t0,t1],[b0,t1,b1]]
    # caps
    for i in range(segs):
        n = (i + 1) % segs
        tris.append([bot_c, n, i])
        tris.append([top_c, segs+i, segs+n])

    return (np.array(verts, dtype=np.float32),
            np.array(norms, dtype=np.float32),
            np.array(tris,  dtype=np.uint16))

def sphere_verts(cx, cy, cz, radius, lat=6, lon=8):
    verts, norms, tris = [], [], []
    for i in range(lat+1):
        phi = np.pi * i / lat
        for j in range(lon):
            theta = 2 * np.pi * j / lon
            nx = np.sin(phi)*np.cos(theta)
            ny = np.sin(phi)*np.sin(theta)
            nz = np.cos(phi)
            verts.append([cx+radius*nx, cy+radius*ny, cz+radius*nz])
            norms.append([nx, ny, nz])
    for i in range(lat):
        for j in range(lon):
            n = (j+1) % lon
            a, b = i*lon+j, i*lon+n
            c, d = (i+1)*lon+j, (i+1)*lon+n
            tris += [[a,b,d],[a,d,c]]
    return (np.array(verts, dtype=np.float32),
            np.array(norms, dtype=np.float32),
            np.array(tris,  dtype=np.uint16))

# Body parts: (cx, cy, cz, radius, height/sphere_flag)
parts = []

# Torso
v,n,t = cylinder_verts(0,0,0.9, 0.22,0.70, segs=16); parts.append((v,n,t))
# Head (sphere)
v,n,t = sphere_verts(0,0,1.45, 0.13);                 parts.append((v,n,t))
# Upper arms
for x in [0.33, -0.33]:
    v,n,t = cylinder_verts(x,0,1.18, 0.055,0.28);     parts.append((v,n,t))
# Forearms
for x in [0.42, -0.42]:
    v,n,t = cylinder_verts(x,0,0.88, 0.045,0.25);     parts.append((v,n,t))
# Upper legs
for x in [0.10, -0.10]:
    v,n,t = cylinder_verts(x,0,0.38, 0.075,0.38);     parts.append((v,n,t))
# Lower legs
for x in [0.10, -0.10]:
    v,n,t = cylinder_verts(x,0,0.00, 0.055,0.36);     parts.append((v,n,t))

# ── Merge all parts into one mesh ────────────────────────────────────────────
all_v, all_n, all_t = [], [], []
offset = 0
for (v, n, t) in parts:
    all_v.append(v)
    all_n.append(n)
    all_t.append(t.astype(np.uint16) + offset)
    offset += len(v)

positions  = np.concatenate(all_v, axis=0).astype(np.float32)  # (N,3)
normals    = np.concatenate(all_n, axis=0).astype(np.float32)
indices    = np.concatenate(all_t, axis=0).reshape(-1).astype(np.uint16)
N = len(positions)
print(f"Mesh: {N} verts, {len(indices)//3} tris")

# ── Bone weights ─────────────────────────────────────────────────────────────
# Simple: each vertex gets weight 1.0 on joint 0 (Hips proxy)
joints0  = np.zeros((N, 4), dtype=np.uint16)
weights0 = np.zeros((N, 4), dtype=np.float32)
weights0[:, 0] = 1.0   # all verts fully on joint 0

# ── Morph target deltas (small random displacements) ─────────────────────────
morphs = []
for name in MORPH_NAMES:
    seed = abs(hash(name)) % (2**31)
    r = np.random.default_rng(seed)
    delta = r.uniform(-0.008, 0.008, (N, 3)).astype(np.float32)
    morphs.append(delta)

# ── Pack binary buffer ────────────────────────────────────────────────────────
def to_bytes(arr): return arr.tobytes()

chunks = []
def add_chunk(arr):
    b = to_bytes(arr)
    # pad to 4 bytes
    pad = (4 - len(b) % 4) % 4
    b += b'\x00' * pad
    chunks.append(b)
    return len(b)

# track byte offsets & lengths
bv_infos = []  # (byteOffset, byteLength, target)
byte_offset = 0

def push(arr, target=None):
    global byte_offset
    raw = to_bytes(arr)
    pad = (4 - len(raw) % 4) % 4
    padded = raw + b'\x00' * pad
    bv_infos.append((byte_offset, len(raw), target))
    byte_offset += len(padded)
    chunks.append(padded)
    return len(bv_infos) - 1  # bufferView index

bv_idx   = push(indices,  ELEMENT_ARRAY_BUFFER)
bv_pos   = push(positions, ARRAY_BUFFER)
bv_nor   = push(normals,   ARRAY_BUFFER)
bv_jt    = push(joints0,   ARRAY_BUFFER)
bv_wt    = push(weights0,  ARRAY_BUFFER)

morph_bv = []
for d in morphs:
    morph_bv.append(push(d, ARRAY_BUFFER))

bin_data = b''.join(chunks)

# ── Build GLTF JSON ───────────────────────────────────────────────────────────
gltf = GLTF2()
gltf.asset = Asset(version="2.0", generator="GrowthTrack GLB Generator")

# Buffer
gltf.buffers.append(Buffer(byteLength=len(bin_data)))

# BufferViews
for (bo, bl, target) in bv_infos:
    bv = BufferView(buffer=0, byteOffset=bo, byteLength=bl)
    if target: bv.target = target
    gltf.bufferViews.append(bv)

# Accessors helper
def acc(bv_index, comp_type, count, acc_type, mn=None, mx=None):
    a = Accessor(
        bufferView=bv_index,
        byteOffset=0,
        componentType=comp_type,
        count=count,
        type=acc_type,
    )
    if mn is not None: a.min = [float(x) for x in mn]
    if mx is not None: a.max = [float(x) for x in mx]
    gltf.accessors.append(a)
    return len(gltf.accessors) - 1

pos_min = positions.min(axis=0).tolist()
pos_max = positions.max(axis=0).tolist()

acc_idx  = acc(bv_idx, UNSIGNED_SHORT, len(indices),  SCALAR, [0], [int(indices.max())])
acc_pos  = acc(bv_pos, FLOAT, N, VEC3, pos_min, pos_max)
acc_nor  = acc(bv_nor, FLOAT, N, VEC3)
acc_jt   = acc(bv_jt,  UNSIGNED_SHORT, N, VEC4)
acc_wt   = acc(bv_wt,  FLOAT, N, VEC4)

morph_acc = []
for i, d in enumerate(morphs):
    mn = d.min(axis=0).tolist()
    mx = d.max(axis=0).tolist()
    morph_acc.append(acc(morph_bv[i], FLOAT, N, VEC3, mn, mx))

# Material
gltf.materials.append(Material(
    name="SkinMaterial",
    pbrMetallicRoughness=PbrMetallicRoughness(
        baseColorFactor=[0.76, 0.60, 0.44, 1.0],
        roughnessFactor=0.8,
        metallicFactor=0.0,
    ),
    doubleSided=False,
))

# Morph target list for primitive
morph_targets = [{"POSITION": morph_acc[i]} for i in range(len(MORPH_NAMES))]

# Mesh primitive
prim = Primitive(
    attributes={
        "POSITION": acc_pos,
        "NORMAL":   acc_nor,
        "JOINTS_0": acc_jt,
        "WEIGHTS_0":acc_wt,
    },
    indices=acc_idx,
    material=0,
    targets=morph_targets,
)

mesh = Mesh(name="Body", primitives=[prim])
mesh.extras = {"targetNames": MORPH_NAMES}
gltf.meshes.append(mesh)

# Single joint node (Hips proxy)
gltf.nodes.append(Node(name="Hips", translation=[0,0,0]))

# Body mesh node
body_node_idx = len(gltf.nodes)
gltf.nodes.append(Node(name="Body", mesh=0, skin=0))

# Skin (inverse bind = identity)
identity = np.eye(4, dtype=np.float32)
ibm_data = identity.tobytes()
ibm_pad  = (4 - len(ibm_data) % 4) % 4
ibm_data += b'\x00' * ibm_pad

ibm_bv_idx = len(gltf.bufferViews)
gltf.bufferViews.append(BufferView(
    buffer=0, byteOffset=byte_offset, byteLength=len(ibm_data)
))
ibm_acc_idx = len(gltf.accessors)
gltf.accessors.append(Accessor(
    bufferView=ibm_bv_idx, byteOffset=0,
    componentType=FLOAT, count=1, type="MAT4"
))
bin_data += ibm_data

gltf.skins.append(Skin(name="Armature", joints=[0], inverseBindMatrices=ibm_acc_idx))

# Root scene node
root_idx = len(gltf.nodes)
gltf.nodes.append(Node(name="Armature", children=[0, body_node_idx]))
gltf.scenes.append(Scene(nodes=[root_idx]))
gltf.scene = 0

# Update buffer byteLength
gltf.buffers[0].byteLength = len(bin_data)

# ── Write GLB ─────────────────────────────────────────────────────────────────
out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "humanoid-base.glb")
gltf.set_binary_blob(bin_data)
gltf.save(out_path)
print(f"\n✅  Exported: {out_path}")
print(f"   Vertices : {N}")
print(f"   Triangles: {len(indices)//3}")
print(f"   Morphs   : {len(MORPH_NAMES)}")
for i, name in enumerate(MORPH_NAMES):
    print(f"     [{i:02d}] {name}")
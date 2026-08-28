#!/usr/bin/env python3
"""Build a browser-ready GrowthTrack body GLB from the bundled CC0 MakeHuman data.

This converter intentionally keeps the source data outside public/ and emits
separate body and privacy-controlled anatomy meshes with sparse morph accessors.
It preserves the original HM08 vertex indices, UV seams, real topology, and
named metric channels.
"""

from __future__ import annotations

import argparse
import json
import struct
import zlib
from pathlib import Path

import numpy as np


SCALE = 0.1  # MakeHuman source units are centimetres; GLB uses metres.

# The current profile target is a young athletic male. MakeHuman macro targets
# are absolute blend shapes from its neutral base, so this establishes a male,
# high-muscle production silhouette before measurement-specific morphs are
# layered on top.
BASE_SCULPT_SOURCES = [
    ("targets/macrodetails/universal-male-young-maxmuscle-averageweight", 1.0),
]


MORPH_SOURCES = {
    "overall_mass": [
        ("targets/macrodetails/universal-male-young-averagemuscle-maxweight", 1.0),
    ],
    "gut_volume": [("targets/measure/measure-waist-circ-incr", 0.75), ("targets/stomach/stomach-tone-decr", 0.35)],
    "face_roundness": [("targets/cheek/l-cheek-volume-incr", 0.5), ("targets/cheek/r-cheek-volume-incr", 0.5), ("targets/head/head-scale-depth-incr", 0.25)],
    "chest_depth": [("targets/torso/torso-scale-depth-incr", 1.0)],
    "pec_thickness": [("targets/torso/torso-muscle-pectoral-incr", 1.0)],
    "deltoid_width": [("targets/armslegs/l-upperarm-shoulder-muscle-incr", 0.5), ("targets/armslegs/r-upperarm-shoulder-muscle-incr", 0.5)],
    "trap_swell": [("targets/torso/torso-muscle-dorsi-incr", 0.8), ("targets/neck/neck-back-scale-depth-incr", 0.25)],
    "waist_narrow": [("targets/measure/measure-waist-circ-decr", 1.0)],
    "oblique_def": [("targets/stomach/stomach-tone-incr", 0.65), ("targets/hip/hip-waist-down", 0.2)],
    "bicep_peak": [("targets/armslegs/l-upperarm-muscle-incr", 0.5), ("targets/armslegs/r-upperarm-muscle-incr", 0.5)],
    "tricep_horse": [("targets/armslegs/l-upperarm-muscle-incr", 0.5), ("targets/armslegs/r-upperarm-muscle-incr", 0.5)],
    "forearm_girth": [("targets/armslegs/l-lowerarm-muscle-incr", 0.5), ("targets/armslegs/r-lowerarm-muscle-incr", 0.5)],
    "glute_volume": [("targets/buttocks/buttocks-volume-incr", 1.0)],
    "hip_width": [("targets/hip/hip-scale-horiz-incr", 1.0)],
    "quad_sweep": [("targets/armslegs/l-upperleg-muscle-incr", 0.5), ("targets/armslegs/r-upperleg-muscle-incr", 0.5)],
    "ham_thickness": [("targets/armslegs/l-upperleg-scale-depth-incr", 0.5), ("targets/armslegs/r-upperleg-scale-depth-incr", 0.5)],
    "calf_diamond": [("targets/armslegs/l-lowerleg-muscle-incr", 0.5), ("targets/armslegs/r-lowerleg-muscle-incr", 0.5)],
    "ankle_width": [("targets/measure/measure-ankle-circ-incr", 1.0)],
    "neck_thickness": [("targets/measure/measure-neck-circ-incr", 1.0)],
    "trap_rise": [("targets/neck/neck-scale-vert-incr", 0.65), ("targets/torso/torso-trans-up", 0.12)],
    "torso_length": [("targets/torso/torso-scale-vert-incr", 1.0)],
    "shoulder_slope": [("targets/measure/measure-shoulder-dist-incr", 0.4), ("targets/armslegs/l-upperarm-shoulder-muscle-incr", 0.3), ("targets/armslegs/r-upperarm-shoulder-muscle-incr", 0.3)],
    "clavicle_width": [("targets/measure/measure-shoulder-dist-incr", 1.0)],
    "ribcage_depth": [("targets/torso/torso-scale-depth-incr", 1.0)],
    "pelvis_width": [("targets/hip/hip-scale-horiz-incr", 0.8), ("targets/pelvis/bulge-incr", 0.2)],
    "neck_length": [("targets/measure/measure-neck-height-incr", 1.0)],
    "upper_arm_length": [("targets/armslegs/l-upperarm-scale-vert-incr", 0.5), ("targets/armslegs/r-upperarm-scale-vert-incr", 0.5)],
    "forearm_length": [("targets/armslegs/l-lowerarm-scale-vert-incr", 0.5), ("targets/armslegs/r-lowerarm-scale-vert-incr", 0.5)],
    "hand_length": [("targets/armslegs/l-hand-fingers-length-incr", 0.5), ("targets/armslegs/r-hand-fingers-length-incr", 0.5)],
    "leg_length": [("targets/measure/measure-upperleg-height-incr", 0.5), ("targets/measure/measure-lowerleg-height-incr", 0.5)],
    "foot_length": [("targets/armslegs/l-foot-scale-depth-incr", 0.5), ("targets/armslegs/r-foot-scale-depth-incr", 0.5)],
    "head_circumference": [("targets/head/head-scale-horiz-incr", 0.5), ("targets/head/head-scale-depth-incr", 0.5)],
    "brow_depth": [("targets/forehead/forehead-trans-forward", 1.0)],
    "nose_bridge_width": [("targets/nose/nose-width1-incr", 1.0)],
    "nose_tip_size": [("targets/nose/nose-point-width-incr", 1.0)],
    "ear_prominence": [("targets/ears/l-ear-trans-out", 0.5), ("targets/ears/r-ear-trans-out", 0.5)],
    "jaw_width": [("targets/chin/chin-width-incr", 1.0)],
    "chin_projection": [("targets/chin/chin-prognathism-incr", 1.0)],
    "lip_fullness": [("targets/mouth/mouth-upperlip-volume-incr", 0.5), ("targets/mouth/mouth-lowerlip-volume-incr", 0.5)],
    "eye_size": [("targets/eyes/l-eye-scale-incr", 0.5), ("targets/eyes/r-eye-scale-incr", 0.5)],
    "cheekbone_width": [("targets/cheek/l-cheek-bones-incr", 0.5), ("targets/cheek/r-cheek-bones-incr", 0.5)],
    "forehead_height": [("targets/forehead/forehead-scale-vert-incr", 1.0)],
    "temple_narrowing": [("targets/forehead/forehead-temple-decr", 1.0)],
    "nose_length": [("targets/nose/nose-scale-vert-incr", 1.0)],
    "jaw_angle": [("targets/chin/chin-jaw-drop-incr", 1.0)],
    "shoulder_drop": [("targets/armslegs/l-upperarm-trans-down", 0.5), ("targets/armslegs/r-upperarm-trans-down", 0.5)],
    "d_length": [("targets/genitals/penis-length-incr", 1.0)],
    "d_girth": [("targets/genitals/penis-circ-incr", 1.0)],
    "knee_spacing": [("targets/measure/measure-knee-circ-incr", 0.15)],
    "ankle_taper": [("targets/measure/measure-ankle-circ-decr", 0.35)],
    "hand_splay": [("targets/armslegs/l-hand-fingers-distance-incr", 0.5), ("targets/armslegs/r-hand-fingers-distance-incr", 0.5)],
    "foot_arch": [("targets/armslegs/l-foot-scale-depth-incr", 0.15), ("targets/armslegs/r-foot-scale-depth-incr", 0.15)],
}


def target_delta(targets, stem: str, vertex_count: int) -> np.ndarray:
    """Return a dense source-space delta in metres, or zeros if optional."""
    index_key = f"{stem}.index"
    vector_key = f"{stem}.vector"
    if index_key not in targets or vector_key not in targets:
        return np.zeros((vertex_count, 3), dtype=np.float32)
    result = np.zeros((vertex_count, 3), dtype=np.float32)
    indices = targets[index_key].astype(np.int64, copy=False)
    vectors = targets[vector_key].astype(np.float32, copy=False) * 0.001
    valid = (indices >= 0) & (indices < vertex_count)
    result[indices[valid]] += vectors[valid]
    return result


def procedural_anatomy_delta(name: str, coords: np.ndarray) -> np.ndarray:
    """Add restrained high-level muscle landmarks missing from the HM08 targets.

    These are smooth regional displacements, not replacement geometry. They are
    layered on top of the MakeHuman targets so measured circumference changes
    retain the production topology while biceps, abs, triceps and glutes read
    clearly under normal and rim lighting.
    """
    delta = np.zeros_like(coords, dtype=np.float32)
    x, y, z = coords[:, 0], coords[:, 1], coords[:, 2]
    abs_x = np.abs(x)

    if name == "oblique_def":
        torso = np.exp(-((y - 0.18) / 0.19) ** 6)
        front = np.clip((z - 0.075) / 0.075, 0.0, 1.0)
        medial = np.exp(-(abs_x / 0.145) ** 6)
        mask = torso * front * medial
        lobes = np.zeros_like(x)
        for cy in (0.095, 0.165, 0.235):
            for cx in (-0.052, 0.052):
                lobes += np.exp(-((x - cx) / 0.042) ** 2 - ((y - cy) / 0.036) ** 2)
        linea_alba = np.exp(-(x / 0.011) ** 2) * np.exp(-((y - 0.17) / 0.16) ** 6)
        transverse = sum(
            np.exp(-((y - cy) / 0.010) ** 2) for cy in (0.13, 0.20, 0.27)
        ) * np.exp(-(abs_x / 0.115) ** 6)
        obliques = np.exp(-((abs_x - 0.115) / 0.035) ** 2) * np.exp(-((y - 0.16) / 0.15) ** 4)
        delta[:, 2] += mask * (0.022 * lobes + 0.008 * obliques)
        delta[:, 2] -= front * (0.0062 * linea_alba + 0.0048 * transverse)

    elif name in ("bicep_peak", "tricep_horse"):
        upper_arm = np.exp(-((abs_x - 0.235) / 0.075) ** 2 - ((y - 0.435) / 0.090) ** 2)
        lateral = np.clip((abs_x - 0.135) / 0.12, 0.0, 1.0)
        delta[:, 0] += np.sign(x) * upper_arm * lateral * 0.0065
        if name == "bicep_peak":
            front = np.clip((z + 0.025) / 0.085, 0.0, 1.0)
            peak = np.exp(-((y - 0.445) / 0.060) ** 2)
            delta[:, 2] += upper_arm * (0.007 + 0.015 * front * peak)
        else:
            back = np.clip((0.055 - z) / 0.090, 0.0, 1.0)
            horseshoe = 0.65 + 0.35 * np.exp(-((y - 0.405) / 0.055) ** 2)
            delta[:, 2] -= upper_arm * back * horseshoe * 0.016

    elif name == "glute_volume":
        lobe = np.exp(-((abs_x - 0.105) / 0.080) ** 2 - ((y + 0.105) / 0.125) ** 2)
        back = np.clip((0.075 - z) / 0.18, 0.0, 1.0)
        projection = lobe * back
        delta[:, 2] -= projection * 0.028
        delta[:, 0] += np.sign(x) * projection * 0.006
        central_cleft = np.exp(-(x / 0.021) ** 2) * np.exp(-((y + 0.105) / 0.125) ** 4) * back
        lower_fold = np.exp(-((y + 0.225) / 0.018) ** 2) * np.exp(-((abs_x - 0.105) / 0.095) ** 4) * back
        delta[:, 2] += 0.0080 * central_cleft + 0.0055 * lower_fold

    return delta


def base_muscle_detail(coords: np.ndarray) -> np.ndarray:
    """Give the default athletic body readable landmarks before sliders apply.

    The source HM08 mesh has production topology but a deliberately neutral
    surface. These restrained, smooth displacements establish the visible
    pectoral shelf, abdominal blocks, arm roundness, glute projection and leg
    separation in the base asset. The named morphs above still add the user's
    measured volume on top of this base instead of being the only place where
    anatomy exists.
    """
    delta = np.zeros_like(coords, dtype=np.float32)
    x, y, z = coords[:, 0], coords[:, 1], coords[:, 2]
    abs_x = np.abs(x)
    front = np.clip((z - 0.060) / 0.090, 0.0, 1.0)
    back = np.clip((0.065 - z) / 0.19, 0.0, 1.0)

    # Separated pectoral masses with a soft lower border.
    pec = np.exp(-((abs_x - 0.100) / 0.095) ** 4 - ((y - 0.315) / 0.105) ** 4) * front
    pec_lower = np.exp(-((y - 0.245) / 0.018) ** 2) * np.exp(-((abs_x - 0.105) / 0.105) ** 4) * front
    delta[:, 2] += pec * 0.014
    delta[:, 2] -= pec_lower * 0.0025

    # Six abdominal blocks, central linea alba and transverse separations.
    torso = np.exp(-((y - 0.175) / 0.195) ** 6) * front
    medial = np.exp(-(abs_x / 0.145) ** 6)
    blocks = np.zeros_like(x)
    for cy in (0.090, 0.160, 0.230):
        for cx in (-0.052, 0.052):
            blocks += np.exp(-((x - cx) / 0.043) ** 2 - ((y - cy) / 0.038) ** 2)
    linea = np.exp(-(x / 0.012) ** 2) * np.exp(-((y - 0.17) / 0.16) ** 6)
    transverse = sum(np.exp(-((y - cy) / 0.011) ** 2) for cy in (0.125, 0.195, 0.265)) * np.exp(-(abs_x / 0.115) ** 6)
    obliques = np.exp(-((abs_x - 0.115) / 0.036) ** 2) * np.exp(-((y - 0.16) / 0.15) ** 4)
    delta[:, 2] += torso * medial * (0.008 * blocks + 0.0028 * obliques)
    delta[:, 2] -= front * (0.0026 * linea + 0.0021 * transverse)

    # Rounded deltoid cap and upper-arm mass, keeping the elbow and shoulder
    # transitions continuous rather than adding separate primitive parts.
    delt = np.exp(-((abs_x - 0.300) / 0.090) ** 2 - ((y - 0.405) / 0.105) ** 2)
    upper_arm = np.exp(-((abs_x - 0.235) / 0.080) ** 2 - ((y - 0.360) / 0.190) ** 2)
    arm_lateral = np.clip((abs_x - 0.135) / 0.12, 0.0, 1.0)
    delta[:, 0] += np.sign(x) * (delt * 0.006 + upper_arm * arm_lateral * 0.005)
    delta[:, 2] += delt * 0.006 + upper_arm * front * 0.005

    # Gluteal projection and lower fold, visible from the rear and still
    # smooth enough to remain believable in neutral/profile views.
    glute = np.exp(-((abs_x - 0.108) / 0.082) ** 2 - ((y + 0.105) / 0.135) ** 2) * back
    cleft = np.exp(-(x / 0.022) ** 2) * np.exp(-((y + 0.105) / 0.13) ** 4) * back
    fold = np.exp(-((y + 0.225) / 0.020) ** 2) * np.exp(-((abs_x - 0.108) / 0.10) ** 4) * back
    delta[:, 2] -= glute * 0.010
    delta[:, 2] += cleft * 0.0045 + fold * 0.0032

    # Athletic leg landmarks: outer quad sweep, hamstring mass, and diamond
    # calf. These remain low amplitude so measurements still own the result.
    quad = np.exp(-((abs_x - 0.160) / 0.090) ** 2 - ((y + 0.390) / 0.165) ** 2)
    ham = np.exp(-((abs_x - 0.155) / 0.095) ** 2 - ((y + 0.420) / 0.170) ** 2) * back
    calf = np.exp(-((abs_x - 0.145) / 0.075) ** 2 - ((y + 0.665) / 0.135) ** 2)
    delta[:, 0] += np.sign(x) * (quad * 0.004 + ham * 0.003 + calf * 0.003)
    delta[:, 2] += quad * front * 0.0035 + calf * 0.0025

    return delta


def make_private_anatomy_mesh() -> dict:
    """Build a smooth, independently controllable male external-anatomy mesh.

    The source HM08 helper has useful placement data but is intentionally very
    sparse. A compact parametric surface gives the privacy-controlled region
    enough radial resolution for clean silhouettes and lets d_length/d_girth
    deform the actual surface rather than only changing UI labels.
    """
    positions = []
    uv_values = []
    length_deltas = []
    girth_deltas = []
    triangles = []

    center_z = 0.122
    base_y = -0.006
    shaft_length = 0.104
    segments = 32

    def add_vertex(position, uv, length_delta=(0.0, 0.0, 0.0), girth_delta=(0.0, 0.0, 0.0)):
        positions.append(position)
        uv_values.append(uv)
        length_deltas.append(length_delta)
        girth_deltas.append(girth_delta)
        return len(positions) - 1

    # Shaft and glans profile, oriented along the humanoid's vertical Y axis.
    profile = [
        (base_y, 0.015),
        (-0.016, 0.019),
        (-0.046, 0.021),
        (-0.078, 0.020),
        (-0.096, 0.024),
        (-0.108, 0.022),
        (-0.116, 0.012),
    ]
    rings = []
    for ring_index, (y, radius) in enumerate(profile):
        ring = []
        fraction = np.clip((base_y - y) / shaft_length, 0.0, 1.0)
        for segment in range(segments):
            theta = (segment / segments) * np.pi * 2.0
            radial = np.asarray([np.cos(theta) * radius, 0.0, np.sin(theta) * radius], dtype=np.float32)
            ring.append(add_vertex(
                (float(radial[0]), float(y), float(center_z + radial[2])),
                (segment / segments, ring_index / max(len(profile) - 1, 1)),
                (0.0, float(-0.105 * fraction), 0.0),
                tuple((radial * 0.44).tolist()),
            ))
        rings.append(ring)
    for ring_a, ring_b in zip(rings[:-1], rings[1:]):
        for segment in range(segments):
            a = ring_a[segment]
            b = ring_a[(segment + 1) % segments]
            c = ring_b[(segment + 1) % segments]
            d = ring_b[segment]
            triangles.extend((a, b, c, a, c, d))

    # Compact paired testicular surfaces, kept as smooth UV spheres in the
    # same protected primitive so they follow girth changes coherently.
    sphere_segments = 24
    sphere_rings = 12
    for side in (-1.0, 1.0):
        sphere_center = np.asarray([side * 0.023, -0.040, 0.114], dtype=np.float32)
        sphere_radius = 0.018
        sphere_rows = []
        for row in range(sphere_rings + 1):
            phi = (row / sphere_rings) * np.pi
            row_ids = []
            for segment in range(sphere_segments):
                theta = (segment / sphere_segments) * np.pi * 2.0
                local = np.asarray([
                    np.sin(phi) * np.cos(theta),
                    np.cos(phi) * 0.92,
                    np.sin(phi) * np.sin(theta),
                ], dtype=np.float32) * sphere_radius
                row_ids.append(add_vertex(
                    tuple((sphere_center + local).tolist()),
                    (segment / sphere_segments, row / sphere_rings),
                    (0.0, 0.0, 0.0),
                    tuple((local * 0.22).tolist()),
                ))
            sphere_rows.append(row_ids)
        for row in range(sphere_rings):
            for segment in range(sphere_segments):
                a = sphere_rows[row][segment]
                b = sphere_rows[row][(segment + 1) % sphere_segments]
                c = sphere_rows[row + 1][(segment + 1) % sphere_segments]
                d = sphere_rows[row + 1][segment]
                triangles.extend((a, b, c, a, c, d))

    positions = np.asarray(positions, dtype=np.float32)
    uv_values = np.asarray(uv_values, dtype=np.float32)
    indices = np.asarray(triangles, dtype=np.uint32)
    normals = np.zeros_like(positions)
    tri = positions[indices].reshape(-1, 3, 3)
    cross = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    for offset in range(3):
        np.add.at(normals, indices[offset::3], cross)
    lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    normals /= np.maximum(lengths, 1e-8)

    return {
        "positions": positions,
        "normals": normals,
        "colors": np.ones_like(positions, dtype=np.float32),
        "uv_values": uv_values,
        "indices": indices,
        "morphs": {
            "d_length": np.asarray(length_deltas, dtype=np.float32),
            "d_girth": np.asarray(girth_deltas, dtype=np.float32),
        },
        "original_index": np.arange(len(positions), dtype=np.int64),
        "missing": [],
    }


def athletic_male_base_delta(coords: np.ndarray) -> np.ndarray:
    """Refine the neutral HM08 macro result into a clear athletic male frame."""
    delta = np.zeros_like(coords, dtype=np.float32)
    x, y, z = coords[:, 0], coords[:, 1], coords[:, 2]
    abs_x = np.abs(x)
    shoulder = np.exp(-((y - 0.435) / 0.165) ** 4)
    upper_torso = np.exp(-((y - 0.265) / 0.145) ** 4)
    pelvis = np.exp(-((y + 0.075) / 0.175) ** 4)
    # Scale the full cross-section instead of only its outer vertices. This
    # preserves continuity through the armpit and pelvis while producing the
    # shoulder-to-waist taper expected from an athletic male frame.
    delta[:, 0] += x * (0.19 * shoulder + 0.085 * upper_torso - 0.18 * pelvis)

    # Replace a rounded breast silhouette with a flatter pectoral shelf while
    # keeping nipple and skin topology intact.
    chest_front = np.clip((z - 0.070) / 0.090, 0.0, 1.0)
    breast_roundness = np.exp(-((abs_x - 0.078) / 0.066) ** 2 - ((y - 0.335) / 0.078) ** 2)
    pec_plate = np.exp(-((abs_x - 0.090) / 0.095) ** 4 - ((y - 0.355) / 0.090) ** 4)
    delta[:, 2] += chest_front * (-0.043 * breast_roundness + 0.024 * pec_plate)

    return delta


def surface_colors(positions: np.ndarray, body: bool) -> np.ndarray:
    """Add restrained albedo contrast at key muscle separations."""
    colors = np.ones_like(positions, dtype=np.float32)
    if not body:
        return colors
    x, y, z = positions[:, 0], positions[:, 1], positions[:, 2]
    abs_x = np.abs(x)
    front = np.clip((z - 0.075) / 0.075, 0.0, 1.0)
    back = np.clip((0.075 - z) / 0.18, 0.0, 1.0)
    core = np.exp(-((y - 0.18) / 0.19) ** 6) * front
    linea = np.exp(-(x / 0.011) ** 2) * np.exp(-((y - 0.17) / 0.16) ** 6)
    transverse = sum(np.exp(-((y - cy) / 0.011) ** 2) for cy in (0.13, 0.20, 0.27)) * np.exp(-(abs_x / 0.12) ** 6)
    pec_fold = np.exp(-((y - 0.275) / 0.022) ** 2) * np.exp(-((abs_x - 0.085) / 0.10) ** 4) * front
    abs_separation = np.clip(core * (0.95 * linea + 0.62 * transverse), 0.0, 1.0)
    glute_cleft = np.exp(-(x / 0.021) ** 2) * np.exp(-((y + 0.105) / 0.13) ** 4) * back
    glute_fold = np.exp(-((y + 0.225) / 0.021) ** 2) * np.exp(-((abs_x - 0.105) / 0.10) ** 4) * back
    deep = np.clip(abs_separation * 0.24 + pec_fold * 0.14 + glute_cleft * 0.20 + glute_fold * 0.16, 0.0, 0.42)
    colors[:, 0] -= deep * 0.30
    colors[:, 1] -= deep * 0.34
    colors[:, 2] -= deep * 0.28
    return colors


def make_mesh(base, targets, group_index: int, morph_names=None, add_anatomy_detail=False):
    coords = base["coord"].astype(np.float32) * SCALE
    for stem, weight in BASE_SCULPT_SOURCES:
        coords += target_delta(targets, stem, len(coords)) * weight * SCALE
    if group_index == 0:
        coords += athletic_male_base_delta(coords)
        coords += base_muscle_detail(coords)
    texco = base["texco"].astype(np.float32)
    faces = base["fvert"].astype(np.int64)
    uvs = base["fuvs"].astype(np.int64)
    selected_faces = np.flatnonzero(base["group"] == group_index)

    vertex_map = {}
    positions = []
    uv_values = []
    original_index = []
    triangles = []

    for face_index in selected_faces:
        corners = []
        for corner in range(4):
            key = (int(faces[face_index, corner]), int(uvs[face_index, corner]))
            if key not in vertex_map:
                vertex_map[key] = len(positions)
                original_index.append(key[0])
                positions.append(coords[key[0]])
                uv_values.append(texco[key[1]])
            corners.append(vertex_map[key])
        triangles.extend((corners[0], corners[1], corners[2], corners[0], corners[2], corners[3]))

    positions = np.asarray(positions, dtype=np.float32)
    uv_values = np.asarray(uv_values, dtype=np.float32)
    # MakeHuman stores OBJ-style UVs (origin at the bottom left); glTF uses the
    # opposite V convention. Without this flip, skin islands land on unrelated
    # body regions and appear as large colour patches.
    uv_values[:, 1] = 1.0 - uv_values[:, 1]
    original_index = np.asarray(original_index, dtype=np.int64)
    indices = np.asarray(triangles, dtype=np.uint32)

    normals = np.zeros_like(positions)
    tri = positions[indices].reshape(-1, 3, 3)
    cross = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    for offset in range(3):
        np.add.at(normals, indices[offset::3], cross)
    lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    normals /= np.maximum(lengths, 1e-8)
    colors = surface_colors(positions, group_index == 0)

    morphs = {}
    missing = []
    names = list(morph_names or MORPH_SOURCES.keys())
    for name in names:
        sources = MORPH_SOURCES[name]
        delta = np.zeros((len(coords), 3), dtype=np.float32)
        found = False
        for stem, weight in sources:
            if f"{stem}.index" in targets:
                found = True
            delta += target_delta(targets, stem, len(coords)) * weight * SCALE
        if add_anatomy_detail:
            delta += procedural_anatomy_delta(name, coords)
        if not found and group_index == 0 and name not in ("d_length", "d_girth"):
            missing.append(name)
        morphs[name] = delta[original_index]

    return {
        "positions": positions,
        "normals": normals,
        "colors": colors,
        "uv_values": uv_values,
        "indices": indices,
        "morphs": morphs,
        "original_index": original_index,
        "missing": missing,
    }


class GlbWriter:
    def __init__(self):
        self.binary = bytearray()
        self.buffer_views = []
        self.accessors = []

    def blob(self, data: bytes, target=None):
        while len(self.binary) % 4:
            self.binary.append(0)
        offset = len(self.binary)
        self.binary.extend(data)
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if target is not None:
            view["target"] = target
        self.buffer_views.append(view)
        return len(self.buffer_views) - 1

    def accessor(self, view, component_type, count, kind, minimum=None, maximum=None):
        item = {"bufferView": view, "componentType": component_type, "count": count, "type": kind}
        if minimum is not None:
            item["min"] = minimum
            item["max"] = maximum
        self.accessors.append(item)
        return len(self.accessors) - 1

    def sparse_accessor(self, values: np.ndarray, original_index: np.ndarray):
        changed = np.flatnonzero(np.linalg.norm(values, axis=1) > 1e-7)
        if not len(changed):
            self.accessors.append({"componentType": 5126, "count": len(values), "type": "VEC3"})
            return len(self.accessors) - 1
        source_vertices = original_index[changed]
        order = np.argsort(changed, kind="stable")
        changed = changed[order]
        index_view = self.blob(changed.astype(np.uint32).tobytes())
        value_view = self.blob(values[changed].astype(np.float32).tobytes())
        accessor = {
            "componentType": 5126,
            "count": len(values),
            "type": "VEC3",
            "sparse": {
                "count": len(changed),
                "indices": {"bufferView": index_view, "componentType": 5125},
                "values": {"bufferView": value_view},
            },
        }
        self.accessors.append(accessor)
        return len(self.accessors) - 1


def flat_normal_png():
    def chunk(kind, payload):
        return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
    raw = b"\x00\x80\x80\xff"
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


def build_glb(body, private_anatomy, output: Path, skin_texture: Path | None = None):
    writer = GlbWriter()
    bone_specs = [
        ("Hips", None, (0.00, -0.10, 0.00)), ("Spine", "Hips", (0.00, 0.08, 0.00)),
        ("Spine1", "Spine", (0.00, 0.20, 0.00)), ("Spine2", "Spine1", (0.00, 0.20, 0.00)),
        ("Neck", "Spine2", (0.00, 0.18, 0.00)), ("Head", "Neck", (0.00, 0.16, 0.00)),
        ("LeftShoulder", "Spine2", (-0.19, 0.04, 0.00)), ("LeftUpperArm", "LeftShoulder", (-0.16, -0.02, 0.00)),
        ("LeftForeArm", "LeftUpperArm", (-0.17, -0.22, 0.00)), ("LeftHand", "LeftForeArm", (-0.10, -0.20, 0.00)),
        ("RightShoulder", "Spine2", (0.19, 0.04, 0.00)), ("RightUpperArm", "RightShoulder", (0.16, -0.02, 0.00)),
        ("RightForeArm", "RightUpperArm", (0.17, -0.22, 0.00)), ("RightHand", "RightForeArm", (0.10, -0.20, 0.00)),
        ("LeftUpLeg", "Hips", (-0.10, -0.20, 0.00)), ("LeftLeg", "LeftUpLeg", (0.00, -0.40, 0.00)), ("LeftFoot", "LeftLeg", (0.00, -0.42, 0.04)),
        ("RightUpLeg", "Hips", (0.10, -0.20, 0.00)), ("RightLeg", "RightUpLeg", (0.00, -0.40, 0.00)), ("RightFoot", "RightLeg", (0.00, -0.42, 0.04)),
    ]
    bone_world = {}
    for name, parent, local in bone_specs:
        bone_world[name] = np.asarray(local, dtype=np.float32) + (bone_world[parent] if parent else 0)
    bone_positions = np.stack([bone_world[name] for name, _, _ in bone_specs])

    inverse_bind = np.repeat(np.eye(4, dtype=np.float32)[None, :, :], len(bone_specs), axis=0)
    for index, world in enumerate(bone_positions):
        inverse_bind[index, :3, 3] = -world
    inverse_view = writer.blob(inverse_bind.transpose(0, 2, 1).tobytes())
    inverse_accessor = writer.accessor(inverse_view, 5126, len(bone_specs), "MAT4")

    def build_primitive(mesh_data):
        positions = mesh_data["positions"]
        normals = mesh_data["normals"]
        colors = mesh_data["colors"]
        uv_values = mesh_data["uv_values"]
        indices = mesh_data["indices"]
        pview = writer.blob(positions.astype(np.float32).tobytes(), 34962)
        nview = writer.blob(normals.astype(np.float32).tobytes(), 34962)
        cview = writer.blob(colors.astype(np.float32).tobytes(), 34962)
        uvview = writer.blob(uv_values.astype(np.float32).tobytes(), 34962)
        iview = writer.blob(indices.astype(np.uint32).tobytes(), 34963)
        distances = np.linalg.norm(positions[:, None, :] - bone_positions[None, :, :], axis=2)
        nearest = np.argsort(distances, axis=1)[:, :4]
        raw_weights = 1.0 / np.maximum(distances[np.arange(len(positions))[:, None], nearest], 0.035)
        raw_weights /= raw_weights.sum(axis=1, keepdims=True)
        joints_view = writer.blob(nearest.astype(np.uint16).tobytes(), 34962)
        weights_view = writer.blob(raw_weights.astype(np.float32).tobytes(), 34962)
        accessors = {
            "POSITION": writer.accessor(pview, 5126, len(positions), "VEC3", positions.min(0).tolist(), positions.max(0).tolist()),
            "NORMAL": writer.accessor(nview, 5126, len(normals), "VEC3"),
            "COLOR_0": writer.accessor(cview, 5126, len(colors), "VEC3"),
            "TEXCOORD_0": writer.accessor(uvview, 5126, len(uv_values), "VEC2"),
            "JOINTS_0": writer.accessor(joints_view, 5123, len(positions), "VEC4"),
            "WEIGHTS_0": writer.accessor(weights_view, 5126, len(positions), "VEC4"),
            "indices": writer.accessor(iview, 5125, len(indices), "SCALAR", [int(indices.min())], [int(indices.max())]),
        }
        target_names = list(mesh_data["morphs"].keys())
        target_accessors = [
            writer.sparse_accessor(mesh_data["morphs"][name], mesh_data["original_index"])
            for name in target_names
        ]
        primitive = {
            "attributes": {
                "POSITION": accessors["POSITION"],
                "NORMAL": accessors["NORMAL"],
                "COLOR_0": accessors["COLOR_0"],
                "TEXCOORD_0": accessors["TEXCOORD_0"],
                "JOINTS_0": accessors["JOINTS_0"],
                "WEIGHTS_0": accessors["WEIGHTS_0"],
            },
            "indices": accessors["indices"],
            "material": 0,
            "targets": [{"POSITION": item} for item in target_accessors],
        }
        return primitive, target_names

    body_primitive, body_target_names = build_primitive(body)
    private_primitive, private_target_names = build_primitive(private_anatomy)
    images = []
    textures = []
    if skin_texture and skin_texture.exists():
        image_view = writer.blob(skin_texture.read_bytes())
        images.append({"bufferView": image_view, "mimeType": "image/png"})
        textures.append({"sampler": 0, "source": 0})
    normal_view = writer.blob(flat_normal_png())
    images.append({"bufferView": normal_view, "mimeType": "image/png"})
    textures.append({"sampler": 0, "source": len(images) - 1})
    material = {"name": "Skin", "pbrMetallicRoughness": {"baseColorFactor": [0.62, 0.35, 0.17, 1.0], "roughnessFactor": 0.72, "metallicFactor": 0.0}, "doubleSided": False}
    if textures:
        material["pbrMetallicRoughness"]["baseColorTexture"] = {"index": 0}
    material["normalTexture"] = {"index": 1 if skin_texture and skin_texture.exists() else 0}
    document = {
        "asset": {"version": "2.0", "generator": "GrowthTrack MakeHuman CC0 converter"},
        "scene": 0,
        "scenes": [{"nodes": [0, 1]}],
        "nodes": [
            {"name": "Body", "mesh": 0, "skin": 0},
            {"name": "PrivateAnatomy", "mesh": 1, "skin": 0, "extras": {"sensitive": True, "defaultVisible": False}},
        ],
        "meshes": [
            {"name": "GrowthTrackBody", "primitives": [body_primitive], "weights": [0.0] * len(body_target_names), "extras": {"targetNames": body_target_names}},
            {"name": "GrowthTrackPrivateAnatomy", "primitives": [private_primitive], "weights": [0.0] * len(private_target_names), "extras": {"targetNames": private_target_names, "sensitive": True}},
        ],
        "materials": [material],
        "buffers": [{"byteLength": len(writer.binary)}],
        "bufferViews": writer.buffer_views,
        "accessors": writer.accessors,
        "extras": {
            "license": "CC0 1.0",
            "source": "MakeHuman 1.1.1 bundled HM08 base mesh and targets",
            "vertexCount": len(body["positions"]),
            "privateVertexCount": len(private_anatomy["positions"]),
            "morphTargetCount": len(body_target_names),
            "privacy": "PrivateAnatomy is hidden by the application until an explicit per-session reveal.",
        },
    }
    bone_node_offset = 2
    bone_nodes = []
    for name, parent, local in bone_specs:
        node = {"name": name, "translation": [float(v) for v in local]}
        children = [i + bone_node_offset for i, (_, p, _) in enumerate(bone_specs) if p == name]
        if children:
            node["children"] = children
        bone_nodes.append(node)
    document["nodes"].extend(bone_nodes)
    document["scenes"][0]["nodes"].append(bone_node_offset)
    document["skins"] = [{
        "name": "GrowthTrackRig",
        "skeleton": bone_node_offset,
        "inverseBindMatrices": inverse_accessor,
        "joints": list(range(bone_node_offset, bone_node_offset + len(bone_specs))),
    }]
    if images:
        document["images"] = images
        document["textures"] = textures
        document["samplers"] = [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}]
    json_bytes = json.dumps(document, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4:
        json_bytes += b" "
    binary = bytes(writer.binary)
    while len(binary) % 4:
        binary += b"\0"
    total_length = 12 + 8 + len(json_bytes) + 8 + len(binary)
    result = struct.pack("<4sII", b"glTF", 2, total_length)
    result += struct.pack("<I4s", len(json_bytes), b"JSON") + json_bytes
    result += struct.pack("<I4s", len(binary), b"BIN\0") + binary
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(result)
    return document


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path(".tmp/makehuman/extracted/usr/share/makehuman/data"))
    parser.add_argument("--output", type=Path, default=Path("public/assets/models/humanoid-base.glb"))
    parser.add_argument("--skin-texture", type=Path, default=Path(".tmp/makehuman/extracted/usr/share/makehuman/data/skins/textures/young_lightskinned_male_diffuse.png"))
    args = parser.parse_args()
    base_path = args.data / "3dobjs" / "base.npz"
    target_path = args.data / "targets.npz"
    base = np.load(base_path)
    targets = np.load(target_path, allow_pickle=True)
    body = make_mesh(base, targets, group_index=0, add_anatomy_detail=True)
    private_anatomy = make_private_anatomy_mesh()
    build_glb(body, private_anatomy, args.output, args.skin_texture)
    print(json.dumps({
        "output": str(args.output),
        "vertices": len(body["positions"]),
        "triangles": len(body["indices"]) // 3,
        "morphs": len(body["morphs"]),
        "privateVertices": len(private_anatomy["positions"]),
        "privateTriangles": len(private_anatomy["indices"]) // 3,
        "privateMorphs": len(private_anatomy["morphs"]),
        "missingSources": body["missing"],
    }, indent=2))


if __name__ == "__main__":
    main()

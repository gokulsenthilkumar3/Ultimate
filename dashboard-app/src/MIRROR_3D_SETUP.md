# Mirror-Realistic 3D Engine — Setup Guide

This file explains what GLB assets you need to add and where to get them for free.

## Required Files in `dashboard-app/public/models/`

| File | Purpose | Free Source |
|------|---------|-------------|
| `human_current.glb` | Current body (182cm, 63kg lean) | MakeHuman (free) — export T-pose, FBX → GLB via Blender |
| `human_goal.glb` | Goal body (182cm, 82kg athletic) | Same as above, use larger body preset |
| `hair_short.glb` | Short hair mesh | Sketchfab search: "hair short glb free" |
| `hair_medium.glb` | Medium hair mesh | Same |

## Quickest Path (No Blender needed)

1. Go to https://readyplayer.me/
2. Create two avatars (current build + goal build)
3. Export each as `.glb` (free tier supports this)
4. Rename → `human_current.glb` and `human_goal.glb`
5. Drop into `dashboard-app/public/models/`

## Morph Targets

For the slider morphs (chest_wide, shoulders_wide, waist_wide, arms_thick)
to work with the GLB, the mesh must have blend shapes exported.

- **MakeHuman + Blender**: Add shape keys in Blender, export with morphs enabled
- **ReadyPlayerMe**: Does not export morph targets — sliders will scale the whole mesh instead
- **CC4 (Character Creator 4)**: Best morph target support — free trial exports GLB with blend shapes

## Fallback Behaviour

Until you add the GLB files, the component automatically falls back to:
https://threejs.org/examples/models/gltf/Soldier.glb

This keeps the lighting rig, reflective floor, PBR skin shader, and editor
panel all visible and functional while you source the real assets.

## New Features in This Branch

- **PBR Skin Material**: `MeshPhysicalMaterial` with subsurface scattering, clearcoat, sheen
- **Studio Lighting Rig**: 4-point key/fill/rim/bounce setup + Environment HDRI
- **Reflective Floor**: `MeshReflectorMaterial` from @react-three/drei
- **Body Metrics Panel**: Height/Weight/BF% auto-syncs morph slider values
- **Skin Tone Picker**: 5 presets (light → deep dark)
- **Hair Toggle**: Short / Medium / Bald
- **ACESFilmic Tone Mapping**: Cinematic colour grading on the Canvas
- **Suspense Loading Screen**: Progress % shown while GLB loads

## Install Command

```bash
cd dashboard-app
npm install @react-three/drei@latest
```

# Humanoid GLB Studio Checklist

This is the shortest path to a human-grade `humanoid-base.glb`. Complete these steps in order.

- [ ] **1. Human Topology**: Replace the placeholder with a real humanoid base (12k-18k vertices). Ensure clean quad flow and real support loops at deformation zones (chest, waist, hips, elbows, knees, wrists, ankles, neck, face).
- [ ] **2. Rig**: Add a full, symmetric humanoid skeleton. Limit vertices to 4 bone influences. Test extreme bends (elbow, knee, arm raise, spine twist) before export.
- [ ] **3. Shape Keys**: Author shape keys in the EXACT canonical order from `MORPH_TARGET_TABLE.md`. Include body and facial keys. Do NOT include shader-only targets (`vascularity_intensity`, `fitzpatrick_index`).
- [ ] **4. Export**: Export as `.glb` with `+Y Up`, apply modifiers, enable shape keys, embed textures/materials, and use Draco compression.
- [ ] **5. Materials**: Add skin base color, normal, roughness, and AO maps with believable subsurface behavior. Separate eyes, teeth, nails, and mouth interior.
- [ ] **6. Validation**: Run `npm run validate:glb`. Fix every failing line until the app's GLB badge shows healthy.

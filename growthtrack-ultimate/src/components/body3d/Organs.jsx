import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BODY_PARTS } from "../../data/userData";
import { createPeelMaterial } from "./materials";

// ── ORGANS DEFINITION ──
const ORGANS_LIST = [
  { color: 0xdd2233, pos: [-0.06, 1.27,  0.07], r: 0.052, key: "heart"   },
  { color: 0xcc7755, pos: [-0.11, 1.21,  0.05], r: 0.072, key: "lungs"   },
  { color: 0xcc7755, pos: [ 0.11, 1.21,  0.05], r: 0.072, key: "lungs"   },
  { color: 0xc85020, pos: [ 0.08, 1.10,  0.05], r: 0.060, key: "liver"   },
  { color: 0xb07070, pos: [ 0.00, 1.00,  0.05], r: 0.075, key: "gut"     },
  { color: 0xaa2222, pos: [-0.09, 0.96, -0.08], r: 0.038, key: "kidneys" },
  { color: 0xaa2222, pos: [ 0.09, 0.96, -0.08], r: 0.038, key: "kidneys" },
  { color: 0x9966ee, pos: [ 0.00, 1.15,  0.04], r: 0.028, key: "hormones"},
  { color: 0x4488ff, pos: [ 0.00, 1.30,  0.04], r: 0.042, key: "immune"  },
];

function Organs({ depth }) {
  const group = useRef();

  const organMeshes = useMemo(() => {
    return ORGANS_LIST.map((o, i) => ({
      ...o,
      mat: createPeelMaterial(o.color, o.color, 0.7, true),
      id: i
    }));
  }, []);

  useFrame(() => {
    if (!group.current) return;
    group.current.traverse(m => {
      if (m.isMesh && m.material?.uniforms?.uDepth) {
        m.material.uniforms.uDepth.value = depth / 100;
      }
    });
  });

  return (
    <group ref={group}>
      {organMeshes.map(o => (
        <mesh key={o.id} position={o.pos} material={o.mat} userData={{ ...BODY_PARTS[o.key], key: o.key }}>
          <sphereGeometry args={[o.r, 16, 16]} />
        </mesh>
      ))}
    </group>
  );
}

export default Organs;

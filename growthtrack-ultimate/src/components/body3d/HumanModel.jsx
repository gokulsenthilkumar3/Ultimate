import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import useStore from "../../store/useStore";
import { BODY_PARTS } from "../../data/userData";
import { createSkinMaterial, createPeelMaterial, injectVascularity } from "./materials";

const BASE = import.meta.env.BASE_URL;
const GLB_CURRENT = `${BASE}assets/models/humanoid-base.glb`;
const GLB_GOAL    = `${BASE}assets/models/humanoid-base.glb`;

// ── HUMAN MODEL COMPONENT (GLB) ──
function HumanModel({ type, morphs, depth, onSelectPart, hairPreset, wardrobe, stressLevel }) {
  // FIX 2: Use corrected GLB_CURRENT/GLB_GOAL with BASE_URL
  const url = type === 'current' ? GLB_CURRENT : GLB_GOAL;
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  const user      = useStore(state => state.user);
  const skinMat   = useMemo(() => createSkinMaterial(user?.skinTones?.Face || '#C68642'), [user]);
  const muscleMat = useMemo(() => createPeelMaterial(0xf43f5e, 0x440000, 0.4, false), []);

  useEffect(() => {
    clonedScene.traverse((node) => {
      if (!node.isMesh) return;

      node.castShadow    = true;
      node.receiveShadow = true;

      // Bio-Feedback: Face flushing from stress
      if (
        node.name.toLowerCase().includes('head') ||
        node.name.toLowerCase().includes('face') ||
        node.name.toLowerCase().includes('neck')
      ) {
        if (node.material?.emissive) {
          node.material.emissive          = new THREE.Color('#ff0000');
          node.material.emissiveIntensity = (stressLevel / 100) * 0.4;
        }
      }

      // FIX 3: Guard morphTargetInfluences before access
      if (node.morphTargetDictionary && node.morphTargetInfluences) {
        const dict = node.morphTargetDictionary;
        const inf  = node.morphTargetInfluences;
        if (dict['chest_wide']     !== undefined) inf[dict['chest_wide']]     = Math.max(0, morphs.chest - 1);
        if (dict['shoulders_wide'] !== undefined) inf[dict['shoulders_wide']] = Math.max(0, morphs.shoulders - 1);
        if (dict['waist_wide']     !== undefined) inf[dict['waist_wide']]     = Math.max(0, morphs.waist - 1);
        if (dict['arms_thick']     !== undefined) inf[dict['arms_thick']]     = Math.max(0, morphs.arms - 1);
      }

      // Vascularity injection
      const vascularity = Math.max(0, (20 - (user?.bodyFat || 18)) / 15);
      if (node.material) injectVascularity(node.material, vascularity);

      // Wardrobe
      if (
        node.userData.isApparel ||
        node.name.toLowerCase().includes('clothes') ||
        node.name.toLowerCase().includes('shirt')   ||
        node.name.toLowerCase().includes('pants')
      ) {
        node.visible = morphs.apparel && node.name.toLowerCase().includes(wardrobe);
      }

      // Hair
      if (node.name.toLowerCase().includes('hair')) {
        node.visible = hairPreset !== 'bald' && node.name.toLowerCase().includes(hairPreset);
      }
    });
  }, [clonedScene, morphs, hairPreset, wardrobe, stressLevel, user, skinMat]);

  useFrame(() => {
    const d = depth / 100;
    clonedScene.traverse((node) => {
      if (!node.isMesh) return;

      // FIX 3: Guard before any material mutation
      if (!node.material) return;

      const skinOpacity   = THREE.MathUtils.smoothstep(d, 0.3, 0.7);
      const muscleOpacity = (1 - skinOpacity) * THREE.MathUtils.smoothstep(d, 0.1, 0.4);

      if (d > 0.4) {
        node.material         = skinMat;
        node.material.opacity = skinOpacity;
      } else if (d > 0.1) {
        node.material         = muscleMat;
        node.material.opacity = muscleOpacity;
      } else {
        node.visible = false;
      }

      if (d > 0.1) node.visible = true;
    });
  });

  return (
    <primitive
      object={clonedScene}
      onClick={(e) => {
        e.stopPropagation();
        const partKey    = e.object.name.toLowerCase() || e.object.userData?.key;
        const keyMap     = { head: 'head', neck: 'neck', chest: 'chest', spine: 'spine', arm: 'arms', leg: 'legs', core: 'core', waist: 'core' };
        const matchedKey = Object.keys(keyMap).find(k => partKey.includes(k));
        if (matchedKey)               onSelectPart(BODY_PARTS[keyMap[matchedKey]]);
        else if (e.object.userData?.key) onSelectPart(e.object.userData);
      }}
    />
  );
}

export default HumanModel;

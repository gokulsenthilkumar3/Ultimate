import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import use3DStore from '../../store/use3DStore';
import { getCinematicSceneProfile } from './cinematicProfiles';

function seededNoise(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/**
 * ChamberVFX — restrained studio atmosphere for the Digital Twin chamber.
 * The field is deliberately sparse: motion gives the scene depth without
 * turning the body viewer into a neon dashboard.
 */
export default function ChamberVFX({ count = 800, motionEnabled = true }) {
  const sceneRef = useRef();
  const pointsRef = useRef();
  const ringsRef = useRef();
  const orbitRef = useRef();
  const pointer = useThree((state) => state.pointer);
  const environment = use3DStore((state) => state.cinematicState.sceneEnvironment);
  const profile = getCinematicSceneProfile(environment);

  // Generate random particle positions within a cylinder/sphere around the model
  const particles = useMemo(() => {
    const noise = seededNoise(0x4754524b + count);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const colorCyan = new THREE.Color(profile.accent);
    const colorViolet = new THREE.Color(profile.secondary);
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Keep the atmosphere close to the subject so it reads as depth, not a
      // star field. The wider outer radius is still useful on large screens.
      const r = 1.7 + noise() * 2.1;
      const theta = noise() * Math.PI * 2;
      const y = noise() * 3.5 - 0.25;

      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = r * Math.sin(theta);

      // Keep the secondary tint quiet; it should appear only as a passing
      // highlight in motion.
      const mixRatio = noise() * 0.22;
      tempColor.lerpColors(colorCyan, colorViolet, mixRatio);
      
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;

      sizes[i] = noise() * 0.16 + 0.04;
    }

    return { positions, colors, sizes };
  }, [count, profile.accent, profile.secondary]);

  // Shader material for glowing points with custom sizes
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSizeBase: { value: 2.8 * (window.devicePixelRatio || 1) },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uSizeBase;
        
        void main() {
          vColor = aColor;
          
          // Slow drift upwards + restrained parallax.
          vec3 pos = position;
          pos.y = mod(pos.y + uTime * 0.018 + aSize, 3.5) - 0.25;
          pos.x += sin(uTime * 0.08 + pos.y * 1.7) * 0.035;
          pos.z += cos(uTime * 0.06 + pos.y * 1.4) * 0.035;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size attenuation based on depth
          gl_PointSize = (uSizeBase * aSize) / -mvPosition.z;
          
          // Fade edges (top and bottom of cylinder)
          float fadeBottom = smoothstep(-0.5, 0.5, pos.y);
          float fadeTop = 1.0 - smoothstep(2.5, 3.5, pos.y);
          vAlpha = fadeBottom * fadeTop * 0.32;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          // Soft circular particle
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          
          // Glow falloff
          float glow = max(0.0, 1.0 - (dist * 2.0));
          glow = pow(glow, 1.5);
          
          gl_FragColor = vec4(vColor, glow * vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }) => {
    const time = motionEnabled ? clock.elapsedTime : 0;
    if (pointsRef.current) {
      pointsRef.current.material.uniforms.uTime.value = time;
      pointsRef.current.rotation.y = time * 0.012;
    }
    if (ringsRef.current) {
      ringsRef.current.rotation.z = Math.sin(time * 0.16) * 0.018;
      ringsRef.current.children.forEach((ring, index) => {
        const pulse = 1 + Math.sin(time * 0.45 + index * 1.8) * 0.018;
        ring.scale.setScalar(pulse);
        ring.material.opacity = 0.045 + Math.sin(time * 0.45 + index) * 0.012;
      });
    }
    if (orbitRef.current) {
      orbitRef.current.rotation.y = time * 0.08;
      orbitRef.current.rotation.z = Math.sin(time * 0.2) * 0.06;
    }
    if (sceneRef.current && motionEnabled) {
      sceneRef.current.rotation.x = THREE.MathUtils.lerp(sceneRef.current.rotation.x, pointer.y * 0.018, 0.025);
      sceneRef.current.rotation.z = THREE.MathUtils.lerp(sceneRef.current.rotation.z, -pointer.x * 0.018, 0.025);
    }
  });

  return (
    <group ref={sceneRef}>
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={count}
          array={particles.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={count}
          array={particles.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
    <group ref={ringsRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
      {[1.27, 1.51].map((radius, index) => (
        <mesh key={radius}>
          <ringGeometry args={[radius, radius + 0.004, 128]} />
          <meshBasicMaterial color={index === 1 ? profile.secondary : profile.accent} transparent opacity={0.05} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
    <mesh ref={orbitRef} position={[0, 1.55, 0]} rotation={[0.12, 0, 0]}>
      <torusGeometry args={[1.28, 0.0025, 4, 128]} />
      <meshBasicMaterial color={profile.secondary} transparent opacity={0.045} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
    </group>
  );
}

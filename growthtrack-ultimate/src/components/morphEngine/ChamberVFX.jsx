import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function seededNoise(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/**
 * ChamberVFX — Ambient cosmic particle field for the Digital Twin chamber.
 * Renders a slow-drifting field of cyan/violet holographic dust.
 */
export default function ChamberVFX({ count = 800 }) {
  const pointsRef = useRef();
  const ringsRef = useRef();

  // Generate random particle positions within a cylinder/sphere around the model
  const particles = useMemo(() => {
    const noise = seededNoise(0x4754524b + count);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const colorCyan = new THREE.Color(0x06b6d4);
    const colorViolet = new THREE.Color(0x7c3aed);
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Cylinder distribution: radius 1.5 to 4, height 0 to 3
      const r = 1.5 + noise() * 2.5;
      const theta = noise() * Math.PI * 2;
      const y = noise() * 4.0 - 0.5; // From slightly below floor up to 3.5m

      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = r * Math.sin(theta);

      // Mix between cyan and violet based on height + noise
      const mixRatio = noise();
      tempColor.lerpColors(colorCyan, colorViolet, mixRatio);
      
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;

      // Random sizes
      sizes[i] = noise() * 0.5 + 0.1;
    }

    return { positions, colors, sizes };
  }, [count]);

  // Shader material for glowing points with custom sizes
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSizeBase: { value: 6.0 * (window.devicePixelRatio || 1) },
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
          
          // Slow drift upwards + slight wobble
          vec3 pos = position;
          pos.y += mod(uTime * 0.05 + aSize, 4.0); // Wrap around height 4
          pos.x += sin(uTime * 0.2 + pos.y) * 0.1;
          pos.z += cos(uTime * 0.15 + pos.y) * 0.1;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size attenuation based on depth
          gl_PointSize = (uSizeBase * aSize) / -mvPosition.z;
          
          // Fade edges (top and bottom of cylinder)
          float fadeBottom = smoothstep(-0.5, 0.5, pos.y);
          float fadeTop = 1.0 - smoothstep(2.5, 3.5, pos.y);
          vAlpha = fadeBottom * fadeTop * 0.6; // max opacity 0.6
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

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.material.uniforms.uTime.value = clock.elapsedTime;
      // Slow overall rotation
      pointsRef.current.rotation.y = clock.elapsedTime * 0.02;
    }
    if (ringsRef.current) {
      ringsRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.16) * 0.025;
      ringsRef.current.children.forEach((ring, index) => {
        const pulse = 1 + Math.sin(clock.elapsedTime * 0.7 + index * 1.8) * 0.035;
        ring.scale.setScalar(pulse);
        ring.material.opacity = 0.12 + Math.sin(clock.elapsedTime * 0.55 + index) * 0.035;
      });
    }
  });

  return (
    <group>
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
      {[0.58, 0.82, 1.08].map((radius, index) => (
        <mesh key={radius}>
          <ringGeometry args={[radius, radius + 0.006 + index * 0.002, 96]} />
          <meshBasicMaterial color={index === 1 ? '#8b5cf6' : '#22d3ee'} transparent opacity={0.13} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
    </group>
  );
}

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import HumanoidClone from './HumanoidClone';
import { applyStencilRead } from './splitStencilUtils';

function ScreenMask({ left, dividerX }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: 'void main() { gl_Position = vec4(position, 1.0); }',
    fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }',
    colorWrite: false, depthWrite: false, depthTest: false,
    stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc,
    stencilRef: left ? 1 : 2, stencilZPass: THREE.ReplaceStencilOp,
  }), [left]);
  // Coordinates are already in clip space; camera orbit cannot move this mask.
  const geometry = useMemo(() => {
    const split = THREE.MathUtils.clamp(dividerX, 0, 1) * 2 - 1;
    const a = left ? -1 : split, b = left ? split : 1;
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute([a,-1,0, b,-1,0, b,1,0, a,-1,0, b,1,0, a,1,0], 3));
    return result;
  }, [dividerX, left]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} renderOrder={-1000} frustumCulled={false} />;
}

function StencilClone({ cloneKey, reference }) {
  const group = useRef();
  // Material edits and lazy GLB loads can happen after mount; apply before draw.
  useFrame(() => group.current?.traverse(node => {
    if (node.isMesh) (Array.isArray(node.material) ? node.material : [node.material]).filter(Boolean).forEach(material => applyStencilRead(material, reference));
  }));
  return <group ref={group}><HumanoidClone cloneKey={cloneKey} snapWeights={cloneKey === 'B'} showAura={false} /></group>;
}

function Divider({ dividerX }) {
  const { size } = useThree();
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { split: { value: dividerX }, width: { value: size.width } },
    vertexShader: 'uniform float split; uniform float width; void main() { gl_Position = vec4(split * 2.0 - 1.0 + position.x * 2.0 / width, position.y * 2.0, 0.0, 1.0); }',
    fragmentShader: 'void main() { gl_FragColor = vec4(0.4, 0.85, 0.95, 0.85); }',
    transparent: true, depthTest: false, depthWrite: false,
  }), [dividerX, size.width]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh material={material} renderOrder={1000} frustumCulled={false}><planeGeometry args={[1, 1]} /></mesh>;
}

export default function SplitStencilScene({ dividerX = .5 }) {
  return <>
    <ScreenMask left dividerX={dividerX} /><ScreenMask left={false} dividerX={dividerX} />
    <StencilClone cloneKey="A" reference={1} /><StencilClone cloneKey="B" reference={2} />
    <Divider dividerX={dividerX} />
  </>;
}

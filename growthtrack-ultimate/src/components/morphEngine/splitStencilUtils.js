import * as THREE from 'three';

/** Apply a read-only stencil test to a rendered material. */
export function applyStencilRead(material, reference) {
  if (!material) return material;
  material.stencilWrite = true;
  material.stencilWriteMask = 0;
  material.stencilFunc = THREE.EqualStencilFunc;
  material.stencilRef = reference;
  material.stencilFail = THREE.KeepStencilOp;
  material.stencilZFail = THREE.KeepStencilOp;
  material.stencilZPass = THREE.KeepStencilOp;
  return material;
}

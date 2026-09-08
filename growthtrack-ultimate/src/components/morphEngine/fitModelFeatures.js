import * as THREE from 'three';

// The bundled accessories were exported for a taller head than the body.
// Fit their rest-pose bounds once, before scene normalization. Custom assets
// retain their authored placements unless they carry this export's metadata.
export function fitModelFeatures(body, features) {
  if (!body || !features?.length) return;
  body.updateWorldMatrix(true, false);
  const bodyBox = new THREE.Box3().setFromObject(body);
  const height = bodyBox.max.y - bodyBox.min.y;
  if (!Number.isFinite(height) || height <= 0) return;
  for (const { mesh, feature } of features) {
    if (mesh.userData?.alignment !== 'body-surface-calibrated' || mesh.userData?.fittedToBody) continue;
    const before = new THREE.Box3().setFromObject(mesh);
    const size = before.getSize(new THREE.Vector3());
    const center = before.getCenter(new THREE.Vector3());
    const target = center.clone();
    if (feature === 'eyes') {
      // The bundled eye pair was authored too large and was previously moved
      // to 92.5% of body height, which puts it around the mouth on this rig.
      // A human eye line sits closer to 95% of the rest-pose body bounds.
      const scale = THREE.MathUtils.clamp(height * .048 / Math.max(size.x, .001), .42, 1.0);
      mesh.scale.multiplyScalar(scale);
      target.x = (bodyBox.min.x + bodyBox.max.x) / 2;
      target.y = bodyBox.min.y + height * .947;
    } else if (feature === 'hair') {
      mesh.scale.x *= THREE.MathUtils.clamp(height * .115 / Math.max(size.x, .001), .5, 1.2);
      mesh.scale.y *= .86;
      mesh.scale.z *= .86;
      target.y = bodyBox.max.y + height * .005 - size.y * .86 / 2;
    } else continue;
    mesh.updateWorldMatrix(true, false);
    const afterCenter = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
    const localTarget = mesh.parent.worldToLocal(target);
    const localCurrent = mesh.parent.worldToLocal(afterCenter);
    mesh.position.add(localTarget.sub(localCurrent));
    mesh.updateWorldMatrix(true, false);
    mesh.userData.fittedToBody = true;
  }
}

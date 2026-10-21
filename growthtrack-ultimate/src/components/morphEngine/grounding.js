import { Matrix4, Vector3 } from 'three';

/** Follow the deformed soles so length morphs cannot bury feet in the stage. */
export function createSoleGrounder(body, scene) {
  const positions = body.geometry.attributes.position;
  let restMin = Infinity;
  let restMax = -Infinity;
  for (let i = 0; i < positions.count; i += 1) {
    restMin = Math.min(restMin, positions.getY(i));
    restMax = Math.max(restMax, positions.getY(i));
  }
  const indices = [];
  for (let i = 0; i < positions.count; i += 1) {
    if (positions.getY(i) < restMin + (restMax - restMin) * 0.12) indices.push(i);
  }
  const point = new Vector3();
  const relative = new Matrix4();
  return (clearance = 0.04) => {
    scene.updateWorldMatrix(true, true);
    body.skeleton?.update();
    relative.copy(scene.matrixWorld).invert().multiply(body.matrixWorld);
    let minimum = Infinity;
    for (const index of indices) {
      body.getVertexPosition(index, point);
      point.applyMatrix4(relative);
      minimum = Math.min(minimum, point.y);
    }
    if (Number.isFinite(minimum)) scene.position.y = clearance - minimum * scene.scale.y;
  };
}

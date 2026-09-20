import { Group, Mesh, BufferAttribute, Vector3, Box3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const sources = new Map();
export function registerAvatarSource(key, source) {
  sources.set(key, source);
  return () => { if (sources.get(key) === source) sources.delete(key); };
}

/** Freeze the evaluated pose and morphs, not the untouched source geometry. */
export function bakeAvatarSurface(source) {
  const result = new Group();
  result.name = 'PersonalAvatar';
  source.updateWorldMatrix(true, true);
  const origin = source.getWorldPosition(new Vector3());
  source.traverseVisible((node) => {
    if (!node.isMesh || !node.geometry?.attributes.position) return;
    if (/Aura|Cloth|ScalpCap/i.test(node.name)) return;
    node.skeleton?.update();
    const geometry = node.geometry.clone();
    const points = new Float32Array(geometry.attributes.position.count * 3);
    const point = new Vector3();
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      node.getVertexPosition(i, point).applyMatrix4(node.matrixWorld).sub(origin);
      point.toArray(points, i * 3);
    }
    geometry.setAttribute('position', new BufferAttribute(points, 3));
    geometry.morphAttributes = {};
    geometry.deleteAttribute('skinIndex');
    geometry.deleteAttribute('skinWeight');
    geometry.computeVertexNormals();
    const materials = (Array.isArray(node.material) ? node.material : [node.material]).map((m) => m.clone());
    const mesh = new Mesh(geometry, Array.isArray(node.material) ? materials : materials[0]);
    mesh.name = node.name;
    result.add(mesh);
  });
  return result;
}

export async function exportPersonalAvatar(key = 'A') {
  const source = sources.get(key);
  if (!source) throw new Error('Load the authored 3D model before exporting.');
  const metadata = source.metadata();
  const height = Number(metadata.metrics?.height);
  if (!(height > 0)) throw new Error('Enter your height before exporting a model in physical units.');
  const baked = bakeAvatarSurface(source.group);
  const body = baked.children.find((mesh) => /body/i.test(mesh.name)) || baked;
  const bounds = new Box3().setFromObject(body);
  const scale = height / 100 / (bounds.max.y - bounds.min.y);
  baked.children.forEach((mesh) => { mesh.geometry.translate(0, -bounds.min.y, 0); mesh.geometry.scale(scale, scale, scale); });
  baked.userData = { avatar: metadata, geometry: 'evaluated-surface', unit: 'm', shaderEffects: 'not-exported' };
  try {
    return await new GLTFExporter().parseAsync(baked, { binary: true, onlyVisible: true });
  } finally {
    baked.traverse((node) => {
      node.geometry?.dispose();
      (Array.isArray(node.material) ? node.material : [node.material]).forEach((m) => m?.dispose());
    });
  }
}

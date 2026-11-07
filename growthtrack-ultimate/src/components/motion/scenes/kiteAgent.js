import { BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry } from 'three';
import { createSceneRuntime } from './sceneRuntime';

/** Original folded-wing agent. No welcome-world meshes or portrait assets. */
export function createScene(host, options) {
  return createSceneRuntime(host, { ...options, span: 4.3, cameraPosition: [0, 1.3, 10], build(root) {
    const shell = new MeshStandardMaterial({ color: '#f4f0dc', roughness: .36, metalness: .15 });
    const fold = new MeshStandardMaterial({ color: '#83cdbb', roughness: .5, metalness: .12 });
    const ink = new MeshStandardMaterial({ color: '#183f44', roughness: .25, metalness: .3 });
    const light = new MeshStandardMaterial({ color: '#ffc95e', emissive: '#d99b2b', emissiveIntensity: .35, roughness: .4 });
    const add = (geometry, material, pos, parent = root) => { const object = new Mesh(geometry, material); object.position.set(...pos); parent.add(object); return object; };
    function wing(side) {
      const geometry = new BufferGeometry();
      const points = [[0, .1, .14], [side * 1.5, .15, -.2], [side * .78, -.62, .02], [side * .64, .02, .42]];
      const vertices = [];
      for (const [a, b, c] of [[0, 1, 3], [1, 2, 3], [2, 0, 3], [0, 2, 1]]) for (const index of side > 0 ? [a, b, c] : [c, b, a]) vertices.push(...points[index]);
      geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
      const hinge = new Group(); hinge.position.x = side * .23; root.add(hinge);
      add(geometry, side > 0 ? shell : fold, [0, 0, 0], hinge); return hinge;
    }
    const left = wing(-1), right = wing(1);
    const body = add(new SphereGeometry(.5, 24, 16), shell, [0, -.04, .06]); body.scale.set(.74, 1.12, .67);
    const visor = add(new SphereGeometry(.36, 24, 16), ink, [0, .12, .29]); visor.scale.set(1.12, .55, .65);
    const eyes = [-1, 1].map(side => { const eye = add(new SphereGeometry(.058, 12, 8), light, [side * .14, .14, .52]); eye.scale.set(.65, 1.2, .4); return eye; });
    const fin = add(new CylinderGeometry(.025, .035, .42, 8), ink, [0, .63, .02]); fin.rotation.z = -.35;
    const antenna = add(new SphereGeometry(.08, 12, 8), light, [.07, .85, .02]);
    const core = add(new BoxGeometry(.16, .16, .16), light, [0, -.25, .4]); core.rotation.z = Math.PI / 4;
    const tail = add(new TorusGeometry(.31, .025, 6, 40, Math.PI * 1.5), fold, [0, -.78, -.1]); tail.rotation.z = -.8;
    root.rotation.set(-.06, -.42, .03);
    return { update(time, _dt, state, pointer) {
      const focus = state === 'listen', cheer = state === 'celebrate', greet = state === 'greet';
      root.position.y = Math.sin(time * (cheer ? 3 : 1.5)) * (cheer ? .18 : .06);
      root.rotation.y = -.42 + pointer.x * .38 + Math.sin(time * .5) * .055;
      root.rotation.z = (focus ? -.08 : .03) + Math.sin(time * (greet ? 3 : 1)) * (greet ? .1 : .025);
      left.rotation.z = (focus ? -.42 : -.12) + Math.sin(time * (cheer ? 7 : 2)) * (focus ? .035 : .14);
      right.rotation.z = (focus ? .42 : .12) - Math.sin(time * (greet ? 6 : cheer ? 7 : 2)) * (greet ? .36 : focus ? .035 : .14);
      tail.rotation.y = time * (cheer ? 1.8 : .4);
      core.rotation.z = Math.PI / 4 + (focus ? 0 : Math.sin(time * 1.5) * .2);
      const blink = time % 7.4 > 7.25 ? .12 : focus ? .65 : 1.2;
      eyes.forEach(eye => { eye.scale.y = blink; });
      antenna.scale.setScalar(1 + Math.sin(time * (focus ? 2.2 : 1.1)) * .12);
      light.emissiveIntensity = focus ? .65 : .35;
    } };
  } });
}

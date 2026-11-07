import { BoxGeometry, CircleGeometry, CylinderGeometry, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, Plane, Raycaster, RingGeometry, SphereGeometry, TorusGeometry, Vector2, Vector3 } from 'three';
import { createSceneRuntime } from './sceneRuntime';
import { createRover, createWorldController, stepRover, WORLD_STOPS } from '../../../pages/welcomeWorldModel';

export function createScene(host, options) {
  const controls = options.controller?.current || createWorldController();
  return createSceneRuntime(host, { ...options, span: 12.6, fitWidth: true, cameraPosition: [8, 12, 18], build(root, { camera, light, isActive }) {
    const mat = (color, extra = {}) => new MeshStandardMaterial({ color, roughness: .75, metalness: .05, ...extra });
    const cream = mat('#eee3c6'), sand = mat('#c8ba94'), grass = mat('#91b6a1'), water = mat('#5c9c98'), ink = mat('#234e4a'), jade = mat('#427e65'), gold = mat('#e5b655'), coral = mat('#d28f74');
    const geometry = { block: new BoxGeometry(1, 1, 1), leaf: new SphereGeometry(.45, 10, 7), cylinder: new CylinderGeometry(1, 1, 1, 16), shadow: new CircleGeometry(1, 24) };
    const add = (shape, material, pos, scale = [1, 1, 1], parent = root) => { const mesh = new Mesh(shape, material); mesh.position.set(...pos); mesh.scale.set(...scale); parent.add(mesh); return mesh; };
    const box = (material, pos, scale, parent) => add(geometry.block, material, pos, scale, parent);
    const cylinder = (material, pos, scale, parent) => add(geometry.cylinder, material, pos, scale, parent);
    const shadowMaterial = mat('#163e3a', { transparent: true, opacity: .12, depthWrite: false });
    const shadow = (pos, scale, parent) => { const mesh = add(geometry.shadow, shadowMaterial, pos, scale, parent); mesh.rotation.x = -Math.PI / 2; return mesh; };
    const instances = (shape, material, placements) => {
      const mesh = new InstancedMesh(shape, material, placements.length), dummy = new Object3D();
      placements.forEach((p, index) => { dummy.position.set(p.x, p.y, p.z); dummy.scale.set(p.sx || 1, p.sy || 1, p.sz || 1); dummy.rotation.y = p.turn || 0; dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix); });
      mesh.instanceMatrix.needsUpdate = true; root.add(mesh); return mesh;
    };
    // A floating garden with visible strata and stepping-stone routes.
    cylinder(water, [0, -1.65, 0], [6.35, .12, 6.35]);
    add(new CylinderGeometry(5.2, 3.8, .7, 12), mat('#66877c'), [0, -.85, 0]);
    cylinder(sand, [0, -.22, 0], [5.55, .4, 5.55]);
    cylinder(grass, [0, -.005, 0], [5.32, .045, 5.32]);
    instances(geometry.block, cream, WORLD_STOPS.flatMap(stop => Array.from({ length: 7 }, (_, index) => ({ x: stop.x * (index + 1) * .1, y: .035, z: stop.z * (index + 1) * .1, sx: .43, sy: .045, sz: .27, turn: Math.atan2(stop.x, stop.z) }))));
    instances(geometry.leaf, sand, Array.from({ length: 7 }, (_, index) => ({ x: Math.sin(index * 2.399) * 5.85, y: -.7 + index % 2 * .2, z: Math.cos(index * 2.399) * 5.85, sx: .45, sy: .3, sz: .35 })));
    const home = add(new RingGeometry(.51, .57, 48), gold, [0, .055, .3]); home.rotation.x = -Math.PI / 2;
    const ripples = [5.75, 6.02, 6.24].map(radius => { const ring = add(new TorusGeometry(radius, .018, 4, 80), mat('#b4d3be'), [0, -1.565, 0]); ring.rotation.x = Math.PI / 2; return ring; });
    const trees = Array.from({ length: 12 }, (_, i) => { const angle = i * Math.PI / 6 + .2; return { x: Math.sin(angle) * 4.9, z: Math.cos(angle) * 4.9, y: .48, sx: .075, sy: .85, sz: .075 }; }).filter(p => WORLD_STOPS.every(stop => Math.hypot(p.x - stop.x, p.z - stop.z) > 1.25));
    instances(geometry.cylinder, ink, trees);
    instances(geometry.leaf, jade, trees.map((p, i) => ({ x: p.x, y: 1.03, z: p.z, sx: .8 + i % 2 * .2, sy: 1.5, sz: .85, turn: i * .7 })));
    instances(geometry.leaf, grass, trees.map(p => ({ x: p.x + .14, y: 1.35, z: p.z, sx: .7, sy: .8, sz: .7 })));
    const flowers = Array.from({ length: 20 }, (_, i) => { const angle = i * 2.399; return { x: Math.cos(angle) * (4.35 + i % 3 * .13), y: .13, z: Math.sin(angle) * (4.35 + i % 3 * .13), sx: .1, sy: .08, sz: .1 }; });
    instances(geometry.leaf, gold, flowers);
    const beacons = [];
    for (const stop of WORLD_STOPS) {
      const station = new Group(); station.position.set(stop.x, 0, stop.z); station.rotation.y = Math.atan2(stop.x, stop.z) + Math.PI; root.add(station);
      shadow([0, .048, 0], [1.1, .68, 1], station);
      cylinder(cream, [0, .12, 0], [1.03, .14, 1.03], station);
      if (stop.id === 'work') {
        box(gold, [0, .6, 0], [1.2, .8, .85], station);
        box(cream, [0, 1.06, 0], [1.5, .14, 1.1], station);
        box(ink, [0, .54, .44], [.33, .6, .04], station);
        box(jade, [-.4, .68, .45], [.25, .28, .04], station);
        box(jade, [.4, .68, .45], [.25, .28, .04], station);
        cylinder(ink, [.48, 1.39, -.15], [.018, .6, .018], station);
        box(coral, [.66, 1.61, -.15], [.36, .2, .035], station);
        for (let i = 0; i < 3; i++) box([coral, jade, cream][i], [-.9, .28 + i * .09, .35], [.35, .07, .52], station);
      } else if (stop.id === 'wellbeing') {
        cylinder(jade, [0, .34, 0], [.5, .2, .5], station);
        cylinder(water, [0, .45, 0], [.43, .025, .43], station);
        const arch = add(new TorusGeometry(.47, .04, 6, 32, Math.PI), jade, [0, 1.1, -.32], [1, 1, 1], station);
        for (const side of [-1, 1]) cylinder(jade, [side * .47, .7, -.32], [.04, .8, .04], station);
        arch.rotation.y = .12;
        box(sand, [-.62, .4, .48], [.56, .09, .26], station);
        for (const side of [-1, 1]) box(ink, [-.62 + side * .2, .28, .48], [.045, .22, .19], station);
        add(geometry.leaf, gold, [0, .78, 0], [.3, .5, .3], station);
      } else {
        cylinder(cream, [0, .71, 0], [.55, .94, .55], station);
        add(new SphereGeometry(.59, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), jade, [0, 1.17, 0], [1, 1, 1], station);
        const telescope = cylinder(ink, [0, 1.45, .3], [.13, .72, .13], station); telescope.rotation.x = .95;
        const lens = cylinder(gold, [0, 1.67, .59], [.16, .06, .16], station); lens.rotation.x = .95;
        box(coral, [0, .6, .56], [.23, .54, .025], station);
      }
      const glow = mat('#e8b656', { emissive: '#c88935', emissiveIntensity: .25 });
      const beacon = add(new SphereGeometry(.1, 12, 8), glow, [stop.x * .73, .45, stop.z * .73]);
      const ring = add(new TorusGeometry(.32, .018, 4, 32), glow, [stop.x * .73, .065, stop.z * .73]); ring.rotation.x = Math.PI / 2;
      const lantern = new Group(); lantern.position.set(stop.x * .73, 0, stop.z * .73); root.add(lantern); lantern.visible = false;
      cylinder(ink, [0, .65, 0], [.018, .7, .018], lantern);
      add(geometry.leaf, glow, [0, 1.13, 0], [.55, .85, .55], lantern);
      beacons.push({ id: stop.id, beacon, ring, glow, lantern, color: stop.color, growth: 0 });
    }
    // A leaf-sailed seed glider: a welcome vessel, distinct from the Kite agent.
    const rover = new Group(); root.add(rover);
    shadow([0, .065, 0], [.67, .5, 1], rover);
    add(new SphereGeometry(.42, 18, 10), jade, [0, .31, 0], [.8, .35, 1.5], rover);
    add(new SphereGeometry(.42, 18, 10), cream, [0, .41, 0], [.76, .36, 1.43], rover);
    cylinder(ink, [0, .9, -.1], [.018, 1.1, .018], rover);
    const sail = add(geometry.leaf, mat('#c9dfa4'), [.08, 1.08, -.12], [.08, 1.25, .8], rover); sail.rotation.z = -.35;
    add(geometry.leaf, coral, [0, .48, .26], [.2, .18, .3], rover);
    const growthPlant = new Group(); growthPlant.position.set(0, 0, -3.9); root.add(growthPlant);
    cylinder(ink, [0, .66, 0], [.045, 1.3, .045], growthPlant);
    const growthLeaves = WORLD_STOPS.map((stop, index) => { const leaf = add(geometry.leaf, mat(stop.color), [Math.sin(index * 2.094) * .35, .9 + index * .24, Math.cos(index * 2.094) * .35], [.08, .12, .08], growthPlant); leaf.rotation.z = index % 2 ? -.5 : .5; return { id: stop.id, leaf, amount: .12 }; });
    const pulseMaterial = mat('#f6d36d', { transparent: true, opacity: 0, depthWrite: false });
    const pulse = add(new RingGeometry(.3, .35, 48), pulseMaterial, [0, .08, 0]); pulse.rotation.x = -Math.PI / 2;
    let player = createRover(), previousReset = controls.reset, previousPulse = controls.pulse, pulseUntil = -1, previousDusk = null, currentAngle = controls.angle;
    const discovered = new Set(), cameraFocus = new Vector3(), cameraGoal = new Vector3();
    const raycaster = new Raycaster(), plane = new Plane(new Vector3(0, 1, 0), -.03), ndc = new Vector2(), hit = new Vector3();
    const labelLayer = document.createElement('span'); labelLayer.className = 'world-map-labels'; host.append(labelLayer);
    const labels = WORLD_STOPS.map(stop => { const element = document.createElement('span'); element.className = 'world-map-label'; element.textContent = stop.area; labelLayer.append(element); return { element, point: new Vector3(stop.x, 1.9, stop.z), projected: new Vector3() }; });
    let viewport = { width: 1, height: 1 }, down = null;
    const pointerDown = event => { if (isActive() && event.button === 0) down = { x: event.clientX, y: event.clientY, id: event.pointerId }; };
    const pointerUp = event => {
      if (!down || down.id !== event.pointerId || !isActive()) return;
      const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y); down = null;
      if (moved > 8) return;
      const box = host.getBoundingClientRect(); ndc.set((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(plane, hit) && Math.hypot(hit.x, hit.z) < 5) { controls.target = { x: hit.x, z: hit.z }; controls.keys.clear(); options.onEvent?.({ type: 'travel' }); }
    };
    const cancel = () => { down = null; };
    host.addEventListener('pointerdown', pointerDown); host.addEventListener('pointerup', pointerUp); host.addEventListener('pointercancel', cancel);
    return {
      update(time, dt) {
        if (controls.reset !== previousReset) { player = createRover(); previousReset = controls.reset; controls.target = null; controls.keys.clear(); }
        const input = { ...controls, angle: currentAngle };
        player = stepRover(player, input, dt);
        const arrived = Boolean(input.target && player.arrived);
        if (player.manual) options.onEvent?.({ type: 'manual' });
        if (player.manual || player.arrived) controls.target = null;
        if (player.nearby && !discovered.has(player.nearby)) { discovered.add(player.nearby); options.onEvent?.({ type: 'discover', id: player.nearby }); }
        if (arrived) options.onEvent?.({ type: 'arrive', id: player.nearby });
        rover.position.set(player.x, .13 + Math.sin(time * 1.7) * .035, player.z); rover.rotation.y = player.heading;
        sail.rotation.z = -.35 + Math.sin(time * 1.4) * .07;
        growthLeaves.forEach(item => { item.amount += ((discovered.has(item.id) ? 1 : .12) - item.amount) * Math.min(1, dt * 2); item.leaf.scale.set(.7 * item.amount, 1.15 * item.amount, .6 * item.amount); });
        currentAngle += (controls.angle - currentAngle) * (dt ? Math.min(1, dt * 5) : 1);
        const follow = controls.follow !== false;
        cameraFocus.lerp(cameraGoal.set(follow ? player.x * .24 : 0, .25, follow ? player.z * .24 : 0), Math.min(1, dt * 3));
        camera.position.set(cameraFocus.x + Math.sin(currentAngle) * 18, 13, cameraFocus.z + Math.cos(currentAngle) * 18); camera.lookAt(cameraFocus);
        if (camera.zoom !== controls.zoom) { camera.zoom = controls.zoom; camera.updateProjectionMatrix(); }
        camera.updateMatrixWorld();
        labels.forEach(({ element, point, projected }) => { projected.copy(point).project(camera); element.style.transform = `translate(${Math.round((projected.x * .5 + .5) * viewport.width)}px,${Math.round((-.5 * projected.y + .5) * viewport.height)}px) translate(-50%,-100%)`; });
        if (previousDusk !== controls.dusk) { previousDusk = controls.dusk; grass.color.set(controls.dusk ? '#658b86' : '#91b6a1'); water.color.set(controls.dusk ? '#486f7d' : '#5c9c98'); light.intensity = controls.dusk ? 1.05 : 2.3; }
        beacons.forEach((item, index) => { const { id, beacon, ring, glow, lantern, color } = item; const found = discovered.has(id); glow.color.set(found ? color : '#e8b656'); glow.emissive.set(found ? color : '#c88935'); glow.emissiveIntensity = found ? .5 : .25; beacon.position.y = .43 + Math.sin(time * 1.6 + index * 2) * .045; ring.scale.setScalar(found ? 1 : 1 + Math.sin(time * 1.5 + index) * .08); item.growth += ((found ? 1 : 0) - item.growth) * Math.min(1, dt * 3); lantern.visible = found; lantern.scale.setScalar(Math.max(.001, item.growth)); });
        ripples.forEach((ring, index) => ring.scale.setScalar(1 + Math.sin(time * .45 + index) * .012));
        if (controls.pulse !== previousPulse) { previousPulse = controls.pulse; pulseUntil = time + 1.1; pulse.position.set(player.x, .08, player.z); }
        const phase = Math.max(0, 1 - (pulseUntil - time) / 1.1); pulse.visible = time < pulseUntil; pulse.scale.setScalar(1 + phase * 5); pulseMaterial.opacity = (1 - phase) * .7;
        host.dataset.roverX = player.x.toFixed(3); host.dataset.roverZ = player.z.toFixed(3); host.dataset.nearby = player.nearby || ''; host.dataset.discovered = String(discovered.size);
        host.dataset.lanterns = String(discovered.size); host.dataset.cameraFollow = String(follow);
        host.dataset.transport = 'seed-glider'; host.dataset.growthLeaves = String(discovered.size);
      },
      onPause() { controls.keys.clear(); controls.target = null; down = null; },
      resize(size) { viewport = size; },
      dispose() { labelLayer.remove(); host.removeEventListener('pointerdown', pointerDown); host.removeEventListener('pointerup', pointerUp); host.removeEventListener('pointercancel', cancel); },
    };
  } });
}

import { ACESFilmicToneMapping, AmbientLight, DirectionalLight, Group, OrthographicCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';

/** Rendering policy only. Each scene owns its geometry and choreography. */
export function createSceneRuntime(host, { compact = false, span = 6, cameraPosition = [6, 5, 9], fitWidth = false, build, onFailure }) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new Scene(), root = new Group(); scene.add(root);
  const camera = new OrthographicCamera(-span / 2, span / 2, span / 2, -span / 2, .1, 40);
  camera.position.set(...cameraPosition); camera.lookAt(0, .1, 0);
  scene.add(new AmbientLight(0xfff5df, 1.7));
  const light = new DirectionalLight(0xffffff, 2.3); light.position.set(-3, 8, 5); scene.add(light);
  let frame = 0, active = false, disposed = false, elapsed = 0, previous = 0, lastDraw = 0;
  let state = 'idle', pointer = { x: 0, y: 0 }, choreography;
  const draw = (dt = 0) => {
    if (disposed) return;
    choreography?.update(elapsed, dt, state, pointer);
    renderer.render(scene, camera);
    host.dataset.drawCalls = String(renderer.info.render.calls);
    host.dataset.triangles = String(renderer.info.render.triangles);
  };
  const tick = now => {
    frame = 0;
    if (!active || document.hidden || disposed) return;
    if (!lastDraw || now - lastDraw >= (compact ? 1000 / 24 : 1000 / 30)) {
      const dt = previous ? Math.min((now - previous) / 1000, .06) : 0;
      previous = now; lastDraw = now; elapsed += dt;
      try { draw(dt); } catch { dispose(); onFailure?.(); return; }
    }
    frame = requestAnimationFrame(tick);
  };
  const reconcile = () => {
    cancelAnimationFrame(frame); frame = 0; previous = 0; lastDraw = 0;
    if (!active || document.hidden) choreography?.onPause?.();
    if (active && !document.hidden && !disposed) frame = requestAnimationFrame(tick);
    host.dataset.running = String(Boolean(active && !document.hidden && !disposed));
  };
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height || disposed) return;
    const aspect = width / height;
    const fit = fitWidth ? Math.max(1, 1 / aspect) : 1;
    camera.left = -span * aspect * fit / 2; camera.right = span * aspect * fit / 2;
    camera.top = span * fit / 2; camera.bottom = -span * fit / 2; camera.updateProjectionMatrix();
    const scale = Math.min(1, 768 / width, 768 / height);
    renderer.setSize(width * scale, height * scale, false); choreography?.resize?.({ width, height }); draw();
  };
  const pointerTarget = host.closest('button') || host;
  const move = event => { if (!active) return; const box = pointerTarget.getBoundingClientRect(); pointer = { x: (event.clientX - box.left) / box.width - .5, y: (event.clientY - box.top) / box.height - .5 }; };
  const leave = () => { pointer = { x: 0, y: 0 }; };
  const lost = event => { event.preventDefault(); dispose(); onFailure?.(); };
  let observer;
  function dispose() {
    if (disposed) return;
    disposed = true; reconcile(); observer?.disconnect();
    choreography?.dispose?.();
    document.removeEventListener('visibilitychange', reconcile);
    pointerTarget.removeEventListener('pointermove', move); pointerTarget.removeEventListener('pointerleave', leave);
    renderer.domElement.removeEventListener('webglcontextlost', lost);
    const geometries = new Set(), materials = new Set();
    scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material); });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  }
  try {
    choreography = build(root, { camera, renderer, host, light, isActive: () => active && !document.hidden });
    host.append(renderer.domElement);
    observer = new ResizeObserver(resize); observer.observe(host);
    document.addEventListener('visibilitychange', reconcile);
    pointerTarget.addEventListener('pointermove', move, { passive: true }); pointerTarget.addEventListener('pointerleave', leave);
    renderer.domElement.addEventListener('webglcontextlost', lost);
    resize();
  } catch (error) { dispose(); throw error; }
  return { setActive(value) { active = Boolean(value); reconcile(); }, setState(value) { state = value; if (!active) draw(); }, dispose };
}

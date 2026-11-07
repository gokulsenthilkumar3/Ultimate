// Browser presentation only. Positions/animation never enter the graph API.
import * as THREE from "/vendor/three.module.js";

export function createBrain3D({
  canvas,
  palette,
  onPick,
  onFailure,
  onMotion,
}) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia("(max-width: 650px)");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(
    Math.min(devicePixelRatio || 1, compact.matches ? 1.25 : 1.5),
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(48, 1, 1, 50000);
  const target = new THREE.Vector3(),
    raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  const abort = new AbortController(),
    signal = abort.signal;
  let pointCloud,
    lineCloud,
    emphasis,
    selectedLinks,
    marker,
    positions = new Map(),
    points = [],
    links = [];
  let active = true,
    visible = true,
    running = !reduced.matches,
    disposed = false,
    light = false,
    focusOnly = false,
    showLinks = true;
  let yaw = 0.28,
    pitch = 0.24,
    distance = 7000,
    frame,
    last = 0,
    elapsed = 0,
    frames = 0,
    moving,
    selected;
  let mode = "orbit",
    drag,
    moved = false,
    size = 1;
  const touch = new Map();
  const pointMaterial = () =>
    new THREE.ShaderMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      uniforms: {
        opacity: { value: 0.9 },
        pointScale: { value: size * renderer.getPixelRatio() },
        time: { value: 0 },
      },
      vertexShader: `attribute float nodeSize; varying vec3 vColor; uniform float pointScale; uniform float time;
      void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;
      float breathe=1.0+0.08*sin(time+position.z*0.009);gl_PointSize=clamp(nodeSize*pointScale*breathe*2500.0/max(1.0,-p.z),2.2,18.0);}`,
      fragmentShader: `varying vec3 vColor;uniform float opacity;
      void main(){float d=length(gl_PointCoord-vec2(0.5));if(d>0.5)discard;float a=(1.0-smoothstep(0.12,0.5,d))*opacity;
      gl_FragColor=vec4(vColor,a);
      #include <colorspace_fragment>
      }`,
    });
  function clearObject(object) {
    if (!object) return;
    scene.remove(object);
    object.geometry.dispose();
    object.material.dispose();
  }
  function geometry(list, highlighted = false) {
    const xyz = [],
      colors = [],
      sizes = [];
    for (const point of list) {
      const position = positions.get(String(point.id));
      xyz.push(position.x, position.y, position.z);
      const color = new THREE.Color(
        highlighted ? (light ? "#1b774b" : "#edffd9") : palette[point.group],
      );
      colors.push(color.r, color.g, color.b);
      sizes.push((highlighted ? 6 : 2.6) + Math.log2(1 + point.degree) * 0.45);
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.Float32BufferAttribute(xyz, 3));
    result.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    result.setAttribute("nodeSize", new THREE.Float32BufferAttribute(sizes, 1));
    result.computeBoundingSphere();
    return result;
  }
  function setData(nextPoints, nextLinks) {
    points = nextPoints;
    links = nextLinks;
    positions = new Map();
    for (const point of points) {
      let hash = 2166136261;
      for (const ch of String(point.id))
        hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
      const z =
        Math.sin((point.group / 8) * Math.PI * 2) * 900 +
        (((hash >>> 0) % 1000) - 500) * 0.8;
      positions.set(String(point.id), new THREE.Vector3(point.x, point.y, z));
    }
    clearObject(pointCloud);
    clearObject(lineCloud);
    clearObject(emphasis);
    clearObject(selectedLinks);
    selectedLinks = undefined;
    clearObject(marker);
    emphasis = marker = undefined;
    pointCloud = new THREE.Points(geometry(points), pointMaterial());
    scene.add(pointCloud);
    const xyz = [];
    for (const { a, b } of links)
      for (const point of [a, b]) {
        const p = positions.get(String(point.id));
        xyz.push(p.x, p.y, p.z);
      }
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(xyz, 3),
    );
    lineCloud = new THREE.LineSegments(
      edgeGeometry,
      new THREE.LineBasicMaterial({
        color: light ? "#345b49" : "#9bbbcf",
        transparent: true,
        opacity: light ? 0.12 : 0.14,
        depthWrite: false,
      }),
    );
    lineCloud.visible = showLinks;
    scene.add(lineCloud);
    canvas.dataset.nodes = String(points.length);
    canvas.dataset.edges = String(links.length);
    canvas.dataset.renderer = "webgl";
    canvas.dataset.depthRange = String(
      Math.max(...[...positions.values()].map((p) => p.z)) -
        Math.min(...[...positions.values()].map((p) => p.z)),
    );
    fit(points);
    if (selected)
      setSelection(points.find((point) => point.id === selected.id));
    request();
  }
  function resize() {
    if (disposed || !active) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    request();
  }
  function fit(list = points) {
    if (!list.length) return;
    resize();
    const bounds = new THREE.Box3();
    for (const point of list)
      bounds.expandByPoint(positions.get(String(point.id)));
    const center = bounds.getCenter(new THREE.Vector3());
    const direction = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    );
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const up = new THREE.Vector3().crossVectors(direction, right);
    const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2),
      horizontal = vertical * camera.aspect;
    let required = 180;
    for (const point of list) {
      const delta = positions.get(String(point.id)).clone().sub(center);
      required = Math.max(
        required,
        delta.dot(direction) +
          Math.max(
            Math.abs(delta.dot(right)) / horizontal,
            Math.abs(delta.dot(up)) / vertical,
          ) *
            1.22,
      );
    }
    fly(center, required);
  }
  function fly(destination, nextDistance) {
    if (reduced.matches) {
      target.copy(destination);
      distance = nextDistance;
      moving = undefined;
    } else
      moving = {
        from: target.clone(),
        to: destination.clone(),
        fromDistance: distance,
        toDistance: nextDistance,
        start: performance.now(),
        duration: 650,
      };
    request();
  }
  function focus(point) {
    const p = positions.get(String(point.id));
    if (p) fly(p, 650);
  }
  function updateCamera() {
    pitch = Math.max(-1.35, Math.min(1.35, pitch));
    camera.position.set(
      target.x + Math.sin(yaw) * Math.cos(pitch) * distance,
      target.y + Math.sin(pitch) * distance,
      target.z + Math.cos(yaw) * Math.cos(pitch) * distance,
    );
    camera.lookAt(target);
    camera.updateMatrixWorld();
    canvas.dataset.yaw = yaw.toFixed(4);
    canvas.dataset.distance = distance.toFixed(1);
  }
  function canRun() {
    return !disposed && active && visible && !document.hidden;
  }
  function request() {
    // Intersection notifications can lag behind viewport/fullscreen changes.
    // Explicit input must be able to wake an actually visible paused canvas.
    if (!visible && active && !document.hidden) {
      const rect = canvas.getBoundingClientRect();
      visible =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < innerHeight &&
        rect.right > 0 &&
        rect.left < innerWidth;
    }
    canvas.dataset.pausedBy = disposed
      ? "disposed"
      : !active
        ? "tab"
        : !visible
          ? "offscreen"
          : document.hidden
            ? "document"
            : "none";
    if (canRun() && !frame) frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = undefined;
    if (!canRun()) return;
    const limit = compact.matches ? 1000 / 24 : 1000 / 30;
    if (last && now - last < limit && (running || moving)) {
      request();
      return;
    }
    const dt = Math.min(0.08, (now - (last || now)) / 1000);
    last = now;
    if (running && !reduced.matches && !drag && !moving) {
      yaw += dt * 0.055;
      elapsed += dt;
    }
    if (moving) {
      const t = Math.min(1, (now - moving.start) / moving.duration),
        ease = t * t * (3 - 2 * t);
      target.lerpVectors(moving.from, moving.to, ease);
      distance = THREE.MathUtils.lerp(
        moving.fromDistance,
        moving.toDistance,
        ease,
      );
      if (t === 1) moving = undefined;
    }
    updateCamera();
    for (const object of [pointCloud, emphasis])
      if (object) object.material.uniforms.time.value = elapsed;
    const start = performance.now();
    renderer.render(scene, camera);
    canvas.dataset.drawMs = (performance.now() - start).toFixed(1);
    canvas.dataset.frames = String(++frames);
    canvas.dataset.animating = String(running && !reduced.matches);
    canvas.dataset.moving = String(Boolean(moving));
    if (running || moving) request();
  }
  function setMotion(value) {
    running = Boolean(value) && !reduced.matches;
    onMotion(running, reduced.matches);
    if (!running && frame && !moving) {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
    request();
  }
  function setActive(value) {
    active = value;
    if (!canRun() && frame) {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
    if (active) {
      last = 0;
      resize();
      request();
    }
  }
  function setTheme(value) {
    light = value;
    scene.background = new THREE.Color(light ? "#eff4ec" : "#0c171f");
    if (lineCloud) {
      lineCloud.material.color.set(light ? "#345b49" : "#9bbbcf");
      lineCloud.material.opacity = light ? 0.06 : 0.035;
    }
    if (pointCloud) {
      const attribute = pointCloud.geometry.getAttribute("color");
      points.forEach((point, i) => {
        const color = new THREE.Color(
          light
            ? [
                "#32703e",
                "#28669e",
                "#945821",
                "#7350a1",
                "#247e7c",
                "#a03d62",
                "#76721e",
                "#47596e",
              ][point.group]
            : palette[point.group],
        );
        attribute.setXYZ(i, color.r, color.g, color.b);
      });
      attribute.needsUpdate = true;
      pointCloud.material.uniforms.opacity.value =
        focusOnly && selected ? 0.13 : 0.9;
    }
    if (selected) setSelection(selected);
    request();
  }
  function setSelection(point) {
    selected = point;
    clearObject(emphasis);
    clearObject(marker);
    clearObject(selectedLinks);
    selectedLinks = undefined;
    emphasis = marker = undefined;
    if (point) {
      const ids = new Set([String(point.id)]);
      const edges = [];
      for (const link of links)
        if (link.a.id === point.id || link.b.id === point.id) {
          ids.add(String(link.a.id));
          ids.add(String(link.b.id));
          edges.push(link);
        }
      emphasis = new THREE.Points(
        geometry(
          points.filter((p) => ids.has(String(p.id))),
          true,
        ),
        pointMaterial(),
      );
      scene.add(emphasis);
      const coordinates = [];
      for (const link of edges)
        for (const endpoint of [link.a, link.b]) {
          const p = positions.get(String(endpoint.id));
          coordinates.push(p.x, p.y, p.z);
        }
      const edgeGeometry = new THREE.BufferGeometry();
      edgeGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(coordinates, 3),
      );
      selectedLinks = new THREE.LineSegments(
        edgeGeometry,
        new THREE.LineBasicMaterial({
          color: light ? "#1b774b" : "#b1e9d4",
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
        }),
      );
      selectedLinks.visible = showLinks;
      scene.add(selectedLinks);
      // The marker is an overlay on the selected native node, never a graph entity.
      marker = new THREE.Mesh(
        new THREE.IcosahedronGeometry(10, 1),
        new THREE.MeshBasicMaterial({
          color: light ? "#1c6d48" : "#edffd9",
          wireframe: true,
        }),
      );
      marker.position.copy(positions.get(String(point.id)));
      scene.add(marker);
    }
    if (pointCloud)
      pointCloud.material.uniforms.opacity.value =
        focusOnly && point ? 0.13 : 0.9;
    if (lineCloud)
      lineCloud.material.opacity =
        focusOnly && point ? 0.008 : light ? 0.06 : 0.035;
    request();
  }
  function pick(event) {
    if (!pointCloud) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    updateCamera();
    raycaster.setFromCamera(pointer, camera);
    raycaster.params.Points.threshold = Math.max(4, distance * 0.0025);
    const hit = raycaster.intersectObject(pointCloud, false)[0];
    if (hit) onPick(points[hit.index]);
  }
  function zoom(factor) {
    moving = undefined;
    distance = Math.max(80, Math.min(30000, distance / factor));
    request();
  }
  function pan(dx, dy) {
    updateCamera();
    const right = new THREE.Vector3().setFromMatrixColumn(
        camera.matrixWorld,
        0,
      ),
      up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const rate = (distance / Math.max(1, canvas.clientHeight)) * 0.8;
    target.addScaledVector(right, -dx * rate).addScaledVector(up, dy * rate);
    request();
  }
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      touch.set(event.pointerId, { x: event.clientX, y: event.clientY });
      drag = { x: event.clientX, y: event.clientY };
      moved = false;
      moving = undefined;
      canvas.setPointerCapture(event.pointerId);
    },
    { signal },
  );
  canvas.addEventListener(
    "pointermove",
    (event) => {
      if (!drag) return;
      const previous = touch.get(event.pointerId);
      if (!previous) return;
      if (touch.size === 2) {
        const other = [...touch.entries()].find(
          ([id]) => id !== event.pointerId,
        )?.[1];
        if (other) {
          const before = Math.hypot(previous.x - other.x, previous.y - other.y),
            after = Math.hypot(
              event.clientX - other.x,
              event.clientY - other.y,
            );
          if (before > 0) zoom(after / before);
        }
      } else {
        const dx = event.clientX - drag.x,
          dy = event.clientY - drag.y;
        if (mode === "pan" || event.shiftKey) pan(dx, dy);
        else {
          yaw -= dx * 0.005;
          pitch += dy * 0.005;
        }
        if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      }
      touch.set(event.pointerId, { x: event.clientX, y: event.clientY });
      drag = { x: event.clientX, y: event.clientY };
      request();
    },
    { signal },
  );
  canvas.addEventListener(
    "pointerup",
    (event) => {
      if (!moved && touch.size === 1) pick(event);
      touch.delete(event.pointerId);
      drag = undefined;
      if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
    },
    { signal },
  );
  const release = (event) => {
    touch.delete(event.pointerId);
    drag = undefined;
  };
  canvas.addEventListener("pointercancel", release, { signal });
  canvas.addEventListener("lostpointercapture", release, { signal });
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoom(event.deltaY < 0 ? 1.12 : 1 / 1.12);
    },
    { signal, passive: false },
  );
  canvas.addEventListener(
    "keydown",
    (event) => {
      if (
        ![
          "+",
          "=",
          "-",
          "Home",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          " ",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      if (event.key === "Home") fit();
      else if (event.key === " ") setMotion(!running);
      else if (event.key === "+" || event.key === "=") zoom(1.3);
      else if (event.key === "-") zoom(1 / 1.3);
      else if (event.shiftKey)
        pan(
          event.key === "ArrowLeft" ? 40 : event.key === "ArrowRight" ? -40 : 0,
          event.key === "ArrowUp" ? 40 : event.key === "ArrowDown" ? -40 : 0,
        );
      else {
        yaw +=
          event.key === "ArrowLeft"
            ? 0.15
            : event.key === "ArrowRight"
              ? -0.15
              : 0;
        pitch +=
          event.key === "ArrowUp"
            ? 0.12
            : event.key === "ArrowDown"
              ? -0.12
              : 0;
        request();
      }
    },
    { signal },
  );
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const intersection = new IntersectionObserver(() => {
    const rect = canvas.getBoundingClientRect();
    visible =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.top < innerHeight &&
      rect.right > 0 &&
      rect.left < innerWidth;
    if (!canRun() && frame) {
      cancelAnimationFrame(frame);
      frame = undefined;
    } else request();
  });
  intersection.observe(canvas);
  document.addEventListener("visibilitychange", () => setActive(active), {
    signal,
  });
  reduced.addEventListener(
    "change",
    () => {
      if (reduced.matches) {
        moving = undefined;
        setMotion(false);
      }
    },
    { signal },
  );
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      if (!disposed)
        onFailure(
          new Error("3D graphics context was lost. The 2D map is available."),
        );
    },
    { signal },
  );
  function dispose() {
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
    abort.abort();
    observer.disconnect();
    intersection.disconnect();
    for (const object of [
      pointCloud,
      lineCloud,
      emphasis,
      marker,
      selectedLinks,
    ])
      clearObject(object);
    renderer.dispose();
  }
  setTheme(false);
  onMotion(running, reduced.matches);
  return {
    setData,
    fit,
    focus,
    zoom,
    setSelection,
    setTheme,
    setActive,
    request,
    dispose,
    setMotion,
    setMode(value) {
      mode = value;
    },
    setLinks(value) {
      showLinks = value;
      if (lineCloud) lineCloud.visible = value;
      if (selectedLinks) selectedLinks.visible = value;
      request();
    },
    setFocus(value) {
      focusOnly = value;
      setSelection(selected);
    },
    setSize(value) {
      size = value;
      for (const object of [pointCloud, emphasis])
        if (object)
          object.material.uniforms.pointScale.value =
            size * renderer.getPixelRatio();
      request();
    },
  };
}

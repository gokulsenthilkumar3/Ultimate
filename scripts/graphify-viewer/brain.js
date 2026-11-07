/* Whole-snapshot canvas: native nodes/edges only; layout groups are visual aids. */
(() => {
  const el = (id) => document.getElementById(id);
  const canvas = el("brain-canvas"),
    ctx = canvas.getContext("2d");
  const palette = [
    "#a7dfb3",
    "#8abff4",
    "#e7b583",
    "#c3a8f1",
    "#83d6d5",
    "#e3a4b8",
    "#d9d68c",
    "#a9b5c7",
  ];
  const domains = [
    "Ultimate",
    "FinSync",
    "OxFin",
    "Family Connect",
    "Equity",
    "Forex",
    "Documentation",
    "Workspace / Graphify",
  ];
  let graph,
    loading,
    services = [],
    points = [],
    links = [],
    byId = new Map(),
    incident = new Map(),
    active = false;
  let width = 1,
    height = 1,
    scale = 1,
    tx = 0,
    ty = 0,
    chosen,
    hovered,
    frame,
    light = false,
    matches = [],
    offset = 0,
    searchTimer;
  let drag,
    moved = false,
    buildMs = 0,
    drawMs = 0;
  let renderer3D,
    use3D = false,
    prefer3D = true,
    rendererTask,
    graphicsFailed = false;
  const glCanvas = el("brain-webgl");
  async function show3D() {
    if (graphicsFailed || !prefer3D) return;
    if (rendererTask) return rendererTask;
    rendererTask = (async () => {
      try {
        if (!renderer3D) {
          const { createBrain3D } = await import("/brain-3d.js");
          if (!prefer3D) return;
          renderer3D = createBrain3D({
            canvas: glCanvas,
            palette,
            onPick: (point) => inspect(byId.get(String(point.id))),
            onFailure: fallback,
            onMotion: (running, reduced) => {
              el("brain-motion").textContent = reduced
                ? "Reduced motion"
                : running
                  ? "Pause motion"
                  : "Resume motion";
              el("brain-motion").setAttribute("aria-pressed", String(running));
              el("brain-motion").disabled = reduced;
            },
          });
        }
        if (!prefer3D) return;
        use3D = true;
        canvas.hidden = true;
        glCanvas.hidden = false;
        if (frame) {
          cancelAnimationFrame(frame);
          frame = null;
        }
        renderer3D.setActive(active);
        renderer3D.setData(points, links);
        renderer3D.setTheme(light);
        if (chosen) renderer3D.setSelection(chosen);
        el("brain-renderer-badge").textContent = "3D / INTERACTIVE";
        el("brain-caption").textContent =
          `${points.length.toLocaleString()} native nodes · ${links.length.toLocaleString()} relationships · drag to orbit / scroll to zoom`;
        syncDimensions();
      } catch (reason) {
        fallback(reason);
      }
    })().finally(() => {
      rendererTask = null;
    });
    return rendererTask;
  }
  function syncDimensions() {
    el("brain-3d").setAttribute("aria-pressed", String(use3D));
    el("brain-2d").setAttribute("aria-pressed", String(!use3D));
    for (const id of ["brain-orbit", "brain-pan", "brain-lines", "brain-focus"])
      el(id).disabled = !use3D;
    el("brain-motion").disabled =
      !use3D || matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function show2D() {
    prefer3D = false;
    use3D = false;
    renderer3D?.setActive(false);
    glCanvas.hidden = true;
    canvas.hidden = false;
    el("brain-renderer-badge").textContent = graphicsFailed
      ? "2D / GRAPHICS FALLBACK"
      : "2D / ORIGINAL MAP";
    syncDimensions();
    fit();
  }
  function fallback(reason) {
    graphicsFailed = true;
    renderer3D?.dispose();
    renderer3D = undefined;
    el("brain-3d").disabled = true;
    show2D();
    el("brain-renderer-badge").textContent = "2D / 3D UNAVAILABLE";
    el("brain-renderer-badge").title = reason.message;
  }
  const text = (tag, value, cls) => {
    const node = document.createElement(tag);
    node.textContent = value;
    if (cls) node.className = cls;
    return node;
  };
  const domain = (file) =>
    file?.startsWith("growthtrack-ultimate/")
      ? 0
      : file?.startsWith("FinSync/OxFin/")
        ? 2
        : file?.startsWith("FinSync/")
          ? 1
          : file?.startsWith("Family Connect/")
            ? 3
            : file?.startsWith("Equity/")
              ? 4
              : file?.startsWith("Forex/")
                ? 5
                : file?.startsWith("docs/")
                  ? 6
                  : 7;
  async function json(url) {
    const response = await fetch(url);
    const value = await response.json();
    if (!response.ok) throw new Error(value.message || "Brain request failed");
    return value;
  }
  function error(reason) {
    el("brain-caption").textContent = reason.message;
  }
  function prepare(data) {
    const start = performance.now();
    graph = data;
    byId = new Map();
    incident = new Map();
    const buckets = new Map(),
      groupBuckets = domains.map(() => []);
    points = data.nodes.map((node, index) => {
      const group = domain(node.source_file),
        key = `${group}:${node.community ?? "unclassified"}`;
      const point = { ...node, group, index, x: 0, y: 0, degree: 0 };
      byId.set(String(node.id), point);
      incident.set(String(node.id), []);
      if (!buckets.has(key)) {
        const bucket = { group, nodes: [] };
        buckets.set(key, bucket);
        groupBuckets[group].push(bucket);
      }
      buckets.get(key).nodes.push(point);
      return point;
    });
    groupBuckets.forEach((collection, group) => {
      const angle = (group / domains.length) * Math.PI * 2;
      const cx = Math.cos(angle) * 1700,
        cy = Math.sin(angle) * 1500;
      collection.sort((a, b) => b.nodes.length - a.nodes.length);
      collection.forEach((bucket, i) => {
        const a = i * 2.3999632297,
          radius = Math.sqrt(i) * 95;
        const bx = cx + Math.cos(a) * radius,
          by = cy + Math.sin(a) * radius;
        bucket.nodes.forEach((point, j) => {
          const phase = j * 2.3999632297,
            r = Math.sqrt(j) * 9;
          point.x = bx + Math.cos(phase) * r;
          point.y = by + Math.sin(phase) * r;
        });
      });
    });
    links = data.edges
      .map((edge) => {
        const a = byId.get(String(edge.source)),
          b = byId.get(String(edge.target));
        if (a) {
          a.degree++;
          incident.get(String(a.id)).push(edge);
        }
        if (b && a !== b) {
          b.degree++;
          incident.get(String(b.id)).push(edge);
        }
        return { a, b, edge };
      })
      .filter((link) => link.a && link.b);
    buildMs = performance.now() - start;
    el("brain-legend").replaceChildren();
    domains.forEach((label, i) => {
      const count = points.filter((point) => point.group === i).length;
      if (!count) return;
      const button = text(
        "button",
        `${label} · ${count.toLocaleString()}`,
        `domain domain-${i}`,
      );
      button.onclick = () => fit(points.filter((point) => point.group === i));
      el("brain-legend").append(button);
    });
    if (chosen) chosen = byId.get(String(chosen.id));
    search();
    fit(points);
    renderServices();
  }
  async function load(force = false) {
    if (loading) return loading;
    if (graph && !force) {
      resize();
      return;
    }
    el("brain-caption").textContent = "Loading the whole local graph…";
    loading = Promise.all([
      json("/api/graph/brain"),
      json("/api/graph/services"),
    ])
      .then(async ([data, metadata]) => {
        services = metadata.services;
        prepare(data);
        if (chosen) inspect(chosen);
        if (prefer3D) await show3D();
      })
      .catch(error)
      .finally(() => {
        loading = null;
      });
    return loading;
  }
  function resize() {
    if (!active) return;
    if (use3D) return;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
    schedule();
  }
  function fit(list = points) {
    if (use3D) {
      renderer3D.fit(list);
      return;
    }
    resize();
    if (!list.length) return;
    const xs = list.map((n) => n.x),
      ys = list.map((n) => n.y);
    const left = Math.min(...xs),
      right = Math.max(...xs),
      top = Math.min(...ys),
      bottom = Math.max(...ys);
    scale = Math.min(
      (width - 80) / Math.max(100, right - left),
      (height - 100) / Math.max(100, bottom - top),
    );
    scale = Math.max(0.02, Math.min(8, scale));
    tx = width / 2 - ((left + right) / 2) * scale;
    ty = height / 2 - ((top + bottom) / 2) * scale;
    schedule();
  }
  function schedule() {
    if (use3D) {
      renderer3D.request();
      return;
    }
    if (active && !frame && ctx) frame = requestAnimationFrame(draw);
  }
  function draw() {
    frame = null;
    if (use3D) return;
    if (!active || !graph || !ctx) return;
    const start = performance.now();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = light ? "#f1f4ef" : "#121b20";
    ctx.fillRect(0, 0, width, height);
    const visible = (p) =>
      p.x * scale + tx > -30 &&
      p.x * scale + tx < width + 30 &&
      p.y * scale + ty > -30 &&
      p.y * scale + ty < height + 30;
    ctx.strokeStyle = light ? "#254b3a18" : "#b3cbd518";
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    for (const { a, b } of links) {
      const ax = a.x * scale + tx,
        ay = a.y * scale + ty,
        bx = b.x * scale + tx,
        by = b.y * scale + ty;
      if (
        Math.max(ax, bx) < 0 ||
        Math.min(ax, bx) > width ||
        Math.max(ay, by) < 0 ||
        Math.min(ay, by) > height
      )
        continue;
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.stroke();
    palette.forEach((color, group) => {
      ctx.fillStyle = light
        ? [
            "#32703e",
            "#28669e",
            "#945821",
            "#7350a1",
            "#247e7c",
            "#a03d62",
            "#76721e",
            "#47596e",
          ][group]
        : color;
      ctx.beginPath();
      for (const point of points)
        if (point.group === group && visible(point)) {
          const radius = Math.min(
            5,
            Math.max(1.05, scale * (2 + Math.log2(1 + point.degree))),
          );
          const x = point.x * scale + tx,
            y = point.y * scale + ty;
          ctx.moveTo(x + radius, y);
          ctx.arc(x, y, radius, 0, Math.PI * 2);
        }
      ctx.fill();
    });
    const focus = hovered || chosen;
    if (focus) {
      const adjacent = incident.get(String(focus.id)) || [];
      ctx.strokeStyle = light ? "#285d40" : "#d4eac3";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (const edge of adjacent) {
        const a = byId.get(String(edge.source)),
          b = byId.get(String(edge.target));
        if (!a || !b) continue;
        ctx.moveTo(a.x * scale + tx, a.y * scale + ty);
        ctx.lineTo(b.x * scale + tx, b.y * scale + ty);
      }
      ctx.stroke();
      const x = focus.x * scale + tx,
        y = focus.y * scale + ty;
      ctx.strokeStyle = light ? "#173e28" : "#fff";
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "12px Segoe UI, sans-serif";
      const label = String(focus.label || focus.id).slice(0, 65),
        labelWidth = ctx.measureText(label).width + 16;
      const labelX = Math.max(8, Math.min(width - labelWidth - 8, x + 12)),
        labelY = Math.max(24, Math.min(height - 65, y - 12));
      ctx.fillStyle = light ? "#fff" : "#26343c";
      ctx.fillRect(labelX, labelY - 17, labelWidth, 26);
      ctx.fillStyle = light ? "#183b27" : "#f2f6ee";
      ctx.fillText(label, labelX + 8, labelY);
    }
    drawMs = performance.now() - start;
    canvas.dataset.nodes = String(points.length);
    canvas.dataset.edges = String(links.length);
    canvas.dataset.layoutMs = buildMs.toFixed(1);
    canvas.dataset.drawMs = drawMs.toFixed(1);
    el("brain-caption").textContent =
      `${points.length.toLocaleString()} native nodes · ${links.length.toLocaleString()} relationships · ${graph.meta.communities} communities · drag to pan / scroll to zoom`;
  }
  function zoom(factor, x = width / 2, y = height / 2) {
    if (use3D) {
      renderer3D.zoom(factor);
      return;
    }
    const next = Math.max(0.02, Math.min(20, scale * factor)),
      ratio = next / scale;
    tx = x - (x - tx) * ratio;
    ty = y - (y - ty) * ratio;
    scale = next;
    schedule();
  }
  function pointAt(event) {
    const rect = canvas.getBoundingClientRect(),
      x = event.clientX - rect.left,
      y = event.clientY - rect.top;
    let nearest,
      distance = 12 * 12;
    for (const point of points) {
      const d =
        (point.x * scale + tx - x) ** 2 + (point.y * scale + ty - y) ** 2;
      if (d < distance) {
        distance = d;
        nearest = point;
      }
    }
    return nearest;
  }
  function inspect(point, center = false) {
    if (!point) return;
    chosen = point;
    hovered = null;
    if (use3D) {
      renderer3D.setMotion(false);
      renderer3D.setSelection(point);
      if (center) renderer3D.focus(point);
    }
    if (center && !use3D) {
      scale = Math.max(scale, 1.5);
      tx = width / 2 - point.x * scale;
      ty = height / 2 - point.y * scale;
    }
    const panel = el("brain-selection");
    panel.replaceChildren(text("h3", point.label || point.id));
    panel.append(
      text("p", point.source_file || "Source path unavailable"),
      text(
        "p",
        `${point.source_location || "Location unavailable"} · ${point.community_name ?? point.community ?? "Unclassified"} · ${point.degree} incident relationships`,
      ),
      text("code", String(point.id)),
    );
    const button = text("button", "Explore original relationships →");
    button.onclick = () => {
      tab(false);
      document.dispatchEvent(
        new CustomEvent("graphify:explore", { detail: String(point.id) }),
      );
    };
    panel.append(button);
    const copy = text("button", "Copy node ID");
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(String(point.id));
        copy.textContent = "Copied";
      } catch {
        copy.textContent = "Select ID above to copy";
      }
    };
    panel.append(copy);
    schedule();
  }
  function search() {
    const query = el("brain-search").value.toLowerCase();
    matches = points.filter((point) =>
      `${point.label} ${point.source_file || ""} ${point.community_name || ""}`
        .toLowerCase()
        .includes(query),
    );
    if (offset >= matches.length) offset = 0;
    el("brain-search-count").textContent =
      `${matches.length.toLocaleString()} matches · showing ${matches.length ? offset + 1 : 0}–${Math.min(offset + 12, matches.length)}`;
    el("brain-results").replaceChildren();
    for (const point of matches.slice(offset, offset + 12)) {
      const button = text("button", "", "brain-result");
      button.append(
        text("strong", point.label || point.id),
        text("small", point.source_file || "No source path"),
      );
      button.onclick = () => inspect(point, true);
      el("brain-results").append(button);
    }
    el("brain-more").hidden = matches.length <= 12;
    el("brain-more").textContent =
      offset + 12 < matches.length ? "Next matches →" : "First matches ↺";
  }
  function renderServices() {
    el("brain-services").replaceChildren();
    for (const service of services) {
      const card = text("button", "", "service-card");
      card.dataset.service = service.id;
      card.append(
        text("strong", service.label),
        text(
          "span",
          service.ports.map((port) => `:${port}`).join("  "),
          "service-ports",
        ),
        text("small", service.source),
      );
      card.title = service.evidence;
      card.onclick = () => {
        const subset = points.filter((point) =>
          point.source_file?.startsWith(service.folder),
        );
        const exact = byId.get(
          String(
            points.find((point) => point.source_file === service.source)?.id,
          ),
        );
        if (subset.length) {
          fit(subset);
          inspect(
            subset.find(
              (point) => point.label === point.source_file?.split("/").at(-1),
            ) || subset[0],
          );
        } else if (exact) inspect(exact, true);
      };
      el("brain-services").append(card);
    }
    el("brain-services").append(
      text(
        "p",
        "Database ports can be dynamic or environment-specific. Only public launcher defaults are shown; private connection settings are not read.",
        "muted",
      ),
    );
  }
  function tab(brain, update = true) {
    active = brain;
    renderer3D?.setActive(brain && use3D);
    el("brain-panel").hidden = !brain;
    el("explorer-panel").hidden = brain;
    document.body.classList.toggle("brain-view", brain);
    for (const [id, selected] of [
      ["tab-brain", brain],
      ["tab-explorer", !brain],
    ]) {
      el(id).setAttribute("aria-selected", String(selected));
      el(id).tabIndex = selected ? 0 : -1;
    }
    if (update) history.replaceState(null, "", brain ? "#brain" : "#explore");
    if (brain) load();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  }
  el("tab-brain").onclick = () => tab(true);
  el("tab-explorer").onclick = () => tab(false);
  for (const id of ["tab-brain", "tab-explorer"])
    el(id).onkeydown = (event) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const brain = event.key === "Home" || (event.key !== "End" && !active);
        tab(brain);
        el(brain ? "tab-brain" : "tab-explorer").focus();
      }
    };
  el("brain-fit").onclick = () => fit();
  el("brain-in").onclick = () => zoom(1.5);
  el("brain-out").onclick = () => zoom(1 / 1.5);
  el("brain-theme").onclick = () => {
    light = !light;
    el("brain-theme").setAttribute("aria-pressed", String(light));
    el("brain-theme").textContent = light ? "Dark canvas" : "Light canvas";
    renderer3D?.setTheme(light);
    schedule();
  };
  el("brain-3d").onclick = () => {
    prefer3D = true;
    show3D();
  };
  el("brain-2d").onclick = show2D;
  el("brain-motion").onclick = () =>
    renderer3D?.setMotion(
      el("brain-motion").getAttribute("aria-pressed") !== "true",
    );
  for (const mode of ["orbit", "pan"])
    el(`brain-${mode}`).onclick = () => {
      renderer3D?.setMode(mode);
      for (const value of ["orbit", "pan"])
        el(`brain-${value}`).setAttribute(
          "aria-pressed",
          String(value === mode),
        );
    };
  el("brain-lines").onchange = () =>
    renderer3D?.setLinks(el("brain-lines").checked);
  el("brain-focus").onchange = () =>
    renderer3D?.setFocus(el("brain-focus").checked);
  el("brain-fullscreen").onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el("brain-panel").requestFullscreen();
    } catch {
      el("brain-renderer-badge").textContent =
        "Fullscreen unavailable in this browser";
    }
  };
  document.addEventListener("fullscreenchange", () => {
    el("brain-fullscreen").textContent = document.fullscreenElement
      ? "Exit expanded view"
      : "Expand view";
  });
  el("brain-search").oninput = () => {
    clearTimeout(searchTimer);
    offset = 0;
    searchTimer = setTimeout(search, 120);
  };
  el("brain-more").onclick = () => {
    offset = offset + 12 < matches.length ? offset + 12 : 0;
    search();
  };
  el("refresh").addEventListener("click", () => {
    if (active) load(true);
    else graph = null;
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoom(
        event.deltaY < 0 ? 1.16 : 1 / 1.16,
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    },
    { passive: false },
  );
  canvas.onpointerdown = (event) => {
    if (event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY };
    moved = false;
    canvas.setPointerCapture(event.pointerId);
  };
  canvas.onpointermove = (event) => {
    if (drag) {
      const dx = event.clientX - drag.x,
        dy = event.clientY - drag.y;
      tx += dx;
      ty += dy;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      drag = { x: event.clientX, y: event.clientY };
      schedule();
    } else {
      const next = pointAt(event);
      if (next !== hovered) {
        hovered = next;
        schedule();
      }
    }
  };
  canvas.onpointerup = (event) => {
    if (!moved) {
      const point = pointAt(event);
      if (point) inspect(point);
    }
    drag = null;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
  };
  canvas.onpointercancel = canvas.onlostpointercapture = () => {
    drag = null;
  };
  canvas.onpointerleave = () => {
    hovered = null;
    schedule();
  };
  canvas.onkeydown = (event) => {
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
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    if (event.key === "Home") fit();
    else if (event.key === "+" || event.key === "=") zoom(1.4);
    else if (event.key === "-") zoom(1 / 1.4);
    else {
      tx +=
        event.key === "ArrowLeft" ? 50 : event.key === "ArrowRight" ? -50 : 0;
      ty += event.key === "ArrowUp" ? 50 : event.key === "ArrowDown" ? -50 : 0;
      schedule();
    }
  };
  new ResizeObserver(resize).observe(canvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && frame) {
      cancelAnimationFrame(frame);
      frame = null;
    } else schedule();
  });
  tab(!location.hash || location.hash === "#brain", false);
})();

(() => {
  'use strict';
  const graph = JSON.parse(document.getElementById('graph-data').textContent);
  const $ = (id) => document.getElementById(id);
  const svg = $('map');
  const NS = 'http://www.w3.org/2000/svg';
  const colors = [
    '#bde9d0',
    '#c8d9ff',
    '#e3cef5',
    '#ffe1aa',
    '#bde7e8',
    '#ffd0bf',
    '#dedec6',
    '#d3dce0',
  ];
  function moduleOf(file) {
    if (file.startsWith('FinSync/OxFin/')) return 'OxFin';
    if (file.startsWith('growthtrack-ultimate/')) return 'Ultimate';
    if (file.startsWith('FinSync/')) return 'FinSync';
    if (file.startsWith('Family Connect/')) return 'Family Connect';
    if (file.startsWith('Equity/')) return 'Equity';
    if (file.startsWith('Forex/')) return 'Forex';
    if (file.startsWith('docs/')) return 'Documentation';
    return 'Workspace tooling';
  }
  const modules = [...new Set(graph.files.map(moduleOf))].sort();
  const colorOf = (file) =>
    colors[modules.indexOf(moduleOf(file)) % colors.length];
  const basename = (file) => file.split('/').at(-1);
  const shorten = (value, limit = 27) =>
    value.length > limit ? value.slice(0, limit - 1) + '…' : value;
  const state = {
    view: 'modules',
    file: graph.files.includes('growthtrack-ultimate/server.js')
      ? 'growthtrack-ultimate/server.js'
      : graph.files[0],
    module: '',
    limit: 24,
  };
  let box = { x: 0, y: 0, width: 1100, height: 720 },
    initialBox = { ...box };
  const activeEdges = () =>
    $('hide-types').checked
      ? graph.edges.filter((edge) => !edge.typeOnly)
      : graph.edges;
  function html(tag, text, className) {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function shape(tag, attributes = {}, text, parent = svg) {
    const element = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes))
      element.setAttribute(key, String(value));
    if (text != null) element.textContent = text;
    parent.append(element);
    return element;
  }
  function applyBox() {
    svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
  }
  function zoom(factor) {
    const width = Math.max(220, Math.min(5000, box.width * factor));
    const height = (box.height * width) / box.width;
    box = {
      x: box.x + (box.width - width) / 2,
      y: box.y + (box.height - height) / 2,
      width,
      height,
    };
    applyBox();
  }
  function resetCanvas(height = 720) {
    svg.replaceChildren();
    initialBox = { x: 0, y: 0, width: 1100, height };
    box = { ...initialBox };
    applyBox();
    svg.setAttribute('role', 'group');
    const defs = shape('defs');
    const marker = shape(
      'marker',
      {
        id: 'arrow',
        viewBox: '0 0 10 10',
        refX: 9,
        refY: 5,
        markerWidth: 7,
        markerHeight: 7,
        orient: 'auto-start-reverse',
      },
      null,
      defs,
    );
    shape(
      'path',
      { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#789286' },
      null,
      marker,
    );
  }
  function line(from, to, { count, curved = false } = {}) {
    const dx = to.x - from.x,
      dy = to.y - from.y,
      length = Math.hypot(dx, dy) || 1;
    const start = {
      x: from.x + (dx / length) * (from.radius || 100),
      y: from.y + (dy / length) * (from.radius || 100),
    };
    const end = {
      x: to.x - (dx / length) * (to.radius || 100),
      y: to.y - (dy / length) * (to.radius || 100),
    };
    const mid = {
      x: (start.x + end.x) / 2 - (curved ? (dy / length) * 24 : 0),
      y: (start.y + end.y) / 2 + (curved ? (dx / length) * 24 : 0),
    };
    shape('path', {
      d: `M${start.x},${start.y} Q${mid.x},${mid.y} ${end.x},${end.y}`,
      fill: 'none',
      stroke: '#9eafa3',
      'stroke-width': count ? Math.min(5, 1 + Math.log2(count + 1) / 2) : 1.5,
      opacity: 0.7,
      'marker-end': 'url(#arrow)',
    });
    if (count && count >= 5)
      shape(
        'text',
        {
          x: mid.x,
          y: mid.y - 4,
          fill: '#4d6859',
          'font-size': 11,
          'text-anchor': 'middle',
          'font-family': 'Segoe UI, sans-serif',
        },
        count,
      );
  }
  function node(id, x, y, { module = false, selected = false, count } = {}) {
    const group = shape('g', {
      'data-node': id,
      role: 'button',
      tabindex: 0,
      'aria-label': module
        ? `Explore ${id}, ${count} indexed files`
        : `Explore ${id}`,
    });
    shape('title', {}, id, group);
    const fill = module
      ? colors[modules.indexOf(id) % colors.length]
      : colorOf(id);
    if (module)
      shape(
        'circle',
        {
          cx: x,
          cy: y,
          r: 61,
          fill,
          stroke: selected ? '#163c2d' : '#799385',
          'stroke-width': selected ? 3 : 1,
        },
        null,
        group,
      );
    else
      shape(
        'rect',
        {
          x: x - 104,
          y: y - 23,
          width: 208,
          height: 46,
          rx: 10,
          fill,
          stroke: selected ? '#163c2d' : '#a5b9a7',
          'stroke-width': selected ? 2.5 : 1,
        },
        null,
        group,
      );
    shape(
      'text',
      {
        x,
        y: y - (module ? 6 : -4),
        fill: '#17382b',
        'text-anchor': 'middle',
        'font-size': module ? 14 : 12,
        'font-weight': 650,
        'font-family': 'Segoe UI, sans-serif',
      },
      module ? id : shorten(basename(id)),
      group,
    );
    if (module)
      shape(
        'text',
        {
          x,
          y: y + 17,
          fill: '#3f6250',
          'text-anchor': 'middle',
          'font-size': 12,
          'font-family': 'Segoe UI, sans-serif',
        },
        `${count} files`,
        group,
      );
    const activate = () => {
      if (module) {
        state.module = id;
        $('module-filter').value = id;
        renderSearch();
        render();
      } else selectFile(id);
    };
    group.addEventListener('click', activate);
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
  }
  function stats(items) {
    const holder = html('div', null, 'detail-stats');
    for (const [value, label] of items) {
      const item = html('div', null, 'detail-stat');
      item.append(html('strong', value), html('span', label));
      holder.append(item);
    }
    $('detail-body').append(holder);
  }
  function fileLinks(title, files) {
    $('detail-body').append(html('h3', `${title} (${files.length})`));
    const list = html('div', null, 'detail-links');
    for (const entry of files.slice(0, 40)) {
      const file = typeof entry === 'string' ? entry : entry.file;
      const button = html(
        'button',
        typeof entry === 'string' ? file : `${file}:${entry.line}`,
      );
      button.type = 'button';
      button.addEventListener('click', () => selectFile(file));
      list.append(button);
    }
    if (!files.length)
      list.append(
        html('p', 'No indexed connections in this direction.', 'muted'),
      );
    if (files.length > 40)
      list.append(
        html('p', 'First 40 shown. Search paths to explore further.', 'muted'),
      );
    $('detail-body').append(list);
  }
  function selectFile(file) {
    state.file = file;
    if (state.view === 'modules') state.view = 'file';
    renderSearch();
    render();
  }
  function renderModules(edges) {
    resetCanvas();
    $('map-kicker').textContent = 'THE WORKSPACE AT A GLANCE';
    $('map-title').textContent = 'Follow the connections.';
    $('map-description').textContent =
      'Arrows point from an importing module to its dependency. Select a module, then a file.';
    svg.setAttribute(
      'aria-label',
      'Module dependencies; arrows point from importer to dependency',
    );
    const positions = new Map(
      modules.map((name, index) => {
        const angle = (index / modules.length) * Math.PI * 2 - Math.PI / 2;
        return [
          name,
          {
            x: 550 + 350 * Math.cos(angle),
            y: 350 + 240 * Math.sin(angle),
            radius: 65,
          },
        ];
      }),
    );
    const grouped = new Map();
    for (const edge of edges) {
      const from = moduleOf(edge.from),
        to = moduleOf(edge.to);
      if (from === to) continue;
      const key = `${from}\n${to}`;
      grouped.set(key, (grouped.get(key) || 0) + 1);
    }
    for (const [key, count] of grouped) {
      const [from, to] = key.split('\n');
      line(positions.get(from), positions.get(to), { count, curved: true });
    }
    for (const name of modules) {
      const point = positions.get(name);
      node(name, point.x, point.y, {
        module: true,
        selected: name === state.module,
        count: graph.files.filter((file) => moduleOf(file) === name).length,
      });
    }
    $('map-count').textContent =
      `${modules.length} modules · ${grouped.size} directed module links`;
    const files = state.module
      ? graph.files.filter((file) => moduleOf(file) === state.module)
      : graph.files;
    $('detail-title').textContent = state.module || 'Workspace';
    $('detail-path').textContent = state.module
      ? 'Select a file to inspect its direct dependencies.'
      : 'A grouped view of the indexed source paths.';
    stats([
      [files.length, 'indexed files'],
      [
        edges.filter(
          (edge) => !state.module || moduleOf(edge.from) === state.module,
        ).length,
        'outgoing import edges',
      ],
    ]);
    const degree = new Map();
    for (const edge of edges)
      for (const file of [edge.from, edge.to])
        degree.set(file, (degree.get(file) || 0) + 1);
    fileLinks(
      'Highly connected files',
      [...files]
        .sort(
          (a, b) =>
            (degree.get(b) || 0) - (degree.get(a) || 0) || a.localeCompare(b),
        )
        .slice(0, 12),
    );
  }
  function renderFile(edges) {
    const imports = [
      ...new Set(
        edges.filter((edge) => edge.from === state.file).map((edge) => edge.to),
      ),
    ].sort();
    const importers = [
      ...new Set(
        edges.filter((edge) => edge.to === state.file).map((edge) => edge.from),
      ),
    ].sort();
    const left = importers
      .filter((file) => file !== state.file)
      .slice(0, Math.floor((state.limit - 1) / 2));
    const right = imports
      .filter((file) => file !== state.file && !left.includes(file))
      .slice(0, state.limit - left.length - 1);
    const height = Math.max(
      720,
      Math.max(left.length, right.length) * 58 + 120,
    );
    resetCanvas(height);
    const positions = new Map([
      [state.file, { x: 550, y: height / 2, radius: 110 }],
    ]);
    for (const [files, x] of [
      [left, 170],
      [right, 930],
    ])
      files.forEach((file, index) =>
        positions.set(file, { x, y: 80 + index * 58, radius: 108 }),
      );
    for (const edge of edges)
      if (
        (edge.from === state.file || edge.to === state.file) &&
        edge.from !== edge.to &&
        positions.has(edge.from) &&
        positions.has(edge.to)
      )
        line(positions.get(edge.from), positions.get(edge.to));
    shape(
      'text',
      {
        x: 170,
        y: 35,
        'text-anchor': 'middle',
        fill: '#627968',
        'font-size': 14,
        'font-family': 'Segoe UI, sans-serif',
      },
      'IMPORTED BY',
    );
    shape(
      'text',
      {
        x: 930,
        y: 35,
        'text-anchor': 'middle',
        fill: '#627968',
        'font-size': 14,
        'font-family': 'Segoe UI, sans-serif',
      },
      'IMPORTS',
    );
    for (const [file, point] of positions)
      node(file, point.x, point.y, { selected: file === state.file });
    $('map-kicker').textContent = 'ONE FILE, BOTH DIRECTIONS';
    $('map-title').textContent = basename(state.file);
    $('map-description').textContent =
      'Importers on the left, dependencies on the right. Select a file to keep exploring.';
    $('map-count').textContent =
      `${positions.size} nodes shown · ${imports.length} dependencies · ${importers.length} importers`;
    svg.setAttribute('aria-label', `Dependencies of ${state.file}`);
    $('detail-title').textContent = basename(state.file);
    $('detail-path').textContent = state.file;
    stats([
      [imports.length, 'direct dependencies'],
      [importers.length, 'direct importers'],
    ]);
    fileLinks('Imports', imports);
    fileLinks('Imported by', importers);
    const provenance = edges
      .filter((edge) => edge.from === state.file)
      .slice(0, 12);
    if (provenance.length) {
      $('detail-body').append(html('h3', 'Import evidence'));
      for (const edge of provenance)
        $('detail-body').append(
          html(
            'p',
            `Line ${edge.line} · ${edge.kind}${edge.typeOnly ? ' · type-only' : ''} → ${edge.to}`,
            'path',
          ),
        );
    }
  }
  function renderImpact(edges) {
    const reverse = new Map();
    for (const edge of edges) {
      if (!reverse.has(edge.to)) reverse.set(edge.to, []);
      reverse.get(edge.to).push(edge.from);
    }
    const levels = new Map([[state.file, 0]]),
      queue = [state.file];
    let capped = false;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const file = queue[cursor],
        depth = levels.get(file);
      if (depth === 3) continue;
      for (const importer of [...new Set(reverse.get(file) || [])].sort()) {
        if (levels.has(importer)) continue;
        if (levels.size >= state.limit) {
          capped = true;
          continue;
        }
        levels.set(importer, depth + 1);
        queue.push(importer);
      }
    }
    const layers = [0, 1, 2, 3].map((depth) =>
      queue.filter((file) => levels.get(file) === depth),
    );
    const height = Math.max(
      720,
      Math.max(...layers.map((files) => files.length)) * 58 + 120,
    );
    resetCanvas(height);
    const positions = new Map();
    layers.forEach((files, depth) =>
      files.forEach((file, index) =>
        positions.set(file, {
          x: 160 + depth * 260,
          y: 90 + index * 58,
          radius: 107,
        }),
      ),
    );
    for (const edge of edges)
      if (
        positions.has(edge.from) &&
        positions.has(edge.to) &&
        levels.get(edge.from) === levels.get(edge.to) + 1
      )
        line(positions.get(edge.from), positions.get(edge.to));
    for (const [file, point] of positions)
      node(file, point.x, point.y, { selected: file === state.file });
    $('map-kicker').textContent = 'POTENTIAL CHANGE IMPACT';
    $('map-title').textContent = basename(state.file);
    $('map-description').textContent =
      'Reverse imports, up to three levels. These are potential consumers, not guaranteed runtime effects.';
    $('map-count').textContent =
      `${positions.size} files shown · depth ≤ 3${capped ? ' · node limit reached' : ''}`;
    svg.setAttribute(
      'aria-label',
      `Potential import impact of ${state.file}, up to three levels`,
    );
    $('detail-title').textContent = 'Potential consumers';
    $('detail-path').textContent = state.file;
    stats([
      [levels.size - 1, 'consumers shown'],
      [3, 'maximum depth'],
    ]);
    fileLinks('Explore an affected file', queue.slice(1));
  }
  function render() {
    $('detail-body').replaceChildren();
    for (const button of document.querySelectorAll('[data-view]'))
      button.setAttribute(
        'aria-selected',
        String(button.dataset.view === state.view),
      );
    const edges = activeEdges();
    if (state.view === 'modules') renderModules(edges);
    else if (state.view === 'file') renderFile(edges);
    else renderImpact(edges);
  }
  function renderSearch() {
    const term = $('file-search').value.trim().toLowerCase();
    const files = graph.files.filter(
      (file) =>
        (!state.module || moduleOf(file) === state.module) &&
        file.toLowerCase().includes(term),
    );
    $('search-count').textContent =
      `${files.length.toLocaleString()} matching paths${files.length > 100 ? ' · first 100 shown' : ''}`;
    $('file-list').replaceChildren();
    for (const file of files.slice(0, 100)) {
      const item = html('div');
      item.setAttribute('role', 'listitem');
      const button = html('button', null, 'file-button');
      button.type = 'button';
      button.setAttribute('aria-current', String(file === state.file));
      button.append(html('strong', basename(file)), html('small', file));
      button.addEventListener('click', () => selectFile(file));
      item.append(button);
      $('file-list').append(item);
    }
    if (!files.length)
      $('file-list').append(
        html('p', 'No indexed files match. Try a shorter path.', 'empty'),
      );
  }
  $('file-count').textContent = graph.files.length.toLocaleString();
  $('edge-count').textContent = graph.edges.length.toLocaleString();
  $('scope').textContent = graph.scope;
  const unresolved = graph.coverage.reduce(
    (sum, row) => sum + row.unresolvedRelative,
    0,
  );
  $('coverage').textContent =
    `${unresolved} unresolved relative references; ${graph.diagnostics.length} files with syntax diagnostics. Unparsed file types may have no visible edges.`;
  $('generated').textContent =
    `Snapshot generated ${new Date(graph.generatedAt).toLocaleString()}. Rebuild after source changes.`;
  for (const name of modules) {
    const option = html('option', name);
    option.value = name;
    $('module-filter').append(option);
    const legend = html('span'),
      dot = html('i');
    dot.style.backgroundColor = colors[modules.indexOf(name) % colors.length];
    legend.append(dot, html('span', name));
    $('legend').append(legend);
  }
  $('file-search').addEventListener('input', renderSearch);
  $('file-search').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') $('file-list').querySelector('button')?.click();
  });
  $('module-filter').addEventListener('change', () => {
    state.module = $('module-filter').value;
    renderSearch();
    render();
  });
  $('node-limit').addEventListener('change', () => {
    state.limit = Number($('node-limit').value);
    render();
  });
  $('hide-types').addEventListener('change', render);
  const tabs = [...document.querySelectorAll('[data-view]')];
  tabs.forEach((button, index) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      render();
    });
    button.addEventListener('keydown', (event) => {
      const next =
        event.key === 'ArrowRight'
          ? (index + 1) % tabs.length
          : event.key === 'ArrowLeft'
            ? (index + tabs.length - 1) % tabs.length
            : event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? tabs.length - 1
                : null;
      if (next != null) {
        event.preventDefault();
        tabs[next].click();
        tabs[next].focus();
      }
    });
  });
  $('zoom-in').addEventListener('click', () => zoom(0.8));
  $('zoom-out').addEventListener('click', () => zoom(1.25));
  $('zoom-reset').addEventListener('click', () => {
    box = { ...initialBox };
    applyBox();
  });
  let drag = null;
  svg.addEventListener('pointerdown', (event) => {
    if (event.target.closest('[data-node]')) return;
    drag = { x: event.clientX, y: event.clientY, box: { ...box } };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = svg.getBoundingClientRect();
    box = {
      ...drag.box,
      x: drag.box.x - ((event.clientX - drag.x) * drag.box.width) / rect.width,
      y:
        drag.box.y - ((event.clientY - drag.y) * drag.box.height) / rect.height,
    };
    applyBox();
  });
  svg.addEventListener('pointerup', () => {
    drag = null;
  });
  svg.addEventListener('pointercancel', () => {
    drag = null;
  });
  $('export').addEventListener('click', () => {
    const copy = svg.cloneNode(true);
    copy.setAttribute('width', '1100');
    copy.setAttribute('height', '720');
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(copy)], {
        type: 'image/svg+xml',
      }),
    );
    const link = html('a');
    link.href = url;
    link.download = 'growthtrack-code-map.svg';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  renderSearch();
  render();
})();

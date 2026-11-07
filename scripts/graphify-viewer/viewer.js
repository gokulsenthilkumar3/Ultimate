const $ = (id) => document.getElementById(id);
let selected,
  searchOffset = 0,
  edgeOffset = 0,
  nextResults,
  nextEdges,
  request = 0,
  selectionRequest = 0;
const NS = "http://www.w3.org/2000/svg";
const compact = matchMedia("(max-width: 650px)");
async function get(url) {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}
function text(tag, value, className) {
  const el = document.createElement(tag);
  el.textContent = value;
  if (className) el.className = className;
  return el;
}
function fail(error) {
  $("status").textContent = error.message;
}
async function meta() {
  const data = await get("/api/graph/meta");
  for (const key of ["nodes", "edges", "communities"])
    $(key).textContent = data[key].toLocaleString();
  $("provenance").textContent =
    `Snapshot updated ${new Date(data.modifiedAt).toLocaleString()} · Graphify ${data.graphifyVersion || "version unavailable"}`;
  $("status").textContent =
    "Local snapshot ready. Search to explore original Graphify relationships.";
}
async function search() {
  const current = ++request;
  const data = await get(
    `/api/graph/nodes?q=${encodeURIComponent($("search").value)}&limit=24&offset=${searchOffset}`,
  );
  if (current !== request) return;
  nextResults = data.nextOffset;
  $("more-results").hidden = nextResults === null;
  $("results-count").textContent =
    `${data.total.toLocaleString()} matches · ${data.nodes.length ? searchOffset + 1 : 0}–${searchOffset + data.nodes.length} shown`;
  $("results").replaceChildren();
  for (const node of data.nodes) {
    const button = text("button", "", "result");
    button.type = "button";
    button.dataset.nodeId = String(node.id);
    button.setAttribute("aria-current", String(node.id === selected));
    button.append(
      text("strong", node.label || node.id),
      text("small", node.source_file || "No source path"),
    );
    button.onclick = () => select(node.id).catch(fail);
    $("results").append(button);
  }
}
function svg(tag, attributes) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes))
    el.setAttribute(key, value);
  return el;
}
function renderMap(data) {
  const canvas = $("map");
  canvas.replaceChildren();
  const small = compact.matches;
  canvas.setAttribute("viewBox", small ? "0 0 400 420" : "0 0 800 650");
  const cx = small ? 200 : 400,
    cy = small ? 210 : 325;
  const others = data.nodes.filter((n) => n.id !== data.node.id);
  const positions = new Map([[String(data.node.id), [cx, cy]]]);
  others.forEach((node, i) => {
    const angle = (i / Math.max(1, others.length)) * Math.PI * 2 - Math.PI / 2;
    positions.set(String(node.id), [
      cx + Math.cos(angle) * (small ? 120 : 260),
      cy + Math.sin(angle) * (small ? 150 : 265),
    ]);
  });
  for (const edge of data.edges) {
    const a = positions.get(String(edge.source)),
      b = positions.get(String(edge.target));
    if (!a || !b) continue;
    const line = svg("line", {
      x1: a[0],
      y1: a[1],
      x2: b[0],
      y2: b[1],
      class: "link",
    });
    const title = svg("title", {});
    title.textContent = `${edge.relation || "relationship"} · ${edge.confidence || "confidence unavailable"}`;
    line.append(title);
    canvas.append(line);
  }
  for (const node of [data.node, ...others]) {
    const [x, y] = positions.get(String(node.id)),
      center = node.id === data.node.id;
    const group = svg("g", {
      transform: `translate(${x} ${y})`,
      role: "button",
      tabindex: "0",
      "aria-label": `Explore ${node.label || node.id}`,
    });
    group.append(
      svg("circle", {
        r: center ? (small ? 42 : 56) : small ? 24 : 20,
        class: center ? "dot center" : "dot",
      }),
    );
    const label = svg("text", {
      y: center ? 4 : 37,
      "text-anchor": "middle",
      class: center ? "center-label" : "",
    });
    label.textContent = (node.label || node.id).slice(
      0,
      center ? (small ? 10 : 16) : small ? 18 : 22,
    );
    group.append(label);
    const title = svg("title", {});
    title.textContent = `${node.label}\n${node.source_file || ""}`;
    group.append(title);
    group.onclick = () => select(node.id).catch(fail);
    group.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select(node.id).catch(fail);
      }
    };
    canvas.append(group);
  }
}
async function select(id, offset = 0) {
  const current = ++selectionRequest;
  const limit = compact.matches ? 6 : 16;
  const data = await get(
    `/api/graph/neighbors?id=${encodeURIComponent(id)}&limit=${limit}&offset=${offset}`,
  );
  if (current !== selectionRequest) return;
  selected = id;
  edgeOffset = offset;
  nextEdges = data.nextOffset;
  history.replaceState(null, "", `#${encodeURIComponent(id)}`);
  $("map-empty").hidden = true;
  $("map-title").textContent = data.node.label || id;
  $("edge-count").textContent =
    `${data.edges.length} of ${data.total} incident relationships · page ${Math.floor(offset / limit) + 1}`;
  $("more-edges").hidden = data.total <= limit;
  $("more-edges").textContent =
    nextEdges === null ? "First relationships ↺" : "Next relationships →";
  $("details").replaceChildren(text("p", data.node.label || id, "node-name"));
  for (const [label, value] of [
    ["Path", data.node.source_file],
    ["Location", data.node.source_location],
    ["Community", data.node.community_name ?? data.node.community],
  ])
    $("details").append(text("p", `${label}: ${value ?? "unavailable"}`));
  $("details").append(
    text("h3", "Native node ID"),
    text("p", id),
    text("h3", "Relationship evidence"),
  );
  const list = document.createElement("ul");
  for (const edge of data.edges)
    list.append(
      text(
        "li",
        `${edge.relation || "relationship"} · ${edge.confidence || "confidence unavailable"} · ${edge.source_file || "source unavailable"} ${edge.source_location || ""}`,
      ),
    );
  if (!data.edges.length)
    list.append(text("li", "No incident relationships in this snapshot."));
  $("details").append(list);
  renderMap(data);
  document
    .querySelectorAll(".result")
    .forEach((button) =>
      button.setAttribute(
        "aria-current",
        String(button.dataset.nodeId === String(id)),
      ),
    );
}
let timer;
compact.addEventListener("change", () => {
  if (selected) select(selected).catch(fail);
});
$("search").oninput = () => {
  ++request;
  clearTimeout(timer);
  searchOffset = 0;
  $("results").replaceChildren();
  $("results-count").textContent = "Searching…";
  $("more-results").hidden = true;
  timer = setTimeout(() => search().catch(fail), 180);
};
$("more-results").onclick = () => {
  searchOffset = nextResults ?? 0;
  search().catch(fail);
};
$("more-edges").onclick = () => select(selected, nextEdges ?? 0).catch(fail);
$("refresh").onclick = () =>
  Promise.all([
    meta(),
    search(),
    selected ? select(selected, edgeOffset) : Promise.resolve(),
  ]).catch(fail);
document.addEventListener("graphify:explore", (event) =>
  select(event.detail).catch(fail),
);
Promise.all([meta(), search()])
  .then(() => {
    if (
      location.hash.length > 1 &&
      !["#brain", "#explore"].includes(location.hash)
    )
      return select(decodeURIComponent(location.hash.slice(1)));
  })
  .catch(fail);

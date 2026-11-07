import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { createGraphServer } from "../scripts/graphify-server.mjs";

test("local explorer preserves Graphify relationships, bounds results, reloads and fails closed", async (t) => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "growthtrack-graph-viewer-"),
  );
  const graphPath = path.join(directory, "graph.json");
  const fixture = {
    directed: true,
    graph: { graphify_version: "fixture" },
    nodes: [
      {
        id: "a",
        label: "</script>Alpha",
        source_file: "src/a.js",
        community: 1,
        secret: "never expose",
      },
      { id: "b", label: "Beta", community: 2 },
      { id: "c", label: "Gamma", community: 2 },
    ],
    links: [
      { source: "b", target: "a", relation: "calls", confidence: "EXTRACTED" },
      { source: "a", target: "c", relation: "imports" },
    ],
  };
  fs.writeFileSync(graphPath, JSON.stringify(fixture));
  const server = createGraphServer({ graphPath });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async (route) => (await fetch(base + route)).json();
  const meta = await get("/api/graph/meta");
  assert.equal(meta.nodes, 3);
  assert.equal(meta.edges, 2);
  assert.equal(meta.directed, true);
  const brainResponse = await fetch(base + "/api/graph/brain");
  assert.equal(brainResponse.headers.get("content-encoding"), "gzip");
  const brain = await brainResponse.json();
  assert.equal(brain.snapshot, meta.snapshot);
  assert.equal(brain.nodes.length, fixture.nodes.length);
  assert.deepEqual(brain.edges, fixture.links);
  assert.equal(brain.nodes[0].secret, undefined);
  assert.ok(
    brain.nodes.every(
      (node) => !("x" in node) && !("y" in node) && !("z" in node),
    ),
  );
  for (const asset of [
    "/brain-3d.js",
    "/vendor/three.module.js",
    "/vendor/three.core.js",
  ])
    assert.equal((await fetch(base + asset, { method: "HEAD" })).status, 200);
  assert.equal((await fetch(base + "/vendor/not-allowlisted.js")).status, 404);
  const configuration = await get("/api/graph/services");
  assert.deepEqual(
    configuration.services.find((service) => service.id === "ultimate").ports,
    [3001, 5000],
  );
  assert.deepEqual(
    configuration.services.find((service) => service.id === "graphify").ports,
    [server.address().port],
  );
  assert.match(
    configuration.services.find((service) => service.id === "studio").evidence,
    /not a live health check/,
  );
  assert.ok(configuration.services.every((service) => !("env" in service)));
  const search = await get("/api/graph/nodes?q=ALPHA&limit=1");
  assert.equal(search.nodes[0].label, "</script>Alpha");
  assert.equal(search.nodes[0].secret, undefined);
  const first = await get("/api/graph/neighbors?id=a&limit=1");
  assert.deepEqual(first.edges, [fixture.links[0]]);
  assert.deepEqual(
    first.nodes.map((n) => n.id),
    ["a", "b"],
  );
  assert.equal(first.total, 2);
  assert.equal(first.nextOffset, 1);
  const second = await get("/api/graph/neighbors?id=a&limit=1&offset=1");
  assert.deepEqual(second.edges, [fixture.links[1]]);
  assert.equal(second.nextOffset, null);
  for (const route of [
    "/api/graph/nodes?limit=101",
    "/api/graph/nodes?offset=-1",
    "/api/graph/nodes?limit=NaN",
    "/api/graph/nodes?q=" + "x".repeat(201),
  ])
    assert.equal((await fetch(base + route)).status, 400);
  assert.equal(
    (await fetch(base + "/api/graph/neighbors?id=missing")).status,
    404,
  );
  assert.equal((await fetch(base + "/.env")).status, 404);
  assert.equal(
    (await fetch(base + "/api/graph/meta", { method: "POST" })).status,
    405,
  );
  assert.equal(
    (
      await fetch(base + "/api/graph/meta", {
        headers: { Origin: "https://example.com" },
      })
    ).status,
    403,
  );
  const invalidHostStatus = await new Promise((resolve, reject) =>
    http
      .get(
        base + "/api/graph/meta",
        { headers: { Host: "attacker.example" } },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      )
      .on("error", reject),
  );
  assert.equal(invalidHostStatus, 403);
  const page = await fetch(base + "/");
  assert.match(
    page.headers.get("content-security-policy"),
    /script-src 'self'/,
  );
  assert.match(await page.text(), /Native|NATIVE GRAPHIFY/);
  assert.equal((await fetch(base + "/", { method: "HEAD" })).status, 200);
  assert.equal((await get("/api/graph/capabilities")).readOnly, true);
  fixture.nodes.push({ id: "d", label: "New snapshot" });
  fs.writeFileSync(graphPath, JSON.stringify(fixture));
  assert.equal((await get("/api/graph/meta")).nodes, 4);
  assert.equal((await get("/api/graph/brain")).nodes.length, 4);
  fs.writeFileSync(graphPath, "{broken");
  assert.equal((await fetch(base + "/health")).status, 503);
  assert.equal((await fetch(base + "/api/graph/nodes")).status, 503);
  assert.equal((await fetch(base + "/api/graph/brain")).status, 503);
});

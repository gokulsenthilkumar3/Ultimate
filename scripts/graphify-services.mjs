/** Read public launcher metadata without importing it (which would start services/read env). */
import fs from "node:fs";
import path from "node:path";

export function readGraphServices(root, graphPort) {
  const source = "scripts/workspace.mjs";
  const text = fs.readFileSync(path.join(root, source), "utf8");
  const block = text.split("const COMMANDS = {")[1]?.split("\n};")[0] || "";
  const services = [];
  for (const match of block.matchAll(
    /^  (?:'([^']+)'|(\w+)): \{([\s\S]*?)^  },/gm,
  )) {
    const id = match[1] || match[2],
      body = match[3];
    const ports =
      body
        .match(/ports:\s*\[([\d,\s]+)\]/)?.[1]
        .match(/\d+/g)
        ?.map(Number) || [];
    const cwd = body.match(/cwd:\s*path\.join\(root,([^)]*)\)/)?.[1];
    const folder = cwd
      ? [...cwd.matchAll(/'([^']+)'/g)].map((m) => m[1]).join("/")
      : "scripts";
    services.push({
      id,
      label: id.replaceAll("-", " "),
      ports,
      folder,
      source,
      evidence: "Configured in workspace launcher; not a live health check.",
    });
  }
  if (!services.length || services.some((service) => !service.ports.length))
    throw new Error("Workspace launcher port metadata format changed");
  const applications = JSON.parse(
    fs.readFileSync(path.join(root, "docs/applications.json"), "utf8"),
  );
  const matrix =
    applications.find((app) => app.path === ".")?.sections?.[
      "Service Port & Protocol Matrix"
    ] || "";
  const previewPort = matrix.match(/Admin Design Demo[^\n]*?`(\d+)`/)?.[1];
  if (previewPort)
    services.push({
      id: "design-preview",
      label: "Admin design preview",
      ports: [Number(previewPort)],
      folder: "growthtrack-ultimate/src/admin-demo",
      source: "docs/applications.json",
      evidence: "Documented preview default; not a live health check.",
    });
  services.push({
    id: "graphify",
    label: "Graphify workspace",
    ports: [graphPort],
    folder: "scripts/graphify",
    source: "scripts/graphify-server.mjs",
    evidence: "Actual listener port for this Graphify server.",
  });
  return {
    services,
    semantics:
      "Port metadata annotates existing source nodes; no service or relationship nodes are synthesized. Environment overrides and dynamically assigned database ports are not inferred.",
  };
}

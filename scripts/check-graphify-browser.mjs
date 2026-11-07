import { createRequire } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createGraphServer } from "./graphify-server.mjs";
const require = createRequire(
  new URL("../growthtrack-ultimate/package.json", import.meta.url),
);
const { chromium } = require("@playwright/test");
const server = createGraphServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
fs.mkdirSync(".code-index", { recursive: true });
let browser;
const errors = [],
  external = [];
try {
  browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-webgl",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1512, height: 1100 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (!r.url().startsWith(base + "/")) external.push(r.url());
  });
  await page.goto(base + "/#brain");
  const gl = page.locator("#brain-webgl");
  await page.waitForFunction(
    () => Number(document.getElementById("brain-webgl").dataset.frames) > 10,
  );
  assert.equal(await gl.getAttribute("data-renderer"), "webgl");
  assert.ok(Number(await gl.getAttribute("data-depth-range")) > 1000);
  const payload = await (
    await page.request.get(base + "/api/graph/brain")
  ).json();
  assert.equal(
    Number(await gl.getAttribute("data-nodes")),
    payload.nodes.length,
  );
  assert.equal(
    Number(await gl.getAttribute("data-edges")),
    payload.edges.length,
  );
  assert.ok(
    payload.nodes.every((n) => !("x" in n) && !("y" in n) && !("z" in n)),
  );
  await page.getByRole("button", { name: "Pause motion", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.getElementById("brain-webgl").dataset.moving === "false" &&
      document.getElementById("brain-webgl").dataset.animating === "false",
  );
  await page.screenshot({
    path: ".code-index/graphify-brain-3d-desktop.png",
    fullPage: true,
  });
  const before = await gl.getAttribute("data-frames");
  await page.waitForTimeout(200);
  assert.equal(await gl.getAttribute("data-frames"), before);
  const yaw = Number(await gl.getAttribute("data-yaw"));
  await gl.scrollIntoViewIfNeeded();
  await gl.focus();
  await page.keyboard.press("ArrowLeft");
  await page.waitForFunction(
    (v) => Number(document.getElementById("brain-webgl").dataset.yaw) !== v,
    yaw,
  );
  const rect = await gl.boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width / 2 + 90,
    rect.y + rect.height / 2 + 35,
    { steps: 5 },
  );
  await page.mouse.up();
  await page.locator("#brain-lines").uncheck();
  await page.locator("#brain-lines").check();
  await page.locator("#brain-focus").check();
  await page.locator("#brain-search").fill("graphify-server.mjs");
  const result = page
    .locator(".brain-result")
    .filter({ has: page.getByText("graphify-server.mjs", { exact: true }) })
    .first();
  await result.waitFor();
  await result.click();
  await page
    .getByRole("button", { name: "Explore original relationships →" })
    .waitFor();
  await page.getByRole("button", { name: "Expand view", exact: true }).click();
  await page.waitForFunction(() => Boolean(document.fullscreenElement));
  await page
    .getByRole("button", { name: "Exit expanded view", exact: true })
    .click();
  await page.waitForFunction(() => !document.fullscreenElement);
  await page
    .getByRole("button", { name: "Resume motion", exact: true })
    .click();
  await page.getByRole("tab", { name: /Explorer/ }).click();
  await page.waitForTimeout(100);
  const hidden = await gl.getAttribute("data-frames");
  await page.waitForTimeout(180);
  assert.equal(await gl.getAttribute("data-frames"), hidden);
  await page.getByRole("tab", { name: /Brain/ }).click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.locator("#brain-canvas").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await gl.waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Pause motion", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Fit all", exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: ".code-index/graphify-brain-3d-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  const metrics = await gl.evaluate((c) => ({ ...c.dataset }));
  await gl.evaluate((c) =>
    c.getContext("webgl2").getExtension("WEBGL_lose_context")?.loseContext(),
  );
  await page.getByText("2D / 3D UNAVAILABLE", { exact: true }).waitFor();
  assert.equal(await page.locator("#brain-canvas").isVisible(), true);
  const reduced = await browser.newPage({
    viewport: { width: 1000, height: 900 },
    reducedMotion: "reduce",
  });
  await reduced.goto(base + "/#brain");
  await reduced.waitForFunction(
    () => Number(document.getElementById("brain-webgl").dataset.frames) > 0,
  );
  assert.equal(
    await reduced.locator("#brain-webgl").getAttribute("data-animating"),
    "false",
  );
  assert.equal(
    await reduced
      .getByRole("button", { name: "Reduced motion", exact: true })
      .isDisabled(),
    true,
  );
  const fallback = await browser.newPage();
  await fallback.route("**/brain-3d.js", (route) => route.abort());
  await fallback.goto(base + "/#brain");
  await fallback.getByText("2D / 3D UNAVAILABLE", { exact: true }).waitFor();
  assert.equal(await fallback.locator("#brain-canvas").isVisible(), true);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  const summary = {
    webgl3D: true,
    allGraphCounts: true,
    depth: true,
    orbit: true,
    pause: true,
    tabPause: true,
    dimensionsToggle: true,
    reducedMotion: true,
    fallback: true,
    mobile390: true,
    agentCoordinatesUnchanged: true,
    metrics,
    errors,
    externalRequests: external.length,
  };
  fs.writeFileSync(
    ".code-index/graphify-3d-results.json",
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify(summary));
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}

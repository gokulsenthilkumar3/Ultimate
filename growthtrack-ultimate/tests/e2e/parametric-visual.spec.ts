import type { Locator, Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { test, expect } from './foundation-fixture';
import { setupHumanViewer } from './helpers/human-viewer';

const evidenceDirectory = 'artifacts/parametric-visual';
const frameKey = 'growthtrack.parametric-visual.frame-sample';
type InteractionSample = { value: number; changed: boolean; identityEvaluationMs: number; eventToTwoRafMs: number };

function distribution(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)];
  return { samples: sorted.length, min: sorted[0], median: percentile(0.5), p95: percentile(0.95), max: sorted.at(-1) };
}

/** Wait for a completed identity effect, rather than timing only the DOM slider. */
async function sampleRange(input: Locator, value: number): Promise<InteractionSample> {
  return input.evaluate(async (element: HTMLInputElement, next: number) => {
    // React intentionally does not run another identity evaluation for the
    // already selected value. Do not wait for an attribute mutation then.
    if (Number(element.value) === next) return { value: next, changed: false, identityEvaluationMs: 0, eventToTwoRafMs: 0 };
    const canvas = element.closest('.parametric-studio')!.querySelector('canvas')!;
    const started = performance.now();
    const identityEvaluationMs = await new Promise<number>((resolve, reject) => {
      const observer = new MutationObserver(records => {
        if (!records.some(record => record.attributeName === 'data-identity-evaluation-ms')) return;
        const value = Number(canvas.getAttribute('data-identity-evaluation-ms'));
        observer.disconnect(); clearTimeout(deadline);
        if (!Number.isFinite(value) || value < 0) reject(new Error('The completed identity evaluation has no finite timing.'));
        else resolve(value);
      });
      const deadline = setTimeout(() => { observer.disconnect(); reject(new Error('The slider did not complete identity evaluation within 10 seconds.')); }, 10000);
      observer.observe(canvas, { attributes: true, attributeFilter: ['data-identity-evaluation-ms'] });
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // React's effect invalidates the demand renderer. Give that invalidation
    // two paint opportunities. This is UI/main-thread latency, not GPU time.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return { value: next, changed: true, identityEvaluationMs, eventToTwoRafMs: performance.now() - started };
  }, value);
}

async function simpleShape(editor: Locator, region: string, label: string, value: number) {
  await editor.getByLabel('Shape region', { exact: true }).selectOption(region);
  const slider = editor.getByRole('slider', { name: label, exact: true });
  await sampleRange(slider, value);
  await expect(slider).toHaveValue(String(value));
}

async function captureView(editor: Locator, view: 'front' | 'side' | 'back' | 'face', name: string) {
  const label = view[0].toUpperCase() + view.slice(1);
  await editor.getByRole('group', { name: 'Parametric camera' }).getByRole('button', { name: label, exact: true }).click();
  const canvas = editor.locator('canvas');
  await expect(canvas).toHaveAttribute('data-garment-fit', 'ready', { timeout: 30000 });
  await canvas.scrollIntoViewIfNeeded();
  await canvas.evaluate(async element => {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    (element as HTMLCanvasElement).getContext('webgl2')?.finish();
  });
  await canvas.screenshot({ path: `${evidenceDirectory}/${name}.png`, animations: 'disabled' });
}

async function frameSampler(page: Page, active: boolean) {
  return page.evaluate(({ key, active }) => {
    const symbol = Symbol.for(key);
    const target = window as unknown as Record<symbol, any>;
    if (active) {
      const state = { active: true, previous: 0, started: performance.now(), finished: 0, intervalsMs: [] as number[] };
      target[symbol] = state;
      const record = (now: number) => {
        if (!state.active) return;
        if (state.previous) state.intervalsMs.push(now - state.previous);
        state.previous = now;
        requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
      return null;
    }
    const state = target[symbol];
    state.active = false; state.finished = performance.now(); delete target[symbol];
    return { durationMs: state.finished - state.started, intervalsMs: state.intervalsMs as number[] };
  }, { key: frameKey, active });
}

test('textured candidate has fixed-view evidence and bounded desktop interaction samples', async ({ page }, testInfo) => {
  const fixture = await setupHumanViewer(page, 'reduce');
  await page.getByRole('button', { name: 'Parametric human editor', exact: true }).click();
  const editor = page.getByRole('region', { name: 'Parametric human editor', exact: true });
  const canvas = editor.locator('canvas');
  await expect(canvas).toHaveAttribute('data-parametric-ready', 'true', { timeout: 45000 });
  await expect(canvas).toHaveAttribute('data-skin-maps', '6', { timeout: 45000 });
  await expect(canvas).toHaveAttribute('data-eye-meshes', '8');
  await expect(canvas).toHaveAttribute('data-skin-scattering', 'burley-profile-local-preintegration-v1');
  await expect(canvas).toHaveAttribute('data-attachment-count', '2', { timeout: 45000 });
  await expect(canvas).toHaveAttribute('data-identity-morph-layers', '0');
  await canvas.evaluate(element => {
    element.addEventListener('webglcontextlost', () => element.setAttribute('data-visual-context-lost', 'true'));
  });
  await mkdir(evidenceDirectory, { recursive: true });

  await test.step('record neutral portrait and full-body views without claiming likeness', async () => {
    for (const view of ['front', 'side', 'back', 'face'] as const) await captureView(editor, view, `desktop-neutral-${view}`);
  });

  await test.step('record finite head and torso fitting cases', async () => {
    await simpleShape(editor, 'head', 'Head width', 0.35);
    await simpleShape(editor, 'jaw', 'Jaw width', 0.25);
    await simpleShape(editor, 'nose', 'Nose width', 0.45);
    await captureView(editor, 'face', 'desktop-head-combination-face');
    await simpleShape(editor, 'torso', 'Shoulder width', 0.45);
    await simpleShape(editor, 'torso', 'Chest width', 0.25);
    await simpleShape(editor, 'hips', 'Waist width', -0.35);
    for (const view of ['front', 'side', 'back'] as const) await captureView(editor, view, `desktop-torso-combination-${view}`);
  });

  const interactions: InteractionSample[] = [];
  const torsoInteractions: InteractionSample[] = [];
  let frames: { durationMs: number; intervalsMs: number[] } | null = null;
  await test.step('sample active identity edits, not just a stationary viewport', async () => {
    await editor.getByLabel('Shape region', { exact: true }).selectOption('nose');
    const slider = editor.getByRole('slider', { name: 'Nose width', exact: true });
    await frameSampler(page, true);
    try {
      for (let index = 0; index < 20; index++) {
        const value = Number(((index % 2 === 0 ? 1 : -1) * (0.15 + index * 0.03)).toFixed(2));
        interactions.push(await sampleRange(slider, value));
      }
    } finally { frames = await frameSampler(page, false); }
  });
  expect(interactions).toHaveLength(20);
  expect(interactions.every(sample => sample.changed)).toBe(true);
  expect(interactions.every(sample => Number.isFinite(sample.identityEvaluationMs) && Number.isFinite(sample.eventToTwoRafMs))).toBe(true);
  expect(frames!.intervalsMs.length).toBeGreaterThan(10);
  await test.step('keep waist edits responsive while the worker coalesces garment fits', async () => {
    await editor.getByLabel('Shape region', { exact: true }).selectOption('hips');
    const slider = editor.getByRole('slider', { name: 'Waist width', exact: true });
    for (let index = 0; index < 20; index++) {
      const value = Number(((index % 2 === 0 ? 1 : -1) * (0.15 + index * 0.03)).toFixed(2));
      torsoInteractions.push(await sampleRange(slider, value));
    }
    await expect(slider).toHaveValue('-0.72');
    await expect(canvas).toHaveAttribute('data-garment-fit', 'ready', { timeout: 30000 });
    expect(Number(await canvas.getAttribute('data-garment-gap-mm'))).toBeGreaterThanOrEqual(2);
    await expect(editor.getByText('Fitting tee… You can keep editing.', { exact: true })).toHaveCount(0);
  });
  const settledFit = await canvas.evaluate(element => ({
    revision: Number((element as HTMLCanvasElement).dataset.garmentFitRevision),
    solveMs: Number((element as HTMLCanvasElement).dataset.garmentSolveMs),
    minimumGapMm: Number((element as HTMLCanvasElement).dataset.garmentGapMm),
  }));
  const browser = await canvas.evaluate(element => {
    const source = element as HTMLCanvasElement, gl = source.getContext('webgl2')!;
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const bounds = source.getBoundingClientRect();
    return {
      userAgent: navigator.userAgent, devicePixelRatio: window.devicePixelRatio,
      drawingBuffer: { width: source.width, height: source.height },
      canvasCss: { width: bounds.width, height: bounds.height },
      renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
      maxArrayTextureLayers: gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS),
      skinMaps: Number(source.dataset.skinMaps), attachments: Number(source.dataset.attachmentCount),
      eyeMeshes: Number(source.dataset.eyeMeshes), skinScattering: source.dataset.skinScattering,
      renderedIdentityMorphLayers: Number(source.dataset.identityMorphLayers),
      webglError: gl.getError(), contextLost: gl.isContextLost(),
    };
  });
  expect(browser.webglError).toBe(0);
  expect(browser.contextLost).toBe(false);
  await expect(canvas).not.toHaveAttribute('data-visual-context-lost', 'true');
  const evidence = {
    generatedAt: new Date().toISOString(), project: testInfo.project.name,
    acceptance: 'candidate-evidence-only; user reference photos and visual approval pending',
    physicalDeviceCertification: false, likenessCertification: false,
    scenario: 'single textured human with hair and tee; head and torso combination; 20 nose edits then 20 waist edits; latest worker fit completed',
    viewport: page.viewportSize(), browser,
    activeShapeCombination: { headWider: 0.35, jawWider: 0.25, shouldersWider: 0.45, chestWider: 0.25, waistNarrower: 0.35 },
    interactions,
    torsoInteractions, settledFit,
    torsoCpuIdentityEvaluationMs: distribution(torsoInteractions.map(sample => sample.identityEvaluationMs)),
    torsoEventToTwoRafMs: distribution(torsoInteractions.map(sample => sample.eventToTwoRafMs)),
    responsivenessTargetMs: 100,
    cpuIdentityEvaluationMs: distribution(interactions.map(sample => sample.identityEvaluationMs)),
    eventToTwoRafMs: distribution(interactions.map(sample => sample.eventToTwoRafMs)),
    hostRafIntervalsMs: { ...distribution(frames!.intervalsMs), durationMs: frames!.durationMs, values: frames!.intervalsMs },
    limits: [
      'CPU times come from the completed identity evaluator; they exclude attachment fitting and material/render work.',
      'Event-to-two-RAF timings include React effects, browser/main-thread work and paint opportunities; they are not GPU timings.',
      'Garment fitting runs asynchronously. Response timings exclude waiting for the latest fit; its worker solve time is reported separately.',
      'Host RAF intervals are sampled during sequential test-driven edits, not a measurement of continuously rendered GPU frames.',
      'This short desktop browser check does not establish Android performance, sustained thermal behaviour or collision-free fitting.',
    ],
  };
  const evidencePath = `${evidenceDirectory}/desktop-active-editing.json`;
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
  await testInfo.attach('desktop active-editing evidence', { path: evidencePath, contentType: 'application/json' });
  expect(fixture.bodyWrites).toHaveLength(0);
  expect(fixture.errors).toEqual([]);
});
